import { defineEventHandler, getRouterParam, createError } from 'h3'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../lib/prisma'
import { sendWelcomeEmail } from '../../../utils/email'

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret'

export default defineEventHandler(async (event) => {
	const token = getRouterParam(event, 'token')

	if (!token || typeof token !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Verification token is required.' })
	}

	let user
	try {
		user = await prisma.user.findUnique({
			where: { verification_token: token },
			select: {
				id: true,
				name: true,
				email: true,
				email_verified: true,
				verification_token_expires_at: true,
			},
		})
	} catch (err) {
		console.error('Verify token DB error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Server error during verification.' })
	}

	if (!user) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid or expired verification link.' })
	}

	// If email is NOT verified yet, update DB and send welcome email
	if (!user.email_verified) {
		if (!user.verification_token_expires_at || user.verification_token_expires_at < new Date()) {
			throw createError({
				statusCode: 400,
				statusMessage: 'This verification link has expired. Please request a new one.',
			})
		}

		try {
			await prisma.user.update({
				where: { id: user.id },
				data: {
					email_verified: true,
					verification_token: null,
					verification_token_expires_at: null,
				},
			})
		} catch (err) {
			console.error('Verify token update error:', err)
			throw createError({ statusCode: 500, statusMessage: 'Failed to verify email. Please try again.' })
		}

		// Send welcome email asynchronously (non-blocking)
		sendWelcomeEmail(user.email, user.name).catch((err) =>
			console.error('Welcome email failed (non-blocking):', err),
		)
	}

	// Always generate and return a fresh JWT session token so setup step 2 succeeds seamlessly
	const jwtToken = jwt.sign(
		{ userId: user.id, email: user.email },
		JWT_SECRET,
		{ expiresIn: '7d' }
	)

	return {
		success: true,
		token: jwtToken,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
		},
	}
})