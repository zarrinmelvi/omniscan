import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'

// Returns all ingredient mappings joined with their parent allergen.
export default defineEventHandler(async () => {
	try {
		const mappings = await prisma.ingredientMapping.findMany({
			orderBy: { id: 'asc' },
			select: {
				id: true,
				scientific_term: true,
				simplified_term: true,
				allergen_id: true,
				updated_at: true,
				allergen: { select: { id: true, name: true } },
			},
		})

		return {
			ingredient_mappings: mappings.map((m) => ({
				id: m.id,
				scientific_term: m.scientific_term,
				simplified_term: m.simplified_term,
				allergen_id: m.allergen_id,
				allergen_name: m.allergen?.name ?? 'Unknown',
				updated_at: m.updated_at,
			})),
		}
	} catch (error: any) {
		throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch ingredient mappings.' })
	}
})
