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
