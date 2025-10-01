/**
 * CARL Backend API - Complete Routes Skeleton
 * Express + TypeScript + PostgreSQL
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'carl_db',
  user: process.env.POSTGRES_USER || 'carl_user',
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'carl-secret-change-me';

// Authentication middleware
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.userId;
    req.userEmail = user.email;
    next();
  });
};

// Validation error handler
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Database error handler
const handleDatabaseError = (error: any, res: Response) => {
  console.error('[DB Error]', error);
  
  if (error.code === '23505') { // Unique violation
    return res.status(409).json({ error: 'Resource already exists' });
  }
  if (error.code === '23503') { // Foreign key violation
    return res.status(400).json({ error: 'Referenced resource not found' });
  }
  
  return res.status(500).json({ error: 'Database error occurred' });
};

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ═══════════════════════════════════════════════════════════════

const authRouter = Router();

/**
 * POST /api/v1/auth/card-scan
 * Kártya beolvasás (NFC/QR)
 */
authRouter.post('/card-scan',
  body('cardNumber').notEmpty().matches(/^MSK-[0-9]{4}-[0-9]{3}$/),
  body('nfcData').optional().isString(),
  body('qrCode').optional().isString(),
  body('location').optional().isObject(),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    const { cardNumber, nfcData, qrCode, location } = req.body;
    
    try {
      // Find user by card number
      const userResult = await pool.query(
        `SELECT u.user_id, u.card_number, u.email, u.is_active, u.is_verified,
                w.dft_balance, w.points_balance, n.token_id as nft_token_id
         FROM users u
         LEFT JOIN wallets w ON u.user_id = w.user_id
         LEFT JOIN soulbound_nfts n ON u.user_id = n.user_id
         WHERE u.card_number = $1`,
        [cardNumber]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Card not found',
          message: 'A kártya még nincs regisztrálva a rendszerben'
        });
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          error: 'Account disabled',
          message: 'A fiók inaktív. Kérjük, vegye fel a kapcsolatot az ügyfélszolgálattal.'
        });
      }

      // Generate preliminary JWT (requires biometric verification)
      const token = jwt.sign(
        { userId: user.user_id, email: user.email, verified: false },
        JWT_SECRET,
        { expiresIn: '5m' } // Short-lived token
      );

      // Update last_login_at
      await pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [user.user_id]
      );

      res.json({
        success: true,
        message: 'Kártya sikeresen beolvasva',
        token,
        user: {
          userId: user.user_id,
          cardNumber: user.card_number,
          email: user.email,
          dftBalance: parseFloat(user.dft_balance),
          pointsBalance: user.points_balance,
          nftTokenId: user.nft_token_id
        },
        requiresBiometric: true
      });

    } catch (error) {
      handleDatabaseError(error, res);
    }
  }
);

/**
 * POST /api/v1/auth/biometric
 * Biometrikus azonosítás
 */
