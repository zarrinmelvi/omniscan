import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'

// Returns the full allergen catalog. Kept unauthenticated because the client
// ProfilePage also consumes it to render selectable allergen toggles.
// Each row now also carries its linked ingredient-mapping terms (aliases) so
// the admin "Edit Allergen" modal can load them directly without a second call.
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
				ingredient_mapping: {
					orderBy: { id: 'asc' },
					select: { id: true, scientific_term: true, simplified_term: true },
				},
			},
		})

		return allergens.map((a) => ({
			id: a.id,
			name: a.name,
			scientific_name: a.scientific_name,
			is_predefined: a.is_predefined,
			mapping_count: a._count.ingredient_mapping,
			updated_at: a.updated_at,
			// Full mapping records for the edit modal's alias manager.
			mappings: a.ingredient_mapping.map((m) => ({
				id: m.id,
				scientific_term: m.scientific_term,
				simplified_term: m.simplified_term,
			})),
			// Convenience flat list of alias terms (scientific_term is the unique key).
			aliases: a.ingredient_mapping.map((m) => m.scientific_term),
		}))
	} catch (error: any) {
		throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch allergens.' })
	}
})
