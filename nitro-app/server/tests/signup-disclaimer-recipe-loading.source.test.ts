// Bug condition exploration (source level): disclaimer text and Make Recipe loading
// indicator. EXPECTED TO FAIL on unfixed code.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const UI = resolve(__dirname, '../../../omniscan-ui/src')
const read = (p: string) => readFileSync(p, 'utf-8')
const DISCLAIMER = 'Verify your email within 7 days or your account will be automatically deleted.'

describe('Bug condition: 7-day disclaimer', () => {
	const files: Array<[string, string]> = [
		['RegisterPage.vue', resolve(UI, 'views/RegisterPage.vue')],
		['CheckEmailPage.vue', resolve(UI, 'views/CheckEmailPage.vue')],
		['server/utils/email.ts', resolve(__dirname, '../utils/email.ts')],
	]
	for (const [name, path] of files) {
		it(`${name} contains the disclaimer`, () => {
			expect(read(path)).toContain(DISCLAIMER)
		})
	}
})

describe('Bug condition: Make Recipe loading indicator', () => {
	for (const file of ['views/RecipeSuggestions.vue', 'views/HomePage.vue']) {
		it(`${file} binds ion-loading to makingId`, () => {
			const src = read(resolve(UI, file))
			expect(src).toMatch(/<ion-loading[^>]*makingId/)
		})
	}

	it('RecipeDetailModal has a making prop and a spinner on the make button', () => {
		const src = read(resolve(UI, 'components/RecipeDetailModal.vue'))
		expect(src).toMatch(/making\??:\s*boolean/)
		expect(src).toContain('ion-spinner')
	})
})
