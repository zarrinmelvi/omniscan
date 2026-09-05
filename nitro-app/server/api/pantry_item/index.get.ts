import { defineEventHandler } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const items = await prisma.pantryItem.findMany({
		where: {
			user_id: authUser.id,
			deleted_at: null,
		},
		include: {
			product: {
				select: {
					id: true,
					product_name: true,
					brand_name: true,
					image_base64: true, // NEW
				},
			},
		},
		orderBy: { expiration_date: 'asc' },
	})

	const serializedItems = items.map((item) => ({
		id: item.id,
		quantity: Number(item.quantity),
		portion_unit: item.portion_unit,
		storage_location: item.storage_location,
		// Both dates are now optional — only one is guaranteed to exist
		expiration_date: item.expiration_date ? item.expiration_date.toISOString() : null,
		best_before_date: item.best_before_date ? item.best_before_date.toISOString() : null,
		is_archived: item.is_archived,
		updated_at: item.updated_at.toISOString(),
		product: item.product,
	}))

	return {
		success: true,
		items: serializedItems,
	}
})
