import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import userSeeder from './seeders/user.seeder'
import allergenSeeder from './seeders/allergen.seeder'
import halalLogoSeeder from './seeders/halalLogo.seeder'
import catalogProductSeeder from './seeders/catalogProduct.seeder'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
	console.log('SEEDING....')

	await prisma.$transaction(
		async (tx) => {
			// ---------------------------------------------------------------
			// 1. Clear existing data (children before parents, FK-safe order)
			// ---------------------------------------------------------------
			//await tx.flaggedScan.deleteMany()
			//await tx.notification.deleteMany()
			//await tx.pantryItem.deleteMany()
			//await tx.scan.deleteMany()
			//await tx.ingredient.deleteMany()
			//await tx.ingredientMapping.deleteMany()
			//await tx.dietaryProfile.deleteMany()
			//await tx.product.deleteMany()
			//await tx.recipe.deleteMany()
			//await tx.allergen.deleteMany()
			//await tx.admin.deleteMany()
			//await tx.user.deleteMany()
			//await tx.halalLogo.deleteMany()

			console.log('Cleared existing data.')

			const halalLogo = halalLogoSeeder()
			const result = await tx.halalLogo.createMany({ data: halalLogo, skipDuplicates: true })
			console.log(`Seeded ${result.count} halal logos.`)

			const user = await userSeeder()
			const defaultUser = await tx.user.upsert({
				where: { email: user.email },
				update: {},
				create: user,
			})
			console.log(`Seeded default user (id: ${defaultUser.id}). Expected id 1 for hardcoded routes to work.`)

			if (defaultUser.id !== 1) {
				console.warn(
					`WARNING: default user id is ${defaultUser.id}, not 1. ` +
						`The hardcoded HARDCODED_USER_ID = 1 in your routes won't match this user. ` +
						`Run this seed against a completely fresh database to guarantee id 1.`,
				)
			}

			const allergen = allergenSeeder()
			await tx.allergen.createMany({ data: allergen, skipDuplicates: true })
			console.log('Seeded 5 allergens.')

			// Seed comprehensive IngredientMapping rows for all allergens.
			// scientific_term is UNIQUE in the schema — skipDuplicates prevents re-run errors.
			// Each entry is [scientificTerm, simplifiedConsumerTerm]: the raw/OCR string
			// on the left, and the plain user-friendly label shown in the client app on
			// the right. They must stay DISTINCT so the admin "Simplified Consumer Term"
			// column shows a real translation rather than echoing the scientific term.
			const INGREDIENT_MAPPINGS: Record<string, [string, string][]> = {
				Eggs: [
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
				],
				Milk: [
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
				],
				Peanuts: [
					['peanut', 'Peanut'],
					['peanut oil', 'Peanut oil'],
					['groundnut', 'Peanut'],
					['arachis oil', 'Peanut oil'],
					['monkey nuts', 'Peanuts (in shell)'],
					['groundnut oil', 'Peanut oil'],
					['peanut butter', 'Peanut butter'],
				],
				Wheat: [
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
				],
				Soy: [
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
				],
				Fish: [
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
				],
				Shellfish: [
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
				],
				'Tree Nuts': [
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
				],
				Sesame: [
					['sesame', 'Sesame'],
					['sesame oil', 'Sesame oil'],
					['tahini', 'Sesame paste (tahini)'],
					['sesame seed', 'Sesame seed'],
					['til', 'Sesame seed'],
					['gingelly oil', 'Sesame oil'],
					['benne', 'Sesame seed'],
				],
				Mustard: [
					['mustard', 'Mustard'],
					['mustard seed', 'Mustard seed'],
					['mustard oil', 'Mustard oil'],
					['mustard flour', 'Ground mustard'],
					['mustard leaves', 'Mustard greens'],
					['mustard powder', 'Ground mustard'],
				],
			}

			let totalMappingsSeeded = 0
			for (const [allergenName, terms] of Object.entries(INGREDIENT_MAPPINGS)) {
				const allergenRecord = await tx.allergen.findFirst({ where: { name: allergenName } })
				if (!allergenRecord) {
					console.warn(`Allergen "${allergenName}" not found — skipping ingredient mappings.`)
					continue
				}
				const result = await tx.ingredientMapping.createMany({
					data: terms.map(([scientificTerm, simplifiedTerm]) => ({
						allergen_id: allergenRecord.id,
						scientific_term: scientificTerm,
						simplified_term: simplifiedTerm,
					})),
					skipDuplicates: true,
				})
				totalMappingsSeeded += result.count
			}
			console.log(`Seeded ${totalMappingsSeeded} ingredient mappings across all allergens.`)

			const catalogProduct = catalogProductSeeder()
			const catalogResult = await tx.catalogProduct.createMany({
				data: catalogProduct,
				skipDuplicates: true,
			})
			console.log(`Seeded ${catalogResult.count} catalog products.`)
		},
		{
			maxWait: 15000,
			timeout: 30000,
		},
	)

	console.log('Seeding completed successfully.')
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (e) => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})
