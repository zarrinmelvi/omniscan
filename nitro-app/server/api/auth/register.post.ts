import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma'
import { generateVerificationToken, sendVerificationEmail, isAllowedEmailDomain } from '../../utils/email'

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
	if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || !isAllowedEmailDomain(email)) {
		throw createError({ statusCode: 400, statusMessage: 'Only @gmail.com, @outlook.com, @hotmail.com, and @yahoo.com emails are permitted.' })
	}
	if (!password || typeof password !== 'string' || password.length < 6) {
		throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters.' })
	}

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

				// Generate a fresh token and resend
				const token = generateVerificationToken()
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

		// Generate verification token and expiry before creating the user.
		// If the email send fails we abort — no account is created (REQ-008).
		const token = generateVerificationToken()
		const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

		const emailResult = await sendVerificationEmail(email, name.trim(), token)

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
					name: name.trim(),
					email,
					password: hashedPassword,
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