/**
 * Preservation property tests — Existing dark-mode rules (Task 8)
 *
 * Property 2: Preservation — Existing Dark-Mode Rules and Light-Mode Styles Unchanged
 *
 * OBSERVATION-FIRST methodology:
 *   These tests observe the behavior of the UNFIXED code for inputs where none of
 *   the four bug conditions hold, and encode those observations as scoped tests.
 *
 *   EXPECTED OUTCOME on unfixed code: ALL tests PASS (baseline to preserve).
 *
 * Inputs where bug conditions do NOT hold (covered here):
 *   A. `html.ion-palette-dark .nav-item.active` — sidebar active state has a comment
 *      explicitly saying "leave as-is". The rule (though suppressed by the comment)
 *      must not be overridden by the fix.
 *   B. `html.ion-palette-dark .tabs-bar .tab-button` (INACTIVE) — correct dark bg.
 *      This rule covers inactive tabs in dark mode and MUST be left untouched.
 *   C. `html.ion-palette-dark .settings-tabs .tab-button` — settings sidebar tabs
 *      already have dark-mode coverage and MUST remain intact.
 *   D. `html.ion-palette-dark .subtitle` — page subtitles already covered.
 *   E. `html.ion-palette-dark .admin-layout` — layout shell already covered.
 *   F. Light-mode dashboard CSS is in the scoped component, NOT in dark-mode.css
 *      under a non-dark-mode selector (i.e. the fix must not accidentally add
 *      light-mode rules to dark-mode.css).
 *
 * Assertion strategy (same as AdminDarkMode.bug.test.ts):
 *   Read the dark-mode.css source and assert on its text content. jsdom does not
 *   evaluate external CSS, so CSS-source assertions are the only reliable approach.
 *
 * Validates: Requirements 3.3, 3.4, 3.5
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Read dark-mode.css and AdminDashboard.vue sources ─────────────────────────

const DARK_MODE_CSS_PATH = resolve(__dirname, '../../theme/dark-mode.css')
const DASHBOARD_VUE_PATH = resolve(__dirname, 'AdminDashboard.vue')
const SYSTEM_LOGS_VUE_PATH = resolve(__dirname, 'AdminSystemLogs.vue')

const darkModeCss = readFileSync(DARK_MODE_CSS_PATH, 'utf-8')
const dashboardVueSrc = readFileSync(DASHBOARD_VUE_PATH, 'utf-8')
const systemLogsVueSrc = readFileSync(SYSTEM_LOGS_VUE_PATH, 'utf-8')

// ── CSS source helpers ────────────────────────────────────────────────────────

/**
 * Returns true if the given selector appears in the dark-mode.css source as a
 * rule selector (followed by optional whitespace and `{`, `,`, or newline).
 */
function selectorExists(selector: string): boolean {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const pattern = new RegExp(escaped + '\\s*[,{\\n]')
	return pattern.test(darkModeCss)
}

/**
 * Extracts the concatenated rule bodies for all occurrences of a selector in
 * dark-mode.css. Returns an empty string if the selector is not found.
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

/**
 * Extracts the <style scoped> block content from a Vue SFC source string.
 * Returns an empty string if none is found.
 */
function extractScopedStyle(sfcSource: string): string {
	const match = sfcSource.match(/<style scoped>([\s\S]*?)<\/style>/)
	return match ? match[1] : ''
}

