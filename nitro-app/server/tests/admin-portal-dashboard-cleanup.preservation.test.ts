// Preservation tests (Property 2) for admin-portal-dashboard-cleanup.
// Observed on UNFIXED code; must pass before AND after the fix.
// Deliberately does NOT assert full key sets of dashboard `stats`, the dashboard response,
// queue `metrics` or the queue response (the fix adds keys), nor allergen tie order.
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12, 3.13

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const h = vi.hoisted(() => {
	const state: any = {
		query: {} as any,
		// dashboard
		totalScans: 0,
		priorScans: 0,
		scans: [] as any[],
		activeConsumers: 0,
		priorConsumers: 0,
		onlineConsumers: 0,
		resolvedCount: 0,
		resolvedWeek: 0,
		awaiting: 0,
		pending: [] as any[],
		corrections: [] as any[],
		allergenRows: [] as any[],
		attention: [] as any[],
		// flag audit
		allFlags: [] as any[],
		predefined: [] as any[],
		// users
		users: [] as any[],
		userFindManyArgs: null as any,
		userCountArgs: [] as any[],
	}

	const lt = (rows: any[], cutoff?: Date) =>
		cutoff ? rows.filter((r) => new Date(r.created_at).getTime() < cutoff.getTime()) : rows

	const prisma: any = {
		$queryRaw: async () => [{ '?column?': 1 }],
		scan: {
			count: async (args: any = {}) => (args?.where?.scan_time?.lt ? state.priorScans : state.totalScans),
			findMany: async () => state.scans,
			groupBy: async () => [],
		},
		flaggedScan: {
			count: async (args: any = {}) => {
				const st = args?.where?.status
				if (st === 'pending') return state.pending.length
				if (st === 'awaiting_rescan') return state.awaiting
				if (st && Array.isArray(st.in)) return args.where.updated_at ? state.resolvedWeek : state.resolvedCount
				return 0
			},
			findMany: async (args: any = {}) => {
				const w = args?.where
				if (!w) return state.allFlags
				if (w.status === 'pending') return lt(state.pending, w.created_at?.lt)
				if (w.admin_correction) return state.corrections
				return []
			},
		},
		user: {
			count: async (args: any = {}) => {
				state.userCountArgs.push(args)
				const w = args?.where ?? {}
				if (w.session_token) return state.onlineConsumers
				if (w.created_at) return state.priorConsumers
				return state.activeConsumers
			},
			findMany: async (args: any) => {
				state.userFindManyArgs = args
				return state.users
			},
		},
		allergen: {
			findMany: async (args: any = {}) => (args?.select?.name && args?.orderBy ? state.allergenRows : state.predefined),
		},
		halalLogo: { findMany: async (args: any = {}) => (args?.where ? state.attention : []) },
		productHalalLogo: { findMany: async () => [] },
	}
	return { state, prisma }
})

vi.mock('../lib/prisma', () => ({ prisma: h.prisma }))
vi.mock('../utils/requireAdminAuth', () => ({ requireAdminAuth: () => {} }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, getQuery: vi.fn(() => h.state.query) }
})

import dashboardHandler from '../api/admin/dashboard.get'
import queueHandler from '../api/admin/verification-queue.get'
import flagAuditHandler from '../api/admin/flag-audit-stats.get'
import usersHandler from '../api/admin/users.get'

const fakeEvent = () => ({ node: { req: { headers: {}, url: '/' }, res: {} }, context: { admin: {} } }) as any

const NOW = new Date('2026-03-15T12:00:00.000Z')
const DAY = 86400000

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(NOW)
	const s = h.state
	s.query = {}
	s.totalScans = 0
	s.priorScans = 0
	s.scans = []
	s.activeConsumers = 0
	s.priorConsumers = 0
	s.onlineConsumers = 0
	s.resolvedCount = 0
	s.resolvedWeek = 0
	s.awaiting = 0
	s.pending = []
	s.corrections = []
	s.allergenRows = []
	s.attention = []
	s.allFlags = []
	s.predefined = []
	s.users = []
	s.userFindManyArgs = null
	s.userCountArgs = []
})
afterEach(() => vi.useRealTimers())

