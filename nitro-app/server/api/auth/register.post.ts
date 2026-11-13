import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma'
import { sendVerificationEmail, isAllowedEmailDomain } from '../../utils/email'
import { createVerificationToken } from '../../lib/verification-token'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SALT_ROUNDS = 10

export default defineEventHandler(async (event) => {
	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { first_name, last_name, username, email, password, gender, birthday } = body as {
		first_name?: string; last_name?: string; username?: string; email?: string; password?: string; gender?: string; birthday?: string
	}

	if (!first_name || typeof first_name !== 'string' || !first_name.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'First name is required.' })
	}
	if (!last_name || typeof last_name !== 'string' || !last_name.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Last name is required.' })
	}
	if (!username || typeof username !== 'string' || !username.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Username is required.' })
	}
	// Username: 4-15 chars, alphanumeric + underscore only
	const USERNAME_RE = /^[a-zA-Z0-9_]{4,15}$/
	if (!USERNAME_RE.test(username.trim())) {
		throw createError({ statusCode: 400, statusMessage: 'Username must be 4–15 characters, letters, numbers, and underscores only.' })
	}
	if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || !isAllowedEmailDomain(email)) {
		throw createError({ statusCode: 400, statusMessage: 'Only @gmail.com, @outlook.com, @hotmail.com, and @yahoo.com emails are permitted.' })
	}
	if (!password || typeof password !== 'string' || password.length < 6) {
		throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters.' })
	}
	if (password.length > 30) {
		throw createError({ statusCode: 400, statusMessage: 'Password must be 30 characters or fewer.' })
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

	const fullName = `${first_name.trim()} ${last_name.trim()}`
	const normalizedUsername = username.trim()

	try {
		const existingUser = await prisma.user.findUnique({
			where: { email },
			select: { id: true, name: true, email_verified: true, last_verification_sent_at: true },
		})

		if (existingUser) {
			// If the account exists but is unverified, resend the verification email
			// instead of blocking — the user may not have received the first one.
			if (!existingUser.email_verified) {
				// Enforce 60-second cooldown on resend
				if (existingUser.last_verification_sent_at) {
					const secondsElapsed = (Date.now() - existingUser.last_verification_sent_at.getTime()) / 1000
					if (secondsElapsed < 60) {
						const remaining = Math.ceil(60 - secondsElapsed)
						throw createError({
							statusCode: 429,
							statusMessage: `A verification email was already sent. Please wait ${remaining} second${remaining === 1 ? '' : 's'} before trying again.`,
						})
					}
				}

				// A username is only reserved by verified accounts
				const verifiedOwner = await prisma.user.findUnique({
					where: { username: normalizedUsername },
					select: { id: true },
				})
				if (verifiedOwner) {
					throw createError({ statusCode: 400, statusMessage: 'That username is already taken. Please choose another.' })
				}

				// Generate a fresh token (carrying the pending username) and resend
				const token = createVerificationToken(normalizedUsername)
				const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

				await prisma.user.update({
					where: { email },
					data: {
						verification_token: token,
						verification_token_expires_at: tokenExpiry,
						last_verification_sent_at: new Date(),
					},
				})

				const emailResult = await sendVerificationEmail(email, existingUser.name, token)
				if (!emailResult.success) {
					throw createError({
						statusCode: 500,
						statusMessage: "We couldn't send a verification email to that address. Please use a valid email and try again.",
					})
				}

				return {
					message: 'A new verification email has been sent. Please check your inbox.',
					requiresVerification: true,
					email,
				}
			}

			// Account exists and is verified — reject normally
			throw createError({ statusCode: 400, statusMessage: 'An account with this email already exists. Please sign in.' })
		}

		const existingUsername = await prisma.user.findUnique({
			where: { username: normalizedUsername },
			select: { id: true },
		})
		if (existingUsername) {
			throw createError({ statusCode: 400, statusMessage: 'That username is already taken. Please choose another.' })
		}

		// Generate verification token and expiry before creating the user.
		// If the email send fails we abort — no account is created (REQ-008).
		const token = createVerificationToken(normalizedUsername)
		const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

		const emailResult = await sendVerificationEmail(email, fullName, token)

		if (!emailResult.success) {
			console.error('Registration aborted — verification email failed:', emailResult.error)
			throw createError({
				statusCode: 500,
				statusMessage: "We couldn't send a verification email to that address. Please use a valid email and try again.",
			})
		}

		const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

		await prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					name: fullName,
					first_name: first_name.trim(),
					last_name: last_name.trim(),
					// Username is held as pending in the verification token and
					// only saved on verification, so it never blocks other users.
					username: null,
					email,
					password: hashedPassword,
					gender,
					birthday: birthdayDate,
					status: 'ACTIVE',
					last_active: new Date(),
					email_verified: false,
					verification_token: token,
					verification_token_expires_at: tokenExpiry,
					last_verification_sent_at: new Date(),
				},
			})

			await tx.dietaryProfile.create({
				data: {
					user_id: user.id,
					halal_pref: false,
				},
			})
		})

		return {
			message: 'Registration successful. Please check your email to verify your account.',
			requiresVerification: true,
			email,
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