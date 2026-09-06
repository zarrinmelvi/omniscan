import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import userSeeder from './seeders/user.seeder'
import allergenSeeder from './seeders/allergen.seeder'
import { halalLogoSeeder } from './seeders/halalLogo.seeder'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
	console.log('SEEDING....')

	await prisma.$transaction(async (tx) => {
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
		const result = await tx.halalLogo.createMany({ data: halalLogo })
		console.log(`Seeded ${result.count} halal logos.`)

		const user = await userSeeder()
		const defaultUser = await tx.user.create({
			data: user,
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
		await tx.allergen.createMany({ data: allergen })
		console.log('Seeded 5 allergens.')
	})

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
