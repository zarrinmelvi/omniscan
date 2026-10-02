import { eventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'
import { sendPasswordResetEmail, isAllowedEmailDomain } from '../../utils/email'

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret'

export default eventHandler(async (event) => {
	const body = await readBody(event)
	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

	if (!email || !isAllowedEmailDomain(email)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Please provide a valid email address.',
		})
	}

	try {
		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true, name: true, email: true },
		})

		const successResponse = {
			success: true,
			message: 'If an account exists for that email, a password reset link has been sent.',
		}

		if (!user) {
			return successResponse
		}

		const resetToken = jwt.sign(
			{ userId: user.id, email: user.email, type: 'password_reset' },
			JWT_SECRET,
			{ expiresIn: '30m' }
		)

		await sendPasswordResetEmail(user.email, user.name, resetToken)

		return successResponse
	} catch (err: any) {
		console.error('Forgot password error:', err)
		throw createError({
			statusCode: 500,
			statusMessage: 'An unexpected error occurred while requesting password reset.',
		})
	}
})