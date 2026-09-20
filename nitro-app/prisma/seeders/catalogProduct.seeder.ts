import { readFileSync } from 'fs'
import path from 'path'

type SeedRow = {
	brand_name: string
	product_name: string
	ingredient_text: string
	simplified_ingredients: string
	is_verified: boolean
	_allergens_declared_on_label: string[]
	_review_notes: string[]
	_variant_group: string | null
}

/**
 * Mirrors the normalization migrate-catalog-products.ts used when it moved
 * the original 108 rows from Product into CatalogProduct: lowercased,
 * punctuation stripped, but slash-separated variant wording (e.g.
 * "Regular / Hot") is deliberately kept so distinct label variants don't
 * collapse onto the same key.
 *
 * NOTE: reconstructed from the description of the original script, not the
 * literal source — verify this produces the same keys as your already-
 * migrated CatalogProduct rows before relying on it for dedup.
 */
function generateMatchKey(brandName: string, productName: string): string {
	return `${brandName} ${productName}`
		.toLowerCase()
		.replace(/[^\w\s/]/g, '') // strip punctuation, keep word chars/spaces/"/"
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * Reads the 108-row hand-collected market product dataset and shapes it
 * for CatalogProduct. Like the other seeders, this only returns the data —
 * seed.ts does the actual tx.catalogProduct.createMany(...) inside the
 * shared transaction.
 */
export default () => {
	const dataPath = path.join(__dirname, '../seed_products.json')
	const rows: SeedRow[] = JSON.parse(readFileSync(dataPath, 'utf-8'))

	const unverifiedCount = rows.filter((r) => !r.is_verified).length
	if (unverifiedCount > 0) {
		console.log(
			`${unverifiedCount} of ${rows.length} catalog products have is_verified=false — ` +
				`flagged OCR/data issues, should get a manual label check (see review spreadsheet).`,
		)
	}

	return rows.map((row) => ({
		brand_name: row.brand_name,
		product_name: row.product_name,
		ingredient_text: row.ingredient_text,
		simplified_ingredients: row.simplified_ingredients,
		is_verified: row.is_verified,
		match_key: generateMatchKey(row.brand_name, row.product_name),
		variant_group: row._variant_group,
	}))
}
