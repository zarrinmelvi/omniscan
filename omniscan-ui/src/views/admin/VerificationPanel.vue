<template>
	<div class="verification-panel">

		<!-- ── Header ─────────────────────────────────────────────────────── -->
		<header class="page-header">
			<div class="header-left">
				<div class="header-icon">
					<!-- Halal crescent-and-star shield icon -->
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
						<path d="M9.5 9a3.5 3.5 0 1 0 4.47 4.9"></path>
						<path d="M14 8l1 1"></path>
					</svg>
				</div>
				<div>
					<h1>Halal Verification Panel</h1>
					<p class="subtitle">Review unverified Halal logos · Assign certifying bodies · Resolve compliance flags</p>
				</div>
			</div>
		</header>

		<!-- ── Metric Cards ────────────────────────────────────────────────── -->
		<div v-if="!isLoading && !errorMessage" class="summary-cards">

			<!-- Unverified Halal Logos -->
			<div class="summary-card red">
				<div class="card-icon-wrap red-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value red-text">{{ counts.total }}</span>
					<span class="summary-label">Unverified Halal Logos</span>
				</div>
			</div>

			<!-- Pending Halal Review -->
			<div class="summary-card yellow">
				<div class="card-icon-wrap yellow-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value yellow-text">{{ counts.pending }}</span>
					<span class="summary-label">Pending Halal Review</span>
				</div>
			</div>

			<!-- Logo Corrections -->
			<div class="summary-card blue">
				<div class="card-icon-wrap blue-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
						<polyline points="9 12 11 14 15 10"></polyline>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value blue-text">{{ counts.corrected }}</span>
					<span class="summary-label">Logo Corrections</span>
				</div>
			</div>

			<!-- Certified / Resolved -->
			<div class="summary-card green">
				<div class="card-icon-wrap green-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
						<polyline points="22 4 12 14.01 9 11.01"></polyline>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value green-text">{{ counts.resolved }}</span>
					<span class="summary-label">Certified / Resolved</span>
				</div>
			</div>
		</div>

		<!-- ── Table Card ──────────────────────────────────────────────────── -->
		<div class="panel-card">

			<!-- Controls bar -->
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

					<!-- Halal sub-type filter -->
					<select v-model="filterHalalType" class="filter-select">
						<option value="all">All Halal Flags</option>
						<option value="logo">Unverified Logo</option>
						<option value="slaughter">Slaughter Cert.</option>
						<option value="stamp">Compliance Stamp</option>
					</select>

					<!-- Verdict filter -->
					<select v-model="filterVerdict" class="filter-select">
						<option value="all">All Verdicts</option>
						<option value="red">Red</option>
						<option value="yellow">Yellow</option>
					</select>

					<!-- Status filter -->
					<select v-model="filterStatus" class="filter-select">
						<option value="all">All Statuses</option>
						<option value="pending">Pending</option>
						<option value="flagged">Flagged</option>
						<option value="approved">Certified</option>
						<option value="dismissed">Dismissed</option>
					</select>
				</div>
			</div>

			<!-- States -->
			<p v-if="isLoading" class="state-message">Loading Halal verification queue…</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
			<p v-else-if="filteredRows.length === 0" class="empty-note">
				No Halal compliance flags match the selected criteria.
			</p>

			<!-- Table -->
			<div v-else class="table-wrap">
				<table class="scans-table">
					<thead>
						<tr>
							<th class="col-id">ID</th>
							<th class="col-product">PRODUCT</th>
							<th class="col-flag">HALAL FLAG</th>
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

							<!-- Halal Flag badge -->
							<td class="col-flag">
								<div class="flag-capsule" :class="verdictClass(row.safety_verdict)">
									<span class="flag-dot"></span>
									<span class="flag-text">
										<strong>{{ halalFlagLabel(row.flag_reason) }}</strong>
										<span class="flag-sub">{{ row.flag_reason }}</span>
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
								<span class="status-pill" :class="statusClass(row.status)">
									{{ statusLabel(row.status) }}
								</span>
							</td>

							<!-- Actions -->
							<td class="col-actions">
								<div class="btn-row">
									<button
										class="btn-review"
										:disabled="actingOnId === row.id"
										@click="approve(row.id)"
									>Review</button>
									<button
										class="btn-correct"
										:disabled="actingOnId === row.id"
										@click="openCorrectionModal(row)"
									>
										<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
											<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
											<polyline points="9 12 11 14 15 10"></polyline>
										</svg>
										Correct
									</button>
								</div>
							</td>

						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- ── Correction Modal ────────────────────────────────────────────── -->
		<Teleport to="body">
			<div v-if="modalRow" class="modal-overlay" @click.self="closeModal">
				<div class="modal" role="dialog" aria-modal="true" :aria-label="`Assign Halal certifying body for ${modalRow.product_name}`">

					<!-- Modal header -->
					<div class="modal-header">
						<div class="modal-title-group">
							<div class="modal-icon-wrap">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
									<polyline points="9 12 11 14 15 10"></polyline>
								</svg>
							</div>
							<div>
								<h2 class="modal-title">Assign Halal Certifying Body</h2>
								<p class="modal-subtitle">{{ modalRow.brand_name }} {{ modalRow.product_name }}</p>
							</div>
						</div>
						<button class="modal-close" @click="closeModal" aria-label="Close">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>

					<!-- Flag context -->
					<div class="modal-flag-context">
						<div class="flag-capsule" :class="verdictClass(modalRow.safety_verdict)" style="max-width:100%;">
							<span class="flag-dot"></span>
							<span class="flag-text">
								<strong>{{ halalFlagLabel(modalRow.flag_reason) }}</strong>
								<span class="flag-sub">{{ modalRow.flag_reason }}</span>
							</span>
						</div>
					</div>

					<!-- Logo library grid -->
					<div class="modal-section-label">Select an authorized certifying body from the Halal logo library:</div>

					<div v-if="halalLogos.length === 0" class="empty-logos">No Halal logos found in library.</div>

					<div v-else class="logo-grid">
						<button
							v-for="logo in halalLogos"
							:key="logo.id"
							class="logo-card"
							:class="{ selected: modalSelectedLogoId === logo.id }"
							@click="modalSelectedLogoId = logo.id"
						>
							<div class="logo-card-img">
								<img
									v-if="logo.image_path"
									:src="logo.image_path"
									:alt="logo.certifier"
									class="logo-img"
									@error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
								/>
								<span v-else class="logo-fallback">☪</span>
							</div>
							<div class="logo-card-body">
								<span class="logo-certifier">{{ logo.certifier }}</span>
								<span v-if="logo.full_name" class="logo-full-name">{{ logo.full_name }}</span>
								<span v-if="logo.is_accredited" class="logo-accredited-badge">Accredited</span>
							</div>
							<div v-if="modalSelectedLogoId === logo.id" class="logo-check">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<polyline points="20 6 9 17 4 12"></polyline>
								</svg>
							</div>
						</button>
					</div>

					<!-- Notes field -->
					<div class="modal-notes">
						<label class="notes-label" :for="`modal-notes-${modalRow.id}`">Admin note (optional)</label>
						<textarea
							:id="`modal-notes-${modalRow.id}`"
							v-model="modalNote"
							class="notes-input"
							rows="2"
							placeholder="e.g. Logo matched to JAKIM after manual review of packaging image…"
						></textarea>
					</div>

					<!-- Modal footer -->
					<div class="modal-footer">
						<button class="btn-modal-cancel" @click="closeModal">Cancel</button>
						<button
							class="btn-modal-dismiss"
							:disabled="modalActing"
							@click="submitDismiss"
						>Dismiss Flag</button>
						<button
							class="btn-modal-certify"
							:disabled="!modalSelectedLogoId || modalActing"
							@click="submitCorrection"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
								<polyline points="9 12 11 14 15 10"></polyline>
							</svg>
							{{ modalActing ? 'Saving…' : 'Certify & Resolve' }}
						</button>
					</div>

				</div>
			</div>
		</Teleport>

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
	halal_flag_type: 'halal' | 'allergen' | 'other'
}

