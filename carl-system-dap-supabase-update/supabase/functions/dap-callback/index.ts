// supabase/functions/dap-callback/index.ts
// Edge Function stub to receive DÁP callback and persist identity.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // TODO: exchange `code` for token at DAP_TOKEN_URL, then fetch presentation
  const presentation = {
    dap_uid: '000123456789',
    given_name: 'János',
    family_name: 'Nagy',
    birthdate: '1987-04-15'
  }

  return new Response(JSON.stringify({
    access_token: 'mock-broker-jwt',
    dap_attributes: presentation
  }), { headers: { 'content-type': 'application/json' } })
})
