import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

interface UpdatePantryItemBody {
	quantity?: number
	expiration_date?: string
	is_archived?: boolean
}

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const idParam = getRouterParam(event, 'id')
	const itemId = Number(idParam)

	if (!idParam || isNaN(itemId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid pantry item id is required.' })
	}

	const body = (await readBody(event).catch(() => null)) as UpdatePantryItemBody | null

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { quantity, expiration_date, is_archived } = body

	if (quantity === undefined && expiration_date === undefined && is_archived === undefined) {
		throw createError({
			statusCode: 400,
			statusMessage: 'At least one of quantity, expiration_date, or is_archived must be provided.',
		})
	}

	if (quantity !== undefined && (typeof quantity !== 'number' || quantity <= 0)) {
		throw createError({ statusCode: 400, statusMessage: 'quantity must be a positive number.' })
	}

	if (is_archived !== undefined && typeof is_archived !== 'boolean') {
		throw createError({ statusCode: 400, statusMessage: 'is_archived must be a boolean.' })
	}

	let parsedExpirationDate: Date | undefined
	if (expiration_date !== undefined) {
		if (typeof expiration_date !== 'string') {
			throw createError({ statusCode: 400, statusMessage: 'expiration_date must be a string.' })
		}
		parsedExpirationDate = new Date(expiration_date)
		if (isNaN(parsedExpirationDate.getTime())) {
			throw createError({ statusCode: 400, statusMessage: 'expiration_date must be a valid ISO date.' })
		}
	}

	try {
		const existingItem = await prisma.pantryItem.findUnique({
			where: { id: itemId },
			include: { product: { select: { id: true, product_name: true } } },
		})

		if (!existingItem || existingItem.deleted_at) {
			throw createError({ statusCode: 404, statusMessage: 'Pantry item not found.' })
		}

		if (existingItem.user_id !== authUser.id) {
			throw createError({ statusCode: 403, statusMessage: 'You do not have access to this pantry item.' })
		}

		const isNewlyConsumed = is_archived === true && !existingItem.is_archived

		const updatedItem = await prisma.pantryItem.update({
			where: { id: itemId },
			data: {
				...(quantity !== undefined && { quantity }),
				...(parsedExpirationDate !== undefined && { expiration_date: parsedExpirationDate }),
				...(is_archived !== undefined && { is_archived }),
				...(is_archived === false && { deleted_at: null }),
			},
			include: {
				product: {
					select: {
						id: true,
						brand_name: true,
						product_name: true,
					},
				},
			},
		})

		if (isNewlyConsumed) {
			await prisma.activityLog.create({
				data: {
					type: 'consumed',
					message: existingItem.product.product_name,
					user_id: authUser.id,
					product_id: existingItem.product.id,
					pantry_item_id: itemId,
				},
			})
		}

		return {
			success: true,
			item: {
				id: updatedItem.id,
				quantity: Number(updatedItem.quantity),
				portion_unit: updatedItem.portion_unit,
				storage_location: updatedItem.storage_location,
				expiration_date: updatedItem.expiration_date ? updatedItem.expiration_date.toISOString() : null,
				best_before_date: updatedItem.best_before_date ? updatedItem.best_before_date.toISOString() : null,
				is_archived: updatedItem.is_archived,
				updated_at: updatedItem.updated_at.toISOString(),
				product: updatedItem.product,
			},
		}
	} catch (err: any) {
		if (err?.statusCode) {
			throw err
		}

		console.error('Failed to update pantry item:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to update pantry item.' })
	}
})
