// prisma/parse-catalog-ingredients.ts
//
// Parses each CatalogProduct.ingredient_text into individual ingredient
// phrases and populates CatalogIngredient (a deduplicated dictionary) plus
// CatalogProductIngredient (the product<->ingredient join table used by
// the Alternatives AI-matching step).
//
// The original v14-session parser (server/lib/ingredient-parsing.ts) no
// longer exists in the project (confirmed missing, same as the
// MarketIngredient/ProductComposition models it fed) — this is a fresh
// implementation of the same approach described in the handoff reports:
// split on top-level commas while respecting nested parentheses/brackets,
// so e.g. "Spices (Onion, Garlic)" stays one ingredient entry instead of
// being split into three.
//
// Design notes:
// - CatalogIngredient.name is stored lowercased + trimmed, since it's a
//   deduplicated dictionary key — "Water" and "water" from two different
//   labels should be the same ingredient row, not two.
// - No stemming/synonym merging: "Sugar" and "Refined Sugar" are stored as
//   two distinct ingredients. OCR'd label text is inconsistent enough that
//   auto-merging risked silently conflating genuinely different things.
// - Per project convention (no silent auto-correction), this does NOT try
//   to fix garbled OCR text — it parses ingredient_text as it currently
//   sits in CatalogProduct. If any of the 25 originally-flagged rows still
//   need their is_verified/ingredient_text corrected, do that BEFORE
//   running this, or re-run it after — it's idempotent either way.
//
// Run: bun run prisma/parse-catalog-ingredients.ts
// Idempotent: safe to re-run after correcting ingredient_text on any row —
// existing CatalogIngredient/CatalogProductIngredient rows are reused via
// upsert, not duplicated.

import 'dotenv/config'
import { prisma } from '../server/lib/prisma'

// Splits on top-level commas only — commas inside (), [], or {} are
// treated as part of the enclosing phrase, not a split point.
function splitTopLevelIngredients(ingredientText: string): string[] {
	const parts: string[] = []
	let current = ''
	let depth = 0

	for (const char of ingredientText) {
		if (char === '(' || char === '[' || char === '{') {
			depth++
			current += char
		} else if (char === ')' || char === ']' || char === '}') {
			depth = Math.max(0, depth - 1)
			current += char
		} else if (char === ',' && depth === 0) {
			parts.push(current)
			current = ''
		} else {
			current += char
		}
	}
	parts.push(current)

	return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

function normalizeIngredientName(rawPhrase: string): string {
	return rawPhrase.toLowerCase().replace(/\s+/g, ' ').trim()
}

async function main() {
	const catalogProducts = await prisma.catalogProduct.findMany()
	console.log(`Found ${catalogProducts.length} catalog products to parse.\n`)

	let totalIngredientPhrases = 0
	let uniqueIngredientsCreated = 0
	let uniqueIngredientsReused = 0
	let linksCreated = 0
	let linksAlreadyExisted = 0
	const emptyParseWarnings: string[] = []
	const errors: string[] = []

	for (const product of catalogProducts) {
		const label = `${product.brand_name} — ${product.product_name}`

		try {
			const rawPhrases = splitTopLevelIngredients(product.ingredient_text)

			if (rawPhrases.length === 0) {
				emptyParseWarnings.push(label)
				console.warn(`  [EMPTY PARSE] ${label} — ingredient_text produced zero phrases, skipping.`)
				continue
			}

			for (const rawPhrase of rawPhrases) {
				totalIngredientPhrases++
				const normalizedName = normalizeIngredientName(rawPhrase)

				if (normalizedName.length === 0) continue

				const existingIngredient = await prisma.catalogIngredient.findUnique({
					where: { name: normalizedName },
				})

				const ingredient = await prisma.catalogIngredient.upsert({
					where: { name: normalizedName },
					update: {},
					create: { name: normalizedName },
				})

				if (existingIngredient) {
					uniqueIngredientsReused++
				} else {
					uniqueIngredientsCreated++
				}

				const existingLink = await prisma.catalogProductIngredient.findUnique({
					where: {
						catalog_product_id_catalog_ingredient_id: {
							catalog_product_id: product.id,
							catalog_ingredient_id: ingredient.id,
						},
					},
				})

				if (existingLink) {
					linksAlreadyExisted++
					continue
				}

				await prisma.catalogProductIngredient.create({
					data: {
						catalog_product_id: product.id,
						catalog_ingredient_id: ingredient.id,
					},
				})
				linksCreated++
			}

			console.log(`  [PARSED] ${label} — ${rawPhrases.length} ingredient phrases.`)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			errors.push(`${label}: ${message}`)
			console.error(`  [ERROR] ${label} — ${message}`)
		}
	}

	console.log('\n--- Parsing summary ---')
	console.log(`Catalog products processed: ${catalogProducts.length}`)
	console.log(`Total ingredient phrases seen: ${totalIngredientPhrases}`)
	console.log(`Unique CatalogIngredient rows created: ${uniqueIngredientsCreated}`)
	console.log(`Unique CatalogIngredient rows reused (already existed): ${uniqueIngredientsReused}`)
	console.log(`CatalogProductIngredient links created: ${linksCreated}`)
	console.log(`CatalogProductIngredient links already existed: ${linksAlreadyExisted}`)
	console.log(`Products with empty parse result: ${emptyParseWarnings.length}`)
	if (emptyParseWarnings.length > 0) {
		emptyParseWarnings.forEach((line) => console.log(`    - ${line}`))
	}
	console.log(`Errors: ${errors.length}`)
	if (errors.length > 0) {
		errors.forEach((line) => console.log(`    - ${line}`))
	}

	await prisma.$disconnect()
}

main().catch(async (err) => {
	console.error('Ingredient parsing script failed:', err)
	await prisma.$disconnect()
	process.exit(1)
})
