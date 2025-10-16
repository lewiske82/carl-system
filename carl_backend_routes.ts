// carl_backend_routes.ts — DÁP integrációs bővítés (Express)
// ------------------------------------------------------------------
// Ez a fájl a meglévő útvonalak mellé beilleszti a DÁP (Digitális
// Állampolgárság Program) eAzonosítás támogatását. Cél: biztonságos,
// naplózott állampolgári azonosítás Supabase adattárolással.
//
// FIGYELEM: a kód OpenID4VC-kompatibilis flow-ra van előkészítve,
// a DÁP IDP tényleges végpontjai és kulcsai a környezeti változókból
// jönnek (DAP_IDP_AUTH_URL, DAP_IDP_TOKEN_URL, DAP_IDP_PRESENTATION_URL).
// ------------------------------------------------------------------

import express, { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import fetch from 'node-fetch'
import { auditDapEvent, saveDapIdentity } from './carl_backend_supabase'

const router = express.Router()

// Környezeti változók
const DAP_AUTH_URL = process.env.DAP_IDP_AUTH_URL || ''
const DAP_TOKEN_URL = process.env.DAP_IDP_TOKEN_URL || ''
const DAP_PRESENTATION_URL = process.env.DAP_IDP_PRESENTATION_URL || ''
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || ''
const JWT_SECRET = process.env.JWT_SECRET || 'change_me'

// Egyszerű bearer auth ellenőrzés a broker tokenhez
function requireBearer(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Hiányzó bearer token' })
  try {
    ;(req as any).broker = jwt.verify(token, JWT_SECRET)
  } catch (e) {
    return res.status(401).json({ error: 'Érvénytelen token' })
  }
  next()
}

// 1) DÁP bejelentkezés indítása
router.post('/dap/login', async (req: Request, res: Response) => {
  try {
    const { client_id, redirect_uri, requested_attributes } = req.body || {}
    if (!client_id || !redirect_uri) {
      return res.status(400).json({ error: 'client_id és redirect_uri kötelező' })
    }
    const state = crypto.randomBytes(16).toString('hex')

    // OpenID4VC auth kérés URL összeállítása (placeholder paraméterekkel)
    const url = new URL(DAP_AUTH_URL)
    url.searchParams.set('client_id', client_id)
    url.searchParams.set('redirect_uri', redirect_uri || `${PUBLIC_BASE_URL}/dap/callback`)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid profile') // kérhető bővítés: address, birthdate, stb.
    url.searchParams.set('state', state)

    return res.json({ auth_url: url.toString(), state })
  } catch (err:any) {
    return res.status(500).json({ error: 'Váratlan hiba (dap/login)', details: err?.message })
  }
})

// 2) DÁP callback (authorization code → token → presentation)
router.get('/dap/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as Record<string, string>
    if (!code) return res.status(400).json({ error: 'Hiányzó code paraméter' })

    // a) Authorization code csere tokenre (placeholder példa)
    // Itt a DÁP TOKEN endpointot kell hívni (client credentials + code)
    // Az alábbi fetch csak szemléltető; valódi integrációhoz client_secret, mtls, stb. kellhet.
    // const tokenResp = await fetch(DAP_TOKEN_URL, { method: 'POST', headers: {...}, body: ... })
    // const tokenJson = await tokenResp.json()

    const access_token_from_dap = `mock_dap_token_${code}`

    // b) Verifiable Presentation lekérdezése a DÁP-tól (placeholder)
    // const presResp = await fetch(DAP_PRESENTATION_URL, { headers: { Authorization: `Bearer ${access_token_from_dap}` }})
    // const presentation = await presResp.json()

    const presentation = {
      dap_uid: '000123456789',
      given_name: 'János',
      family_name: 'Nagy',
      birthdate: '1987-04-15'
    }

    // c) Felhasználó azonosítása a saját rendszeredben
    // Valódi implementációban itt sessionből vagy cookie-ból jön a user_id.
    const user_id = (req.headers['x-user-id'] as string) || '00000000-0000-0000-0000-000000000000'

    // d) Mentés Supabase-be (dap_identities) + audit
    await saveDapIdentity({
      user_id: user_id,
      dap_uid: presentation.dap_uid,
      attributes: presentation,
      status: 'VERIFIED',
      verified_at: new Date().toISOString()
    })
    await auditDapEvent(presentation.dap_uid, 'LOGIN', { presentation })

    // e) Broker JWT kiadása a kliensnek (kliens ezzel hívhatja a /dap/attributes-t)
    const broker_token = jwt.sign({
      sub: user_id,
      dap_uid: presentation.dap_uid,
      name: `${presentation.given_name} ${presentation.family_name}`
    }, JWT_SECRET, { expiresIn: '1h' })

    return res.json({
      access_token: broker_token,
      dap_attributes: presentation
    })
  } catch (err:any) {
    return res.status(500).json({ error: 'Váratlan hiba (dap/callback)', details: err?.message })
  }
})

// 3) Attribútumok olvasása (a te tárolódból)
router.get('/dap/attributes', requireBearer, async (req: Request, res: Response) => {
  try {
    // DEMO: broker token payload lekérdezése
    const payload:any = (req as any).broker
    // A valós implementációban itt lekérdeznéd a dap_identities táblát a payload.dap_uid alapján.
    return res.json({
      dap_uid: payload?.dap_uid || 'unknown',
      given_name: 'János',
      family_name: 'Nagy',
      birthdate: '1987-04-15'
    })
  } catch (err:any) {
    return res.status(500).json({ error: 'Váratlan hiba (dap/attributes)', details: err?.message })
  }
})

export default router
