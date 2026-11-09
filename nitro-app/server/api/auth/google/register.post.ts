import { defineEventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../../../lib/prisma'
import { logAuditEvent } from '../../../lib/audit-logger'

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'

export default defineEventHandler(async (event) => {
	if (!JWT_SECRET) {
		throw createError({ statusCode: 500, statusMessage: 'Server configuration error.' })
	}

	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { email, firstName, lastName, googleId, username, gender, birthday } = body as {
		email?: string
		firstName?: string
		lastName?: string
		googleId?: string
		username?: string
		gender?: string
		birthday?: string
	}

	// Validate required fields
	if (!email || typeof email !== 'string' || !email.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Email is required.' })
	}
	if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'First name is required.' })
	}
	if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Last name is required.' })
	}
	if (!googleId || typeof googleId !== 'string' || !googleId.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Google ID is required.' })
	}
	if (!username || typeof username !== 'string' || !username.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Username is required.' })
	}

	// Validate username format
	const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
	if (!USERNAME_RE.test(username.trim())) {
		throw createError({ statusCode: 400, statusMessage: 'Username must be 3-20 characters, letters, numbers, and underscores only.' })
	}

	// Validate gender
	if (!gender || typeof gender !== 'string' || !gender.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Gender is required.' })
	}
	const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say']
	if (!validGenders.includes(gender)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid gender value.' })
	}

	// Validate birthday
	if (!birthday || typeof birthday !== 'string' || !birthday.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Birthday is required.' })
	}
	const birthdayDate = new Date(birthday)
	if (isNaN(birthdayDate.getTime())) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid birthday format.' })
	}

	// Calculate age
	const age = (Date.now() - birthdayDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
	if (age < 16) {
		throw createError({ statusCode: 400, statusMessage: 'You must be at least 16 years old to register.' })
	}

	const normalizedEmail = email.toLowerCase()
	const normalizedUsername = username.trim()
	const fullName = `${firstName.trim()} ${lastName.trim()}`

	try {
		// Check if user already exists by email
		const existingUserByEmail = await prisma.user.findUnique({
			where: { email: normalizedEmail },
			select: { id: true },
		})

		if (existingUserByEmail) {
			throw createError({ statusCode: 400, statusMessage: 'An account with this email already exists.' })
		}

		// Check if user already exists by Google ID
		const existingUserByGoogleId = await prisma.user.findFirst({
			where: {
				oauth_provider: 'google',
				oauth_provider_id: googleId,
			},
			select: { id: true },
		})

		if (existingUserByGoogleId) {
			throw createError({ statusCode: 400, statusMessage: 'This Google account is already registered.' })
		}

		// Check if username is taken
		const existingUsername = await prisma.user.findUnique({
			where: { username: normalizedUsername },
			select: { id: true },
		})

		if (existingUsername) {
			throw createError({ statusCode: 400, statusMessage: 'That username is already taken. Please choose another.' })
		}

		// Create user and dietary profile in a transaction
		const user = await prisma.$transaction(async (tx) => {
			const created = await tx.user.create({
				data: {
					name: fullName,
					first_name: firstName.trim(),
					last_name: lastName.trim(),
					username: normalizedUsername,
					email: normalizedEmail,
					password: null,
					oauth_provider: 'google',
					oauth_provider_id: googleId,
					gender,
					birthday: birthdayDate,
					status: 'ACTIVE',
					last_active: new Date(),
					email_verified: true, // Google already verified the email
					avatar_base64: null,
				},
			})

			await tx.dietaryProfile.create({
				data: {
					user_id: created.id,
					halal_pref: false,
				},
			})

			return created
		})

		// Log audit event
		await logAuditEvent({
			event_type: 'CREATE',
			entity: 'User',
			entity_id: user.id,
			triggered_by_user_id: user.id,
			summary: `New user ${normalizedEmail} registered via Google OAuth`,
		})

		// Generate session token and JWT
		const sessionToken = randomUUID()
		await prisma.user.update({
			where: { id: user.id },
			data: { session_token: sessionToken },
		})

		const token = jwt.sign(
			{ userId: user.id, email: user.email, sid: sessionToken },
			JWT_SECRET,
			{ expiresIn: TOKEN_EXPIRY }
		)

		return {
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				first_name: user.first_name,
				last_name: user.last_name,
				username: user.username,
			},
			message: 'Account created successfully.',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		if (err?.code === 'P2002') {
			throw createError({ statusCode: 400, statusMessage: 'Email or username already exists.' })
		}

		console.error('Google registration error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to create account.' })
	}
})
