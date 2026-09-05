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

	const body = (await readBody(event).catch(() => null)) as { admin_correction?: string } | null

	try {
		const updated = await prisma.flaggedScan.update({
			where: { id: flaggedScanId },
			data: {
				status: 'dismissed',
				admin_correction: body?.admin_correction ?? '',
				admin_id: admin.id,
			},
		})

		return { success: true, flagged_scan: { id: updated.id, status: updated.status } }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to dismiss flagged scan:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to dismiss flagged scan.' })
	}
})
