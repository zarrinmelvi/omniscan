import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'

// Returns the full allergen catalog. Kept unauthenticated because the client
// ProfilePage also consumes it to render selectable allergen toggles.
// Each row now also carries its linked ingredient-mapping terms (aliases) so
// the admin "Edit Allergen" modal can load them directly without a second call.
//
// Pagination is OPT-IN: only when `page` is present in the query are
// page / pageSize (1-100, default 10) / search honoured, and the response
// becomes `{ allergens, pagination }`. Without `page` the bare array is
// returned exactly as before.
export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const paginated = query.page !== undefined

	try {
		const select = {
			id: true,
			name: true,
			scientific_name: true,
			is_predefined: true,
			updated_at: true,
			_count: { select: { ingredient_mapping: true } },
			ingredient_mapping: {
				orderBy: { id: 'asc' as const },
				select: { id: true, scientific_term: true, simplified_term: true },
			},
		}

		let pagination: { page: number; page_size: number; total: number; total_pages: number } | null = null
		let allergens

		if (paginated) {
			const page = Math.max(1, Math.floor(Number(query.page)) || 1)
			const pageSize = Math.min(100, Math.max(1, Math.floor(Number(query.pageSize)) || 10))
			const search = typeof query.search === 'string' ? query.search.trim() : ''
			const where = search
				? {
						OR: [
							{ name: { contains: search, mode: 'insensitive' as const } },
							{ scientific_name: { contains: search, mode: 'insensitive' as const } },
						],
					}
				: {}

			const total = await prisma.allergen.count({ where })
			allergens = await prisma.allergen.findMany({
				where,
				// A-Z by name (what the admin table displays), id as stable tiebreaker.
				orderBy: [{ name: 'asc' }, { id: 'asc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
				select,
			})
			pagination = { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) }
		} else {
			allergens = await prisma.allergen.findMany({ orderBy: { id: 'asc' }, select })
		}

		const rows = allergens.map((a) => ({
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

		return pagination ? { allergens: rows, pagination } : rows
	} catch (error: any) {
		throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch allergens.' })
	}
})
