import { eventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default eventHandler(async (event) => {
	const authUser = requireAuth(event) // CHANGED — was manual event.context.user check

	try {
		const user = await prisma.user.findUnique({
			where: { id: authUser.id },
			include: {
				dietary_prof: true,
				allergens: true,
			},
		})

		if (!user) {
			throw createError({
				statusCode: 404,
				statusMessage: 'User not found.',
			})
		}

		// NEW — powers the "Total Items Scanned" stat on the profile page
		const scanCount = await prisma.scan.count({
			where: { user_id: authUser.id },
		})

		const { password: _password, ...safeUser } = user

		return {
			success: true,
			user: safeUser,
			stats: {
				total_items_scanned: scanCount,
			},
		}
	} catch (error: any) {
		if (error.statusCode) throw error

		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'An unexpected error occurred while fetching the profile.',
		})
	}
})
