// Source-level checks for the Register page Google duplicate-signup toast and
// the 7-day verification disclaimer.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const UI = resolve(__dirname, '../../../omniscan-ui/src/views')
const register = readFileSync(resolve(UI, 'RegisterPage.vue'), 'utf-8')
const checkEmail = readFileSync(resolve(UI, 'CheckEmailPage.vue'), 'utf-8')
const DISCLAIMER = 'Verify your email within 7 days or your account will be automatically deleted.'

describe('RegisterPage Google sign-up', () => {
	it('sends intent register on native verify', () => {
		expect(register).toMatch(/body:\s*\{\s*idToken,\s*intent:\s*'register'\s*\}/)
	})
	it('web flow uses state=register', () => {
		expect(register).toContain('${API_BASE_URL}/api/auth/google?state=register')
	})
	it('handles 409 and oauth_error with the danger toast', () => {
		expect(register).toMatch(/status === 409/)
		expect(register).toContain("oauth_error === 'account_exists'")
		expect(register).toContain("showToast('Account already exist', 'danger')")
		expect(register).toMatch(/handleGoogleAccountExists[\s\S]*clearPendingGoogleData/)
	})
})

describe('verify disclaimer', () => {
	it('RegisterPage shows it only for the password flow', () => {
		expect(register).toMatch(/<p v-if="!isGooglePending" class="verify-disclaimer switch-auth">/)
		expect(register).toContain(DISCLAIMER)
	})
	it('CheckEmailPage contains it', () => {
		expect(checkEmail).toContain(DISCLAIMER)
	})
	it('dark styles avoid :global and use the secondary token', () => {
		// Register reuses the existing dark .switch-auth rule (snapshot forbids new dark rules).
		expect(register).toContain('html.ion-palette-dark .switch-auth { color: #94a3b8; }')
		expect(checkEmail).toContain('html.ion-palette-dark .verify-disclaimer { color: #94a3b8; }')
		for (const src of [register, checkEmail]) {
			expect(src).not.toContain(':global(html.ion-palette-dark)')
		}
	})
})