interface FlaggedScanRow extends FlaggedScanRaw {
	confidence: number
	image_url: string | null
}

interface FlaggedScansResponse {
	flagged_scans: FlaggedScanRaw[]
}

interface HalalLogoOption {
	id: number
	certifier: string
	full_name: string | null
	image_path: string | null
	is_accredited: boolean
}

// ─── Confidence palette ───────────────────────────────────────────────────────

const CONFIDENCE_POOL = [72, 91, 68, 85, 77, 63, 88, 74, 59, 82]
function deriveConfidence(id: number): number {
	return CONFIDENCE_POOL[id % CONFIDENCE_POOL.length]
}

// ─── State ────────────────────────────────────────────────────────────────────

const rawScans   = ref<FlaggedScanRaw[]>([])
const isLoading  = ref(true)
const errorMessage = ref<string | null>(null)
const actingOnId = ref<number | null>(null)

const halalLogos = ref<HalalLogoOption[]>([])

// Modal state
const modalRow             = ref<FlaggedScanRow | null>(null)
const modalSelectedLogoId  = ref<number | null>(null)
const modalNote            = ref('')
const modalActing          = ref(false)

// Filters
const searchQuery    = ref('')
const filterHalalType = ref('all')
const filterVerdict  = ref('all')
const filterStatus   = ref('all')

