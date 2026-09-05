// prisma/seed-product-catalog.ts
//
// Seeds the `Product` table from the 100-product OCR'd ingredient-label dataset.
// Run with Bun: `bun run prisma/seed-product-catalog.ts`
//
// ASSUMPTIONS (adjust if wrong for this repo's actual layout):
//   1. This file lives at `prisma/seed-product-catalog.ts`.
//   2. Reuses the existing shared Prisma singleton at
//      `server/lib/prisma.ts`, which already wires up the PrismaPg driver
//      adapter with DATABASE_URL from .env - don't construct a separate
//      bare `new PrismaClient()` here, that fails to initialize (the
//      newer "prisma-client" generator's output needs the adapter, it
//      won't silently read DATABASE_URL on its own like the old
//      prisma-client-js client did).
//   3. `seed_products.json` sits next to this script (same folder). Move the
//      JSON file here, or change `dataPath` below.
//
// WHAT THIS DOES NOT DO (on purpose, rather than guessing):
//   - Does NOT touch Allergen / IngredientMapping. The source labels list
//     declared allergens per product, but this schema has no per-product
//     allergen field — Allergen/IngredientMapping is a shared, global
//     scientific-term dictionary, not tied to a single Product row. Folding
//     108 products' worth of declared allergens into that shared dictionary
//     without knowing its existing term conventions (see
//     server/lib/allergen-matching.ts, which this session hasn't seen) risks
//     creating duplicate or conflicting terms. The declared-allergen data is
//     preserved in `seed_products.json` under `_allergens_declared_on_label`
//     (ignored below, not written to the DB) and in the companion review
//     spreadsheet, for whoever makes that call.
//   - Does NOT set halal_logo_id or image_base64 — out of scope here.
//   - Does NOT add a DB-level unique constraint on (brand_name, product_name).
//     That's a schema/migration decision for your team, not something to slip
//     in silently. Dedup below is done in application code instead, which
//     makes this script safe to re-run.

import { prisma } from '../server/lib/prisma'
import { readFileSync } from 'fs'
import path from 'path'

type SeedRow = {
	brand_name: string
	product_name: string
	ingredient_text: string
	simplified_ingredients: string
	is_verified: boolean
	_allergens_declared_on_label: string[]
	_review_notes: string[]
}

async function main() {
	const dataPath = path.join(__dirname, 'seed_products.json')
	const rows: SeedRow[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

	let created = 0
	let skipped = 0

	for (const row of rows) {
		const existing = await prisma.product.findFirst({
			where: {
				brand_name: row.brand_name,
				product_name: row.product_name,
				deleted_at: null,
			},
		})

		if (existing) {
			skipped++
			continue
		}

		await prisma.product.create({
			data: {
				brand_name: row.brand_name,
				product_name: row.product_name,
				ingredient_text: row.ingredient_text,
				simplified_ingredients: row.simplified_ingredients,
				is_verified: row.is_verified,
			},
		})
		created++
	}

	console.log(`Seed complete: ${created} created, ${skipped} skipped (already existed).`)
	console.log(
		`${rows.filter((r) => !r.is_verified).length} of ${rows.length} rows were seeded with ` +
			`is_verified=false — these had a flagged OCR/data issue and should get a manual ` +
			`label check before being trusted (see the review spreadsheet).`,
	)
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
