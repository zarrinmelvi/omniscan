<template>
	<div class="verification-panel">
		<header class="page-header">
			<h1>Verification Panel</h1>
			<p class="subtitle">Review AI-flagged scans and validate allergen/Halal detection</p>
		</header>

		<div v-if="!isLoading && !errorMessage" class="summary-cards">
			<div class="summary-card pending">
				<div class="summary-value">{{ counts.pending }}</div>
				<div class="summary-label">Pending</div>
			</div>
			<div class="summary-card approved">
				<div class="summary-value">{{ counts.approved }}</div>
				<div class="summary-label">Approved</div>
			</div>
			<div class="summary-card dismissed">
				<div class="summary-value">{{ counts.dismissed }}</div>
				<div class="summary-label">Dismissed</div>
			</div>
		</div>

		<p v-if="isLoading">Loading…</p>
		<p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>
		<p v-else-if="flaggedScans.length === 0" class="empty-note">No flagged scans right now.</p>

		<table v-else>
			<thead>
				<tr>
					<th>Product</th>
					<th>Verdict</th>
					<th>Flag Reason</th>
					<th>Scanned By</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="scan in flaggedScans" :key="scan.id">
					<td>{{ scan.brand_name }} {{ scan.product_name }}</td>
					<td>
						<span class="verdict-badge" :class="(scan.safety_verdict ?? '').toLowerCase()">{{ scan.safety_verdict }}</span>
					</td>
					<td>{{ scan.flag_reason }}</td>
					<td>{{ scan.scanned_by }}</td>
					<td>
						<span class="status-badge" :class="scan.status">{{ scan.status }}</span>
					</td>
					<td>
						<button :disabled="actingOnId === scan.id" @click="approve(scan.id)">Approve</button>
						<button :disabled="actingOnId === scan.id" @click="dismiss(scan.id)">Dismiss</button>
					</td>
				</tr>
			</tbody>
		</table>
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

const flaggedScans = ref<FlaggedScanRow[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const actingOnId = ref<number | null>(null)

// Computed from the currently-loaded list rather than a separate API call —
// fine at this scale, and keeps the summary cards always in sync with what's
// actually rendered below them.
const counts = computed(() => ({
	pending: flaggedScans.value.filter((s) => s.status === 'pending').length,
	approved: flaggedScans.value.filter((s) => s.status === 'approved').length,
	dismissed: flaggedScans.value.filter((s) => s.status === 'dismissed').length,
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
		// A 401 here already triggered apiFetch's own logout + redirect to
		// /admin/login (see handleUnauthorized in utils/api.ts) — this message
		// only actually renders for non-401 failures, since the redirect
		// navigates away before this component would show it.
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load flagged scans.'
		console.error('Failed to fetch flagged scans:', err)
	} finally {
		isLoading.value = false
	}
}

async function resolve(id: number, action: 'approve' | 'dismiss'): Promise<void> {
	actingOnId.value = id
	try {
		await apiFetch(`/api/admin/flagged-scans/${id}/${action}`, {
			method: 'POST',
			body: {},
			isAdmin: true,
		})

		// Refetch rather than patching locally — a resolved item may need to
		// drop out of the current view depending on filtering added later.
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

onMounted(fetchFlaggedScans)
</script>

<style scoped>
.verification-panel {
	padding: 32px;
	font-family:
		system-ui,
		-apple-system,
		sans-serif;
}
.page-header {
	margin-bottom: 20px;
}
h1 {
	font-size: 1.5rem;
	margin: 0 0 4px;
	color: #111827;
}
.subtitle {
	color: #6b7280;
	font-size: 0.875rem;
	margin: 0;
}

.summary-cards {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
	margin-bottom: 24px;
	max-width: 480px;
}
.summary-card {
	background: white;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 16px;
	text-align: center;
}
.summary-card.pending {
	border-color: #fbbf24;
	background: #fffbeb;
}
.summary-card.approved {
	border-color: #34d399;
	background: #ecfdf5;
}
.summary-value {
	font-size: 1.4rem;
	font-weight: 700;
	color: #111827;
}
.summary-label {
	font-size: 0.75rem;
	color: #6b7280;
	margin-top: 2px;
}

.empty-note {
	color: #6b7280;
	font-size: 0.875rem;
}

table {
	width: 100%;
	border-collapse: collapse;
	background: white;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	overflow: hidden;
}
th,
td {
	text-align: left;
	padding: 10px 12px;
	border-bottom: 1px solid #f3f4f6;
	font-size: 0.875rem;
}
th {
	color: #6b7280;
	font-weight: 600;
	font-size: 0.75rem;
	text-transform: uppercase;
	background: #f9fafb;
}

.verdict-badge {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 0.75rem;
	font-weight: 600;
}
.verdict-badge.red {
	background: #fee2e2;
	color: #991b1b;
}
.verdict-badge.yellow {
	background: #fef3c7;
	color: #92400e;
}
.verdict-badge.green {
	background: #d1fae5;
	color: #065f46;
}

.status-badge {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 0.75rem;
	text-transform: capitalize;
}
.status-badge.pending {
	background: #fef3c7;
	color: #92400e;
}
.status-badge.approved {
	background: #d1fae5;
	color: #065f46;
}
.status-badge.dismissed {
	background: #f3f4f6;
	color: #6b7280;
}

button {
	padding: 4px 10px;
	margin-right: 6px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background: white;
	cursor: pointer;
	font-size: 0.8rem;
}
button:hover:not(:disabled) {
	background: #f3f4f6;
}
button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
.error {
	color: #dc2626;
}
</style>
