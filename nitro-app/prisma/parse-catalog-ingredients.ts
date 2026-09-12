import 'dotenv/config'
import { pathToFileURL } from 'url'
import { prisma } from '../server/lib/prisma'

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

/**
 * Parses CatalogProduct.ingredient_text into CatalogIngredient rows and
 * CatalogProductIngredient links.
 *
 * Rewritten from a per-phrase sequential-query version — which issued up
 * to 4 round trips per ingredient phrase (thousands of individual queries
 * against Neon for the full 108-product catalog) — into three bulk
 * operations, so it stays fast regardless of catalog size.
 *
 * Safe to re-run: relies on CatalogIngredient.name being @unique and
 * CatalogProductIngredient's @@unique([catalog_product_id,
 * catalog_ingredient_id]), via skipDuplicates on both createMany calls.
 */
export default async function parseCatalogIngredients() {
	const catalogProducts = await prisma.catalogProduct.findMany()
	console.log(`Found ${catalogProducts.length} catalog products to parse.\n`)

	const emptyParseWarnings: string[] = []
	let totalIngredientPhrases = 0

	// product.id -> normalized ingredient names (deduped within the product)
	const productIngredientNames = new Map<number, Set<string>>()
	const allNames = new Set<string>()

	for (const product of catalogProducts) {
		const label = `${product.brand_name} — ${product.product_name}`
		const rawPhrases = splitTopLevelIngredients(product.ingredient_text)

		if (rawPhrases.length === 0) {
			emptyParseWarnings.push(label)
			console.warn(`  [EMPTY PARSE] ${label} — ingredient_text produced zero phrases, skipping.`)
			continue
		}

		const names = new Set<string>()
		for (const rawPhrase of rawPhrases) {
			totalIngredientPhrases++
			const normalizedName = normalizeIngredientName(rawPhrase)
			if (normalizedName.length === 0) continue
			names.add(normalizedName)
			allNames.add(normalizedName)
		}

		productIngredientNames.set(product.id, names)
		console.log(`  [PARSED] ${label} — ${rawPhrases.length} ingredient phrases.`)
	}

	// Bulk-insert every distinct ingredient name seen across the whole catalog
	// in one query, instead of one upsert per phrase.
	const ingredientResult = await prisma.catalogIngredient.createMany({
		data: [...allNames].map((name) => ({ name })),
		skipDuplicates: true,
	})

	// Fetch the id for every name we need (existing + newly created) in one query.
	const ingredients = await prisma.catalogIngredient.findMany({
		where: { name: { in: [...allNames] } },
		select: { id: true, name: true },
	})
	const idByName = new Map(ingredients.map((i) => [i.name, i.id]))

	// Build every (product, ingredient) link and bulk-insert in one call.
	const linkData: { catalog_product_id: number; catalog_ingredient_id: number }[] = []
	for (const [productId, names] of productIngredientNames) {
		for (const name of names) {
			const ingredientId = idByName.get(name)
			if (ingredientId === undefined) continue // shouldn't happen — guards against a lookup mismatch
			linkData.push({ catalog_product_id: productId, catalog_ingredient_id: ingredientId })
		}
	}

	const linkResult = await prisma.catalogProductIngredient.createMany({
		data: linkData,
		skipDuplicates: true,
	})

	console.log('\n--- Parsing summary ---')
	console.log(`Catalog products processed: ${catalogProducts.length}`)
	console.log(`Total ingredient phrases seen: ${totalIngredientPhrases}`)
	console.log(`Distinct ingredient names in this run: ${allNames.size}`)
	console.log(`New CatalogIngredient rows created: ${ingredientResult.count}`)
	console.log(`CatalogIngredient rows already existed: ${allNames.size - ingredientResult.count}`)
	console.log(`Product-ingredient links attempted: ${linkData.length}`)
	console.log(`New CatalogProductIngredient links created: ${linkResult.count}`)
	console.log(`Links already existed: ${linkData.length - linkResult.count}`)
	console.log(`Products with empty parse result: ${emptyParseWarnings.length}`)
	if (emptyParseWarnings.length > 0) {
		emptyParseWarnings.forEach((line) => console.log(`    - ${line}`))
	}
}

// Still runnable directly: `tsx prisma/parse-catalog-ingredients.ts`
// (uses pathToFileURL rather than string-concatenating "file://" onto
// process.argv[1] — that concatenation never matches import.meta.url on
// Windows, since argv[1] is a backslash path and import.meta.url is a
// proper file:// URL with forward slashes, which silently skipped
// running main() entirely.)
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
	parseCatalogIngredients()
		.then(async () => {
			await prisma.$disconnect()
		})
		.catch(async (err) => {
			console.error('Ingredient parsing script failed:', err)
			await prisma.$disconnect()
			process.exit(1)
		})
}
