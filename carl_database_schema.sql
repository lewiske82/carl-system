-- ═══════════════════════════════════════════════════════════════
-- CARL - Magyar Szív Kártya Database Schema
-- PostgreSQL 15+ with JSONB support
-- Version: 0.1.0-beta
-- ═══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Full-text search

-- ═══════════════════════════════════════════════════════════════
-- 1. USER MANAGEMENT & IDENTITY
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_number VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    
    -- Personal info (encrypted)
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    kyc_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- GDPR
    gdpr_consent_given BOOLEAN DEFAULT false,
    gdpr_consent_date TIMESTAMP WITH TIME ZONE,
    data_retention_until DATE,
    
    CONSTRAINT valid_card_number CHECK (card_number ~ '^MSK-[0-9]{4}-[0-9]{3}$')
);

CREATE INDEX idx_users_card_number ON users(card_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);


-- ═══════════════════════════════════════════════════════════════
-- 2. BIOMETRIC DATA (NEVER STORE RAW DATA!)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE biometric_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Template types
    biometric_type VARCHAR(20) NOT NULL, -- 'voice', 'face', 'fingerprint'
    
    -- CRITICAL: Only store hashes, never raw biometric data
    template_hash TEXT NOT NULL, -- SHA-256 hash of biometric template
    salt BYTEA NOT NULL, -- Salt for hashing
    
    -- Encrypted metadata (AES-256)
    encrypted_metadata JSONB,
    
    -- Algorithm info
    algorithm VARCHAR(50) DEFAULT 'SHA256',
    version VARCHAR(10) DEFAULT '1.0',
    
    -- Security
    is_active BOOLEAN DEFAULT true,
    last_verified TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT biometric_type_check CHECK (biometric_type IN ('voice', 'face', 'fingerprint')),
    CONSTRAINT unique_user_biometric UNIQUE (user_id, biometric_type)
);

CREATE INDEX idx_biometric_user_id ON biometric_templates(user_id);
CREATE INDEX idx_biometric_type ON biometric_templates(biometric_type);


-- ═══════════════════════════════════════════════════════════════
-- 3. NFT & BLOCKCHAIN
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE soulbound_nfts (
    nft_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    
    -- Blockchain data
    token_id BIGINT UNIQUE NOT NULL,
    contract_address VARCHAR(42) NOT NULL, -- Ethereum address
    blockchain VARCHAR(20) DEFAULT 'polygon', -- ethereum, polygon, etc.
    
    -- NFT metadata
    metadata_uri TEXT,
    metadata_hash TEXT,
    
    -- Soulbound attributes
    is_soulbound BOOLEAN DEFAULT true,
    transferable BOOLEAN DEFAULT false,
    
    -- Inheritance
    inheritance_address VARCHAR(42),
    inheritance_active BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,
    
    -- Timestamps
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_contract_address CHECK (contract_address ~ '^0x[a-fA-F0-9]{40}$')
);

CREATE INDEX idx_nft_user_id ON soulbound_nfts(user_id);
CREATE INDEX idx_nft_token_id ON soulbound_nfts(token_id);
CREATE INDEX idx_nft_contract ON soulbound_nfts(contract_address);


