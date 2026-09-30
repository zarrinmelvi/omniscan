import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

/**
 * PUT /api/allergen/mappings
 * Body: { allergen_id: number, aliases: string[] }
 *
 * Reconciles the IngredientMapping rows for one allergen to exactly match the
 * provided alias list:
 *   - terms present in the list but not in the DB   -> created
 *   - terms in the DB for this allergen but not in the list -> deleted
 *   - terms already owned by a different allergen   -> skipped (returned)
 *
 * scientific_term is the globally-unique key; simplified_term defaults to the
 * same value unless the term already exists (then its simplified_term is kept).
 */
export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { allergen_id?: number; aliases?: unknown }
		| null

	const allergenId = Number(body?.allergen_id)
	if (!allergenId || Number.isNaN(allergenId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid allergen_id is required.' })
	}

	// Normalise the incoming alias list: trim, drop empties, de-duplicate
	// case-insensitively while preserving the first-seen original casing.
	const rawList = Array.isArray(body?.aliases) ? (body!.aliases as unknown[]) : []
	const seen = new Set<string>()
	const desired: string[] = []
	for (const item of rawList) {
		if (typeof item !== 'string') continue
		const term = item.trim()
		if (!term) continue
		const key = term.toLowerCase()
		if (seen.has(key)) continue
		seen.add(key)
		desired.push(term)
	}

	try {
		const allergen = await prisma.allergen.findUnique({ where: { id: allergenId } })
		if (!allergen) {
			throw createError({ statusCode: 404, statusMessage: 'Allergen not found.' })
		}

		const result = await prisma.$transaction(async (tx) => {
			// Current mappings owned by THIS allergen.
			const existing = await tx.ingredientMapping.findMany({
				where: { allergen_id: allergenId },
				select: { id: true, scientific_term: true },
			})
			const existingByKey = new Map(existing.map((m) => [m.scientific_term.toLowerCase(), m]))
			const desiredKeys = new Set(desired.map((t) => t.toLowerCase()))

			// Delete removed terms.
			const toDeleteIds = existing.filter((m) => !desiredKeys.has(m.scientific_term.toLowerCase())).map((m) => m.id)
			if (toDeleteIds.length) {
				await tx.ingredientMapping.deleteMany({ where: { id: { in: toDeleteIds } } })
			}

			// Create new terms — but skip any scientific_term already used anywhere
			// (unique constraint is global), reporting them back to the caller.
			const created: string[] = []
			const skipped: string[] = []
			for (const term of desired) {
				const key = term.toLowerCase()
				if (existingByKey.has(key)) continue // already linked to this allergen

				const clash = await tx.ingredientMapping.findUnique({ where: { scientific_term: term } })
				if (clash) {
					// Owned by a different allergen (or differing case) — don't hijack it.
					if (clash.allergen_id !== allergenId) skipped.push(term)
					continue
				}

				await tx.ingredientMapping.create({
					data: { scientific_term: term, simplified_term: term, allergen_id: allergenId },
				})
				created.push(term)
			}

			const finalMappings = await tx.ingredientMapping.findMany({
				where: { allergen_id: allergenId },
				orderBy: { id: 'asc' },
				select: { id: true, scientific_term: true, simplified_term: true },
			})

			return { created, skipped, deleted: toDeleteIds.length, mappings: finalMappings }
		})

		return { success: true, allergen_id: allergenId, ...result }
	} catch (err: any) {
		if (err?.statusCode) throw err
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to sync allergen mappings.' })
	}
})
