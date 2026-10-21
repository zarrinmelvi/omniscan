import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { findMatchedUserAllergens, type UserAllergenRecord } from '../../lib/allergen-matching'

/**
 * Feature E — "Test an ingredient line" box.
 *
 * Given a raw ingredient line, return which predefined allergens the real scan
 * pipeline would flag. Uses ONLY the existing deterministic matcher
 * (findMatchedUserAllergens) over the real allergen + mapping data in the DB —
 * no AI call, no fabricated terms.
 */
export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as { text?: unknown } | null
	const text = body?.text

	if (typeof text !== 'string' || text.trim().length === 0) {
		throw createError({ statusCode: 400, statusMessage: 'A non-empty "text" string is required.' })
	}
	if (text.length > 2000) {
		throw createError({ statusCode: 400, statusMessage: 'Ingredient text must be 2000 characters or fewer.' })
	}

	try {
		const allergens: UserAllergenRecord[] = await prisma.allergen.findMany({
			where: { is_predefined: true },
			select: {
				id: true,
				name: true,
				scientific_name: true,
				ingredient_mapping: { select: { scientific_term: true, simplified_term: true } },
			},
		})

		const matches = findMatchedUserAllergens(text, allergens)
		const normalized = text.toLowerCase()

		// Surface WHICH term triggered each match. The matcher returns no
		// matched_term for substring matches, so recompute it here against the
		// same term list the matcher uses, preserving original casing.
		const flagged = matches.map((m) => {
			const allergen = allergens.find((a) => a.id === m.id)
			let matched_term = m.name
			if (allergen) {
				const terms = [
					allergen.name,
					allergen.scientific_name,
					...allergen.ingredient_mapping.flatMap((mapping) => [mapping.scientific_term, mapping.simplified_term]),
				].filter((t): t is string => Boolean(t))

				const hit = terms.find((t) => normalized.includes(t.toLowerCase()))
				if (hit) matched_term = hit
			}
			return { id: m.id, name: m.name, matched_term }
		})

		// Total known terms across every allergen (name + scientific_name + both
		// terms per mapping).
		const checked_terms_count = allergens.reduce(
			(sum, a) =>
				sum +
				[a.name, a.scientific_name, ...a.ingredient_mapping.flatMap((m) => [m.scientific_term, m.simplified_term])].filter(
					Boolean,
				).length,
			0,
		)

		return { success: true, flagged, checked_terms_count }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Ingredient-test failed:', err)
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to test ingredient line.' })
	}
})
