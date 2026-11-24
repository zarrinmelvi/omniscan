import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'
import { logAuditEvent } from '../../../lib/audit-logger'

const LOCKED_CATEGORY = 'Uncategorized'

/**
 * PUT /api/admin/categories/:name
 *
 * Renames a category. Updates every PantryItem row (non-deleted) that has the
 * old category name to the new name. Per spec: "its products and consumer
 * pantries keep their category under the new name."
 *
 * :name  – URL-encoded current category name
 * Body:  { new_name: string }
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const rawName = getRouterParam(event, 'name')
	const oldName = rawName ? decodeURIComponent(rawName).trim() : ''
	if (!oldName) {
		throw createError({ statusCode: 400, statusMessage: 'Category name is required.' })
	}

	if (oldName.toLowerCase() === LOCKED_CATEGORY.toLowerCase()) {
		throw createError({ statusCode: 403, statusMessage: '"Uncategorized" is locked and cannot be renamed.' })
	}

	const body = (await readBody(event).catch(() => null)) as { new_name?: unknown } | null
	if (!body?.new_name || typeof body.new_name !== 'string' || !body.new_name.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'new_name is required.' })
	}

	const newName = body.new_name.trim()

	if (newName.toLowerCase() === oldName.toLowerCase()) {
		throw createError({ statusCode: 400, statusMessage: 'New name is the same as the current name.' })
	}

	if (newName.toLowerCase() === LOCKED_CATEGORY.toLowerCase()) {
		throw createError({ statusCode: 409, statusMessage: '"Uncategorized" is a reserved name.' })
	}

	// Check the new name isn't already taken
	const conflict = await prisma.pantryItem.findFirst({
		where: { category: { equals: newName, mode: 'insensitive' }, deleted_at: null },
		select: { id: true },
	})
	if (conflict) {
		throw createError({ statusCode: 409, statusMessage: `Category "${newName}" already exists.` })
	}

	const result = await prisma.pantryItem.updateMany({
		where: { category: { equals: oldName, mode: 'insensitive' }, deleted_at: null },
		data: { category: newName },
	})

	await logAuditEvent({
		event_type: 'UPDATE',
		entity: 'PantryCategory',
		triggered_by_admin_id: admin.id,
		summary: `Admin ${admin.username} renamed category "${oldName}" to "${newName}" (${result.count} item(s) updated)`,
	})

	return {
		success: true,
		old_name: oldName,
		new_name: newName,
		items_updated: result.count,
	}
})
