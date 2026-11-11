import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DARK_MODE_KEY, readStoredTheme, resolveInitialDark, writeStoredTheme } from './themeStorage'

function mockSystemDark(matches: boolean) {
	vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }))
	;(window as any).matchMedia = (globalThis as any).matchMedia
}

describe('themeStorage', () => {
	beforeEach(() => {
		localStorage.clear()
	})
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('uses the stored value when present', () => {
		mockSystemDark(true)
		localStorage.setItem(DARK_MODE_KEY, 'false')
		expect(resolveInitialDark()).toBe(false)
		localStorage.setItem(DARK_MODE_KEY, 'true')
		expect(resolveInitialDark()).toBe(true)
	})

	it('falls back to the system preference when nothing is stored', () => {
		mockSystemDark(true)
		expect(resolveInitialDark()).toBe(true)
		mockSystemDark(false)
		expect(resolveInitialDark()).toBe(false)
	})

	it('treats corrupted values as missing', () => {
		mockSystemDark(true)
		localStorage.setItem(DARK_MODE_KEY, 'maybe')
		expect(readStoredTheme()).toBeNull()
		expect(resolveInitialDark()).toBe(true)
	})

	it('survives localStorage throwing', () => {
		mockSystemDark(false)
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('denied')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('denied')
		})
		expect(resolveInitialDark()).toBe(false)
		expect(() => writeStoredTheme(true)).not.toThrow()
	})

	it('writes the choice immediately', () => {
		writeStoredTheme(true)
		expect(localStorage.getItem(DARK_MODE_KEY)).toBe('true')
	})
})
