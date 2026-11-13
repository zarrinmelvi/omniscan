// Source-level checks for the Help/FAQ page, shared FAQ module, route and Login field (task 3.7).
//
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const UI = resolve(__dirname, '../../../omniscan-ui/src')
const read = (p: string) => readFileSync(resolve(UI, p), 'utf-8').replace(/\r\n/g, '\n')

// Extract an array literal that starts at `marker` and ends at the first "\n]" and evaluate it.
const extractArray = (src: string, marker: RegExp): any[] => {
	const m = marker.exec(src)
	if (!m) throw new Error(`marker not found: ${marker}`)
	const start = m.index + m[0].length - 1
	const end = src.indexOf('\n]', start)
	return new Function(`return ${src.slice(start, end + 2)}`)()
}

describe('shared FAQ module', () => {
	it('faqContent.ts exports 21 items deep-equal to the approved snapshot', () => {
		const snapshotSrc = readFileSync(resolve(__dirname, 'login-identifier.preservation.test.ts'), 'utf-8').replace(/\r\n/g, '\n')
		const original = extractArray(snapshotSrc, /const ORIGINAL_FAQS = \[/)
		const faqs = extractArray(read('data/faqContent.ts'), /export const faqs(?:\s*:\s*[\w\[\]<>]+)?\s*=\s*\[/)
		expect(original).toHaveLength(21)
		expect(faqs).toHaveLength(21)
		expect(faqs).toEqual(original)
	})

	it('SettingsPage.vue imports the shared faqs and has no local const faqs', () => {
		const src = read('views/SettingsPage.vue')
		expect(src).toMatch(/import\s*\{\s*faqs\s*\}\s*from\s*'@\/data\/faqContent'/)
		expect(src).not.toMatch(/const faqs/)
	})
})

describe('HelpPage.vue', () => {
	const src = read('views/HelpPage.vue')

	it('imports the shared faqs', () => {
		expect(src).toMatch(/import\s*\{\s*faqs\s*\}\s*from\s*'@\/data\/faqContent'/)
	})

	it('has no contact form or contact-support line', () => {
		expect(src).not.toContain('<textarea')
		expect(src).not.toContain('Send message')
		expect(src).not.toContain('Contact support below')
	})

	it('does not use :global(html.ion-palette-dark)', () => {
		expect(src).not.toContain(':global(html.ion-palette-dark)')
	})
})

describe('router', () => {
	it('has a public /help route with no beforeEnter', () => {
		const src = read('router/index.ts')
		const idx = src.indexOf("path: '/help'")
		expect(idx).toBeGreaterThan(-1)
		const open = src.lastIndexOf('{', idx)
		const close = src.indexOf('\n\t},', idx)
		const routeText = src.slice(open, close)
		expect(routeText).toContain("name: 'help'")
		expect(routeText).toContain('HelpPage.vue')
		expect(routeText).not.toContain('beforeEnter')
	})
})

describe('WelcomePage and LoginPage', () => {
	it('WelcomePage footer contains a "Help and Support" link to /help', () => {
		const src = read('views/WelcomePage.vue')
		const footer = src.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? ''
		expect(footer).toContain('Help and Support')
		expect(footer).toContain('href="/help"')
	})

	it('LoginPage identifier input is type="text" with label "Username or email"', () => {
		const src = read('views/LoginPage.vue')
		const input = src.match(/<input[^>]*v-model="email"[^>]*>/)?.[0] ?? ''
		expect(input).toContain('type="text"')
		expect(input).not.toContain('type="email"')
		expect(src).toContain('Username or email')
	})
})
