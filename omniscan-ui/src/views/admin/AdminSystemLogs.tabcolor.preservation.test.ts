/**
 * Preservation property tests — Inactive tab states and sibling components (Task 5)
 *
 * Property 2: Preservation — Inactive Tabs and Other Components Unchanged
 *
 * OBSERVATION-FIRST methodology:
 *   These tests observe the behavior of the UNFIXED code for inputs where
 *   `isBugCondition_Item1` returns FALSE, and encode those observations as
 *   (scoped) property-based tests.
 *
 *   EXPECTED OUTCOME on unfixed code: ALL tests PASS (baseline to preserve).
 *
 * isBugCondition_Item1(component, tabState):
 *   component = "AdminSystemLogs" AND tabState = active
 *
 * Inputs where the bug condition does NOT hold (covered here):
 *   A. Inactive .tab-btn elements in AdminSystemLogs.vue (tabState = inactive)
 *   B. AdminManageProductData.vue active tab (component ≠ "AdminSystemLogs")
 *   C. AdminSettings.vue active tab (component ≠ "AdminSystemLogs")
 *   D. Tab sequencing invariants: only last-clicked tab is active, regardless of
 *      the click sequence (this is true on BOTH unfixed and fixed code)
 *
 * Validates: Requirements 3.1, 3.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import AdminSystemLogs from './AdminSystemLogs.vue'
import AdminManageProductData from './AdminManageProductData.vue'
import AdminSettings from './AdminSettings.vue'

// ── Read the SFC sources for CSS-level preservation assertions ────────────────

const SYSTEM_LOGS_PATH = resolve(__dirname, 'AdminSystemLogs.vue')
const MANAGE_PRODUCT_PATH = resolve(__dirname, 'AdminManageProductData.vue')
const SETTINGS_PATH = resolve(__dirname, 'AdminSettings.vue')

const systemLogsSfc = readFileSync(SYSTEM_LOGS_PATH, 'utf-8')
const manageProductSfc = readFileSync(MANAGE_PRODUCT_PATH, 'utf-8')
const settingsSfc = readFileSync(SETTINGS_PATH, 'utf-8')

/** Extract the <style scoped> block content from an SFC source string. */
function extractStyleBlock(sfcSource: string): string {
	const match = sfcSource.match(/<style scoped>([\s\S]*?)<\/style>/)
	return match ? match[1] : ''
}

/** Extract the content of a named CSS rule from a style block string. */
function extractRule(styleContent: string, selector: string): string {
	// Escape special regex chars in the selector.
	const escapedSelector = selector.replace(/[.[\]()]/g, (c) => `\\${c}`)
	const ruleMatch = styleContent.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))
	return ruleMatch ? ruleMatch[1] : ''
}

const systemLogsStyles = extractStyleBlock(systemLogsSfc)
const manageProductStyles = extractStyleBlock(manageProductSfc)
const settingsStyles = extractStyleBlock(settingsSfc)

// Tab IDs in AdminSystemLogs.
const ALL_TAB_IDS = ['overview', 'api-latency', 'prisma-queries', 'raw-logs']
const ALL_TAB_LABELS = ['Overview', 'API Latency', 'Prisma Queries', 'Raw Logs']

// ── Shared mount helpers ──────────────────────────────────────────────────────

async function mountSystemLogs(): Promise<VueWrapper> {
	global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in tests'))
	const wrapper = mount(AdminSystemLogs, {
		global: {
			stubs: {
				'ion-page': { template: '<div><slot /></div>' },
				'ion-content': { template: '<div><slot /></div>' },
			},
		},
		attachTo: document.body,
	})
	await wrapper.vm.$nextTick()
	await new Promise((r) => setTimeout(r, 0))
	return wrapper
}

async function mountManageProductData(): Promise<VueWrapper> {
	global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in tests'))
	const wrapper = mount(AdminManageProductData, {
		global: {
			stubs: {
				'ion-page': { template: '<div><slot /></div>' },
				'ion-content': { template: '<div><slot /></div>' },
			},
		},
		attachTo: document.body,
	})
	await wrapper.vm.$nextTick()
	await new Promise((r) => setTimeout(r, 0))
	return wrapper
}

async function mountSettings(): Promise<VueWrapper> {
	global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in tests'))
	localStorage.setItem('omniscan_dark_mode', 'false')
	const wrapper = mount(AdminSettings, {
		global: {
			stubs: {
				'ion-page': { template: '<div><slot /></div>' },
				'ion-content': { template: '<div><slot /></div>' },
			},
		},
		attachTo: document.body,
	})
	await wrapper.vm.$nextTick()
	await new Promise((r) => setTimeout(r, 0))
	return wrapper
}

