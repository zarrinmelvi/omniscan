import 'dotenv/config'
import { prisma } from '../server/lib/prisma'

/**
 * One-time (re-runnable) backfill for IngredientMapping.simplified_term.
 *
 * The original seed set simplified_term === scientific_term for every row, and
 * seed.ts uses createMany({ skipDuplicates: true }) keyed on the unique
 * scientific_term — so simply re-running the seed will NOT update existing
 * rows. This script updates the simplified_term of any existing mapping to the
 * plain, consumer-friendly label, matched case-insensitively on scientific_term.
 *
 * Safe to re-run: it only issues updates, and rows already carrying the correct
 * simplified_term are left unchanged.
 */

// [scientificTerm, simplifiedConsumerTerm] — must stay in sync with the same
// table in prisma/seed.ts.
const SIMPLIFIED_TERMS: [string, string][] = [
	// Eggs
	['egg', 'Egg'],
	['egg white', 'Egg white'],
	['egg yolk', 'Egg yolk'],
	['albumen', 'Egg white protein'],
	['dried egg', 'Dried egg'],
	['powdered egg', 'Powdered egg'],
	['egg solids', 'Dried whole egg powder'],
	['ovomucin', 'Egg white protein'],
	['ovotransferrin', 'Egg white protein'],
	['lysozyme', 'Egg-derived enzyme'],
	['mayonnaise', 'Mayonnaise (contains egg)'],
	['meringue', 'Meringue (whipped egg white)'],
	['ovalbumin', 'Egg white protein'],
	// Milk
	['milk', 'Milk'],
	['cream', 'Cream'],
	['butter', 'Butter'],
	['cheese', 'Cheese'],
	['lactose', 'Milk sugar'],
	['whey', 'Milk protein (whey)'],
	['casein', 'Milk protein (casein)'],
	['caseinate', 'Milk protein (casein)'],
	['milk powder', 'Powdered milk'],
	['lactalbumin', 'Milk protein'],
	['lactoglobulin', 'Milk protein'],
	['ghee', 'Clarified butter'],
	['dairy', 'Dairy'],
	['skimmed milk', 'Skimmed milk'],
	// Peanuts
	['peanut', 'Peanut'],
	['peanut oil', 'Peanut oil'],
	['groundnut', 'Peanut'],
	['arachis oil', 'Peanut oil'],
	['monkey nuts', 'Peanuts (in shell)'],
	['groundnut oil', 'Peanut oil'],
	['peanut butter', 'Peanut butter'],
	// Wheat
	['wheat', 'Wheat'],
	['flour', 'Wheat flour'],
	['bread crumbs', 'Bread crumbs (wheat)'],
	['gluten', 'Wheat gluten'],
	['semolina', 'Wheat semolina'],
	['spelt', 'Spelt wheat'],
	['kamut', 'Kamut wheat'],
	['bulgur', 'Bulgur wheat'],
	['durum', 'Durum wheat'],
	['farro', 'Farro wheat'],
	['wheat starch', 'Wheat starch'],
	['wheat flour', 'Wheat flour'],
	['whole wheat', 'Whole wheat'],
	// Soy
	['soy', 'Soy'],
	['soya', 'Soy'],
	['soybean', 'Soybean'],
	['tofu', 'Tofu (soy)'],
	['tempeh', 'Tempeh (soy)'],
	['miso', 'Miso (soy paste)'],
	['tamari', 'Tamari (soy sauce)'],
	['edamame', 'Edamame (soybeans)'],
	['soy lecithin', 'Soy emulsifier'],
	['textured vegetable protein', 'Soy protein'],
	['tvp', 'Soy protein'],
	['soy sauce', 'Soy sauce'],
	['soya sauce', 'Soy sauce'],
	// Fish
	['fish', 'Fish'],
	['anchovy', 'Anchovy'],
	['anchovy paste', 'Anchovy paste'],
	['bass', 'Bass (fish)'],
	['flounder', 'Flounder (fish)'],
	['grouper', 'Grouper (fish)'],
	['hake', 'Hake (fish)'],
	['herring', 'Herring (fish)'],
	['mackerel', 'Mackerel (fish)'],
	['perch', 'Perch (fish)'],
	['pollock', 'Pollock (fish)'],
	['salmon', 'Salmon'],
	['tilapia', 'Tilapia (fish)'],
	['trout', 'Trout (fish)'],
	['tuna', 'Tuna'],
	['fish sauce', 'Fish sauce'],
	['fish oil', 'Fish oil'],
	['worcestershire', 'Worcestershire sauce (contains fish)'],
	['cod', 'Cod (fish)'],
	['sardine', 'Sardine (fish)'],
	// Shellfish
	['shellfish', 'Shellfish'],
	['shrimp', 'Shrimp'],
	['prawn', 'Prawn'],
	['crab', 'Crab'],
	['lobster', 'Lobster'],
	['crayfish', 'Crayfish'],
	['langoustine', 'Langoustine'],
	['scallop', 'Scallop'],
	['clam', 'Clam'],
	['oyster', 'Oyster'],
	['mussel', 'Mussel'],
	['squid', 'Squid'],
	['octopus', 'Octopus'],
	['abalone', 'Abalone'],
	// Tree Nuts
	['tree nut', 'Tree nut'],
	['almond', 'Almond'],
	['cashew', 'Cashew'],
	['walnut', 'Walnut'],
	['pecan', 'Pecan'],
	['pistachio', 'Pistachio'],
	['hazelnut', 'Hazelnut'],
	['macadamia', 'Macadamia nut'],
	['brazil nut', 'Brazil nut'],
	['pine nut', 'Pine nut'],
	['chestnut', 'Chestnut'],
	['coconut', 'Coconut'],
	['nut', 'Tree nut'],
	// Sesame
	['sesame', 'Sesame'],
	['sesame oil', 'Sesame oil'],
	['tahini', 'Sesame paste (tahini)'],
	['sesame seed', 'Sesame seed'],
	['til', 'Sesame seed'],
	['gingelly oil', 'Sesame oil'],
	['benne', 'Sesame seed'],
	// Mustard
	['mustard', 'Mustard'],
	['mustard seed', 'Mustard seed'],
	['mustard oil', 'Mustard oil'],
	['mustard flour', 'Ground mustard'],
	['mustard leaves', 'Mustard greens'],
	['mustard powder', 'Ground mustard'],
]

async function backfill() {
	const all = await prisma.ingredientMapping.findMany({
		select: { id: true, scientific_term: true, simplified_term: true },
	})

	const byKey = new Map(SIMPLIFIED_TERMS.map(([sci, simple]) => [sci.toLowerCase(), simple]))

	let updated = 0
	let alreadyCorrect = 0
	let noMapping = 0

	for (const row of all) {
		const target = byKey.get(row.scientific_term.toLowerCase())
		if (!target) {
			noMapping++
			continue
		}
		if (row.simplified_term === target) {
			alreadyCorrect++
			continue
		}
		await prisma.ingredientMapping.update({
			where: { id: row.id },
			data: { simplified_term: target },
		})
		updated++
		console.log(`  [UPDATED] "${row.scientific_term}" -> "${target}"`)
	}

	console.log('\n--- Backfill summary ---')
	console.log(`Rows updated:          ${updated}`)
	console.log(`Already correct:       ${alreadyCorrect}`)
	console.log(`No simplified mapping: ${noMapping} (left unchanged)`)
	console.log(`Total scanned:         ${all.length}`)
}

backfill()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (err) => {
		console.error('Ingredient simplified-term backfill failed:', err)
		await prisma.$disconnect()
		process.exit(1)
	})
