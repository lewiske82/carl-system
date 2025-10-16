-- 002_rls_policies.sql
-- RLS example policies for Supabase
-- Assumes auth.uid() returns User.id (UUID) mapped to users.user_id

-- Enable RLS
ALTER TABLE dap_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE dap_audit ENABLE ROW LEVEL SECURITY;

-- Only owner can access their own DÁP identities
CREATE POLICY "own_dap_identities_all"
  ON dap_identities
  FOR ALL
  USING (user_id = auth.uid());

-- Only owner can read their own audit events (by dap_uid linkage)
CREATE POLICY "own_dap_audit_select"
  ON dap_audit
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dap_identities di
    WHERE di.dap_uid = dap_audit.dap_uid
      AND di.user_id = auth.uid()
  ));
