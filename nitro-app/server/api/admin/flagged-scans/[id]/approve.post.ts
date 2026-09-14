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
			await prisma.product.update({
				where: { id: flaggedScan.scan.product_id },
				data: { halal_logo_id: body.halal_logo_id },
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
