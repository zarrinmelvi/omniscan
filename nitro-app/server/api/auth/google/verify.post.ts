import { defineEventHandler, readBody, createError } from 'h3'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../../../lib/prisma'
import { GOOGLE_CLIENT_ID } from '../../../lib/oauth'
import { logAuditEvent } from '../../../lib/audit-logger'

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'

export default defineEventHandler(async (event) => {
	if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
		throw createError({ statusCode: 503, statusMessage: 'Google sign-in is not configured on this server yet.' })
	}

	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { idToken } = body as { idToken?: string }

	if (!idToken || typeof idToken !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'ID token is required.' })
	}

	try {
		// Verify the ID token with Google
		const client = new OAuth2Client(GOOGLE_CLIENT_ID)
		const ticket = await client.verifyIdToken({
			idToken,
			audience: GOOGLE_CLIENT_ID,
		})

		const payload = ticket.getPayload()

		if (!payload || !payload.email || !payload.email_verified) {
			throw createError({ statusCode: 400, statusMessage: 'Invalid or unverified Google account.' })
		}

		const email = payload.email.toLowerCase()
		const firstName = payload.given_name || payload.name?.split(' ')[0] || 'User'
		const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || ''
		const googleId = payload.sub

		// Check if user exists
		let user = await prisma.user.findUnique({ where: { email } })

		if (!user) {
			// New user - create temporary token for registration
			const tempToken = jwt.sign(
				{
					type: 'google_pending',
					email: payload.email,
					firstName,
					lastName,
					googleId,
				},
				JWT_SECRET,
				{ expiresIn: '10m' }
			)

			return {
				success: true,
				requiresRegistration: true,
				pendingToken: tempToken,
			}
		}

		// Existing user - issue login token
		// Link the Google identity if this account was previously password-only
		if (!user.oauth_provider) {
			await prisma.user.update({
				where: { id: user.id },
				data: {
					oauth_provider: 'google',
					oauth_provider_id: googleId,
					email_verified: true,
				},
			})
		}

		// Restore ARCHIVED users who return within the grace period
		await prisma.user.updateMany({
			where: { id: user.id, status: 'ARCHIVED' },
			data: {
				status: 'ACTIVE',
				archived_at: null,
				inactivity_warning_sent_at: null,
				last_active: new Date(),
			},
		}).catch(() => {})

		// Update last active and reset inactivity warning
		await prisma.user.update({
			where: { id: user.id },
			data: {
				last_active: new Date(),
				inactivity_warning_sent_at: null,
			},
		}).catch(() => {})

		// Log login event
		await logAuditEvent({
			event_type: 'LOGIN',
			entity: 'User',
			entity_id: user.id,
			triggered_by_user_id: user.id,
			summary: `User ${email} logged in via Google OAuth (native)`,
		})

		// Generate session token and JWT
		const sessionToken = randomUUID()
		await prisma.user.update({
			where: { id: user.id },
			data: { session_token: sessionToken },
		})

		const token = jwt.sign(
			{ userId: user.id, email: user.email, sid: sessionToken },
			JWT_SECRET,
			{ expiresIn: TOKEN_EXPIRY }
		)

		return {
			success: true,
			requiresRegistration: false,
			token,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		console.error('Google token verification error:', err)
		throw createError({ statusCode: 401, statusMessage: 'Failed to verify Google token.' })
	}
})