// ─────────────────────────── Dashboard API ───────────────────────────
describe('Dashboard API preservation (3.3, 3.7, 3.8)', () => {
	it('keeps original stats keys/values, scan_verdicts, scans_over_time, allergen_distribution, attention_certifiers, ai_confidence_distribution', async () => {
		const s = h.state
		s.scans = [
			{ scan_time: new Date(NOW.getTime() - 1 * DAY), safety_verdict: 'Green', ai_confidence_score: 0.4 },
			{ scan_time: new Date(NOW.getTime() - 1 * DAY), safety_verdict: 'Yellow', ai_confidence_score: 0.6 },
			{ scan_time: new Date(NOW.getTime() - 2 * DAY), safety_verdict: 'Red', ai_confidence_score: 0.75 },
			{ scan_time: new Date(NOW.getTime() - 2 * DAY), safety_verdict: 'Green', ai_confidence_score: 0.85 },
			{ scan_time: new Date(NOW.getTime() - 2 * DAY), safety_verdict: 'Green', ai_confidence_score: 0.92 },
			{ scan_time: new Date(NOW.getTime() - 3 * DAY), safety_verdict: 'Green', ai_confidence_score: 0.97 },
			{ scan_time: new Date(NOW.getTime() - 3 * DAY), safety_verdict: 'Green', ai_confidence_score: 98 },
		]
		s.totalScans = 7
		s.priorScans = 5
		s.activeConsumers = 20
		s.priorConsumers = 10
		s.resolvedCount = 3
		// 3 halal-type pending (1 older than 30 days) + 1 non-halal
		s.pending = [
			{ id: 1, flag_reason: 'Unrecognized halal logo', status: 'pending', created_at: new Date(NOW.getTime() - 1 * DAY), scan: null },
			{ id: 2, flag_reason: 'Missing certification stamp', status: 'pending', created_at: new Date(NOW.getTime() - 2 * DAY), scan: null },
			{ id: 3, flag_reason: 'Halal compliance', status: 'pending', created_at: new Date(NOW.getTime() - 45 * DAY), scan: null },
			{ id: 4, flag_reason: 'Peanut allergen detected', status: 'pending', created_at: new Date(NOW.getTime() - 1 * DAY), scan: null },
		]
		// 10 allergens with distinct counts, unsorted -> top 8 by count desc
		const counts = [3, 9, 1, 7, 5, 10, 2, 8, 4, 6]
		s.allergenRows = counts.map((c, i) => ({ name: `A${i}`, _count: { users: c } }))
		s.attention = [
			{ id: 1, certifier: 'JAKIM', full_name: 'J', last_checked_at: new Date(NOW.getTime() - 2 * DAY), _count: { product_links: 2 } },
			{ id: 2, certifier: 'MUI', full_name: 'M', last_checked_at: null, _count: { product_links: 0 } },
			{ id: 3, certifier: 'IDCP', full_name: 'I', last_checked_at: new Date(NOW.getTime() - 90 * DAY), _count: { product_links: 0 } },
		]

		const res: any = await dashboardHandler(fakeEvent())

		expect(res.success).toBe(true)
		// stats (subset only)
		expect(res.stats.total_scans).toBe(7)
		expect(res.stats.pending_flags).toBe(3)
		expect(res.stats.active_consumers).toBe(20)
		// resolved 3, pending 3 -> round(3/6*100)
		expect(res.stats.resolution_rate).toBe(50)
		expect(typeof res.stats.api_latency_ms).toBe('number')
		expect(res.stats.trends.total_scans_pct).toBe(40)
		expect(res.stats.trends.active_consumers_pct).toBe(100)
		// prior pending (created before period start, halal) = 1 -> 3 vs 1 -> 200
		expect(res.stats.trends.pending_flags_pct).toBe(200)
		expect(res.stats.sparklines.scans).toHaveLength(7)
		expect(res.stats.sparklines.flags).toHaveLength(7)
		expect(res.stats.sparklines.consumers).toEqual(new Array(7).fill(20))
		expect(res.stats.sparklines.api_health).toHaveLength(5)

		// scan_verdicts
		expect(res.scan_verdicts).toEqual({ Green: 5, Yellow: 1, Red: 1, total: 7 })

		// scans_over_time
		expect(res.scans_over_time).toHaveLength(30)
		expect(res.scans_over_time.every((p: any) => typeof p.date === 'string' && typeof p.count === 'number')).toBe(true)
		expect(res.scans_over_time.reduce((a: number, p: any) => a + p.count, 0)).toBe(7)

		// ai_confidence_distribution
		expect(res.ai_confidence_distribution).toEqual([
			{ label: '<50', count: 1 },
			{ label: '50–70', count: 1 },
			{ label: '70–80', count: 1 },
			{ label: '80–90', count: 1 },
			{ label: '90–95', count: 1 },
			{ label: '95+', count: 2 },
		])

		// allergen_distribution: top 8 by count desc
		expect(res.allergen_distribution).toEqual([
			{ name: 'A5', count: 10 },
			{ name: 'A1', count: 9 },
			{ name: 'A7', count: 8 },
			{ name: 'A3', count: 7 },
			{ name: 'A9', count: 6 },
			{ name: 'A4', count: 5 },
			{ name: 'A8', count: 4 },
			{ name: 'A0', count: 3 },
		])

		// attention_certifiers
		expect(res.attention_certifiers).toEqual([
			{ id: 1, certifier: 'JAKIM', full_name: 'J', status: 'unverified', unverified_product_count: 2 },
			{ id: 2, certifier: 'MUI', full_name: 'M', status: 'overdue', unverified_product_count: 0 },
			{ id: 3, certifier: 'IDCP', full_name: 'I', status: 'overdue', unverified_product_count: 0 },
		])
	})

	it('zero data still returns original zero-valued fields', async () => {
		const res: any = await dashboardHandler(fakeEvent())
		expect(res.stats.total_scans).toBe(0)
		expect(res.stats.pending_flags).toBe(0)
		expect(res.stats.resolution_rate).toBe(100)
		expect(res.scan_verdicts).toEqual({ Green: 0, Yellow: 0, Red: 0, total: 0 })
		expect(res.allergen_distribution).toEqual([])
		expect(res.attention_certifiers).toEqual([])
	})
})

