import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'

// Returns the full allergen catalog. Kept unauthenticated because the client
// ProfilePage also consumes it to render selectable allergen toggles.
export default defineEventHandler(async () => {
	try {
		const allergens = await prisma.allergen.findMany({
			orderBy: { id: 'asc' },
			select: {
				id: true,
				name: true,
				scientific_name: true,
				is_predefined: true,
				updated_at: true,
				_count: { select: { ingredient_mapping: true } },
			},
		})

		return allergens.map((a) => ({
			id: a.id,
			name: a.name,
			scientific_name: a.scientific_name,
			is_predefined: a.is_predefined,
			mapping_count: a._count.ingredient_mapping,
			updated_at: a.updated_at,
		}))
	} catch (error: any) {
		throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch allergens.' })
	}
})
