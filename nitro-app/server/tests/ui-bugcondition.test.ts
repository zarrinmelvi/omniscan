/**
 * Task 1: Bug condition exploration tests (frontend source checks).
 * Reads omniscan-ui .vue files as text. Expected to FAIL on unfixed code.
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 1.10
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const UI = resolve(__dirname, '../../../omniscan-ui/src')
const read = (rel: string) => readFileSync(resolve(UI, rel), 'utf-8')

/** Returns the <template> loading branch (from `v-if="isLoading"` to the next sibling v-else/v-if). */
function loadingBranch(src: string): string {
	const i = src.indexOf('v-if="isLoading"')
	if (i < 0) return ''
	const rest = src.slice(i)
	const next = rest.slice(1).search(/\sv-(else-if|else)=|\sv-if="(?!isLoading)/)
	return next < 0 ? rest.slice(0, 600) : rest.slice(0, next + 1)
}

/** True if the source has a dark-palette CSS rule for a selector fragment. */
function hasDarkRule(src: string, selectorFragment: string): boolean {
	const re = /html\.ion-palette-dark[^{]*\{/g
	let m: RegExpExecArray | null
	while ((m = re.exec(src))) {
		if (m[0].includes(selectorFragment)) return true
	}
	return false
}

describe('D2 skeletons', () => {
	it.each([
		['views/PantryItemDetail.vue'],
		['views/ProfilePage.vue'],
		['views/RecipeSuggestions.vue'],
	])('%s loading branch uses SkeletonCard and not a lone ion-spinner', (file) => {
		const branch = loadingBranch(read(file))
		expect(branch).toContain('skeleton-card')
		expect(branch).not.toContain('ion-spinner')
	})

	it('SkeletonCard.vue has hero, recipe and profile variants', () => {
		const src = read('components/SkeletonCard.vue')
		for (const v of ['hero', 'recipe', 'profile']) expect(src).toContain(`'${v}'`)
	})
})

describe('D4 auth pages dark palette', () => {
	it.each([
		['views/ForgotPasswordPage.vue'],
		['views/ResetPasswordPage.vue'],
		['views/VerifyEmailPage.vue'],
		['views/CheckEmailPage.vue'],
	])('%s has an html.ion-palette-dark rule using #0f172a (and #1e293b where it has inputs)', (file) => {
		const src = read(file)
		expect(src).toMatch(/html\.ion-palette-dark/)
		expect(src).toContain('#0f172a')
		if (src.includes('custom-input')) expect(src).toContain('#1e293b')
	})
})

describe('D5 scan contrast dark rules', () => {
	it('ScanPage.vue has dark rules for .back-prompt-text strong and .skip-btn', () => {
		const src = read('views/ScanPage.vue')
		expect(hasDarkRule(src, '.back-prompt-text strong')).toBe(true)
		expect(hasDarkRule(src, '.skip-btn')).toBe(true)
	})

	it('ScanResultModal.vue has dark rules for alt name/descriptor, category select and strong labels', () => {
		const src = read('components/ScanResultModal.vue')
		expect(hasDarkRule(src, '.alt-row__name')).toBe(true)
		expect(hasDarkRule(src, '.alt-row__descriptor')).toBe(true)
		expect(hasDarkRule(src, '.category-select')).toBe(true)
		expect(hasDarkRule(src, '.field-label--strong')).toBe(true)
	})
})
