// One-time (re-runnable) import of the Food.com Recipes and Reviews Kaggle
// dataset into the Recipe table, as source: 'kaggle' rows. These are NOT
// linked to branded Product/Ingredient rows — see the raw_ingredients
// comment on the Recipe model in schema.prisma for why.
//
// Dataset: https://www.kaggle.com/datasets/irkaal/foodcom-recipes-and-reviews
// (~522k recipes). Only recipes.parquet is needed — reviews.parquet/
// recipes.csv/reviews.csv are not used here.
//
// SETUP (one-time):
//
// 1. Download the dataset (needs a free Kaggle account — click Download on
//    the dataset page), unzip it, and note the path to recipes.parquet.
//
// 2. Install the parquet reader this script uses, plus its companion
//    compressors package (hyparquet's core only ships Snappy support by
//    default to stay lightweight — this Food.com file uses GZIP, which
//    needs the extra package):
//      bun add hyparquet hyparquet-compressors
//
// 3. Run this script directly against the .parquet file — no conversion
//    step needed, Bun runs .ts files natively:
//      bun scripts/import-food-com-recipes.ts "C:\path\to\recipes.parquet"
//
// Safe to re-run: rows are keyed by external_id ("foodcom:<RecipeId>"), and
// prisma.recipe.createMany's skipDuplicates means a partial/failed run can
// just be re-run from the start without creating duplicates.

import { existsSync } from 'node:fs'
import { asyncBufferFromFile, parquetReadObjects } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'
import { prisma } from '../server/lib/prisma'

interface FoodComRow {
	RecipeId: number
	Name: string
	RecipeIngredientParts: unknown
	RecipeIngredientQuantities: unknown
	RecipeInstructions: unknown
	RecipeServings: number | string | null
}

interface RawIngredient {
	name: string
	quantity: number | null
	unit: string | null
}

interface RecipeInsert {
	external_id: string
	name: string
	instructions: string
	raw_ingredients: RawIngredient[]
	ingredient_search_text: string
	portions_guide: { base_servings: number | null }
	source: string
}

const BATCH_SIZE = 500
// How many parquet rows to pull into memory per read — bounds memory usage
// across ~522k rows rather than reading the whole file into an array at once.
const CHUNK_SIZE = 5000

const NEEDED_COLUMNS = ['RecipeId', 'Name', 'RecipeIngredientParts', 'RecipeIngredientQuantities', 'RecipeInstructions', 'RecipeServings']

// hyparquet returns real JS arrays for parquet list columns, but this guards
// the (unlikely, but seen with other conversion paths) case of a column
// coming through as a JSON-stringified array instead.
function coerceArray(value: unknown): unknown[] {
	if (Array.isArray(value)) return value
	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value)
			return Array.isArray(parsed) ? parsed : []
		} catch {
			return []
		}
	}
	return []
}

// Food.com quantities are freeform strings ("1", "1/2", "1 1/2", "", null).
// Handles plain integers/decimals and simple "a/b" or "whole a/b" fractions.
// Anything else (rare — "to taste" etc.) is kept as descriptive text in the
// unit field with a null quantity, rather than silently dropped.
function parseQuantity(raw: unknown): { quantity: number | null; unit: string | null } {
	if (raw === null || raw === undefined) return { quantity: null, unit: null }
	const text = String(raw).trim()
	if (!text) return { quantity: null, unit: null }

	const fractionMatch = text.match(/^(\d+\s+)?(\d+)\/(\d+)$/)
	if (fractionMatch) {
		const whole = fractionMatch[1] ? parseInt(fractionMatch[1], 10) : 0
		const num = parseInt(fractionMatch[2], 10)
		const den = parseInt(fractionMatch[3], 10)
		return { quantity: den ? whole + num / den : null, unit: null }
	}

	const numeric = Number(text)
	if (!Number.isNaN(numeric)) return { quantity: numeric, unit: null }

	return { quantity: null, unit: text }
}

function buildRawIngredients(row: FoodComRow): RawIngredient[] {
	const names = coerceArray(row.RecipeIngredientParts)
		.map((n) => String(n).trim())
		.filter(Boolean)
	const quantities = coerceArray(row.RecipeIngredientQuantities)

	return names.map((name, i) => {
		const { quantity, unit } = parseQuantity(quantities[i])
		return { name, quantity, unit }
	})
}

function buildInstructions(row: FoodComRow): string {
	const steps = coerceArray(row.RecipeInstructions)
		.map((s) => String(s).trim())
		.filter(Boolean)
	if (steps.length) return steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
	return String(row.RecipeInstructions ?? '').trim()
}

function buildSearchText(ingredients: RawIngredient[]): string {
	return ingredients
		.map((i) => i.name.toLowerCase())
		.join(' ')
		.trim()
}

async function flush(batch: RecipeInsert[]) {
	if (batch.length === 0) return 0
	const result = await prisma.recipe.createMany({ data: batch, skipDuplicates: true })
	return result.count
}

async function main() {
	const filePath = process.argv[2]
	if (!filePath || !existsSync(filePath)) {
		console.error('Usage: bun scripts/import-food-com-recipes.ts <path-to-recipes.parquet>')
		process.exit(1)
	}

	const file = await asyncBufferFromFile(filePath)

	let inserted = 0
	let skipped = 0
	let rowStart = 0

	while (true) {
		const rows = (await parquetReadObjects({
			file,
			columns: NEEDED_COLUMNS,
			rowStart,
			rowEnd: rowStart + CHUNK_SIZE,
			compressors,
		})) as FoodComRow[]

		if (rows.length === 0) break

		const batch: RecipeInsert[] = []

		for (const row of rows) {
			const rawIngredients = buildRawIngredients(row)
			if (!row.Name || rawIngredients.length === 0) {
				skipped += 1
				continue
			}

			const servingsRaw = row.RecipeServings
			const servings = typeof servingsRaw === 'number' ? servingsRaw : typeof servingsRaw === 'string' ? parseInt(servingsRaw, 10) : NaN

			batch.push({
				external_id: `foodcom:${row.RecipeId}`,
				name: row.Name.trim(),
				instructions: buildInstructions(row),
				raw_ingredients: rawIngredients,
				ingredient_search_text: buildSearchText(rawIngredients),
				portions_guide: { base_servings: Number.isFinite(servings) ? servings : null },
				source: 'kaggle',
			})
		}

		for (let i = 0; i < batch.length; i += BATCH_SIZE) {
			inserted += await flush(batch.slice(i, i + BATCH_SIZE))
		}

		console.log(`Imported ${inserted} so far (${skipped} skipped)... [rows ${rowStart}-${rowStart + rows.length}]`)
		rowStart += CHUNK_SIZE
	}

	console.log(`Done. Imported: ${inserted}, skipped (missing name/ingredients or malformed row): ${skipped}`)
	await prisma.$disconnect()
}

main().catch(async (err) => {
	console.error('Import failed:', 
	await prisma.$disconnect()
	process.exit(1)
})
