import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'

export default defineEventHandler(async (event) => {
	if (!JWT_SECRET) {
		console.error('JWT_SECRET is not set in environment variables.')
		throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration.' })
	}

	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { email, password } = body as { email?: string; password?: string }

	if (!email || typeof email !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Email is required.' })
	}
	if (!password || typeof password !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Password is required.' })
	}

	try {
		const user = await prisma.user.findUnique({
			where: { email },
			select: {
				id: true,
				name: true,
				email: true,
				password: true,
				email_verified: true,
			},
		})

		if (!user) {
			throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
		}

		const isPasswordValid = await bcrypt.compare(password, user.password)

		if (!isPasswordValid) {
			throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
		}

		// Block login until email is verified (REQ-002)
		if (!user.email_verified) {
			throw createError({
				statusCode: 403,
				statusMessage: 'Please verify your email address before logging in. Check your inbox or request a new verification link.',
				data: { requiresVerification: true, email: user.email },
			})
		}

		const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
			expiresIn: TOKEN_EXPIRY,
		})

		await prisma.user
			.update({ where: { id: user.id }, data: { last_active: new Date() } })
			.catch((err) => console.error('Failed to update last_active:', err))

		return {
			token,
			user: { id: user.id, name: user.name, email: user.email },
			message: 'Login successful',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		console.error('Login error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to log in.' })
	}
})
