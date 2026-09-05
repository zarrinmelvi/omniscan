// prisma/migrate-catalog-products.ts
//
// One-off migration: moves the 108 reference-catalog products that were
// seeded into `Product` (via seed-product-catalog.ts) over to the new
// `CatalogProduct` table.
//
// Reads from prisma/seed_products.json — the original omniscan_product_
// dataset.json (which had a pre-computed match_key per entry) couldn't be
// located, so match_key is generated here instead, straight from
// brand_name + product_name. NOTE: this is a fresh normalization, not
// necessarily identical to whatever the original file used — it lowercases
// and strips punctuation but deliberately does NOT strip parenthetical
// text (e.g. "Regular / Hot"), since the dataset counts label variants as
// distinct products and over-normalizing risks collapsing two real
// products onto the same key. Any collision that does occur is flagged
// and skipped rather than silently overwritten (see duplicate handling
// below) — check the summary output for any if this run reports them.
//
// SAFETY NOTE — read before running:
// The old seed script's idempotency check (findFirst by brand_name +
// product_name before creating) means it's possible a real user's scan or
// pantry item ended up pointing at one of these 108 catalog rows, if the
// app's own product-matching logic found the pre-existing seeded row
// instead of creating a fresh one. This script checks for that on every
// row. If a catalog row has ANY real reference (Scan, PantryItem,
// ActivityLog, or Notification pointing at it), it is copied into
// CatalogProduct but NOT deleted from Product — deleting it would either
// violate the FK constraint or silently orphan real user history. Only
// unreferenced rows get deleted from Product after a confirmed copy.
//
// Run: bun run prisma/migrate-catalog-products.ts [path-to-seed-json]
// Default path: prisma/seed_products.json
//
// Idempotent: re-running is safe. CatalogProduct.match_key is unique, so
// already-migrated rows are upserted rather than duplicated.

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { prisma } from '../server/lib/prisma'

type SeedProductEntry = {
	brand_name: string
	product_name: string
	ingredient_text: string
	simplified_ingredients: string
	is_verified: boolean
	// Non-DB reference fields that may still be present in the raw seed
	// file even though they were stripped before the original DB insert —
	// ignored here, only listed so TypeScript doesn't complain if present.
	_allergens_declared_on_label?: unknown
	_review_notes?: unknown
}

// Lowercase, strip punctuation, collapse whitespace. Deliberately keeps
// variant wording (e.g. "Regular / Hot" -> "regular hot") instead of
// stripping it, so distinct label variants don't collide onto one key.
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

	// Generate match_key for every entry up front and detect collisions
	// before touching the DB at all.
	const seenMatchKeys = new Map<string, string>() // match_key -> label of first entry that claimed it
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
			// Find the corresponding row in Product (seeded by the old script).
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

			// Check if any real user activity references this Product row.
			const [scanCount, pantryCount, activityCount, notificationCount] = await Promise.all([
				prisma.scan.count({ where: { product_id: productRow.id } }),
				prisma.pantryItem.count({ where: { product_id: productRow.id } }),
				prisma.activityLog.count({ where: { product_id: productRow.id } }),
				prisma.notification.count({ where: { product_id: productRow.id } }),
			])
			const totalReferences = scanCount + pantryCount + activityCount + notificationCount

			// Check whether this row was already migrated on a previous run.
			const existingCatalogRow = await prisma.catalogProduct.findUnique({
				where: { match_key: entry.match_key },
			})
			if (existingCatalogRow) {
				alreadyMigrated++
			}

			// Upsert into CatalogProduct — safe to re-run.
			await prisma.catalogProduct.upsert({
				where: { match_key: entry.match_key },
				update: {
					brand_name: entry.brand_name,
					product_name: entry.product_name,
					ingredient_text: entry.ingredient_text,
					simplified_ingredients: entry.simplified_ingredients,
					is_verified: entry.is_verified,
					halal_logo_id: productRow.halal_logo_id,
				},
				create: {
					brand_name: entry.brand_name,
					product_name: entry.product_name,
					ingredient_text: entry.ingredient_text,
					simplified_ingredients: entry.simplified_ingredients,
					is_verified: entry.is_verified,
					match_key: entry.match_key,
					halal_logo_id: productRow.halal_logo_id,
				},
			})

			if (totalReferences > 0) {
				migratedButKeptInProduct.push(
					`${label} (Scan:${scanCount} PantryItem:${pantryCount} ActivityLog:${activityCount} Notification:${notificationCount})`,
				)
				console.log(`  [COPIED, KEPT] ${label} — referenced by real records, left in Product.`)
				continue
			}

			// No real references — safe to remove the now-duplicate Product row.
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