// ═══════════════════════════════════════════════════════════════════════════
// A. Preservation — sidebar active state comment + nav-item.active
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2A: Preservation — nav-item.active sidebar comment is intact', () => {
	/**
	 * Observation on unfixed code:
	 *   dark-mode.css contains a comment "keep the active green pill readable —
	 *   leave .nav-item.active as-is" immediately before the `.sidebar-footer` rule.
	 *   This comment is an explicit preservation directive and must NOT be removed
	 *   by the fix.
	 *
	 * The existing rule structure means `.nav-item.active` retains its light-mode
	 * scoped styles (which set `background: #008744` in AdminLayout.vue). The
	 * dark-mode.css deliberately does NOT override it — the green is correct in
	 * both modes.
	 */
	it('dark-mode.css preserves the "keep the active green pill readable" comment', () => {
		expect(
			darkModeCss,
			`The comment "keep the active green pill readable" must remain in dark-mode.css.\n` +
			`Removing it would signal accidental deletion of the preservation directive for .nav-item.active.`
		).toContain('keep the active green pill readable')
	})

	it('dark-mode.css does NOT add a new html.ion-palette-dark .nav-item.active rule that could override the sidebar green', () => {
		// The sidebar nav-item.active is intentionally left to its scoped light-mode
		// rule (which already uses #008744). The fix MUST NOT introduce a global
		// dark-mode override that would change this behavior.
		//
		// We assert that there is no html.ion-palette-dark .nav-item.active rule.
		// (The desktop nav uses .nav-item--active which is a different selector — fine.)
		expect(
			selectorExists('html.ion-palette-dark .nav-item.active'),
			`Preservation: no "html.ion-palette-dark .nav-item.active" rule must be added.\n` +
			`The sidebar active state is already green via the scoped AdminLayout.vue rule.`
		).toBe(false)
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// B. Preservation — inactive tab dark-mode rule is correct and untouched
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2B: Preservation — inactive .tabs-bar .tab-button dark rule is intact', () => {
	/**
	 * Observation on unfixed code:
	 *   Lines ~1048–1053 in dark-mode.css:
	 *
	 *   html.ion-palette-dark .tabs-bar .tab-button,
	 *   html.ion-palette-dark .tab-btn {
	 *     background: var(--dm-bg-card);
	 *     border-color: var(--dm-border);
	 *     color: var(--dm-text-secondary);
	 *   }
	 *
	 *   This rule gives all admin tab buttons (inactive state) a dark card
	 *   background and muted text. It is CORRECT and must NOT be touched by the fix.
	 *
	 * Preservation rule: any fix to active-tab styling must NOT alter the inactive
	 * tab rule above. The only change to tab-btn behavior is the active state,
	 * handled by the separate .tab-btn.active rule (or the appended override).
	 */
	it('dark-mode.css STILL contains "html.ion-palette-dark .tabs-bar .tab-button" (multi-selector, inactive)', () => {
		expect(
			selectorExists('html.ion-palette-dark .tabs-bar .tab-button'),
			`Preservation: the inactive-state rule for .tabs-bar .tab-button must remain in dark-mode.css.\n` +
			`This provides dark-mode styling for all inactive tab buttons and must not be removed.`
		).toBe(true)
	})

	it('the inactive .tabs-bar .tab-button rule uses var(--dm-bg-card) background', () => {
		// We look for the combined multi-selector block.
		// Since the selector is part of a comma-group with .tab-btn, we check the
		// overall file for the presence of both the selector AND the expected property
		// nearby in the same rule block.
		const tabButtonInactiveSection = darkModeCss.match(
			/html\.ion-palette-dark \.tabs-bar \.tab-button,[\s\S]*?html\.ion-palette-dark \.tab-btn\s*\{([^}]*)\}/
		)
		expect(
			tabButtonInactiveSection,
			`Preservation: the combined multi-selector block for inactive .tabs-bar .tab-button + .tab-btn must exist.`
		).toBeTruthy()

		if (tabButtonInactiveSection) {
			const ruleBody = tabButtonInactiveSection[1]
			expect(
				ruleBody,
				`Preservation: the inactive tab rule must still use var(--dm-bg-card) background.\n` +
				`Actual rule body: ${ruleBody}`
			).toContain('var(--dm-bg-card)')

			expect(
				ruleBody,
				`Preservation: the inactive tab rule must still use var(--dm-text-secondary) color.\n` +
				`Actual rule body: ${ruleBody}`
			).toContain('var(--dm-text-secondary)')
		}
	})

	it('dark-mode.css STILL contains "html.ion-palette-dark .tab-btn" (inactive, part of multi-selector)', () => {
		// The .tab-btn entry is part of the same multi-selector block.
		// We confirm it appears alongside .tabs-bar .tab-button.
		const hasTabBtnInactive = /html\.ion-palette-dark \.tab-btn\b/.test(darkModeCss)
		expect(
			hasTabBtnInactive,
			`Preservation: html.ion-palette-dark .tab-btn (inactive state) must remain in dark-mode.css.`
		).toBe(true)
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// C. Preservation — settings sidebar tabs dark-mode rules are intact
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2C: Preservation — settings-tabs dark-mode rules are intact', () => {
	/**
	 * Observation on unfixed code:
	 *   dark-mode.css contains rules for .settings-tabs .tab-button covering
	 *   the inactive and hover states in the AdminSettings.vue sidebar tab nav.
	 *   These must NOT be touched by the fix.
	 */
	it('dark-mode.css STILL contains "html.ion-palette-dark .settings-tabs .tab-button" (inactive)', () => {
		expect(
			selectorExists('html.ion-palette-dark .settings-tabs .tab-button'),
			`Preservation: .settings-tabs .tab-button dark rule must remain. ` +
			`This covers AdminSettings.vue sidebar tab inactive state.`
		).toBe(true)
	})

	it('dark-mode.css STILL contains hover rule for .settings-tabs .tab-button', () => {
		expect(
			selectorExists('html.ion-palette-dark .settings-tabs .tab-button:hover'),
			`Preservation: .settings-tabs .tab-button:hover rule must remain.`
		).toBe(true)
	})

	it('.settings-tabs .tab-button dark rule still uses color: var(--dm-text-secondary)', () => {
		const ruleBody = getRuleBodies('html.ion-palette-dark .settings-tabs .tab-button')
		expect(
			ruleBody,
			`Preservation: .settings-tabs .tab-button must still set color: var(--dm-text-secondary).\n` +
			`Actual rule body: ${ruleBody || '(absent)'}`
		).toContain('var(--dm-text-secondary)')
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// D. Preservation — .subtitle dark-mode override remains
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2D: Preservation — .subtitle dark rule is intact', () => {
	/**
	 * Observation on unfixed code:
	 *   dark-mode.css (~line 1004) contains:
	 *     html.ion-palette-dark .subtitle { color: var(--dm-text-secondary); }
	 *
	 *   This generic rule already covers page subtitles in AdminSystemLogs.vue
	 *   (.subtitle) and AdminDashboard.vue (.subtitle). The design notes this
	 *   explicitly as already handled (✓ no change needed). It must remain.
	 */
	it('dark-mode.css STILL contains "html.ion-palette-dark .subtitle" rule', () => {
		expect(
			selectorExists('html.ion-palette-dark .subtitle'),
			`Preservation: the generic .subtitle dark-mode rule must remain (already covers both views).`
		).toBe(true)
	})

	it('.subtitle dark rule uses var(--dm-text-secondary)', () => {
		const ruleBody = getRuleBodies('html.ion-palette-dark .subtitle')
		expect(
			ruleBody,
			`Preservation: the .subtitle rule must still use var(--dm-text-secondary).\n` +
			`Actual rule body: ${ruleBody || '(absent)'}`
		).toContain('var(--dm-text-secondary)')
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// E. Preservation — .admin-layout dark rule is intact
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2E: Preservation — .admin-layout dark rule is intact', () => {
	/**
	 * Observation on unfixed code:
	 *   dark-mode.css (~line 966) contains:
	 *     html.ion-palette-dark .admin-layout { background: var(--dm-bg-page); }
	 *
	 *   The layout shell dark-mode coverage is already correct. It must remain
	 *   untouched by the fix.
	 */
	it('dark-mode.css STILL contains "html.ion-palette-dark .admin-layout" rule', () => {
		expect(
			selectorExists('html.ion-palette-dark .admin-layout'),
			`Preservation: the .admin-layout dark rule must remain in dark-mode.css.`
		).toBe(true)
	})

	it('.admin-layout dark rule uses var(--dm-bg-page)', () => {
		const ruleBody = getRuleBodies('html.ion-palette-dark .admin-layout')
		expect(
			ruleBody,
			`Preservation: .admin-layout must still set background: var(--dm-bg-page).\n` +
			`Actual rule body: ${ruleBody || '(absent)'}`
		).toContain('var(--dm-bg-page)')
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// F. Preservation — light-mode dashboard CSS lives in scoped component only
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2F: Preservation — light-mode dashboard CSS stays in the SFC, not in dark-mode.css', () => {
	/**
	 * Observation on unfixed code:
	 *   AdminDashboard.vue contains scoped CSS such as:
	 *     .dashboard { background-color: #fafafa; }
	 *     .green-card { background-color: #f2fbf5; ... }
	 *   These light-mode values are ONLY in the SFC's <style scoped> block.
	 *   They must NEVER appear in dark-mode.css under a non-dark-mode selector.
	 *
	 * Preservation: the fix (dark-mode.css append) must NOT accidentally duplicate
	 * or add light-mode hex values into dark-mode.css outside of the
	 * html.ion-palette-dark scope. This is a sanity check against copy-paste errors.
	 */

	const lightModeHexValues = [
		{ value: '#fafafa', context: 'AdminDashboard .dashboard background' },
		{ value: '#f2fbf5', context: 'AdminDashboard .green-card background' },
		{ value: '#fffaf0', context: 'AdminDashboard .orange-card background' },
		{ value: '#f0f7ff', context: 'AdminDashboard .blue-card background' },
	]

	it.each(lightModeHexValues)(
		'light-mode value $value ($context) is present in AdminDashboard.vue scoped CSS', ({ value }) => {
			// Sanity check: confirm the light-mode value IS in the SFC source.
			const scopedStyle = extractScopedStyle(dashboardVueSrc)
			expect(
				scopedStyle,
				`Sanity: ${value} must be in AdminDashboard.vue scoped CSS (it's the light-mode value we're protecting).`
			).toContain(value)
		}
	)

	it.each(lightModeHexValues)(
		'light-mode value $value ($context) does NOT appear in dark-mode.css outside of dark-mode scope', ({ value }) => {
			// Split out only the non-dark-mode-scoped content of dark-mode.css by removing
			// any line that begins with or follows `html.ion-palette-dark`.
			// We do this by checking for the value in parts of the file that are not
			// inside a dark-mode rule block.
			//
			// Approach: scan each line of dark-mode.css. If the line is inside a
			// `html.ion-palette-dark` rule block, skip it. If the value appears
			// outside such a block, that is a preservation violation.
			//
			// For simplicity and reliability, we assert that the value either:
			//   a) does not appear in dark-mode.css at all, OR
			//   b) every occurrence is inside an `html.ion-palette-dark` context.
			//
			// We use a pragmatic approach: split on rule boundaries and check.
			const lines = darkModeCss.split('\n')
			let inDarkScope = false
			const nonDarkLines: string[] = []

			for (const line of lines) {
				const trimmed = line.trim()
				// Entering a dark-mode rule block.
				if (trimmed.includes('html.ion-palette-dark')) {
					inDarkScope = true
				}
				if (!inDarkScope) {
					nonDarkLines.push(line)
				}
				// Exiting a rule block (closing brace at the start of line).
				// Note: this is a heuristic — dark-mode.css uses consistent formatting.
				if (inDarkScope && trimmed === '}') {
					inDarkScope = false
				}
			}

			const nonDarkContent = nonDarkLines.join('\n')
			// The light-mode hex should not appear in non-dark-scoped CSS content.
			// (Comments, token declarations, and dark-mode overrides are all fine.)
			expect(
				nonDarkContent,
				`Preservation: ${value} (a light-mode color) must not appear in dark-mode.css outside the\n` +
				`html.ion-palette-dark scope. Finding it there would indicate the fix accidentally added\n` +
				`light-mode CSS to the dark-mode stylesheet.`
			).not.toContain(value)
		}
	)

	it('AdminDashboard.vue scoped CSS is NOT modified by the dark-mode fix (light-mode values still present)', () => {
		// The design explicitly states light-mode scoped CSS in AdminDashboard.vue must
		// remain untouched. We confirm all key light-mode values are still in the SFC.
		const scopedStyle = extractScopedStyle(dashboardVueSrc)
		expect(scopedStyle).toContain('#fafafa')   // .dashboard root
		expect(scopedStyle).toContain('#f2fbf5')   // .green-card
		expect(scopedStyle).toContain('#fffaf0')   // .orange-card
		expect(scopedStyle).toContain('#f0f7ff')   // .blue-card
		expect(scopedStyle).toContain('#4b5563')   // .stat-label (original light-mode color)
	})

	it('AdminSystemLogs.vue scoped CSS is NOT modified by the dark-mode fix (light-mode values still present)', () => {
		// Same preservation check for AdminSystemLogs.vue.
		const scopedStyle = extractScopedStyle(systemLogsVueSrc)
		expect(scopedStyle).toContain('#f8fafc')   // .system-logs root background
		expect(scopedStyle).toContain('#fffbeb')   // .alert-box background (light)
		expect(scopedStyle).toContain('#94a3b8')   // .chart-subtitle / .time-labels color (light secondary)
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// G. Preservation — core admin dark-mode scaffold rules remain intact
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2G: Preservation — core admin dark-mode scaffold rules are intact', () => {
	/**
	 * These are the high-level structural rules that were already in dark-mode.css
	 * before this spec. The fix appends new rules but must NOT delete or alter
	 * existing ones. We pin a representative set as a baseline.
	 */

	const coreRules = [
		{ selector: 'html.ion-palette-dark .sidebar', label: 'admin sidebar background' },
		{ selector: 'html.ion-palette-dark .admin-main', label: 'admin main content area' },
		{ selector: 'html.ion-palette-dark .top-bar', label: 'admin top bar' },
		{ selector: 'html.ion-palette-dark .system-logs', label: 'system-logs page background scope' },
		{ selector: 'html.ion-palette-dark .settings-page', label: 'settings page background scope' },
		{ selector: 'html.ion-palette-dark .batch-toolbar', label: 'batch toolbar (last rule before append point)' },
		{ selector: 'html.ion-palette-dark .log-header', label: 'system logs log header' },
		{ selector: 'html.ion-palette-dark .service-name', label: 'system logs service name' },
	]

	it.each(coreRules)(
		'$label — "html.ion-palette-dark $selector" rule still exists', ({ selector }) => {
			expect(
				selectorExists(selector),
				`Preservation: "${selector}" must still be in dark-mode.css after the fix is applied.\n` +
				`This rule was present before the fix and must not have been accidentally removed.`
			).toBe(true)
		}
	)

	it('dark-mode.css still contains the ADMIN PORTAL DARK MODE section comment', () => {
		// The ADMIN PORTAL section header comment is a structural marker in the file.
		expect(
			darkModeCss,
			`Preservation: the "ADMIN PORTAL DARK MODE" section comment must remain in dark-mode.css.`
		).toContain('ADMIN PORTAL DARK MODE')
	})

	it('dark-mode.css still contains the shared --dm-* token palette declaration', () => {
		// The token palette is the foundation for all dark-mode overrides.
		expect(darkModeCss).toContain('--dm-bg-page')
		expect(darkModeCss).toContain('--dm-bg-card')
		expect(darkModeCss).toContain('--dm-text-primary')
		expect(darkModeCss).toContain('--dm-text-secondary')
		expect(darkModeCss).toContain('--dm-border')
	})
})

// ═══════════════════════════════════════════════════════════════════════════
// H. Preservation — stat-card generic rule (covers System Logs, not Dashboard)
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2H: Preservation — generic .stat-card dark rule still covers System Logs', () => {
	/**
	 * Observation on unfixed code (confirmed):
	 *   dark-mode.css contains the generic rule:
	 *     html.ion-palette-dark .stat-card { background: var(--dm-bg-card) !important; }
	 *   This covers the stat cards in AdminSystemLogs.vue (which live inside
	 *   `.system-logs`, not `.dashboard`). The fix adds a SCOPED
	 *   `.dashboard .stat-card` rule but must NOT remove this generic one.
	 *
	 * The design notes:
	 *   ".dashboard .stat-card is scoped with .dashboard to avoid conflicting with
	 *    the existing generic html.ion-palette-dark .stat-card rule (which targets
	 *    System Logs stat cards). The generic rule already covers System Logs."
	 */
	it('dark-mode.css STILL contains the generic "html.ion-palette-dark .stat-card" rule', () => {
		expect(
			selectorExists('html.ion-palette-dark .stat-card'),
			`Preservation: the generic .stat-card dark rule must remain to cover System Logs stat cards.\n` +
			`The fix adds a scoped .dashboard .stat-card rule in addition to this one — not instead of it.`
		).toBe(true)
	})

	it('generic .stat-card dark rule still uses var(--dm-bg-card)', () => {
		// Find all occurrences of .stat-card rule bodies; at least one must be the generic rule.
		const allBodies = getRuleBodies('html.ion-palette-dark .stat-card')
		expect(
			allBodies,
			`Preservation: at least one .stat-card dark rule must use var(--dm-bg-card).\n` +
			`All rule bodies: ${allBodies || '(none found)'}`
		).toContain('var(--dm-bg-card)')
	})
})
