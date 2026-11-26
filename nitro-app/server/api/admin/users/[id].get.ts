import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

/**
 * GET /api/admin/users/:id
 * Read-only consumer detail for the Manage User Profiles modal (Ticket 1).
 * Returns name, username, status, pantry items, and pantry count.
 * Allergens are excluded (Ticket 2). No mutations.
 */
export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const rawId = getRouterParam(event, 'id')
	const userId = rawId ? parseInt(rawId, 10) : NaN
	if (!userId || isNaN(userId)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid user id.' })
	}

	const user = await prisma.user.findFirst({
		where: { id: userId, deleted_at: null },
		select: {
			id: true, name: true, username: true, status: true,
			avatar_base64: true,
			pantry_item: {
				where: { is_archived: false, deleted_at: null },
				orderBy: { expiration_date: 'asc' },
				select: {
					id: true, category: true, expiration_date: true,
					product: { select: { id: true, product_name: true } },
				},
			},
			_count: { select: { pantry_item: { where: { is_archived: false, deleted_at: null } } } },
		},
	})

	if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found.' })

	return {
		success: true,
		user: {
			id: user.id, name: user.name, username: user.username ?? null, status: user.status,
			avatar_base64: user.avatar_base64 ?? null,
			pantry_items: user.pantry_item.map((p) => ({
				id: p.id,
				product_id: p.product.id,
				product_name: p.product.product_name,
				category: p.category ?? 'Uncategorized',
				expiration_date: p.expiration_date ? p.expiration_date.toISOString() : null,
			})),
			pantry_count: user._count.pantry_item,
			pantry_max: 100,
		},
	}
})