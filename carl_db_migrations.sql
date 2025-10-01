-- ═══════════════════════════════════════════════════════════════
-- CARL Database Migrations
-- Migration 001: Initial Schema
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
-- USERS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_number VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    
    -- Personal info (encrypted in application layer)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- GDPR
    gdpr_consent_given BOOLEAN DEFAULT false NOT NULL,
    gdpr_consent_date TIMESTAMP WITH TIME ZONE,
    data_retention_until DATE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_card_number CHECK (card_number ~ '^MSK-[0-9]{4}-[0-9]{3}$'),
    CONSTRAINT valid_kyc_status CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired'))
);

CREATE INDEX idx_users_card_number ON users(card_number);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

COMMENT ON TABLE users IS 'Felhasználói fiókok - Magyar Szív Kártya tulajdonosok';
COMMENT ON COLUMN users.card_number IS 'Egyedi kártya azonosító - MSK-YYYY-NNN formátum';
COMMENT ON COLUMN users.kyc_status IS 'Know Your Customer státusz';

-- ═══════════════════════════════════════════════════════════════
-- WALLETS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE wallets (
    wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Balances (NUMERIC for precision)
    dft_balance NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    points_balance INTEGER DEFAULT 0 NOT NULL,
    
    -- Statistics
    total_earned NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    total_spent NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    total_burned NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    
    -- Green activities
    green_activity_count INTEGER DEFAULT 0 NOT NULL,
    green_bonus_earned NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    last_green_activity_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_dft_balance CHECK (dft_balance >= 0),
    CONSTRAINT valid_points_balance CHECK (points_balance >= 0),
    CONSTRAINT valid_green_count CHECK (green_activity_count >= 0)
);

CREATE INDEX idx_wallet_user_id ON wallets(user_id);
CREATE INDEX idx_wallet_dft_balance ON wallets(dft_balance) WHERE dft_balance > 0;
CREATE INDEX idx_wallet_points_balance ON wallets(points_balance) WHERE points_balance > 0;

COMMENT ON TABLE wallets IS 'DFt wallet és pontegyenlegek';
COMMENT ON COLUMN wallets.dft_balance IS 'Digitális Forint egyenleg - 8 tizedesjegy pontossággal';

-- ═══════════════════════════════════════════════════════════════
-- TRANSACTIONS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    wallet_id UUID NOT NULL REFERENCES wallets(wallet_id) ON DELETE RESTRICT,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    
    -- Before/After balances for audit
    balance_before NUMERIC(20, 8) NOT NULL,
    balance_after NUMERIC(20, 8) NOT NULL,
    
    -- Points
    points_awarded INTEGER DEFAULT 0 NOT NULL,
    points_redeemed INTEGER DEFAULT 0 NOT NULL,
    points_balance_before INTEGER DEFAULT 0 NOT NULL,
    points_balance_after INTEGER DEFAULT 0 NOT NULL,
    
    -- Related entities
    product_id VARCHAR(100),
    merchant_id UUID,
    related_transaction_id UUID REFERENCES transactions(transaction_id),
    
    -- Blockchain reference
    blockchain_tx_hash VARCHAR(66),
    blockchain_confirmed BOOLEAN DEFAULT false NOT NULL,
    blockchain_confirmations INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    failure_reason TEXT,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- IP and location (for security)
    ip_address INET,
    location_lat NUMERIC(10, 7),
    location_lng NUMERIC(10, 7),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN 
        ('purchase', 'reward', 'burn', 'transfer', 'royalty', 'green_bonus', 
         'points_redeem', 'refund', 'fee')),
    CONSTRAINT valid_status CHECK (status IN 
        ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    CONSTRAINT valid_amount CHECK (amount >= 0),
    CONSTRAINT valid_blockchain_tx_hash CHECK (
        blockchain_tx_hash IS NULL OR blockchain_tx_hash ~ '^0x[a-fA-F0-9]{64}$'
    )
);

