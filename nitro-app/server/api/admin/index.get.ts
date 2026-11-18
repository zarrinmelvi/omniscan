import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const take = Math.min(Number(query?.take) || 20, 100)
	const skip = Math.max(Number(query?.skip) || 0, 0)

	const [admin, adminCount] = await Promise.all([
		prisma.admin.findMany({
			take,
			skip,
			select: { id: true, full_name: true, email: true, created_at: true },
		}),
		prisma.admin.count(),
	])

	return { admin, adminCount }
})
