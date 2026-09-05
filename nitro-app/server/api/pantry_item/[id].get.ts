// server/api/pantry_item/[id].get.ts
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const idParam = getRouterParam(event, 'id')
	const itemId = Number(idParam)

	if (!idParam || isNaN(itemId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid pantry item id is required.' })
	}

	try {
		const item = await prisma.pantryItem.findUnique({
			where: { id: itemId },
			include: {
				product: {
					select: {
						id: true,
						product_name: true,
						brand_name: true,
						image_base64: true,
						ingredient_text: true,
						simplified_ingredients: true,
						halal_logo_id: true,
					},
				},
			},
		})

		if (!item || item.deleted_at) {
			throw createError({ statusCode: 404, statusMessage: 'Pantry item not found.' })
		}

		if (item.user_id !== authUser.id) {
			throw createError({ statusCode: 403, statusMessage: 'You do not have access to this pantry item.' })
		}

		return {
			success: true,
			item: {
				id: item.id,
				quantity: Number(item.quantity),
				portion_unit: item.portion_unit,
				storage_location: item.storage_location,
				expiration_date: item.expiration_date ? item.expiration_date.toISOString() : null,
				best_before_date: item.best_before_date ? item.best_before_date.toISOString() : null,
				is_archived: item.is_archived,
				updated_at: item.updated_at.toISOString(),
				product: item.product,
			},
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch pantry item:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch pantry item.' })
	}
})
