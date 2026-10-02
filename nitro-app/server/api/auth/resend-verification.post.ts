import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { generateVerificationToken, sendVerificationEmail, isAllowedEmailDomain } from '../../utils/email'

const COOLDOWN_SECONDS = 60

export default defineEventHandler(async (event) => {
	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { email } = body as { email?: string }

	if (!email || typeof email !== 'string' || !isAllowedEmailDomain(email)) {
		throw createError({ statusCode: 400, statusMessage: 'Only @gmail.com, @outlook.com, @hotmail.com, and @yahoo.com emails are permitted.' })
	}

	let user
	try {
		user = await prisma.user.findUnique({
			where: { email },
			select: {
				id: true,
				name: true,
				email: true,
				email_verified: true,
				last_verification_sent_at: true,
			},
		})
	} catch (err) {
		console.error('Resend verification DB error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Server error. Please try again.' })
	}

	if (!user) {
		// Return success to avoid leaking whether an email exists in the system
		return { success: true, message: 'If that email exists, a verification link has been sent.' }
	}

	if (user.email_verified) {
		throw createError({ statusCode: 400, statusMessage: 'This email is already verified.' })
	}

	// Enforce 60-second cooldown
	if (user.last_verification_sent_at) {
		const secondsElapsed = (Date.now() - user.last_verification_sent_at.getTime()) / 1000
		if (secondsElapsed < COOLDOWN_SECONDS) {
			const remaining = Math.ceil(COOLDOWN_SECONDS - secondsElapsed)
			throw createError({
				statusCode: 429,
				statusMessage: `Please wait ${remaining} second${remaining === 1 ? '' : 's'} before requesting another link.`,
			})
		}
	}

	// Generate fresh token with 24-hour expiry
	const token = generateVerificationToken()
	const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

	try {
		await prisma.user.update({
			where: { id: user.id },
			data: {
				verification_token: token,
				verification_token_expires_at: tokenExpiry,
				last_verification_sent_at: new Date(),
			},
		})
	} catch (err) {
		console.error('Resend verification token update error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to generate new token. Please try again.' })
	}

	const emailResult = await sendVerificationEmail(user.email, user.name, token)

	if (!emailResult.success) {
		console.error('Resend verification email failed:', emailResult.error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Could not send verification email. Please try again later.',
		})
	}

	return {
		success: true,
		message: 'Verification email sent! Please check your inbox.',
	}
})