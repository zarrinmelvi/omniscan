import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

/**
 * GET /api/categories
 *
 * Consumer-facing equivalent of GET /api/admin/categories.
 * Returns the list of category names from the ProductCategory table so the
 * Consumer App dropdowns always reflect whatever the admin has configured.
 *
 * Requires a consumer JWT (requireAuth) — no admin token needed.
 * Returns a bare string array: ["Beverages", "Canned Goods", ..., "Uncategorized"]
 * Unlocked categories are sorted A-Z first; locked ones (Uncategorized) come last.
 */
export default defineEventHandler(async (event) => {
	requireAuth(event)

	try {
		const categories = await prisma.productCategory.findMany({
			orderBy: [{ is_locked: 'asc' }, { name: 'asc' }],
			select: { name: true },
		})

		return categories.map((c) => c.name)
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch categories:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to fetch categories.' })
	}
})
