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

// Loose, substring-both-ways matching between a recipe's generic ingredient
// names ("milk", "soy sauce") and the user's real pantry — which holds
// branded product names ("Magnolia Fresh Milk 1L", "Silver Swan Soy Sauce").
// Exact matching would basically never fire against real branded products,
// so this deliberately checks whether either string contains the other —
// same pattern already used for Halal logo matching in scan/index.post.ts.
// It's a heuristic, not a guarantee: a documented limitation, not a silent one.
export function matchIngredientsToPantry(ingredients: RawIngredient[], pantryItems: PantryProductRef[]): IngredientMatchResult {
	const matchedPantryItemIds = new Set<number>()
	const matchedIngredientNames: string[] = []
	const missingIngredientNames: string[] = []

	for (const ingredient of ingredients) {
		const target = ingredient.name.trim().toLowerCase()
		if (!target) continue

		const hit = pantryItems.find((item) => {
			const productName = item.product_name.trim().toLowerCase()
			return productName.includes(target) || target.includes(productName)
		})

		if (hit) {
			matchedPantryItemIds.add(hit.id)
			matchedIngredientNames.push(ingredient.name)
		} else {
			missingIngredientNames.push(ingredient.name)
		}
	}

	return {
		matchedPantryItemIds: Array.from(matchedPantryItemIds),
		matchedIngredientNames,
		missingIngredientNames,
	}
}

// Keyword-based Halal screen for recipe ingredients — deliberately simple,
// not a fiqh-level analysis. Flags unambiguous cases (pork products,
// alcohol) and deliberately leaves genuinely ambiguous ingredients (e.g.
// gelatin, which can be Halal-certified depending on source) unflagged
// rather than guessing at something that varies by sourcing.
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
