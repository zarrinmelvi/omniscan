// Preservation tests (Property 4) for the middle-name removal.
// Observation-first: these pass on UNFIXED code and must still pass after the fix.
//
// Validates: Requirements 3.12, 3.13, 3.14, 3.15, 3.16, 3.17

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../../..')
const norm = (s: string) => s.replace(/\r\n/g, '\n')
const readRel = (rel: string) => norm(readFileSync(resolve(REPO_ROOT, rel), 'utf-8'))
const gitHead = (rel: string) =>
	norm(execFileSync('git', ['show', `HEAD:${rel}`], { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 }))

const register = readRel('omniscan-ui/src/views/RegisterPage.vue')
const profile = readRel('omniscan-ui/src/views/ProfilePage.vue')
const snapshot = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/ui-preservation-snapshot.json'), 'utf-8'))

// ── Local models of the old and new name handling ───────────────────────────
const oldOpen = (first_name: string | null, name: string | null, last_name: string | null) => {
	const rawFirst = (first_name || name || '').trim()
	const parts = rawFirst.split(' ')
	return { first: parts[0] || '', middle: parts.slice(1).join(' ') || '', last: (last_name || '').trim() }
}
const newOpen = (first_name: string | null, name: string | null, last_name: string | null) => ({
	first: (first_name || name || '').trim(),
	last: (last_name || '').trim(),
})
const oldSave = (first: string, middle: string, last: string) => ({
	first_name: [first, middle].filter(Boolean).join(' ').trim(),
	last_name: last.trim(),
	name: [first, middle, last].filter(Boolean).join(' ').trim(),
})
const newSave = (first: string, last: string) => ({
	first_name: first.trim(),
	last_name: last.trim(),
	name: [first, last].map((s) => s.trim()).filter(Boolean).join(' '),
})

describe('Property 4: single-word names behave identically', () => {
	const word = fc.stringMatching(/^[A-Za-z]{1,15}$/)

	it('open: old split and new assignment give the same First and Last', () => {
		fc.assert(
			fc.property(word, word, (f, l) => {
				const o = oldOpen(f, null, l)
				const n = newOpen(f, null, l)
				expect(o.middle).toBe('')
				expect(n.first).toBe(o.first)
				expect(n.last).toBe(o.last)
			}),
			{ numRuns: 100 },
		)
	})

	it('open: empty first_name falls back to a single-word name the same way', () => {
		fc.assert(
			fc.property(word, word, (nm, l) => {
				const o = oldOpen('', nm, l)
				const n = newOpen('', nm, l)
				expect(n.first).toBe(o.first)
				expect(n.last).toBe(o.last)
			}),
			{ numRuns: 50 },
		)
	})

	it('save: old join (empty middle) and new body give the same first_name, last_name and name', () => {
		fc.assert(
			fc.property(word, word, (f, l) => {
				expect(newSave(f, l)).toEqual(oldSave(f, '', l))
			}),
			{ numRuns: 100 },
		)
	})
})

describe('Property 4: validation intact', () => {
	it('RegisterPage keeps maxlength and field error handling for first/last name', () => {
		expect(register).toMatch(/v-model="firstName"[^>]*maxlength="16"/)
		expect(register).toMatch(/v-model="lastName"[^>]*maxlength="25"/)
		expect(register).toContain('fieldErrors.firstName')
		expect(register).toContain('fieldErrors.lastName')
		expect(register).toContain('!firstName.value.trim()')
		expect(register).toContain('!lastName.value.trim()')
	})

	it('ProfilePage keeps maxlength 16 on First Name and 25 on Last Name', () => {
		expect(profile).toMatch(/v-model="form\.firstName"[^>]*maxlength="16"/)
		expect(profile).toMatch(/v-model="form\.lastName"[^>]*maxlength="25"/)
	})
})

describe('Property 4: Google prefill', () => {
	it('RegisterPage still prefills names from the Google payload and pending data', () => {
		expect(register).toContain('firstName.value = payload.firstName')
		expect(register).toContain('lastName.value = payload.lastName')
		expect(register).toContain('firstName.value = pending.firstName')
		expect(register).toContain('lastName.value = pending.lastName')
		expect(register).toMatch(/firstName:\s*payload\.firstName/)
		expect(register).toMatch(/lastName:\s*payload\.lastName/)
	})
})

describe('Property 4: untouched files have no diff', () => {
	const files = [
		'omniscan-ui/src/views/admin/AdminManageUserProfile.vue',
		'nitro-app/server/api/auth/register.post.ts',
		'nitro-app/server/api/auth/google/register.post.ts',
		'nitro-app/server/api/users/index.put.ts',
		'nitro-app/prisma/schema.prisma',
	]
	for (const f of files) {
		it(`${f} is identical to HEAD`, () => {
			expect(readRel(f)).toBe(gitHead(f))
		})
	}
})

