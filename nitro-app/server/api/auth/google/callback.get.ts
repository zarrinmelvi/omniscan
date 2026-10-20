import { defineEventHandler, getQuery, sendRedirect, createError } from 'h3'
import jwt from 'jsonwebtoken'
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

		// 3. Find or create the user
		let user = await prisma.user.findUnique({ where: { email } })

		if (!user) {
			// Derive a unique username from the email local-part
			const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'user'
			let candidate = base
			let suffix = 0
			// Ensure uniqueness
			while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
				suffix += 1
				candidate = `${base}${suffix}`.slice(0, 20)
			}

			user = await prisma.$transaction(async (tx) => {
				const created = await tx.user.create({
					data: {
						name: fullName,
						first_name: firstName,
						last_name: lastName,
						username: candidate,
						email,
						password: null,
						status: 'ACTIVE',
						last_active: new Date(),
						email_verified: true, // Google already verified the email
						oauth_provider: 'google',
						oauth_provider_id: profile.id,
						avatar_base64: null,
					},
				})
				await tx.dietaryProfile.create({ data: { user_id: created.id, halal_pref: false } })
				return created
			})

			await logAuditEvent({
				event_type: 'CREATE',
				entity: 'User',
				entity_id: user.id,
				triggered_by_user_id: user.id,
				summary: `New user ${email} registered via Google OAuth`,
			})
		} else {
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
		const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })

		// 5. Redirect to frontend with the token in the URL fragment (consumed by the OAuth landing handler)
		return sendRedirect(event, `${OAUTH_FRONTEND_SUCCESS}?oauth_token=${encodeURIComponent(token)}`)
	} catch (err) {
		console.error('Google OAuth callback error:', err)
		return sendRedirect(event, `${OAUTH_FRONTEND_FAILURE}?oauth_error=server_error`)
	}
})
