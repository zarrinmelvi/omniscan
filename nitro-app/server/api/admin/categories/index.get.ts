import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

/**
 * GET /api/admin/categories
 *
 * Returns every distinct pantry category together with how many Product rows
 * are assigned to it (via PantryItem.category, counting all non-deleted items).
 * "Uncategorized" is always present and always last.
 */
export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	try {
		// Group all non-deleted pantry items by category and count distinct products
		const grouped = await prisma.pantryItem.groupBy({
			by: ['category'],
			where: { deleted_at: null },
			_count: { id: true },
		})

		// Ensure Uncategorized always appears even if no items use it
		const rows = grouped.map((g) => ({
			name: g.category ?? 'Uncategorized',
			product_count: g._count.id,
		}))

		if (!rows.find((r) => r.name === 'Uncategorized')) {
			rows.push({ name: 'Uncategorized', product_count: 0 })
		}

		// Sort: alphabetical, Uncategorized always last
		rows.sort((a, b) => {
			if (a.name === 'Uncategorized') return 1
			if (b.name === 'Uncategorized') return -1
			return a.name.localeCompare(b.name)
		})

		return { success: true, categories: rows }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('[admin/categories] GET failed:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to fetch categories.' })
	}
})