// ─────────────────────────── Verification queue ───────────────────────────
const HALAL_REASONS = ['Unrecognized halal logo', 'Missing certification stamp', 'Halal compliance unclear', 'Logo not matched']
const OTHER_REASONS = ['Peanut allergen detected', 'Low AI confidence', 'Wrong ingredient parsed']
const KEYWORDS = ['halal', 'slaughter', 'certification', 'certif', 'stamp', 'logo', 'compliance']
const isHalal = (r: string) => KEYWORDS.some((k) => r.toLowerCase().includes(k))
const NAMES = ['Noodles', 'Biscuits', 'Candy', 'Soup', 'Chips']

const flagRowArb = fc.record({
	reason: fc.constantFrom(...HALAL_REASONS, ...OTHER_REASONS),
	name: fc.option(fc.constantFrom(...NAMES), { nil: null }),
	userId: fc.integer({ min: 1, max: 4 }),
	crop: fc.option(fc.constantFrom('CROP1', 'data:image/png;base64,CROP2'), { nil: null }),
	img: fc.option(fc.constantFrom('IMG1', 'data:image/png;base64,IMG2'), { nil: null }),
})

const toDataUri = (b: string | null | undefined) => (!b ? null : b.startsWith('data:') ? b : `data:image/jpeg;base64,${b}`)

function buildPending(rows: any[]) {
	return rows.map((r, i) => ({
		id: i + 1,
		flag_reason: r.reason,
		logo_crop_base64: r.crop,
		scan: {
			user_id: r.userId,
			product: r.name === null ? null : { id: NAMES.indexOf(r.name) + 1, product_name: r.name, image_base64: r.img },
		},
	}))
}

function expectedCards(pending: any[]) {
	const rows = pending.filter((f) => isHalal(f.flag_reason))
	const groups = new Map<string, any[]>()
	for (const row of rows) {
		const key = row.scan?.product?.product_name || `flag-${row.id}`
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(row)
	}
	const cards: any[] = []
	let n = 0
	for (const [, g] of groups) {
		n++
		const first = g[0]
		const pids = new Set(g.map((r) => r.scan?.product?.id).filter((x: any) => x != null))
		const uids = new Set(g.map((r) => r.scan?.user_id).filter((x: any) => x != null))
		cards.push({
			id: first.id,
			title: `Unrecognized Halal logo #${n}`,
			scanCount: g.length,
			productCount: pids.size > 0 ? pids.size : 1,
			consumerCount: uids.size,
			examples: [...new Set(g.map((r) => r.scan?.product?.product_name).filter((x: any) => !!x))].slice(0, 3),
			thumb: toDataUri(g.find((r) => r.logo_crop_base64)?.logo_crop_base64) ?? toDataUri(first.scan?.product?.image_base64),
			rawIds: g.map((r) => r.id),
		})
	}
	return { cards, scanTotal: rows.length }
}

