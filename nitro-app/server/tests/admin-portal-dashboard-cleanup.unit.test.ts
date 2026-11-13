// Unit + property tests for the helpers and handlers added by admin-portal-dashboard-cleanup.
//
// Validates: Requirements 2.4, 2.7, 2.9, 2.10, 2.11, 3.5, 3.8, 3.13

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const h = vi.hoisted(() => {
	const state: any = {
		query: {} as any,
		pending: [] as any[],
		resolved: [] as any[],
		thumbCalls: [] as any[],
		totalScans: 0,
		scans: [] as any[],
		scanGroups: [] as any[],
		library: [] as any[],
		links: [] as any[],
		users: [] as any[],
		allergens: [] as any[],
		activeConsumers: 0,
	}

	const prisma: any = {
		$queryRaw: async () => [{ '?column?': 1 }],
		scan: {
			count: async () => state.totalScans,
			findMany: async () => state.scans,
			groupBy: async () => state.scanGroups,
		},
		flaggedScan: {
			count: async (args: any = {}) => {
				const st = args?.where?.status
				if (st === 'pending') return state.pending.length
				if (st && Array.isArray(st.in)) return state.resolved.length
				return 0
			},
			findMany: async (args: any = {}) => {
				const w = args?.where ?? {}
				if (w.status === 'pending') return state.pending
				if (w.status?.in) return state.resolved
				if (w.id?.in) {
					state.thumbCalls.push(w.id.in)
					return (w.id.in as number[]).map((id) => ({
						id,
						logo_crop_base64: `crop-${id}`,
						scan: { product: { image_base64: null } },
					}))
				}
				return []
			},
		},
		user: {
			count: async (args: any = {}) => {
				const w = args?.where ?? {}
				if (w.session_token) {
					const gte: Date = w.last_active.gte
					return state.users.filter(
						(u: any) => u.session_token != null && u.last_active != null && u.last_active.getTime() >= gte.getTime(),
					).length
				}
				if (w.deleted_at === null && Object.keys(w).length === 1) return state.activeConsumers
				return 0
			},
			findMany: async () => state.users,
		},
		allergen: {
			findMany: async (args: any = {}) => (args?.where ? [] : state.allergens),
		},
		halalLogo: { findMany: async (args: any = {}) => (args?.where ? [] : state.library) },
		productHalalLogo: { findMany: async () => state.links },
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
import { groupFlagsByLogo, getUnresolvedLogoSummary, isHalalReason, flagGroupKey } from '../utils/flagGroups'
import { onlineWhere, isOnline, onlineSince, ONLINE_WINDOW_MS } from '../utils/onlineStatus'

const fakeEvent = () => ({ node: { req: { headers: {}, url: '/' }, res: {} }, context: { admin: {} } }) as any
const NOW = new Date('2026-03-15T12:00:00.000Z')
const MIN = 60000

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(NOW)
	const s = h.state
	s.query = {}
	s.pending = []
	s.resolved = []
	s.thumbCalls = []
	s.totalScans = 0
	s.scans = []
	s.scanGroups = []
	s.library = []
	s.links = []
	s.users = []
	s.allergens = []
	s.activeConsumers = 0
})
afterEach(() => vi.useRealTimers())

// ── helpers ──────────────────────────────────────────────────────────
const HALAL_REASONS = ['Unrecognized halal logo', 'Missing certification stamp', 'Halal compliance', 'Bad LOGO']
const OTHER_REASONS = ['Peanut allergen detected', 'Wrong ingredients', 'Blurry']

const pendingRow = (id: number, reason: string, name: string | null, userId = 1) => ({
	id,
	flag_reason: reason,
	created_at: new Date(NOW.getTime() - id * 1000),
	logo_crop_base64: null,
	scan: { user_id: userId, product: name === null ? null : { id: id + 1000, product_name: name, image_base64: null } },
})

const resolvedRow = (id: number, status: string, updated: Date, name: string, reason = 'Halal logo') => ({
	id,
	status,
	flag_reason: reason,
	updated_at: updated,
	scan: { user_id: 1, product: { id: id + 1000, product_name: name } },
})

// Independent reference model of the unresolved grouping.
function modelGroups(rows: { id: number; reason: string; name: string | null }[]) {
	const halal = rows.filter((r) => isHalalReasonModel(r.reason))
	const map = new Map<string, number[]>()
	for (const r of halal) {
		const key = r.name || `flag-${r.id}`
		if (!map.has(key)) map.set(key, [])
		map.get(key)!.push(r.id)
	}
	return { map, scanCount: halal.length }
}
function isHalalReasonModel(reason: string) {
	const l = reason.toLowerCase()
	return ['halal', 'slaughter', 'certif', 'stamp', 'logo', 'compliance'].some((k) => l.includes(k))
}

const flagRowsArb = fc.array(
	fc.record({
		reason: fc.constantFrom(...HALAL_REASONS, ...OTHER_REASONS),
		name: fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { nil: null }),
	}),
	{ maxLength: 40 },
).map((rs) => rs.map((r, i) => ({ id: i + 1, ...r })))

