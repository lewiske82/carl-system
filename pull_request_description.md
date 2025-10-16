# DÁP eAzonosítás + Supabase integráció (CARL)

**Összefoglaló**  
Ez a PR bevezeti a DÁP (Digitális Állampolgárság Program) eAzonosítás támogatását a CARL rendszerben,
és Supabase-re építi az identitás tárolását + auditot. Az első verzió mock prezentációval működik,
a végleges bevezetésnél a DÁP IDP valódi végpontjaira kell átállni.

## Fő változások
- Új route-ok: `POST /dap/login`, `GET /dap/callback`, `GET /dap/attributes`
- Supabase kliens és helper függvények (mentés, audit)
- Broker JWT a sikeres eAzonosítás után
- Env változók bevezetése (DÁP IDP, Supabase, JWT)

## Miért fontos?
- Állami szintű, hitelesített azonosítás a felhasználóknak (DÁP)
- Szabályozott hozzáférés és naplózás (Supabase RLS + audit táblák)
- Jogszabály- és adatvédelmi megfelelés (GDPR auditnyom)

## Telepítés
1. `.env` beállítása:  
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE`,  
   `DAP_IDP_AUTH_URL`, `DAP_IDP_TOKEN_URL`, `DAP_IDP_PRESENTATION_URL`,  
   `PUBLIC_BASE_URL`, `JWT_SECRET`

2. SQL migrációk futtatása (Supabase SQL editor vagy psql):  
   - `sql/001_add_dap_identities.sql`  
   - `sql/002_rls_policies.sql`

3. (Opció) Edge Functions deploy:  
   - `supabase functions deploy dap-login`  
   - `supabase functions deploy dap-callback`  
   - `supabase functions deploy dap-verify`

4. Backend újraindítása az env-vel.

## Tesztelés
- `POST /dap/login` → `auth_url` + `state` visszajön
- `GET /dap/callback?code=demo` → mock prezentáció + `access_token` (broker JWT)
- `GET /dap/attributes` (Bearer broker JWT) → attribútum JSON
- Supabase Console: `dap_identities` és `dap_audit` rekordok megjelennek

## Megjegyzések
- A DÁP aláírás-ellenőrzés a következő iterációban kerül be (JWK/trust list).
- A kliensben semmilyen titok/kulcs nem kerül tárolásra.
- A route-prefix marad `/dap/...` a megbeszéltek szerint.

Dátum: 2025-10-16 12:25:36Z
