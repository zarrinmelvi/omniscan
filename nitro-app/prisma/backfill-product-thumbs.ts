/**
 * Backfill: generate image_thumb_base64 for products that only have a full image.
 * Run once, after the migration and `prisma generate`:
 *   bun prisma/backfill-product-thumbs.ts
 * Safe to re-run: only touches rows where image_thumb_base64 IS NULL.
 */

import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { makeThumbDataUri } from '../server/lib/image-thumb'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const BATCH_SIZE = 20

async function main() {
	let lastId = 0
	let updated = 0
	let failed = 0

	for (;;) {
		const batch = await prisma.product.findMany({
			where: { id: { gt: lastId }, image_thumb_base64: null, image_base64: { not: null } },
			select: { id: true, image_base64: true },
			orderBy: { id: 'asc' },
			take: BATCH_SIZE,
		})
		if (batch.length === 0) break

		for (const row of batch) {
			lastId = row.id
			const thumb = await makeThumbDataUri(row.image_base64)
			if (!thumb) {
				failed++
				console.warn(`Product ${row.id}: could not build thumbnail, skipped.`)
				continue
			}
			await prisma.product.update({ where: { id: row.id }, data: { image_thumb_base64: thumb } })
			updated++
		}
		console.log(`Progress: ${updated} updated, ${failed} skipped (last id ${lastId})`)
	}

	console.log(`Done. ${updated} thumbnails written, ${failed} skipped.`)
}

main()
	.then(async () => {
		await prisma.$disconnect()
		await pool.end()
		process.exit(0)
	})
	.catch(async (e) => {
		console.error('Backfill failed:', e)
		await prisma.$disconnect()
		process.exit(1)
	})