// ─────────────────────────── flagGroups ───────────────────────────
describe('flagGroups helpers', () => {
	it('groups by product name, falls back to flag-<id>, keeps first-seen order', () => {
		const rows = [
			pendingRow(1, 'halal', 'B'),
			pendingRow(2, 'halal', null),
			pendingRow(3, 'halal', 'A'),
			pendingRow(4, 'halal', 'B'),
		]
		const groups = groupFlagsByLogo(rows)
		expect([...groups.keys()]).toEqual(['B', 'flag-2', 'A'])
		expect(groups.get('B')!.map((r) => r.id)).toEqual([1, 4])
		expect(flagGroupKey(rows[1])).toBe('flag-2')
	})

	it('getUnresolvedLogoSummary excludes non-halal reasons and counts groups and rows', async () => {
		const db: any = {
			flaggedScan: {
				findMany: async () => [
					pendingRow(1, 'Unrecognized halal logo', 'A'),
					pendingRow(2, 'Peanut allergen detected', 'B'),
					pendingRow(3, 'Missing certification stamp', 'A'),
					pendingRow(4, 'Halal compliance', null),
				],
			},
		}
		expect(await getUnresolvedLogoSummary(db)).toEqual({ logoCount: 2, scanCount: 3 })
	})

	it('isHalalReason is case-insensitive', () => {
		expect(isHalalReason('HALAL')).toBe(true)
		expect(isHalalReason('peanut')).toBe(false)
	})
})

// ─────────────────────────── onlineStatus ───────────────────────────
describe('onlineStatus helpers', () => {
	it('onlineWhere uses a 2 minute window and requires a session token', () => {
		const w = onlineWhere(NOW)
		expect(ONLINE_WINDOW_MS).toBe(120000)
		expect(w.session_token).toEqual({ not: null })
		expect(w.last_active.gte.getTime()).toBe(NOW.getTime() - 2 * MIN)
		expect(onlineSince(NOW).getTime()).toBe(NOW.getTime() - 2 * MIN)
	})

	it('isOnline boundaries', () => {
		const at = (ms: number) => new Date(NOW.getTime() - ms)
		expect(isOnline({ session_token: 't', last_active: at(2 * MIN) }, NOW)).toBe(true)
		expect(isOnline({ session_token: 't', last_active: at(2 * MIN + 1) }, NOW)).toBe(false)
		expect(isOnline({ session_token: null, last_active: at(0) }, NOW)).toBe(false)
		expect(isOnline({ session_token: '', last_active: at(0) }, NOW)).toBe(false)
		expect(isOnline({ session_token: 't', last_active: null }, NOW)).toBe(false)
	})
})

