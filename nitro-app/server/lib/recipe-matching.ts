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
		const targetStem = rawTarget
			.split(/\s+/)
			.map(stemWord)
			.join(' ')

		const hit = pantryItems.find((item) => {
			const cleanedProduct = cleanProductName(item.product_name)
			const productStem = cleanedProduct
				.split(/\s+/)
				.map(stemWord)
				.join(' ')

			// 1. Direct or Stemmed Exact Matches
			if (cleanedProduct === rawTarget || productStem === targetStem) return true

			// 2. Word Boundary Matches (Raw and Stemmed)
			const rawRegex = new RegExp(`\\b${escapeRegExp(rawTarget)}\\b`, 'i')
			const stemRegex = new RegExp(`\\b${escapeRegExp(targetStem)}\\b`, 'i')
			const prodStemRegex = new RegExp(`\\b${escapeRegExp(productStem)}\\b`, 'i')

			return (
				rawRegex.test(cleanedProduct) ||
				stemRegex.test(productStem) ||
				prodStemRegex.test(targetStem)
			)
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
	const cleanedProduct = cleanProductName(productName)
	if (!cleanedProduct) return null

	const productStem = cleanedProduct
		.split(/\s+/)
		.map(stemWord)
		.join(' ')

	return (
		ingredients.find((ing) => {
			const rawName = ing.name.trim().toLowerCase()
			if (!rawName) return false

			const nameStem = rawName
				.split(/\s+/)
				.map(stemWord)
				.join(' ')

			if (rawName === cleanedProduct || nameStem === productStem) return true

			const prodRegex = new RegExp(`\\b${escapeRegExp(productStem)}\\b`, 'i')
			const nameRegex = new RegExp(`\\b${escapeRegExp(nameStem)}\\b`, 'i')

			return prodRegex.test(nameStem) || nameRegex.test(productStem)
		}) ?? null
	)
}