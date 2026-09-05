import { eventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'

// server/api/allergen/index.get.ts
// Bonus endpoint: ProfilePage.vue needs a full allergen catalog to
// render as selectable toggles. This wasn't in your original files,
// so add it alongside index.post.ts / index.put.ts / index.delete.ts under server/api/allergen/.
export default eventHandler(async () => {
	try {
		const allergens = await prisma.allergen.findMany({
			orderBy: { name: 'asc' },
			select: {
				id: true,
				name: true,
				scientific_name: true,
			},
		})

		return allergens
	} catch (error: any) {
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'An unexpected error occurred while fetching allergens.',
		})
	}
})
