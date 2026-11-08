import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'

const mappingSelect = {
	id: true,
	scientific_term: true,
	simplified_term: true,
	allergen_id: true,
	updated_at: true,
	allergen: { select: { id: true, name: true } },
} as const

function toRow(m: {
	id: number
	scientific_term: string
	simplified_term: string
	allergen_id: number
	updated_at: Date
	allergen: { id: number; name: string } | null
}) {
	return {
		id: m.id,
		scientific_term: m.scientific_term,
		simplified_term: m.simplified_term,
		allergen_id: m.allergen_id,
		allergen_name: m.allergen?.name ?? 'Unknown',
		updated_at: m.updated_at,
	}
}

// Returns ingredient mappings joined with their parent allergen.
// Without `page` in the query the full list is returned (legacy behaviour).
// With `page`, supports page / pageSize (1-100, default 10) / search / allergen_id
// and adds a `pagination` object to the response.
export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const paginated = query.page !== undefined

	try {
		if (!paginated) {
			const mappings = await prisma.ingredientMapping.findMany({
				orderBy: { id: 'asc' },
				select: mappingSelect,
			})
			return { ingredient_mappings: mappings.map(toRow) }
		}

		const page = Math.max(1, Math.floor(Number(query.page)) || 1)
		const pageSize = Math.min(100, Math.max(1, Math.floor(Number(query.pageSize)) || 10))
		const search = typeof query.search === 'string' ? query.search.trim() : ''
		const allergenId = Number(query.allergen_id)

		const where: Record<string, any> = {}
		if (query.allergen_id !== undefined && query.allergen_id !== '' && Number.isInteger(allergenId) && allergenId > 0) {
			where.allergen_id = allergenId
		}
		if (search) {
			where.OR = [
				{ scientific_term: { contains: search, mode: 'insensitive' } },
				{ simplified_term: { contains: search, mode: 'insensitive' } },
				{ allergen: { name: { contains: search, mode: 'insensitive' } } },
			]
		}

		const [total, mappings] = await Promise.all([
			prisma.ingredientMapping.count({ where }),
			prisma.ingredientMapping.findMany({
				where,
				// Grouped-by-allergen A-Z display order, id as stable tiebreaker.
				orderBy: [{ allergen: { name: 'asc' } }, { id: 'asc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
				select: mappingSelect,
			}),
		])

		return {
			ingredient_mappings: mappings.map(toRow),
			pagination: {
				page,
				page_size: pageSize,
				total,
				total_pages: Math.max(1, Math.ceil(total / pageSize)),
			},
		}
	} catch (error: any) {
		throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch ingredient mappings.' })
	}
})
