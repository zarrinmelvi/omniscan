/** Shared date helpers. All dates are ISO `YYYY-MM-DD` strings; empty is ''. */

export const BIRTHDAY_MIN = '1900-01-01'
export const PANTRY_MAX = '2050-12-31'

function pad(n: number, len = 2): string {
	return String(n).padStart(len, '0')
}

/** Formats a Date using its LOCAL year/month/day (never UTC). */
export function formatLocalISO(date: Date): string {
	return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayLocalISO(): string {
	return formatLocalISO(new Date())
}

/** Local date `years` years before today (Feb 29 clamps to Feb 28). */
export function yearsAgoLocalISO(years: number): string {
	const now = new Date()
	const target = new Date(now.getFullYear() - years, now.getMonth(), 1)
	const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
	target.setDate(Math.min(now.getDate(), lastDay))
	return formatLocalISO(target)
}

/**
 * Returns a valid `YYYY-MM-DD` string or '' for null, malformed, timestamp
 * or implausible (year < 1000) input. Strings with a time part are cut at 'T'.
 */
export function toISODate(value: unknown): string {
	if (typeof value !== 'string') return ''
	const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value.trim())
	if (!match) return ''
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (year < 1000) return ''
	const d = new Date(year, month - 1, day)
	if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return ''
	return `${match[1]}-${match[2]}-${match[3]}`
}

/** Full years between a YYYY-MM-DD birthday and today (local). NaN if invalid. */
export function ageFromISO(iso: string): number {
	const valid = toISODate(iso)
	if (!valid) return NaN
	const [y, m, d] = valid.split('-').map(Number)
	const now = new Date()
	let age = now.getFullYear() - y
	if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
	return age
}
