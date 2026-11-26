/**
 * One-time cleanup: merge legacy duplicate Product rows created before the
 * fuzzy deduplication fix was applied.
 *
 * SAFE BY DEFAULT — runs as a dry run unless the EXECUTE environment variable
 * is set to "true". Always do a dry run first and review the output.
 *
 * Dry run (no writes):
 *   bun prisma/merge-duplicate-products.ts
 *
 * Execute (performs all writes):
 *   EXECUTE=true bun prisma/merge-duplicate-products.ts
 *
 * What it does:
 *   1. Loads all non-deleted Product rows.
 *   2. Groups them by brand + stemmed product name (same logic as findFuzzyProduct).
 *   3. For each group with 2+ members, picks the lowest ID as the master.
 *   4. Inside a per-group transaction, remaps every FK table that points at
 *      duplicate IDs to the master ID, then hard-deletes the duplicate rows.
 *   5. Logs every change and prints a summary at the end.
 *
 * FK tables handled (in safe order):
 *   PantryItem      → product_id   (critical: consumer pantry data)
 *   Scan            → product_id
 *   ActivityLog     → product_id   (nullable)
 *   Notification    → product_id   (nullable)
 *   Ingredient      → product_id
 *   ProductHalalLogo→ product_id   (@@unique constraint — handled with upsert)
 *   Product (self)  → canonical_product_id  (re-points child duplicates at master)
 *   Product         → DELETE duplicates (cascade cleans ProductHalalLogo rows)
 */

import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DRY_RUN = process.env.EXECUTE !== 'true'

// ─── Normalisation helpers (mirror of product-dedup.ts) ──────────────────────

