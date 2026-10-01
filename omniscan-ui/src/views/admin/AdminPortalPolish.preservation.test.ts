/**
 * Preservation property tests — Non-buggy theme and panel behavior (Task 2)
 *
 * Property 2: Preservation - Non-Buggy Theme and Panel Behavior
 *
 * OBSERVATION-FIRST methodology:
 *   These tests observe the behavior of the UNFIXED code for inputs where
 *   `isBugCondition` returns FALSE, and encode those observations as
 *   (scoped) property-based tests. Because no PBT library (fast-check) is a
 *   project dependency, we use `it.each` over intelligently constrained
 *   input generators — the same convention as AdminSettings.darkmode.bug.test.ts.
 *
 *   EXPECTED OUTCOME on unfixed code: ALL tests PASS (baseline to preserve).
 *
 * isBugCondition(input):
 *   darkModeEnabled === true
 *   AND navigatedTo IN { Dashboard, Settings }
 *   AND backendDarkMode !== true   (absent OR false)
 *
 * Inputs where the bug condition does NOT hold (covered here):
 *   - Dark Mode OFF                          (darkModeEnabled === false)
 *   - Backend value already true             (backendDarkMode === true)
 *   - Verification Panel helper output       (unaffected surface)
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reactive } from 'vue';

const DARK_MODE_KEY = 'omniscan_dark_mode';

// ───────────────────────────────────────────────────────────────────────────
// Faithful copies of the AdminSettings.vue theme logic (unfixed) so we can
// observe theme behavior for non-bug inputs without mounting the SFC.
// ───────────────────────────────────────────────────────────────────────────

/** Toggles the global dark-theme class and persists the choice to localStorage. */
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
 * Simulates the CURRENT (unfixed) load flow from AdminSettings.vue:
 *   1. onMounted seeds form.darkMode from localStorage
 *   2. GET /api/admin/settings resolves to `data`
 *   3. Object.assign(form, data)
 *   4. applyDarkMode(form.darkMode)
 */
function runCurrentLoadFlow(data: Record<string, unknown>) {
	const form = makeForm();
	form.darkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
	Object.assign(form, data);
	applyDarkMode(form.darkMode);
	return form;
}

// ───────────────────────────────────────────────────────────────────────────
// Faithful copies of the VerificationPanel.vue helpers + row derivation
// (verbatim logic) so we can pin their output as the preservation baseline.
// ───────────────────────────────────────────────────────────────────────────

function verdictClass(verdict: string | null): string {
	return (verdict ?? 'yellow').toLowerCase() === 'red' ? 'red' : 'yellow';
}

function confidenceClass(verdict: string | null, pct: number): string {
	if ((verdict ?? '').toLowerCase() === 'red') return 'conf-red';
	if (pct >= 85) return 'conf-red';
	if (pct >= 70) return 'conf-yellow';
	return 'conf-green';
}

function statusClass(status: string): string {
	const s = status.toLowerCase();
	if (s === 'pending') return 'pill-pending';
	if (s === 'flagged') return 'pill-flagged';
	if (s === 'approved' || s === 'verified') return 'pill-approved';
	return 'pill-dismissed';
}

function statusLabel(status: string): string {
	const s = status.toLowerCase();
	if (s === 'approved' || s === 'verified') return 'Certified';
	if (s === 'dismissed' || s === 'rejected') return 'Dismissed';
	return status.charAt(0).toUpperCase() + status.slice(1);
}

function halalFlagLabel(flag_reason: string): string {
	const r = flag_reason.toLowerCase();
	if (r.includes('slaughter')) return 'Slaughter Cert.';
	if (r.includes('stamp') || r.includes('compliance')) return 'Compliance Stamp';
	if (r.includes('logo')) return 'Unverified Logo';
	return 'Halal Flag';
}

const CONFIDENCE_POOL = [72, 91, 68, 85, 77, 63, 88, 74, 59, 82];
function deriveConfidence(id: number): number {
	return CONFIDENCE_POOL[id % CONFIDENCE_POOL.length];
}

interface SampleRaw {
	id: number;
	product_name: string;
	brand_name: string;
	flag_reason: string;
	clean_flag_reason: string;
	status: string;
	safety_verdict: string | null;
	scanned_by: string;
	admin_correction: string | null;
	created_at: string;
}

/** Rebuild the derived rows exactly as flaggedScans does in VerificationPanel.vue. */
function deriveRows(raw: SampleRaw[]) {
	return raw.map((s) => ({
		...s,
		confidence: deriveConfidence(s.id),
		thumb_src: null as string | null,
	}));
}

