import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'
import { logAuditEvent } from '../../../lib/audit-logger'

const LOCKED_CATEGORY = 'Uncategorized'

/**
 * DELETE /api/admin/categories/:name
 *
 * Deletes a category by reassigning all PantryItem rows that use it to
 * "Uncategorized". Per spec: "its products will move to Uncategorized while
 * consumer pantries keep their items."
 *
 * :name – URL-encoded category name to delete
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const rawName = getRouterParam(event, 'name')
	const name = rawName ? decodeURIComponent(rawName).trim() : ''
	if (!name) {
		throw createError({ statusCode: 400, statusMessage: 'Category name is required.' })
	}

	if (name.toLowerCase() === LOCKED_CATEGORY.toLowerCase()) {
		throw createError({ statusCode: 403, statusMessage: '"Uncategorized" is locked and cannot be deleted.' })
	}

	const result = await prisma.pantryItem.updateMany({
		where: { category: { equals: name, mode: 'insensitive' }, deleted_at: null },
		data: { category: LOCKED_CATEGORY },
	})

	await logAuditEvent({
		event_type: 'DELETE',
		entity: 'PantryCategory',
		triggered_by_admin_id: admin.id,
		summary: `Admin ${admin.username} deleted category "${name}" — ${result.count} item(s) moved to Uncategorized`,
	})

	return {
		success: true,
		deleted_name: name,
		items_reassigned: result.count,
	}
})
