import { eventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'
import { sendPasswordResetEmail } from '../../utils/email'
import { isWellFormedEmail, passwordFingerprint, resetCooldownRemaining } from '../../lib/password-reset'

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret'

export default eventHandler(async (event) => {
	const body = await readBody(event).catch(() => null)
	const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

	if (!email || !isWellFormedEmail(email)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Please provide a valid email address.',
		})
	}

	try {
		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true, name: true, email: true, password: true, password_reset_requested_at: true },
		})

		if (!user) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Account of that email does not exists. Input an email that has existing account.',
			})
		}

		const waitSeconds = resetCooldownRemaining(user.password_reset_requested_at)
		if (waitSeconds > 0) {
			throw createError({
				statusCode: 429,
				statusMessage: `Please wait ${waitSeconds} seconds before requesting another reset link.`,
				data: { retryAfterSeconds: waitSeconds },
			})
		}

		// `pwf` ties the link to the current password, so it dies once the password changes.
		const resetToken = jwt.sign(
			{ userId: user.id, email: user.email, type: 'password_reset', pwf: passwordFingerprint(user.password) },
			JWT_SECRET,
			{ expiresIn: '30m' }
		)

		const result = await sendPasswordResetEmail(user.email, user.name, resetToken)
		if (!result.success) {
			throw createError({
				statusCode: 500,
				statusMessage: 'Unable to send the reset email right now. Please try again later.',
			})
		}

		await prisma.user.update({
			where: { id: user.id },
			data: { password_reset_requested_at: new Date() },
		})

		return {
			success: true,
			message: 'A password reset link has been sent.',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Forgot password error:', err)
		throw createError({
			statusCode: 500,
			statusMessage: 'An unexpected error occurred while requesting password reset.',
		})
	}
})
