import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { OLLAMA_ENDPOINT, GENERATION_MODEL } from '../../lib/ollama-models'
import { findMatchedUserAllergens, matchUserAllergensSemantically, mergeMatchedAllergens } from '../../lib/allergen-matching'
import { matchIngredientsToPantry, findNonHalalKeywords, type RawIngredient } from '../../lib/recipe-matching'
import { stripCodeFences } from '../../lib/ai-json'

interface MakeRecipeBody {
	recipe_id?: number
}

interface OllamaChatResponse {
	message: { content: string }
}

interface AdaptedRecipe {
	adapted_instructions: string
	adjusted_ingredients: { name: string; amount_text: string }[]
	notes: string
}

function coerceRawIngredients(value: unknown): RawIngredient[] {
	if (!Array.isArray(value)) return []
	return value
		.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
		.map((item) => ({
			name: typeof item.name === 'string' ? item.name : '',
			quantity: typeof item.quantity === 'number' ? item.quantity : null,
			unit: typeof item.unit === 'string' ? item.unit : null,
		}))
		.filter((i) => i.name.trim().length > 0)
}

// One deepseek-v4-flash:cloud call — adapts the base (Kaggle) recipe to what
// the user actually has: scales/keeps the original quantities, calls out
// missing ingredients with a reasonable substitution where one exists, and
// leaves it out where it doesn't rather than inventing one. Falls back to
// the unadapted base recipe if the call fails, so "Make Recipe" degrades to
// "here's the original recipe" instead of a hard error.
async function generateAdaptedRecipe(
	recipeName: string,
	baseInstructions: string,
	ingredients: RawIngredient[],
	missingIngredientNames: string[],
	baseServings: number | null,
): Promise<AdaptedRecipe> {
	const prompt = [
		'You are a cooking assistant adapting a base recipe to what a home cook actually has available.',
		`Recipe name: ${recipeName}`,
		`Base servings: ${baseServings ?? 'unspecified'}`,
		`Base ingredients: ${JSON.stringify(ingredients)}`,
		`Base instructions: ${baseInstructions}`,
		`Ingredients the cook does NOT have on hand: ${JSON.stringify(missingIngredientNames)}`,
		'Adapt the recipe: for each missing ingredient, suggest a reasonable, commonly-available substitution if one genuinely exists for this dish; if no reasonable substitution exists, say so plainly rather than inventing one — do not silently drop it or pretend it is optional if it is structurally important to the dish.',
		'Keep the ingredient quantities/units close to the original unless a substitution reasonably requires adjusting them.',
		'Respond with ONLY a JSON object, no prose, no markdown code fences, in exactly this shape:',
		'{"adapted_instructions": string, "adjusted_ingredients": [{"name": string, "amount_text": string}], "notes": string}',
		'"adapted_instructions" should be complete, clear, numbered step-by-step instructions.',
		'"amount_text" should be a human-readable quantity+unit string (e.g. "2 cups", "1 tbsp", "to taste").',
		'"notes" should briefly call out any substitutions made or ingredients that could not reasonably be substituted — empty string if none.',
	].join('\n')

	try {
		const response = await $fetch<OllamaChatResponse>(OLLAMA_ENDPOINT, {
			method: 'POST',
			body: {
				model: GENERATION_MODEL,
				stream: false,
				format: 'json',
				messages: [{ role: 'user', content: prompt }],
			},
		})

		const rawContent = response?.message?.content
		if (!rawContent) throw new Error('Empty response from generation model')

		const parsed = JSON.parse(stripCodeFences(rawContent)) as Partial<AdaptedRecipe>
		if (typeof parsed.adapted_instructions !== 'string' || !Array.isArray(parsed.adjusted_ingredients)) {
			throw new Error('Malformed generation response')
		}

		return {
			adapted_instructions: parsed.adapted_instructions,
			adjusted_ingredients: parsed.adjusted_ingredients
				.filter((i): i is { name: string; amount_text: string } => typeof i?.name === 'string' && typeof i?.amount_text === 'string')
				.map((i) => ({ name: i.name, amount_text: i.amount_text })),
			notes: typeof parsed.notes === 'string' ? parsed.notes : '',
		}
	} catch (err) {
		console.error('Recipe adaptation call failed — falling back to the unadapted base recipe:', err)
		return {
			adapted_instructions: baseInstructions,
			adjusted_ingredients: ingredients.map((i) => ({
				name: i.name,
				amount_text: [i.quantity ?? '', i.unit ?? ''].filter(Boolean).join(' ').trim() || 'as needed',
			})),
			notes: 'Could not generate an adapted version — showing the original recipe.',
		}
	}
}

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const body = (await readBody(event).catch(() => null)) as MakeRecipeBody | null
	const recipeId = body?.recipe_id

	if (!recipeId || typeof recipeId !== 'number') {
		throw createError({ statusCode: 400, statusMessage: 'A valid recipe_id is required.' })
	}

	try {
		const recipe = await prisma.recipe.findUnique({
			where: { id: recipeId },
			select: { id: true, name: true, instructions: true, raw_ingredients: true, portions_guide: true },
		})

		if (!recipe) {
			throw createError({ statusCode: 404, statusMessage: 'Recipe not found.' })
		}

		const ingredients = coerceRawIngredients(recipe.raw_ingredients)
		const combinedText = ingredients.map((i) => i.name).join(', ')

		const [pantryItems, userWithProfile] = await Promise.all([
			prisma.pantryItem.findMany({
				where: { user_id: authUser.id, is_archived: false },
				select: { id: true, product: { select: { product_name: true } } },
			}),
			prisma.user.findUnique({
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
					dietary_prof: { select: { halal_pref: true }, orderBy: { updated_at: 'desc' }, take: 1 },
				},
			}),
		])

		// Re-verify safety here rather than trusting that /api/recipes/suggest
		// already filtered this recipe out — the recipe DB, the user's
		// allergen profile, or their Halal preference could all have changed
		// since the suggestion list was last loaded. Same "deterministic always
		// runs, semantic is additive" pattern as scan/index.post.ts: a failed
		// semantic call degrades to deterministic-only, never to no check.
		const userAllergens = userWithProfile?.allergens ?? []
		const stringMatches = findMatchedUserAllergens(combinedText, userAllergens)
		const semanticMatches = await matchUserAllergensSemantically(combinedText, userAllergens)
		const matchedAllergens = mergeMatchedAllergens(stringMatches, semanticMatches)

		if (matchedAllergens.length > 0) {
			throw createError({
				statusCode: 409,
				statusMessage: `This recipe contains an ingredient matching your allergen(s): ${matchedAllergens.map((a) => a.name).join(', ')}. It won't be made for safety reasons.`,
			})
		}

		const halalPref = userWithProfile?.dietary_prof?.[0]?.halal_pref ?? false
		if (halalPref) {
			const nonHalalHits = findNonHalalKeywords(combinedText)
			if (nonHalalHits.length > 0) {
				throw createError({
					statusCode: 409,
					statusMessage: `This recipe contains non-Halal ingredient(s) (${nonHalalHits.join(', ')}) and won't be made per your Halal preference.`,
				})
			}
		}

		const pantryProducts = pantryItems.map((p) => ({ id: p.id, product_name: p.product.product_name }))
		const { matchedPantryItemIds, missingIngredientNames } = matchIngredientsToPantry(ingredients, pantryProducts)

		const baseServings =
			recipe.portions_guide && typeof recipe.portions_guide === 'object' && 'base_servings' in (recipe.portions_guide as object)
				? ((recipe.portions_guide as { base_servings: number | null }).base_servings ?? null)
				: null

		const adapted = await generateAdaptedRecipe(recipe.name, recipe.instructions, ingredients, missingIngredientNames, baseServings)

		let archivedCount = 0
		if (matchedPantryItemIds.length > 0) {
			const result = await prisma.pantryItem.updateMany({
				where: { id: { in: matchedPantryItemIds } },
				data: { is_archived: true },
			})
			archivedCount = result.count
		}

		// "Made" is set automatically here, on a successful adaptation, rather
		// than via a separate explicit user action — reaching this point means
		// the recipe passed the allergen/Halal safety checks above and the
		// adaptation call (or its fallback) completed. Upsert rather than
		// update since this may be the user's first interaction with this
		// recipe (no row yet). `liked` is left untouched if a row already
		// exists — this endpoint should never flip a like the user set
		// separately via /api/recipes/[id]/like.
		const interaction = await prisma.recipeInteraction.upsert({
			where: { user_id_recipe_id: { user_id: authUser.id, recipe_id: recipe.id } },
			create: { user_id: authUser.id, recipe_id: recipe.id, made_at: new Date() },
			update: { made_at: new Date() },
			select: { liked: true },
		})

		return {
			success: true,
			recipe: {
				id: recipe.id,
				name: recipe.name,
				adapted_instructions: adapted.adapted_instructions,
				adjusted_ingredients: adapted.adjusted_ingredients,
				notes: adapted.notes,
			},
			archived_count: archivedCount,
			liked: interaction.liked,
			made: true,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error("Failed to process 'make recipe':", err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to make recipe.' })
	}
})