describe('Verification queue default mode preservation (3.4, 3.5)', () => {
	it('property: unmatched cards, pagination, metrics, duplicates, training for generated pending-flag sets', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(flagRowArb, { maxLength: 40 }),
				fc.integer({ min: 1, max: 3 }),
				fc.integer({ min: 0, max: 5 }),
				fc.integer({ min: 0, max: 5 }),
				async (rows, page, awaiting, resolved) => {
					const pending = buildPending(rows)
					h.state.pending = pending
					h.state.awaiting = awaiting
					h.state.resolvedCount = resolved
					h.state.resolvedWeek = Math.min(resolved, 2)
					h.state.corrections = []
					h.state.query = { page: String(page), pageSize: '10' }

					const res: any = await queueHandler(fakeEvent())
					const { cards, scanTotal } = expectedCards(pending)

					expect(res.success).toBe(true)
					expect(res.unmatched).toEqual(cards.slice((page - 1) * 10, page * 10))
					expect(res.pagination).toEqual({
						page,
						page_size: 10,
						total: cards.length,
						total_pages: Math.max(1, Math.ceil(cards.length / 10)),
					})
					expect(res.metrics.needs_decision).toBe(cards.length)
					expect(res.metrics.needs_decision_scans).toBe(scanTotal)
					expect(res.metrics.awaiting_rescan).toBe(awaiting)
					expect(res.metrics.resolved_this_week).toBe(Math.min(resolved, 2))
					const denom = resolved + pending.length + awaiting
					expect(res.metrics.auto_resolved_pct).toBe(denom === 0 ? 100 : Math.round((resolved / denom) * 100))
					expect(res.duplicates).toEqual([])
					expect(res.training).toEqual([])
				},
			),
			{ numRuns: 60 },
		)
	})

	it('flag-<id> fallback key, non-halal excluded, first-seen order, titles numbered', async () => {
		h.state.pending = [
			{ id: 10, flag_reason: 'Unrecognized halal logo', logo_crop_base64: null, scan: { user_id: 1, product: null } },
			{ id: 11, flag_reason: 'Peanut allergen detected', logo_crop_base64: null, scan: { user_id: 1, product: { id: 1, product_name: 'Noodles', image_base64: null } } },
			{ id: 12, flag_reason: 'Halal compliance', logo_crop_base64: null, scan: { user_id: 2, product: { id: 1, product_name: 'Noodles', image_base64: 'IMG' } } },
			{ id: 13, flag_reason: 'Missing certification stamp', logo_crop_base64: 'CROP', scan: { user_id: 3, product: { id: 1, product_name: 'Noodles', image_base64: null } } },
			{ id: 14, flag_reason: 'Logo not matched', logo_crop_base64: null, scan: null },
		]
		const res: any = await queueHandler(fakeEvent())
		expect(res.unmatched.map((c: any) => c.id)).toEqual([10, 12, 14])
		expect(res.unmatched.map((c: any) => c.title)).toEqual([
			'Unrecognized Halal logo #1',
			'Unrecognized Halal logo #2',
			'Unrecognized Halal logo #3',
		])
		expect(res.unmatched[1].rawIds).toEqual([12, 13])
		expect(res.unmatched[1].scanCount).toBe(2)
		expect(res.unmatched[1].consumerCount).toBe(2)
		expect(res.unmatched[1].thumb).toBe('data:image/jpeg;base64,CROP')
		expect(res.unmatched[0].productCount).toBe(1)
		expect(res.metrics.needs_decision).toBe(3)
		expect(res.metrics.needs_decision_scans).toBe(4)
	})

	it('training corrections keep shape (non-empty only, max 6)', async () => {
		h.state.corrections = [
			{ id: 1, admin_correction: 'Fix A', scan: { product: { product_name: 'Noodles', image_base64: 'I' } } },
			{ id: 2, admin_correction: '   ', scan: { product: { product_name: 'Soup', image_base64: null } } },
			{ id: 3, admin_correction: 'Fix C', scan: null },
		]
		const res: any = await queueHandler(fakeEvent())
		expect(res.training).toEqual([
			{ id: 1, title: 'Noodles', scanCount: 1, productCount: 1, consumerCount: 1, examples: ['Noodles'], thumb: 'data:image/jpeg;base64,I', rawIds: [1] },
			{ id: 3, title: 'Correction #3', scanCount: 1, productCount: 1, consumerCount: 1, examples: ['Correction #3'], thumb: null, rawIds: [3] },
		])
	})
})

