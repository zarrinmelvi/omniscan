import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	const requestingAdmin = requireAdminAuth(event)

	const query = getQuery(event)
	const targetId = Number(query.id)

	if (!query.id || isNaN(targetId) || targetId < 1) {
		throw createError({ statusCode: 400, statusMessage: 'A valid admin id is required.' })
	}

	// Prevent an admin from deleting their own account
	if (requestingAdmin.id === targetId) {
		throw createError({ statusCode: 403, statusMessage: 'You cannot delete your own admin account.' })
	}

	const admin = await prisma.admin.findUnique({ where: { id: targetId } })
	if (!admin) {
		throw createError({ statusCode: 404, statusMessage: 'Admin not found.' })
	}

	await prisma.admin.delete({ where: { id: targetId } })
	return { success: true }
})
