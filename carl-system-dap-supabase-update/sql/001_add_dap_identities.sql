-- 001_add_dap_identities.sql
-- Generated: 2025-10-16T12:14:54.348923Z
-- Safe to apply on existing CARL schema (adds new tables only).

BEGIN;

CREATE TABLE IF NOT EXISTS dap_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  dap_uid TEXT UNIQUE NOT NULL,
  nft_hash TEXT,
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attributes JSONB,
  consent_log JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dap_identities_user ON dap_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_dap_identities_status ON dap_identities(status);

CREATE TABLE IF NOT EXISTS dap_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dap_uid TEXT NOT NULL,
  action TEXT NOT NULL, -- LOGIN, ATTR_READ, CONSENT_GRANTED, CONSENT_REVOKED, VERIFY_OK, VERIFY_FAIL
  ip_address INET,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: Ensure dap_uid stored on users for quick joins (nullable).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS dap_uid TEXT UNIQUE;

COMMIT;
