import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SALT_ROUNDS = 10

export default defineEventHandler(async (event) => {
	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { name, email, password } = body as { name?: string; email?: string; password?: string }

	if (!name || typeof name !== 'string' || !name.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Name is required.' })
	}
	if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid email is required.' })
	}
	if (!password || typeof password !== 'string' || password.length < 6) {
		throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters.' })
	}

	try {
		const existingUser = await prisma.user.findUnique({ where: { email } })

		if (existingUser) {
			throw createError({ statusCode: 400, statusMessage: 'Email already exists.' })
		}

		const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

		const newUser = await prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					name: name.trim(),
					email,
					password: hashedPassword,
					status: 'ACTIVE',
					last_active: new Date(),
				},
				select: { id: true, name: true, email: true },
			})

			// One-to-one relation (user_id is @unique on DietaryProfile)
			await tx.dietaryProfile.create({
				data: {
					user_id: user.id,
					halal_pref: false,
				},
			})

			return user
		})

		return {
			user: newUser,
			message: 'Registration successful',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		if (err?.code === 'P2002') {
			throw createError({ statusCode: 400, statusMessage: 'Email already exists.' })
		}

		console.error('Registration error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to register user.' })
	}
})