// ─────────────────────────── Dashboard halal chart ───────────────────────────
describe('Dashboard halal_logo_scans', () => {
	it('computes counts, pct, zero-scan logos, multi-logo products and sort order', async () => {
		const s = h.state
		s.library = [
			{ id: 1, certifier: 'B-Cert', full_name: 'B' },
			{ id: 2, certifier: 'A-Cert', full_name: 'A' },
			{ id: 3, certifier: 'Z-Zero', full_name: 'Z' },
			{ id: 4, certifier: 'C-Zero', full_name: 'C' },
		]
		s.scanGroups = [
			{ product_id: 10, _count: { _all: 3 } },
			{ product_id: 11, _count: { _all: 1 } },
		]
		// product 10 has two logos (1 and 2); product 11 only logo 1
		s.links = [
			{ product_id: 10, halal_logo_id: 1 },
			{ product_id: 10, halal_logo_id: 2 },
			{ product_id: 11, halal_logo_id: 1 },
		]
		const res: any = await dashboardHandler(fakeEvent())
		const { total, logos } = res.halal_logo_scans
		expect(total).toBe(7)
		expect(logos.map((l: any) => [l.certifier, l.count, l.pct])).toEqual([
			['B-Cert', 4, 57.1],
			['A-Cert', 3, 42.9],
			['C-Zero', 0, 0],
			['Z-Zero', 0, 0],
		])
		expect(logos.reduce((a: number, l: any) => a + l.count, 0)).toBe(total)
		expect(res.stats.total_consumers).toBe(res.stats.active_consumers)
	})

	it('zero total yields pct 0 for every logo without dividing by zero', async () => {
		h.state.library = [
			{ id: 1, certifier: 'X', full_name: 'x' },
			{ id: 2, certifier: 'Y', full_name: 'y' },
		]
		const res: any = await dashboardHandler(fakeEvent())
		expect(res.halal_logo_scans.total).toBe(0)
		expect(res.halal_logo_scans.logos.map((l: any) => l.pct)).toEqual([0, 0])
		expect(res.scan_verdicts).toBeDefined()
	})
})

// ─────────────────────────── Queue resolved mode ───────────────────────────
describe('verification-queue resolved mode', () => {
	const t = (min: number) => new Date(NOW.getTime() - min * MIN)

	it('default mode returns resolved: [] plus resolved metrics', async () => {
		h.state.pending = [pendingRow(1, 'halal logo', 'A')]
		h.state.resolved = [resolvedRow(5, 'approved', t(10), 'R1')]
		const res: any = await queueHandler(fakeEvent())
		expect(res.resolved).toEqual([])
		expect(res.unmatched).toHaveLength(1)
		expect(res.metrics.resolved_logos).toBe(1)
		expect(res.metrics.resolved_logo_scans).toBe(1)
		expect(h.state.thumbCalls).toEqual([])
	})

	it('outcome comes from the latest updated_at in a group; newest decision first; non-halal excluded', async () => {
		h.state.query = { status: 'resolved' }
		h.state.resolved = [
			resolvedRow(1, 'approved', t(60), 'Old'),
			resolvedRow(2, 'dismissed', t(30), 'Old'), // latest in group Old => dismissed
			resolvedRow(3, 'approved', t(5), 'New'),
			resolvedRow(4, 'approved', t(1), 'Other', 'Peanut allergen'), // excluded
		]
		const res: any = await queueHandler(fakeEvent())
		expect(res.unmatched).toEqual([])
		expect(res.resolved.map((c: any) => [c.outcome, c.outcomeLabel, c.scanCount])).toEqual([
			['approved', 'Added to certifier registry', 1],
			['dismissed', 'Not a Halal certifier', 2],
		])
		expect(res.resolved[0].decidedAt).toBe(t(5).toISOString())
		expect(res.resolved[1].decidedAt).toBe(t(30).toISOString())
		expect(res.resolved.map((c: any) => c.title)).toEqual([
			'Unrecognized Halal logo #1',
			'Unrecognized Halal logo #2',
		])
		expect(res.metrics.resolved_logos).toBe(2)
		expect(res.metrics.resolved_logo_scans).toBe(3)
	})

	it('paginates the resolved list and fetches thumbnails only for the requested page', async () => {
		h.state.query = { status: 'resolved', page: '2', pageSize: '2' }
		h.state.resolved = [
			resolvedRow(1, 'approved', t(1), 'G1'),
			resolvedRow(2, 'approved', t(2), 'G2'),
			resolvedRow(3, 'approved', t(3), 'G3'),
			resolvedRow(4, 'dismissed', t(4), 'G3'),
			resolvedRow(5, 'approved', t(5), 'G4'),
		]
		const res: any = await queueHandler(fakeEvent())
		expect(res.pagination).toEqual({ page: 2, page_size: 2, total: 4, total_pages: 2 })
		expect(res.resolved).toHaveLength(2)
		expect(res.resolved[0].title).toBe('Unrecognized Halal logo #3')
		expect(h.state.thumbCalls).toHaveLength(1)
		expect([...h.state.thumbCalls[0]].sort()).toEqual([3, 4, 5])
		expect(res.resolved[0].thumb).toContain('crop-')
	})

	it('a page beyond the last returns no cards and requests no thumbnails', async () => {
		h.state.query = { status: 'resolved', page: '9', pageSize: '10' }
		h.state.resolved = [resolvedRow(1, 'approved', t(1), 'G1')]
		const res: any = await queueHandler(fakeEvent())
		expect(res.resolved).toEqual([])
		expect(res.pagination.total_pages).toBe(1)
		expect(h.state.thumbCalls).toEqual([])
	})
})

