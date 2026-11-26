/**
 * Restore core predefined allergens.
 *
 * Safe to run against a live database at any time:
 *   - Existing rows: sets is_predefined = true, touches nothing else
 *     (scientific_name, ingredient mappings, and admin customisations are preserved).
 *   - Deleted/missing rows: re-creates the allergen with its canonical
 *     scientific name and is_predefined = true.
 *   - No other tables are touched (users, products, pantry items, etc.).
 *
 * Run locally / against production (same Neon DB):
 *   bun prisma/restore-core-allergens.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Canonical list of core predefined allergens.
// Names must match exactly what the admin portal and consumer app expect.
const CORE_ALLERGENS: { name: string; scientific_name: string }[] = [
	{ name: 'Peanuts',                       scientific_name: 'Arachis hypogaea'      },
	{ name: 'Milk',                           scientific_name: 'Lactose'               },
	{ name: 'Eggs',                           scientific_name: 'Ovalbumin'             },
	{ name: 'Wheat',                          scientific_name: 'Gluten'                },
	{ name: 'Soy',                            scientific_name: 'Lecithin'              },
	{ name: 'Fish',                           scientific_name: 'Parvalbumin'           },
	{ name: 'Shellfish',                      scientific_name: 'Crustacea/Mollusca'    },
	{ name: 'Tree Nuts',                      scientific_name: 'Juglans regia'         },
	{ name: 'Sesame',                         scientific_name: 'Sesamum indicum'       },
	{ name: 'Mustard',                        scientific_name: 'Sinapis alba'          },
	{ name: 'Crustaceans',                    scientific_name: 'Crustacea'             },
	{ name: 'Celery',                         scientific_name: 'Apium graveolens'      },
	{ name: 'Sulphur Dioxide / Sulphites',    scientific_name: 'Sulphur dioxide (SO₂)' },
	{ name: 'Lupin',                          scientific_name: 'Lupinus'               },
	{ name: 'Molluscs',                       scientific_name: 'Mollusca'              },
]

async function main() {
	console.log('Restoring core predefined allergens...\n')

	let created = 0
	let updated = 0
	let alreadyCorrect = 0

	for (const entry of CORE_ALLERGENS) {
		const existing = await prisma.allergen.findFirst({ where: { name: entry.name } })

		if (!existing) {
			// Row was deleted — re-create it.
			const row = await prisma.allergen.create({
				data: {
					name: entry.name,
					scientific_name: entry.scientific_name,
					is_predefined: true,
				},
			})
			console.log(`  [CREATED]  "${entry.name}" (new id: ${row.id})`)
			created++
		} else if (!existing.is_predefined) {
			// Row exists but was demoted — restore the flag only.
			await prisma.allergen.update({
				where: { id: existing.id },
				data: { is_predefined: true },
			})
			console.log(`  [RESTORED] "${entry.name}" (id: ${existing.id}) — is_predefined set to true`)
			updated++
		} else {
			// Already correct — no write needed.
			console.log(`  [OK]       "${entry.name}" (id: ${existing.id}) — already predefined`)
			alreadyCorrect++
		}
	}

	console.log('\n─────────────────────────────────────')
	console.log(`  Created:        ${created}`)
	console.log(`  Restored flag:  ${updated}`)
	console.log(`  Already OK:     ${alreadyCorrect}`)
	console.log(`  Total checked:  ${CORE_ALLERGENS.length}`)
	console.log('─────────────────────────────────────')
	console.log('Done. No other tables were modified.')
}

main()
	.then(async () => {
		await prisma.$disconnect()
		process.exit(0)
	})
	.catch(async (e) => {
		console.error('\nScript failed:', e)
		await prisma.$disconnect()
		process.exit(1)
	})
