export interface DietaryRule {
	label: string
	keywords: string[]
}

// Dictionary to expand abstract dietary preference tags into real ingredient triggers
export const DIETARY_ALLERGEN_MAP: Record<string, DietaryRule> = {
	'dairy-free': {
		label: 'Dairy',
		keywords: ['milk', 'yogurt', 'yoghurt', 'cheese', 'butter', 'cream', 'whey', 'casein', 'lactose', 'curd', 'ghee', 'paneer'],
	},
	'gluten-free': {
		label: 'Gluten',
		keywords: ['wheat', 'barley', 'rye', 'gluten', 'flour', 'pasta', 'penne', 'semolina', 'breadcrumbs'],
	},
	'avoid msg': {
		label: 'MSG',
		keywords: ['msg', 'monosodium glutamate', 'yeast extract', 'flavor enhancer', 'flavour enhancer 621'],
	},
}