// src/carl_backend_supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

export function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY!
    supabase = createClient(url, key)
  }
  return supabase
}

// Helpers
export async function saveDapIdentity(input: {
  user_id: string
  dap_uid: string
  attributes?: any
  status?: string
  nft_hash?: string
  verified_at?: string
}) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('dap_identities')
    .upsert({
      user_id: input.user_id,
      dap_uid: input.dap_uid,
      attributes: input.attributes ?? null,
      status: input.status ?? 'PENDING',
      nft_hash: input.nft_hash ?? null,
      verified_at: input.verified_at ?? null
    }, { onConflict: 'dap_uid' })
    .select('*')
  if (error) throw error
  return data?.[0]
}

export async function auditDapEvent(dap_uid: string, action: string, metadata?: any, ip?: string) {
  const sb = getSupabase()
  const { error } = await sb.from('dap_audit').insert({
    dap_uid,
    action,
    metadata: metadata ?? null,
    ip_address: ip ?? null
  })
  if (error) throw error
}
