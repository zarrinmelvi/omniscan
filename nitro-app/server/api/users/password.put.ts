import { eventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

const SALT_ROUNDS = 10
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

export default eventHandler(async (event) => {
	const authUser = requireAuth(event)

	const body = await readBody(event).catch(() => null)
	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { current_password, new_password } = body as {
		current_password?: unknown
		new_password?: unknown
	}

	if (typeof new_password !== 'string' || !new_password.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'new_password is required.' })
	}

	if (!PASSWORD_RE.test(new_password)) {
		throw createError({
			statusCode: 400,
			statusMessage:
				'Password must be at least 8 characters with an uppercase letter, lowercase letter, number, and special character.',
		})
	}

	if (new_password.length > 30) {
		throw createError({ statusCode: 400, statusMessage: 'Password must be 30 characters or fewer.' })
	}

	const user = await prisma.user.findUnique({
		where: { id: authUser.id },
		select: { password: true, oauth_provider: true },
	})

	if (!user) {
		throw createError({ statusCode: 404, statusMessage: 'User not found.' })
	}

	// Google-only accounts (no existing password) can set a password without
	// providing a current one. Standard accounts must verify first.
	const isFirstTimeSet = !!user.oauth_provider && !user.password
	if (!isFirstTimeSet) {
		if (typeof current_password !== 'string' || !current_password) {
			throw createError({ statusCode: 400, statusMessage: 'current_password is required.' })
		}
		if (!user.password) {
			throw createError({ statusCode: 400, statusMessage: 'No password is set for this account.' })
		}
		const matches = await bcrypt.compare(current_password, user.password)
		if (!matches) {
			throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect.' })
		}
	}

	const hashed = await bcrypt.hash(new_password, SALT_ROUNDS)
	await prisma.user.update({
		where: { id: authUser.id },
		data: { password: hashed },
	})

	return { success: true }
})
