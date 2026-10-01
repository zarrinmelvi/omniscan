/**
 * Backfill: Add missing EU/UK 14 major allergens that are absent from the DB.
 *
 * Missing allergens (already have: Peanuts, Milk, Eggs, Wheat, Soy, Fish,
 * Shellfish, Tree Nuts, Sesame, Mustard):
 *   - Crustaceans
 *   - Celery
 *   - Sulphur Dioxide / Sulphites
 *   - Lupin
 *   - Molluscs
 *
 * Run with:  tsx prisma/backfill-missing-allergens.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const MISSING_ALLERGENS: {
	name: string
	scientific_name: string
	mappings: [string, string][]
}[] = [
	{
		name: 'Crustaceans',
		scientific_name: 'Crustacea',
		mappings: [
			['crustacean', 'Crustacean'],
			['shrimp', 'Shrimp'],
			['prawn', 'Prawn'],
			['crab', 'Crab'],
			['lobster', 'Lobster'],
			['crayfish', 'Crayfish'],
			['langoustine', 'Langoustine'],
			['barnacle', 'Barnacle'],
			['krill', 'Krill'],
		],
	},
	{
		name: 'Celery',
		scientific_name: 'Apium graveolens',
		mappings: [
			['celery', 'Celery'],
			['celeriac', 'Celeriac (celery root)'],
			['celery seed', 'Celery seed'],
			['celery salt', 'Celery salt'],
			['celery oil', 'Celery oil'],
			['celery extract', 'Celery extract'],
		],
	},
	{
		name: 'Sulphur Dioxide / Sulphites',
		scientific_name: 'Sulphur dioxide (SO₂)',
		mappings: [
			['sulphite', 'Sulphite preservative'],
			['sulfite', 'Sulphite preservative'],
			['sulphur dioxide', 'Sulphur dioxide preservative'],
			['sulfur dioxide', 'Sulphur dioxide preservative'],
			['e220', 'Sulphur dioxide (E220)'],
			['e221', 'Sodium sulphite (E221)'],
			['e222', 'Sodium bisulphite (E222)'],
			['e223', 'Sodium metabisulphite (E223)'],
			['e224', 'Potassium metabisulphite (E224)'],
			['e226', 'Calcium sulphite (E226)'],
			['e227', 'Calcium bisulphite (E227)'],
			['e228', 'Potassium bisulphite (E228)'],
			['sodium metabisulfite', 'Sodium metabisulphite'],
			['potassium metabisulfite', 'Potassium metabisulphite'],
		],
	},
	{
		name: 'Lupin',
		scientific_name: 'Lupinus',
		mappings: [
			['lupin', 'Lupin'],
			['lupine', 'Lupin'],
			['lupin flour', 'Lupin flour'],
			['lupin seed', 'Lupin seed'],
			['lupin protein', 'Lupin protein'],
			['lupin bean', 'Lupin bean'],
		],
	},
	{
		name: 'Molluscs',
		scientific_name: 'Mollusca',
		mappings: [
			['mollusc', 'Mollusc'],
			['mollusk', 'Mollusc'],
			['squid', 'Squid'],
			['octopus', 'Octopus'],
			['clam', 'Clam'],
			['oyster', 'Oyster'],
			['mussel', 'Mussel'],
			['scallop', 'Scallop'],
			['abalone', 'Abalone'],
			['snail', 'Snail'],
			['whelk', 'Whelk'],
			['cockle', 'Cockle'],
			['limpet', 'Limpet'],
		],
	},
]

async function main() {
	console.log('Backfilling missing allergens...\n')

	let allergensAdded = 0
	let mappingsAdded = 0

	for (const entry of MISSING_ALLERGENS) {
		// Upsert the allergen — if it already exists by name, skip creation
		const existing = await prisma.allergen.findFirst({ where: { name: entry.name } })

		let allergenId: number

		if (existing) {
			console.log(`  ✓ Allergen "${entry.name}" already exists (id: ${existing.id}) — skipping creation.`)
			allergenId = existing.id
		} else {
			const created = await prisma.allergen.create({
				data: {
					name: entry.name,
					scientific_name: entry.scientific_name,
					is_predefined: false,
				},
			})
			allergenId = created.id
			allergensAdded++
			console.log(`  + Created allergen "${entry.name}" (id: ${allergenId})`)
		}

		// Add ingredient mappings (skipDuplicates on unique scientific_term)
		const result = await prisma.ingredientMapping.createMany({
			data: entry.mappings.map(([scientificTerm, simplifiedTerm]) => ({
				allergen_id: allergenId,
				scientific_term: scientificTerm,
				simplified_term: simplifiedTerm,
			})),
			skipDuplicates: true,
		})

		mappingsAdded += result.count
		console.log(`    → Added ${result.count} ingredient mappings for "${entry.name}"`)
	}

	console.log(`\nDone. Added ${allergensAdded} allergens and ${mappingsAdded} ingredient mappings.`)
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
