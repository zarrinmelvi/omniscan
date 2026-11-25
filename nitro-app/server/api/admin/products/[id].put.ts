import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

interface UpdateProductBody {
	product_name?: string
	brand_name?: string
	category?: string
}

/**
 * PUT /api/admin/products/:id
 *
 * Updates a product's name, brand, and pantry category in a single transaction:
 *   1. Updates Product.product_name, Product.brand_name, and recomputes canonical_key.
 *   2. Bulk-updates all non-deleted PantryItem rows for this product to the new category.
 *
 * The canonical_key update keeps the dedup system consistent with any name changes.
 * The PantryItem bulk-update propagates the category to every consumer holding this
 * product immediately — no consumer-side action required.
 */
export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const rawId = getRouterParam(event, 'id')
	const productId = rawId ? parseInt(rawId, 10) : NaN
	if (!productId || isNaN(productId)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid product id.' })
	}

	const body = (await readBody(event).catch(() => null)) as UpdateProductBody | null
	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { product_name, brand_name, category } = body

	// At least one field must be provided.
	if (product_name === undefined && brand_name === undefined && category === undefined) {
		throw createError({ statusCode: 400, statusMessage: 'At least one field must be provided.' })
	}

	// Validate fields that were supplied.
	if (product_name !== undefined) {
		if (typeof product_name !== 'string' || !product_name.trim()) {
			throw createError({ statusCode: 400, statusMessage: 'Product name must be a non-empty string.' })
		}
		if (product_name.trim().length > 200) {
			throw createError({ statusCode: 400, statusMessage: 'Product name must be 200 characters or fewer.' })
		}
	}
	if (brand_name !== undefined) {
		if (typeof brand_name !== 'string' || !brand_name.trim()) {
			throw createError({ statusCode: 400, statusMessage: 'Brand name must be a non-empty string.' })
		}
		if (brand_name.trim().length > 200) {
			throw createError({ statusCode: 400, statusMessage: 'Brand name must be 200 characters or fewer.' })
		}
	}
	if (category !== undefined) {
		if (typeof category !== 'string' || !category.trim()) {
			throw createError({ statusCode: 400, statusMessage: 'Category must be a non-empty string.' })
		}
		if (category.trim().length > 50) {
			throw createError({ statusCode: 400, statusMessage: 'Category must be 50 characters or fewer.' })
		}
	}

	try {
		// Fetch the current product to validate it exists and to build canonical_key.
		const existing = await prisma.product.findFirst({
			where: { id: productId, deleted_at: null },
			select: { id: true, product_name: true, brand_name: true },
		})
		if (!existing) {
			throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
		}

		// Resolve final values (fall back to existing when not supplied).
		const finalProductName = product_name !== undefined ? product_name.trim() : existing.product_name
		const finalBrandName   = brand_name   !== undefined ? brand_name.trim()   : existing.brand_name
		const finalCategory    = category     !== undefined ? category.trim()     : null

		// Recompute canonical_key so the dedup system stays consistent.
		const newCanonicalKey = `${finalBrandName.toLowerCase()}|${finalProductName.toLowerCase()}`

		// Build the Product update payload — only include fields that changed.
		const productData: Record<string, string> = { canonical_key: newCanonicalKey }
		if (product_name !== undefined) productData.product_name = finalProductName
		if (brand_name   !== undefined) productData.brand_name   = finalBrandName

		// Run both mutations atomically.
		const ops: Parameters<typeof prisma.$transaction>[0] = [
			prisma.product.update({
				where: { id: productId },
				data: productData,
				select: { id: true, product_name: true, brand_name: true, canonical_key: true },
			}),
		]

		// Only bulk-update PantryItem.category when a category was supplied.
		if (finalCategory !== null) {
			ops.push(
				prisma.pantryItem.updateMany({
					where: { product_id: productId, deleted_at: null },
					data: { category: finalCategory },
				}) as any,
			)
		}

		const results = await prisma.$transaction(ops)
		const updated = results[0] as { id: number; product_name: string; brand_name: string; canonical_key: string | null }

		return {
			success: true,
			product: {
				id: updated.id,
				product_name: updated.product_name,
				brand_name: updated.brand_name,
				category: finalCategory ?? undefined,
			},
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to update product:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to update product.' })
	}
})
