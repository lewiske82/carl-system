# CARL System — DÁP + Supabase Update

Ez a csomag beépíti a **DÁP eAzonosítás** és **Supabase** támogatást a CARL rendszerbe.

## Mi van a csomagban?
- `prisma/schema.prisma` — Supabase-kompatibilis Prisma séma (User, Session, DapIdentity, DapAudit)
- `sql/001_add_dap_identities.sql` — DÁP táblák és audit (biztonságos, additive migráció)
- `sql/002_rls_policies.sql` — Supabase RLS mintapolisa
- `supabase/functions/dap-login` — Edge Function: login indítás
- `supabase/functions/dap-callback` — Edge Function: callback + prezentáció vétele
- `supabase/functions/dap-verify` — Edge Function: attribútum-validáció és mentés
- `src/carl_backend_supabase.ts` — Supabase kliens + segédfüggvények
- `src/dap_integration/routes.ts` — Express router példa: /dap/login, /dap/callback, /dap/attributes
- `docker-compose.override.yml` — környezeti változók a Supabase-hez
- `.env.example` — minta környezeti változók

## Telepítés (gyors)
1) Vidd át a fájlokat a projekt megfelelő mappáiba.
2) Fut tasd az SQL migrációt a Postgres-en / Supabase SQL editorban:
   - `sql/001_add_dap_identities.sql`
   - `sql/002_rls_policies.sql`
3) Állítsd be az `.env`-et a mintából.
4) Ha Edge Functions-t használsz:
   - `supabase functions deploy dap-login`
   - `supabase functions deploy dap-callback`
   - `supabase functions deploy dap-verify`
5) Indítsd a backendet a friss env-vel (`docker-compose.override.yml` figyelembevételével).

## API Endpontok (broker)
- `POST /api/dap/login` → auth_url + state
- `GET  /api/dap/callback` → access_token + dap_attributes
- `GET  /api/dap/attributes` → tárolt attribútumok lekérdezése

## Biztonság
- A DÁP prezentáció aláírását validálni kell (trust listák).
- Service Role kulcsot csak Edge Function használjon, kliens soha.
- GDPR: minden attribútumlekérést naplózz `dap_audit` táblába.
