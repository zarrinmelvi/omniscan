<template>
	<div class="dashboard">
		<header class="page-header">
			<h1>Dashboard</h1>
			<p class="subtitle">Overview of platform activity</p>
		</header>

		<p v-if="isLoading">Loading…</p>
		<p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>

		<template v-else>
			<div class="stat-cards">
				<div class="stat-card">
					<div class="stat-label">Total Scans</div>
					<div class="stat-value">{{ stats?.total_scans ?? 0 }}</div>
				</div>
				<div class="stat-card" :class="{ warn: (stats?.pending_flags ?? 0) > 0 }">
					<div class="stat-label">Pending Flags</div>
					<div class="stat-value">{{ stats?.pending_flags ?? 0 }}</div>
				</div>
				<div class="stat-card">
					<div class="stat-label">Resolution Rate</div>
					<div class="stat-value">{{ stats?.resolution_rate ?? 0 }}%</div>
				</div>
			</div>

			<div class="recent-section">
				<div class="recent-header">
					<h2>Recent Flagged Items</h2>
					<router-link to="/admin/verification" class="view-all-link">View all →</router-link>
				</div>

				<p v-if="recentFlags.length === 0" class="empty-note">Nothing flagged right now.</p>

				<table v-else>
					<thead>
						<tr>
							<th>Product</th>
							<th>Verdict</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="scan in recentFlags" :key="scan.id">
							<td>{{ scan.brand_name }} {{ scan.product_name }}</td>
							<td>{{ scan.safety_verdict }}</td>
							<td>
								<span class="status-badge" :class="scan.status">{{ scan.status }}</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

interface DashboardStats {
	total_scans: number
	pending_flags: number
	resolution_rate: number
}

interface FlaggedScanRow {
	id: number
	product_name: string
	brand_name: string
	status: string
	safety_verdict: string | null
}

const stats = ref<DashboardStats | null>(null)
const recentFlags = ref<FlaggedScanRow[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

async function loadDashboard(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null

	try {
		const [statsData, flagsData] = await Promise.all([
			apiFetch<{ stats: DashboardStats }>('/api/admin/dashboard', { isAdmin: true }),
			apiFetch<{ flagged_scans: FlaggedScanRow[] }>('/api/admin/flagged-scans?status=pending', { isAdmin: true }),
		])
		stats.value = statsData.stats
		recentFlags.value = flagsData.flagged_scans.slice(0, 5)
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load dashboard.'
		console.error('Failed to load dashboard:', err)
	} finally {
		isLoading.value = false
	}
}

onMounted(loadDashboard)
</script>

<style scoped>
.dashboard {
	padding: 32px;
}
.page-header {
	margin-bottom: 24px;
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
.error {
	color: #dc2626;
}

.stat-cards {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
	margin-bottom: 32px;
}
.stat-card {
	background: white;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 20px;
}
.stat-card.warn {
	border-color: #fbbf24;
	background: #fffbeb;
}
.stat-label {
	font-size: 0.8rem;
	color: #6b7280;
	margin-bottom: 6px;
}
.stat-value {
	font-size: 1.75rem;
	font-weight: 700;
	color: #111827;
}

.recent-section {
	background: white;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 20px;
}
.recent-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}
h2 {
	font-size: 1.05rem;
	margin: 0;
	color: #111827;
}
.view-all-link {
	font-size: 0.85rem;
	color: #16a34a;
	text-decoration: none;
}
.empty-note {
	color: #6b7280;
	font-size: 0.875rem;
}

table {
	width: 100%;
	border-collapse: collapse;
}
th,
td {
	text-align: left;
	padding: 8px 10px;
	border-bottom: 1px solid #f3f4f6;
	font-size: 0.875rem;
}
th {
	color: #6b7280;
	font-weight: 600;
	font-size: 0.75rem;
	text-transform: uppercase;
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
</style>