CREATE INDEX idx_transaction_user_id ON transactions(user_id);
CREATE INDEX idx_transaction_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transaction_type ON transactions(transaction_type);
CREATE INDEX idx_transaction_status ON transactions(status);
CREATE INDEX idx_transaction_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transaction_blockchain_hash ON transactions(blockchain_tx_hash) 
    WHERE blockchain_tx_hash IS NOT NULL;
CREATE INDEX idx_transaction_metadata ON transactions USING gin(metadata);

COMMENT ON TABLE transactions IS 'Összes tranzakció - DFt és pontok';
COMMENT ON COLUMN transactions.balance_before IS 'Audit trail: egyenleg a tranzakció előtt';

-- ═══════════════════════════════════════════════════════════════
-- CONTENT RIGHTS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE content_rights (
    rights_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Content type
    content_type VARCHAR(20) NOT NULL,
    
    -- Rights status
    is_protected BOOLEAN DEFAULT true NOT NULL,
    is_licensable BOOLEAN DEFAULT false NOT NULL,
    
    -- Licensing terms
    royalty_percentage NUMERIC(5, 2) DEFAULT 15.00 NOT NULL,
    license_type VARCHAR(20) DEFAULT 'commercial' NOT NULL,
    
    -- Usage restrictions
    allowed_usages TEXT[] DEFAULT ARRAY[]::TEXT[],
    prohibited_usages TEXT[] DEFAULT ARRAY[]::TEXT[],
    territory_restrictions TEXT[] DEFAULT ARRAY['worldwide']::TEXT[],
    
    -- Zero-knowledge proof data (for privacy-preserving auth)
    zkp_commitment TEXT,
    zkp_salt BYTEA,
    
    -- Blockchain reference
    nft_token_id BIGINT,
    smart_contract_address VARCHAR(42),
    
    -- Statistics
    total_licenses_granted INTEGER DEFAULT 0 NOT NULL,
    total_royalties_earned NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_content_type CHECK (content_type IN 
        ('voice', 'face', 'likeness', 'name', 'signature')),
    CONSTRAINT valid_royalty_percentage CHECK (
        royalty_percentage >= 0 AND royalty_percentage <= 100
    ),
    CONSTRAINT valid_license_type CHECK (license_type IN 
        ('personal', 'commercial', 'editorial', 'restricted')),
    CONSTRAINT unique_user_content_type UNIQUE (user_id, content_type)
);

CREATE INDEX idx_content_rights_user_id ON content_rights(user_id);
CREATE INDEX idx_content_rights_type ON content_rights(content_type);
CREATE INDEX idx_content_rights_licensable ON content_rights(is_licensable) 
    WHERE is_licensable = true;
CREATE INDEX idx_content_rights_nft ON content_rights(nft_token_id) 
    WHERE nft_token_id IS NOT NULL;

COMMENT ON TABLE content_rights IS 'Szerzői jogi védelem - hang, arc, megjelenés';
COMMENT ON COLUMN content_rights.zkp_commitment IS 'Zero-knowledge proof commitment biometrikus authhoz';

-- ═══════════════════════════════════════════════════════════════
-- CONTENT LICENSES TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE content_licenses (
    license_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rights_id UUID NOT NULL REFERENCES content_rights(rights_id) ON DELETE CASCADE,
    
    -- Parties
    licensor_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    licensee_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    licensee_company_name VARCHAR(255),
    licensee_email VARCHAR(255),
    
    -- License terms
    usage_type VARCHAR(100) NOT NULL,
    usage_description TEXT,
    territory VARCHAR(100) DEFAULT 'worldwide' NOT NULL,
    duration_days INTEGER,
    is_exclusive BOOLEAN DEFAULT false NOT NULL,
    
    -- Financial
    royalty_rate NUMERIC(5, 2) NOT NULL,
    fixed_fee NUMERIC(20, 8),
    revenue_share_percentage NUMERIC(5, 2),
    total_paid NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    
    -- Smart contract
    smart_contract_address VARCHAR(42),
    blockchain_tx_hash VARCHAR(66),
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN 
        ('pending', 'active', 'expired', 'terminated', 'breached')),
    CONSTRAINT valid_royalty_rate CHECK (
        royalty_rate >= 0 AND royalty_rate <= 100
    ),
    CONSTRAINT licensee_required CHECK (
        licensee_user_id IS NOT NULL OR 
        licensee_company_name IS NOT NULL OR 
        licensee_email IS NOT NULL
    )
);

