/**
 * Task 2: Preservation tests (frontend source checks). Read omniscan-ui files as
 * text and compare against a snapshot taken on UNFIXED code
 * (fixtures/ui-preservation-snapshot.json). Must PASS before and after the fix.
 *
 * - dark-mode.css is byte-for-byte unchanged (sha256).
 * - Every pre-existing light-mode (non-dark) CSS rule in the touched .vue files is
 *   still present (additions are allowed, removals/edits are not). This also
 *   covers .quantity-input / .pieces-input / .unit-select in ScanResultModal.
 * - Login/Register dark rules are unchanged.
 *
 * Validates: Requirements 3.6, 3.7, 3.8
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const UI = resolve(__dirname, '../../../omniscan-ui/src')
const snapshot = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/ui-preservation-snapshot.json'), 'utf-8')) as {
	darkModeCssSha256: string
	lightRules: Record<string, string[]>
	darkRules: Record<string, string[]>
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
function currentRules(file: string): string[] {
	const src = readFileSync(resolve(UI, file), 'utf-8')
	const css = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
	return (css.match(/[^{}]+\{[^{}]*\}/g) || []).map(norm)
}

describe('dark-mode.css', () => {
	it('is unchanged (sha256)', () => {
		const hash = createHash('sha256').update(readFileSync(resolve(UI, 'theme/dark-mode.css'))).digest('hex')
		expect(hash).toBe(snapshot.darkModeCssSha256)
	})
})

describe('light-mode rules are preserved', () => {
	it.each(Object.keys(snapshot.lightRules))('%s keeps every original non-dark rule', (file) => {
		const current = new Set(currentRules(file))
		const missing = snapshot.lightRules[file].filter((r) => !current.has(r))
		expect(missing).toEqual([])
	})

	it('ScanResultModal still defines the quantity / pieces / unit controls', () => {
		const rules = snapshot.lightRules['components/ScanResultModal.vue']
		for (const sel of ['.quantity-input {', '.pieces-input {', '.unit-select {']) {
			expect(rules.some((r) => r.startsWith(sel))).toBe(true)
		}
	})
})

describe('Login / Register dark rules are unchanged', () => {
	it.each(Object.keys(snapshot.darkRules))('%s dark rules are identical', (file) => {
		const dark = currentRules(file).filter((r) => r.includes('ion-palette-dark'))
		expect(dark).toEqual(snapshot.darkRules[file])
	})
})