describe('Property 4: unsaved-changes detection', () => {
	const src = (() => {
		const i = profile.indexOf('const hasUnsavedChanges = computed(')
		if (i < 0) return ''
		return profile.slice(i, profile.indexOf('\n})', i))
	})()

	const tracked = ['firstName', 'lastName', 'username', 'gender', 'birthday', 'halalPref', 'avatarBase64']

	it('hasUnsavedChanges source compares every tracked field (middleName comparison may disappear)', () => {
		expect(src.length).toBeGreaterThan(0)
		expect(src).toContain('passwordTyped.value')
		for (const k of tracked) expect(src).toContain(`form.${k} !== initialForm.${k}`)
		expect(src).toMatch(/JSON\.stringify\(form\.customPreferences\)\s*!==\s*JSON\.stringify\(initialForm\.customPreferences\)/)
	})

	// Local model of the tracked comparison.
	type F = { firstName: string; lastName: string; username: string; gender: string; birthday: string; halalPref: boolean; customPreferences: string[]; avatarBase64: string | null }
	const changed = (form: F, init: F, pw: boolean) =>
		pw ||
		form.firstName !== init.firstName ||
		form.lastName !== init.lastName ||
		form.username !== init.username ||
		form.gender !== init.gender ||
		form.birthday !== init.birthday ||
		form.halalPref !== init.halalPref ||
		JSON.stringify(form.customPreferences) !== JSON.stringify(init.customPreferences) ||
		form.avatarBase64 !== init.avatarBase64

	const formArb = fc.record({
		firstName: fc.string({ maxLength: 10 }),
		lastName: fc.string({ maxLength: 10 }),
		username: fc.string({ maxLength: 10 }),
		gender: fc.constantFrom('', 'Male', 'Female'),
		birthday: fc.constantFrom('', '2000-01-01', '1990-05-05'),
		halalPref: fc.boolean(),
		customPreferences: fc.array(fc.string({ maxLength: 5 }), { maxLength: 3 }),
		avatarBase64: fc.option(fc.string({ maxLength: 5 }), { nil: null }),
	})

	it('an untouched form reports no change', () => {
		fc.assert(
			fc.property(formArb, (f) => {
				expect(changed({ ...f, customPreferences: [...f.customPreferences] }, f, false)).toBe(false)
			}),
			{ numRuns: 50 },
		)
	})

	it('editing any tracked field (or typing a password) reports a change', () => {
		fc.assert(
			fc.property(formArb, fc.constantFrom(...tracked, 'customPreferences', 'password'), (f, field) => {
				const edited: any = { ...f, customPreferences: [...f.customPreferences] }
				let pw = false
				if (field === 'password') pw = true
				else if (field === 'halalPref') edited.halalPref = !f.halalPref
				else if (field === 'customPreferences') edited.customPreferences = [...f.customPreferences, 'x']
				else if (field === 'avatarBase64') edited.avatarBase64 = f.avatarBase64 === null ? 'data' : null
				else edited[field] = f[field as 'firstName'] + 'z'
				expect(changed(edited, f, pw)).toBe(true)
			}),
			{ numRuns: 100 },
		)
	})
})

describe('Property 4: stored names and other surfaces untouched', () => {
	it('the profile view, greeting and settings still read name / first_name / last_name', () => {
		expect(profile).toMatch(/user\.value\.name|user\.name|\{\{\s*user\.name/)
		expect(profile).toContain('user.value.first_name')
		expect(profile).toContain('user.value.last_name')
	})

	it('Edit Profile still saves username, gender and last_name via PUT /api/users', () => {
		expect(profile).toMatch(/last_name:\s*form\.lastName\.trim\(\)/)
		expect(profile).toContain("apiFetch<ProfileResponse>('/api/users'")
	})
})

describe('Property 4: style rules', () => {
	it('ProfilePage keeps .name-row and the .input-label entry in the nested dark block', () => {
		expect(profile).toMatch(/\.name-row\s*\{/)
		expect(profile).toMatch(/:global\(html\.ion-palette-dark\) :global\(body\.dark\) \{\s*\n\s*\.input-label \{/)
	})

	it('ProfilePage introduces no new ":global(html.ion-palette-dark) ." selectors', () => {
		const count = (s: string) => (s.match(/:global\(html\.ion-palette-dark\) \./g) ?? []).length
		expect(count(profile)).toBeLessThanOrEqual(count(gitHead('omniscan-ui/src/views/ProfilePage.vue')))
	})

	it('every RegisterPage light rule in the snapshot still exists, except the single .add-middle-link rule', () => {
		const rules: string[] = snapshot.lightRules['views/RegisterPage.vue']
		expect(rules.length).toBeGreaterThan(0)
		const flat = (s: string) => s.replace(/\s+/g, ' ')
		const source = flat(register)
		const missing = rules.filter((r) => !r.startsWith('.add-middle-link') && !source.includes(flat(r)))
		expect(missing).toEqual([])
		expect(rules.filter((r) => r.startsWith('.add-middle-link')).length).toBeLessThanOrEqual(1)
	})
})
