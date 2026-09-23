<template>
	<div class="verification-panel">
		<!-- Header -->
		<header class="page-header">
			<h1>Verification Panel</h1>
			<p class="subtitle">
				Review flagged API results · Manual data correction
			</p>
		</header>

		<!-- Top Summary Metric Cards -->
		<div v-if="!isLoading && !errorMessage" class="summary-cards">
			<div class="summary-card red">
				<svg class="card-icon red-text" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
					<line x1="4" y1="22" x2="4" y2="15"></line>
				</svg>
				<div class="card-text">
					<span class="summary-value red-text">{{ counts.pending }}</span>
					<span class="summary-label red-text">Flagged Results</span>
				</div>
			</div>

			<div class="summary-card yellow">
				<svg class="card-icon yellow-text" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<polyline points="12 6 12 12 16 14"></polyline>
				</svg>
				<div class="card-text">
					<span class="summary-value yellow-text">{{ counts.pending }}</span>
					<span class="summary-label yellow-text">Pending Review</span>
				</div>
			</div>

			<div class="summary-card blue">
				<svg class="card-icon blue-text" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 20h9"></path>
					<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
				</svg>
				<div class="card-text">
					<span class="summary-value blue-text">0</span>
					<span class="summary-label blue-text">Manual Corrections</span>
				</div>
			</div>

			<div class="summary-card green">
				<svg class="card-icon green-text" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
					<polyline points="22 4 12 14.01 9 11.01"></polyline>
				</svg>
				<div class="card-text">
					<span class="summary-value green-text">{{ counts.approved }}</span>
					<span class="summary-label green-text">Resolved</span>
				</div>
			</div>
		</div>

		<!-- Table Container with Functional Filters & Search -->
		<div class="panel-card">
			<div class="controls-bar">
				<div class="search-box">
					<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					</svg>
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Search by product, ID, or user..."
					/>
				</div>
				<div class="filters">
					<svg class="filter-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
					</svg>

					<!-- Filter 1: Type -->
					<select v-model="filterType" class="filter-select">
						<option value="all">All</option>
						<option value="allergen">Allergen</option>
						<option value="halal">Halal</option>
					</select>

					<!-- Filter 2: Verdict -->
					<select v-model="filterVerdict" class="filter-select">
						<option value="all">All</option>
						<option value="red">Red</option>
						<option value="yellow">Yellow</option>
					</select>

					<!-- Filter 3: Status -->
					<select v-model="filterStatus" class="filter-select">
						<option value="all">All</option>
						<option value="pending">Pending</option>
						<option value="flagged">Flagged</option>
						<option value="verified">Verified</option>
						<option value="rejected">Rejected</option>
					</select>
				</div>
			</div>

			<!-- Loading / Error / Empty States -->
			<p v-if="isLoading" class="state-message">Loading…</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
			<p v-else-if="filteredScans.length === 0" class="empty-note">
				No flagged scans match the selected criteria.
			</p>

			<!-- Main Data Table -->
			<table v-else class="scans-table">
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
					<tr v-for="scan in filteredScans" :key="scan.id">
						<td class="col-id cell-id">#{{ scan.id }}</td>
						<td class="col-product">
							<div class="product-cell">
								<div class="product-image-placeholder">📦</div>
								<div class="product-details">
									<span class="product-name">{{ scan.brand_name }} {{ scan.product_name }}</span>
									<span class="product-user">{{ scan.scanned_by }}</span>
								</div>
							</div>
						</td>
						<td class="col-flag">
							<div class="flag-capsule" :class="(scan.safety_verdict ?? 'yellow').toLowerCase()">
								<span class="flag-dot"></span>
								<span class="flag-text">
									<strong>{{ scan.safety_verdict?.toUpperCase() || 'YELLOW' }}</strong>
									<span class="flag-divider">—</span>
									{{ scan.flag_reason }}
								</span>
							</div>
						</td>
						<td class="col-confidence" :class="getConfidenceClass(scan.safety_verdict)">
							72%
						</td>
						<td class="col-submitted">
							<div>2026-03-27</div>
							<div class="time-subtext">08:12</div>
						</td>
						<td class="col-status">
							<span class="status-pill" :class="scan.status">{{ scan.status }}</span>
						</td>
						<td class="col-actions">
							<!-- Stacked Actions Container -->
							<div class="actions-wrapper">
								<select v-if="needsHalalPicker(scan)" v-model="selectedHalalLogoId[scan.id]" class="halal-picker">
									<option :value="undefined">Select certifying body…</option>
									<option v-for="logo in halalLogos" :key="logo.id" :value="logo.id">{{ logo.certifier }}</option>
								</select>

								<div class="button-row">
									<button class="btn-review" :disabled="actingOnId === scan.id" @click="approve(scan.id)">
										[Review]
									</button>
									<button class="btn-correct" :disabled="actingOnId === scan.id" @click="dismiss(scan.id)">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