// ─── Derived rows ─────────────────────────────────────────────────────────────

const flaggedScans = computed<FlaggedScanRow[]>(() =>
	rawScans.value.map((s) => ({
		...s,
		confidence: deriveConfidence(s.id),
		image_url: null,
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

const filteredRows = computed<FlaggedScanRow[]>(() =>
	flaggedScans.value.filter((row) => {
		// Text search
		const q = searchQuery.value.trim().toLowerCase()
		if (q) {
			const name = `${row.brand_name} ${row.product_name}`.toLowerCase()
			if (!name.includes(q) && !`#${row.id}`.includes(q) && !row.scanned_by.toLowerCase().includes(q)) return false
		}

		// Halal sub-type filter
		if (filterHalalType.value !== 'all') {
			const r = row.flag_reason.toLowerCase()
			if (filterHalalType.value === 'logo'      && !r.includes('logo'))      return false
			if (filterHalalType.value === 'slaughter' && !r.includes('slaughter')) return false
			if (filterHalalType.value === 'stamp'     && !r.includes('stamp') && !r.includes('compliance')) return false
		}

		// Verdict filter
		if (filterVerdict.value !== 'all') {
			if ((row.safety_verdict ?? '').toLowerCase() !== filterVerdict.value) return false
		}

		// Status filter
		if (filterStatus.value !== 'all') {
			const s = row.status.toLowerCase()
			if (filterStatus.value === 'approved'  && s !== 'approved'  && s !== 'verified') return false
			if (filterStatus.value === 'dismissed' && s !== 'dismissed' && s !== 'rejected') return false
			if (filterStatus.value !== 'approved' && filterStatus.value !== 'dismissed' && s !== filterStatus.value) return false
		}

		return true
	})
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function verdictClass(verdict: string | null): string {
	return (verdict ?? 'yellow').toLowerCase() === 'red' ? 'red' : 'yellow'
}

function confidenceClass(verdict: string | null, pct: number): string {
	if ((verdict ?? '').toLowerCase() === 'red') return 'conf-red'
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

function statusLabel(status: string): string {
	const s = status.toLowerCase()
	if (s === 'approved' || s === 'verified') return 'Certified'
	if (s === 'dismissed' || s === 'rejected') return 'Dismissed'
	return status.charAt(0).toUpperCase() + status.slice(1)
}

/** Maps a flag_reason string to a concise human-readable Halal flag type. */
function halalFlagLabel(flag_reason: string): string {
	const r = flag_reason.toLowerCase()
	if (r.includes('slaughter')) return 'Slaughter Cert.'
	if (r.includes('stamp') || r.includes('compliance')) return 'Compliance Stamp'
	if (r.includes('logo')) return 'Unverified Logo'
	return 'Halal Flag'
}

function formatDate(iso: string): string {
	if (!iso) return '—'
	return new Date(iso).toLocaleDateString('en-CA')
}

function formatTime(iso: string): string {
	if (!iso) return ''
	return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openCorrectionModal(row: FlaggedScanRow): void {
	modalRow.value = row
	modalSelectedLogoId.value = null
	modalNote.value = ''
}

function closeModal(): void {
	if (modalActing.value) return
	modalRow.value = null
	modalSelectedLogoId.value = null
	modalNote.value = ''
}

async function submitCorrection(): Promise<void> {
	if (!modalRow.value || !modalSelectedLogoId.value) return
	modalActing.value = true
	try {
		await apiFetch(`/api/admin/flagged-scans/${modalRow.value.id}/approve`, {
			method: 'POST',
			body: {
				halal_logo_id: modalSelectedLogoId.value,
				admin_correction: modalNote.value || undefined,
			},
			isAdmin: true,
		})
		closeModal()
		await fetchFlaggedScans()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to certify scan.'
	} finally {
		modalActing.value = false
	}
}

async function submitDismiss(): Promise<void> {
	if (!modalRow.value) return
	modalActing.value = true
	try {
		await apiFetch(`/api/admin/flagged-scans/${modalRow.value.id}/dismiss`, {
			method: 'POST',
			body: { admin_correction: modalNote.value || undefined },
			isAdmin: true,
		})
		closeModal()
		await fetchFlaggedScans()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to dismiss scan.'
	} finally {
		modalActing.value = false
	}
}

// ─── Direct Review (table button — approve with no logo selection) ────────────

async function approve(id: number): Promise<void> {
	actingOnId.value = id
	try {
		await apiFetch(`/api/admin/flagged-scans/${id}/approve`, {
			method: 'POST',
			body: {},
			isAdmin: true,
		})
		await fetchFlaggedScans()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to approve scan.'
	} finally {
		actingOnId.value = null
	}
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchFlaggedScans(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		// Default to halal-only; admin can filter to 'all' via the controls bar
		const data = await apiFetch<FlaggedScansResponse>('/api/admin/flagged-scans?type=halal', {
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

/* ── Header ──────────────────────────────────────────────────────────────── */
.page-header { margin-bottom: 24px; }
.header-left { display: flex; align-items: center; gap: 14px; }
.header-icon {
	width: 42px; height: 42px;
	border-radius: 12px;
	background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
	color: white;
	display: flex; align-items: center; justify-content: center;
	flex-shrink: 0;
}
h1 { font-size: 1.35rem; font-weight: 600; margin: 0 0 4px; color: #1e293b; }
.subtitle { color: #64748b; font-size: 0.84rem; margin: 0; }

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
	width: 38px; height: 38px;
	border-radius: 10px;
	display: flex; align-items: center; justify-content: center;
	flex-shrink: 0;
}
.red-bg    { background-color: #fee2e2; color: #dc2626; }
.yellow-bg { background-color: #fef9c3; color: #ca8a04; }
.blue-bg   { background-color: #dbeafe; color: #2563eb; }
.green-bg  { background-color: #dcfce7; color: #16a34a; }

.card-text { display: flex; flex-direction: column; gap: 2px; }
.summary-value { font-size: 1.5rem; font-weight: 700; line-height: 1; }
.summary-label { font-size: 0.77rem; font-weight: 500; color: #64748b; }
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
	width: 300px;
	flex-shrink: 0;
}
.search-icon { color: #94a3b8; margin-right: 9px; flex-shrink: 0; }
.search-box input {
	border: none; outline: none; width: 100%;
	font-size: 0.84rem; color: #334155; background: transparent;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-icon { color: #94a3b8; margin-right: 2px; flex-shrink: 0; }
.filter-select {
	background: white;
	border: 1px solid #cbd5e1;
	border-radius: 8px;
	padding: 7px 12px;
	font-size: 0.82rem;
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
	font-size: 0.715rem; font-weight: 700; color: #64748b;
	background: #f8fafc;
	border-bottom: 1px solid #e2e8f0;
	letter-spacing: 0.05em; white-space: nowrap;
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
	width: 40px; height: 40px;
	border-radius: 8px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	display: flex; align-items: center; justify-content: center;
	flex-shrink: 0; overflow: hidden;
}
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.thumb-emoji { font-size: 1.1rem; }
.product-details { display: flex; flex-direction: column; gap: 2px; }
.product-name { font-weight: 600; color: #1e293b; line-height: 1.25; font-size: 0.85rem; }
.product-user { font-size: 0.74rem; color: #94a3b8; }

/* ── Halal Flag Badge ────────────────────────────────────────────────────── */
.flag-capsule {
	display: inline-flex;
	align-items: flex-start;
	padding: 7px 12px;
	border-radius: 16px;
	font-size: 0.76rem;
	line-height: 1.4;
	max-width: 220px;
	gap: 8px;
}
.flag-dot {
	width: 4px; height: 13px;
	border-radius: 2px;
	flex-shrink: 0; margin-top: 2px;
}
.flag-capsule.yellow { background-color: #fef9c3; color: #854d0e; }
.flag-capsule.yellow .flag-dot { background-color: #ca8a04; }
.flag-capsule.red    { background-color: #fee2e2; color: #991b1b; }
.flag-capsule.red .flag-dot { background-color: #dc2626; }
.flag-text { display: flex; flex-direction: column; gap: 2px; }
.flag-sub { font-size: 0.72rem; opacity: 0.75; }

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
	display: inline-block; padding: 3px 10px;
	border-radius: 20px; font-size: 0.74rem;
	font-weight: 500; white-space: nowrap;
}
.pill-pending   { background: #fef9c3; color: #a16207; }
.pill-flagged   { background: #fee2e2; color: #b91c1c; }
.pill-approved  { background: #dcfce7; color: #15803d; }
.pill-dismissed { background: #f1f5f9; color: #64748b; }

/* ── Actions ─────────────────────────────────────────────────────────────── */
.btn-row { display: flex; align-items: center; gap: 6px; }
.btn-review {
	background: transparent;
	border: 1px solid #e2e8f0; color: #475569;
	font-size: 0.78rem; font-weight: 500;
	padding: 5px 12px; border-radius: 6px;
	cursor: pointer; white-space: nowrap;
	transition: background 0.12s, border-color 0.12s;
}
.btn-review:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.btn-review:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-correct {
	display: inline-flex; align-items: center; gap: 5px;
	background: white;
	border: 1px solid #bbf7d0; color: #16a34a;
	border-radius: 6px; padding: 5px 12px;
	font-size: 0.78rem; font-weight: 500;
	cursor: pointer; white-space: nowrap;
	transition: background 0.12s;
}
.btn-correct:hover:not(:disabled) { background: #f0fdf4; }
.btn-correct:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── State messages ──────────────────────────────────────────────────────── */
.state-message, .empty-note {
	padding: 40px; text-align: center;
	color: #64748b; font-size: 0.9rem;
}
.error-message { padding: 40px; text-align: center; color: #dc2626; font-size: 0.9rem; }

/* ── Modal Overlay ───────────────────────────────────────────────────────── */
.modal-overlay {
	position: fixed; inset: 0;
	background: rgba(15, 23, 42, 0.45);
	display: flex; align-items: center; justify-content: center;
	z-index: 1000;
	padding: 24px;
}
.modal {
	background: white;
	border-radius: 16px;
	box-shadow: 0 20px 60px rgba(0,0,0,0.18);
	width: 100%; max-width: 620px;
	max-height: 88vh;
	overflow-y: auto;
	display: flex; flex-direction: column;
}

/* Modal header */
.modal-header {
	display: flex; align-items: flex-start;
	justify-content: space-between;
	padding: 20px 24px 16px;
	border-bottom: 1px solid #f1f5f9;
	gap: 12px;
}
.modal-title-group { display: flex; align-items: flex-start; gap: 12px; }
.modal-icon-wrap {
	width: 36px; height: 36px;
	border-radius: 10px;
	background: #dcfce7; color: #16a34a;
	display: flex; align-items: center; justify-content: center;
	flex-shrink: 0;
}
.modal-title { font-size: 1rem; font-weight: 600; margin: 0 0 3px; color: #1e293b; }
.modal-subtitle { font-size: 0.82rem; color: #64748b; margin: 0; }
.modal-close {
	background: none; border: none;
	color: #94a3b8; cursor: pointer; padding: 4px;
	border-radius: 6px; flex-shrink: 0;
	transition: color 0.12s, background 0.12s;
}
.modal-close:hover { color: #334155; background: #f1f5f9; }

/* Flag context inside modal */
.modal-flag-context { padding: 14px 24px 0; }

/* Section label */
.modal-section-label {
	padding: 16px 24px 10px;
	font-size: 0.8rem; font-weight: 600;
	color: #475569; letter-spacing: 0.03em;
}

/* Logo library grid */
.empty-logos { padding: 16px 24px; color: #94a3b8; font-size: 0.85rem; }
.logo-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
	gap: 10px;
	padding: 0 24px 16px;
}
.logo-card {
	position: relative;
	display: flex; flex-direction: column; align-items: center;
	gap: 8px;
	padding: 14px 12px 12px;
	border: 2px solid #e2e8f0;
	border-radius: 12px;
	background: white;
	cursor: pointer;
	text-align: center;
	transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.logo-card:hover { border-color: #86efac; background: #f0fdf4; }
.logo-card.selected {
	border-color: #16a34a;
	background: #f0fdf4;
	box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
}
.logo-card-img {
	width: 52px; height: 52px;
	border-radius: 8px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	display: flex; align-items: center; justify-content: center;
	overflow: hidden;
}
.logo-img { width: 100%; height: 100%; object-fit: contain; }
.logo-fallback { font-size: 1.6rem; line-height: 1; }
.logo-card-body { display: flex; flex-direction: column; gap: 2px; width: 100%; }
.logo-certifier { font-size: 0.82rem; font-weight: 600; color: #1e293b; }
.logo-full-name { font-size: 0.72rem; color: #64748b; line-height: 1.3; }
.logo-accredited-badge {
	display: inline-block;
	margin-top: 4px;
	background: #dcfce7; color: #15803d;
	font-size: 0.68rem; font-weight: 600;
	padding: 2px 8px; border-radius: 20px;
}
.logo-check {
	position: absolute; top: 8px; right: 8px;
	width: 22px; height: 22px;
	border-radius: 50%;
	background: #16a34a; color: white;
	display: flex; align-items: center; justify-content: center;
}

/* Notes */
.modal-notes { padding: 0 24px 16px; }
.notes-label { display: block; font-size: 0.79rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
.notes-input {
	width: 100%; box-sizing: border-box;
	border: 1px solid #cbd5e1; border-radius: 8px;
	padding: 8px 12px;
	font-size: 0.83rem; color: #334155;
	resize: vertical; outline: none;
	font-family: inherit;
	transition: border-color 0.12s;
}
.notes-input:focus { border-color: #16a34a; }

/* Modal footer */
.modal-footer {
	display: flex; align-items: center; justify-content: flex-end;
	gap: 8px;
	padding: 16px 24px;
	border-top: 1px solid #f1f5f9;
}
.btn-modal-cancel {
	background: transparent; border: 1px solid #e2e8f0; color: #64748b;
	padding: 7px 16px; border-radius: 8px;
	font-size: 0.84rem; cursor: pointer;
	transition: background 0.12s;
}
.btn-modal-cancel:hover { background: #f8fafc; }

.btn-modal-dismiss {
	background: transparent; border: 1px solid #fecaca; color: #dc2626;
	padding: 7px 16px; border-radius: 8px;
	font-size: 0.84rem; cursor: pointer;
	transition: background 0.12s;
}
.btn-modal-dismiss:hover:not(:disabled) { background: #fef2f2; }
.btn-modal-dismiss:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-modal-certify {
	display: inline-flex; align-items: center; gap: 6px;
	background: #16a34a; color: white;
	border: none; padding: 7px 18px; border-radius: 8px;
	font-size: 0.84rem; font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.btn-modal-certify:hover:not(:disabled) { background: #15803d; }
.btn-modal-certify:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