CREATE INDEX idx_license_rights_id ON content_licenses(rights_id);
CREATE INDEX idx_license_licensor ON content_licenses(licensor_user_id);
CREATE INDEX idx_license_licensee ON content_licenses(licensee_user_id) 
    WHERE licensee_user_id IS NOT NULL;
CREATE INDEX idx_license_active ON content_licenses(is_active) WHERE is_active = true;
CREATE INDEX idx_license_expires_at ON content_licenses(expires_at) 
    WHERE expires_at IS NOT NULL;

COMMENT ON TABLE content_licenses IS 'Kiadott licenszek tartalomhasználatra';

-- ═══════════════════════════════════════════════════════════════
-- BIOMETRIC TEMPLATES (Security Critical!)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE biometric_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Template type
    biometric_type VARCHAR(20) NOT NULL,
    
    -- CRITICAL: Only store hashes, NEVER raw biometric data!
    template_hash TEXT NOT NULL,
    salt BYTEA NOT NULL,
    
    -- Encrypted metadata (algorithm, version, etc.)
    encrypted_metadata BYTEA,
    
    -- Algorithm info
    algorithm VARCHAR(50) DEFAULT 'SHA256' NOT NULL,
    hash_version VARCHAR(10) DEFAULT '1.0' NOT NULL,
    
    -- Security tracking
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_verified TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_biometric_type CHECK (biometric_type IN 
        ('voice', 'face', 'fingerprint', 'iris')),
    CONSTRAINT unique_user_biometric UNIQUE (user_id, biometric_type)
);

CREATE INDEX idx_biometric_user_id ON biometric_templates(user_id);
CREATE INDEX idx_biometric_type ON biometric_templates(biometric_type);
CREATE INDEX idx_biometric_active ON biometric_templates(is_active) WHERE is_active = true;

COMMENT ON TABLE biometric_templates IS 'Biometrikus template-ek (csak hash-ek, GDPR-safe)';
COMMENT ON COLUMN biometric_templates.template_hash IS 'SHA-256 hash - SOHA nem raw biometric adat!';

-- ═══════════════════════════════════════════════════════════════
-- SOULBOUND NFTs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE soulbound_nfts (
    nft_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Blockchain data
    token_id BIGINT UNIQUE NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    blockchain VARCHAR(20) DEFAULT 'polygon' NOT NULL,
    
    -- NFT metadata
    metadata_uri TEXT,
    metadata_hash TEXT,
    ipfs_hash VARCHAR(100),
    
    -- Soulbound attributes
    is_soulbound BOOLEAN DEFAULT true NOT NULL,
    transferable BOOLEAN DEFAULT false NOT NULL,
    
    -- Inheritance setup
    inheritance_address VARCHAR(42),
    inheritance_active BOOLEAN DEFAULT false NOT NULL,
    inheritance_conditions JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,
    revoked_by VARCHAR(100),
    
    -- Timestamps
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_contract_address CHECK (
        contract_address ~ '^0x[a-fA-F0-9]{40}$'
    ),
    CONSTRAINT valid_blockchain CHECK (blockchain IN 
        ('ethereum', 'polygon', 'binance-smart-chain', 'arbitrum')),
    CONSTRAINT valid_inheritance_address CHECK (
        inheritance_address IS NULL OR 
        inheritance_address ~ '^0x[a-fA-F0-9]{40}$'
    )
);

