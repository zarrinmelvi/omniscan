import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { prisma } from '../server/lib/prisma'

type SeedProductEntry = {
	brand_name: string
	product_name: string
	ingredient_text: string
	simplified_ingredients: string
	is_verified: boolean

	_allergens_declared_on_label?: unknown
	_review_notes?: unknown
	_halal_status?: 'halal' | 'not_halal' | 'unknown'
	_halal_certifying_body?: string
}

function generateMatchKey(brandName: string, productName: string): string {
	return `${brandName} ${productName}`
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

async function main() {
	const datasetPath = process.argv[2] ?? 'prisma/seed_products.json'
	console.log(`Reading seed dataset from ${datasetPath}...`)

	const raw = readFileSync(datasetPath, 'utf-8')
	const rawEntries: SeedProductEntry[] = JSON.parse(raw)

	console.log(`Loaded ${rawEntries.length} dataset entries.\n`)

	const seenMatchKeys = new Map<string, string>()
	const entries: (SeedProductEntry & { match_key: string })[] = []
	const collisions: string[] = []

	for (const entry of rawEntries) {
		const label = `${entry.brand_name} — ${entry.product_name}`
		const matchKey = generateMatchKey(entry.brand_name, entry.product_name)

		if (seenMatchKeys.has(matchKey)) {
			collisions.push(`${label} collides with "${seenMatchKeys.get(matchKey)}" on key "${matchKey}"`)
			continue
		}

		seenMatchKeys.set(matchKey, label)
		entries.push({ ...entry, match_key: matchKey })
	}

	if (collisions.length > 0) {
		console.warn(
			`\n[COLLISION WARNING] ${collisions.length} entries produced a duplicate match_key and were SKIPPED — these need manual match_key assignment:`,
		)
		collisions.forEach((line) => console.warn(`    - ${line}`))
		console.warn('')
	}

	let migratedAndDeleted = 0
	let migratedButKeptInProduct: string[] = []
	let noMatchInProduct: string[] = []
	let alreadyMigrated = 0
	let errors: string[] = []

	for (const entry of entries) {
		const label = `${entry.brand_name} — ${entry.product_name}`

		try {
			const productRow = await prisma.product.findFirst({
				where: {
					brand_name: entry.brand_name,
					product_name: entry.product_name,
				},
			})

			if (!productRow) {
				noMatchInProduct.push(label)
				console.warn(`  [NO MATCH] ${label} — not found in Product table, skipping.`)
				continue
			}

			const [scanCount, pantryCount, activityCount, notificationCount] = await Promise.all([
				prisma.scan.count({ where: { product_id: productRow.id } }),
				prisma.pantryItem.count({ where: { product_id: productRow.id } }),
				prisma.activityLog.count({ where: { product_id: productRow.id } }),
				prisma.notification.count({ where: { product_id: productRow.id } }),
			])
			const totalReferences = scanCount + pantryCount + activityCount + notificationCount

			const existingCatalogRow = await prisma.catalogProduct.findUnique({
				where: { match_key: entry.match_key },
			})
			if (existingCatalogRow) {
				alreadyMigrated++
			}

			const confirmedNotHalal = entry._halal_status === 'not_halal'

			await prisma.catalogProduct.upsert({
				where: { match_key: entry.match_key },
				update: {
					brand_name: entry.brand_name,
					product_name: entry.product_name,
					ingredient_text: entry.ingredient_text,
					simplified_ingredients: entry.simplified_ingredients,
					is_verified: entry.is_verified,
					halal_logo_id: productRow.halal_logo_id,
					confirmed_not_halal: confirmedNotHalal,
				},
				create: {
					brand_name: entry.brand_name,
					product_name: entry.product_name,
					ingredient_text: entry.ingredient_text,
					simplified_ingredients: entry.simplified_ingredients,
					is_verified: entry.is_verified,
					match_key: entry.match_key,
					halal_logo_id: productRow.halal_logo_id,
					confirmed_not_halal: confirmedNotHalal,
				},
			})

			if (totalReferences > 0) {
				migratedButKeptInProduct.push(
					`${label} (Scan:${scanCount} PantryItem:${pantryCount} ActivityLog:${activityCount} Notification:${notificationCount})`,
				)
				console.log(`  [COPIED, KEPT] ${label} — referenced by real records, left in Product.`)
				continue
			}

			await prisma.product.delete({ where: { id: productRow.id } })
			migratedAndDeleted++
			console.log(`  [MIGRATED] ${label} — copied to CatalogProduct, removed from Product.`)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			errors.push(`${label}: ${message}`)
			console.error(`  [ERROR] ${label} — ${message}`)
		}
	}

	console.log('\n--- Migration summary ---')
	console.log(`Skipped due to match_key collision: ${collisions.length}`)
	console.log(`Already migrated on a previous run: ${alreadyMigrated}`)
	console.log(`Migrated and deleted from Product: ${migratedAndDeleted}`)
	console.log(`Copied but KEPT in Product (referenced by real records): ${migratedButKeptInProduct.length}`)
	if (migratedButKeptInProduct.length > 0) {
		console.log('  Needs manual review — these Product rows are doing double duty as both')
		console.log('  a real scanned/pantry product AND a catalog reference:')
		migratedButKeptInProduct.forEach((line) => console.log(`    - ${line}`))
	}
	console.log(`No matching Product row found: ${noMatchInProduct.length}`)
	if (noMatchInProduct.length > 0) {
		noMatchInProduct.forEach((line) => console.log(`    - ${line}`))
	}
	console.log(`Errors: ${errors.length}`)
	if (errors.length > 0) {
		errors.forEach((line) => console.log(`    - ${line}`))
	}

	await prisma.$disconnect()
}

main().catch(async (err) => {
	console.error('Migration script failed:', err)
	await prisma.$disconnect()
	process.exit(1)
})
