import { defineEventHandler, createError, readBody } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { logAuditEvent } from '../../lib/audit-logger'
import { getFoodByName } from '../../lib/food-dataset'

/**
 * POST /api/allergen/import-dataset
 *
 * One-click import of a food dataset entry into the allergen dictionary.
 * Creates the Allergen row and, if the entry has a botanical name, creates
 * an IngredientMapping linking the botanical name to the allergen.
 *
 * Body:
 *   name           string  required — food name from the dataset
 *   is_predefined  boolean optional (default false)
 *
 * On conflict (allergen already exists): returns 409 with the existing row.
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as {
		name?: unknown
		is_predefined?: unknown
	} | null

	if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'name is required.' })
	}

	const name = body.name.trim()
	const isPredefined = body.is_predefined === true

	// Look up the dataset entry
	const entry = getFoodByName(name)
	if (!entry) {
		throw createError({ statusCode: 404, statusMessage: `"${name}" was not found in the food dataset.` })
	}

	// Check if allergen already exists
	const existing = await prisma.allergen.findFirst({
		where: { name: { equals: name, mode: 'insensitive' } },
		select: { id: true, name: true, scientific_name: true, is_predefined: true },
	})
	if (existing) {
		throw createError({
			statusCode: 409,
			statusMessage: `Allergen "${name}" already exists in the dictionary (ID: ${existing.id}).`,
			data: { existing },
		})
	}

	// Create allergen + mapping in one transaction
	const allergen = await prisma.$transaction(async (tx) => {
		const created = await tx.allergen.create({
			data: {
				name: entry.name,
				scientific_name: entry.botanicalName,
				is_predefined: isPredefined,
				...(entry.botanicalName
					? {
							ingredient_mapping: {
								create: [{
									scientific_term: entry.botanicalName,
									simplified_term: entry.name,
								}],
							},
					  }
					: {}),
			},
			select: {
				id: true,
				name: true,
				scientific_name: true,
				is_predefined: true,
				_count: { select: { ingredient_mapping: true } },
			},
		})
		return created
	})

	await logAuditEvent({
		event_type: 'CREATE',
		entity: 'Allergen',
		entity_id: allergen.id,
		triggered_by_admin_id: admin.id,
		summary: `Admin ${admin.username} imported "${name}" from food dataset (allergyType: ${entry.allergyType || 'none'})`,
		metadata: {
			allergyType: entry.allergyType,
			botanicalName: entry.botanicalName,
			category: entry.category,
		},
	})

	return {
		success: true,
		allergen: {
			id: allergen.id,
			name: allergen.name,
			scientific_name: allergen.scientific_name,
			is_predefined: allergen.is_predefined,
			mapping_count: allergen._count.ingredient_mapping,
			allergyType: entry.allergyType,
			category: entry.category,
		},
	}
})
