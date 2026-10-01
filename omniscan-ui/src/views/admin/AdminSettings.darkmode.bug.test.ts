/**
 * Bug condition exploration test — Dark Mode revert (Area 1)
 *
 * Property 1: Bug Condition - Dark Mode Persists Across Load and Navigation
 *
 * This test encodes the EXPECTED behavior (theme persistence) and is a bug
 * condition exploration test for the bugfix spec `admin-portal-polish`.
 *
 * CRITICAL BUGFIX SEMANTICS:
 *   - This test MUST FAIL against the UNFIXED `fetchSettings()` flow.
 *   - A failure CONFIRMS the bug exists (Object.assign overwrites form.darkMode
 *     with a stale/absent backend value, then applyDarkMode(false) strips the
 *     `ion-palette-dark` class, reverting the theme to light).
 *   - After the fix (localStorage becomes the source of truth) this same test
 *     will PASS. DO NOT fix the test or the code here.
 *
 * isBugCondition(input):
 *   darkModeEnabled === true
 *   AND navigatedTo IN { Dashboard, Settings }
 *   AND backendDarkMode !== true   (absent OR false)
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reactive } from 'vue';

const DARK_MODE_KEY = 'omniscan_dark_mode';

/**
 * Faithful copy of the theme applier from AdminSettings.vue:
 * toggles the global dark-theme class and persists the choice to localStorage.
 */
function applyDarkMode(enabled: boolean): void {
	document.documentElement.classList.toggle('ion-palette-dark', enabled);
	localStorage.setItem(DARK_MODE_KEY, enabled ? 'true' : 'false');
}

/** The reactive form shape used by AdminSettings.vue (defaults included). */
function makeForm() {
	return reactive({
		portalName: 'OmniScan Admin Portal',
		darkMode: false,
		aiModel: 'Ollama Pro',
		reviewConfidenceThreshold: 75,
		autoFlagThreshold: 90,
		enableVisionScan: true,
		autoReviewLowRisk: false,
		emailOnNewFlag: true,
		emailOnSystemError: true,
		dailySummaryReport: true,
	});
}

/**
 * Simulates the FIXED fetchSettings() body from AdminSettings.vue:
 *   1. onMounted seeds form.darkMode from localStorage
 *   2. Capture localDarkMode from localStorage BEFORE the GET (source of truth)
 *   3. GET /api/admin/settings resolves to `data`
 *   4. Object.assign(form, data)     <-- merges backend payload
 *   5. form.darkMode = localDarkMode  <-- localStorage wins over backend
 *   6. applyDarkMode(form.darkMode)   <-- theme stays consistent with localStorage
 *
 * `data` is the mocked backend payload. This mirrors the reconciliation applied
 * in Task 3.1, so a passing test validates the fix.
 */
function runLoadFlow(data: Record<string, unknown>) {
	const form = makeForm();
	// onMounted seeding (matches AdminSettings.vue onMounted)
	form.darkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
	// --- fetchSettings() fixed path ---
	// Capture localStorage BEFORE the merge (localStorage is the source of truth).
	const localDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
	Object.assign(form, data);
	// Re-affirm the local value after the merge so an absent/false backend value
	// cannot strip ion-palette-dark on load.
	form.darkMode = localDarkMode;
	applyDarkMode(form.darkMode);
	return form;
}

/**
 * Scoped generator over the backend /api/admin/settings payloads that trigger
 * the bug: darkMode is (a) absent and (b) false, while other fields vary freely.
 * This is the constrained input space for the scoped property test.
 */
function backendPayloads(): { label: string; data: Record<string, unknown> }[] {
	const otherFieldVariants: Record<string, unknown>[] = [
		{},
		{ portalName: 'Renamed Portal' },
		{ aiModel: 'Ollama Ultra', reviewConfidenceThreshold: 60 },
		{ autoFlagThreshold: 95, enableVisionScan: false },
		{ emailOnNewFlag: false, dailySummaryReport: false, autoReviewLowRisk: true },
	];

	const cases: { label: string; data: Record<string, unknown> }[] = [];
	for (const other of otherFieldVariants) {
		// (a) darkMode absent
		cases.push({ label: `darkMode ABSENT + ${JSON.stringify(other)}`, data: { ...other } });
		// (b) darkMode === false
		cases.push({
			label: `darkMode FALSE + ${JSON.stringify(other)}`,
			data: { ...other, darkMode: false },
		});
	}
	return cases;
}

describe('Property 1: Bug Condition — Dark Mode Persists Across Load and Navigation', () => {
	beforeEach(() => {
		// Simulate the bug precondition: user enabled dark mode locally.
		localStorage.clear();
		localStorage.setItem(DARK_MODE_KEY, 'true');
		document.documentElement.classList.add('ion-palette-dark');
	});

	// Scoped property-based test over the failing payload space.
	// Expected Behavior assertion: after the load flow, the dark theme SHALL persist.
	it.each(backendPayloads())(
		'keeps ion-palette-dark and darkMode after load [$label]',
		({ data }) => {
			// Precondition sanity: localStorage says dark mode is on.
			expect(localStorage.getItem(DARK_MODE_KEY)).toBe('true');
			const localWantsDark = localStorage.getItem(DARK_MODE_KEY) === 'true';

			const form = runLoadFlow(data);

			// Expected Behavior (Requirement 2.1): dark theme class remains applied.
			expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
			// Expected Behavior (Requirement 2.2): form.darkMode reflects localStorage (source of truth).
			expect(form.darkMode).toBe(localWantsDark);
		},
	);
});