interface FlaggedScanRow {
	id: number
	product_name: string
	brand_name: string
	flag_reason: string
	status: string
	safety_verdict: string | null
	scanned_by: string
}

interface FlaggedScansResponse {
	flagged_scans: FlaggedScanRow[]
}

interface HalalLogoOption {
	id: number
	certifier: string
}

const flaggedScans = ref<FlaggedScanRow[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const actingOnId = ref<number | null>(null)

const halalLogos = ref<HalalLogoOption[]>([])
const selectedHalalLogoId = ref<Record<number, number | undefined>>({})

// Filter State Variables
const searchQuery = ref('')
const filterType = ref('all')
const filterVerdict = ref('all')
const filterStatus = ref('all')

function needsHalalPicker(scan: FlaggedScanRow): boolean {
	return scan.flag_reason.includes('Halal logo detected on packaging but not matched')
}

function getConfidenceClass(verdict: string | null): string {
	const lower = (verdict ?? '').toLowerCase()
	if (lower === 'red') return 'text-red'
	if (lower === 'yellow') return 'text-yellow'
	return 'text-green'
}

const filteredScans = computed(() => {
	return flaggedScans.value.filter((scan) => {
		const query = searchQuery.value.trim().toLowerCase()
		if (query) {
			const fullName = `${scan.brand_name} ${scan.product_name}`.toLowerCase()
			const idMatch = scan.id.toString().includes(query) || `#${scan.id}`.includes(query)
			const userMatch = scan.scanned_by.toLowerCase().includes(query)

			if (!fullName.includes(query) && !idMatch && !userMatch) {
				return false
			}
		}

		if (filterType.value !== 'all') {
			const reasonLower = scan.flag_reason.toLowerCase()
			if (filterType.value === 'allergen' && !reasonLower.includes('allergen') && !reasonLower.includes('contains')) {
				return false
			}
			if (filterType.value === 'halal' && !reasonLower.includes('halal')) {
				return false
			}
		}

		if (filterVerdict.value !== 'all') {
			const verdictLower = (scan.safety_verdict ?? '').toLowerCase()
			if (verdictLower !== filterVerdict.value) {
				return false
			}
		}

		if (filterStatus.value !== 'all') {
			const statusLower = scan.status.toLowerCase()
			if (filterStatus.value === 'verified' && statusLower !== 'verified' && statusLower !== 'approved') {
				return false
			} else if (filterStatus.value === 'rejected' && statusLower !== 'rejected' && statusLower !== 'dismissed') {
				return false
			} else if (filterStatus.value !== 'verified' && filterStatus.value !== 'rejected' && statusLower !== filterStatus.value) {
				return false
			}
		}

		return true
	})
})

const counts = computed(() => ({
	pending: flaggedScans.value.filter((s) => s.status === 'pending').length,
	approved: flaggedScans.value.filter((s) => s.status === 'approved' || s.status === 'verified').length,
	dismissed: flaggedScans.value.filter((s) => s.status === 'dismissed' || s.status === 'rejected').length,
}))

async function fetchFlaggedScans(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null

	try {
		const data = await apiFetch<FlaggedScansResponse>('/api/admin/flagged-scans', {
			method: 'GET',
			isAdmin: true,
		})
		flaggedScans.value = data.flagged_scans
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load flagged scans.'
		console.error('Failed to fetch flagged scans:', err)
	} finally {
		isLoading.value = false
	}
}

async function fetchHalalLogos(): Promise<void> {
	try {
		const data = await apiFetch<{ halalLogo: HalalLogoOption[]; halalLogoCount: number }>('/api/halal_logo?take=100&skip=0', {
			method: 'GET',
			isAdmin: true,
		})
		halalLogos.value = data.halalLogo
	} catch (err) {
		console.error('Failed to fetch halal logos for the verification picker:', err)
	}
}

async function resolve(id: number, action: 'approve' | 'dismiss'): Promise<void> {
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
		errorMessage.value = err instanceof ApiError ? err.message : `Failed to ${action} flagged scan.`
		console.error(`Failed to ${action} flagged scan:`, err)
	} finally {
		actingOnId.value = null
	}
}

