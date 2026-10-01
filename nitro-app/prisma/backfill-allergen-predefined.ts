/**
 * Backfill: Set is_predefined = true for all standard EU/UK 14 major allergens.
 * Run with: bun prisma/backfill-allergen-predefined.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const EU_UK_14_ALLERGENS = [
	'Peanuts',
	'Milk',
	'Eggs',
	'Wheat',
	'Soy',
	'Fish',
	'Shellfish',
	'Tree Nuts',
	'Sesame',
	'Mustard',
	'Crustaceans',
	'Celery',
	'Sulphur Dioxide / Sulphites',
	'Lupin',
	'Molluscs',
]

async function main() {
	console.log('Setting is_predefined = true for standard allergens...\n')

	const result = await prisma.allergen.updateMany({
		where: { name: { in: EU_UK_14_ALLERGENS } },
		data: { is_predefined: true },
	})

	console.log(`Updated ${result.count} allergens to is_predefined = true.`)
}

main()
	.then(async () => {
		await prisma.$disconnect()
		process.exit(0)
	})
	.catch(async (e) => {
		console.error('Backfill failed:', e)
		await prisma.$disconnect()
		process.exit(1)
	})