authRouter.post('/biometric',
  body('userId').isUUID(),
  body('biometricType').isIn(['face', 'fingerprint', 'voice']),
  body('biometricData').notEmpty().isString(),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    const { userId, biometricType, biometricData } = req.body;

    try {
      // Get stored biometric template
      const templateResult = await pool.query(
        `SELECT template_hash, salt, algorithm, is_active, failed_attempts, locked_until
         FROM biometric_templates
         WHERE user_id = $1 AND biometric_type = $2`,
        [userId, biometricType]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Biometric template not found',
          message: 'Nincs regisztrált biometrikus adat'
        });
      }

      const template = templateResult.rows[0];

      // Check if locked
      if (template.locked_until && new Date(template.locked_until) > new Date()) {
        return res.status(423).json({
          error: 'Account locked',
          message: 'Túl sok sikertelen próbálkozás. Fiók ideiglenesen zárolva.'
        });
      }

      // Hash the input biometric data
      const salt = Buffer.from(template.salt);
      const inputHash = crypto
        .createHash('sha256')
        .update(Buffer.concat([salt, Buffer.from(biometricData)]))
        .digest('hex');

      // Compare hashes
      const isValid = crypto.timingSafeEqual(
        Buffer.from(inputHash),
        Buffer.from(template.template_hash)
      );

      if (!isValid) {
        // Increment failed attempts
        await pool.query(
          `UPDATE biometric_templates 
           SET failed_attempts = failed_attempts + 1,
               locked_until = CASE 
                 WHEN failed_attempts + 1 >= 5 
                 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
                 ELSE locked_until
               END
           WHERE user_id = $1 AND biometric_type = $2`,
          [userId, biometricType]
        );

        return res.status(401).json({
          error: 'Biometric authentication failed',
          message: 'Biometrikus azonosítás sikertelen'
        });
      }

      // Success - reset failed attempts and update last_verified
      await pool.query(
        `UPDATE biometric_templates 
         SET failed_attempts = 0, 
             locked_until = NULL,
             last_verified = CURRENT_TIMESTAMP,
             last_used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND biometric_type = $2`,
        [userId, biometricType]
      );

      // Get user data
      const userResult = await pool.query(
        `SELECT u.user_id, u.card_number, u.email, u.first_name, u.last_name,
                w.dft_balance, w.points_balance, n.token_id as nft_token_id
         FROM users u
         LEFT JOIN wallets w ON u.user_id = w.user_id
         LEFT JOIN soulbound_nfts n ON u.user_id = n.user_id
         WHERE u.user_id = $1`,
        [userId]
      );

      const user = userResult.rows[0];

      // Generate full JWT token
      const token = jwt.sign(
        { userId: user.user_id, email: user.email, verified: true },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Sikeres bejelentkezés',
        token,
        user: {
          userId: user.user_id,
          cardNumber: user.card_number,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          dftBalance: parseFloat(user.dft_balance),
          pointsBalance: user.points_balance,
          nftTokenId: user.nft_token_id
        }
      });

    } catch (error) {
      handleDatabaseError(error, res);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// WALLET ROUTES
// ═══════════════════════════════════════════════════════════════

const walletRouter = Router();

/**
 * GET /api/v1/wallet/balance
 * Egyenleg lekérdezés
 */
walletRouter.get('/balance',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT w.wallet_id, w.dft_balance, w.points_balance,
                w.total_earned, w.total_spent, w.total_burned,
                w.green_activity_count, w.green_bonus_earned,
                u.card_number, n.token_id as nft_token_id
         FROM wallets w
         JOIN users u ON w.user_id = u.user_id
         LEFT JOIN soulbound_nfts n ON u.user_id = n.user_id
         WHERE w.user_id = $1`,
        [req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const wallet = result.rows[0];

      res.json({
        userId: req.userId,
        cardNumber: wallet.card_number,
        dftBalance: parseFloat(wallet.dft_balance),
        pointsBalance: wallet.points_balance,
        statistics: {
          totalEarned: parseFloat(wallet.total_earned),
          totalSpent: parseFloat(wallet.total_spent),
          totalBurned: parseFloat(wallet.total_burned),
          greenActivityCount: wallet.green_activity_count,
          greenBonusEarned: parseFloat(wallet.green_bonus_earned)
        },
        nftTokenId: wallet.nft_token_id,
        currency: 'DFt'
      });

    } catch (error) {
      handleDatabaseError(error, res);
    }
  }
);

/**
 * POST /api/v1/wallet/redeem-points
 * Pontok beváltása DFt-re (100 pont = 1 DFt)
 */
walletRouter.post('/redeem-points',
  authenticateToken,
  body('points').isInt({ min: 100 }),
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    const { points } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current wallet
      const walletResult = await client.query(
        'SELECT wallet_id, dft_balance, points_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [req.userId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = walletResult.rows[0];

      if (wallet.points_balance < points) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient points' });
      }

      const dftAmount = Math.floor(points / 100);
      const newDftBalance = parseFloat(wallet.dft_balance) + dftAmount;
      const newPointsBalance = wallet.points_balance - points;

      // Update wallet
      await client.query(
        `UPDATE wallets 
         SET dft_balance = $1, 
             points_balance = $2,
             total_earned = total_earned + $3,
             updated_at = CURRENT_TIMESTAMP,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE wallet_id = $4`,
        [newDftBalance, newPointsBalance, dftAmount, wallet.wallet_id]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO transactions 
         (user_id, wallet_id, transaction_type, amount, 
          balance_before, balance_after,
          points_redeemed, points_balance_before, points_balance_after,
          status, description, completed_at)
         VALUES ($1, $2, 'points_redeem', $3, $4, $5, $6, $7, $8, 'completed', $9, CURRENT_TIMESTAMP)`,
        [
          req.userId,
          wallet.wallet_id,
          dftAmount,
          wallet.dft_balance,
          newDftBalance,
          points,
          wallet.points_balance,
          newPointsBalance,
          `${points} pontot beváltva ${dftAmount} DFt-re`
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${points} pont sikeresen beváltva ${dftAmount} DFt-re`,
        newDftBalance,
        newPointsBalance
      });

    } catch (error) {
      await client.query('ROLLBACK');
      handleDatabaseError(error, res);
    } finally {
      client.release();
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// TRANSACTION ROUTES
// ═══════════════════════════════════════════════════════════════

const transactionRouter = Router();

/**
 * POST /api/v1/transaction/execute
 * Tranzakció végrehajtása
 */
transactionRouter.post('/execute',
  authenticateToken,
  body('type').isIn(['purchase', 'reward', 'burn']),
  body('amount').isFloat({ min: 0.00000001 }),
  body('productId').optional().isString(),
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    const { type, amount, productId } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get wallet with lock
      const walletResult = await client.query(
        'SELECT wallet_id, dft_balance, points_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [req.userId]
      );

      const wallet = walletResult.rows[0];

      if (type === 'purchase' && parseFloat(wallet.dft_balance) < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient DFt balance' });
      }

      let newBalance = parseFloat(wallet.dft_balance);
      let pointsAwarded = 0;

      if (type === 'purchase') {
        newBalance -= amount;
        pointsAwarded = Math.floor(amount * 10); // 1 DFt = 10 points
      } else if (type === 'reward') {
        newBalance += amount;
      } else if (type === 'burn') {
        newBalance -= amount;
      }

      const newPointsBalance = wallet.points_balance + pointsAwarded;

      // Update wallet
      await client.query(
        `UPDATE wallets 
         SET dft_balance = $1,
             points_balance = $2,
             total_spent = total_spent + CASE WHEN $4 = 'purchase' THEN $3 ELSE 0 END,
             total_burned = total_burned + CASE WHEN $4 = 'burn' THEN $3 ELSE 0 END,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE wallet_id = $5`,
        [newBalance, newPointsBalance, amount, type, wallet.wallet_id]
      );

      // Create transaction
      const txResult = await client.query(
        `INSERT INTO transactions 
         (user_id, wallet_id, transaction_type, amount,
          balance_before, balance_after,
          points_awarded, points_balance_before, points_balance_after,
          product_id, status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed', CURRENT_TIMESTAMP)
         RETURNING transaction_id, created_at`,
        [
          req.userId, wallet.wallet_id, type, amount,
          wallet.dft_balance, newBalance,
          pointsAwarded, wallet.points_balance, newPointsBalance,
          productId
        ]
      );

      await client.query('COMMIT');

      const transaction = txResult.rows[0];

      res.json({
        success: true,
        transaction: {
          transactionId: transaction.transaction_id,
          type,
          amount,
          pointsAwarded,
          newBalance,
          newPointsBalance,
          timestamp: transaction.created_at
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      handleDatabaseError(error, res);
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/v1/transaction/history
 * Tranzakciós előzmények
 */
transactionRouter.get('/history',
  authenticateToken,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    try {
      const result = await pool.query(
        `SELECT transaction_id, transaction_type, amount,
                points_awarded, points_redeemed,
                balance_before, balance_after,
                status, description,
                created_at, completed_at
         FROM transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.userId, limit, offset]
      );

      res.json({
        userId: req.userId,
        transactions: result.rows.map(tx => ({
          transactionId: tx.transaction_id,
          type: tx.transaction_type,
          amount: parseFloat(tx.amount),
          pointsAwarded: tx.points_awarded,
          pointsRedeemed: tx.points_redeemed,
          balanceBefore: parseFloat(tx.balance_before),
          balanceAfter: parseFloat(tx.balance_after),
          status: tx.status,
          description: tx.description,
          createdAt: tx.created_at,
          completedAt: tx.completed_at
        })),
        pagination: {
          limit,
          offset,
          total: result.rowCount
        }
      });

    } catch (error) {
      handleDatabaseError(error, res);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// CONTENT RIGHTS ROUTES
// ═══════════════════════════════════════════════════════════════

const contentRouter = Router();

/**
 * POST /api/v1/content/register-rights
 * Szerzői jogok regisztrálása
 */
contentRouter.post('/register-rights',
  authenticateToken,
  body('contentType').isIn(['voice', 'face', 'likeness', 'name']),
  body('allowLicensing').isBoolean(),
  body('royaltyRate').isFloat({ min: 0, max: 100 }),
  handleValidationErrors,
  async (req: AuthRequest, res: Response) => {
    const { contentType, allowLicensing, royaltyRate } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO content_rights 
         (user_id, content_type, is_protected, is_licensable, royalty_percentage)
         VALUES ($1, $2, true, $3, $4)
         ON CONFLICT (user_id, content_type) 
         DO UPDATE SET 
           is_licensable = EXCLUDED.is_licensable,
           royalty_percentage = EXCLUDED.royalty_percentage,
           updated_at = CURRENT_TIMESTAMP
         RETURNING rights_id, created_at`,
        [req.userId, contentType, allowLicensing, royaltyRate]
      );

      res.json({
        success: true,
        message: `${contentType === 'voice' ? 'Hang' : contentType === 'face' ? 'Arc' : 'Tartalom'} szerzői jog regisztrálva`,
        rightsId: result.rows[0].rights_id,
        contentType,
        isProtected: true,
        isLicensable: allowLicensing,
        royaltyRate
      });

    } catch (error) {
      handleDatabaseError(error, res);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

const app = express();
app.use(express.json());

// Mount routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/transaction', transactionRouter);
app.use('/api/v1/content', contentRouter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;