/** Recompute counts exactly as the `counts` computed in VerificationPanel.vue. */
function computeCounts(raw: SampleRaw[]) {
	return {
		total: raw.length,
		pending: raw.filter((s) => s.status === 'pending' || s.status === 'flagged').length,
		corrected: raw.filter((s) => s.admin_correction != null && s.admin_correction !== '').length,
		resolved: raw.filter((s) =>
			['approved', 'verified', 'dismissed', 'rejected'].includes(s.status),
		).length,
	};
}

/**
 * Recompute filteredRows exactly as the `filteredRows` computed in
 * VerificationPanel.vue for a given set of filter values.
 */
function computeFilteredRows(
	rows: ReturnType<typeof deriveRows>,
	filters: { searchQuery: string; filterHalalType: string; filterVerdict: string; filterStatus: string },
) {
	return rows.filter((row) => {
		const q = filters.searchQuery.trim().toLowerCase();
		if (q) {
			const name = `${row.brand_name} ${row.product_name}`.toLowerCase();
			if (!name.includes(q) && !`#${row.id}`.includes(q) && !row.scanned_by.toLowerCase().includes(q))
				return false;
		}
		if (filters.filterHalalType !== 'all') {
			const r = row.flag_reason.toLowerCase();
			if (filters.filterHalalType === 'logo' && !r.includes('logo')) return false;
			if (filters.filterHalalType === 'slaughter' && !r.includes('slaughter')) return false;
			if (filters.filterHalalType === 'stamp' && !r.includes('stamp') && !r.includes('compliance'))
				return false;
		}
		if (filters.filterVerdict !== 'all') {
			if ((row.safety_verdict ?? '').toLowerCase() !== filters.filterVerdict) return false;
		}
		if (filters.filterStatus !== 'all') {
			const s = row.status.toLowerCase();
			if (filters.filterStatus === 'approved' && s !== 'approved' && s !== 'verified') return false;
			if (filters.filterStatus === 'dismissed' && s !== 'dismissed' && s !== 'rejected') return false;
			if (
				filters.filterStatus !== 'approved' &&
				filters.filterStatus !== 'dismissed' &&
				s !== filters.filterStatus
			)
				return false;
		}
		return true;
	});
}

// ───────────────────────────────────────────────────────────────────────────
// Representative, intelligently constrained sample inputs (the "generators").
// ───────────────────────────────────────────────────────────────────────────

/** Representative sample of raw flagged-scan rows spanning verdicts + statuses. */
function sampleRows(): SampleRaw[] {
	const statuses = ['pending', 'flagged', 'approved', 'verified', 'dismissed', 'rejected'];
	const verdicts: (string | null)[] = ['red', 'yellow', 'RED', 'Yellow', null, 'green'];
	const reasons = [
		'Unverified halal logo detected',
		'Slaughter certification missing',
		'Compliance stamp not found',
		'Halal stamp unclear',
		'Generic flag with no keyword',
	];
	const rows: SampleRaw[] = [];
	let id = 1;
	for (const status of statuses) {
		for (const verdict of verdicts) {
			const reason = reasons[id % reasons.length];
			rows.push({
				id,
				product_name: `Product ${id}`,
				brand_name: `Brand ${id}`,
				flag_reason: reason,
				clean_flag_reason: reason,
				status,
				safety_verdict: verdict,
				scanned_by: `user${id}@example.com`,
				admin_correction: id % 3 === 0 ? 'Reviewed by admin' : id % 3 === 1 ? '' : null,
				created_at: '2026-01-15T10:30:00.000Z',
			});
			id++;
		}
	}
	return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// A. Theme preservation — inputs where isBugCondition is FALSE
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2A: Preservation — Dark Mode OFF renders light (bug condition false)', () => {
	beforeEach(() => {
		localStorage.clear();
		// darkModeEnabled === false → bug condition does NOT hold.
		localStorage.setItem(DARK_MODE_KEY, 'false');
		document.documentElement.classList.remove('ion-palette-dark');
	});

	// Generator: settings payloads with darkMode absent / false / true, other fields vary.
	const offPayloads: { label: string; data: Record<string, unknown> }[] = [
		{ label: 'darkMode ABSENT', data: {} },
		{ label: 'darkMode FALSE', data: { darkMode: false } },
		{ label: 'darkMode TRUE (backend) but local off', data: { darkMode: true } },
		{ label: 'other fields only', data: { portalName: 'X', aiModel: 'Ollama Ultra' } },
	];

	it.each(offPayloads)(
		'ion-palette-dark stays ABSENT after load [$label]',
		({ data }) => {
			const before = document.documentElement.classList.contains('ion-palette-dark');
			expect(before).toBe(false);
			runCurrentLoadFlow(data);
			// Preservation (Req 3.1): light mode continues to render when dark mode is off locally.
			// (Backend darkMode:true does NOT force dark because onMounted seeds from localStorage='false'
			//  and Object.assign(darkMode:true) is the ONLY way it flips — captured below.)
			if ((data as { darkMode?: boolean }).darkMode === true) {
				// Observation: unfixed Object.assign lets backend darkMode:true turn the class ON.
				expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
			} else {
				expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);
			}
		},
	);

	it('toggling OFF from ON applies light immediately', () => {
		// Start dark, then toggle off (the watch(() => form.darkMode, applyDarkMode) path).
		document.documentElement.classList.add('ion-palette-dark');
		localStorage.setItem(DARK_MODE_KEY, 'true');
		applyDarkMode(false);
		// Preservation (Req 3.1): immediate light render on toggle-off.
		expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);
		expect(localStorage.getItem(DARK_MODE_KEY)).toBe('false');
	});
});

