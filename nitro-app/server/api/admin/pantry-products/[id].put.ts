import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'
import { logAuditEvent } from '../../../lib/audit-logger'

/**
 * PUT /api/admin/pantry-products/:id
 *
 * Edits a product's product_name, brand_name, and/or pantry category.
 * Category is stored on PantryItem rows, not on Product itself — so updating
 * the category here updates ALL active pantry_item rows for this product,
 * which is what "reflects to the users who hold that product" means per spec.
 *
 * Body: { product_name?: string; brand_name?: string; category?: string }
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const rawId = getRouterParam(event, 'id')
	const productId = rawId ? parseInt(rawId, 10) : NaN
	if (isNaN(productId)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid product id.' })
	}

	const body = (await readBody(event).catch(() => null)) as {
		product_name?: unknown
		brand_name?: unknown
		category?: unknown
	} | null

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Request body is required.' })
	}

	const product = await prisma.product.findFirst({
		where: { id: productId, deleted_at: null },
		select: { id: true, product_name: true, brand_name: true },
	})
	if (!product) {
		throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
	}

	const productUpdate: { product_name?: string; brand_name?: string } = {}
	if (typeof body.product_name === 'string' && body.product_name.trim()) {
		productUpdate.product_name = body.product_name.trim()
	}
	if (typeof body.brand_name === 'string' && body.brand_name.trim()) {
		productUpdate.brand_name = body.brand_name.trim()
	}

	const changes: string[] = []

	// Update Product row if name or brand changed
	if (Object.keys(productUpdate).length > 0) {
		if (productUpdate.product_name && productUpdate.product_name !== product.product_name) {
			changes.push(`product_name: "${product.product_name}" → "${productUpdate.product_name}"`)
		}
		if (productUpdate.brand_name && productUpdate.brand_name !== product.brand_name) {
			changes.push(`brand_name: "${product.brand_name}" → "${productUpdate.brand_name}"`)
		}
		await prisma.product.update({
			where: { id: productId },
			data: productUpdate,
		})
	}

	// Update category on all active pantry_item rows for this product
	if (typeof body.category === 'string' && body.category.trim()) {
		const newCategory = body.category.trim()
		const updated = await prisma.pantryItem.updateMany({
			where: { product_id: productId, deleted_at: null },
			data: { category: newCategory },
		})
		if (updated.count > 0) {
			changes.push(`category → "${newCategory}" (${updated.count} pantry item(s))`)
		}
	}

	if (changes.length > 0) {
		await logAuditEvent({
			event_type: 'UPDATE',
			entity: 'Product',
			entity_id: productId,
			triggered_by_admin_id: admin.id,
			summary: `Admin ${admin.username} updated product #${productId}: ${changes.join('; ')}`,
		})
	}

	const updatedProduct = await prisma.product.findUnique({
		where: { id: productId },
		select: { id: true, product_name: true, brand_name: true },
	})

	return { success: true, product: updatedProduct, changes }
})