// ─────────────────────────── users.get ───────────────────────────
const user = (over: any = {}) => ({
	id: 1,
	name: 'U',
	username: 'u',
	email: 'user@example.com',
	status: 'active',
	last_active: new Date(NOW.getTime() - 1000),
	created_at: new Date(NOW.getTime() - 5 * DAY),
	avatar_base64: null,
	session_token: 'tok',
	_count: { scan: 0, pantry_item: 0 },
	...over,
})

describe('users.get preservation (3.6, 3.8)', () => {
	const since = new Date(NOW.getTime() - 2 * 60 * 1000)

	it('status=online builds the online where', async () => {
		h.state.query = { status: 'online' }
		await usersHandler(fakeEvent())
		expect(h.state.userFindManyArgs.where.AND).toContainEqual({ session_token: { not: null }, last_active: { gte: since } })
	})

	it('status=offline builds the offline where', async () => {
		h.state.query = { status: 'offline' }
		await usersHandler(fakeEvent())
		expect(h.state.userFindManyArgs.where.AND).toContainEqual({
			OR: [{ session_token: null }, { last_active: null }, { last_active: { lt: since } }],
		})
	})

	it('no status adds neither online nor offline conditions', async () => {
		await usersHandler(fakeEvent())
		const and: any[] = h.state.userFindManyArgs.where.AND
		expect(and).toEqual([{ deleted_at: null }])
	})

	it('is_online boundaries and scan_count', async () => {
		h.state.users = [
			user({ id: 1, last_active: new Date(NOW.getTime() - 120000), _count: { scan: 7, pantry_item: 2 } }), // exactly 2 min -> online
			user({ id: 2, last_active: new Date(NOW.getTime() - 120001), _count: { scan: 3, pantry_item: 0 } }), // just past -> offline
			user({ id: 3, session_token: null, _count: { scan: 0, pantry_item: 0 } }),
			user({ id: 4, last_active: null }),
			user({ id: 5, session_token: '' }),
			user({ id: 6, last_active: new Date(NOW.getTime() - 119999) }),
		]
		const res: any = await usersHandler(fakeEvent())
		const byId = Object.fromEntries(res.users.map((u: any) => [u.id, u]))
		expect(byId[1].is_online).toBe(true)
		expect(byId[2].is_online).toBe(false)
		expect(byId[3].is_online).toBe(false)
		expect(byId[4].is_online).toBe(false)
		expect(byId[5].is_online).toBe(false)
		expect(byId[6].is_online).toBe(true)
		expect(byId[1].scan_count).toBe(7)
		expect(byId[2].scan_count).toBe(3)
		expect(byId[1].pantry_item_count).toBe(2)
	})
})

// ─────────────────────────── flag-audit-stats ───────────────────────────
describe('flag-audit-stats preservation (3.3, 3.13)', () => {
	const allergenArb = fc.uniqueArray(fc.constantFrom('Milk', 'Egg', 'Soy', 'Wheat', 'Peanut', 'Fish', 'Sesame', 'Lupin', 'Celery'), {
		minLength: 1,
		maxLength: 9,
	})

	it('property: field names, item shapes, allergen name set and per-name counts unchanged', async () => {
		await fc.assert(
			fc.asyncProperty(allergenArb, fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 9, maxLength: 9 }), fc.integer({ min: 0, max: 8 }), async (names, counts, nFlags) => {
				const s = h.state
				s.predefined = names.map((name, i) => ({ id: i + 1, name, _count: { users: counts[i] } }))
				s.activeConsumers = 11
				s.allFlags = Array.from({ length: nFlags }, (_, i) => ({
					id: i + 1,
					flag_reason: `Contains ${names[i % names.length].toLowerCase()} trace`,
					created_at: new Date(NOW.getTime() - i * DAY),
					scan: { product: { id: i + 1, product_name: `P${i % 3}`, brand_name: null } },
				}))

				const res: any = await flagAuditHandler(fakeEvent())

				for (const k of ['success', 'allergen_profile_counts', 'allergen_flag_counts', 'total_active_consumers']) {
					expect(res).toHaveProperty(k)
				}
				expect(res.success).toBe(true)
				expect(res.total_active_consumers).toBe(11)

				// profile counts: same SET of names, per-name counts, item shape; order not asserted
				expect(res.allergen_profile_counts.map((a: any) => a.name).sort()).toEqual([...names].sort())
				for (const item of res.allergen_profile_counts) {
					expect(Object.keys(item).sort()).toEqual(['allergen_id', 'name', 'user_count'])
					const idx = names.indexOf(item.name)
					expect(item.allergen_id).toBe(idx + 1)
					expect(item.user_count).toBe(counts[idx])
				}

				// flag counts
				expect(res.allergen_flag_counts.map((a: any) => a.name).sort()).toEqual([...names].sort())
				for (const item of res.allergen_flag_counts) {
					expect(Object.keys(item).sort()).toEqual(['allergen_id', 'flag_count', 'last_flagged_at', 'name', 'top_products'])
					const expectedCount = s.allFlags.filter((f: any) => f.flag_reason.toLowerCase().includes(item.name.toLowerCase())).length
					expect(item.flag_count).toBe(expectedCount)
					expect(item.top_products.length).toBeLessThanOrEqual(3)
					for (const p of item.top_products) {
						expect(Object.keys(p).sort()).toEqual(['brand_name', 'flag_count', 'product_id', 'product_name'])
					}
				}
			}),
			{ numRuns: 40 },
		)
	})
})