// ─────────────────────────── flag-audit-stats ───────────────────────────
describe('flag-audit-stats allergen_profile_counts', () => {
	it('lists every allergen (predefined and custom, incl. 0-count) sorted count desc then name asc', async () => {
		h.state.allergens = [
			{ id: 1, name: 'Soy', _count: { users: 3 } },
			{ id: 2, name: 'Milk', _count: { users: 5 } },
			{ id: 3, name: 'Lupin', _count: { users: 0 } },
			{ id: 4, name: 'Egg', _count: { users: 3 } },
			{ id: 5, name: 'Custom Seed', _count: { users: 0 } },
		]
		h.state.activeConsumers = 8
		const res: any = await flagAuditHandler(fakeEvent())
		expect(res.allergen_profile_counts.map((a: any) => [a.name, a.user_count])).toEqual([
			['Milk', 5],
			['Egg', 3],
			['Soy', 3],
			['Custom Seed', 0],
			['Lupin', 0],
		])
		expect(Object.keys(res.allergen_profile_counts[0]).sort()).toEqual(['allergen_id', 'name', 'user_count'])
		expect(Object.keys(res).sort()).toEqual(
			['allergen_flag_counts', 'allergen_profile_counts', 'success', 'total_active_consumers'],
		)
	})
})

// ─────────────────────────── User list query parsing ───────────────────────────
describe('AdminManageUserProfile query parsing', () => {
	const SRC = readFileSync(
		resolve(__dirname, '../../../omniscan-ui/src/views/admin/AdminManageUserProfile.vue'),
		'utf8',
	)

	// Local model mirroring firstQueryValue/applyQueryFilters.
	const first = (v: unknown): string => {
		const raw = Array.isArray(v) ? v[0] : v
		return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
	}
	const apply = (q: { status?: unknown; sort?: unknown }, current = 'All statuses'): string => {
		const status = first(q.status)
		const value = status || first(q.sort)
		if (value === 'online') return 'Online'
		if (value === 'offline' && status) return 'Offline'
		return current
	}

	it('status=online and sort=online select Online', () => {
		expect(apply({ status: 'online' })).toBe('Online')
		expect(apply({ sort: 'online' })).toBe('Online')
		expect(apply({ status: ' ONLINE ' })).toBe('Online')
		expect(apply({ status: ['online', 'x'] })).toBe('Online')
	})

	it('status wins over sort when both are present', () => {
		expect(apply({ sort: 'online', status: 'offline' })).toBe('Offline')
		expect(apply({ sort: 'online', status: 'active' }, 'All statuses')).toBe('All statuses')
	})

	it('unknown values and sort=offline leave the filter unchanged', () => {
		expect(apply({ status: 'bogus' }, 'Archived')).toBe('Archived')
		expect(apply({ sort: 'newest' }, 'Archived')).toBe('Archived')
		expect(apply({ sort: 'offline' }, 'Archived')).toBe('Archived')
		expect(apply({}, 'Archived')).toBe('Archived')
	})

	it('the .vue source implements the same rules (status wins over sort)', () => {
		expect(SRC).toMatch(/const status = firstQueryValue\(route\.query\.status\)/)
		expect(SRC).toMatch(/const value = status \|\| firstQueryValue\(route\.query\.sort\)/)
		expect(SRC).toMatch(/value === 'online'\) filterStatus\.value = 'Online'/)
		expect(SRC).toMatch(/value === 'offline' && status\) filterStatus\.value = 'Offline'/)
		expect(SRC).toMatch(/\.trim\(\)\.toLowerCase\(\)/)
	})
})

