import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

/**
 * GET /api/admin/categories
 *
 * Returns all ProductCategory rows with a live product count — the number of
 * non-deleted PantryItem rows whose category string matches each category name.
 * Unlocked categories come first (A–Z), then locked ones (Uncategorized) last.
 */
export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	try {
		const categories = await prisma.productCategory.findMany({
			orderBy: [{ is_locked: 'asc' }, { name: 'asc' }],
		})

		// Count PantryItem rows per category name in a single aggregation query.
		// Using groupBy is the most efficient path: one round-trip, no N+1.
		const counts = await prisma.pantryItem.groupBy({
			by: ['category'],
			where: { deleted_at: null },
			_count: { _all: true },
		})

		// Build a lookup map: category name → count
		const countMap: Record<string, number> = {}
		for (const c of counts) {
			const key = c.category ?? 'Uncategorized'
			countMap[key] = (countMap[key] ?? 0) + (c._count._all ?? 0)
		}

		return {
			success: true,
			categories: categories.map((cat) => ({
				id: cat.id,
				name: cat.name,
				is_locked: cat.is_locked,
				product_count: countMap[cat.name] ?? 0,
			})),
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch categories:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to fetch categories.' })
	}
})
