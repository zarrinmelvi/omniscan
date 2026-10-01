/**
 * Bug condition exploration tests — Dark-mode CSS gaps (Tasks 7, Items 2 & 3)
 *
 * Property 1: Bug Condition — Dark-Mode Elements Render with Light-Mode Colors
 *
 * CRITICAL BUGFIX SEMANTICS:
 *   - These tests MUST FAIL against the UNFIXED dark-mode.css.
 *   - A failure CONFIRMS the bugs exist:
 *       Item 2: `html.ion-palette-dark .dashboard`, `.dashboard .stat-card`, and
 *               `.stat-label` are MISSING from dark-mode.css — dashboard and
 *               system-logs stat labels retain their light-mode colors in dark mode.
 *       Item 3: `html.ion-palette-dark .tab-btn.active` exists but uses the WRONG
 *               value (`--dm-bg-subtle` / muted grey instead of `#008744`), and
 *               `html.ion-palette-dark .tabs-bar .tab-button.active` is entirely absent.
 *   - After the fix (the append block in task 9) these tests WILL PASS.
 *   - DO NOT fix the tests or the CSS here.
 *
 * isBugCondition_Item2(themeClass, component):
 *   themeClass = "ion-palette-dark"
 *   AND component IN ["AdminDashboard", "AdminSystemLogs"]
 *   AND cssOverrideExists(component, affectedClass) = false
 *
 * isBugCondition_Item3(themeClass, tabState, tabClass):
 *   themeClass = "ion-palette-dark"
 *   AND tabState = active
 *   AND tabClass IN [".tab-btn", ".tabs-bar .tab-button"]
 *
 * Assertion strategy:
 *   jsdom does NOT evaluate external CSS or Vue SFC `<style scoped>` blocks in
 *   test mode. We therefore assert directly on the dark-mode.css SOURCE TEXT,
 *   checking for the presence or absence of specific selectors and property
 *   values. This is the same strategy used in AdminSystemLogs.tabcolor.bug.test.ts
 *   (which asserts on the SFC source for the Item 1 fix) — it's reliable,
 *   deterministic, and maps 1:1 to the atomic CSS changes described in the design.
 *
 * Counterexamples confirmed on unfixed code:
 *   Item 2a: `html.ion-palette-dark .dashboard` is absent from dark-mode.css
 *            → dashboard root keeps `background-color: #fafafa` in dark mode.
 *   Item 2b: `html.ion-palette-dark .dashboard .stat-card` is absent
 *            → green-card retains `background-color: #f2fbf5` in dark mode.
 *   Item 2c: `html.ion-palette-dark .stat-label` is absent
 *            → stat labels keep `color: #4b5563` (dark grey on dark surface) in dark mode.
 *   Item 3a: `html.ion-palette-dark .tab-btn.active` has `background: var(--dm-bg-subtle)`
 *            → active tab pill renders muted grey, not the green `#008744` accent.
 *   Item 3b: `html.ion-palette-dark .tabs-bar .tab-button.active` is entirely absent
 *            → active tab in components using `.tab-button` class has no dark override.
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 3.3, 3.4
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Read dark-mode.css source for all assertions ──────────────────────────────
//
// All assertions in this file read from the CSS source directly.
// This approach is reliable across jsdom, Vite test mode, and scoped styles.

const DARK_MODE_CSS_PATH = resolve(__dirname, '../../theme/dark-mode.css')
const darkModeCss = readFileSync(DARK_MODE_CSS_PATH, 'utf-8')

// ── CSS source helpers ────────────────────────────────────────────────────────

/**
 * Returns true if the given exact-text selector appears in the dark-mode.css
 * source as a rule selector (i.e. the full selector string is present in the file).
 *
 * We normalise whitespace around the selector to account for minor formatting
 * differences, but we do not strip meaningful content.
 */
function selectorExists(selector: string): boolean {
	// We check for the selector followed by optional whitespace and an opening brace,
	// which confirms it is used as a rule selector (not a comment or arbitrary text).
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	// Match the selector followed by a comma (multi-selector), opening brace, or newline.
	const pattern = new RegExp(escaped + '\\s*[,{\\n]')
	return pattern.test(darkModeCss)
}

