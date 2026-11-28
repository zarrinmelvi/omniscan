/**
 * Restore core predefined allergens and their default ingredient mappings.
 *
 * Safe to run against a live database at any time:
 *   - Existing allergen rows: sets is_predefined = true, touches nothing else
 *     (scientific_name and admin customisations are preserved).
 *   - Deleted/missing allergen rows: re-creates the allergen with its canonical
 *     scientific name and is_predefined = true.
 *   - Ingredient mappings: only seeded when an allergen currently has 0 mappings.
 *     If mappings already exist (even partially), the existing set is left untouched.
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

/**
 * Default ingredient mapping aliases for each core allergen.
 * Derived from the ALLERGEN_DATASET built for the frontend, inlined here so the
 * script remains self-contained and runnable with plain `bun` without cross-
 * package imports.
 *
 * Keys match CORE_ALLERGENS[n].name exactly.
 * Each alias becomes one IngredientMapping row (scientific_term = simplified_term = alias).
 */
const CORE_ALLERGEN_MAPPINGS: Record<string, string[]> = {
	'Peanuts': [
		'groundnut', 'groundnuts', 'monkey nuts', 'peanut butter', 'peanut oil',
		'peanut flour', 'arachis oil', 'peanut protein',
	],
	'Milk': [
		'milk', 'lactose', 'casein', 'whey', 'butter', 'cream', 'cheese', 'yogurt',
		'dairy', 'milk powder', 'skimmed milk', 'buttermilk', 'lactalbumin',
		'lactoglobulin', 'milk protein', 'milk solids', 'ghee',
	],
	'Eggs': [
		'egg', 'egg white', 'egg yolk', 'albumin', 'ovalbumin', 'mayonnaise',
		'meringue', 'egg powder', 'dried egg', 'egg lecithin', 'lysozyme',
	],
	'Wheat': [
		'wheat flour', 'semolina', 'durum', 'spelt', 'bulgur', 'farina',
		'wheat germ', 'wheat starch', 'wheat bran', 'einkorn', 'emmer', 'kamut',
		'wheat protein', 'vital wheat gluten',
	],
	'Soy': [
		'soy', 'soya', 'soybean', 'soy protein', 'soy flour', 'soy milk',
		'soy sauce', 'tofu', 'miso', 'tempeh', 'edamame', 'soy lecithin',
		'textured soy protein', 'soy isolate', 'soybean oil',
	],
	'Fish': [
		'salmon', 'cod', 'tuna', 'mackerel', 'herring', 'anchovy', 'sardine',
		'trout', 'haddock', 'halibut', 'plaice', 'flounder', 'sole',
		'fish sauce', 'fish extract', 'fish gelatin',
	],
	'Shellfish': [
		'shellfish', 'crustacean', 'mollusc', 'prawn', 'shrimp', 'crab',
		'lobster', 'crayfish', 'oyster', 'mussel', 'scallop', 'squid', 'clam',
	],
	'Tree Nuts': [
		'walnut', 'hazelnut', 'almond', 'cashew', 'pecan', 'pistachio',
		'brazil nut', 'macadamia', 'pine nut', 'chestnut', 'nut oil',
		'mixed nuts', 'tree nut extract',
	],
	'Sesame': [
		'sesame seed', 'tahini', 'sesame oil', 'gingelly oil', 'til',
		'benne seed', 'sesame flour', 'sesame paste',
	],
	'Mustard': [
		'mustard', 'mustard seed', 'mustard flour', 'mustard oil', 'mustard powder',
		'mustard leaves', 'dijon mustard', 'yellow mustard', 'brown mustard',
	],
	'Crustaceans': [
		'prawn', 'shrimp', 'crab', 'lobster', 'crayfish', 'krill',
		'shrimp paste', 'dried shrimp', 'shrimp extract', 'crab meat',
		'crab paste', 'imitation crab', 'surimi',
	],
	'Celery': [
		'celery', 'celery seed', 'celery salt', 'celery oil', 'celery extract',
		'celeriac', 'celeriac root', 'knob celery',
	],
	'Sulphur Dioxide / Sulphites': [
		'sulfur dioxide', 'sodium sulphite', 'potassium sulphite',
		'sodium metabisulphite', 'potassium metabisulphite',
		'E220', 'E221', 'E222', 'E223', 'E224', 'E225', 'E226', 'E227', 'E228',
		'sulphite', 'sulfite',
	],
	'Lupin': [
		'lupin flour', 'lupin seed', 'lupin bean', 'lupine flour', 'lupin protein',
	],
	'Molluscs': [
		'octopus', 'squid', 'calamari', 'mussel', 'oyster', 'scallop',
		'abalone', 'snail', 'escargot', 'cuttlefish', 'squid ink',
		'oyster sauce', 'oyster extract', 'bivalve',
	],
}