// ─────────────────────────── Property tests (fix checking) ───────────────────────────
describe('Property: fix checking', () => {
	it('unresolved summary equals queue needs_decision / needs_decision_scans, and the dashboard', async () => {
		await fc.assert(
			fc.asyncProperty(flagRowsArb, async (rows) => {
				h.state.pending = rows.map((r) => pendingRow(r.id, r.reason, r.name))
				const q: any = await queueHandler(fakeEvent())
				const summary = await getUnresolvedLogoSummary(h.prisma)
				const dash: any = await dashboardHandler(fakeEvent())
				const model = modelGroups(rows)
				expect(summary.logoCount).toBe(q.metrics.needs_decision)
				expect(summary.scanCount).toBe(q.metrics.needs_decision_scans)
				expect(summary.logoCount).toBe(model.map.size)
				expect(summary.scanCount).toBe(model.scanCount)
				expect(dash.stats.unresolved_logos).toBe(q.metrics.needs_decision)
				expect(dash.stats.unresolved_logo_scans).toBe(q.metrics.needs_decision_scans)
			}),
			{ numRuns: 60 },
		)
	})

	it('queue without status returns unmatched cards equal to the reference grouping', async () => {
		await fc.assert(
			fc.asyncProperty(flagRowsArb, async (rows) => {
				h.state.query = { pageSize: '50' }
				h.state.pending = rows.map((r) => pendingRow(r.id, r.reason, r.name))
				const q: any = await queueHandler(fakeEvent())
				const model = [...modelGroups(rows).map.values()]
				expect(q.resolved).toEqual([])
				expect(q.unmatched.map((c: any) => c.rawIds)).toEqual(model)
				expect(q.unmatched.map((c: any) => c.title)).toEqual(
					model.map((_, i) => `Unrecognized Halal logo #${i + 1}`),
				)
				expect(q.unmatched.map((c: any) => c.scanCount)).toEqual(model.map((ids) => ids.length))
			}),
			{ numRuns: 60 },
		)
	})

	it('halal chart: logos.length = library size; pct sums to 100 (+-0.1) or all 0 when total is 0', async () => {
		const arb = fc.record({
			logoCount: fc.integer({ min: 0, max: 8 }),
			scans: fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 0, maxLength: 6 }),
			links: fc.array(fc.tuple(fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 7 })), { maxLength: 20 }),
		})
		await fc.assert(
			fc.asyncProperty(arb, async ({ logoCount, scans, links }) => {
				const s = h.state
				s.library = Array.from({ length: logoCount }, (_, i) => ({ id: i, certifier: `C${i}`, full_name: `F${i}` }))
				s.scanGroups = scans.map((n, i) => ({ product_id: i, _count: { _all: n } }))
				const uniq = new Map<string, { product_id: number; halal_logo_id: number }>()
				for (const [p, l] of links) uniq.set(`${p}-${l}`, { product_id: p, halal_logo_id: l })
				s.links = [...uniq.values()]
				const res: any = await dashboardHandler(fakeEvent())
				const { total, logos } = res.halal_logo_scans
				expect(logos).toHaveLength(logoCount)
				// expected total: scans of linked products, once per link to an existing library logo
				const expected = s.links.reduce(
					(a: number, l: any) => a + (l.halal_logo_id < logoCount ? (scans[l.product_id] ?? 0) : 0),
					0,
				)
				expect(total).toBe(expected)
				expect(total).toBe(logos.reduce((a: number, l: any) => a + l.count, 0))
				const sum = logos.reduce((a: number, l: any) => a + l.pct, 0)
				if (total > 0) expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.1 + logoCount * 0.05)
				else expect(logos.every((l: any) => l.pct === 0)).toBe(true)
				for (let i = 1; i < logos.length; i++) {
					const a = logos[i - 1]
					const b = logos[i]
					expect(a.count > b.count || (a.count === b.count && a.certifier <= b.certifier)).toBe(true)
				}
			}),
			{ numRuns: 80 },
		)
	})

	it('dashboard online_consumers equals the rows users.get marks is_online', async () => {
		const userArb = fc.record({
			token: fc.boolean(),
			// offset from now in ms: covers future-ish, inside, boundary and outside the window
			offset: fc.option(fc.constantFrom(0, 1000, 60000, 119999, 120000, 120001, 600000, 86400000), { nil: null }),
		})
		await fc.assert(
			fc.asyncProperty(fc.array(userArb, { maxLength: 30 }), async (specs) => {
				h.state.users = specs.map((u, i) => ({
					id: i + 1,
					name: `U${i}`,
					username: null,
					email: `u${i}@x.com`,
					status: 'active',
					created_at: new Date(NOW.getTime() - 86400000),
					last_active: u.offset === null ? null : new Date(NOW.getTime() - u.offset),
					avatar_base64: null,
					session_token: u.token ? 'tok' : null,
					_count: { scan: 0, pantry_item: 0 },
				}))
				h.state.query = {}
				const dash: any = await dashboardHandler(fakeEvent())
				const users: any = await usersHandler(fakeEvent())
				const flagged = users.users.filter((r: any) => r.is_online).length
				expect(dash.stats.online_consumers).toBe(flagged)
				const modelCount = specs.filter((u) => u.token && u.offset !== null && u.offset <= 120000).length
				expect(flagged).toBe(modelCount)
			}),
			{ numRuns: 60 },
		)
	})

	it('flag-audit-stats: same length as the dictionary, sorted count desc then name asc, includes every 0-count allergen', async () => {
		const arb = fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { maxLength: 25 }).chain((names) =>
			fc.tuple(
				fc.constant(names),
				fc.array(fc.integer({ min: 0, max: 4 }), { minLength: names.length, maxLength: names.length }),
			),
		)
		await fc.assert(
			fc.asyncProperty(arb, async ([names, counts]) => {
				h.state.allergens = names.map((name, i) => ({ id: i + 1, name, _count: { users: counts[i] } }))
				const res: any = await flagAuditHandler(fakeEvent())
				const list = res.allergen_profile_counts
				expect(list).toHaveLength(names.length)
				for (let i = 1; i < list.length; i++) {
					const a = list[i - 1]
					const b = list[i]
					expect(a.user_count > b.user_count || (a.user_count === b.user_count && a.name.localeCompare(b.name) <= 0)).toBe(true)
				}
				const zeroIn = h.state.allergens.filter((a: any) => a._count.users === 0).map((a: any) => a.name).sort()
				const zeroOut = list.filter((a: any) => a.user_count === 0).map((a: any) => a.name).sort()
				expect(zeroOut).toEqual(zeroIn)
			}),
			{ numRuns: 80 },
		)
	})
})
