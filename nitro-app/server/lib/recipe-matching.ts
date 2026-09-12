export interface RawIngredient {
	name: string
	quantity: number | null
	unit: string | null
}

export interface PantryProductRef {
	id: number
	product_name: string
}

export interface IngredientMatchResult {
	matchedPantryItemIds: number[]
	matchedIngredientNames: string[]
	missingIngredientNames: string[]
}

export interface PantryProductRefWithQuantity extends PantryProductRef {
	quantity: number
	portion_unit: string
}

export interface IngredientPantryDeduction {
	pantryItemId: number
	ingredientName: string
	neededQuantity: number | null
	neededUnit: string | null
}

export interface IngredientPantryDeductionResult {
	deductions: IngredientPantryDeduction[]
	missingIngredientNames: string[]
}

// Same matching heuristic as matchIngredientsToPantry below, but keeps each
// ingredient's quantity/unit against the specific pantry item it matched,
// instead of collapsing everything down to a Set of ids. Needed for actually
// deducting an amount on "Make Recipe" rather than just archiving whichever
// pantry items got touched.
export function matchIngredientsToPantryForDeduction(
	ingredients: RawIngredient[],
	pantryItems: PantryProductRefWithQuantity[],
): IngredientPantryDeductionResult {
	const deductions: IngredientPantryDeduction[] = []
	const missingIngredientNames: string[] = []

	for (const ingredient of ingredients) {
		const target = ingredient.name.trim().toLowerCase()
		if (!target) continue

		const hit = pantryItems.find((item) => {
			const productName = item.product_name.trim().toLowerCase()
			return productName.includes(target) || target.includes(productName)
		})

		if (hit) {
			deductions.push({
				pantryItemId: hit.id,
				ingredientName: ingredient.name,
				neededQuantity: ingredient.quantity,
				neededUnit: ingredient.unit,
			})
		} else {
			missingIngredientNames.push(ingredient.name)
		}
	}

	return { deductions, missingIngredientNames }
}

// Kept for suggest.get.ts, which only ever needed "which pantry items got
// touched" — rebuilt on top of the quantity-aware matcher above instead of
// duplicating the same matching heuristic a second time.
export function matchIngredientsToPantry(ingredients: RawIngredient[], pantryItems: PantryProductRef[]): IngredientMatchResult {
	const { deductions, missingIngredientNames } = matchIngredientsToPantryForDeduction(
		ingredients,
		pantryItems.map((item) => ({ ...item, quantity: 0, portion_unit: '' })),
	)

	return {
		matchedPantryItemIds: Array.from(new Set(deductions.map((d) => d.pantryItemId))),
		matchedIngredientNames: deductions.map((d) => d.ingredientName),
		missingIngredientNames,
	}
}

export const NON_HALAL_KEYWORDS = [
	'pork',
	'bacon',
	'ham',
	'lard',
	'prosciutto',
	'pepperoni',
	'chorizo',
	'wine',
	'beer',
	'alcohol',
	'rum',
	'brandy',
	'vodka',
	'whiskey',
	'whisky',
	'sake',
	'mirin',
	'cooking sherry',
]

export function findNonHalalKeywords(text: string): string[] {
	const normalized = text.toLowerCase()
	return NON_HALAL_KEYWORDS.filter((keyword) => normalized.includes(keyword))
}

export const STOPWORDS = new Set([
	'the',
	'and',
	'with',
	'for',
	'of',
	'in',
	'fresh',
	'original',
	'classic',
	'new',
	'pack',
	'bottle',
	'can',
	'box',
	'net',
	'wt',
	'ml',
	'kg',
	'ltr',
	'pcs',
	'pc',
	'ea',
])

export function extractPantryKeywords(productNames: string[], maxKeywords = 60): string[] {
	const words = new Set<string>()

	for (const name of productNames) {
		const tokens = name
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.split(/\s+/)
			.filter(Boolean)

		for (const token of tokens) {
			if (token.length < 3) continue
			if (/^\d+$/.test(token)) continue
			if (STOPWORDS.has(token)) continue
			words.add(token)
		}
	}

	return Array.from(words).slice(0, maxKeywords)
}

export function findMatchingIngredientLine(productName: string, ingredients: RawIngredient[]): RawIngredient | null {
	const target = productName.trim().toLowerCase()
	if (!target) return null

	return (
		ingredients.find((ing) => {
			const name = ing.name.trim().toLowerCase()
			if (!name) return false
			return name.includes(target) || target.includes(name)
		}) ?? null
	)
}
