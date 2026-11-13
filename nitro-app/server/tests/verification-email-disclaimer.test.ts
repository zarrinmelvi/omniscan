import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DISCLAIMER = 'Verify your email within 7 days or your account will be automatically deleted.'
const src = readFileSync(resolve(__dirname, '../utils/email.ts'), 'utf8')

describe('verification email disclaimer', () => {
	it('appears exactly once, inside the verification template, next to the 24-hour line', () => {
		expect(src.split(DISCLAIMER).length - 1).toBe(1)
		const start = src.indexOf('<title>Verify your OmniScan email</title>')
		const end = src.indexOf('</html>`', start)
		const block = src.slice(start, end)
		expect(block).toContain(DISCLAIMER)
		expect(block).toContain('This link expires in 24 hours.')
	})
})
