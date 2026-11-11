/** Theme persistence helpers. Single origin (omniscan.website) so localStorage is enough. */

export const DARK_MODE_KEY = 'omniscan_dark_mode'

/** Returns the stored choice, or null when nothing valid is stored / storage is unavailable. */
export function readStoredTheme(): boolean | null {
	try {
		const value = localStorage.getItem(DARK_MODE_KEY)
		if (value === 'true') return true
		if (value === 'false') return false
	} catch {
		/* storage unavailable */
	}
	return null
}

export function prefersDark(): boolean {
	try {
		return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
	} catch {
		return false
	}
}

/** Stored choice first, otherwise the system preference. */
export function resolveInitialDark(): boolean {
	const stored = readStoredTheme()
	return stored === null ? prefersDark() : stored
}

export function writeStoredTheme(enabled: boolean): void {
	try {
		localStorage.setItem(DARK_MODE_KEY, String(enabled))
	} catch {
		/* storage unavailable */
	}
}