const approve = (id: number) => resolve(id, 'approve')
const dismiss = (id: number) => resolve(id, 'dismiss')

onMounted(() => {
	fetchFlaggedScans()
	fetchHalalLogos()
})
</script>

<style scoped>
.verification-panel {
	padding: 24px 32px;
	background-color: #f8fafc;
	min-height: 100vh;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	color: #334155;
}

/* Page Header */
.page-header {
	margin-bottom: 24px;
}
h1 {
	font-size: 1.35rem;
	font-weight: 600;
	margin: 0 0 6px;
	color: #1e293b;
}
.subtitle {
	color: #64748b;
	font-size: 0.85rem;
	margin: 0;
}

/* 4 Summary Cards Grid */
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
.summary-card.red { border-color: #fecaca; background-color: #fef2f2; }
.summary-card.yellow { border-color: #fef08a; background-color: #fefce8; }
.summary-card.blue { border-color: #bfdbfe; background-color: #eff6ff; }
.summary-card.green { border-color: #bbf7d0; background-color: #f0fdf4; }

.card-icon { flex-shrink: 0; }
.card-text { display: flex; align-items: baseline; gap: 8px; }
.summary-value { font-size: 1.35rem; font-weight: 700; }
.summary-label { font-size: 0.8rem; font-weight: 500; }

.red-text { color: #dc2626; }
.yellow-text { color: #ca8a04; }
.blue-text { color: #2563eb; }
.green-text { color: #16a34a; }

/* Table Outer Card */
.panel-card {
	background: white;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
	overflow: hidden;
}

/* Control Bar */
.controls-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px 20px;
	border-bottom: 1px solid #f1f5f9;
}
.search-box {
	display: flex;
	align-items: center;
	background: white;
	border: 1px solid #cbd5e1;
	border-radius: 8px;
	padding: 8px 12px;
	width: 380px;
}
.search-icon { color: #94a3b8; margin-right: 10px; }
.search-box input {
	border: none;
	outline: none;
	width: 100%;
	font-size: 0.85rem;
	color: #334155;
}
.filters {
	display: flex;
	align-items: center;
	gap: 10px;
}
.filter-icon { color: #94a3b8; margin-right: 4px; }
.filter-select {
	background: white;
	border: 1px solid #cbd5e1;
	border-radius: 8px;
	padding: 8px 16px;
	font-size: 0.85rem;
	color: #334155;
	outline: none;
	cursor: pointer;
}

/* Table Design */
.scans-table {
	width: 100%;
	border-collapse: collapse;
}
th {
	text-align: left;
	padding: 14px 20px;
	font-size: 0.725rem;
	font-weight: 700;
	color: #64748b;
	background: #f8fafc;
	border-bottom: 1px solid #e2e8f0;
	letter-spacing: 0.05em;
}
td {
	padding: 18px 20px;
	border-bottom: 1px solid #f1f5f9;
	font-size: 0.85rem;
	vertical-align: middle;
}

.cell-id {
	color: #64748b;
	font-weight: 500;
	font-size: 0.8rem;
}

/* Product Info */
.product-cell { display: flex; align-items: center; gap: 14px; }
.product-image-placeholder {
	width: 42px;
	height: 42px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.1rem;
	flex-shrink: 0;
}
.product-details { display: flex; flex-direction: column; gap: 2px; }
.product-name { font-weight: 600; color: #1e293b; line-height: 1.25; }
.product-user { font-size: 0.75rem; color: #94a3b8; }

/* API Flag Capsule Badge */
.flag-capsule {
	display: inline-flex;
	align-items: center;
	padding: 10px 16px;
	border-radius: 30px;
	font-size: 0.775rem;
	max-width: 200px;
	text-align: center;
	line-height: 1.3;
}
.flag-dot {
	width: 4px;
	height: 12px;
	border-radius: 2px;
	margin-right: 8px;
	flex-shrink: 0;
}
.flag-capsule.yellow { background-color: #fef9c3; color: #854d0e; }
.flag-capsule.yellow .flag-dot { background-color: #ca8a04; }
.flag-capsule.red { background-color: #fee2e2; color: #991b1b; }
.flag-capsule.red .flag-dot { background-color: #dc2626; }

.flag-divider { margin: 0 4px; }

/* Confidence Values */
.col-confidence { font-weight: 600; }
.text-yellow { color: #d97706; }
.text-red { color: #dc2626; }
.text-green { color: #16a34a; }

/* Date Formatting */
.col-submitted { color: #64748b; font-size: 0.8rem; line-height: 1.3; }
.time-subtext { color: #94a3b8; }

/* Status Pill */
.status-pill {
	display: inline-block;
	padding: 4px 12px;
	border-radius: 20px;
	font-size: 0.75rem;
	font-weight: 500;
	text-transform: capitalize;
}
.status-pill.pending { background: #fef9c3; color: #a16207; }
.status-pill.flagged { background: #fee2e2; color: #b91c1c; }
.status-pill.approved, .status-pill.verified { background: #dcfce7; color: #15803d; }
.status-pill.dismissed, .status-pill.rejected { background: #f1f5f9; color: #64748b; }

/* Actions Column (Vertically Stacked) */
.actions-wrapper {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	width: 100%;
	max-width: 200px;
}
.halal-picker {
	width: 100%;
	padding: 6px 10px;
	border-radius: 8px;
	border: 1px solid #cbd5e1;
	font-size: 0.775rem;
	color: #334155;
	background-color: white;
	outline: none;
}
.button-row {
	display: flex;
	align-items: center;
	gap: 8px;
}
.btn-review {
	background: transparent;
	border: none;
	color: #334155;
	font-size: 0.8rem;
	font-weight: 500;
	cursor: pointer;
	padding: 4px 6px;
}
.btn-review:hover { color: #0f172a; }
.btn-correct {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: #ffffff;
	border: 1px solid #bfdbfe;
	color: #2563eb;
	border-radius: 20px;
	padding: 5px 12px;
	font-size: 0.775rem;
	font-weight: 500;
	cursor: pointer;
	transition: background 0.15s ease;
}
.btn-correct:hover { background-color: #eff6ff; }

/* State Messages */
.state-message, .empty-note {
	padding: 32px;
	text-align: center;
	color: #64748b;
	font-size: 0.9rem;
}
.error-message {
	padding: 32px;
	text-align: center;
	color: #dc2626;
	font-size: 0.9rem;
}
</style>