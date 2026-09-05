import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	try {
		const [totalScans, pendingFlags, resolvedFlags] = await Promise.all([
			prisma.scan.count(),
			prisma.flaggedScan.count({ where: { status: 'pending' } }),
			prisma.flaggedScan.count({ where: { status: { in: ['approved', 'dismissed'] } } }),
		])

		const totalFlags = pendingFlags + resolvedFlags
		// Defaults to 100% when there's nothing to resolve yet, rather than
		// dividing by zero or showing a misleading 0%.
		const resolutionRate = totalFlags > 0 ? Math.round((resolvedFlags / totalFlags) * 100) : 100

		return {
			success: true,
			stats: {
				total_scans: totalScans,
				pending_flags: pendingFlags,
				resolution_rate: resolutionRate,
			},
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch admin dashboard stats:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch dashboard stats.' })
	}
})
