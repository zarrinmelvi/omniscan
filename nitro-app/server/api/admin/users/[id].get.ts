import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

/**
 * GET /api/admin/users/:id
 *
 * Returns the detail payload for a single consumer for the consumer-detail
 * modal:
 *   - name, username, status
 *   - allergens (name only — the caller decides when/whether to reveal them)
 *   - pantry items that are active (not archived, not soft-deleted), each with
 *     product name, category, expiry date, and product id (for "View in catalog")
 *   - pantry_count / pantry_max
 *
 * Allergens are always returned; the FRONTEND is responsible for masking them
 * until the admin explicitly clicks "Show Allergens". Showing allergens is
 * logged separately via POST /api/admin/users/:id/log-allergen-view.
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const rawId = getRouterParam(event, 'id')
	const userId = rawId ? parseInt(rawId, 10) : NaN
	if (isNaN(userId)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid user id.' })
	}

	const user = await prisma.user.findFirst({
		where: { id: userId, deleted_at: null },
		select: {
			id: true,
			name: true,
			username: true,
			status: true,
			last_active: true,
			allergens: {
				select: { id: true, name: true },
			},
			pantry_item: {
				where: { is_archived: false, deleted_at: null },
				orderBy: { expiration_date: 'asc' },
				select: {
					id: true,
					category: true,
					expiration_date: true,
					product: {
						select: { id: true, product_name: true, brand_name: true },
					},
				},
			},
			_count: {
				select: {
					pantry_item: { where: { is_archived: false, deleted_at: null } },
				},
			},
		},
	})

	if (!user) {
		throw createError({ statusCode: 404, statusMessage: 'User not found.' })
	}

	return {
		success: true,
		user: {
			id: user.id,
			name: user.name,
			username: user.username ?? null,
			status: user.status,
			last_active: user.last_active,
			allergens: user.allergens.map((a) => ({ id: a.id, name: a.name })),
			pantry_items: user.pantry_item.map((p) => ({
				id: p.id,
				product_id: p.product.id,
				product_name: p.product.product_name,
				brand_name: p.product.brand_name,
				category: p.category ?? 'Uncategorized',
				expiration_date: p.expiration_date ?? null,
			})),
			pantry_count: user._count.pantry_item,
			pantry_max: 100,
		},
	}
})