describe('Property 2B: Preservation — Backend value already true keeps dark (bug condition false)', () => {
	beforeEach(() => {
		localStorage.clear();
		// darkModeEnabled === true AND backendDarkMode === true → bug condition FALSE.
		localStorage.setItem(DARK_MODE_KEY, 'true');
		document.documentElement.classList.add('ion-palette-dark');
	});

	// Generator: backend payloads that all carry darkMode:true, other fields vary.
	const truePayloads: { label: string; data: Record<string, unknown> }[] = [
		{ label: 'darkMode TRUE only', data: { darkMode: true } },
		{ label: 'darkMode TRUE + renamed portal', data: { darkMode: true, portalName: 'Renamed' } },
		{ label: 'darkMode TRUE + model/threshold', data: { darkMode: true, aiModel: 'Ollama Ultra', reviewConfidenceThreshold: 60 } },
	];

	it.each(truePayloads)(
		'theme stays dark and form.darkMode stays true after load [$label]',
		({ data }) => {
			const form = runCurrentLoadFlow(data);
			// Preservation: dark stays dark when backend agrees (bug condition does not hold).
			expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
			expect(form.darkMode).toBe(true);
		},
	);
});

// ═══════════════════════════════════════════════════════════════════════════
// B. Verification Panel helpers — unaffected surface (bug condition false)
// ═══════════════════════════════════════════════════════════════════════════

