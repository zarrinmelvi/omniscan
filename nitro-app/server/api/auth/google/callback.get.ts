import { defineEventHandler, getQuery, sendRedirect } from 'h3'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../../../lib/prisma'
import {
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
    GOOGLE_TOKEN_URL, GOOGLE_USERINFO_URL,
    OAUTH_FRONTEND_SUCCESS, OAUTH_FRONTEND_FAILURE, isGoogleOAuthConfigured,
} from '../../../lib/oauth'
import { logAuditEvent } from '../../../lib/audit-logger'

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'

interface GoogleUserInfo {
    id: string
    email: string
    verified_email: boolean
    name?: string
    given_name?: string
    family_name?: string
    picture?: string
}

export default defineEventHandler(async (event) => {
    if (!isGoogleOAuthConfigured() || !JWT_SECRET) {
        return sendRedirect(event, `${OAUTH_FRONTEND_FAILURE}?oauth_error=not_configured`)
    }

    const query = getQuery(event)
    const code = typeof query.code === 'string' ? query.code : null
    if (query.error || !code) {
        return sendRedirect(event, `${OAUTH_FRONTEND_FAILURE}?oauth_error=denied`)
    }

    try {
        // 1. Exchange authorization code for tokens
        const tokenRes = await $fetch<{ access_token: string; id_token: string }>(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }).toString(),
        })

        // 2. Fetch the Google profile
        const profile = await $fetch<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${tokenRes.access_token}` },
        })

        if (!profile.email || !profile.verified_email) {
            return sendRedirect(event, `${OAUTH_FRONTEND_FAILURE}?oauth_error=email_unverified`)
        }

        const email = profile.email.toLowerCase()
        const firstName = profile.given_name?.trim() || profile.name?.split(' ')[0] || 'User'
        const lastName = profile.family_name?.trim() || profile.name?.split(' ').slice(1).join(' ') || ''
        const fullName = `${firstName} ${lastName}`.trim()

        // 3. Find existing user
        let user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            // New user - create temporary token and redirect to registration
            const tempToken = jwt.sign(
                {
                    type: 'google_pending',
                    email: profile.email,
                    firstName,
                    lastName,
                    googleId: profile.id,
                },
                JWT_SECRET,
                { expiresIn: '10m' }
            )

            const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.omniscan.website'
            return sendRedirect(event, `${FRONTEND_URL}/register?oauth_pending=${encodeURIComponent(tempToken)}`)
        }

        // Existing user - proceed with login
        // Existing user - proceed with login
        // Link the Google identity if this account was previously password-only
        if (!user.oauth_provider) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { oauth_provider: 'google', oauth_provider_id: profile.id, email_verified: true },
                })
            }
            await prisma.user.update({ where: { id: user.id }, data: { last_active: new Date(), inactivity_warning_sent_at: null } }).catch(() => {})
        }

        await logAuditEvent({
            event_type: 'LOGIN',
            entity: 'User',
            entity_id: user.id,
            triggered_by_user_id: user.id,
            summary: `User ${email} logged in via Google OAuth`,
        })

        // 4. Issue the same JWT shape as the normal login endpoint
        const sessionToken = randomUUID()
        await prisma.user.update({ where: { id: user.id }, data: { session_token: sessionToken } })
        const token = jwt.sign({ userId: user.id, email: user.email, sid: sessionToken }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })

        // 5. Redirect to native app scheme if state/query specifies mobile, or fallback to frontend success
        const isMobile = query.state === 'mobile' || query.platform === 'android'
        if (isMobile) {
            return sendRedirect(event, `io.ionic.starter://google-auth-callback?oauth_token=${encodeURIComponent(token)}`)
        }

        // Web frontend redirect
        return sendRedirect(event, `${OAUTH_FRONTEND_SUCCESS}?oauth_token=${encodeURIComponent(token)}`)
    } catch (err) {
        console.error('Google OAuth callback error:', err)
        return sendRedirect(event, `${OAUTH_FRONTEND_FAILURE}?oauth_error=server_error`)
    }
})