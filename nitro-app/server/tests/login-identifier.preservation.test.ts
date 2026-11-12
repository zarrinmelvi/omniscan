// Preservation tests (Property 2) for email login and untouched surfaces.
// Observation-first: these pass on UNFIXED code and must still pass after the fix.
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7, 3.8, 3.9, 3.10, 3.11

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	const state: any = { users: [] as any[], body: {} as any, signCalls: [] as any[], audits: [] as any[], updates: [] as any[] }

	const match = (row: any, where: any = {}) => Object.entries(where).every(([k, c]) => (row[k] === undefined ? null : row[k]) === c)

	const prisma: any = {
		user: {
			findUnique: async ({ where }: any) => {
				const r = state.users.find((u: any) => match(u, where))
				return r ? { ...r } : null
			},
			findMany: async ({ where, take }: any) =>
				state.users
					.filter((u: any) => match(u, where))
					.slice(0, take ?? 1000)
					.map((u: any) => ({ ...u })),
			update: async ({ where, data }: any) => {
				state.updates.push({ op: 'update', where, data })
				const r = state.users.find((u: any) => match(u, where))
				if (r) Object.assign(r, data)
				return r ? { ...r } : null
			},
			updateMany: async ({ where, data }: any) => {
				state.updates.push({ op: 'updateMany', where, data })
				let count = 0
				for (const r of state.users) {
					if (match(r, where)) {
						Object.assign(r, data)
						count++
					}
				}
				return { count }
			},
		},
	}
	return { state, prisma }
})

vi.mock('../lib/prisma', () => ({ prisma: h.prisma }))
vi.mock('../lib/audit-logger', () => ({
	logAuditEvent: vi.fn(async (e: any) => {
		h.state.audits.push(e)
	}),
}))
vi.mock('bcrypt', () => ({
	default: {
		// Stored hash is `h(<password>)`; compare succeeds only for the matching password.
		compare: vi.fn(async (pw: string, hash: string) => hash === `h(${pw})`),
	},
}))
vi.mock('jsonwebtoken', () => ({
	default: {
		sign: vi.fn((payload: any, secret: any, opts: any) => {
			h.state.signCalls.push({ payload, secret, opts })
			return 'signed-token'
		}),
		verify: vi.fn(),
	},
}))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body) }
})

import loginHandler from '../api/auth/login.post'

const fakeEvent = () => ({ node: { req: { headers: {}, url: '/' }, res: {} } }) as any

const makeUser = (over: any = {}) => ({
	id: 7,
	name: 'Juan Dela',
	email: 'user@gmail.com',
	username: 'juan_dela',
	password: 'h(pw)',
	email_verified: true,
	avatar_base64: null,
	status: 'ACTIVE',
	session_token: 'old-session',
	last_active: new Date(0),
	archived_at: null,
	inactivity_warning_sent_at: new Date(1),
	...over,
})

const run = async () => {
	try {
		return { ok: true as const, value: await (loginHandler as any)(fakeEvent()) }
	} catch (e: any) {
		return { ok: false as const, status: e.statusCode, message: e.statusMessage, data: e.data }
	}
}

beforeEach(() => {
	h.state.users = []
	h.state.body = {}
	h.state.signCalls = []
	h.state.audits = []
	h.state.updates = []
})

const emailArb = fc.emailAddress().filter((e) => e.trim() === e && e.includes('@'))
const statusArb = fc.constantFrom('ACTIVE', 'ARCHIVED')

