// Bug condition exploration tests (Property 3) for removing the middle name option.
// Source-level checks (like ui-preservation.test.ts). Cases E to I are meant to FAIL
// on unfixed code; Case J passes before and after (guards requirement 2.17).
//
// Validates: Requirements 1.7, 1.8, 1.9, 1.10, 2.14, 2.15, 2.16, 2.17, 2.18

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const UI = resolve(__dirname, '../../../omniscan-ui/src/views')
const register = readFileSync(resolve(UI, 'RegisterPage.vue'), 'utf-8')
const profile = readFileSync(resolve(UI, 'ProfilePage.vue'), 'utf-8')

const startEditingBody = (() => {
	const i = profile.indexOf('function startEditing()')
	if (i < 0) return ''
	const end = profile.indexOf('\n}\n', i)
	return profile.slice(i, end < 0 ? undefined : end)
})()

const saveBody = (() => {
	const i = profile.indexOf("method: 'PUT'")
	if (i < 0) return ''
	return profile.slice(i, profile.indexOf('}', profile.indexOf('birthday', i)) + 1)
})()

const registerCall = (() => {
	const i = register.indexOf('authStore.register(')
	// Slice up to the first top-level comma after the open paren (first argument may itself contain parens).
	if (i < 0) return ''
	const m = /,\s*\r?\n/.exec(register.slice(i))
	return register.slice(i, m ? i + m.index : undefined)
})()

describe('Property 3: no middle name option', () => {
	it('Case E: RegisterPage has no add-middle-link / showMiddleName / middleName', () => {
		expect(register).not.toMatch(/add-middle-link/)
		expect(register).not.toMatch(/showMiddleName/)
		expect(register).not.toMatch(/middleName/)
	})

	it('Case F: register() first argument is exactly firstName.value.trim()', () => {
		const firstArg = registerCall.replace('authStore.register(', '').split(',')[0].trim()
		expect(firstArg).toBe('firstName.value.trim()')
	})

	it('Case G: ProfilePage has no add-middle-link / showMiddleName / middleName', () => {
		expect(profile).not.toMatch(/add-middle-link/)
		expect(profile).not.toMatch(/showMiddleName/)
		expect(profile).not.toMatch(/middleName/)
	})

	it('Case H: startEditing does not split the first name and assigns it whole', () => {
		expect(startEditingBody.length).toBeGreaterThan(0)
		expect(startEditingBody).not.toMatch(/\.split\(/)
		expect(startEditingBody).toMatch(/form\.firstName\s*=\s*\(?\s*user\.value\.first_name\s*\|\|\s*user\.value\.name/)
	})

	it('Case I: save body sends first_name: form.firstName.trim()', () => {
		expect(saveBody.length).toBeGreaterThan(0)
		expect(saveBody).toMatch(/first_name:\s*form\.firstName\.trim\(\)\s*,/)
	})

	it('Case J: no slice/substring/substr applied to firstName on open or save', () => {
		expect(startEditingBody.length).toBeGreaterThan(0)
		const combined = startEditingBody + '\n' + saveBody
		expect(combined).not.toMatch(/firstName[^\n]*\.(slice|substring|substr)\(/)
		expect(combined).not.toMatch(/first_name[^\n]*\.(substring|substr)\(/)
	})
})

// Local mirrors of the expected one-line assignments (new behavior).
const openFirst = (first_name: string | null, name: string | null) => (first_name || name || '').trim()
const saveBodyOf = (first: string, last: string) => ({
	first_name: first.trim(),
	last_name: last.trim(),
	name: [first, last].map((s) => s.trim()).filter(Boolean).join(' '),
})

describe('Property 3: expected name handling (fast-check)', () => {
	const words = fc.stringMatching(/^[A-Za-z ]{0,40}$/)

	it('open assignment returns the trimmed stored first_name unchanged (no split)', () => {
		fc.assert(
			// Empty stored first_name legitimately falls back to `name`, so only non-empty values are generated.
			fc.property(words.filter((s) => s.length > 0), (stored) => {
				expect(openFirst(stored, 'ignored')).toBe(stored.trim())
			}),
			{ numRuns: 100 },
		)
	})

	it('save body trims first/last and joins non-empty parts with one space', () => {
		fc.assert(
			fc.property(words, words, (first, last) => {
				const b = saveBodyOf(first, last)
				expect(b.first_name).toBe(first.trim())
				expect(b.last_name).toBe(last.trim())
				expect(b.name).toBe([first.trim(), last.trim()].filter(Boolean).join(' '))
			}),
			{ numRuns: 100 },
		)
	})
})
