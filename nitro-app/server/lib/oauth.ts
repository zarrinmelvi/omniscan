// Google OAuth 2.0 config. Dormant until env vars are set.
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
// e.g. https://omniscan-ten.vercel.app/api/auth/google/callback
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
// Frontend client portal base URL. Production custom domain by default.
// Reuses the same FRONTEND_URL env var the email templates use, so the OAuth
// redirect target and verification/reset links always point at the same host.
export const FRONTEND_URL = process.env.FRONTEND_URL || 'https://omniscan.website'
// Derived landing targets after a successful / failed OAuth login.
export const OAUTH_FRONTEND_SUCCESS = `${FRONTEND_URL.replace(/\/$/, '')}/tabs/home`
export const OAUTH_FRONTEND_FAILURE = `${FRONTEND_URL.replace(/\/$/, '')}/login`

export function isGoogleOAuthConfigured(): boolean {
	return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
