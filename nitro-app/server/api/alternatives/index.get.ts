import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { determineDisallowedCatalogIngredients } from '../../lib/alternative-reasoning'
import { findAlternativeProducts } from '../../lib/alternative-matching'

// GET /api/alternatives
//
// Returns CatalogProduct rows that are safe for the current user, given
// their real allergens/halal_pref/custom_preferences — NOT yet scoped to
// "alternatives for this specific scanned item" (that needs the
// Product<->CatalogProduct linking decision, still open — see the v17
// handoff report §5 item 5). This is the general "what's safe for me"
// list, useful on its own and the foundation the per-item version will
// build on once that linking exists.
export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	try {
		const userWithProfile = await prisma.user.findUnique({
			where: { id: authUser.id },
			select: {
				allergens: {
					select: {
						id: true,
						name: true,
						scientific_name: true,
						ingredient_mapping: { select: { scientific_term: true, simplified_term: true } },
					},
				},
				dietary_prof: { select: { halal_pref: true, custom_preferences: true }, orderBy: { updated_at: 'desc' }, take: 1 },
			},
		})

		const profile = {
			allergens: userWithProfile?.allergens ?? [],
			halalPref: userWithProfile?.dietary_prof?.[0]?.halal_pref ?? false,
			customPreferences: userWithProfile?.dietary_prof?.[0]?.custom_preferences ?? [],
		}

		const { disallowedIngredientNames, details } = await determineDisallowedCatalogIngredients(profile)
		const alternatives = await findAlternativeProducts(disallowedIngredientNames)

		return {
			success: true,
			alternatives,
			// Surfaced for transparency/debugging — not required by the
			// frontend, but useful while this feature is still being verified.
			disallowed_ingredients: details,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to compute alternatives:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to compute alternatives.' })
	}
})
