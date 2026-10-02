import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../../lib/prisma'
import { requireAdminAuth } from '../../../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const idParam = getRouterParam(event, 'id')
	const flaggedScanId = idParam ? Number(idParam) : NaN

	if (!idParam || Number.isNaN(flaggedScanId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid flagged scan id is required.' })
	}

	const body = (await readBody(event).catch(() => null)) as { admin_correction?: string; halal_logo_id?: number } | null

	try {
		const flaggedScan = await prisma.flaggedScan.findUnique({
			where: { id: flaggedScanId },
			include: { scan: { select: { product_id: true } } },
		})

		if (!flaggedScan) {
			throw createError({ statusCode: 404, statusMessage: 'Flagged scan not found.' })
		}

		if (body?.halal_logo_id && flaggedScan.scan?.product_id) {
			const productId = flaggedScan.scan.product_id
			const halalLogoId = body.halal_logo_id

			// Keep the legacy scalar FK for backward compatibility…
			await prisma.product.update({
				where: { id: productId },
				data: { halal_logo_id: halalLogoId },
			})

			// …and record it in the ProductHalalLogo join table, which is the
			// source of truth the user-facing pantry/scan views read certifier
			// names from. Upsert on the @@unique([product_id, halal_logo_id]);
			// clear any soft-delete so a re-approval re-activates the link.
			await prisma.productHalalLogo.upsert({
				where: { product_id_halal_logo_id: { product_id: productId, halal_logo_id: halalLogoId } },
				update: { deleted_at: null },
				create: { product_id: productId, halal_logo_id: halalLogoId },
			})
		}

		const updated = await prisma.flaggedScan.update({
			where: { id: flaggedScanId },
			data: {
				status: 'approved',
				admin_correction: body?.admin_correction ?? '',
				admin_id: admin.id,
			},
		})

		return { success: true, flagged_scan: { id: updated.id, status: updated.status } }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to approve flagged scan:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to approve flagged scan.' })
	}
})
