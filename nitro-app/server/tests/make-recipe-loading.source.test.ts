// Preservation/regression (source level): Make Recipe loading indicator wiring.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const UI = resolve(__dirname, '../../../omniscan-ui/src')
const read = (p: string) => readFileSync(resolve(UI, p), 'utf-8')

describe('Make Recipe loading wiring', () => {
	for (const file of ['views/RecipeSuggestions.vue', 'views/HomePage.vue']) {
		it(`${file} shows ion-loading, passes :making, and guards re-entry`, () => {
			const src = read(file)
			expect(src).toMatch(/IonLoading/)
			expect(src).toMatch(/<ion-loading[^>]*:is-open="makingId !== null"[^>]*message="Making recipe\.\.\."/)
			expect(src).toMatch(/<RecipeDetailModal[^>]*:making="makingId !== null"/s)
			expect(src).toMatch(/if \(makingId\.value !== null\) return/)
			expect(src).toMatch(/finally\s*{\s*makingId\.value = null/)
		})
	}

	it('RecipeDetailModal disables the button, shows a spinner and ignores clicks while making', () => {
		const src = read('components/RecipeDetailModal.vue')
		expect(src).toMatch(/making\?:\s*boolean/)
		expect(src).toMatch(/:disabled="making"/)
		expect(src).toContain('<ion-spinner v-if="making"')
		expect(src).toMatch(/if \(props\.making\) return/)
	})
})
