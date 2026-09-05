import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const statusFilter = typeof query.status === 'string' ? query.status : undefined

	try {
		const flaggedScans = await prisma.flaggedScan.findMany({
			where: statusFilter ? { status: statusFilter } : undefined,
			orderBy: { created_at: 'desc' },
			select: {
				id: true,
				flag_reason: true,
				status: true,
				admin_correction: true,
				created_at: true,
				scan: {
					select: {
						id: true,
						safety_verdict: true,
						product: { select: { id: true, product_name: true, brand_name: true } },
						user: { select: { id: true, name: true, email: true } },
					},
				},
			},
		})

		return {
			success: true,
			flagged_scans: flaggedScans.map((f) => ({
				id: f.id,
				flag_reason: f.flag_reason,
				status: f.status,
				admin_correction: f.admin_correction,
				created_at: f.created_at,
				product_name: f.scan?.product?.product_name ?? 'Unknown product',
				brand_name: f.scan?.product?.brand_name ?? '',
				safety_verdict: f.scan?.safety_verdict ?? null,
				scanned_by: f.scan?.user?.name ?? f.scan?.user?.email ?? 'Unknown user',
			})),
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch flagged scans:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch flagged scans.' })
	}
})
