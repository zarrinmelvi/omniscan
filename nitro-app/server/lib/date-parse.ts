export const MONTH_NAMES: Record<string, number> = {
	jan: 1, feb: 2, mar: 3, apr: 4, may: 5,  jun: 6,
	jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** Pad, construct YYYY-MM-DD, and validate via round-trip. Returns null for
 *  impossible dates such as Feb 31. */
export function isValidYMD(y: number, m: number, d: number): string | null {
	const yyyy = String(y).padStart(4, '0')
	const mm   = String(m).padStart(2, '0')
	const dd   = String(d).padStart(2, '0')
	const candidate = `${yyyy}-${mm}-${dd}`
	const parsed = new Date(`${candidate}T00:00:00Z`)
	if (isNaN(parsed.getTime())) return null
	if (parsed.toISOString().slice(0, 10) !== candidate) return null
	return candidate
}

/**
 * Attempts to parse common alternative date formats into YYYY-MM-DD.
 * Patterns are evaluated most-specific first to avoid ambiguous matches.
 * Returns null if no pattern matches or the recovered date fails round-trip.
 */
export function tryParseRawDateString(raw: string): string | null {
	// Normalise whitespace
	const s = raw.trim().replace(/\s+/g, ' ')

	// 1. YYYY-MM-DD pass-through (self-contained if called directly)
	{
		const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
		if (m) return isValidYMD(+m[1], +m[2], +m[3])
	}

	// 2. Strip EXP / BEST BY prefix (case-insensitive) then recurse once
	{
		const stripped = s.replace(/^(?:exp:?\s*|best\s*by:?\s*)/i, '').trim()
		if (stripped !== s) return tryParseRawDateString(stripped)
	}

	// 3. YYYY.MM.DD
	{
		const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
		if (m) return isValidYMD(+m[1], +m[2], +m[3])
	}

	// 4. DD MMM YYYY  (e.g. "31 DEC 2026")
	{
		const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
		if (m) {
			const monthNum = MONTH_NAMES[m[2].toLowerCase()]
			if (monthNum) return isValidYMD(+m[3], monthNum, +m[1])
		}
	}

	// 5 & 6. DD/MM/YYYY or MM/DD/YYYY — four-digit year
	{
		const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
		if (m) {
			const [, p1, p2, yearStr] = m
			const a = +p1, b = +p2
			// Treat as DD/MM/YYYY when second part is a valid month (≤ 12)
			if (a <= 31 && b <= 12) {
				return isValidYMD(+yearStr, b, a)
			}
			// Treat as MM/DD/YYYY when day is unambiguously > 12
			if (b > 12 && a <= 12) {
				return isValidYMD(+yearStr, a, b)
			}
		}
	}

	// 7. MM/YYYY → day = 1
	{
		const m = s.match(/^(\d{1,2})\/(\d{4})$/)
		if (m) return isValidYMD(+m[2], +m[1], 1)
	}

	// 8. MM/YY → day = 1, year = 2000 + YY
	{
		const m = s.match(/^(\d{1,2})\/(\d{2})$/)
		if (m) return isValidYMD(2000 + +m[2], +m[1], 1)
	}

	return null
}

// The model was instructed to return YYYY-MM-DD or null, but nothing forces
// it to comply — validate strictly rather than passing a malformed string
// through to an <input type="date">, which just silently fails to populate
// on anything that isn't exactly that format. Also rejects a technically
// well-formed but impossible date (e.g. 2026-02-30).
export function normalizeToDateStringOrNull(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const trimmed = value.trim()
	if (!trimmed) return null

	// Fast path: already in required format
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const parsed = new Date(`${trimmed}T00:00:00Z`)
		if (isNaN(parsed.getTime())) return null
		if (parsed.toISOString().slice(0, 10) !== trimmed) return null
		return trimmed
	}

	// Attempt recovery via alternative format parser (Refinement 4)
	const recovered = tryParseRawDateString(trimmed)
	if (recovered) return recovered

	// Non-empty, non-YYYY-MM-DD, non-recoverable — log before discarding
	console.warn('[date-parse] expiration_date not in YYYY-MM-DD — raw AI value:', trimmed)
	return null
}
