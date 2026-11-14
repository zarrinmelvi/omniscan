import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { isValidPantryUnit, isValidPantryCategory } from '../../lib/pantry-taxonomy'

interface UpdatePantryItemBody {
	net_content?: number | null
	net_unit?: string | null
	pieces_count?: number
	expiration_date?: string | null
	best_before_date?: string | null
	storage_location?: string
	category?: string
	is_archived?: boolean
	is_auto_archived?: boolean // Optional explicit flag for cron/automated jobs
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

	const { net_content, net_unit, pieces_count, expiration_date, best_before_date, storage_location, category, is_archived, is_auto_archived } = body

	if (net_content === undefined && net_unit === undefined && pieces_count === undefined && expiration_date === undefined && best_before_date === undefined && storage_location === undefined && is_archived === undefined && category === undefined) {
		throw createError({
			statusCode: 400,
			statusMessage: 'At least one field must be provided to update.',
		})
	}

	// Validate pieces_count if provided
	if (pieces_count !== undefined && (typeof pieces_count !== 'number' || pieces_count < 1 || pieces_count > 999 || !Number.isInteger(pieces_count))) {
		throw createError({ statusCode: 400, statusMessage: 'pieces_count must be an integer between 1 and 999.' })
	}

	// Validate net_content and net_unit
	if (net_content !== undefined && net_content !== null) {
		if (typeof net_content !== 'number' || net_content <= 0 || net_content > 99999) {
			throw createError({ statusCode: 400, statusMessage: 'net_content must be a positive number no greater than 99999.' })
		}
		if (!net_unit || !isValidPantryUnit(net_unit)) {
			throw createError({ statusCode: 400, statusMessage: 'net_unit must be one of: g, kg, ml, L, oz, cloves.' })
		}
	}

	if (is_archived !== undefined && typeof is_archived !== 'boolean') {
		throw createError({ statusCode: 400, statusMessage: 'is_archived must be a boolean.' })
	}

	if (category !== undefined && !isValidPantryCategory(category)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid category.' })
	}

	if (storage_location !== undefined && (!storage_location || !['Fridge', 'Freezer', 'Cupboard'].includes(storage_location))) {
		throw createError({ statusCode: 400, statusMessage: 'storage_location must be one of: Fridge, Freezer, Cupboard.' })
	}

	// An item holds only one active date: reject requests that set both.
	if (expiration_date && best_before_date) {
		throw createError({ statusCode: 400, statusMessage: 'Provide either expiration_date or best_before_date, not both.' })
	}

	// undefined = leave unchanged, null = clear, Date = set
	let parsedExpirationDate: Date | null | undefined
	if (expiration_date === null) {
		parsedExpirationDate = null
	} else if (expiration_date !== undefined) {
		if (typeof expiration_date !== 'string') {
			throw createError({ statusCode: 400, statusMessage: 'expiration_date must be a string.' })
		}
		parsedExpirationDate = new Date(expiration_date)
		if (isNaN(parsedExpirationDate.getTime())) {
			throw createError({ statusCode: 400, statusMessage: 'expiration_date must be a valid ISO date.' })
		}
	}

	let parsedBestBeforeDate: Date | null | undefined
	if (best_before_date === null) {
		parsedBestBeforeDate = null
	} else if (best_before_date !== undefined) {
		if (typeof best_before_date !== 'string') {
			throw createError({ statusCode: 400, statusMessage: 'best_before_date must be a string.' })
		}
		parsedBestBeforeDate = new Date(best_before_date)
		if (isNaN(parsedBestBeforeDate.getTime())) {
			throw createError({ statusCode: 400, statusMessage: 'best_before_date must be a valid ISO date.' })
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

		// Zero-pieces restore guard: cannot restore items with 0 pieces_count,
		// unless the item was archived due to expiry (not consumption).
		let restoreWithDefaultPieces = false
		if (is_archived === false && existingItem.is_archived) {
			const currentPieces = Number(existingItem.pieces_count)
			if (currentPieces <= 0) {
				const today = new Date()
				const isExpiredArchival =
					(existingItem.expiration_date != null && new Date(existingItem.expiration_date) <= today) ||
					(existingItem.best_before_date != null && new Date(existingItem.best_before_date) <= today)
				if (!isExpiredArchival) {
					throw createError({
						statusCode: 409,
						statusMessage: 'Cannot restore this item because its quantity is 0. It has been fully used.',
					})
				}
				// Expired item with zero pieces: allow restore and reset pieces to 1
				restoreWithDefaultPieces = true
			}
		}

		const updatedItem = await prisma.pantryItem.update({
			where: { id: itemId },
			data: {
				...(net_content !== undefined && { net_content }),
				...(net_unit !== undefined && { net_unit }),
				// When restoring an expired item that had 0 pieces, reset to 1
				...(restoreWithDefaultPieces && { pieces_count: 1, quantity: 1 }),
				...(pieces_count !== undefined && { 
					pieces_count,
					// Also update old fields for backward compatibility
					quantity: pieces_count,
					portion_unit: 'pcs'
				}),
				// Manual archive (not expiry auto-archive): mark permanently consumed so restore guard blocks it
				...(isNewlyConsumed && !is_auto_archived && { pieces_count: 0 }),
				...(parsedExpirationDate !== undefined && { expiration_date: parsedExpirationDate }),
				...(parsedBestBeforeDate !== undefined && { best_before_date: parsedBestBeforeDate }),
				// Setting one date clears the other so only one stays active
				...(parsedExpirationDate instanceof Date && parsedBestBeforeDate === undefined && { best_before_date: null }),
				...(parsedBestBeforeDate instanceof Date && parsedExpirationDate === undefined && { expiration_date: null }),
				...(storage_location !== undefined && { storage_location }),
				...(category !== undefined && { category }),
				...(is_archived !== undefined && { is_archived }),
				...(is_archived === false && { deleted_at: null }),
			},
			include: {
				product: {
					select: {
						id: true,
						brand_name: true,
						product_name: true,
						image_thumb_base64: true,
					},
				},
			},
		})

		if (isNewlyConsumed) {
			// Check if the item was auto-archived because it expired or was flagged by an automated process
			const isExpired = existingItem.expiration_date && new Date(existingItem.expiration_date) <= new Date()
			const activityType = is_auto_archived || isExpired ? 'auto_archived' : 'consumed'

			await prisma.activityLog.create({
				data: {
					type: activityType,
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
				net_content: updatedItem.net_content ? Number(updatedItem.net_content) : null,
				net_unit: updatedItem.net_unit,
				pieces_count: updatedItem.pieces_count,
				quantity: Number(updatedItem.quantity), // Keep for backward compatibility
				portion_unit: updatedItem.portion_unit, // Keep for backward compatibility
				category: updatedItem.category,
				storage_location: updatedItem.storage_location,
				expiration_date: updatedItem.expiration_date ? updatedItem.expiration_date.toISOString() : null,
				best_before_date: updatedItem.best_before_date ? updatedItem.best_before_date.toISOString() : null,
				is_archived: updatedItem.is_archived,
				updated_at: updatedItem.updated_at.toISOString(),
				product: {
					id: updatedItem.product.id,
					brand_name: updatedItem.product.brand_name,
					product_name: updatedItem.product.product_name,
					// Thumbnail only, so the picture survives archive/restore without a heavy payload.
					image_base64: updatedItem.product.image_thumb_base64 ?? null,
				},
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