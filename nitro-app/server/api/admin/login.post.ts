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

	const { username, password } = body as { username?: string; password?: string }

	if (!username || typeof username !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Username is required.' })
	}
	if (!password || typeof password !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Password is required.' })
	}

	try {
		const admin = await prisma.admin.findUnique({ where: { username } })

		if (!admin) {
			throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })
		}

		const isPasswordValid = await bcrypt.compare(password, admin.password)

		if (!isPasswordValid) {
			throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })
		}

		// `type: 'admin'` is what server/middleware/adminAuth.ts checks for to
		// distinguish this from a normal user token — both are signed with
		// the same JWT_SECRET.
		const token = jwt.sign({ adminId: admin.id, username: admin.username, role: admin.role, type: 'admin' }, JWT_SECRET, {
			expiresIn: TOKEN_EXPIRY,
		})

		return {
			token,
			admin: { id: admin.id, full_name: admin.full_name, username: admin.username, role: admin.role },
			message: 'Login successful',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		console.error('Admin login error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to log in.' })
	}
})
