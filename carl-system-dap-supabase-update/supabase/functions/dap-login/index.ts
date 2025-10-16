// supabase/functions/dap-login/index.ts
// Edge Function stub to start DÁP login (placeholder).
// Deploy with: supabase functions deploy dap-login
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)
  const client_id = (await req.json().catch(() => ({ client_id: '' }))).client_id || 'your-client-id'
  const redirect_uri = url.searchParams.get('redirect_uri') || Deno.env.get('PUBLIC_BASE_URL') + '/api/dap/callback'
  const state = crypto.randomUUID()
  const authUrl = `${Deno.env.get('DAP_IDP_AUTH_URL')}?client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`

  return new Response(JSON.stringify({ auth_url: authUrl, state }), {
    headers: { 'content-type': 'application/json' }
  })
})
