// Count-based + weight/volume units supported by the pantry.
export const PANTRY_UNITS = [
	'pcs', 'bottles', 'cans', 'packs', 'boxes', // count-based
	'g', 'kg', 'ml', 'L',                       // weight / volume
] as const
export type PantryUnit = (typeof PANTRY_UNITS)[number]

export const PANTRY_CATEGORIES = [
	'Canned Goods',
	'Instant Noodles',
	'Condiments & Sauces',
	'Dairy',
	'Snacks',
	'Beverages',
	'Grains',
	'Uncategorized',
] as const
export type PantryCategory = (typeof PANTRY_CATEGORIES)[number]

export function isValidPantryUnit(u: unknown): u is PantryUnit {
	return typeof u === 'string' && (PANTRY_UNITS as readonly string[]).includes(u)
}

export function isValidPantryCategory(c: unknown): c is PantryCategory {
	return typeof c === 'string' && (PANTRY_CATEGORIES as readonly string[]).includes(c)
}

/**
 * Best-guess category from a product name using keyword heuristics.
 * Returns 'Uncategorized' when nothing matches. Used to PRE-FILL the UI
 * selector; the user can always override.
 */
export function inferCategory(productName: string): PantryCategory {
	const n = (productName || '').toLowerCase()
	const has = (...kw: string[]) => kw.some((k) => n.includes(k))

	if (has('noodle', 'ramen', 'pancit canton', 'instant mami', 'cup noodle', 'lucky me')) return 'Instant Noodles'
	if (has('milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'dairy')) return 'Dairy'
	if (has('soy sauce', 'ketchup', 'catsup', 'vinegar', 'sauce', 'mayonnaise', 'mayo', 'condiment', 'oyster sauce', 'fish sauce', 'patis', 'toyo', 'suka')) return 'Condiments & Sauces'
	if (has('chips', 'biscuit', 'cookie', 'cracker', 'snack', 'candy', 'chocolate', 'nuts', 'piattos', 'nova')) return 'Snacks'
	if (has('juice', 'soda', 'cola', 'water', 'coffee', 'tea', 'drink', 'beverage', 'milo', 'beer', 'wine')) return 'Beverages'
	if (has('rice', 'flour', 'oats', 'cereal', 'pasta', 'bread', 'grain', 'quinoa', 'bigas')) return 'Grains'
	if (has('canned', 'can of', 'sardines', 'tuna', 'corned beef', 'luncheon meat', 'delata', 'meat loaf', 'century tuna', 'argentina', 'ligo')) return 'Canned Goods'

	return 'Uncategorized'
}