// ═══════════════════════════════════════════════════════════════════════════
// A. Preservation — Inactive tabs carry no active class
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2A: Preservation — Inactive tabs never carry .active class', () => {
	let wrapper: VueWrapper

	beforeEach(async () => {
		wrapper = await mountSystemLogs()
	})

	afterEach(() => {
		wrapper.unmount()
		vi.restoreAllMocks()
	})

	/**
	 * Property: for any click sequence in AdminSystemLogs, only the LAST-clicked
	 * tab carries .active. All other tabs must NOT carry .active.
	 *
	 * We test this over a representative set of click sequences (the "generator")
	 * that covers forward traversal, backward traversal, and non-sequential access.
	 */
	const CLICK_SEQUENCES: { label: string; sequence: number[] }[] = [
		{ label: 'forward: 0→1→2→3', sequence: [0, 1, 2, 3] },
		{ label: 'backward: 3→2→1→0', sequence: [3, 2, 1, 0] },
		{ label: 'non-sequential: 2→0→3→1', sequence: [2, 0, 3, 1] },
		{ label: 'repeated: 1→1→2→2', sequence: [1, 1, 2, 2] },
		{ label: 'single: 3', sequence: [3] },
		{ label: 'single: 0 (default, already active)', sequence: [0] },
	]

	it.each(CLICK_SEQUENCES)(
		'click sequence [$label] — only last-clicked tab is .active',
		async ({ sequence }) => {
			const allTabBtns = wrapper.findAll('.tab-btn')
			expect(allTabBtns.length, 'All 4 tab buttons must be rendered').toBe(4)

			// Execute the click sequence.
			for (const idx of sequence) {
				await allTabBtns[idx].trigger('click')
				await wrapper.vm.$nextTick()
			}

			const lastClickedIdx = sequence[sequence.length - 1]
			const lastClickedLabel = ALL_TAB_LABELS[lastClickedIdx]

			// Exactly one tab is active after any sequence.
			const activeBtns = wrapper.findAll('.tab-btn.active')
			expect(
				activeBtns.length,
				`Exactly one .tab-btn must be .active after sequence [${sequence.join('→')}]`
			).toBe(1)

			// The active tab is the last one clicked.
			expect(activeBtns[0].text().trim()).toBe(lastClickedLabel)

			// All other tabs must NOT carry .active.
			for (let i = 0; i < allTabBtns.length; i++) {
				if (i === lastClickedIdx) continue
				const classes = allTabBtns[i].classes()
				expect(
					classes,
					`Tab "${ALL_TAB_LABELS[i]}" must NOT be .active after clicking "${lastClickedLabel}"`
				).not.toContain('active')
			}
		},
	)

	it('default state: Overview tab is active on mount, others are inactive', async () => {
		// On initial mount, activeTab defaults to 'overview'.
		const activeBtns = wrapper.findAll('.tab-btn.active')
		expect(activeBtns.length).toBe(1)
		expect(activeBtns[0].text().trim()).toBe('Overview')

		// All other tabs are inactive.
		const inactiveBtns = wrapper.findAll('.tab-btn:not(.active)')
		expect(inactiveBtns.length).toBe(3)
		for (const btn of inactiveBtns) {
			expect(btn.text().trim()).not.toBe('Overview')
		}
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// B. Preservation — AdminSystemLogs inactive tab CSS rules are undisturbed
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2B: Preservation — AdminSystemLogs non-active tab CSS is unchanged', () => {
	/**
	 * Observation on unfixed code:
	 *   - .tab-btn (base rule): transparent background, #64748b color
	 *   - .tab-btn:hover: transparent background with slight color shift
	 *   These rules are NOT the target of the bug fix and MUST remain unchanged.
	 */

	it('scoped CSS .tab-btn base rule does NOT use #008744', () => {
		const baseBtnRule = extractRule(systemLogsStyles, '.tab-btn')
		// The base rule must exist.
		expect(baseBtnRule.length, '.tab-btn base rule must exist in AdminSystemLogs.vue styles').toBeGreaterThan(0)
		// The base rule must NOT contain the green accent — green is reserved for .active only.
		expect(
			baseBtnRule,
			`The .tab-btn base rule MUST NOT use #008744 (green is for .active only). ` +
			`Rule content: ${baseBtnRule}`
		).not.toContain('#008744')
	})

	it('scoped CSS .tab-btn base rule has background: transparent', () => {
		const baseBtnRule = extractRule(systemLogsStyles, '.tab-btn')
		// Observation: base rule uses `background: transparent` so inactive tabs are invisible.
		expect(
			baseBtnRule,
			`.tab-btn base rule MUST keep background: transparent (inactive state observation). ` +
			`Actual rule: ${baseBtnRule}`
		).toContain('transparent')
	})

	it('scoped CSS .tab-btn.active rule exists and targets the correct selector', () => {
		// Structural check: the .tab-btn.active rule must be present in the style block.
		const activeBtnRule = extractRule(systemLogsStyles, '.tab-btn.active')
		expect(
			activeBtnRule.length,
			'.tab-btn.active rule must exist in AdminSystemLogs.vue <style scoped>'
		).toBeGreaterThan(0)
	})

	it('non-active tab does not render with green background in the DOM', async () => {
		// Mount the component and verify inactive tabs don't carry inline green styles.
		global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in tests'))
		const wrapper = mount(AdminSystemLogs, {
			global: { stubs: { 'ion-page': { template: '<div><slot /></div>' }, 'ion-content': { template: '<div><slot /></div>' } } },
			attachTo: document.body,
		})
		await wrapper.vm.$nextTick()

		// Overview is active, others are inactive.
		const allTabBtns = wrapper.findAll('.tab-btn')
		for (let i = 1; i < allTabBtns.length; i++) {
			// Inactive tabs must not have inline styles that set background to #008744.
			const inlineStyle = allTabBtns[i].element.getAttribute('style') || ''
			expect(
				inlineStyle,
				`Inactive tab "${ALL_TAB_LABELS[i]}" must NOT have inline background #008744`
			).not.toContain('#008744')
		}

		wrapper.unmount()
		vi.restoreAllMocks()
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// C. Preservation — AdminManageProductData active tab is already green
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2C: Preservation — AdminManageProductData active tab CSS is already green', () => {
	/**
	 * Observation on unfixed code:
	 *   AdminManageProductData.vue already uses the correct green accent for its
	 *   `.tab-button.active` rule. The bug fix in AdminSystemLogs.vue must NOT
	 *   change AdminManageProductData.vue.
	 */

	it('AdminManageProductData .tab-button.active scoped CSS already uses #008744', () => {
		const activeBtnRule = extractRule(manageProductStyles, '.tab-button.active')
		// The .tab-button.active rule must exist.
		expect(
			activeBtnRule.length,
			'.tab-button.active rule must exist in AdminManageProductData.vue styles'
		).toBeGreaterThan(0)
		// Observation: it already uses #008744.
		expect(
			activeBtnRule,
			`AdminManageProductData .tab-button.active MUST already use #008744 (baseline preserved). ` +
			`Rule: ${activeBtnRule}`
		).toContain('#008744')
		// And white (#fff or #ffffff) for text color.
		// AdminManageProductData uses the shorthand `#fff` — both are white.
		const hasWhiteColor = activeBtnRule.includes('#fff')
		expect(
			hasWhiteColor,
			`AdminManageProductData .tab-button.active MUST already use color #fff or #ffffff (white). ` +
			`Rule: ${activeBtnRule}`
		).toBe(true)
	})

	it('AdminManageProductData mounts and default tab has .active class', async () => {
		const wrapper = await mountManageProductData()

		// Default active tab in AdminManageProductData is 'allergen'.
		const activeBtns = wrapper.findAll('.tab-button.active')
		expect(
			activeBtns.length,
			'AdminManageProductData must have exactly one .tab-button.active on mount'
		).toBe(1)
		expect(activeBtns[0].text().trim()).toContain('Allergen Dictionary')

		wrapper.unmount()
		vi.restoreAllMocks()
	})

	it('AdminManageProductData tab click sequence: only last-clicked tab has .active', async () => {
		const wrapper = await mountManageProductData()

		const tabBtns = wrapper.findAll('.tab-button')
		expect(tabBtns.length, 'AdminManageProductData must have exactly 3 tabs').toBe(3)

		// Click second tab (Halal Logo Library).
		await tabBtns[1].trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.tab-button.active').length).toBe(1)
		expect(wrapper.find('.tab-button.active').text().trim()).toContain('Halal Logo Library')

		// Click third tab (Ingredient Mappings).
		await tabBtns[2].trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.tab-button.active').length).toBe(1)
		expect(wrapper.find('.tab-button.active').text().trim()).toContain('Ingredient Mappings')

		wrapper.unmount()
		vi.restoreAllMocks()
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// D. Preservation — AdminSettings active tab CSS is already green
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2D: Preservation — AdminSettings active tab CSS is already green', () => {
	/**
	 * Observation on unfixed code:
	 *   AdminSettings.vue already uses the correct green accent for its
	 *   `.tab-button.active` rule. The bug fix must NOT change AdminSettings.vue.
	 */

	it('AdminSettings .tab-button.active scoped CSS already uses #008744', () => {
		const activeBtnRule = extractRule(settingsStyles, '.tab-button.active')
		expect(
			activeBtnRule.length,
			'.tab-button.active rule must exist in AdminSettings.vue styles'
		).toBeGreaterThan(0)
		// Observation: it already uses #008744.
		expect(
			activeBtnRule,
			`AdminSettings .tab-button.active MUST already use #008744 (baseline preserved). ` +
			`Rule: ${activeBtnRule}`
		).toContain('#008744')
	})

	it('AdminSettings mounts and default tab (General) has .active class', async () => {
		const wrapper = await mountSettings()

		const activeBtns = wrapper.findAll('.tab-button.active')
		expect(
			activeBtns.length,
			'AdminSettings must have exactly one .tab-button.active on mount'
		).toBe(1)
		// Default is 'general' tab.
		expect(activeBtns[0].text()).toContain('General')

		wrapper.unmount()
		localStorage.clear()
		vi.restoreAllMocks()
	})

	it('AdminSettings tab click: AI tab becomes active without affecting active count', async () => {
		const wrapper = await mountSettings()

		const allTabBtns = wrapper.findAll('.tab-button')
		const aiTabBtn = allTabBtns.find((btn) => btn.text().includes('AI'))
		expect(aiTabBtn, 'AI tab button must exist').toBeTruthy()

		await aiTabBtn!.trigger('click')
		await wrapper.vm.$nextTick()

		// Exactly one .tab-button.active at all times.
		expect(wrapper.findAll('.tab-button.active').length).toBe(1)
		expect(wrapper.find('.tab-button.active').text()).toContain('AI')

		wrapper.unmount()
		localStorage.clear()
		vi.restoreAllMocks()
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// E. Preservation — Scoped CSS selector isolation
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2E: Preservation — AdminSystemLogs uses .tab-btn; siblings use .tab-button', () => {
	/**
	 * The bug fix targets `.tab-btn` (the class used in AdminSystemLogs.vue),
	 * not `.tab-button` (used in AdminManageProductData.vue and AdminSettings.vue).
	 * This suite ensures the selector naming is correct in each component so the
	 * fix remains isolated.
	 *
	 * Observation: AdminSystemLogs uses `tab-btn`, others use `tab-button`.
	 * Preservation: after the fix, this isolation must continue to hold.
	 */

	it('AdminSystemLogs uses .tab-btn class for its tab buttons (not .tab-button)', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in tests'))
		const wrapper = mount(AdminSystemLogs, {
			global: { stubs: { 'ion-page': { template: '<div><slot /></div>' }, 'ion-content': { template: '<div><slot /></div>' } } },
			attachTo: document.body,
		})
		await wrapper.vm.$nextTick()

		// AdminSystemLogs tabs use .tab-btn.
		const tabBtnEls = wrapper.findAll('.tab-btn')
		expect(tabBtnEls.length, 'AdminSystemLogs must render exactly 4 .tab-btn elements').toBe(4)

		// AdminSystemLogs must NOT render .tab-button elements.
		const tabButtonEls = wrapper.findAll('.tab-button')
		expect(
			tabButtonEls.length,
			'AdminSystemLogs must NOT render any .tab-button elements (different class from siblings)'
		).toBe(0)

		wrapper.unmount()
		vi.restoreAllMocks()
	})

	it('AdminManageProductData uses .tab-button class (not .tab-btn)', async () => {
		const wrapper = await mountManageProductData()

		const tabButtonEls = wrapper.findAll('.tab-button')
		expect(tabButtonEls.length, 'AdminManageProductData must render 3 .tab-button elements').toBe(3)

		const tabBtnEls = wrapper.findAll('.tab-btn')
		expect(
			tabBtnEls.length,
			'AdminManageProductData must NOT render any .tab-btn elements'
		).toBe(0)

		wrapper.unmount()
		vi.restoreAllMocks()
	})

	it('AdminSettings uses .tab-button class (not .tab-btn)', async () => {
		const wrapper = await mountSettings()

		const tabButtonEls = wrapper.findAll('.tab-button')
		expect(tabButtonEls.length, 'AdminSettings must render at least 1 .tab-button element').toBeGreaterThan(0)

		const tabBtnEls = wrapper.findAll('.tab-btn')
		expect(
			tabBtnEls.length,
			'AdminSettings must NOT render any .tab-btn elements'
		).toBe(0)

		wrapper.unmount()
		localStorage.clear()
		vi.restoreAllMocks()
	})
})
