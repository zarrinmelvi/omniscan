/**
 * convert-india-csv.ts
 *
 * Reads nitro-app/prisma/data/packaged-foods-india.csv and converts it to
 * the seed JSON shape used by catalogProduct.seeder.ts.
 *
 * CSV columns: S.No, Item name, Brand_Name, Category, Sub_Category,
 *              Ingredients, (nutritional fields...)
 *
 * Usage (from nitro-app directory):
 *   npx tsx prisma/scripts/convert-india-csv.ts
 *
 * Output: nitro-app/prisma/data/packaged_food_india.json
 */

import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeedRow = {
	brand_name: string
	product_name: string
	ingredient_text: string
	simplified_ingredients: string
	is_verified: boolean
	_allergens_declared_on_label: string[]
	_review_notes: string[]
	_variant_group: string | null
}

type CsvRow = {
	sno: string
	item_name: string
	brand_name: string
	category: string
	sub_category: string
	ingredients: string
	[key: string]: string // nutritional columns
}

// ---------------------------------------------------------------------------
// Brand name normalization
// ---------------------------------------------------------------------------

const BRAND_MAP: Record<string, string> = {
	'PARLE': 'Parle',
	'BRITANNIA': 'Britannia',
	'SUNFEAST': 'Sunfeast',
	'HALDIRAMS': 'Haldirams',
	"LAY'S": "Lay's",
	'LAYS': "Lay's",
	'CADBURY': 'Cadbury',
	'NESTLE': 'Nestle',
	'AMUL': 'Amul',
	'MAGGI': 'Maggi',
	'BINGO': 'Bingo',
	'KURKURE': 'Kurkure',
	'HERSHEYS': "Hershey's",
	"HERSHEY'S": "Hershey's",
	'OREO': 'Oreo',
	'MTR': 'MTR',
	'GITS': 'Gits',
	"THE BAKER'S DOZEN": "The Baker's Dozen",
	"BAKER'S DOZEN": "Baker's Dozen",
	'UNIBIC': 'Unibic',
	'ORION': 'Orion',
	'DABUR REAL': 'Dabur Real',
	'PAPER BOAT': 'Paper Boat',
	'RAW PRESSERY': 'Raw Pressery',
	'TOO YUMM': 'Too Yumm',
	'WINGREENS': 'Wingreens',
	'PINTOLA': 'Pintola',
	'FARMLEY': 'Farmley',
	'PRINGLES': 'Pringles',
	'LINDT': 'Lindt',
	'GO DESI': 'Go Desi',
	'SWAD': 'Swad',
	'ARUN': 'Arun',
	'GO ZERO': 'Go Zero',
	'KWALITY WALLS': 'Kwality Walls',
	'KWALITY WALLS CADBURY': 'Kwality Walls Cadbury',
	'NEOPOP': 'Neopop',
	'RIO': 'Rio',
	'BB GOODDIET': 'Bb Gooddiet',
	'BRB': 'Brb',
	'PRASUMA': 'Prasuma',
	'HALDIRAM': 'Haldirams',
}