// ─────────────────────────── Source preservation ───────────────────────────
const UI = resolve(__dirname, '../../../omniscan-ui/src/views/admin')
const read = (f: string) => readFileSync(resolve(UI, f), 'utf-8').replace(/\r\n/g, '\n')
const API = resolve(__dirname, '../api/admin')
const readApi = (f: string) => readFileSync(resolve(API, f), 'utf-8').replace(/\r\n/g, '\n')
const has = (file: string, src: string, p: string | RegExp) =>
	expect(typeof p === 'string' ? src.includes(p) : p.test(src), `${file} should contain ${String(p)}`).toBe(true)

describe('Source preservation (3.1, 3.2, 3.3, 3.4, 3.7, 3.12, 3.13)', () => {
	it('AdminDashboard.vue keeps kept panels', () => {
		const F = 'AdminDashboard.vue'
		const src = read(F)
		for (const t of ['Scans over time', 'Halal certifiers needing attention', 'Allergens listed by Consumers', '/admin/systemlogs?tab=flag-audit']) {
			has(F, src, t)
		}
	})

	it('dashboard.get.ts keeps allergen_distribution top 8 and scan_verdicts', () => {
		const src = readApi('dashboard.get.ts')
		has('dashboard.get.ts', src, /\.slice\(0,\s*8\)/)
		has('dashboard.get.ts', src, 'scan_verdicts')
	})

	it('AdminSystemLogs.vue keeps "Consumers who listed each allergen" and flag-audit tab handling', () => {
		const F = 'AdminSystemLogs.vue'
		const src = read(F)
		has(F, src, 'Consumers who listed each allergen')
		has(F, src, "'flag-audit'")
		has(F, src, 'topProfileAllergens')
	})

	it('AdminManageProductData.vue keeps Allergen/Halal/Ingredient tabs and ?tab=halal branch', () => {
		const F = 'AdminManageProductData.vue'
		const src = read(F)
		has(F, src, 'Allergen Dictionary')
		has(F, src, 'Halal Logo Library')
		has(F, src, 'Ingredient Mappings')
		has(F, src, "switchTab('halal')")
		has(F, src, "tabParam === 'halal'")
		has(F, src, "activeTab === 'ingredient'")
		has(F, src, "activeTab === 'allergen'")
	})

	it('VerificationPanel.vue keeps Exceptions queue, Needs decision, ?card= and needs-decision handling', () => {
		const F = 'VerificationPanel.vue'
		const src = read(F)
		has(F, src, 'Exceptions queue')
		has(F, src, 'Needs decision')
		has(F, src, 'route.query.card')
		has(F, src, "'needs-decision'")
	})

	it('flag-audit-stats.get.ts keeps response keys', () => {
		const src = readApi('flag-audit-stats.get.ts')
		for (const k of ['allergen_profile_counts', 'allergen_flag_counts', 'total_active_consumers', 'user_count', 'flag_count', 'top_products']) {
			has('flag-audit-stats.get.ts', src, k)
		}
	})
})
