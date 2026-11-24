import { defineEventHandler, createError, readBody } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'
import { logAuditEvent } from '../../../lib/audit-logger'

const LOCKED_CATEGORY = 'Uncategorized'

/**
 * POST /api/admin/categories
 *
 * Registers a new category name. Because categories are plain string fields on
 * PantryItem (not a separate table), "adding" a category just validates the
 * name and returns it — the category becomes usable immediately in scan,
 * upload, and Edit in pantry detail.
 *
 * Body: { name: string }
 * Returns: { success: true, category: { name, product_count: 0 } }
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as { name?: unknown } | null
	if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Category name is required.' })
	}

	const name = body.name.trim()

	if (name.toLowerCase() === LOCKED_CATEGORY.toLowerCase()) {
		throw createError({ statusCode: 409, statusMessage: '"Uncategorized" is the default category and cannot be re-added.' })
	}

	// Check if the name already exists among current pantry items
	const existing = await prisma.pantryItem.findFirst({
		where: { category: { equals: name, mode: 'insensitive' }, deleted_at: null },
		select: { id: true },
	})
	if (existing) {
		throw createError({ statusCode: 409, statusMessage: `Category "${name}" already exists.` })
	}

	await logAuditEvent({
		event_type: 'CREATE',
		entity: 'PantryCategory',
		triggered_by_admin_id: admin.id,
		summary: `Admin ${admin.username} added category "${name}"`,
	})

	return {
		success: true,
		category: { name, product_count: 0 },
	}
})