describe('Property 2: email login preservation', () => {
	it('verified email login returns the observed shape, JWT claims and session writes', async () => {
		await fc.assert(
			fc.asyncProperty(emailArb, statusArb, fc.string({ minLength: 1, maxLength: 20 }), async (email, status, pw) => {
				h.state.users = [makeUser({ email, status, password: `h(${pw})`, archived_at: status === 'ARCHIVED' ? new Date(5) : null })]
				h.state.body = { email, password: pw }
				h.state.signCalls = []
				h.state.audits = []
				h.state.updates = []

				const r: any = await run()
				expect(r.ok).toBe(true)
				expect(r.value).toEqual({
					token: 'signed-token',
					user: { id: 7, name: 'Juan Dela', email, avatar_base64: null },
					message: 'Login successful',
				})

				// JWT payload and expiry
				expect(h.state.signCalls).toHaveLength(1)
				const { payload, opts } = h.state.signCalls[0]
				expect(Object.keys(payload).sort()).toEqual(['email', 'sid', 'userId'])
				expect(payload.userId).toBe(7)
				expect(payload.email).toBe(email)
				expect(opts).toEqual({ expiresIn: '7d' })

				// Session writes
				const u = h.state.users[0]
				expect(u.session_token).toBe(payload.sid)
				expect(u.session_token).not.toBe('old-session')
				expect(u.last_active.getTime()).toBeGreaterThan(0)
				expect(u.inactivity_warning_sent_at).toBeNull()

				// ARCHIVED restore
				expect(u.status).toBe('ACTIVE')
				expect(u.archived_at).toBeNull()

				// Audit
				expect(h.state.audits).toHaveLength(1)
				expect(h.state.audits[0]).toMatchObject({ event_type: 'LOGIN', entity: 'User', entity_id: 7, triggered_by_user_id: 7 })
			}),
			{ numRuns: 40 },
		)
	})

	it('correct password + unverified email gives 403 with requiresVerification and data.email; no session write', async () => {
		await fc.assert(
			fc.asyncProperty(emailArb, statusArb, async (email, status) => {
				h.state.users = [makeUser({ email, status, email_verified: false })]
				h.state.body = { email, password: 'pw' }
				h.state.updates = []
				h.state.signCalls = []
				const r: any = await run()
				expect(r.ok).toBe(false)
				expect(r.status).toBe(403)
				expect(r.data).toMatchObject({ requiresVerification: true, email })
				expect(h.state.updates).toHaveLength(0)
				expect(h.state.signCalls).toHaveLength(0)
			}),
			{ numRuns: 30 },
		)
	})

	it('wrong password gives 401 whether or not the email is verified (status only)', async () => {
		await fc.assert(
			fc.asyncProperty(emailArb, fc.boolean(), async (email, verified) => {
				h.state.users = [makeUser({ email, email_verified: verified })]
				h.state.body = { email, password: 'not-the-password' }
				h.state.updates = []
				const r: any = await run()
				expect(r.ok).toBe(false)
				expect(r.status).toBe(401)
				expect(r.data?.requiresVerification).toBeUndefined()
				expect(h.state.updates).toHaveLength(0)
			}),
			{ numRuns: 30 },
		)
	})
})

// ── Source-level preservation checks ─────────────────────────────────────────

const UI = resolve(__dirname, '../../../omniscan-ui/src')
const read = (p: string) => readFileSync(resolve(UI, p), 'utf-8')
const norm = (s: string) => s.replace(/\r\n/g, '\n')
const REPO_ROOT = resolve(__dirname, '../../..')
const gitHead = (relPath: string) => norm(execFileSync('git', ['show', `HEAD:${relPath}`], { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 }))
const block = (src: string, tag: string) => {
	const m = norm(src).match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
	return m ? m[1] : ''
}

