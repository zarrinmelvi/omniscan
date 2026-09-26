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
	'eggs-free': {
		label: 'Eggs',
		keywords: ['egg', 'eggs', 'egg white', 'egg yolk', 'albumen', 'mayonnaise', 'meringue', 'ovalbumin'],
	},
	'milk-free': {
		label: 'Milk',
		keywords: ['milk', 'cream', 'butter', 'cheese', 'lactose', 'whey', 'casein', 'ghee', 'dairy', 'yogurt', 'yoghurt'],
	},
	'peanuts-free': {
		label: 'Peanuts',
		keywords: ['peanut', 'peanut oil', 'groundnut', 'arachis oil'],
	},
	'wheat-free': {
		label: 'Wheat',
		keywords: ['wheat', 'flour', 'gluten', 'semolina', 'spelt', 'durum', 'wheat starch'],
	},
	'soy-free': {
		label: 'Soy',
		keywords: ['soy', 'soya', 'soybean', 'tofu', 'tempeh', 'miso', 'tamari', 'edamame', 'soy lecithin'],
	},
	'fish-free': {
		label: 'Fish',
		keywords: ['fish', 'anchovy', 'salmon', 'tuna', 'cod', 'haddock', 'tilapia', 'mackerel', 'herring', 'sardine', 'fish sauce'],
	},
	'shellfish-free': {
		label: 'Shellfish',
		keywords: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'scallop', 'clam', 'oyster', 'mussel', 'squid'],
	},
	'sesame-free': {
		label: 'Sesame',
		keywords: ['sesame', 'sesame oil', 'tahini', 'sesame seed'],
	},
	'tree nuts-free': {
		label: 'Tree Nuts',
		keywords: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'pine nut', 'tree nut'],
	},
	'mustard-free': {
		label: 'Mustard',
		keywords: ['mustard', 'mustard seed', 'mustard oil'],
	},
}