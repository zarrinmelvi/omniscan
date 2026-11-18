import { defineEventHandler, getQuery, createError } from 'h3'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret'

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const queryEmail = query.email as string | undefined

	// Unauthenticated check by email parameter for onboarding status polling
	if (queryEmail && typeof queryEmail === 'string') {
		const userByEmail = await prisma.user.findUnique({
			where: { email: queryEmail.trim().toLowerCase() },
			select: {
				id: true,
				name: true,
				email: true,
				email_verified: true,
				session_token: true,
				halal_pref: true,
				updated_at: true,
				allergens: { select: { id: true }, take: 1 },
			},
		})

		if (!userByEmail) {
			return { email_verified: false, verified: false }
		}

		// Issue the active session token for any verified account that still needs Step 2
		// setup (allergen/halal), up to the 7-day account deletion window. The needsSetup
		// guard already prevents token issuance once the user has completed onboarding,
		// so widening from 30 minutes to 7 days is safe and fixes the case where the
		// original browser/APK polls after the old 30-minute window had expired.
		let onboardingToken: string | undefined
		const verifiedRecently = Date.now() - new Date(userByEmail.updated_at).getTime() < 7 * 24 * 60 * 60 * 1000
		const needsSetup = !userByEmail.halal_pref && userByEmail.allergens.length === 0

		if (userByEmail.email_verified && userByEmail.session_token && verifiedRecently && needsSetup) {
			onboardingToken = jwt.sign(
				{ userId: userByEmail.id, email: userByEmail.email, sid: userByEmail.session_token },
				JWT_SECRET,
				{ expiresIn: '7d' }
			)
		}

		return {
			email_verified: userByEmail.email_verified,
			verified: userByEmail.email_verified,
			...(onboardingToken ? { token: onboardingToken } : {}),
			user: {
				id: userByEmail.id,
				name: userByEmail.name,
				email: userByEmail.email,
				email_verified: userByEmail.email_verified,
			},
		}
	}

	// Standard authenticated query behavior
	const authUser = requireAuth(event)

	const user = await prisma.user.findUnique({
		where: { id: authUser.id },
		select: { id: true, name: true, email: true, email_verified: true, avatar_base64: true },
	})

	if (!user) {
		throw createError({ statusCode: 401, statusMessage: 'User no longer exists.' })
	}

	return { user, email_verified: user.email_verified, verified: user.email_verified }
})