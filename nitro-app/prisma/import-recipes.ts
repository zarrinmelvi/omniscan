import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient, Prisma } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// -----------------------------------------------------------------------
// Ingredient-line parsing
// -----------------------------------------------------------------------
// Source ingredients are free text ("1½ tbsp Dijon mustard", "small bunch
// thyme", "1.6kg braising steak, cut into large chunks"). This is a
// best-effort parse, not a guarantee — quantity/unit extraction will miss
// or misparse some lines (no leading number, unusual units, etc.). That's
// acceptable here per the schema's own comment: raw_ingredients is generic,
// bulk-imported data, deliberately NOT forced to map onto specific Product
// rows.

const VULGAR_FRACTIONS: Record<string, number> = {
	'¼': 0.25,
	'½': 0.5,
	'¾': 0.75,
	'⅓': 1 / 3,
	'⅔': 2 / 3,
	'⅕': 0.2,
	'⅖': 0.4,
	'⅗': 0.6,
	'⅘': 0.8,
	'⅙': 1 / 6,
	'⅚': 5 / 6,
	'⅛': 0.125,
	'⅜': 0.375,
	'⅝': 0.625,
	'⅞': 0.875,
}

const KNOWN_UNITS = new Set([
	'tbsp',
	'tbsps',
	'tablespoon',
	'tablespoons',
	'tsp',
	'tsps',
	'teaspoon',
	'teaspoons',
	'g',
	'gram',
	'grams',
	'kg',
	'kilogram',
	'kilograms',
	'ml',
	'millilitre',
	'millilitres',
	'l',
	'litre',
	'litres',
	'cup',
	'cups',
	'oz',
	'ounce',
	'ounces',
	'lb',
	'lbs',
	'pound',
	'pounds',
	'pinch',
	'pinches',
	'clove',
	'cloves',
	'can',
	'cans',
	'pack',
	'packs',
	'packet',
	'packets',
	'sprig',
	'sprigs',
	'bunch',
	'bunches',
	'stick',
	'sticks',
	'slice',
	'slices',
	'handful',
	'handfuls',
	'knob',
	'knobs',
	'bottle',
	'bottles',
	'sheet',
	'sheets',
])

function parseLeadingQuantity(text: string): { quantity: number | null; rest: string } {
	const t = text.trim()

	// Mixed number glued to a vulgar fraction, e.g. "1½"
	const mixed = t.match(/^(\d+)([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])(\s|$)/)
	if (mixed) {
		return { quantity: Number(mixed[1]) + VULGAR_FRACTIONS[mixed[2]], rest: t.slice(mixed[0].length).trim() }
	}

	// Bare vulgar fraction, e.g. "½ cucumber"
	const bareFrac = t.match(/^([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])(\s|$)/)
	if (bareFrac) {
		return { quantity: VULGAR_FRACTIONS[bareFrac[1]], rest: t.slice(bareFrac[0].length).trim() }
	}

	// ASCII fraction, e.g. "1/2 tsp"
	const asciiFrac = t.match(/^(\d+)\s*\/\s*(\d+)(\s|$)/)
	if (asciiFrac) {
		return { quantity: Number(asciiFrac[1]) / Number(asciiFrac[2]), rest: t.slice(asciiFrac[0].length).trim() }
	}

	// Plain decimal or integer, e.g. "1.6kg", "2 onions"
	const num = t.match(/^(\d+(\.\d+)?)/)
	if (num) {
		return { quantity: Number(num[1]), rest: t.slice(num[0].length).trim() }
	}

	return { quantity: null, rest: t }
}

function parseIngredientLine(raw: string): { name: string; quantity: number | null; unit: string | null } {
	const cleaned = raw.replace(/\s+/g, ' ').trim()
	const { quantity, rest } = parseLeadingQuantity(cleaned)

	let unit: string | null = null
	let remainder = rest

	const unitMatch = remainder.match(/^([a-zA-Z]+)\b/)
	if (unitMatch && KNOWN_UNITS.has(unitMatch[1].toLowerCase())) {
		unit = unitMatch[1].toLowerCase()
		remainder = remainder.slice(unitMatch[0].length).trim()
	}

	// Keep only the text before the first comma as the ingredient identity —
	// everything after is prep instruction ("sliced", "deseeded and sliced"),
	// not part of the ingredient name.
	const name = (remainder.split(',')[0] || remainder).trim().toLowerCase()

	return { name: name || cleaned.toLowerCase(), quantity, unit }
}

// -----------------------------------------------------------------------
// Import
// -----------------------------------------------------------------------

interface RawRecipe {
	id: string
	image: string
	name: string
	description: string
	author: string
	rattings: number
	ingredients: string[]
	steps: string[]
	nutrients: Record<string, string>
	times: Record<string, string>
	serves: number
	difficult: string
	vote_count: number
	subcategory: string
	dish_type: string
}

async function main() {
	const dataPath = path.resolve(__dirname, 'data/recipes.json')
	const rawRecipes: RawRecipe[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

	console.log(`Parsing ${rawRecipes.length} recipes...`)

	const data = rawRecipes.map((r) => {
		const parsedIngredients = r.ingredients.map(parseIngredientLine)
		const ingredient_search_text = parsedIngredients
			.map((i) => i.name)
			.filter(Boolean)
			.join(' ')
		const instructions = r.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')

		return {
			name: r.name,
			instructions,
			// portions_guide is Json, so it's used here to carry the source
			// dataset's serving/nutrition/timing metadata as-is, not parsed
			// further — nothing downstream depends on its internal shape yet.
			portions_guide: {
				serves: r.serves,
				difficulty: r.difficult,
				times: r.times,
				nutrients: r.nutrients,
				rating: r.rattings,
				vote_count: r.vote_count,
				description: r.description,
				subcategory: r.subcategory,
				dish_type: r.dish_type,
			} as Prisma.InputJsonValue,
			source: 'kaggle',
			external_id: `bbcgoodfood:${r.id}`,
			image_url: r.image,
			raw_ingredients: parsedIngredients as Prisma.InputJsonValue,
			ingredient_search_text,
		}
	})

	const result = await prisma.recipe.createMany({ data, skipDuplicates: true })
	console.log(`Imported ${result.count} new recipes (${data.length - result.count} already present, skipped).`)
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
