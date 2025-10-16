// src/dap_integration/routes.ts
import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { auditDapEvent, saveDapIdentity } from '../carl_backend_supabase'

export const router = express.Router()

const DAP_AUTH_URL = process.env.DAP_IDP_AUTH_URL!
const DAP_TOKEN_URL = process.env.DAP_IDP_TOKEN_URL!
const DAP_PRESENTATION_URL = process.env.DAP_IDP_PRESENTATION_URL!
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL!
const JWT_SECRET = process.env.JWT_SECRET!

// 1) Start login
router.post('/dap/login', async (req: Request, res: Response) => {
  const { client_id, redirect_uri, requested_attributes } = req.body || {}
  const state = crypto.randomBytes(16).toString('hex')

  // Typically you'd build a standards-compliant OpenID4VC authorization request here
  const auth_url = `${DAP_AUTH_URL}?client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&scope=openid%20profile`

  return res.json({ auth_url, state })
})

// 2) Callback (authorization code → token → presentation)
router.get('/dap/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query as Record<string, string>

  // Exchange code for token (placeholder)
  // In real life: POST to DAP_TOKEN_URL with client credentials
  const access_token_from_dap = 'mock_dap_access_token_' + code

  // Fetch verifiable presentation (placeholder)
  // In real life: GET/POST to DAP_PRESENTATION_URL with the access_token
  const presentation = {
    dap_uid: '000123456789',
    given_name: 'János',
    family_name: 'Nagy',
    birthdate: '1987-04-15'
  }

  // Map to your user (you will likely identify the user by your own session/cookie)
  const user_id = req.user?.id || req.headers['x-user-id'] || '00000000-0000-0000-0000-000000000000'

  await saveDapIdentity({
    user_id: String(user_id),
    dap_uid: presentation.dap_uid,
    attributes: presentation,
    status: 'VERIFIED',
    verified_at: new Date().toISOString()
  })

  await auditDapEvent(presentation.dap_uid, 'LOGIN', { presentation })

  const broker_token = jwt.sign({
    sub: user_id,
    dap_uid: presentation.dap_uid,
    name: `${presentation.given_name} ${presentation.family_name}`
  }, JWT_SECRET, { expiresIn: '1h' })

  return res.json({
    access_token: broker_token,
    dap_attributes: presentation
  })
})

// 3) Attributes (reads from your storage)
router.get('/dap/attributes', async (req: Request, res: Response) => {
  // In real life: validate Authorization bearer token
  // Demo response:
  return res.json({
    dap_uid: '000123456789',
    given_name: 'János',
    family_name: 'Nagy',
    birthdate: '1987-04-15'
  })
})

export default router