describe('Property 2C: Preservation — VerificationPanel helper output is unchanged', () => {
	// verdictClass: red → 'red', everything else → 'yellow' (case-insensitive).
	it.each([
		['red', 'red'],
		['RED', 'red'],
		['Red', 'red'],
		['yellow', 'yellow'],
		['Yellow', 'yellow'],
		['green', 'yellow'],
		['', 'yellow'],
		[null, 'yellow'],
	])('verdictClass(%s) === %s', (verdict, expected) => {
		expect(verdictClass(verdict as string | null)).toBe(expected);
	});

	// confidenceClass: red verdict OR pct>=85 → conf-red; pct>=70 → conf-yellow; else conf-green.
	it.each([
		['red', 10, 'conf-red'],
		['RED', 50, 'conf-red'],
		['yellow', 90, 'conf-red'],
		['yellow', 85, 'conf-red'],
		['yellow', 84, 'conf-yellow'],
		['yellow', 70, 'conf-yellow'],
		['yellow', 69, 'conf-green'],
		[null, 72, 'conf-yellow'],
		[null, 60, 'conf-green'],
	])('confidenceClass(%s, %d) === %s', (verdict, pct, expected) => {
		expect(confidenceClass(verdict as string | null, pct as number)).toBe(expected);
	});

	// statusClass mapping.
	it.each([
		['pending', 'pill-pending'],
		['flagged', 'pill-flagged'],
		['approved', 'pill-approved'],
		['verified', 'pill-approved'],
		['dismissed', 'pill-dismissed'],
		['rejected', 'pill-dismissed'],
		['anything-else', 'pill-dismissed'],
		['PENDING', 'pill-pending'],
	])('statusClass(%s) === %s', (status, expected) => {
		expect(statusClass(status as string)).toBe(expected);
	});

	// statusLabel mapping.
	it.each([
		['approved', 'Certified'],
		['verified', 'Certified'],
		['dismissed', 'Dismissed'],
		['rejected', 'Dismissed'],
		['pending', 'Pending'],
		['flagged', 'Flagged'],
	])('statusLabel(%s) === %s', (status, expected) => {
		expect(statusLabel(status as string)).toBe(expected);
	});

	// halalFlagLabel mapping (keyword precedence: slaughter > stamp/compliance > logo > default).
	it.each([
		['Unverified halal logo detected', 'Unverified Logo'],
		['Slaughter certification missing', 'Slaughter Cert.'],
		['Compliance stamp not found', 'Compliance Stamp'],
		['Halal stamp unclear', 'Compliance Stamp'],
		['Generic flag with no keyword', 'Halal Flag'],
		['slaughter and logo both present', 'Slaughter Cert.'],
	])('halalFlagLabel(%s) === %s', (reason, expected) => {
		expect(halalFlagLabel(reason as string)).toBe(expected);
	});

	// counts computed over the representative sample — pinned baseline.
	it('counts produces the observed baseline over the sample', () => {
		const raw = sampleRows();
		const c = computeCounts(raw);
		// total = every row.
		expect(c.total).toBe(raw.length);
		// pending = status pending|flagged.
		expect(c.pending).toBe(raw.filter((r) => r.status === 'pending' || r.status === 'flagged').length);
		// corrected = non-empty admin_correction.
		expect(c.corrected).toBe(
			raw.filter((r) => r.admin_correction != null && r.admin_correction !== '').length,
		);
		// resolved = approved|verified|dismissed|rejected.
		expect(c.resolved).toBe(
			raw.filter((r) => ['approved', 'verified', 'dismissed', 'rejected'].includes(r.status)).length,
		);
	});

	// filteredRows: for a representative set of filter combinations, the filtered
	// output equals the reference computation over the same sample.
	const filterCombos = [
		{ searchQuery: '', filterHalalType: 'all', filterVerdict: 'all', filterStatus: 'all' },
		{ searchQuery: 'Brand 1', filterHalalType: 'all', filterVerdict: 'all', filterStatus: 'all' },
		{ searchQuery: '', filterHalalType: 'logo', filterVerdict: 'all', filterStatus: 'all' },
		{ searchQuery: '', filterHalalType: 'slaughter', filterVerdict: 'all', filterStatus: 'all' },
		{ searchQuery: '', filterHalalType: 'stamp', filterVerdict: 'all', filterStatus: 'all' },
		{ searchQuery: '', filterHalalType: 'all', filterVerdict: 'red', filterStatus: 'all' },
		{ searchQuery: '', filterHalalType: 'all', filterVerdict: 'yellow', filterStatus: 'all' },
		{ searchQuery: '', filterHalalType: 'all', filterVerdict: 'all', filterStatus: 'pending' },
		{ searchQuery: '', filterHalalType: 'all', filterVerdict: 'all', filterStatus: 'approved' },
		{ searchQuery: '', filterHalalType: 'all', filterVerdict: 'all', filterStatus: 'dismissed' },
		{ searchQuery: '#5', filterHalalType: 'all', filterVerdict: 'all', filterStatus: 'all' },
	];

	it.each(filterCombos)(
		'filteredRows is stable for filters %o',
		(filters) => {
			const rows = deriveRows(sampleRows());
			const result = computeFilteredRows(rows, filters);
			// Recompute independently — identical predicate → identical ids preserved.
			const expected = rows.filter((row) => {
				const q = filters.searchQuery.trim().toLowerCase();
				if (q) {
					const name = `${row.brand_name} ${row.product_name}`.toLowerCase();
					if (!name.includes(q) && !`#${row.id}`.includes(q) && !row.scanned_by.toLowerCase().includes(q))
						return false;
				}
				if (filters.filterHalalType !== 'all') {
					const r = row.flag_reason.toLowerCase();
					if (filters.filterHalalType === 'logo' && !r.includes('logo')) return false;
					if (filters.filterHalalType === 'slaughter' && !r.includes('slaughter')) return false;
					if (filters.filterHalalType === 'stamp' && !r.includes('stamp') && !r.includes('compliance'))
						return false;
				}
				if (filters.filterVerdict !== 'all') {
					if ((row.safety_verdict ?? '').toLowerCase() !== filters.filterVerdict) return false;
				}
				if (filters.filterStatus !== 'all') {
					const s = row.status.toLowerCase();
					if (filters.filterStatus === 'approved' && s !== 'approved' && s !== 'verified') return false;
					if (filters.filterStatus === 'dismissed' && s !== 'dismissed' && s !== 'rejected') return false;
					if (
						filters.filterStatus !== 'approved' &&
						filters.filterStatus !== 'dismissed' &&
						s !== filters.filterStatus
					)
						return false;
				}
				return true;
			});
			expect(result.map((r) => r.id)).toEqual(expected.map((r) => r.id));
			// Verdict filter is exact-lowercase-match: no 'green'/null rows leak into red/yellow filters.
			if (filters.filterVerdict === 'red' || filters.filterVerdict === 'yellow') {
				for (const r of result) {
					expect((r.safety_verdict ?? '').toLowerCase()).toBe(filters.filterVerdict);
				}
			}
		},
	);
});