function normalizeBrand(raw: string): string {
	const upper = raw.trim().toUpperCase()
	if (BRAND_MAP[upper]) return BRAND_MAP[upper]
	// Generic title-case: capitalize first letter of each word, preserve apostrophes
	return raw
		.trim()
		.toLowerCase()
		.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Allergen detection
// ---------------------------------------------------------------------------

const ALLERGEN_PATTERNS: Record<string, RegExp[]> = {
	Milk: [
		/\bmilk\b/i,
		/\bcream\b/i,
		/\bbutter\b/i,
		/\bcheese\b/i,
		/\bcasein\b/i,
		/\bcaseinate\b/i,
		/\bwhey\b/i,
		/\blactose\b/i,
		/\bdairy\b/i,
		/\bghee\b/i,
		/\bpaneer\b/i,
		/\bmilk solids\b/i,
	],
	Eggs: [
		/\begg\s/i,
		/\beggs\s/i,
		/\begg white\b/i,
		/\begg yolk\b/i,
		/\balbumin\b/i,
		/\bovalbumin\b/i,
		/\bovomucin\b/i,
	],
	Wheat: [
		/\bwheat\b/i,
		/\bgluten\b/i,
		/\bmaida\b/i,
		/\bsemolina\b/i,
		/\batta\b/i,
		/\bflour\b/i,
	],
	Soy: [
		/\bsoy\s/i,
		/\bsoya\b/i,
		/\bsoybean\b/i,
		/\blecithin \(from soy/i,
	],
	Peanuts: [/\bpeanut\b/i, /\bgroundnut\b/i, /\barachis\b/i],
	'Tree Nuts': [
		/\balmond\b/i,
		/\bcashew\b/i,
		/\bwalnut\b/i,
		/\bhazelnut\b/i,
		/\bpistachio\b/i,
		/\bpecan\b/i,
		/\bmacadamia\b/i,
		/\bbrazil nut\b/i,
	],
}

function detectAllergens(ingredients: string): string[] {
	const found: string[] = []
	for (const [allergen, patterns] of Object.entries(ALLERGEN_PATTERNS)) {
		if (patterns.some((re) => re.test(ingredients))) {
			found.push(allergen)
		}
	}
	return found
}

// ---------------------------------------------------------------------------
// Variant group assignment
// ---------------------------------------------------------------------------

/**
 * Build a slug from brand name and sub-category using the explicit mapping
 * rules, falling back to a generic snake_case brand_subcategory pattern.
 */
function buildVariantGroupKey(brand: string, subCategory: string): string {
	const b = brand.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
	const s = subCategory
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '')
	return `${b}_${s}`
}

// Explicit overrides for the known group slugs
const EXPLICIT_VARIANT_SLUGS: Record<string, string> = {
	"lay's_potatochips": 'lays_potatochips',
	"hershey's_chocolate": 'hersheys_chocolate',
	"hershey's_chocolate_bar": 'hersheys_chocolate_bar',
	"baker's_dozen_cookies": 'bakers_dozen_cookies',
	"baker's_dozen_cake": 'bakers_dozen_cake',
}

function resolveVariantSlug(brand: string, subCategory: string): string {
	const raw = buildVariantGroupKey(brand, subCategory)
	return EXPLICIT_VARIANT_SLUGS[raw] ?? raw
}

// ---------------------------------------------------------------------------
// CSV parsing (handles quoted fields with embedded commas/newlines)
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
	const result: string[] = []
	let inQuotes = false
	let current = ''
	for (let i = 0; i < line.length; i++) {
		const ch = line[i]
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"'
				i++
			} else {
				inQuotes = !inQuotes
			}
		} else if (ch === ',' && !inQuotes) {
			result.push(current)
			current = ''
		} else {
			current += ch
		}
	}
	result.push(current)
	return result
}

function parseCsv(content: string): CsvRow[] {
	// Normalize line endings
	const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
	if (lines.length < 2) return []

	const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
	const rows: CsvRow[] = []

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim()
		if (!line) continue
		const values = parseCsvLine(line)
		const row: CsvRow = {} as CsvRow
		headers.forEach((h, idx) => {
			row[h] = (values[idx] ?? '').trim()
		})
		rows.push(row)
	}

	return rows
}

// ---------------------------------------------------------------------------
// Main conversion
// ---------------------------------------------------------------------------

function main() {
	const csvPath = path.join(__dirname, '../data/packaged-foods-india.csv')
	const outPath = path.join(__dirname, '../data/packaged_food_india.json')

	const content = readFileSync(csvPath, 'utf-8')
	const csvRows = parseCsv(content)

	// First pass: count how many rows share each brand+subcategory combo
	const groupCounts = new Map<string, number>()
	for (const row of csvRows) {
		const brand = normalizeBrand(row.brand_name || '')
		const subCat = (row.sub_category || '').trim().toUpperCase()
		if (!brand || !subCat) continue
		const key = resolveVariantSlug(brand, subCat)
		groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1)
	}

	// Second pass: build seed rows
	const output: SeedRow[] = []
	for (const row of csvRows) {
		const rawBrand = (row.brand_name || '').trim()
		const rawName = (row.item_name || '').trim()
		if (!rawBrand || !rawName) continue

		const brand = normalizeBrand(rawBrand)
		const subCat = (row.sub_category || '').trim().toUpperCase()
		const ingredients = (row.ingredients || '').trim()
		const allergens = detectAllergens(ingredients)

		// Variant group: only assign when 2+ products share brand+subcategory
		let variantGroup: string | null = null
		if (subCat) {
			const slug = resolveVariantSlug(brand, subCat)
			if ((groupCounts.get(slug) ?? 0) >= 2) {
				variantGroup = slug
			}
		}

		output.push({
			brand_name: brand,
			product_name: rawName,
			ingredient_text: ingredients,
			simplified_ingredients: ingredients,
			is_verified: false, // India dataset — not hand-verified yet
			_allergens_declared_on_label: allergens,
			_review_notes: [],
			_variant_group: variantGroup,
		})
	}

	writeFileSync(outPath, JSON.stringify(output, null, '\t'), 'utf-8')
	console.log(`Wrote ${output.length} products → ${outPath}`)
}

main()
