import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default defineEventHandler(async (event) => {
	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { username } = body as { username?: string }

	if (!username || typeof username !== 'string' || !username.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Username is required.' })
	}

	const normalizedUsername = username.trim()

	// Validate format
	if (!USERNAME_RE.test(normalizedUsername)) {
		return {
			available: false,
			message: 'Username must be 3-20 characters, letters, numbers, and underscores only.',
			isFormatError: true,
		}
	}

	try {
		const existingUser = await prisma.user.findUnique({
			where: { username: normalizedUsername },
			select: { id: true },
		})

		if (existingUser) {
			return {
				available: false,
				message: 'This username is already taken. Try adding numbers, an underscore, or your initials to make it unique.',
				isFormatError: false,
			}
		}

		return {
			available: true,
			message: 'Username is available!',
			isFormatError: false,
		}
	} catch (err: any) {
		console.error('Username check error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to check username availability.' })
	}
})
