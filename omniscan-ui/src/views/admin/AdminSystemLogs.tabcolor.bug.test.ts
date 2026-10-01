/**
 * Bug condition exploration test — Active tab accent color (Item 1)
 *
 * Property 1: Bug Condition — Active Tab Renders White Instead of Green
 *
 * CRITICAL BUGFIX SEMANTICS:
 *   - This test MUST FAIL against the UNFIXED AdminSystemLogs.vue.
 *   - A failure CONFIRMS the bug exists:
 *       The `.tab-btn.active` scoped rule sets `background: #ffffff; color: #0f172a`,
 *       whereas the portal convention (AdminManageProductData.vue, AdminSettings.vue)
 *       uses `background: #008744; color: #ffffff` (green accent).
 *   - After the fix (`.tab-btn.active` → `background: #008744; color: #ffffff`) this
 *     test will PASS.
 *   - DO NOT fix the test or the component code here.
 *
 * isBugCondition_Item1(component, tabState):
 *   component = "AdminSystemLogs" AND tabState = active
 *
 * Validates: Requirements 2.1
 *
 * Counterexample (confirmed on unfixed code):
 *   - The `.tab-btn.active` scoped CSS rule in AdminSystemLogs.vue contains
 *     `background: #ffffff` instead of the required `#008744`.
 *   - Clicking any tab makes it active (.tab-btn.active), but the active element
 *     renders with a white background, not the portal-wide green accent.
 *
 * Assertion strategy:
 *   jsdom does NOT evaluate Vue SFC `<style scoped>` blocks at runtime (Vite does
 *   not inject them in test mode). We therefore assert directly on the CSS source
 *   string inside the component file — this is the cleanest way to distinguish the
 *   unfixed rule (`background: #ffffff`) from the fixed rule (`background: #008744`)
 *   in a jsdom environment, and it maps exactly to the atomic CSS change described
 *   in the design (Fix Implementation, Item 1).
 *
 *   Structural/behavioral assertions (click → .active class present; only one active
 *   at a time) are validated via Vue Test Utils and pass regardless of theme color.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import AdminSystemLogs from './AdminSystemLogs.vue'

// ── Read the SFC source for CSS-level assertions ──────────────────────────────
// We read the raw Vue SFC file so we can assert directly on the scoped CSS text.
// This correctly distinguishes the unfixed (`background: #ffffff`) from the fixed
// (`background: #008744`) CSS rule, independent of jsdom's inability to parse
// Vue scoped styles.
const SFC_PATH = resolve(__dirname, 'AdminSystemLogs.vue')
const sfcSource = readFileSync(SFC_PATH, 'utf-8')

// Extract just the <style scoped> block content for targeted assertions.
const styleBlockMatch = sfcSource.match(/<style scoped>([\s\S]*?)<\/style>/)
const styleBlockContent = styleBlockMatch ? styleBlockMatch[1] : ''

// Extract the .tab-btn.active rule block from the style content.
// Matches the rule including its braces so we assert only on that specific selector.
const tabBtnActiveRuleMatch = styleBlockContent.match(/\.tab-btn\.active\s*\{([^}]*)\}/)
const tabBtnActiveRule = tabBtnActiveRuleMatch ? tabBtnActiveRuleMatch[1] : ''

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * The four tab IDs / labels defined in AdminSystemLogs.vue's `tabs` array.
 * Each entry is [tabLabel, tabId].
 */
