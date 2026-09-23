<template>
	<div class="dashboard">
		<header class="page-header">
			<h1>Welcome back, Admin. System status is <span class="status-nominal">NOMINAL</span>.</h1>
			<p class="subtitle">Ollama Pro · Neon PostgreSQL · Prisma ORM</p>
		</header>

		<p v-if="isLoading">Loading…</p>
		<p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>

		<template v-else>
			<div class="stat-cards">
				<div class="stat-card green-card">
					<div class="stat-label">Total Scans</div>
					<div class="stat-value">[ {{ stats?.total_scans ?? 0 }} ]</div>
				</div>
				<div class="stat-card orange-card">
					<div class="stat-label">Pending Flags</div>
					<div class="stat-value">[ {{ stats?.pending_flags ?? 0 }} ]</div>
				</div>
				<div class="stat-card blue-card">
					<div class="stat-label">Database Integrity</div>
					<div class="stat-value">[ {{ stats?.resolution_rate ?? 0 }}% ]</div>
					<div class="stat-footer-text">NOMINAL — <a href="#" class="stat-link inline-link">View Report</a></div>
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
							<th>PRODUCT</th>
							<th>VERDICT</th>
							<th>STATUS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="scan in recentFlags" :key="scan.id">
							<td class="product-name">{{ scan.brand_name ? `${scan.brand_name} ` : '' }}{{ scan.product_name }}</td>
							<td class="verdict-cell">{{ scan.safety_verdict || 'Red' }}</td>
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
	background-color: #fafafa;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	color: #1a1a1a;
}

.page-header {
	margin-bottom: 28px;
}
h1 {
	font-size: 1.5rem;
	font-weight: 600;
	margin: 0 0 6px;
	color: #111827;
}
.status-nominal {
	color: #16a34a;
	font-weight: 700;
}
.subtitle {
	color: #888;
	font-size: 0.9rem;
	margin: 0;
}
.error {
	color: #dc2626;
}

/* Stat Cards */
.stat-cards {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 20px;
	margin-bottom: 32px;
}
.stat-card {
	border-radius: 12px;
	padding: 24px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	min-height: 140px;
}

.green-card {
	background-color: #f2fbf5;
	border: 1px solid #bbf7d0;
}
.orange-card {
	background-color: #fffaf0;
	border: 1px solid #fed7aa;
}
.blue-card {
	background-color: #f0f7ff;
	border: 1px solid #bfdbfe;
}

.stat-label {
	font-size: 0.95rem;
	color: #4b5563;
	margin-bottom: 12px;
}
.stat-value {
	font-size: 2.25rem;
	font-weight: 500;
}

.green-card .stat-value {
	color: #16a34a;
}
.orange-card .stat-value {
	color: #ea580c;
}
.blue-card .stat-value {
	color: #16a34a;
	margin-bottom: 8px;
}

.stat-footer-text {
	font-size: 0.85rem;
	color: #2563eb;
}
.inline-link {
	color: #2563eb;
	text-decoration: underline;
}

/* Recent Items Section Container */
.recent-section {
	background: white;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 24px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}
.recent-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}
h2 {
	font-size: 1.25rem;
	font-weight: 600;
	margin: 0;
	color: #111827;
}
.view-all-link {
	font-size: 0.9rem;
	color: #16a34a;
	text-decoration: none;
	font-weight: 500;
}
.view-all-link:hover {
	text-decoration: underline;
}

/* Table Styling */
table {
	width: 100%;
	border-collapse: collapse;
}
th {
	text-align: left;
	padding: 12px 10px;
	color: #6b7280;
	font-weight: 600;
	font-size: 0.75rem;
	letter-spacing: 0.05em;
	border-bottom: 1px solid #f3f4f6;
}
td {
	text-align: left;
	padding: 14px 10px;
	border-bottom: 1px solid #f3f4f6;
	font-size: 0.9rem;
	vertical-align: middle;
}

.product-name {
	color: #111827;
	font-weight: 500;
}

.verdict-cell {
	color: #374151;
}

/* Status Badges */
.status-badge {
	display: inline-block;
	padding: 4px 14px;
	border-radius: 12px;
	font-size: 0.8rem;
	font-weight: 500;
	text-transform: capitalize;
}
.status-badge.pending {
	background-color: #fef3c7;
	color: #92400e;
}
.status-badge.approved {
	background-color: #d1fae5;
	color: #065f46;
}
.status-badge.dismissed {
	background-color: #f3f4f6;
	color: #6b7280;
}

.empty-note {
	color: #6b7280;
	font-size: 0.875rem;
}
</style>