async function main() {
	console.log('Restoring core predefined allergens and their ingredient mappings...\n')

	let allergenCreated = 0
	let allergenRestored = 0
	let allergenOk = 0
	let mappingsSeeded = 0
	let mappingsSkipped = 0
	let mappingsAlreadyPresent = 0

	for (const entry of CORE_ALLERGENS) {
		let allergenId: number
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
			allergenId = row.id
			allergenCreated++
		} else if (!existing.is_predefined) {
			// Row exists but was demoted — restore the flag only.
			await prisma.allergen.update({
				where: { id: existing.id },
				data: { is_predefined: true },
			})
			console.log(`  [RESTORED] "${entry.name}" (id: ${existing.id}) — is_predefined set to true`)
			allergenId = existing.id
			allergenRestored++
		} else {
			// Already correct — no write needed.
			console.log(`  [OK]       "${entry.name}" (id: ${existing.id}) — already predefined`)
			allergenId = existing.id
			allergenOk++
		}

		// ── Seed ingredient mappings if the allergen currently has none ──────────
		const mappingCount = await prisma.ingredientMapping.count({
			where: { allergen_id: allergenId },
		})

		const defaultAliases = CORE_ALLERGEN_MAPPINGS[entry.name] ?? []

		if (mappingCount > 0) {
			console.log(`             └─ ${mappingCount} mapping(s) already present — skipped`)
			mappingsAlreadyPresent += mappingCount
			continue
		}

		if (defaultAliases.length === 0) {
			console.log(`             └─ No default aliases defined — skipping mapping seed`)
			continue
		}

		let seededForThis = 0
		let skippedForThis = 0
		for (const alias of defaultAliases) {
			try {
				await prisma.ingredientMapping.create({
					data: {
						scientific_term: alias,
						simplified_term: alias,
						allergen_id: allergenId,
					},
				})
				seededForThis++
			} catch (err: any) {
				if (err?.code === 'P2002') {
					// scientific_term is globally unique — already claimed by another allergen.
					console.warn(`             ⚠  Alias "${alias}" already mapped to a different allergen — skipped`)
					skippedForThis++
				} else {
					throw err
				}
			}
		}
		console.log(`             └─ Seeded ${seededForThis} mapping(s)${skippedForThis ? `, skipped ${skippedForThis} (conflict)` : ''}`)
		mappingsSeeded += seededForThis
		mappingsSkipped += skippedForThis
	}

	console.log('\n──────────────────────────────────────────')
	console.log(`  Allergens created:           ${allergenCreated}`)
	console.log(`  Allergens flag restored:     ${allergenRestored}`)
	console.log(`  Allergens already OK:        ${allergenOk}`)
	console.log(`  Mappings seeded:             ${mappingsSeeded}`)
	console.log(`  Mappings skipped (conflict): ${mappingsSkipped}`)
	console.log(`  Mappings already present:    ${mappingsAlreadyPresent}`)
	console.log(`  Total allergens checked:     ${CORE_ALLERGENS.length}`)
	console.log('──────────────────────────────────────────')
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