// Snapshot of the original 10 FAQ entries from SettingsPage.vue (questions, answers, order).
// Task 3.7 deep-equals the shared faqContent module against this.
const ORIGINAL_FAQS = [
	{
		q: 'What is OmniScan?',
		a: 'OmniScan is a smart pantry management system that uses Artificial Intelligence and computer vision to scan food products, detect allergens, verify Halal certification, and provide personalized food recommendations.',
	},
	{
		q: 'How does OmniScan work?',
		a: 'Users can scan food packaging using their device camera or upload an image. The system analyzes the product using computer vision and OCR to extract ingredient information, detect allergens, and recognize Halal certification logos.',
	},
	{
		q: 'What allergens can the system detect?',
		a: 'OmniScan can detect common allergens such as milk, eggs, peanuts, tree nuts, soy, wheat, fish, and shellfish. Additionally, users can customize their dietary profile by adding other allergies or ingredient sensitivities.',
	},
	{
		q: 'Can I add my own dietary restrictions?',
		a: 'Yes. The system includes a personalized dietary profile where users can add allergies, dietary restrictions (e.g., Halal, vegetarian, vegan), health conditions, and nutritional preferences.',
	},
	{
		q: 'How does the Halal detection feature work?',
		a: 'The system identifies authorized Halal certification logos from food packaging and verifies them using a stored database of recognized certification marks.',
	},
	{
		q: 'Does OmniScan suggest food or recipes?',
		a: 'Yes. OmniScan provides AI-powered recommendations, including safer alternative products and recipe suggestions based on the ingredients available in your pantry and your dietary profile.',
	},
	{
		q: 'Can OmniScan track expiration dates?',
		a: 'Yes. The system monitors expiration dates of stored products and notifies users when items are near expiration to help reduce food waste.',
	},
	{
		q: 'Is an internet connection required?',
		a: 'Some features, such as AI recommendations and database updates, may require an internet connection, while basic scanning functions may still work with limited offline capability depending on the system design.',
	},
	{
		q: 'Is my personal data safe?',
		a: 'Yes. OmniScan is designed to protect user data. Personal information and dietary profiles are securely stored and used only to provide personalized system features and recommendations.',
	},
	{
		q: 'Who can use OmniScan?',
		a: 'OmniScan is designed for anyone, especially individuals with food allergies, dietary restrictions, health conditions, or those who want to make safer and more informed food choices.',
	},
]

// Pulls the faqs array literal out of a source file (type annotation tolerant) and evaluates it.
const extractFaqs = (src: string): any[] | null => {
	const s = norm(src)
	const m = /const faqs(?:\s*:\s*[\w\[\]<>]+)?\s*=\s*\[/.exec(s)
	if (!m) return null
	const start = m.index + m[0].length - 1
	const end = s.indexOf('\n]', start)
	return new Function(`return ${s.slice(start, end + 2)}`)()
}

describe('Property 2: Settings FAQ and unchanged surfaces', () => {
	const settings = read('views/SettingsPage.vue')

	it('FAQ source (local array or shared module) equals the original 10 entries', () => {
		const local = extractFaqs(settings)
		const faqs = local ?? extractFaqs(read('data/faqContent.ts'))
		expect(faqs).not.toBeNull()
		expect(faqs).toHaveLength(10)
		expect(faqs).toEqual(ORIGINAL_FAQS)
	})

	it('SettingsPage keeps the faq-accordion-item markup', () => {
		const tpl = block(settings, 'template')
		expect(tpl).toContain('faq-accordion-item')
		expect(tpl).toContain('faq-accordion-header')
		expect(tpl).toContain('faq-badge')
		expect(tpl).toContain('faq-question-label')
		expect(tpl).toContain('faq-answer-text')
		expect(tpl).toMatch(/v-for="\(faq, index\) in faqs"/)
	})

	it('SettingsPage <template> and <style> blocks are unchanged from HEAD', () => {
		const head = gitHead('omniscan-ui/src/views/SettingsPage.vue')
		expect(block(settings, 'template')).toBe(block(head, 'template'))
		expect(block(settings, 'style')).toBe(block(head, 'style'))
		expect(block(settings, 'style').length).toBeGreaterThan(0)
	})

	it('dark-mode.css sha256 still matches the ui-preservation snapshot', () => {
		const snap = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/ui-preservation-snapshot.json'), 'utf-8'))
		const hash = createHash('sha256').update(readFileSync(resolve(UI, 'theme/dark-mode.css'))).digest('hex')
		expect(hash).toBe(snap.darkModeCssSha256)
	})

	it('router authOnlyPaths is unchanged', () => {
		expect(read('router/index.ts')).toContain("const authOnlyPaths = ['/', '/login', '/register']")
	})

	it('/api/auth/login stays in AUTH_EXEMPT_ENDPOINTS', () => {
		const api = read('utils/api.ts')
		expect(api).toMatch(/AUTH_EXEMPT_ENDPOINTS[\s\S]*?\/api\/auth\/login/)
	})
})
