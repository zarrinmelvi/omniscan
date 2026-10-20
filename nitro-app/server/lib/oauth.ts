// Google OAuth 2.0 config. Dormant until env vars are set.
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
// e.g. https://omniscan-ten.vercel.app/api/auth/google/callback
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
// Where to send the browser after a successful/failed OAuth login (frontend)
export const OAUTH_FRONTEND_SUCCESS = process.env.OAUTH_FRONTEND_SUCCESS || 'http://localhost:5173/tabs/home'
export const OAUTH_FRONTEND_FAILURE = process.env.OAUTH_FRONTEND_FAILURE || 'http://localhost:5173/login'

export function isGoogleOAuthConfigured(): boolean {
	return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
