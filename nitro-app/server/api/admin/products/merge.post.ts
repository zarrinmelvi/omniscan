import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'
import { logAuditEvent } from '../../../lib/audit-logger'

export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { primary_id?: number; duplicate_id?: number }
		| null

	const primary_id = Number(body?.primary_id)
	const duplicate_id = Number(body?.duplicate_id)

	if (
		!Number.isInteger(primary_id) ||
		primary_id <= 0 ||
		!Number.isInteger(duplicate_id) ||
		duplicate_id <= 0
	) {
		throw createError({ statusCode: 400, statusMessage: 'Valid primary_id and duplicate_id are required.' })
	}

	if (primary_id === duplicate_id) {
		throw createError({ statusCode: 400, statusMessage: 'primary_id and duplicate_id must differ.' })
	}

	try {
		const [primary, duplicate] = await Promise.all([
			prisma.product.findUnique({
				where: { id: primary_id },
				select: { id: true, product_name: true, brand_name: true, deleted_at: true },
			}),
			prisma.product.findUnique({
				where: { id: duplicate_id },
				select: { id: true, product_name: true, brand_name: true, deleted_at: true },
			}),
		])

		if (!primary || primary.deleted_at != null) {
			throw createError({ statusCode: 404, statusMessage: 'Primary product not found.' })
		}
		if (!duplicate || duplicate.deleted_at != null) {
			throw createError({ statusCode: 404, statusMessage: 'Duplicate product not found.' })
		}

		const scans_repointed = await prisma.$transaction(async (tx) => {
			// Repoint simple child relations from duplicate → primary.
			const scanResult = await tx.scan.updateMany({
				where: { product_id: duplicate_id },
				data: { product_id: primary_id },
			})
			await tx.pantryItem.updateMany({
				where: { product_id: duplicate_id },
				data: { product_id: primary_id },
			})
			await tx.notification.updateMany({
				where: { product_id: duplicate_id },
				data: { product_id: primary_id },
			})
			await tx.ingredient.updateMany({
				where: { product_id: duplicate_id },
				data: { product_id: primary_id },
			})

			// Repoint ProductHalalLogo join rows carefully to respect the
			// @@unique([product_id, halal_logo_id]) constraint: if the primary
			// already links the same halal_logo_id, drop the duplicate's row;
			// otherwise move it to the primary.
			const duplicateLogos = await tx.productHalalLogo.findMany({
				where: { product_id: duplicate_id },
				select: { id: true, halal_logo_id: true },
			})
			const primaryLogos = await tx.productHalalLogo.findMany({
				where: { product_id: primary_id },
				select: { halal_logo_id: true },
			})
			const primaryLogoIds = new Set<number>(primaryLogos.map((l) => l.halal_logo_id))

			for (const link of duplicateLogos) {
				if (primaryLogoIds.has(link.halal_logo_id)) {
					await tx.productHalalLogo.delete({ where: { id: link.id } })
				} else {
					await tx.productHalalLogo.update({
						where: { id: link.id },
						data: { product_id: primary_id },
					})
					primaryLogoIds.add(link.halal_logo_id)
				}
			}

			// Mark the duplicate as merged into the primary.
			await tx.product.update({
				where: { id: duplicate_id },
				data: { canonical_product_id: primary_id, deleted_at: new Date() },
			})

			return scanResult.count
		})

		await logAuditEvent({
			event_type: 'UPDATE',
			entity: 'Product',
			entity_id: primary_id,
			triggered_by_admin_id: admin.id,
			summary: `Admin ${admin.username} merged product #${duplicate_id} into #${primary_id}`,
			metadata: { primary_id, duplicate_id },
		})

		return { success: true, primary_id, duplicate_id, scans_repointed }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to merge products:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to merge products.' })
	}
})
