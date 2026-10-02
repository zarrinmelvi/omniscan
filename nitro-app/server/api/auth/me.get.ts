import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const queryEmail = query.email as string | undefined

	// Unauthenticated check by email parameter for onboarding status polling
	if (queryEmail && typeof queryEmail === 'string') {
		const userByEmail = await prisma.user.findUnique({
			where: { email: queryEmail.trim().toLowerCase() },
			select: { id: true, name: true, email: true, email_verified: true },
		})

		if (!userByEmail) {
			return { email_verified: false, verified: false }
		}

		return {
			email_verified: userByEmail.email_verified,
			verified: userByEmail.email_verified,
			user: userByEmail,
		}
	}

	// Standard authenticated query behavior
	const authUser = requireAuth(event)

	const user = await prisma.user.findUnique({
		where: { id: authUser.id },
		select: { id: true, name: true, email: true, email_verified: true },
	})

	if (!user) {
		throw createError({ statusCode: 401, statusMessage: 'User no longer exists.' })
	}

	return { user, email_verified: user.email_verified, verified: user.email_verified }
})