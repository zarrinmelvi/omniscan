import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../../lib/prisma'
import { logAuditEvent } from '../../lib/audit-logger'

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'
// bcrypt cost 10 (matches registration SALT_ROUNDS) hash of a throwaway string, used to equalise timing
const DUMMY_HASH = '$2b$10$nvVqWleMjAwJXXLfCI3vgue127S2dM6br32e06geAsc57skb9T89e'

export default defineEventHandler(async (event) => {
	if (!JWT_SECRET) {
		console.error('JWT_SECRET is not set in environment variables.')
		throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration.' })
	}

	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { identifier, email, password } = body as { identifier?: unknown; email?: unknown; password?: unknown }

	// identifier wins over email; a present non-string identifier is invalid (no fallback)
	const raw = identifier ?? email
	if (typeof raw !== 'string' || raw.trim() === '') {
		throw createError({ statusCode: 400, statusMessage: 'Username or email is required.' })
	}
	if (!password || typeof password !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Password is required.' })
	}
	const id = raw.trim()

	try {
		const select = {
			id: true,
			name: true,
			email: true,
			password: true,
			email_verified: true,
			avatar_base64: true,
		}

		let user: any = null
		if (id.includes('@')) {
			user = await prisma.user.findUnique({ where: { email: id }, select })
		} else {
			const rows = await prisma.user.findMany({
				where: { username: { equals: id, mode: 'insensitive' } },
				select: { ...select, username: true },
				take: 5,
			})
			user = rows.find((r: any) => r.username === id) ?? (rows.length === 1 ? rows[0] : null)
		}

		// Always run a compare so timing does not reveal whether the account exists
		const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)

		if (!user || !user.password || !isPasswordValid) {
			throw createError({ statusCode: 401, statusMessage: 'Invalid username/email or password.' })
		}

		// Block login until email is verified (REQ-002)
		if (!user.email_verified) {
			throw createError({
				statusCode: 403,
				statusMessage: 'Please verify your email address before logging in. Check your inbox or request a new verification link.',
				data: { requiresVerification: true, email: user.email },
			})
		}

		const sessionToken = randomUUID()

		const token = jwt.sign({ userId: user.id, email: user.email, sid: sessionToken }, JWT_SECRET, {
			expiresIn: TOKEN_EXPIRY,
		})

		await prisma.user
			.update({ where: { id: user.id }, data: { last_active: new Date(), inactivity_warning_sent_at: null, session_token: sessionToken } })
			.catch((err) => console.error('Failed to update last_active:', err))

		// Restore ARCHIVED users who return within the grace period
		await prisma.user
			.updateMany({
				where: { id: user.id, status: 'ARCHIVED' },
				data: { status: 'ACTIVE', archived_at: null, inactivity_warning_sent_at: null, last_active: new Date() },
			})
			.catch((err) => console.error('Failed to restore archived user:', err))

		await logAuditEvent({
			event_type: 'LOGIN',
			entity: 'User',
			entity_id: user.id,
			triggered_by_user_id: user.id,
			summary: `User ${user.email} logged in`,
		})

		return {
			token,
			user: { id: user.id, name: user.name, email: user.email, avatar_base64: user.avatar_base64 ?? null },
			message: 'Login successful',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		console.error('Login error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to log in.' })
	}
})