function norm(s: string): string {
	return (s || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')   // strip diacritics
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function stem(name: string): string {
	if (name.length <= 3) return name
	if (name.endsWith('es')) return name.slice(0, -2)
	if (name.endsWith('s'))  return name.slice(0, -1)
	return name
}

function groupKey(brand: string, productName: string): string {
	return `${norm(brand)}|${stem(norm(productName))}`
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductRow {
	id: number
	brand_name: string
	product_name: string
	canonical_product_id: number | null
}

interface DuplicateGroup {
	key: string
	masterId: number
	duplicateIds: number[]
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
	console.log(`\nmerge-duplicate-products — ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✏️  EXECUTE MODE'}`)
	console.log('─'.repeat(60))

	// 1. Load all non-deleted products.
	const allProducts = await prisma.product.findMany({
		where: { deleted_at: null },
		select: { id: true, brand_name: true, product_name: true, canonical_product_id: true },
		orderBy: { id: 'asc' },
	}) as ProductRow[]

	console.log(`Loaded ${allProducts.length} products.`)

	// 2. Group by brand + stemmed name.
	const groups = new Map<string, ProductRow[]>()
	for (const p of allProducts) {
		const key = groupKey(p.brand_name, p.product_name)
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(p)
	}

	// 3. Find groups with duplicates (2+ members that are canonical — i.e. not
	//    already pointing at another master via canonical_product_id).
	const duplicateGroups: DuplicateGroup[] = []
	for (const [key, members] of groups) {
		// Only consider rows that are themselves canonical (not already a known duplicate).
		const canonicals = members.filter((m) => m.canonical_product_id === null)
		if (canonicals.length < 2) continue

		// Lowest id = master (consistent with findCanonicalProduct orderBy id asc).
		const [master, ...duplicates] = canonicals  // already sorted by id asc
		duplicateGroups.push({
			key,
			masterId: master.id,
			duplicateIds: duplicates.map((d) => d.id),
		})
	}

	if (duplicateGroups.length === 0) {
		console.log('\n✅ No duplicate groups found. Database is clean.')
		return
	}

	console.log(`\nFound ${duplicateGroups.length} duplicate group(s):\n`)

	// 4. Print preview and collect affected-row counts.
	for (const group of duplicateGroups) {
		const masterProduct = allProducts.find((p) => p.id === group.masterId)!
		const dupProducts = group.duplicateIds.map((id) => allProducts.find((p) => p.id === id)!)

		const pantryCount = await prisma.pantryItem.count({
			where: { product_id: { in: group.duplicateIds } },
		})
		const scanCount = await prisma.scan.count({
			where: { product_id: { in: group.duplicateIds } },
		})

		console.log(`  GROUP: "${masterProduct.brand_name} — ${masterProduct.product_name}"`)
		console.log(`    Master   : #${group.masterId} "${masterProduct.product_name}"`)
		console.log(`    Duplicate: ${dupProducts.map((d) => `#${d.id} "${d.product_name}"`).join(', ')}`)
		console.log(`    Affected : ${pantryCount} pantry item(s), ${scanCount} scan(s)`)
		console.log()
	}

	if (DRY_RUN) {
		console.log('─'.repeat(60))
		console.log('Dry run complete. Set EXECUTE=true to apply these changes.')
		return
	}

	// 5. Execute — one transaction per group.
	console.log('─'.repeat(60))
	console.log('Executing merges…\n')

	let groupsOk = 0
	let groupsFailed = 0
	let totalPantryMoved = 0
	let totalScansMoved = 0
	let totalProductsDeleted = 0

	for (const group of duplicateGroups) {
		const masterProduct = allProducts.find((p) => p.id === group.masterId)!
		const { masterId, duplicateIds } = group

		try {
			const result = await prisma.$transaction(async (tx) => {
				// ── a. PantryItem — most critical, runs first ──────────────────
				const pantryUpdate = await tx.pantryItem.updateMany({
					where: { product_id: { in: duplicateIds } },
					data: { product_id: masterId },
				})

				// ── b. Scan ────────────────────────────────────────────────────
				const scanUpdate = await tx.scan.updateMany({
					where: { product_id: { in: duplicateIds } },
					data: { product_id: masterId },
				})

				// ── c. ActivityLog (nullable FK) ───────────────────────────────
				await tx.activityLog.updateMany({
					where: { product_id: { in: duplicateIds } },
					data: { product_id: masterId },
				})

				// ── d. Notification (nullable FK) ──────────────────────────────
				await tx.notification.updateMany({
					where: { product_id: { in: duplicateIds } },
					data: { product_id: masterId },
				})

				// ── e. Ingredient ──────────────────────────────────────────────
				await tx.ingredient.updateMany({
					where: { product_id: { in: duplicateIds } },
					data: { product_id: masterId },
				})

				// ── f. ProductHalalLogo — must respect @@unique([product_id, halal_logo_id])
				//    Fetch the duplicate rows, insert on master (skipDuplicates),
				//    then let the cascade delete clean them up with the product rows.
				const dupHalalLinks = await tx.productHalalLogo.findMany({
					where: { product_id: { in: duplicateIds } },
					select: { halal_logo_id: true },
				})
				if (dupHalalLinks.length > 0) {
					await tx.productHalalLogo.createMany({
						data: dupHalalLinks.map((l) => ({
							product_id: masterId,
							halal_logo_id: l.halal_logo_id,
						})),
						skipDuplicates: true,
					})
					// Explicit delete so the cascade doesn't silently fail on soft-deleted rows.
					await tx.productHalalLogo.deleteMany({
						where: { product_id: { in: duplicateIds } },
					})
				}

				// ── g. Product self-reference — re-point any rows that used a
				//    duplicate as their canonical parent to the true master.
				await tx.product.updateMany({
					where: { canonical_product_id: { in: duplicateIds } },
					data: { canonical_product_id: masterId },
				})

				// ── h. Delete the now-orphaned duplicate Product rows.
				//    All remaining FKs (ProductHalalLogo) are already gone above.
				const deleted = await tx.product.deleteMany({
					where: { id: { in: duplicateIds } },
				})

				return { pantryMoved: pantryUpdate.count, scansMoved: scanUpdate.count, deleted: deleted.count }
			})

			console.log(
				`  [OK]  #${masterId} "${masterProduct.product_name}" — ` +
				`merged ${group.duplicateIds.length} duplicate(s), ` +
				`moved ${result.pantryMoved} pantry item(s), ${result.scansMoved} scan(s), ` +
				`deleted ${result.deleted} product row(s)`,
			)
			groupsOk++
			totalPantryMoved    += result.pantryMoved
			totalScansMoved     += result.scansMoved
			totalProductsDeleted += result.deleted
		} catch (err) {
			console.error(
				`  [FAIL] Group key "${group.key}" (master #${masterId}, duplicates ${duplicateIds.join(', ')}):`,
				err,
			)
			groupsFailed++
		}
	}

	// 6. Summary.
	console.log()
	console.log('─'.repeat(60))
	console.log(`  Groups merged:   ${groupsOk}`)
	console.log(`  Groups failed:   ${groupsFailed}`)
	console.log(`  Pantry items re-pointed: ${totalPantryMoved}`)
	console.log(`  Scans re-pointed:        ${totalScansMoved}`)
	console.log(`  Product rows deleted:    ${totalProductsDeleted}`)
	console.log('─'.repeat(60))

	if (groupsFailed === 0) {
		console.log('✅ All groups merged successfully.')
	} else {
		console.log(`⚠️  ${groupsFailed} group(s) failed — see errors above. Re-run to retry.`)
	}
}

main()
	.then(async () => {
		await prisma.$disconnect()
		process.exit(0)
	})
	.catch(async (e) => {
		console.error('\nScript failed unexpectedly:', e)
		await prisma.$disconnect()
		process.exit(1)
	})
