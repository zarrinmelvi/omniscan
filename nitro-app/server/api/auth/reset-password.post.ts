import { eventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret'

function validatePasswordStrength(password: string): boolean {
	const minLength = password.length >= 8
	const hasUpper = /[A-Z]/.test(password)
	const hasLower = /[a-z]/.test(password)
	const hasNumber = /[0-9]/.test(password)
	const hasSpecial = /[^A-Za-z0-9]/.test(password)
	return minLength && hasUpper && hasLower && hasNumber && hasSpecial
}

export default eventHandler(async (event) => {
	const body = await readBody(event)
	const token = typeof body.token === 'string' ? body.token : ''
	const newPassword = typeof body.password === 'string' ? body.password : ''

	if (!token || !newPassword) {
		throw createError({ statusCode: 400, statusMessage: 'Token and new password are required.' })
	}

	if (!validatePasswordStrength(newPassword)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
		})
	}

	let payload: any
	try {
		payload = jwt.verify(token, JWT_SECRET)
	} catch {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid or expired password reset link. Please request a new one.',
		})
	}

	if (payload.type !== 'password_reset' || !payload.userId) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid reset token format.' })
	}

	try {
		const user = await prisma.user.findUnique({ where: { id: payload.userId } })
		if (!user) {
			throw createError({ statusCode: 404, statusMessage: 'User not found.' })
		}

		const password_hash = await bcrypt.hash(newPassword, 10)

		await prisma.user.update({
			where: { id: user.id },
			data: { password: password_hash },
		})

		return {
			success: true,
			message: 'Password reset successfully. You can now log in with your new password.',
		}
	} catch (err: any) {
		if (err.statusCode) throw err
		console.error('Reset password error:', err)
		throw createError({
			statusCode: 500,
			statusMessage: 'An error occurred while resetting your password.',
		})
	}
})