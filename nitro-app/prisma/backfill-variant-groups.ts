import 'dotenv/config'
import { readFileSync } from 'fs'
import path from 'path'
import { prisma } from '../server/lib/prisma'

type SeedRow = {
	brand_name: string
	product_name: string
	ingredient_text: string
	simplified_ingredients: string
	is_verified: boolean
	_variant_group: string | null
}

// Same generation as catalogProduct.seeder.ts's generateMatchKey — kept in
// sync intentionally. If this ever needs changing, change both together, or
// existing rows will stop matching by match_key here.
function generateMatchKey(brandName: string, productName: string): string {
	return `${brandName} ${productName}`
		.toLowerCase()
		.replace(/[^\w\s/]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}

// One-time backfill for the Alternatives feature's variant_group field.
// Uses upsert rather than createMany, specifically because most of the rows
// this touches already exist in CatalogProduct (seeded earlier via
// catalogProduct.seeder.ts's createMany+skipDuplicates, which only inserts
// new rows and would silently skip these updates entirely). upsert correctly
// updates the ~29 already-existing rows AND creates the 2 new split
// Pancit Canton rows in one pass. Safe to re-run — every row is upserted on
// its own match_key, so running this twice just re-applies the same values.
async function backfillVariantGroups() {
	const dataPath = path.join(__dirname, 'data', 'seed_products.json')
	const rows: SeedRow[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

	const grouped = rows.filter((r) => r._variant_group !== null)
	console.log(`Found ${grouped.length} rows with a variant_group to apply (of ${rows.length} total).\n`)

	let updated = 0
	let created = 0
	let errors = 0

	for (const row of grouped) {
		const matchKey = generateMatchKey(row.brand_name, row.product_name)
		const label = `${row.brand_name} — ${row.product_name}`

		try {
			const existing = await prisma.catalogProduct.findUnique({ where: { match_key: matchKey } })

			await prisma.catalogProduct.upsert({
				where: { match_key: matchKey },
				update: { variant_group: row._variant_group },
				create: {
					brand_name: row.brand_name,
					product_name: row.product_name,
					ingredient_text: row.ingredient_text,
					simplified_ingredients: row.simplified_ingredients,
					is_verified: row.is_verified,
					match_key: matchKey,
					variant_group: row._variant_group,
				},
			})

			if (existing) {
				updated++
				console.log(`  [UPDATED] ${label} -> variant_group: ${row._variant_group}`)
			} else {
				created++
				console.log(`  [CREATED] ${label} -> variant_group: ${row._variant_group}`)
			}
		} catch (err) {
			errors++
			console.error(`  [ERROR] ${label}:`, err instanceof Error ? err.message : err)
		}
	}

	console.log('\n--- Backfill summary ---')
	console.log(`Rows updated (already existed): ${updated}`)
	console.log(`Rows created (new, e.g. the Pancit Canton split): ${created}`)
	console.log(`Errors: ${errors}`)

	if (updated === 0 && created === grouped.length) {
		console.warn(
			'\nWARNING: every row was CREATED, none UPDATED. If you expected most of these to already ' +
				'exist, this likely means generateMatchKey here does not match the keys your live CatalogProduct ' +
				'rows actually have — check for duplicates in Neon before assuming this ran cleanly.',
		)
	}
}

backfillVariantGroups()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (err) => {
		console.error('Variant group backfill failed:', err)
		await prisma.$disconnect()
		process.exit(1)
	})
