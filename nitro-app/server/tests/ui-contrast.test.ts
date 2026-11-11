/**
 * Group F: computed WCAG contrast for the dark-mode colors chosen in
 * ScanPage.vue and ScanResultModal.vue. Reads the .vue sources as text.
 *
 * Validates: Requirements 2.8, 2.9, 2.10
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const UI = resolve(__dirname, '../../../omniscan-ui/src')
const read = (rel: string) => readFileSync(resolve(UI, rel), 'utf-8')

function luminance(hex: string): number {
	const n = parseInt(hex.slice(1), 16)
	const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
		const c = v / 255
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
	})
	return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
function ratio(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (hi + 0.05) / (lo + 0.05)
}

/** Value of a declaration inside the dark rule whose selector contains `selector`. */
function darkValue(src: string, selector: string, prop: string): string {
	const re = /(html\.ion-palette-dark[^{]*)\{([^}]*)\}/g
	let m: RegExpExecArray | null
	while ((m = re.exec(src))) {
		if (!m[1].includes(selector)) continue
		const d = new RegExp(`(?<![\\w-])${prop.replace(/[-]/g, '\\-')}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(m[2])
		if (d) return d[1]
	}
	throw new Error(`no dark ${prop} for ${selector}`)
}

const PAGE = '#0f172a'
const CARD = '#1e293b'

describe('F dark contrast >= 4.5', () => {
	const scan = read('views/ScanPage.vue')
	const modal = read('components/ScanResultModal.vue')

	it.each([
		['back-prompt-text', scan, '.back-prompt-text {', 'color', CARD],
		['back-prompt-text strong', scan, '.back-prompt-text strong', 'color', CARD],
		['skip-btn', scan, '.skip-btn', '--color', CARD],
		['alt-row__name', modal, '.alt-row__name', 'color', PAGE],
		['alt-row__descriptor', modal, '.alt-row__descriptor', 'color', PAGE],
		['category-select', modal, '.category-select {', 'color', CARD],
		['field-label--strong', modal, '.field-label--strong', 'color', PAGE],
	])('%s', (_n, src, sel, prop, bg) => {
		const selector = sel.replace(/ \{$/, '')
		const re = new RegExp(`html\\.ion-palette-dark ${selector.replace(/[.]/g, '\\.')}\\s*\\{`)
		expect(re.test(src as string) || (src as string).includes(selector)).toBe(true)
		const fg = darkValue(src as string, selector, prop as string)
		expect(ratio(fg, bg as string)).toBeGreaterThanOrEqual(4.5)
	})
})
