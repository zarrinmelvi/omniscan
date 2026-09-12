import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const user = await prisma.user.findUnique({
		where: { id: authUser.id },
		select: { id: true, name: true, email: true },
	})

	if (!user) {
		throw createError({ statusCode: 401, statusMessage: 'User no longer exists.' })
	}

	return { user }
})
