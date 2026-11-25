import { defineEventHandler, createError, readBody } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

type Action = 'add' | 'rename' | 'delete'

interface AddBody    { action: 'add';    name: string }
interface RenameBody { action: 'rename'; id: number; old_name: string; new_name: string }
interface DeleteBody { action: 'delete'; id: number; name: string }
type Body = AddBody | RenameBody | DeleteBody

/**
 * POST /api/admin/categories
 *
 * Unified mutation endpoint for the Manage Categories modal.
 * All three operations are wrapped in a Prisma transaction.
 *
 * Actions:
 *   add    – create a new unlocked ProductCategory row.
 *   rename – update the category name AND bulk-update all matching PantryItem rows.
 *   delete – bulk-update affected PantryItem rows to 'Uncategorized', then delete the row.
 *
 * Server-side guards (duplicating the client-side checks for safety):
 *   • Name must not be blank or exceed 50 characters.
 *   • Name must not duplicate an existing category (case-insensitive).
 *   • Locked categories cannot be renamed or deleted.
 */
export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event)) as Body
	if (!body || typeof body.action !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Missing action.' })
	}

	const action = body.action as Action

	try {
		if (action === 'add') {
			const name = typeof body.name === 'string' ? body.name.trim() : ''
			if (!name) throw createError({ statusCode: 400, statusMessage: 'Category name is required.' })
			if (name.length > 50) throw createError({ statusCode: 400, statusMessage: 'Category name must be 50 characters or fewer.' })

			// Case-insensitive duplicate check
			const existing = await prisma.productCategory.findFirst({
				where: { name: { equals: name, mode: 'insensitive' } },
			})
			if (existing) throw createError({ statusCode: 409, statusMessage: `Category "${existing.name}" already exists.` })

			const created = await prisma.productCategory.create({
				data: { name, is_locked: false },
			})

			return { success: true, action: 'add', category: { id: created.id, name: created.name, is_locked: created.is_locked } }
		}

		if (action === 'rename') {
			const { id, old_name, new_name } = body as RenameBody
			const newNameTrimmed = typeof new_name === 'string' ? new_name.trim() : ''

			if (!newNameTrimmed) throw createError({ statusCode: 400, statusMessage: 'New category name is required.' })
			if (newNameTrimmed.length > 50) throw createError({ statusCode: 400, statusMessage: 'Category name must be 50 characters or fewer.' })
			if (newNameTrimmed.toLowerCase() === (old_name ?? '').toLowerCase()) {
				throw createError({ statusCode: 400, statusMessage: 'New name is the same as the current name.' })
			}

			const target = await prisma.productCategory.findUnique({ where: { id } })
			if (!target) throw createError({ statusCode: 404, statusMessage: 'Category not found.' })
			if (target.is_locked) throw createError({ statusCode: 403, statusMessage: 'This category is locked and cannot be renamed.' })

			// Case-insensitive duplicate check (exclude the row being renamed)
			const conflict = await prisma.productCategory.findFirst({
				where: { name: { equals: newNameTrimmed, mode: 'insensitive' }, NOT: { id } },
			})
			if (conflict) throw createError({ statusCode: 409, statusMessage: `Category "${conflict.name}" already exists.` })

			await prisma.$transaction([
				// 1. Update the category name
				prisma.productCategory.update({ where: { id }, data: { name: newNameTrimmed } }),
				// 2. Bulk-update all PantryItem rows that used the old name
				prisma.pantryItem.updateMany({
					where: { category: old_name, deleted_at: null },
					data:  { category: newNameTrimmed },
				}),
			])

			return { success: true, action: 'rename', old_name, new_name: newNameTrimmed }
		}

		if (action === 'delete') {
			const { id, name } = body as DeleteBody

			const target = await prisma.productCategory.findUnique({ where: { id } })
			if (!target) throw createError({ statusCode: 404, statusMessage: 'Category not found.' })
			if (target.is_locked) throw createError({ statusCode: 403, statusMessage: 'This category is locked and cannot be deleted.' })

			await prisma.$transaction([
				// 1. Reassign all PantryItem rows in this category to Uncategorized
				prisma.pantryItem.updateMany({
					where: { category: name, deleted_at: null },
					data:  { category: 'Uncategorized' },
				}),
				// 2. Delete the category row
				prisma.productCategory.delete({ where: { id } }),
			])

			return { success: true, action: 'delete', name }
		}

		throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to mutate category:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to update categories.' })
	}
})
