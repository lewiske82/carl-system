// supabase/functions/dap-verify/index.ts
// Edge Function stub to verify presentation signature (to be implemented with DÁP trust lists)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const body = await req.json().catch(() => ({}))
  // TODO: verify signature of `body.presentation` against trust lists / JWKs
  const ok = true
  return new Response(JSON.stringify({ ok }), { headers: { 'content-type': 'application/json' } })
})
