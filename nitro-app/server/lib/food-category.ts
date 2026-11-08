export const FOOD_CATEGORIES = [
	'Canned Goods',
	'Instant Noodles',
	'Condiments & Sauces',
	'Dairy',
	'Snacks',
	'Beverages',
	'Grains',
] as const

const CATEGORY_ALIASES: Record<string, (typeof FOOD_CATEGORIES)[number]> = {
	'canned good': 'Canned Goods',
	'canned food': 'Canned Goods',
	'canned foods': 'Canned Goods',
	'noodles': 'Instant Noodles',
	'instant noodle': 'Instant Noodles',
	'condiments': 'Condiments & Sauces',
	'sauces': 'Condiments & Sauces',
	'condiment': 'Condiments & Sauces',
	'sauce': 'Condiments & Sauces',
	'condiments & sauce': 'Condiments & Sauces',
	'beverage': 'Beverages',
	'drinks': 'Beverages',
	'drink': 'Beverages',
	'snack': 'Snacks',
	'grain': 'Grains',
	'rice': 'Grains',
	'cereal': 'Grains',
	'cereals': 'Grains',
	'dairy products': 'Dairy',
}

/** Maps free-form AI output to a canonical pantry category, or '' if unknown. */
export function normalizeFoodCategory(value: unknown): string {
	if (typeof value !== 'string') return ''
	const key = value.trim().toLowerCase().replace(/\s+and\s+/g, ' & ').replace(/\s+/g, ' ')
	if (!key) return ''
	const exact = FOOD_CATEGORIES.find((c) => c.toLowerCase() === key)
	if (exact) return exact
	return CATEGORY_ALIASES[key] ?? ''
}
