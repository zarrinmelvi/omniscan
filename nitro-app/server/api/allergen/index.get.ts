import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'
import { searchFoodDataset, getFoodByName } from '../../lib/food-dataset'

// Returns the full allergen catalog. Kept unauthenticated because the client
// ProfilePage also consumes it to render selectable allergen toggles.
// Each row now also carries its linked ingredient-mapping terms (aliases) so
// the admin "Edit Allergen" modal can load them directly without a second call.
//
// Pagination is OPT-IN: only when `page` is present in the query are
// page / pageSize (1-100, default 10) / search honoured, and the response
// becomes `{ allergens, pagination }`. Without `page` the bare array is
// returned exactly as before.
//
// Autocomplete mode: when ?q=<text> is present (and ?page is absent), returns
// up to 8 suggestions merging the live DB with the static food dataset.
// DB results are tagged `source: 'db'`; dataset-only entries are `source: 'dataset'`.
export default defineEventHandler(async (event) => {
	const query = getQuery(event)

	// ── Autocomplete mode ────────────────────────────────────────────────────
	if (query.q !== undefined && query.page === undefined) {
		const q = typeof query.q === 'string' ? query.q.trim() : ''
		if (!q) return { suggestions: [] }

		// 1. DB matches (existing allergens)
		const dbMatches = await prisma.allergen.findMany({
			where: {
				OR: [
					{ name: { contains: q, mode: 'insensitive' } },
					{ scientific_name: { contains: q, mode: 'insensitive' } },
				],
			},
			orderBy: { name: 'asc' },
			take: 5,
			select: {
				id: true,
				name: true,
				scientific_name: true,
				is_predefined: true,
				_count: { select: { ingredient_mapping: true } },
				ingredient_mapping: {
					orderBy: { id: 'asc' },
					select: { id: true, scientific_term: true, simplified_term: true },
				},
			},
		})

		const dbNames = new Set(dbMatches.map((a) => a.name.toLowerCase()))

		const dbSuggestions = dbMatches.map((a) => {
			// Enrich with dataset info if available
			const ds = getFoodByName(a.name)
			return {
				id: a.id,
				name: a.name,
				scientific_name: a.scientific_name || ds?.botanicalName || '',
				is_predefined: a.is_predefined,
				mapping_count: a._count.ingredient_mapping,
				allergyType: ds?.allergyType ?? '',
				category: ds?.category ?? '',
				aliases: a.ingredient_mapping.map((m) => m.scientific_term),
				mappings: a.ingredient_mapping.map((m) => ({
					id: m.id,
					scientific_term: m.scientific_term,
					simplified_term: m.simplified_term,
				})),
				source: 'db' as const,
			}
		})

		// 2. Dataset-only matches (not yet in DB) — fill remaining slots up to 8 total
		const remaining = 8 - dbSuggestions.length
		const datasetSuggestions = remaining > 0
			? searchFoodDataset(q, remaining + 5)
				.filter((entry) => !dbNames.has(entry.name.toLowerCase()))
				.slice(0, remaining)
				.map((entry) => ({
					id: null as null,
					name: entry.name,
					scientific_name: entry.botanicalName,
					is_predefined: false,
					mapping_count: 0,
					allergyType: entry.allergyType,
					category: entry.category,
					subcategory: entry.subcategory,
					aliases: entry.botanicalName ? [entry.botanicalName] : [],
					mappings: [],
					source: 'dataset' as const,
				}))
			: []

		return { suggestions: [...dbSuggestions, ...datasetSuggestions] }
	}
	// ────────────────────────────────────────────────────────────────────────

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
