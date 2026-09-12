const WEIGHT_TO_KG: Record<string, number> = {
	g: 0.001,
	gram: 0.001,
	grams: 0.001,
	kg: 1,
	kilogram: 1,
	kilograms: 1,
	oz: 0.0283495,
	ounce: 0.0283495,
	ounces: 0.0283495,
	lb: 0.453592,
	lbs: 0.453592,
	pound: 0.453592,
	pounds: 0.453592,
}

const VOLUME_TO_L: Record<string, number> = {
	ml: 0.001,
	millilitre: 0.001,
	millilitres: 0.001,
	l: 1,
	litre: 1,
	litres: 1,
	cup: 0.24,
	cups: 0.24,
	tbsp: 0.015,
	tbsps: 0.015,
	tablespoon: 0.015,
	tablespoons: 0.015,
	tsp: 0.005,
	tsps: 0.005,
	teaspoon: 0.005,
	teaspoons: 0.005,
}

const COUNT_UNITS = new Set([
	'clove',
	'cloves',
	'pack',
	'packs',
	'packet',
	'packets',
	'slice',
	'slices',
	'stick',
	'sticks',
	'can',
	'cans',
	'bottle',
	'bottles',
	'sheet',
	'sheets',
])

export interface UnitComparison {
	comparable_quantity: number
	approximate: boolean
}

export function convertIngredientToPantryUnit(quantity: number, ingredientUnit: string | null, pantryUnit: string): UnitComparison | null {
	const target = pantryUnit.trim().toLowerCase()
	const normalizedIngUnit = ingredientUnit?.trim().toLowerCase() ?? null

	if (target === 'kg') {
		if (!normalizedIngUnit || !(normalizedIngUnit in WEIGHT_TO_KG)) return null
		return { comparable_quantity: quantity * WEIGHT_TO_KG[normalizedIngUnit], approximate: false }
	}

	if (target === 'l') {
		if (!normalizedIngUnit || !(normalizedIngUnit in VOLUME_TO_L)) return null
		return { comparable_quantity: quantity * VOLUME_TO_L[normalizedIngUnit], approximate: false }
	}

	if (!normalizedIngUnit || COUNT_UNITS.has(normalizedIngUnit)) {
		return { comparable_quantity: quantity, approximate: true }
	}

	return null
}
