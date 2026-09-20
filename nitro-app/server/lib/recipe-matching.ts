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
	// Same ingredients as the *Names arrays above, but carrying quantity/unit
	// through instead of discarding it — added so consumers that want to
	// actually display a portion (e.g. "½ tbsp lemon juice") don't have to
	// re-derive it. The *Names arrays are kept as-is since matched_count/
	// total_count and existing callers only ever needed the count/names.
	matchedIngredients: RawIngredient[]
	missingIngredients: RawIngredient[]
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

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Basic stemming helper to convert plurals to singular base forms
function stemWord(word: string): string {
	return word
		.trim()
		.toLowerCase()
		.replace(/(s|es|ies)$/i, '')
}

// Packaging/preparation phrases that should not trigger ingredient matches
const PREPARATION_MODIFIERS = [
	/\bin\s+oil\b/gi,
	/\bin\s+water\b/gi,
	/\bin\s+brine\b/gi,
	/\bin\s+sauce\b/gi,
	/\bin\s+sunflower\s+oil\b/gi,
	/\bin\s+olive\s+oil\b/gi,
	/\bwith\s+[\w\s]+\b/gi,
]

function cleanProductName(productName: string): string {
	let cleaned = productName.trim().toLowerCase()
	for (const modifier of PREPARATION_MODIFIERS) {
		cleaned = cleaned.replace(modifier, '')
	}
	return cleaned.replace(/\s+/g, ' ').trim()
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
		const rawTarget = ingredient.name.trim().toLowerCase()
		if (!rawTarget) continue

		// Normalized stemmed version of target (e.g. "eggs" -> "egg")
		const targetStem = rawTarget.split(/\s+/).map(stemWord).join(' ')

		const hit = pantryItems.find((item) => {
			const cleanedProduct = cleanProductName(item.product_name)
			const productStem = cleanedProduct.split(/\s+/).map(stemWord).join(' ')

			// 1. Direct or Stemmed Exact Matches
			if (cleanedProduct === rawTarget || productStem === targetStem) return true

			// 2. Word Boundary Matches (Raw and Stemmed)
			const rawRegex = new RegExp(`\\b${escapeRegExp(rawTarget)}\\b`, 'i')
			const stemRegex = new RegExp(`\\b${escapeRegExp(targetStem)}\\b`, 'i')
			const prodStemRegex = new RegExp(`\\b${escapeRegExp(productStem)}\\b`, 'i')

			return rawRegex.test(cleanedProduct) || stemRegex.test(productStem) || prodStemRegex.test(targetStem)
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

// Recipes sometimes list the same ingredient on more than one line (e.g. one
// line per step that uses it) — "1 small red onion (85g)" appearing twice
// otherwise renders as two identical chips instead of one "2 small red
// onion (85g)" chip. Merges by name+unit and sums quantity; if either side
// of a duplicate has no parseable quantity, keeps whichever one does rather
// than guessing, since summing null with a number isn't meaningful.
function mergeDuplicateIngredients(items: RawIngredient[]): RawIngredient[] {
	const merged = new Map<string, RawIngredient>()

	for (const item of items) {
		const key = `${item.name.trim().toLowerCase()}|${(item.unit ?? '').trim().toLowerCase()}`
		const existing = merged.get(key)

		if (!existing) {
			merged.set(key, { ...item })
			continue
		}

		if (existing.quantity != null && item.quantity != null) {
			existing.quantity += item.quantity
		} else if (existing.quantity == null && item.quantity != null) {
			existing.quantity = item.quantity
		}
	}

	return Array.from(merged.values())
}

// Kept for endpoints like suggest.get.ts, liked.get.ts, and made.get.ts that
// only need item/ingredient lists — rebuilt on top of the quantity-aware matcher
// above instead of duplicating the same matching heuristic a second time.
export function matchIngredientsToPantry(ingredients: RawIngredient[], pantryItems: PantryProductRef[]): IngredientMatchResult {
	const { deductions, missingIngredientNames } = matchIngredientsToPantryForDeduction(
		ingredients,
		pantryItems.map((item) => ({ ...item, quantity: 0, portion_unit: '' })),
	)

	const missingSet = new Set(missingIngredientNames)

	return {
		matchedPantryItemIds: Array.from(new Set(deductions.map((d) => d.pantryItemId))),
		matchedIngredientNames: deductions.map((d) => d.ingredientName),
		missingIngredientNames,
		matchedIngredients: mergeDuplicateIngredients(
			deductions.map((d) => ({ name: d.ingredientName, quantity: d.neededQuantity, unit: d.neededUnit })),
		),
		// Filtered from the original `ingredients` list (not rebuilt from
		// missingIngredientNames) specifically to keep quantity/unit, which
		// the *Names-only list never carried in the first place.
		missingIngredients: mergeDuplicateIngredients(ingredients.filter((i) => missingSet.has(i.name))),
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
	const cleanedProduct = cleanProductName(productName)
	if (!cleanedProduct) return null

	const productStem = cleanedProduct.split(/\s+/).map(stemWord).join(' ')

	return (
		ingredients.find((ing) => {
			const rawName = ing.name.trim().toLowerCase()
			if (!rawName) return false

			const nameStem = rawName.split(/\s+/).map(stemWord).join(' ')

			if (rawName === cleanedProduct || nameStem === productStem) return true

			const prodRegex = new RegExp(`\\b${escapeRegExp(productStem)}\\b`, 'i')
			const nameRegex = new RegExp(`\\b${escapeRegExp(nameStem)}\\b`, 'i')

			return prodRegex.test(nameStem) || nameRegex.test(productStem)
		}) ?? null
	)
}
