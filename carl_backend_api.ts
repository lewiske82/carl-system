/**
 * CARL Backend API - Core Business Logic
 * Node.js + TypeScript + Express
 * Version: 0.1.0-beta
 */

import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

interface User {
  userId: string;
  cardNumber: string;
  voiceHash?: string;
  faceHash?: string;
  dftBalance: number;
  pointsBalance: number;
  nftTokenId?: string;
  createdAt: Date;
}

interface CardScanRequest {
  cardNumber: string;
  nfcData?: string;
  qrCode?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface BiometricAuthRequest {
  userId: string;
  biometricType: 'fingerprint' | 'face';
  biometricData: string; // Base64 encoded
}

interface Transaction {
  transactionId: string;
  userId: string;
  type: 'purchase' | 'reward' | 'burn' | 'royalty';
  amount: number;
  points?: number;
  productId?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

interface ContentRightsRequest {
  userId: string;
  contentType: 'voice' | 'face';
  allowLicensing: boolean;
  royaltyRate: number; // 0-100%
}

// ═══════════════════════════════════════════════════════════════
// EXPRESS APP SETUP
// ═══════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'carl-secret-key-change-in-production';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════
// MOCK DATABASES (Production: PostgreSQL + Redis)
// ═══════════════════════════════════════════════════════════════

const usersDB = new Map<string, User>();
const transactionsDB = new Map<string, Transaction>();
const sessionsDB = new Map<string, string>(); // token -> userId

// Initialize test user
usersDB.set('HU-12345678', {
  userId: 'HU-12345678',
  cardNumber: 'MSK-2025-001',
  voiceHash: crypto.createHash('sha256').update('test-voice').digest('hex'),
  faceHash: crypto.createHash('sha256').update('test-face').digest('hex'),
  dftBalance: 1000,
  pointsBalance: 250,
  nftTokenId: '1',
  createdAt: new Date()
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function generateTransactionId(): string {
  return `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function generateUserId(): string {
  return `HU-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function hashBiometric(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateJWT(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyJWT(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = verifyJWT(token);
  if (!userId) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  (req as any).userId = userId;
  next();
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'operational',
    version: '0.1.0-beta',
    system: 'CARL - Magyar Szív Kártya',
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/card-scan
 * Kártya beolvasása (NFC/QR)
 */
app.post('/api/v1/auth/card-scan', [
  body('cardNumber').notEmpty().isString(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { cardNumber, nfcData, qrCode, location }: CardScanRequest = req.body;

  console.log(`[AUTH] Kártya beolvasva: ${cardNumber}`);

  // Find user by card number
  let user: User | undefined;
  for (const [, u] of usersDB) {
    if (u.cardNumber === cardNumber) {
      user = u;
      break;
    }
  }

  if (!user) {
    return res.status(404).json({ 
      error: 'Kártya nem található',
      message: 'A kártya még nincs regisztrálva a rendszerben'
    });
  }

  // Generate JWT token
  const token = generateJWT(user.userId);
  sessionsDB.set(token, user.userId);

  res.json({
    success: true,
    message: 'Kártya sikeresen beolvasva',
    token,
    user: {
      userId: user.userId,
      cardNumber: user.cardNumber,
      dftBalance: user.dftBalance,
      pointsBalance: user.pointsBalance
    },
    requiresBiometric: true // Next step: biometric auth
  });
});

/**
 * POST /api/v1/auth/biometric
 * Biometrikus azonosítás
 */
app.post('/api/v1/auth/biometric', [
  body('userId').notEmpty(),
  body('biometricType').isIn(['fingerprint', 'face']),
  body('biometricData').notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, biometricType, biometricData }: BiometricAuthRequest = req.body;

  const user = usersDB.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Hash the biometric data
  const inputHash = hashBiometric(biometricData);

  // Verify against stored hash
  let isValid = false;
  if (biometricType === 'face' && user.faceHash === inputHash) {
    isValid = true;
  } else if (biometricType === 'fingerprint' && user.voiceHash === inputHash) {
    // In real app, separate fingerprint hash
    isValid = true;
  }

  if (!isValid) {
    return res.status(401).json({ 
      error: 'Biometrikus azonosítás sikertelen',
      message: 'Az ujjlenyomat/arc nem egyezik'
    });
  }

  console.log(`[AUTH] Biometrikus azonosítás sikeres: ${userId}`);

  const token = generateJWT(userId);

  res.json({
    success: true,
    message: 'Sikeres bejelentkezés',
    token,
    user: {
      userId: user.userId,
      cardNumber: user.cardNumber,
      dftBalance: user.dftBalance,
      pointsBalance: user.pointsBalance,
      nftTokenId: user.nftTokenId
    }
  });
});

// ─────────────────────────────────────────────────────────────
// WALLET & BALANCE ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/wallet/balance
 * Egyenleg lekérdezés
 */
app.get('/api/v1/wallet/balance', authenticateToken, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = usersDB.get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    userId: user.userId,
    dftBalance: user.dftBalance,
    pointsBalance: user.pointsBalance,
    nftTokenId: user.nftTokenId,
    currency: 'DFt'
  });
});

/**
 * POST /api/v1/wallet/redeem-points
 * Pontok beváltása DFt-re (100 pont = 1 DFt)
 */
app.post('/api/v1/wallet/redeem-points', authenticateToken, [
  body('points').isInt({ min: 100 })
], (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = (req as any).userId;
  const { points } = req.body;

  const user = usersDB.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.pointsBalance < points) {
    return res.status(400).json({ error: 'Insufficient points' });
  }

  const dftAmount = Math.floor(points / 100);
  user.pointsBalance -= points;
  user.dftBalance += dftAmount;

  console.log(`[WALLET] Pontok beváltva: ${points} pont → ${dftAmount} DFt (${userId})`);

  res.json({
    success: true,
    message: `${points} pont sikeresen beváltva ${dftAmount} DFt-re`,
    newDftBalance: user.dftBalance,
    newPointsBalance: user.pointsBalance
  });
});

// ─────────────────────────────────────────────────────────────
// TRANSACTION ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/transaction/execute
 * Tranzakció végrehajtása (vásárlás, burn, stb.)
 */
app.post('/api/v1/transaction/execute', authenticateToken, [
  body('type').isIn(['purchase', 'reward', 'burn']),
  body('amount').isFloat({ min: 0.01 }),
], (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = (req as any).userId;
  const { type, amount, productId, points } = req.body;

  const user = usersDB.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (type === 'purchase' && user.dftBalance < amount) {
    return res.status(400).json({ error: 'Insufficient DFt balance' });
  }

  const transactionId = generateTransactionId();
  const transaction: Transaction = {
    transactionId,
    userId,
    type,
    amount,
    points: points || 0,
    productId,
    timestamp: new Date(),
    status: 'completed'
  };

  // Execute transaction logic
  if (type === 'purchase') {
    user.dftBalance -= amount;
    // Award points (1 DFt spent = 10 points)
    const earnedPoints = Math.floor(amount * 10);
    user.pointsBalance += earnedPoints;
    transaction.points = earnedPoints;
  } else if (type === 'burn') {
    user.dftBalance -= amount;
    // Deflation mechanism
  }

  transactionsDB.set(transactionId, transaction);

  console.log(`[TRANSACTION] ${type}: ${amount} DFt (${userId}) - TX: ${transactionId}`);

  res.json({
    success: true,
    transaction: {
      transactionId,
      type,
      amount,
      points: transaction.points,
      newBalance: user.dftBalance,
      timestamp: transaction.timestamp
    }
  });
});

/**
 * GET /api/v1/transaction/history
 * Tranzakciós előzmények
 */
app.get('/api/v1/transaction/history', authenticateToken, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const limit = parseInt(req.query.limit as string) || 20;

  const userTransactions = Array.from(transactionsDB.values())
    .filter(tx => tx.userId === userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);

  res.json({
    userId,
    transactions: userTransactions,
    total: userTransactions.length
  });
});

// ─────────────────────────────────────────────────────────────
// POINTS & REWARDS ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/points/history
 * Pontgyűjtési előzmények
 */
app.get('/api/v1/points/history', authenticateToken, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = usersDB.get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Mock points history
  const pointsHistory = [
    { date: '2025-09-28', points: 50, reason: 'Újrahasznosítás' },
    { date: '2025-09-25', points: 100, reason: 'Vásárlás (10 DFt)' },
    { date: '2025-09-20', points: 50, reason: 'Zöld bónusz' },
  ];

  res.json({
    userId,
    currentBalance: user.pointsBalance,
    history: pointsHistory
  });
});

/**
 * POST /api/v1/points/green-activity
 * Zöld tevékenység regisztrálása (újrahasznosítás)
 */
app.post('/api/v1/points/green-activity', authenticateToken, [
  body('activityType').isIn(['recycling', 'public-transport', 'green-purchase'])
], (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { activityType } = req.body;

  const user = usersDB.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Award green points
  const greenPoints = 50;
  user.pointsBalance += greenPoints;

  // 10% DFt bonus
  const bonus = Math.floor(user.dftBalance * 0.1);
  user.dftBalance += bonus;

  console.log(`[GREEN] Zöld tevékenység: ${activityType} (${userId}) → +${greenPoints} pont, +${bonus} DFt`);

  res.json({
    success: true,
    message: 'Zöld tevékenység rögzítve!',
    pointsAwarded: greenPoints,
    dftBonus: bonus,
    newPointsBalance: user.pointsBalance,
    newDftBalance: user.dftBalance
  });
});

// ─────────────────────────────────────────────────────────────
// CONTENT RIGHTS & NFT ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/content/register-rights
 * Szerzői jogok regisztrálása (hang/arc védelme)
 */
app.post('/api/v1/content/register-rights', authenticateToken, [
  body('contentType').isIn(['voice', 'face']),
  body('allowLicensing').isBoolean(),
  body('royaltyRate').isFloat({ min: 0, max: 100 })
], (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { contentType, allowLicensing, royaltyRate }: ContentRightsRequest = req.body;

  const user = usersDB.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  console.log(`[CONTENT] Szerzői jog regisztrálva: ${contentType} (${userId}) - Licensable: ${allowLicensing}, Royalty: ${royaltyRate}%`);

  res.json({
    success: true,
    message: `${contentType === 'voice' ? 'Hang' : 'Arc'} szerzői jog sikeresen regisztrálva`,
    contentType,
    allowLicensing,
    royaltyRate,
    protectionActive: true
  });
});

/**
 * GET /api/v1/nft/soulbound/:userId
 * Soulbound NFT információk lekérdezése
 */
app.get('/api/v1/nft/soulbound/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = usersDB.get(userId);

  if (!user || !user.nftTokenId) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  res.json({
    tokenId: user.nftTokenId,
    owner: userId,
    cardNumber: user.cardNumber,
    isSoulbound: true,
    transferable: false,
    metadata: {
      voiceProtected: !!user.voiceHash,
      faceProtected: !!user.faceHash,
      issueDate: user.createdAt
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ═══════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🇭🇺  CARL Backend API Server');
  console.log('    Magyar Szív Kártya - Digitális Forint Ökoszisztéma');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📡  Server running on: http://localhost:${PORT}`);
  console.log(`🔒  JWT Authentication: Enabled`);
  console.log(`🗄️   Database: In-Memory (Mock)`);
  console.log(`📊  Status: BÉTATESZTELÉS`);
  console.log(`✅  Health check: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📋 Available Endpoints:');
  console.log('   POST   /api/v1/auth/card-scan');
  console.log('   POST   /api/v1/auth/biometric');
  console.log('   GET    /api/v1/wallet/balance');
  console.log('   POST   /api/v1/wallet/redeem-points');
  console.log('   POST   /api/v1/transaction/execute');
  console.log('   GET    /api/v1/transaction/history');
  console.log('   GET    /api/v1/points/history');
  console.log('   POST   /api/v1/points/green-activity');
  console.log('   POST   /api/v1/content/register-rights');
  console.log('   GET    /api/v1/nft/soulbound/:userId');
  console.log('\n🚀 Ready to accept requests!');
});