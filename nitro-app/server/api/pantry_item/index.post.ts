import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

interface CreatePantryItemBody {
	product_id?: number
	product_name?: string
	image_base64?: string
	ingredient_text?: string
	expiration_date?: string
	best_before_date?: string
	storage_location?: string
	quantity?: number
	unit?: string
}

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const body = (await readBody(event).catch(() => null)) as CreatePantryItemBody | null

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { product_name, image_base64, ingredient_text, expiration_date, best_before_date, storage_location, quantity, unit } = body

	// ONLY check daily limit if this is a manual photo upload (product_id is undefined)
	if (body.product_id === undefined) {
		const startOfToday = new Date()
		startOfToday.setHours(0, 0, 0, 0)

		const todayManualUploadsCount = await prisma.pantryItem.count({
			where: {
				user_id: authUser.id,
				created_at: { gte: startOfToday },
				product: {
					brand_name: 'Manually Added',
				},
			},
		})

		if (todayManualUploadsCount >= 7) {
			throw createError({
				statusCode: 429,
				statusMessage: 'Daily upload limit reached. You can only manually upload 7 photos per day.',
			})
		}
	}

	if (body.product_id === undefined) {
		if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
			throw createError({ statusCode: 400, statusMessage: 'product_name is required.' })
		}
	}

	if (!expiration_date && !best_before_date) {
		throw createError({
			statusCode: 400,
			statusMessage: 'At least one of expiration_date or best_before_date is required.',
		})
	}

	let parsedExpirationDate: Date | null = null
	if (expiration_date !== undefined) {
		parsedExpirationDate = new Date(expiration_date)
		if (isNaN(parsedExpirationDate.getTime())) {
			throw createError({ statusCode: 400, statusMessage: 'expiration_date must be a valid ISO date.' })
		}
	}

	let parsedBestBeforeDate: Date | null = null
	if (best_before_date !== undefined) {
		parsedBestBeforeDate = new Date(best_before_date)
		if (isNaN(parsedBestBeforeDate.getTime())) {
			throw createError({ statusCode: 400, statusMessage: 'best_before_date must be a valid ISO date.' })
		}
	}

	if (quantity === undefined || typeof quantity !== 'number' || quantity <= 0) {
		throw createError({ statusCode: 400, statusMessage: 'quantity must be a positive number.' })
	}
	if (!unit || typeof unit !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'unit is required.' })
	}

	try {
		let product: { id: number; product_name: string } | null = null

		if (body.product_id !== undefined) {
			const productId = typeof body.product_id === 'number' ? body.product_id : Number(body.product_id)
			if (isNaN(productId)) {
				throw createError({ statusCode: 400, statusMessage: 'product_id must be a valid number.' })
			}

			product = await prisma.product.findUnique({
				where: { id: productId },
				select: { id: true, product_name: true },
			})
			if (!product) {
				throw createError({ statusCode: 404, statusMessage: 'Scanned product not found.' })
			}
		} else {
			if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
				throw createError({ statusCode: 400, statusMessage: 'product_name is required.' })
			}

			let existing = await prisma.product.findFirst({
				where: { product_name: product_name.trim() },
			})

			if (!existing) {
				existing = await prisma.product.create({
					data: {
						brand_name: 'Manually Added',
						product_name: product_name.trim(),
						ingredient_text: ingredient_text?.trim() || 'Unknown',
						simplified_ingredients: ingredient_text?.trim() || 'Unknown',
						image_base64: image_base64 || null,
						is_verified: false,
						halal_logo_id: null,
					},
				})
			} else if (image_base64) {
				existing = await prisma.product.update({
					where: { id: existing.id },
					data: { image_base64 },
				})
			}

			product = existing
		}

		const newItem = await prisma.pantryItem.create({
			data: {
				product_id: product.id,
				user_id: authUser.id,
				expiration_date: parsedExpirationDate,
				best_before_date: parsedBestBeforeDate,
				quantity,
				portion_unit: unit,
				storage_location: storage_location?.trim() || 'Unspecified',
				added_date: new Date(),
				is_archived: false,
			},
			include: { product: { select: { id: true, product_name: true, image_base64: true } } },
		})

		await prisma.activityLog.create({
			data: {
				type: 'added',
				message: product.product_name,
				user_id: authUser.id,
				product_id: product.id,
				pantry_item_id: newItem.id,
			},
		})

		return { success: true, item: newItem }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to create pantry item:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to create pantry item.' })
	}
})