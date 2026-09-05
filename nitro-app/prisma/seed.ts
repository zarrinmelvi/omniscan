import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
	await prisma.$transaction(async (tx) => {
		// ---------------------------------------------------------------
		// 1. Clear existing data (children before parents, FK-safe order)
		// ---------------------------------------------------------------
		await tx.flaggedScan.deleteMany()
		await tx.notification.deleteMany()
		await tx.pantryItem.deleteMany()
		await tx.scan.deleteMany()
		await tx.ingredient.deleteMany()
		await tx.ingredientMapping.deleteMany()
		await tx.dietaryProfile.deleteMany()
		await tx.product.deleteMany()
		await tx.recipe.deleteMany()
		await tx.allergen.deleteMany()
		await tx.admin.deleteMany()
		await tx.user.deleteMany()
		await tx.halalLogo.deleteMany()

		console.log('Cleared existing data.')

		// ---------------------------------------------------------------
		// 2. Seed a default HalalLogo (Product.halal_logo_id needs one)
		// ---------------------------------------------------------------
		const halalLogo = await tx.halalLogo.create({
			data: {
				certifying_body: 'JAKIM',
				logo_image: 'https://placehold.co/200x200?text=JAKIM',
				is_accredited: true,
			},
		})
		console.log(`Seeded default halal logo (id: ${halalLogo.id}).`)

		// ---------------------------------------------------------------
		// 3. Seed the default demo user (id 1, assuming a fresh database)
		// ---------------------------------------------------------------
		const hashedPassword = await bcrypt.hash('password123', 10)
		const defaultUser = await tx.user.create({
			data: {
				name: 'Demo User',
				email: 'demo@omniscan.test',
				password: hashedPassword,
				last_active: new Date(),
				status: 'active',
			},
		})
		console.log(`Seeded default user (id: ${defaultUser.id}). Expected id 1 for hardcoded routes to work.`)

		if (defaultUser.id !== 1) {
			console.warn(
				`WARNING: default user id is ${defaultUser.id}, not 1. ` +
					`The hardcoded HARDCODED_USER_ID = 1 in your routes won't match this user. ` +
					`Run this seed against a completely fresh database to guarantee id 1.`,
			)
		}

		// ---------------------------------------------------------------
		// 4. Seed Allergens
		// ---------------------------------------------------------------
		await tx.allergen.createMany({
			data: [
				{ name: 'Milk', scientific_name: 'Lactose' },
				{ name: 'Eggs', scientific_name: 'Ovalbumin' },
				{ name: 'Wheat', scientific_name: 'Gluten' },
				{ name: 'Soy', scientific_name: 'Lecithin' },
				{ name: 'Peanuts', scientific_name: 'Arachis hypogaea' },
			],
		})
		console.log('Seeded 5 allergens.')

		// ---------------------------------------------------------------
		// 5. Seed Products (one per ingredient across all 3 recipes)
		// ---------------------------------------------------------------
		const productNames = [
			'Chicken',
			'Soy Sauce',
			'Vinegar', // Chicken Adobo
			'Pork',
			'Tamarind',
			'Vegetables', // Sinigang
			'Eggs',
			'Milk',
			'Sugar', // Leche Flan
		]

		const productMap = new Map<string, number>()

		for (const name of productNames) {
			const product = await tx.product.create({
				data: {
					brand_name: 'Generic',
					product_name: name,
					ingredient_text: name,
					simplified_ingredients: name,
					is_verified: true,
					halal_logo_id: halalLogo.id,
				},
			})
			productMap.set(name, product.id)
		}
		console.log(`Seeded ${productNames.length} products.`)

		// ---------------------------------------------------------------
		// 6. Seed Recipes + Ingredient join records
		// ---------------------------------------------------------------
		await tx.recipe.create({
			data: {
				name: 'Chicken Adobo',
				instructions: 'Brown the chicken, then simmer in soy sauce, vinegar, garlic, and bay leaves until tender.',
				portions_guide: { servings: 4 },
				ingredients: {
					create: [
						{ quantity_needed: 1.5, unit: 'kg', product_id: productMap.get('Chicken')! },
						{ quantity_needed: 0.5, unit: 'cup', product_id: productMap.get('Soy Sauce')! },
						{ quantity_needed: 0.25, unit: 'cup', product_id: productMap.get('Vinegar')! },
					],
				},
			},
		})

		await tx.recipe.create({
			data: {
				name: 'Sinigang',
				instructions: 'Boil pork until tender, add tamarind broth base, then vegetables until just cooked through.',
				portions_guide: { servings: 6 },
				ingredients: {
					create: [
						{ quantity_needed: 1, unit: 'kg', product_id: productMap.get('Pork')! },
						{ quantity_needed: 3, unit: 'tbsp', product_id: productMap.get('Tamarind')! },
						{ quantity_needed: 0.5, unit: 'kg', product_id: productMap.get('Vegetables')! },
					],
				},
			},
		})

		await tx.recipe.create({
			data: {
				name: 'Leche Flan',
				instructions: 'Whisk eggs with milk and sugar, steam over a caramel-lined mold until set.',
				portions_guide: { servings: 8 },
				ingredients: {
					create: [
						{ quantity_needed: 1.5, unit: 'cup', product_id: productMap.get('Eggs')! },
						{ quantity_needed: 1, unit: 'cup', product_id: productMap.get('Milk')! },
						{ quantity_needed: 0.75, unit: 'cup', product_id: productMap.get('Sugar')! },
					],
				},
			},
		})

		console.log('Seeded 3 recipes with ingredients.')
	})

	console.log('Seeding completed successfully.')
}

main()
	.then(async () => {
		await prisma.$disconnect()
		process.exit(0)
	})
	.catch(async (e) => {
		console.error('Seeding failed:', e)
		await prisma.$disconnect()
		process.exit(1)
	})
