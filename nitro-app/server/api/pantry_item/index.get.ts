import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const query = getQuery(event)
	// Pagination params are OPTIONAL. When absent, return all items (legacy
	// behavior) but still include pagination metadata for new clients.
	const rawPage = Number(query.page)
	const rawLimit = Number(query.limit)
	const hasPagination = Number.isFinite(rawPage) && rawPage > 0 && Number.isFinite(rawLimit) && rawLimit > 0
	const page = hasPagination ? Math.floor(rawPage) : 1
	const limit = hasPagination ? Math.min(100, Math.floor(rawLimit)) : 0 // 0 => no take limit

	const where = { user_id: authUser.id, deleted_at: null }

	const totalItems = await prisma.pantryItem.count({ where })

	const items = await prisma.pantryItem.findMany({
		where,
		include: {
			product: {
				select: { id: true, product_name: true, brand_name: true, image_base64: true },
			},
		},
		orderBy: { expiration_date: 'asc' },
		...(hasPagination ? { skip: (page - 1) * limit, take: limit } : {}),
	})

	const serializedItems = items.map((item) => ({
		id: item.id,
		quantity: Number(item.quantity),
		portion_unit: item.portion_unit,
		category: item.category,
		storage_location: item.storage_location,
		expiration_date: item.expiration_date ? item.expiration_date.toISOString() : null,
		best_before_date: item.best_before_date ? item.best_before_date.toISOString() : null,
		is_archived: item.is_archived,
		updated_at: item.updated_at.toISOString(),
		product: item.product,
	}))

	const totalPages = hasPagination ? Math.max(1, Math.ceil(totalItems / limit)) : 1

	return {
		success: true,
		items: serializedItems,
		pagination: {
			currentPage: hasPagination ? page : 1,
			totalPages,
			totalItems,
			limit: hasPagination ? limit : totalItems,
		},
	}
})