CREATE INDEX idx_nft_user_id ON soulbound_nfts(user_id);
CREATE INDEX idx_nft_token_id ON soulbound_nfts(token_id);
CREATE INDEX idx_nft_contract ON soulbound_nfts(contract_address);
CREATE INDEX idx_nft_active ON soulbound_nfts(is_active) WHERE is_active = true;

COMMENT ON TABLE soulbound_nfts IS 'Soulbound NFT-k - nem átruházható Magyar Szív Kártya tokenek';

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at 
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_rights_updated_at 
    BEFORE UPDATE ON content_rights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biometric_templates_updated_at 
    BEFORE UPDATE ON biometric_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soulbound_nfts_updated_at 
    BEFORE UPDATE ON soulbound_nfts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA (Test Users)
-- ═══════════════════════════════════════════════════════════════

-- Test User 1
INSERT INTO users (card_number, email, first_name, last_name, is_active, is_verified, gdpr_consent_given, gdpr_consent_date)
VALUES 
    ('MSK-2025-001', 'test1@carl.hu', 'Test', 'Felhasználó', true, true, true, CURRENT_TIMESTAMP),
    ('MSK-2025-002', 'test2@carl.hu', 'Demo', 'User', true, true, true, CURRENT_TIMESTAMP),
    ('MSK-2025-003', 'admin@carl.hu', 'Admin', 'Account', true, true, true, CURRENT_TIMESTAMP);

-- Create wallets for test users
INSERT INTO wallets (user_id, dft_balance, points_balance)
SELECT user_id, 1000.00000000, 250 FROM users WHERE card_number = 'MSK-2025-001'
UNION ALL
SELECT user_id, 500.00000000, 100 FROM users WHERE card_number = 'MSK-2025-002'
UNION ALL
SELECT user_id, 10000.00000000, 5000 FROM users WHERE card_number = 'MSK-2025-003';

-- Create NFTs for test users
INSERT INTO soulbound_nfts (user_id, token_id, contract_address, blockchain)
SELECT user_id, 1, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', 'polygon' 
FROM users WHERE card_number = 'MSK-2025-001'
UNION ALL
SELECT user_id, 2, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', 'polygon' 
FROM users WHERE card_number = 'MSK-2025-002';

-- Sample transaction
INSERT INTO transactions (
    user_id, 
    wallet_id, 
    transaction_type, 
    amount, 
    balance_before, 
    balance_after,
    points_awarded,
    points_balance_before,
    points_balance_after,
    status,
    description,
    completed_at
)
SELECT 
    u.user_id,
    w.wallet_id,
    'reward',
    100.00000000,
    900.00000000,
    1000.00000000,
    250,
    0,
    250,
    'completed',
    'Welcome bonus',
    CURRENT_TIMESTAMP
FROM users u
JOIN wallets w ON u.user_id = w.user_id
WHERE u.card_number = 'MSK-2025-001';

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- USEFUL VIEWS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_user_overview AS
SELECT 
    u.user_id,
    u.card_number,
    u.email,
    u.first_name,
    u.last_name,
    u.is_active,
    u.is_verified,
    w.dft_balance,
    w.points_balance,
    w.green_activity_count,
    n.token_id as nft_token_id,
    n.contract_address as nft_contract,
    u.created_at,
    u.last_login_at
FROM users u
LEFT JOIN wallets w ON u.user_id = w.user_id
LEFT JOIN soulbound_nfts n ON u.user_id = n.user_id;

COMMENT ON VIEW v_user_overview IS 'Teljes felhasználói áttekintés egy nézetben';

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════

-- Verify tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verify test data
SELECT * FROM v_user_overview;

-- Check wallet balances
SELECT u.card_number, w.dft_balance, w.points_balance 
FROM users u JOIN wallets w ON u.user_id = w.user_id;