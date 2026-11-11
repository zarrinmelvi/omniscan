import { describe, it, expect } from 'vitest'
import { toISODate, todayLocalISO, yearsAgoLocalISO, ageFromISO, formatLocalISO, isBeforeToday, isNewPastDate } from './dateUtils'

describe('toISODate', () => {
	it('accepts valid ISO dates and strips time', () => {
		expect(toISODate('2024-05-17')).toBe('2024-05-17')
		expect(toISODate('2024-05-17T10:00:00.000Z')).toBe('2024-05-17')
	})
	it('rejects null, numbers, malformed and ancient years', () => {
		expect(toISODate(null)).toBe('')
		expect(toISODate(1700000000000)).toBe('')
		expect(toISODate('05/17/2024')).toBe('')
		expect(toISODate('17-05-24')).toBe('')
		expect(toISODate('0001-01-31T00:00:00Z')).toBe('')
		expect(toISODate('2024-02-31')).toBe('')
	})
})

describe('past date helpers', () => {
	const shift = (days: number) => {
		const d = new Date()
		d.setDate(d.getDate() + days)
		return formatLocalISO(d)
	}
	it('isBeforeToday: today and future are allowed, past is not', () => {
		expect(isBeforeToday(shift(0))).toBe(false)
		expect(isBeforeToday(shift(1))).toBe(false)
		expect(isBeforeToday(shift(-1))).toBe(true)
	})
	it('isBeforeToday ignores empty, null and invalid values', () => {
		expect(isBeforeToday('')).toBe(false)
		expect(isBeforeToday(null)).toBe(false)
		expect(isBeforeToday('0001-01-31')).toBe(false)
		expect(isBeforeToday('garbage')).toBe(false)
	})
	it('isNewPastDate only flags a changed past date', () => {
		expect(isNewPastDate(shift(-5), shift(-5))).toBe(false)
		expect(isNewPastDate(shift(-5), '')).toBe(true)
		expect(isNewPastDate(shift(-5), shift(-9))).toBe(true)
		expect(isNewPastDate(shift(3), shift(-9))).toBe(false)
		expect(isNewPastDate('', shift(-9))).toBe(false)
	})
})

describe('local date helpers', () => {
	it('formats local components', () => {
		expect(formatLocalISO(new Date(2024, 0, 5))).toBe('2024-01-05')
	})
	it('todayLocalISO matches the local date', () => {
		expect(todayLocalISO()).toBe(formatLocalISO(new Date()))
	})
	it('yearsAgoLocalISO gives a 16-year-old boundary', () => {
		expect(ageFromISO(yearsAgoLocalISO(16))).toBe(16)
	})
	it('ageFromISO is NaN for invalid input', () => {
		expect(ageFromISO('')).toBeNaN()
		expect(ageFromISO('0001-01-31')).toBeNaN()
	})
})