/**
 * Extracts all rule bodies for a given selector from dark-mode.css.
 * Returns the concatenated text of all `{ ... }` blocks that immediately follow
 * the selector (handles the case where a selector appears multiple times via
 * cascade-ordering overrides, as will happen after the fix appends a new rule).
 *
 * Returns an empty string if the selector is not found.
 */
function getRuleBodies(selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const pattern = new RegExp(escaped + '\\s*\\{([^}]*)\\}', 'g')
	const bodies: string[] = []
	let match: RegExpExecArray | null
	while ((match = pattern.exec(darkModeCss)) !== null) {
		bodies.push(match[1])
	}
	return bodies.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// Item 2 — AdminDashboard dark-mode coverage gaps
//
// These tests assert that the EXPECTED dark-mode overrides DO EXIST in
// dark-mode.css. They FAIL on unfixed code (those selectors are missing)
// and will PASS after the task-9 append adds them.
// ═══════════════════════════════════════════════════════════════════════════

describe(
	'Property 1 (Item 2a): Bug Condition — AdminDashboard root has no dark-mode override (FAILS on unfixed code)',
	() => {
		/**
		 * Counterexample: `html.ion-palette-dark .dashboard` is absent.
		 * Without this rule, the `.dashboard` root keeps `background-color: #fafafa`
		 * (the scoped light-mode value) when dark mode is active, because no global
		 * override exists to replace it.
		 *
		 * Expected behavior (post-fix): the selector is present and sets
		 * `background-color: var(--dm-bg-page)`.
		 */
		it('dark-mode.css MUST contain "html.ion-palette-dark .dashboard" rule (absent on unfixed code)', () => {
			// ── Expected behavior assertion (FAILS on unfixed code) ────────────────
			// Unfixed: the selector is absent → selectorExists() returns false → test FAILS ✓
			// Fixed:   the selector is present → selectorExists() returns true  → test PASSES ✓
			expect(
				selectorExists('html.ion-palette-dark .dashboard'),
				`COUNTEREXAMPLE: "html.ion-palette-dark .dashboard" is absent from dark-mode.css.\n` +
				`Root cause: AdminDashboard.vue was added after the initial dark-mode pass and its\n` +
				`.dashboard root class was never added to the dark-mode scaffold block.\n` +
				`Impact: dashboard background stays #fafafa (light) when dark mode is active.`
			).toBe(true)
		})

		it('the .dashboard rule MUST set background-color to the page-level dm token (absent on unfixed code)', () => {
			// After the fix, the rule must reference the --dm-bg-page token.
			const ruleBody = getRuleBodies('html.ion-palette-dark .dashboard')
			expect(
				ruleBody,
				`COUNTEREXAMPLE: Rule body for "html.ion-palette-dark .dashboard" is empty or missing.\n` +
				`Expected it to contain "var(--dm-bg-page)" as the background-color.\n` +
				`Unfixed rule body: "${ruleBody || '(rule absent)'}"`
			).toContain('var(--dm-bg-page)')
		})
	}
)

describe(
	'Property 1 (Item 2b): Bug Condition — Dashboard stat cards have no scoped dark override (FAILS on unfixed code)',
	() => {
		/**
		 * Counterexample: `html.ion-palette-dark .dashboard .stat-card` is absent.
		 *
		 * The existing generic rule `html.ion-palette-dark .stat-card` (line ~1077 in
		 * dark-mode.css) covers the System Logs stat cards. However, AdminDashboard.vue
		 * uses tinted card variants (green-card, orange-card, blue-card) that need a
		 * scoped `.dashboard .stat-card` ancestor to correctly override without
		 * conflicting with the system-logs cards.
		 *
		 * Without `.dashboard .stat-card`, the per-card tint backgrounds
		 * (`#f2fbf5`, `#fffaf0`, `#f0f7ff`) stay visible in dark mode.
		 *
		 * Expected behavior (post-fix): the scoped selector is present and sets
		 * `background: var(--dm-bg-card) !important`.
		 */
		it('dark-mode.css MUST contain "html.ion-palette-dark .dashboard .stat-card" rule (absent on unfixed code)', () => {
			// Unfixed: absent → FAILS ✓   Fixed: present → PASSES ✓
			expect(
				selectorExists('html.ion-palette-dark .dashboard .stat-card'),
				`COUNTEREXAMPLE: "html.ion-palette-dark .dashboard .stat-card" is absent.\n` +
				`Impact: Dashboard stat cards retain their light tinted backgrounds\n` +
				`(green #f2fbf5, orange #fffaf0, blue #f0f7ff) when dark mode is active.\n` +
				`Root cause: .dashboard ancestor scoping was never added to the dark-mode scaffold.`
			).toBe(true)
		})

		it('the .dashboard .stat-card rule MUST use var(--dm-bg-card) (absent on unfixed code)', () => {
			const ruleBody = getRuleBodies('html.ion-palette-dark .dashboard .stat-card')
			expect(
				ruleBody,
				`COUNTEREXAMPLE: Rule body empty or missing.\n` +
				`Expected "var(--dm-bg-card)" in the .dashboard .stat-card override.\n` +
				`Unfixed: "(rule absent)"`
			).toContain('var(--dm-bg-card)')
		})
	}
)

describe(
	'Property 1 (Item 2c): Bug Condition — .stat-label has no dark-mode color override (FAILS on unfixed code)',
	() => {
		/**
		 * Counterexample: `html.ion-palette-dark .stat-label` is absent.
		 *
		 * AdminDashboard.vue scoped CSS sets `.stat-label { color: #4b5563 }` (medium
		 * dark grey). AdminSystemLogs.vue scoped CSS sets `.stat-label { color: #475569 }`.
		 * Both are hardcoded and unreadable against the dark surface without a global
		 * dark-mode override. No existing rule in dark-mode.css targets `.stat-label`.
		 *
		 * Expected behavior (post-fix): selector present with
		 * `color: var(--dm-text-secondary) !important`.
		 */
		it('dark-mode.css MUST contain "html.ion-palette-dark .stat-label" rule (absent on unfixed code)', () => {
			// Unfixed: absent → FAILS ✓   Fixed: present → PASSES ✓
			expect(
				selectorExists('html.ion-palette-dark .stat-label'),
				`COUNTEREXAMPLE: "html.ion-palette-dark .stat-label" is absent from dark-mode.css.\n` +
				`Impact: Stat labels keep color #4b5563 / #475569 (light-grey-on-dark) when dark mode is active.\n` +
				`This affects both AdminDashboard.vue (.stat-label { color: #4b5563 }) and\n` +
				`AdminSystemLogs.vue (.stat-label { color: #475569 }) — both components use the same class name.`
			).toBe(true)
		})

		it('.stat-label dark override MUST use var(--dm-text-secondary) (absent on unfixed code)', () => {
			const ruleBody = getRuleBodies('html.ion-palette-dark .stat-label')
			expect(
				ruleBody,
				`COUNTEREXAMPLE: Rule body empty or missing.\n` +
				`Expected "var(--dm-text-secondary)" in the .stat-label dark override.\n` +
				`Unfixed: "(rule absent)"`
			).toContain('var(--dm-text-secondary)')
		})
	}
)

// ═══════════════════════════════════════════════════════════════════════════
// Item 2 (System Logs supplement) — AdminSystemLogs additional dark gaps
// ═══════════════════════════════════════════════════════════════════════════

describe(
	'Property 1 (Item 2d): Bug Condition — .chart-header h2 has no dark-mode override (FAILS on unfixed code)',
	() => {
		/**
		 * Counterexample: `html.ion-palette-dark .chart-header h2` is absent.
		 *
		 * AdminSystemLogs.vue sets `.chart-header h2 { color: #1e293b }` — a very dark
		 * near-black that is near-invisible on the dark card surface. No dark-mode
		 * override currently exists.
		 */
		it('dark-mode.css MUST contain "html.ion-palette-dark .chart-header h2" rule (absent on unfixed code)', () => {
			expect(
				selectorExists('html.ion-palette-dark .chart-header h2'),
				`COUNTEREXAMPLE: "html.ion-palette-dark .chart-header h2" is absent.\n` +
				`Impact: Chart heading color stays #1e293b (near-black) on dark surface in dark mode.\n` +
				`Expected: color should use var(--dm-text-primary) after the fix.`
			).toBe(true)
		})
	}
)

describe(
	'Property 1 (Item 2e): Bug Condition — .alert-box has no dark-mode override (FAILS on unfixed code)',
	() => {
		/**
		 * Counterexample: `html.ion-palette-dark .alert-box` is absent.
		 *
		 * AdminSystemLogs.vue sets `.alert-box { background-color: #fffbeb; ... }` — a
		 * pale yellow that is jarring and low-contrast on a dark surface. No dark-mode
		 * override currently exists.
		 */
		it('dark-mode.css MUST contain "html.ion-palette-dark .alert-box" rule (absent on unfixed code)', () => {
			expect(
				selectorExists('html.ion-palette-dark .alert-box'),
				`COUNTEREXAMPLE: "html.ion-palette-dark .alert-box" is absent.\n` +
				`Impact: Peak-latency alert box keeps background-color: #fffbeb (pale yellow) in dark mode.\n` +
				`Expected: a dark-appropriate amber tint (rgba(234, 179, 8, 0.1)) after the fix.`
			).toBe(true)
		})
	}
)

// ═══════════════════════════════════════════════════════════════════════════
// Item 3 — Active tab dark-mode overrides (wrong value + missing selector)
// ═══════════════════════════════════════════════════════════════════════════

describe(
	'Property 1 (Item 3a): Bug Condition — .tab-btn.active dark override uses wrong color (FAILS on unfixed code)',
	() => {
		/**
		 * Counterexample confirmed on unfixed code:
		 *   html.ion-palette-dark .tab-btn.active {
		 *     background: var(--dm-bg-subtle);   ← WRONG — should be #008744
		 *     color: var(--dm-text-primary);      ← WRONG — should be #ffffff
		 *   }
		 *
		 * The design says this rule exists but was written conservatively (muted grey)
		 * and was never updated to the green accent used by the rest of the portal.
		 *
		 * Expected behavior (post-fix): the rule contains `#008744` (the green accent).
		 * The fix appends a new rule with `!important` to override the existing one by
		 * cascade order, so both the old rule and the new overriding rule will be in the
		 * file. We assert that AT LEAST ONE occurrence of the rule body contains `#008744`.
		 */
		it('dark-mode.css .tab-btn.active rule MUST contain #008744 (wrong color on unfixed code)', () => {
			// Check that the selector exists first (it already does on unfixed code).
			expect(
				selectorExists('html.ion-palette-dark .tab-btn.active'),
				`Precondition: "html.ion-palette-dark .tab-btn.active" must be present (we know it is on unfixed code)`
			).toBe(true)

			// Now assert that the rule body uses the green accent.
			const allRuleBodies = getRuleBodies('html.ion-palette-dark .tab-btn.active')

			// ── Expected behavior assertion (FAILS on unfixed code) ────────────────
			// Unfixed: the only rule body has `var(--dm-bg-subtle)` — no `#008744` anywhere → FAILS ✓
			// Fixed:   the appended rule body includes `#008744` → PASSES ✓
			expect(
				allRuleBodies,
				`COUNTEREXAMPLE: "html.ion-palette-dark .tab-btn.active" uses background: var(--dm-bg-subtle)\n` +
				`instead of #008744. This produces a muted grey pill in dark mode instead of the green accent.\n` +
				`All current rule bodies:\n${allRuleBodies}\n` +
				`Root cause: the rule was written conservatively and never updated to the portal green convention.`
			).toContain('#008744')
		})

		it('.tab-btn.active dark rule MUST NOT exclusively use var(--dm-bg-subtle) (wrong on unfixed code)', () => {
			// Confirm the bug: unfixed code has ONLY var(--dm-bg-subtle) in all rule bodies.
			// After the fix, the appended rule brings #008744, but we still allow dm-bg-subtle
			// to remain in the earlier (now-overridden) rule — what matters is that #008744 wins.
			// This test is the positive assertion; the prior test asserts the negative.
			// Both encode the same bug from different angles.
			const allRuleBodies = getRuleBodies('html.ion-palette-dark .tab-btn.active')
			const onlySubtle = allRuleBodies.includes('var(--dm-bg-subtle)') && !allRuleBodies.includes('#008744')
			expect(
				onlySubtle,
				`COUNTEREXAMPLE: the .tab-btn.active dark rule(s) exclusively use var(--dm-bg-subtle).\n` +
				`Rule bodies found:\n${allRuleBodies}\n` +
				`After fix: #008744 must appear (appended rule overrides the old muted-grey one).`
			).toBe(false)
		})
	}
)

describe(
	'Property 1 (Item 3b): Bug Condition — .tabs-bar .tab-button.active dark override is MISSING (FAILS on unfixed code)',
	() => {
		/**
		 * Counterexample confirmed on unfixed code:
		 *   `html.ion-palette-dark .tabs-bar .tab-button.active` does NOT exist in
		 *   dark-mode.css at all. The inactive version (.tabs-bar .tab-button, without
		 *   .active) IS present on line ~1048, but the active state has no dark coverage.
		 *
		 * This means that when dark mode is ON and a user clicks a tab in any component
		 * that uses the `.tabs-bar + .tab-button` pattern (AdminSettings.vue,
		 * AdminManageProductData.vue), the active tab inherits from the light-mode
		 * scoped rule which typically sets `#008744` background — but there is no
		 * explicit dark-mode override guaranteeing green here.
		 *
		 * Expected behavior (post-fix): the rule exists with `background: #008744;
		 * color: #ffffff; border-color: #008744`.
		 */
		it('dark-mode.css MUST contain "html.ion-palette-dark .tabs-bar .tab-button.active" rule (absent on unfixed code)', () => {
			// ── Expected behavior assertion (FAILS on unfixed code) ────────────────
			// Unfixed: selector absent → selectorExists() returns false → FAILS ✓
			// Fixed:   selector present → selectorExists() returns true  → PASSES ✓
			expect(
				selectorExists('html.ion-palette-dark .tabs-bar .tab-button.active'),
				`COUNTEREXAMPLE: "html.ion-palette-dark .tabs-bar .tab-button.active" is entirely absent.\n` +
				`Root cause: the initial dark-mode pass for admin tabs only added the inactive-state rule\n` +
				`(.tabs-bar .tab-button) and accidentally omitted the active-state override.\n` +
				`Impact: components using .tab-button.active inside .tabs-bar have no guaranteed\n` +
				`green active pill in dark mode.`
			).toBe(true)
		})

		it('.tabs-bar .tab-button.active dark rule MUST use #008744 (absent on unfixed code)', () => {
			const ruleBody = getRuleBodies('html.ion-palette-dark .tabs-bar .tab-button.active')
			expect(
				ruleBody,
				`COUNTEREXAMPLE: Rule body is empty (rule absent).\n` +
				`Expected rule to contain "#008744" after the fix.\n` +
				`Current body: "${ruleBody || '(rule absent)'}"`
			).toContain('#008744')
		})

		it('.tabs-bar .tab-button.active dark rule MUST use color #ffffff (absent on unfixed code)', () => {
			const ruleBody = getRuleBodies('html.ion-palette-dark .tabs-bar .tab-button.active')
			expect(
				ruleBody,
				`COUNTEREXAMPLE: Rule body is empty (rule absent).\n` +
				`Expected rule to contain color "#ffffff" after the fix.\n` +
				`Current body: "${ruleBody || '(rule absent)'}"`
			).toContain('#ffffff')
		})
	}
)