-- ═══════════════════════════════════════════════════════════════
-- 4. DIGITAL FORINT (DFt) WALLET
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE wallets (
    wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    
    -- Balances
    dft_balance NUMERIC(20, 8) DEFAULT 0.0 CHECK (dft_balance >= 0),
    points_balance INTEGER DEFAULT 0 CHECK (points_balance >= 0),
    
    -- Statistics
    total_earned NUMERIC(20, 8) DEFAULT 0.0,
    total_spent NUMERIC(20, 8) DEFAULT 0.0,
    total_burned NUMERIC(20, 8) DEFAULT 0.0,
    
    -- Green activities
    green_activity_count INTEGER DEFAULT 0,
    green_bonus_earned NUMERIC(20, 8) DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_transaction_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_wallet_user_id ON wallets(user_id);
CREATE INDEX idx_wallet_balance ON wallets(dft_balance);


-- ═══════════════════════════════════════════════════════════════
-- 5. TRANSACTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    wallet_id UUID REFERENCES wallets(wallet_id) ON DELETE SET NULL,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL, -- purchase, reward, burn, transfer, royalty
    amount NUMERIC(20, 8) NOT NULL,
    
    -- Points
    points_awarded INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    
    -- Related entities
    product_id UUID,
    merchant_id UUID,
    
    -- Blockchain reference
    blockchain_tx_hash VARCHAR(66), -- Ethereum tx hash
    blockchain_confirmed BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
    
    -- Metadata
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN 
        ('purchase', 'reward', 'burn', 'transfer', 'royalty', 'green_bonus', 'points_redeem')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_transaction_user_id ON transactions(user_id);
CREATE INDEX idx_transaction_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transaction_type ON transactions(transaction_type);
CREATE INDEX idx_transaction_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transaction_blockchain ON transactions(blockchain_tx_hash);


-- ═══════════════════════════════════════════════════════════════
-- 6. CONTENT RIGHTS & LICENSING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE content_rights (
    rights_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Content type
    content_type VARCHAR(20) NOT NULL, -- voice, face, likeness
    
    -- Rights status
    is_protected BOOLEAN DEFAULT true,
    is_licensable BOOLEAN DEFAULT false,
    
    -- Licensing terms
    royalty_percentage NUMERIC(5, 2) DEFAULT 15.0 CHECK (royalty_percentage BETWEEN 0 AND 100),
    license_type VARCHAR(20) DEFAULT 'commercial', -- personal, commercial, editorial
    
    -- Zero-knowledge proof data
    zkp_commitment TEXT,
    zkp_salt BYTEA,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_content_type CHECK (content_type IN ('voice', 'face', 'likeness', 'name')),
    CONSTRAINT unique_user_content UNIQUE (user_id, content_type)
);

CREATE INDEX idx_content_rights_user_id ON content_rights(user_id);
CREATE INDEX idx_content_rights_licensable ON content_rights(is_licensable);


CREATE TABLE content_licenses (
    license_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rights_id UUID REFERENCES content_rights(rights_id) ON DELETE CASCADE,
    
    -- Licensor & Licensee
    licensor_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    licensee_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    licensee_company_name VARCHAR(255),
    
    -- License terms
    usage_type VARCHAR(50) NOT NULL, -- commercial-ad, social-media, film, etc.
    territory VARCHAR(100) DEFAULT 'worldwide',
    duration_days INTEGER,
    
    -- Financial
    royalty_rate NUMERIC(5, 2) NOT NULL,
    total_paid NUMERIC(20, 8) DEFAULT 0.0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_license_rights_id ON content_licenses(rights_id);
CREATE INDEX idx_license_licensor ON content_licenses(licensor_user_id);
CREATE INDEX idx_license_licensee ON content_licenses(licensee_user_id);
CREATE INDEX idx_license_active ON content_licenses(is_active);


-- ═══════════════════════════════════════════════════════════════
-- 7. CARL AI CONTENT MONITORING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE monitored_content (
    content_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Content details
    platform VARCHAR(50) NOT NULL, -- instagram, tiktok, youtube, etc.
    platform_content_id VARCHAR(255),
    content_url TEXT,
    content_type VARCHAR(20) NOT NULL, -- text, image, video, audio
    
    -- Analysis results
    is_synthetic BOOLEAN DEFAULT false,
    deepfake_confidence NUMERIC(5, 4), -- 0.0000 to 1.0000
    
    -- Flags
    has_hidden_ad BOOLEAN DEFAULT false,
    has_misinformation BOOLEAN DEFAULT false,
    has_copyright_violation BOOLEAN DEFAULT false,
    
    -- Related user (if copyright violation)
    affected_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- AI analysis metadata
    analysis_metadata JSONB,
    threat_level VARCHAR(20), -- safe, suspicious, harmful, illegal
    
    -- Timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analyzed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_platform CHECK (platform IN 
        ('instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'other')),
    CONSTRAINT valid_content_type CHECK (content_type IN 
        ('text', 'image', 'video', 'audio', 'mixed'))
);

CREATE INDEX idx_monitored_platform ON monitored_content(platform);
CREATE INDEX idx_monitored_detected_at ON monitored_content(detected_at DESC);
CREATE INDEX idx_monitored_flags ON monitored_content(has_copyright_violation, has_hidden_ad);
CREATE INDEX idx_monitored_user ON monitored_content(affected_user_id);


-- ═══════════════════════════════════════════════════════════════
-- 8. GDPR COMPLIANCE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE gdpr_consents (
    consent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Consent details
    purpose VARCHAR(100) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT,
    
    -- Legal basis
    legal_basis VARCHAR(50), -- contract, legitimate_interest, consent
    
    -- Tracking
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    given_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_consent_user_id ON gdpr_consents(user_id);
CREATE INDEX idx_consent_purpose ON gdpr_consents(purpose);


CREATE TABLE data_access_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Access details
    accessed_by VARCHAR(100) NOT NULL, -- system, admin, user
    accessor_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- What was accessed
    access_type VARCHAR(20) NOT NULL, -- read, write, delete
    data_category VARCHAR(50) NOT NULL, -- biometric, financial, personal
    
    -- Purpose
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50),
    
    -- Metadata
    ip_address INET,
    metadata JSONB,
    
    -- Timestamp
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_access_type CHECK (access_type IN ('read', 'write', 'delete', 'export'))
);

CREATE INDEX idx_access_log_user_id ON data_access_logs(user_id);
CREATE INDEX idx_access_log_accessed_at ON data_access_logs(accessed_at DESC);
CREATE INDEX idx_access_log_accessor ON data_access_logs(accessor_user_id);


CREATE TABLE data_deletion_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Request details
    reason TEXT,
    data_categories TEXT[], -- Array of categories to delete
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, completed, rejected
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_deletion_status CHECK (status IN ('pending', 'approved', 'completed', 'rejected'))
);

CREATE INDEX idx_deletion_user_id ON data_deletion_requests(user_id);
CREATE INDEX idx_deletion_status ON data_deletion_requests(status);


-- ═══════════════════════════════════════════════════════════════
-- 9. POINTS & REWARDS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE points_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(wallet_id) ON DELETE CASCADE,
    
    -- Points change
    points_change INTEGER NOT NULL, -- Positive or negative
    points_balance_after INTEGER NOT NULL,
    
    -- Reason
    reason_code VARCHAR(50) NOT NULL, -- green_activity, purchase, redeem, etc.
    description TEXT,
    
    -- Related transaction
    transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_points_history_user_id ON points_history(user_id);
CREATE INDEX idx_points_history_created_at ON points_history(created_at DESC);


CREATE TABLE green_activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- recycling, public_transport, green_purchase
    description TEXT,
    
    -- Rewards
    points_awarded INTEGER DEFAULT 0,
    dft_bonus NUMERIC(20, 8) DEFAULT 0.0,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(100),
    
    -- Location (optional)
    location_lat NUMERIC(10, 7),
    location_lng NUMERIC(10, 7),
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_green_activity_user_id ON green_activities(user_id);
CREATE INDEX idx_green_activity_type ON green_activities(activity_type);
CREATE INDEX idx_green_activity_created_at ON green_activities(created_at DESC);


-- ═══════════════════════════════════════════════════════════════
-- 10. AUDIT & SECURITY
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    actor_type VARCHAR(20), -- user, admin, system, api
    
    -- What
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Details
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    
    -- Result
    status VARCHAR(20), -- success, failure
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);


-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS FOR AUTO-UPDATE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biometric_updated_at BEFORE UPDATE ON biometric_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nft_updated_at BEFORE UPDATE ON soulbound_nfts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════
-- VIEWS FOR ANALYTICS
-- ═══════════════════════════════════════════════════════════════

CREATE VIEW user_overview AS
SELECT 
    u.user_id,
    u.card_number,
    u.email,
    u.is_active,
    w.dft_balance,
    w.points_balance,
    w.green_activity_count,
    n.token_id as nft_token_id,
    u.created_at
FROM users u
LEFT JOIN wallets w ON u.user_id = w.user_id
LEFT JOIN soulbound_nfts n ON u.user_id = n.user_id;


CREATE VIEW transaction_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    transaction_type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    SUM(points_awarded) as total_points_awarded
FROM transactions
WHERE status = 'completed'
GROUP BY DATE_TRUNC('day', created_at), transaction_type
ORDER BY date DESC;


-- ═══════════════════════════════════════════════════════════════
-- REDIS CACHE SCHEMA (Key patterns)
-- ═══════════════════════════════════════════════════════════════

/*
Redis Cache Strategy:

1. Session Management:
   - Key: session:{session_token}
   - TTL: 24 hours
   - Value: {user_id, card_number, expires_at}

2. Balance Cache:
   - Key: balance:{user_id}
   - TTL: 5 minutes
   - Value: {dft_balance, points_balance}

3. ZKP Challenge Cache:
   - Key: zkp:{session_id}
   - TTL: 5 minutes
   - Value: {commitment, challenge, salt, created_at}

4. Rate Limiting:
   - Key: ratelimit:{ip_address}:{endpoint}
   - TTL: 1 minute
   - Value: request_count

5. API Response Cache:
   - Key: api:transaction:{user_id}:history
   - TTL: 1 minute
   - Value: serialized transaction list

Redis Commands Example:
SET session:abc123 '{"user_id":"uuid","card_number":"MSK-2025-001"}' EX 86400
GET balance:user-uuid
INCR ratelimit:192.168.1.1:/api/transaction
*/


-- ═══════════════════════════════════════════════════════════════
-- SAMPLE DATA (For testing)
-- ═══════════════════════════════════════════════════════════════

-- Insert test user
INSERT INTO users (card_number, email, first_name, last_name, is_active, gdpr_consent_given)
VALUES ('MSK-2025-001', 'test@carl.hu', 'Test', 'User', true, true);

-- Insert wallet for test user
INSERT INTO wallets (user_id, dft_balance, points_balance)
SELECT user_id, 1000.0, 250 FROM users WHERE card_number = 'MSK-2025-001';

-- ═══════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════