import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { logAuditEvent } from '../../lib/audit-logger'

/**
 * POST /api/allergen
 *
 * Creates a new allergen. Accepts an optional `mappings` array so that when
 * the admin picks a suggestion from the dataset type-ahead in Add Allergen,
 * the auto-filled aliases are persisted as IngredientMapping rows in the same
 * request — no second call needed.
 *
 * Body:
 *   name           string   required
 *   scientific_name string  optional
 *   is_predefined  boolean  optional (default false)
 *   mappings       Array<{ scientific_term: string; simplified_term?: string }>
 *                           optional — alias terms to create as IngredientMapping
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| {
				name?: string
				scientific_name?: string
				is_predefined?: boolean
				mappings?: Array<{ scientific_term: string; simplified_term?: string }>
		  }
		| null

	if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Allergen name is required.' })
	}

	const name = body.name.trim()
	const scientificName = typeof body.scientific_name === 'string' ? body.scientific_name.trim() : ''
	const isPredefined = body.is_predefined ?? false

	// Validate mappings if provided
	const rawMappings = Array.isArray(body.mappings) ? body.mappings : []
	const mappings = rawMappings
		.filter((m) => m && typeof m.scientific_term === 'string' && m.scientific_term.trim())
		.map((m) => ({
			scientific_term: m.scientific_term.trim(),
			simplified_term: typeof m.simplified_term === 'string' ? m.simplified_term.trim() : name,
		}))

	try {
		const allergen = await prisma.allergen.create({
			data: {
				name,
				scientific_name: scientificName,
				is_predefined: isPredefined,
				// Create all mapping rows inline if the caller provided them
				...(mappings.length > 0
					? {
							ingredient_mapping: {
								create: mappings.map((m) => ({
									scientific_term: m.scientific_term,
									simplified_term: m.simplified_term,
								})),
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

		await logAuditEvent({
			event_type: 'CREATE',
			entity: 'Allergen',
			entity_id: allergen.id,
			triggered_by_admin_id: admin.id,
			summary: `Admin ${admin.username} added allergen "${name}"${mappings.length > 0 ? ` with ${mappings.length} mapping(s)` : ''}`,
		})

		return { success: true, allergen }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'An allergen with that name already exists.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to create allergen.' })
	}
})
