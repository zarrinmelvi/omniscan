// Bug condition exploration test (Property 1) for admin-portal-dashboard-cleanup.
// Encodes the EXPECTED (fixed) behavior, so it is meant to FAIL on unfixed code.
// The "scan_verdicts stays in the dashboard response" case is a guard and passes before and after.
//
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const h = vi.hoisted(() => {
	const state: any = {
		query: {} as any,
		// dashboard
		halalLogos: [] as any[],
		productHalalLinks: [] as any[],
		scanGroups: [] as any[],
		// queue
		resolvedFlags: [] as any[],
		// flag audit
		allergens: [] as any[],
	}

	const prisma: any = {
		$queryRaw: async () => [{ '?column?': 1 }],
		scan: {
			count: async () => 0,
			findMany: async () => [],
			groupBy: async () => state.scanGroups,
		},
		flaggedScan: {
			count: async () => 0,
			findMany: async (args: any = {}) => {
				const st = args?.where?.status
				if (st && typeof st === 'object' && Array.isArray(st.in) && st.in.includes('approved')) return state.resolvedFlags
				return []
			},
		},
		user: { count: async () => 0 },
		allergen: { findMany: async () => state.allergens },
		// The "attention certifiers" query filters (where.is_active); the library list has no filter.
		halalLogo: { findMany: async (args: any = {}) => (args?.where ? [] : state.halalLogos) },
		productHalalLogo: { findMany: async () => state.productHalalLinks },
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

const fakeEvent = () => ({ node: { req: { headers: {}, url: '/' }, res: {} }, context: { admin: {} } }) as any

const UI = resolve(__dirname, '../../../omniscan-ui/src/views/admin')
const read = (f: string) => readFileSync(resolve(UI, f), 'utf-8').replace(/\r\n/g, '\n')
// Boolean asserts keep failure output short (no full-file diffs).
const test = (src: string, p: string | RegExp) => (typeof p === 'string' ? src.includes(p) : p.test(src))
const has = (file: string, src: string, p: string | RegExp) =>
	expect(test(src, p), `${file} should contain ${String(p)}`).toBe(true)
const lacks = (file: string, src: string, p: string | RegExp) =>
	expect(test(src, p), `${file} should NOT contain ${String(p)}`).toBe(false)

beforeEach(() => {
	h.state.query = {}
	h.state.halalLogos = []
	h.state.productHalalLinks = []
	h.state.scanGroups = []
	h.state.resolvedFlags = []
	h.state.allergens = []
})

describe('Dashboard API (2.7, 2.8, 2.10)', () => {
	it('stats includes unresolved_logos, unresolved_logo_scans, total_consumers, online_consumers', async () => {
		const res: any = await dashboardHandler(fakeEvent())
		for (const key of ['unresolved_logos', 'unresolved_logo_scans', 'total_consumers', 'online_consumers']) {
			expect(res.stats, `stats.${key} missing`).toHaveProperty(key)
		}
	})

	it('halal_logo_scans lists zero-count library logos and pct is 0 when total is 0', async () => {
		h.state.halalLogos = [
			{ id: 1, certifier: 'JAKIM', full_name: 'Jabatan Kemajuan Islam Malaysia' },
			{ id: 2, certifier: 'IDCP', full_name: 'Islamic Dawah Council of the Philippines' },
		]
		const res: any = await dashboardHandler(fakeEvent())
		expect(res.halal_logo_scans, 'halal_logo_scans missing').toBeDefined()
		expect(res.halal_logo_scans.total).toBe(0)
		expect(res.halal_logo_scans.logos).toHaveLength(2)
		for (const l of res.halal_logo_scans.logos) {
			expect(l.count).toBe(0)
			expect(l.pct).toBe(0)
		}
	})

	it('GUARD: scan_verdicts stays in the dashboard response', async () => {
		const res: any = await dashboardHandler(fakeEvent())
		expect(res).toHaveProperty('scan_verdicts')
		expect(res.scan_verdicts).toHaveProperty('total')
	})
})

describe('Verification queue API (2.4)', () => {
	it('metrics.resolved_logos exists', async () => {
		const res: any = await queueHandler(fakeEvent())
		expect(res.metrics, 'metrics.resolved_logos missing').toHaveProperty('resolved_logos')
	})

	it('status=resolved returns resolved cards with outcome and decidedAt', async () => {
		h.state.query = { status: 'resolved' }
		h.state.resolvedFlags = [
			{
				id: 11,
				status: 'approved',
				flag_reason: 'Unrecognized halal logo',
				updated_at: new Date('2026-01-02T00:00:00Z'),
				logo_crop_base64: null,
				scan: { user_id: 1, product: { id: 5, product_name: 'Noodles', image_base64: null } },
			},
		]
		const res: any = await queueHandler(fakeEvent())
		expect(Array.isArray(res.resolved), 'resolved list missing').toBe(true)
		expect(res.resolved).toHaveLength(1)
		expect(res.resolved[0].outcome).toBe('approved')
		expect(res.resolved[0].decidedAt).toBeTruthy()
	})
})

describe('Flag audit stats API (2.11)', () => {
	it('lists all 12 allergens sorted by user_count desc then name asc, keys unchanged', async () => {
		// Counts chosen with ties; input order is deliberately NOT name-ascending within ties.
		const spec: [string, number][] = [
			['Soy', 3], ['Egg', 3], ['Milk', 5], ['Lupin', 0], ['Fish', 0], ['Wheat', 2],
			['Peanut', 2], ['Sesame', 1], ['Celery', 0], ['Mustard', 1], ['Sulphites', 0], ['Tree nuts', 4],
		]
		h.state.allergens = spec.map(([name, n], i) => ({ id: i + 1, name, _count: { users: n } }))
		const res: any = await flagAuditHandler(fakeEvent())

		expect(Object.keys(res).sort()).toEqual(['allergen_flag_counts', 'allergen_profile_counts', 'success', 'total_active_consumers'])
		expect(res.allergen_profile_counts).toHaveLength(12)
		const expected = [...spec]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([name]) => name)
		expect(res.allergen_profile_counts.map((a: any) => a.name)).toEqual(expected)
		expect(res.allergen_profile_counts.filter((a: any) => a.user_count === 0)).toHaveLength(4)
	})
})

describe('AdminDashboard.vue source (2.5, 2.7, 2.8, 2.10, 2.12)', () => {
	const F = 'AdminDashboard.vue'
	const src = read(F)
	it('has no Total scans card', () => lacks(F, src, 'Total scans'))
	it('has no Scan verdicts panel', () => lacks(F, src, 'Scan verdicts'))
	it('has no donut', () => lacks(F, src, 'donut-svg'))
	it('contains the new cards and chart', () => {
		for (const label of ['Unresolved logos', 'Total Consumers', 'Online now', 'Scans by Halal logo', '/admin/productsdata?tab=halal']) {
			has(F, src, label)
		}
	})
	it('View all still links to Flag Audit', () => has(F, src, 'to="/admin/systemlogs?tab=flag-audit"'))
})

describe('VerificationPanel.vue source (2.3, 2.4, 2.13)', () => {
	const F = 'VerificationPanel.vue'
	const src = read(F)
	it('has no metric cards', () => {
		lacks(F, src, 'Auto-resolved by AI')
		lacks(F, src, 'Resolved this week')
	})
	it('has a Resolved tab', () => has(F, src, /Resolved\s*\{\{/))
	it('persists decisions via approve and dismiss endpoints', () => {
		has(F, src, '/approve')
		has(F, src, '/dismiss')
	})
})

describe('AdminManageUserProfile.vue source (2.6, 2.9)', () => {
	const F = 'AdminManageUserProfile.vue'
	const src = read(F)
	it('has no SCANS column', () => {
		lacks(F, src, '<th>SCANS</th>')
		lacks(F, src, 'scan-count-cell')
	})
	it('reads route.query for online', () => {
		has(F, src, /route\.query/)
		has(F, src, /['"]online['"]/i)
	})
})

describe('AdminManageProductData.vue source (2.1)', () => {
	const F = 'AdminManageProductData.vue'
	const src = read(F)
	it('has no Products tab', () => lacks(F, src, "switchTab('products')"))
})

describe('AdminSystemLogs.vue source (2.2, 2.11)', () => {
	const F = 'AdminSystemLogs.vue'
	const src = read(F)
	it('has no "Times scans were flagged" section', () => lacks(F, src, 'Times scans were flagged'))
	it('topProfileAllergens does not truncate to 8', () => {
		const start = src.indexOf('const topProfileAllergens')
		expect(start, 'topProfileAllergens must keep its name').toBeGreaterThan(-1)
		lacks(F, src.slice(start, start + 400), /\.slice\(0,\s*8\)/)
	})
})
