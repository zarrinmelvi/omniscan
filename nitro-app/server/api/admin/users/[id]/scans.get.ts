import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../../lib/prisma'
import { requireAdminAuth } from '../../../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const idParam = getRouterParam(event, 'id')
	const userId = idParam ? parseInt(idParam, 10) : NaN

	if (isNaN(userId)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid user ID.' })
	}

	try {
		const scans = await prisma.scan.findMany({
			where: { user_id: userId, deleted_at: null },
			orderBy: { scan_time: 'desc' },
			take: 50,
			select: {
				id: true,
				scan_time: true,
				safety_verdict: true,
				flag_reason: true,
				ai_confidence_score: true,
				product: {
					select: {
						id: true,
						product_name: true,
						brand_name: true,
						image_base64: true,
					},
				},
				flagged_scan: {
					select: { id: true, status: true },
					take: 1,
				},
			},
		})

		const mapped = scans.map((s) => ({
			id: s.id,
			scan_time: s.scan_time,
			safety_verdict: s.safety_verdict,
			flag_reason: s.flag_reason,
			ai_confidence_score: s.ai_confidence_score != null
				? (() => {
					const raw = Number(s.ai_confidence_score)
					return Math.round(raw <= 1 ? raw * 100 : raw)
				})()
				: null,
			product_name: s.product?.product_name ?? 'Unknown product',
			brand_name: s.product?.brand_name ?? '',
			image_base64: s.product?.image_base64 ?? null,
			flagged: s.flagged_scan.length > 0,
			flag_status: s.flagged_scan[0]?.status ?? null,
		}))

		return { success: true, scans: mapped }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch user scans:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch user scans.' })
	}
})
