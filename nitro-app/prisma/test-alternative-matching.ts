// prisma/test-alternative-matching.ts
//
// Standalone smoke test for findAlternativeProducts() (server/lib/
// alternative-matching.ts) against the real catalog data. Runs a few
// hardcoded disallowed-ingredient scenarios and prints what comes back,
// so the query logic can be sanity-checked before the AI step (which
// decides the disallowed list for a real user) is built.
//
// Run: bun run prisma/test-alternative-matching.ts

import 'dotenv/config'
import { findAlternativeProducts } from '../server/lib/alternative-matching'
import { prisma } from '../server/lib/prisma'

async function runScenario(label: string, disallowed: string[]) {
	console.log(`\n=== ${label} ===`)
	console.log(`Disallowed: [${disallowed.join(', ') || '(none)'}]`)

	// High limit so we're comparing real totals, not two same-sized
	// top-20 slices that happen to look identical.
	const results = await findAlternativeProducts(disallowed, { limit: 200 })

	console.log(`${results.length} product(s) returned.`)
	return results
}

// Independent ground-truth check, bypassing findAlternativeProducts
// entirely — counts verified products that actually link to the given
// ingredient name. Used to confirm the function's output against a query
// built a completely different way.
async function countVerifiedProductsWithIngredient(ingredientName: string): Promise<number> {
	return prisma.catalogProduct.count({
		where: {
			is_verified: true,
			ingredients: {
				some: {
					catalog_ingredient: { name: ingredientName },
				},
			},
		},
	})
}

async function main() {
	const totalVerified = await prisma.catalogProduct.count({ where: { is_verified: true } })
	console.log(`Total verified CatalogProduct rows in DB: ${totalVerified}`)

	const baseline = await runScenario('No restrictions', [])

	// Salt is close to universal in processed/canned goods — if filtering
	// works at all, this should produce a clearly smaller number, not an
	// identical list.
	const saltCount = await countVerifiedProductsWithIngredient('salt')
	console.log(`(Ground truth: ${saltCount} verified products contain "salt")`)
	const noSalt = await runScenario('No salt', ['salt'])
	console.log(`Expected count if filter works: ${totalVerified - saltCount}. Got: ${noSalt.length}.`)

	const peanutsCount = await countVerifiedProductsWithIngredient('peanuts')
	console.log(`\n(Ground truth: ${peanutsCount} verified products contain "peanuts")`)
	const noPeanuts = await runScenario('No peanuts', ['peanuts'])
	console.log(`Expected count if filter works: ${totalVerified - peanutsCount}. Got: ${noPeanuts.length}.`)

	// Confirm Ding Dong specifically disappears when peanuts are excluded
	// (and confirm whether it was even present in the baseline to begin
	// with — it may be unverified, in which case it's excluded by
	// onlyVerified regardless of the peanut filter).
	const dingDongInBaseline = baseline.some((p) => p.brand_name === 'Ding Dong')
	const dingDongInNoPeanuts = noPeanuts.some((p) => p.brand_name === 'Ding Dong')
	console.log(`\nDing Dong present with no restrictions: ${dingDongInBaseline}`)
	console.log(`Ding Dong present with peanuts excluded: ${dingDongInNoPeanuts}`)

	await runScenario('Ingredient with no catalog matches', ['unobtainium'])

	await prisma.$disconnect()
}

main().catch(async (err) => {
	console.error('Test script failed:', err)
	await prisma.$disconnect()
	process.exit(1)
})