const ALL_TABS: [string, string][] = [
	['Overview', 'overview'],
	['API Latency', 'api-latency'],
	['Prisma Queries', 'prisma-queries'],
	['Raw Logs', 'raw-logs'],
]

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Property 1: Bug Condition — Active Tab Renders White Instead of Green (AdminSystemLogs)', () => {
	let wrapper: VueWrapper

	beforeEach(async () => {
		// Prevent real network calls from fetchLogs() (called in onMounted).
		global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in tests'))

		wrapper = mount(AdminSystemLogs, {
			global: {
				stubs: {
					'ion-page': { template: '<div><slot /></div>' },
					'ion-content': { template: '<div><slot /></div>' },
				},
			},
			attachTo: document.body,
		})

		await wrapper.vm.$nextTick()
		// Allow the rejected fetch promise to settle so onMounted completes.
		await new Promise((r) => setTimeout(r, 0))
	})

	afterEach(() => {
		wrapper.unmount()
		vi.restoreAllMocks()
	})

	// ── CSS-level assertions (core bug check) ──────────────────────────────────
	//
	// These assertions FAIL on unfixed code because the scoped CSS uses #ffffff.
	// They PASS on fixed code because the scoped CSS will be updated to #008744.

	it('scoped CSS .tab-btn.active rule has background #008744 (fails on unfixed code)', () => {
		// Precondition: the style block and .tab-btn.active rule must be parseable.
		expect(
			styleBlockContent.length,
			'AdminSystemLogs.vue must contain a <style scoped> block'
		).toBeGreaterThan(0)

		expect(
			tabBtnActiveRule.length,
			'AdminSystemLogs.vue <style scoped> must contain a .tab-btn.active rule'
		).toBeGreaterThan(0)

		// ── Expected behavior (FAILS on unfixed code) ──────────────────────────
		//
		// Unfixed code: `.tab-btn.active { background: #ffffff; ... }`
		//   tabBtnActiveRule contains "#ffffff" → does NOT contain "#008744"
		//   → expect(...).toContain('#008744') FAILS  ✓ (bug confirmed)
		//
		// Fixed code: `.tab-btn.active { background: #008744; ... }`
		//   tabBtnActiveRule contains "#008744"
		//   → expect(...).toContain('#008744') PASSES ✓ (fix confirmed)
		//
		// Counterexample extracted from unfixed rule:
		//   .tab-btn.active { background: #ffffff; color: #0f172a; font-weight: 600; box-shadow: ... }
		//   The `background` property is `#ffffff`, not `#008744`.

		expect(
			tabBtnActiveRule,
			`The .tab-btn.active rule MUST use background #008744 (green accent). ` +
			`Counterexample: current rule is:\n  .tab-btn.active {${tabBtnActiveRule}}\n` +
			`  → "background: #ffffff" found instead of "background: #008744". ` +
			`Root cause: AdminSystemLogs.vue was never updated to match the portal green convention.`
		).toContain('#008744')

		// Additionally: the rule must set color to #ffffff (white text on green).
		expect(
			tabBtnActiveRule,
			`The .tab-btn.active rule MUST use color #ffffff. ` +
			`Counterexample: current rule uses color #0f172a (dark text for white background).`
		).toContain('#ffffff')

		// And it must NOT retain the old white background from the unfixed code.
		expect(
			tabBtnActiveRule,
			`The .tab-btn.active rule MUST NOT keep "background: #ffffff" (the bug). ` +
			`This would confirm the bug is still present.`
		).not.toContain('background: #ffffff')
	})

	// ── Structural / behavioral assertions ────────────────────────────────────
	//
	// These assertions validate Vue behavior (click → .active class) regardless
	// of CSS color. They pass on both unfixed and fixed code as long as the Vue
	// reactive logic is correct. They are included here to confirm the click
	// mechanism works and the CSS assertion target (.tab-btn.active) is reachable.

	it.each(ALL_TABS)(
		'clicking "%s" tab makes exactly that tab carry .active class',
		async (tabLabel, _tabId) => {
			const allTabBtns = wrapper.findAll('.tab-btn')
			expect(allTabBtns.length, 'All 4 tab buttons must be rendered').toBe(4)

			const targetBtn = allTabBtns.find((btn) => btn.text().trim() === tabLabel)
			expect(targetBtn, `Tab button "${tabLabel}" must exist in the DOM`).toBeTruthy()

			await targetBtn!.trigger('click')
			await wrapper.vm.$nextTick()

			// Exactly one button must carry .active after the click.
			const activeBtns = wrapper.findAll('.tab-btn.active')
			expect(
				activeBtns.length,
				`Exactly one .tab-btn must be .active after clicking "${tabLabel}"`
			).toBe(1)

			// The active button must be the one we clicked.
			expect(activeBtns[0].text().trim()).toBe(tabLabel)
		},
	)

	it('the .active class moves to the newly-clicked tab (functional regression guard)', async () => {
		const allTabBtns = wrapper.findAll('.tab-btn')
		expect(allTabBtns.length).toBe(4)

		// Default: Overview is active.
		expect(wrapper.find('.tab-btn.active').text().trim()).toBe('Overview')

		// Click Prisma Queries.
		await allTabBtns[2].trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.tab-btn.active').text().trim()).toBe('Prisma Queries')

		// Click Raw Logs.
		await allTabBtns[3].trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.tab-btn.active').text().trim()).toBe('Raw Logs')

		// Always only one active.
		expect(wrapper.findAll('.tab-btn.active').length).toBe(1)
	})
})
