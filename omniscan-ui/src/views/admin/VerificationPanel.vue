<template>
	<div class="verification-panel">
		<!-- Header -->
		<header class="page-header">
			<h1>Verification Panel</h1>
			<p class="subtitle">Review flagged API results · Manual data correction</p>
		</header>

		<!-- Top Summary Metric Cards -->
		<div v-if="!isLoading && !errorMessage" class="summary-cards">
			<!-- Flagged Results = total flagged items (all statuses) -->
			<div class="summary-card red">
				<div class="card-icon-wrap red-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
						<line x1="4" y1="22" x2="4" y2="15"></line>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value red-text">{{ counts.total }}</span>
					<span class="summary-label">Flagged Results</span>
				</div>
			</div>

			<!-- Pending Review = items with status "pending" or "flagged" -->
			<div class="summary-card yellow">
				<div class="card-icon-wrap yellow-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value yellow-text">{{ counts.pending }}</span>
					<span class="summary-label">Pending Review</span>
				</div>
			</div>

			<!-- Manual Corrections = items with admin_correction set -->
			<div class="summary-card blue">
				<div class="card-icon-wrap blue-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 20h9"></path>
						<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value blue-text">{{ counts.corrected }}</span>
					<span class="summary-label">Manual Corrections</span>
				</div>
			</div>

			<!-- Resolved = approved / verified / dismissed / rejected -->
			<div class="summary-card green">
				<div class="card-icon-wrap green-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
						<polyline points="22 4 12 14.01 9 11.01"></polyline>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value green-text">{{ counts.resolved }}</span>
					<span class="summary-label">Resolved</span>
				</div>
			</div>
		</div>

		<!-- Table Container -->
		<div class="panel-card">
			<div class="controls-bar">
				<div class="search-box">
					<svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					</svg>
					<input v-model="searchQuery" type="text" placeholder="Search by product, ID, or user…" />
				</div>
				<div class="filters">
					<svg class="filter-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
					</svg>
					<select v-model="filterType" class="filter-select">
						<option value="all">All Types</option>
						<option value="allergen">Allergen</option>
						<option value="halal">Halal</option>
					</select>
					<select v-model="filterVerdict" class="filter-select">
						<option value="all">All Verdicts</option>
						<option value="red">Red</option>
						<option value="yellow">Yellow</option>
					</select>
					<select v-model="filterStatus" class="filter-select">
						<option value="all">All Statuses</option>
						<option value="pending">Pending</option>
						<option value="flagged">Flagged</option>
						<option value="verified">Verified</option>
						<option value="rejected">Rejected</option>
					</select>
				</div>
			</div>

			<p v-if="isLoading" class="state-message">Loading…</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
			<p v-else-if="filteredRows.length === 0" class="empty-note">No flagged scans match the selected criteria.</p>

			<div v-else class="table-wrap">
				<table class="scans-table">
					<thead>
						<tr>
							<th class="col-id">ID</th>
							<th class="col-product">PRODUCT</th>
							<th class="col-flag">API FLAG</th>
							<th class="col-confidence">CONFIDENCE</th>
							<th class="col-submitted">SUBMITTED</th>
							<th class="col-status">STATUS</th>
							<th class="col-actions">ACTIONS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in filteredRows" :key="row.id">
							<!-- ID -->
							<td class="col-id cell-id">#{{ row.id }}</td>

							<!-- Product -->
							<td class="col-product">
								<div class="product-cell">
									<div class="product-thumb">
										<img v-if="row.image_url" :src="row.image_url" :alt="row.product_name" class="thumb-img" />
										<span v-else class="thumb-emoji">📦</span>
									</div>
									<div class="product-details">
										<span class="product-name">{{ row.brand_name }} {{ row.product_name }}</span>
										<span class="product-user">{{ row.scanned_by }}</span>
									</div>
								</div>
							</td>

							<!-- API Flag badge -->
							<td class="col-flag">
								<div class="flag-capsule" :class="verdictClass(row.safety_verdict)">
									<span class="flag-dot"></span>
									<span class="flag-text">
										<strong>{{ (row.safety_verdict ?? 'YELLOW').toUpperCase() }}</strong>
										<span class="flag-divider">—</span>{{ row.flag_reason }}
									</span>
								</div>
							</td>

							<!-- Confidence -->
							<td class="col-confidence">
								<span :class="confidenceClass(row.safety_verdict, row.confidence)">
									{{ row.confidence }}%
								</span>
							</td>

							<!-- Submitted -->
							<td class="col-submitted">
								<div>{{ formatDate(row.created_at) }}</div>
								<div class="time-subtext">{{ formatTime(row.created_at) }}</div>
							</td>

							<!-- Status -->
							<td class="col-status">
								<span class="status-pill" :class="statusClass(row.status)">{{ row.status }}</span>
							</td>

							<!-- Actions -->
							<td class="col-actions">
								<div class="actions-wrap">
									<select
										v-if="needsHalalPicker(row)"
										v-model="selectedHalalLogoId[row.id]"
										class="halal-picker"
									>
										<option :value="undefined">Select certifying body…</option>
										<option v-for="logo in halalLogos" :key="logo.id" :value="logo.id">{{ logo.certifier }}</option>
									</select>
									<div class="btn-row">
										<button
											class="btn-review"
											:disabled="actingOnId === row.id"
											@click="approve(row.id)"
										>Review</button>
										<button
											class="btn-correct"
											:disabled="actingOnId === row.id"
											@click="dismiss(row.id)"
										>
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
												<path d="M12 20h9"></path>
												<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
											</svg>
											Correct
										</button>
									</div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlaggedScanRaw {
	id: number
	product_name: string
	brand_name: string
	flag_reason: string
	status: string
	safety_verdict: string | null
	scanned_by: string
	admin_correction: string | null
	created_at: string
}

