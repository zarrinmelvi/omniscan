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

// Snapshot of the approved 21 FAQ entries (questions, answers, lists, outros, order).
// Task 3.7 deep-equals the shared faqContent module against this.
const ORIGINAL_FAQS = [
	{
		q: 'What is OmniScan?',
		a: 'OmniScan is a cross-platform pantry management system that uses Artificial Intelligence (AI), computer vision, and Optical Character Recognition (OCR) to analyze food products, identify potential allergens, recognize selected Halal certification logos, and simplify ingredient information. It also provides digital pantry management, expiration tracking, and personalized recipe recommendations.',
	},
	{
		q: 'How does OmniScan work?',
		a: "Users can scan food product labels using their mobile device camera or upload an existing product image through the web or mobile application. The System processes the image to extract ingredient information, recognize selected Halal certification logos, and evaluate the product according to the user's registered dietary profile. It then provides simplified ingredient information, color-coded safety assessments, and alternative product recommendations when applicable.",
	},
	{
		q: 'What allergens can OmniScan detect?',
		a: "OmniScan detects allergens officially recognized by the World Health Organization (WHO) that are supported by its allergen reference data. The System compares the extracted ingredient information against its available allergen references and the user's registered allergy profile. However, it may not identify allergens that are outside its supported database or cannot be reliably extracted from the product label.",
	},
	{
		q: 'Can I customize my dietary preferences?',
		a: 'Yes. During registration, users can select their food allergens and specify their Halal preference. These settings can also be updated through the Profile section. The System uses this information to personalize product assessments, dietary alerts, and recipe recommendations.',
	},
	{
		q: "How does OmniScan's Halal detection work?",
		a: 'OmniScan uses computer vision to recognize selected Halal certification logos included in its training dataset and reference library. It also analyzes available ingredient information to identify potential Halal-related concerns. Results may be classified as Halal, Non-Halal, or Unknown. However, OmniScan is not an official Halal certification authority, and users should verify certification information through the appropriate recognized certifying body when necessary.',
	},
	{
		q: 'What do the color-coded safety alerts mean?',
		a: 'OmniScan uses three color-coded indicators to present product assessment results:',
		list: [
			'Green – Safe: No identified dietary concern based on the available information and registered preferences.',
			'Yellow – Caution: A potential dietary concern, unverified Halal certification, or insufficient information requires further checking.',
			"Red – Unsafe: A detected ingredient or dietary concern conflicts with the user's registered dietary preferences.",
		],
		outro: 'These indicators are AI-assisted assessments and should not replace checking the original product label.',
	},
	{
		q: 'Does OmniScan recommend alternative products?',
		a: "Yes. When potential dietary concerns are identified, OmniScan may suggest alternative food products based on available product information and the user's dietary profile. These recommendations are intended to help users identify other options that may better match their registered dietary preferences.",
	},
	{
		q: 'Can I upload an existing product image instead of scanning it?',
		a: 'Yes. Users can either scan a product directly using their device camera or select an existing product photograph from their device gallery. Both options allow the System to analyze available product information and provide dietary assessments.',
	},
	{
		q: 'Is there a limit to the number of photos I can upload?',
		a: 'Yes. OmniScan allows a maximum of seven (7) photo uploads per day across the web and mobile platforms. A ten (10)-second cooldown is also implemented between uploads.',
	},
	{
		q: 'Can OmniScan automatically detect expiration dates?',
		a: 'Yes. OmniScan can automatically extract expiration or best-before dates when they are available and clearly readable from the product label. If the date cannot be extracted or is unclear, users must manually enter the correct date before adding the product to their pantry.',
	},
	{
		q: 'How does the digital pantry work?',
		a: 'The digital pantry allows users to organize their stored food products according to storage locations, such as the freezer, fridge, and cupboard. Users can also manage product categories, quantities, and expiration dates. This feature helps users monitor their available food items and maintain an organized household inventory.',
	},
	{
		q: 'What happens when a product expires or is consumed?',
		a: 'Expired products are automatically transferred to the pantry archive. Products that have already been consumed must be manually archived by the user. OmniScan does not automatically detect when a product has been physically consumed or removed from the pantry.',
	},
	{
		q: 'How does the recipe recommendation feature work?',
		a: "OmniScan generates AI-powered recipe suggestions based on the ingredients available in the user's digital pantry and their registered dietary preferences. Recommended recipes include required ingredients, cooking instructions, and suggested ingredient portions to help users prepare meals using available food items.",
	},
	{
		q: 'Can I save recipes or track meals I have prepared?',
		a: 'Yes. Users can like and save their preferred recipes for easier access in the future. When users select the "Make Recipe" feature, the prepared recipe is transferred to the Made Recipes archive. The System also updates the corresponding ingredient quantities and records used ingredients in the pantry archive.',
	},
	{
		q: 'Does OmniScan require an internet connection?',
		a: "Yes. An active internet connection is required to access OmniScan's web services, backend, database, and AI-powered functionalities. Internet access is also necessary for product analysis, accessing stored information, and receiving system updates and notifications.",
	},
	{
		q: 'What devices and platforms support OmniScan?',
		a: 'OmniScan supports two user access platforms:',
		list: [
			'Web Application: Accessible through compatible web browsers, such as Google Chrome and Safari.',
			'Android Mobile Application: Designed for supported Android devices.',
		],
		outro: 'The System also provides a separate web-based Admin Portal for authorized administrators.',
	},
	{
		q: 'Why does OmniScan require camera permission?',
		a: 'Camera permission is required when users want to scan food product labels directly through the Android Mobile Application. This allows the System to capture product images for ingredient extraction, Halal logo recognition, and dietary assessment. Users who prefer not to use the camera may upload an existing product image instead.',
	},
	{
		q: 'Why might OmniScan produce an inaccurate or incomplete result?',
		a: 'The accuracy of OmniScan depends on image quality, label readability, available product information, training data, and reference database coverage. Products with damaged, unclear, missing, or incomplete labels may not be fully recognized. The System may also have difficulty identifying newly released products, unsupported allergens, or Halal certifications that are not included in its reference library.',
	},
	{
		q: 'What happens if my account remains inactive?',
		a: 'OmniScan monitors account activity for account-management purposes. Accounts that remain inactive for six (6) months may receive an email notification informing the user that the account is scheduled for deletion. If the account remains inactive for one (1) additional week after the notification is sent, it may be permanently deleted.',
	},
	{
		q: 'Is my personal information protected?',
		a: 'OmniScan processes account information, dietary profiles, pantry records, scan history, and other information necessary to provide its features. The handling of personal information is subject to the applicable OmniScan Privacy Policy and relevant data protection requirements. Users are encouraged to review the Privacy Policy for more information about personal information handling.',
	},
	{
		q: 'Where can I report technical issues or ask for assistance?',
		a: "Users may contact the OmniScan support team through the Contact Support feature available in the Application. This feature can be used to submit technical concerns, report system issues, or request assistance regarding the application's functionality.",
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

	it('FAQ source (local array or shared module) equals the approved 21 entries', () => {
		const local = extractFaqs(settings)
		const faqs = local ?? extractFaqs(read('data/faqContent.ts'))
		expect(faqs).not.toBeNull()
		expect(faqs).toHaveLength(21)
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

	it('SettingsPage <style> block keeps every HEAD rule (v2.2.2 additions are additive only)', () => {
		const head = gitHead('omniscan-ui/src/views/SettingsPage.vue')
		const headStyle = block(head, 'style')
		const nowStyle = block(settings, 'style')
		expect(nowStyle.length).toBeGreaterThan(0)
		// Additive-only: every rule block (blank-line separated) in HEAD must still be present
		// verbatim in the current style. Extra rules are allowed (HEAD may or may not already
		// contain the v2.2.2 faq-answer-list/outro rules).
		const headRules = headStyle.split(/\n\s*\n/).map((r) => r.trim()).filter(Boolean)
		expect(headRules.length).toBeGreaterThan(0)
		const missing = headRules.filter((r) => !nowStyle.includes(r))
		expect(missing).toEqual([])
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
