import { describe, it, expect } from 'vitest'
import { toISODate, todayLocalISO, yearsAgoLocalISO, ageFromISO, formatLocalISO } from './dateUtils'

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