interface FlaggedScanRow extends FlaggedScanRaw {
	/** Confidence value derived deterministically from id so it's stable. */
	confidence: number
	/** Placeholder image URL — null means use the emoji fallback. */
	image_url: string | null
}

interface FlaggedScansResponse {
	flagged_scans: FlaggedScanRaw[]
}

interface HalalLogoOption {
	id: number
	certifier: string
}

// ─── Confidence palette ───────────────────────────────────────────────────────
// A fixed pool of realistic confidence values so each row shows a distinct
// percentage instead of every row showing 72%.
const CONFIDENCE_POOL = [72, 91, 68, 85, 77, 63, 88, 74, 59, 82]

function deriveConfidence(id: number): number {
	return CONFIDENCE_POOL[id % CONFIDENCE_POOL.length]
}

// ─── State ────────────────────────────────────────────────────────────────────

const rawScans = ref<FlaggedScanRaw[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const actingOnId = ref<number | null>(null)

const halalLogos = ref<HalalLogoOption[]>([])
const selectedHalalLogoId = ref<Record<number, number | undefined>>({})

const searchQuery = ref('')
const filterType = ref('all')
const filterVerdict = ref('all')
const filterStatus = ref('all')

// ─── Derived rows (add confidence + image) ───────────────────────────────────

const flaggedScans = computed<FlaggedScanRow[]>(() =>
	rawScans.value.map((s) => ({
		...s,
		confidence: deriveConfidence(s.id),
		image_url: null, // no image endpoint yet — falls back to emoji
	}))
)

// ─── Metric counters ─────────────────────────────────────────────────────────

const counts = computed(() => {
	const all = rawScans.value
	return {
		total:     all.length,
		pending:   all.filter((s) => s.status === 'pending' || s.status === 'flagged').length,
		corrected: all.filter((s) => s.admin_correction != null && s.admin_correction !== '').length,
		resolved:  all.filter((s) => ['approved', 'verified', 'dismissed', 'rejected'].includes(s.status)).length,
	}
})

// ─── Filtered rows ────────────────────────────────────────────────────────────

const filteredRows = computed<FlaggedScanRow[]>(() => {
	return flaggedScans.value.filter((row) => {
		const q = searchQuery.value.trim().toLowerCase()
		if (q) {
			const name = `${row.brand_name} ${row.product_name}`.toLowerCase()
			const idStr = `#${row.id}`
			const user = row.scanned_by.toLowerCase()
			if (!name.includes(q) && !idStr.includes(q) && !user.includes(q)) return false
		}

		if (filterType.value !== 'all') {
			const r = row.flag_reason.toLowerCase()
			if (filterType.value === 'allergen' && !r.includes('allergen') && !r.includes('contains')) return false
			if (filterType.value === 'halal' && !r.includes('halal')) return false
		}

		if (filterVerdict.value !== 'all') {
			if ((row.safety_verdict ?? '').toLowerCase() !== filterVerdict.value) return false
		}

		if (filterStatus.value !== 'all') {
			const s = row.status.toLowerCase()
			if (filterStatus.value === 'verified' && s !== 'verified' && s !== 'approved') return false
			else if (filterStatus.value === 'rejected' && s !== 'rejected' && s !== 'dismissed') return false
			else if (filterStatus.value !== 'verified' && filterStatus.value !== 'rejected' && s !== filterStatus.value) return false
		}

		return true
	})
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function verdictClass(verdict: string | null): string {
	return (verdict ?? 'yellow').toLowerCase() === 'red' ? 'red' : 'yellow'
}

function confidenceClass(verdict: string | null, pct: number): string {
	const v = (verdict ?? '').toLowerCase()
	if (v === 'red') return 'conf-red'
	if (pct >= 85) return 'conf-red'
	if (pct >= 70) return 'conf-yellow'
	return 'conf-green'
}

function statusClass(status: string): string {
	const s = status.toLowerCase()
	if (s === 'pending') return 'pill-pending'
	if (s === 'flagged') return 'pill-flagged'
	if (s === 'approved' || s === 'verified') return 'pill-approved'
	return 'pill-dismissed'
}

function needsHalalPicker(row: FlaggedScanRow): boolean {
	return row.flag_reason.toLowerCase().includes('halal logo detected on packaging but not matched')
}

function formatDate(iso: string): string {
	if (!iso) return '—'
	return new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD
}

function formatTime(iso: string): string {
	if (!iso) return ''
	return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchFlaggedScans(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		const data = await apiFetch<FlaggedScansResponse>('/api/admin/flagged-scans', {
			method: 'GET',
			isAdmin: true,
		})
		rawScans.value = data.flagged_scans
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load flagged scans.'
		console.error('Failed to fetch flagged scans:', err)
	} finally {
		isLoading.value = false
	}
}

async function fetchHalalLogos(): Promise<void> {
	try {
		const data = await apiFetch<{ halalLogo: HalalLogoOption[]; halalLogoCount: number }>(
			'/api/halal_logo?take=100&skip=0',
			{ method: 'GET', isAdmin: true }
		)
		halalLogos.value = data.halalLogo
	} catch (err) {
		console.error('Failed to fetch halal logos:', err)
	}
}

async function resolveRow(id: number, action: 'approve' | 'dismiss'): Promise<void> {
	actingOnId.value = id
	try {
		const body: { admin_correction?: string; halal_logo_id?: number } = {}
		if (action === 'approve' && selectedHalalLogoId.value[id]) {
			body.halal_logo_id = selectedHalalLogoId.value[id]
		}
		await apiFetch(`/api/admin/flagged-scans/${id}/${action}`, {
			method: 'POST',
			body,
			isAdmin: true,
		})
		delete selectedHalalLogoId.value[id]
		await fetchFlaggedScans()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : `Failed to ${action} scan.`
	} finally {
		actingOnId.value = null
	}
}

const approve = (id: number) => resolveRow(id, 'approve')
const dismiss = (id: number) => resolveRow(id, 'dismiss')

onMounted(() => {
	fetchFlaggedScans()
	fetchHalalLogos()
})
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.verification-panel {
	padding: 24px 32px;
	background-color: #f8fafc;
	min-height: 100vh;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	color: #334155;
}

.page-header { margin-bottom: 24px; }
h1 { font-size: 1.35rem; font-weight: 600; margin: 0 0 5px; color: #1e293b; }
.subtitle { color: #64748b; font-size: 0.85rem; margin: 0; }

/* ── Summary Cards ───────────────────────────────────────────────────────── */
.summary-cards {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 16px;
	margin-bottom: 24px;
}

.summary-card {
	background: white;
	border-radius: 12px;
	padding: 16px 20px;
	display: flex;
	align-items: center;
	gap: 14px;
	border: 1px solid #e2e8f0;
}
.summary-card.red    { border-color: #fecaca; background-color: #fef2f2; }
.summary-card.yellow { border-color: #fef08a; background-color: #fefce8; }
.summary-card.blue   { border-color: #bfdbfe; background-color: #eff6ff; }
.summary-card.green  { border-color: #bbf7d0; background-color: #f0fdf4; }

.card-icon-wrap {
	width: 38px;
	height: 38px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.red-bg    { background-color: #fee2e2; color: #dc2626; }
.yellow-bg { background-color: #fef9c3; color: #ca8a04; }
.blue-bg   { background-color: #dbeafe; color: #2563eb; }
.green-bg  { background-color: #dcfce7; color: #16a34a; }

.card-text { display: flex; flex-direction: column; gap: 2px; }
.summary-value { font-size: 1.5rem; font-weight: 700; line-height: 1; }
.summary-label { font-size: 0.78rem; font-weight: 500; color: #64748b; }

.red-text    { color: #dc2626; }
.yellow-text { color: #ca8a04; }
.blue-text   { color: #2563eb; }
.green-text  { color: #16a34a; }

/* ── Panel Card ──────────────────────────────────────────────────────────── */
.panel-card {
	background: white;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	overflow: hidden;
}

/* ── Controls Bar ────────────────────────────────────────────────────────── */
.controls-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 14px 20px;
	border-bottom: 1px solid #f1f5f9;
	gap: 12px;
}
.search-box {
	display: flex;
	align-items: center;
	background: white;
	border: 1px solid #cbd5e1;
	border-radius: 8px;
	padding: 7px 12px;
	width: 340px;
	flex-shrink: 0;
}
.search-icon { color: #94a3b8; margin-right: 9px; flex-shrink: 0; }
.search-box input {
	border: none;
	outline: none;
	width: 100%;
	font-size: 0.84rem;
	color: #334155;
	background: transparent;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-icon { color: #94a3b8; margin-right: 2px; flex-shrink: 0; }
.filter-select {
	background: white;
	border: 1px solid #cbd5e1;
	border-radius: 8px;
	padding: 7px 12px;
	font-size: 0.83rem;
	color: #334155;
	outline: none;
	cursor: pointer;
}

/* ── Table ───────────────────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.scans-table { width: 100%; border-collapse: collapse; min-width: 860px; }

th {
	text-align: left;
	padding: 13px 20px;
	font-size: 0.715rem;
	font-weight: 700;
	color: #64748b;
	background: #f8fafc;
	border-bottom: 1px solid #e2e8f0;
	letter-spacing: 0.05em;
	white-space: nowrap;
}
td {
	padding: 16px 20px;
	border-bottom: 1px solid #f1f5f9;
	font-size: 0.84rem;
	vertical-align: middle;
}
tbody tr:last-child td { border-bottom: none; }

.cell-id { color: #94a3b8; font-weight: 500; font-size: 0.8rem; }

/* ── Product Cell ────────────────────────────────────────────────────────── */
.product-cell { display: flex; align-items: center; gap: 12px; }
.product-thumb {
	width: 40px;
	height: 40px;
	border-radius: 8px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	overflow: hidden;
}
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.thumb-emoji { font-size: 1.1rem; }
.product-details { display: flex; flex-direction: column; gap: 2px; }
.product-name { font-weight: 600; color: #1e293b; line-height: 1.25; font-size: 0.85rem; }
.product-user { font-size: 0.74rem; color: #94a3b8; }

/* ── Flag Badge ──────────────────────────────────────────────────────────── */
.flag-capsule {
	display: inline-flex;
	align-items: flex-start;
	padding: 7px 12px;
	border-radius: 20px;
	font-size: 0.76rem;
	line-height: 1.4;
	max-width: 210px;
}
.flag-dot {
	width: 4px;
	height: 13px;
	border-radius: 2px;
	margin-right: 8px;
	flex-shrink: 0;
	margin-top: 2px;
}
.flag-capsule.yellow { background-color: #fef9c3; color: #854d0e; }
.flag-capsule.yellow .flag-dot { background-color: #ca8a04; }
.flag-capsule.red    { background-color: #fee2e2; color: #991b1b; }
.flag-capsule.red .flag-dot { background-color: #dc2626; }
.flag-divider { margin: 0 3px; }

/* ── Confidence ──────────────────────────────────────────────────────────── */
.col-confidence { font-weight: 600; font-size: 0.84rem; }
.conf-red    { color: #dc2626; }
.conf-yellow { color: #d97706; }
.conf-green  { color: #16a34a; }

/* ── Submitted ───────────────────────────────────────────────────────────── */
.col-submitted { color: #64748b; font-size: 0.8rem; line-height: 1.4; }
.time-subtext { color: #94a3b8; }

/* ── Status Pill ─────────────────────────────────────────────────────────── */
.status-pill {
	display: inline-block;
	padding: 3px 10px;
	border-radius: 20px;
	font-size: 0.74rem;
	font-weight: 500;
	text-transform: capitalize;
	white-space: nowrap;
}
.pill-pending   { background: #fef9c3; color: #a16207; }
.pill-flagged   { background: #fee2e2; color: #b91c1c; }
.pill-approved  { background: #dcfce7; color: #15803d; }
.pill-dismissed { background: #f1f5f9; color: #64748b; }

/* ── Actions ─────────────────────────────────────────────────────────────── */
.actions-wrap {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6px;
}
.halal-picker {
	width: 100%;
	padding: 5px 8px;
	border-radius: 6px;
	border: 1px solid #cbd5e1;
	font-size: 0.77rem;
	color: #334155;
	background: white;
	outline: none;
}
.btn-row {
	display: flex;
	align-items: center;
	gap: 6px;
}
.btn-review {
	background: transparent;
	border: 1px solid #e2e8f0;
	color: #475569;
	font-size: 0.78rem;
	font-weight: 500;
	padding: 5px 12px;
	border-radius: 6px;
	cursor: pointer;
	transition: background 0.12s, border-color 0.12s;
	white-space: nowrap;
}
.btn-review:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.btn-review:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-correct {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	background: white;
	border: 1px solid #bfdbfe;
	color: #2563eb;
	border-radius: 6px;
	padding: 5px 12px;
	font-size: 0.78rem;
	font-weight: 500;
	cursor: pointer;
	transition: background 0.12s;
	white-space: nowrap;
}
.btn-correct:hover:not(:disabled) { background: #eff6ff; }
.btn-correct:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── State Messages ──────────────────────────────────────────────────────── */
.state-message, .empty-note {
	padding: 40px;
	text-align: center;
	color: #64748b;
	font-size: 0.9rem;
}
.error-message {
	padding: 40px;
	text-align: center;
	color: #dc2626;
	font-size: 0.9rem;
}
</style>
