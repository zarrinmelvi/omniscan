<template>
	<div class="manage-user-profile">
		<!-- Page Header -->
		<header class="page-header">
			<h1>Manage User Profiles</h1>
			<p class="subtitle">
				View and monitor user accounts · Review flagged profiles
			</p>
		</header>

		<!-- Account Lifecycle Policy (collapsible) -->
		<div class="lifecycle-card">
			<button class="policy-toggle" @click="policyExpanded = !policyExpanded" type="button">
				<svg class="info-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="12" y1="16" x2="12" y2="12"></line>
					<line x1="12" y1="8" x2="12.01" y2="8"></line>
				</svg>
				<span>ACCOUNT LIFECYCLE POLICY</span>
				<svg class="chevron-icon" :class="{ 'chevron-open': policyExpanded }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</button>

			<div v-if="policyExpanded" class="policy-content">
				<div class="policy-body">
					<div class="policy-column">
						<div class="policy-icon-wrapper orange-bg">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"></path>
								<path d="M3 8l9 5 9-5"></path>
								<path d="M12 13v8"></path>
							</svg>
						</div>
						<div class="policy-text">
							<div class="policy-title">6 Months Inactive &rarr; Archived</div>
							<p class="policy-desc">
								Accounts with no activity for <span class="highlight-orange">6 months (180 days)</span> are automatically moved to <span class="highlight-orange">Archive</span>. The user is notified by email and has 1 week to log back in before permanent deletion.
							</p>
						</div>
					</div>

					<div class="policy-divider"></div>

					<div class="policy-column">
						<div class="policy-icon-wrapper red-bg">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="3 6 5 6 21 6"></polyline>
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
							</svg>
						</div>
						<div class="policy-text">
							<div class="policy-title">+1 Week After Archive &rarr; Deleted</div>
							<p class="policy-desc">
								If no login occurs within <span class="highlight-red">7 days of archiving</span>, the account is permanently <span class="highlight-red">deleted</span>. All personal data is anonymised in compliance with PDPA / GDPR.
							</p>
						</div>
					</div>
				</div>

				<div class="lifecycle-timeline">
					<div class="timeline-step">
						<span class="timeline-dot green-dot"></span>
						<span class="timeline-text green-text">Active</span>
					</div>
					<div class="timeline-bar"></div>
					<div class="timeline-step">
						<span class="timeline-dot orange-dot"></span>
						<span class="timeline-text orange-text">6 months &rarr; Archive</span>
					</div>
					<div class="timeline-bar red-gradient"></div>
					<div class="timeline-step">
						<span class="timeline-dot red-dot"></span>
						<span class="timeline-text red-text">+1 week &rarr; Deleted</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Stat Cards Grid -->
		<div class="stat-cards">
			<div class="stat-card default-card">
				<div class="stat-icon">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
						<circle cx="9" cy="7" r="4"></circle>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
					</svg>
				</div>
				<div class="stat-content">
					<div class="stat-value">{{ userStats.total }}</div>
					<div class="stat-label">Total Users</div>
				</div>
			</div>

			<div class="stat-card green-card">
				<div class="stat-icon green-text">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
						<polyline points="9 12 11 14 15 10"></polyline>
					</svg>
				</div>
				<div class="stat-content">
					<div class="stat-value green-text">{{ userStats.active }}</div>
					<div class="stat-label green-text">Active</div>
				</div>
			</div>

			<div class="stat-card gray-card">
				<div class="stat-icon gray-text">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				</div>
				<div class="stat-content">
					<div class="stat-value gray-text">{{ userStats.inactive }}</div>
					<div class="stat-label gray-text">Inactive</div>
				</div>
			</div>

			<div class="stat-card orange-card">
				<div class="stat-icon orange-text">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"></path>
						<path d="M3 8l9 5 9-5"></path>
						<path d="M12 13v8"></path>
					</svg>
				</div>
				<div class="stat-content">
					<div class="stat-value orange-text">{{ userStats.archived }}</div>
					<div class="stat-label orange-text">Archived</div>
				</div>
			</div>
		</div>

		<!-- Table Container -->
		<div class="content-card">
			<div class="controls-bar">
				<div class="search-box">
					<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					</svg>
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Search by name or email..."
					/>
				</div>

				<div class="controls-right">
					<span class="user-count-label">{{ filteredUsers.length }} of {{ users.length }} users</span>
					<select v-model="filterStatus" class="filter-select">
						<option value="All">All Statuses</option>
						<option value="Active">Active</option>
						<option value="Inactive">Inactive</option>
						<option value="Archived">Archived</option>
					</select>

					<select v-model="sortOrder" class="filter-select">
						<option value="Latest">Latest</option>
						<option value="Oldest">Oldest</option>
					</select>

					<button class="refresh-btn" @click="fetchUsers" title="Refresh" type="button">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="23 4 23 10 17 10"></polyline>
							<polyline points="1 20 1 14 7 14"></polyline>
							<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
						</svg>
					</button>
				</div>
			</div>

			<!-- Batch Action Toolbar -->
			<div v-if="selectedCount > 0" class="batch-toolbar">
				<div class="batch-info">
					<span class="batch-count">{{ selectedCount }} selected</span>
					<button class="batch-clear" type="button" @click="clearSelection">Clear</button>
				</div>
				<div class="batch-buttons">
					<button class="batch-btn notify" type="button" :disabled="batchActing" @click="runBatch('notify')">Send Inactivity Notice</button>
				</div>
			</div>

			<!-- Loading / error / empty states -->
			<p v-if="isLoading" class="state-message">Loading user accounts…</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
			<p v-else-if="filteredUsers.length === 0" class="empty-note">No user accounts match the current filters.</p>

			<!-- User Accounts Table -->
			<table v-else class="data-table">
				<thead>
					<tr>
						<th class="checkbox-col"><input type="checkbox" :checked="allVisibleSelected" :indeterminate.prop="someSelected" @change="toggleSelectAll" aria-label="Select all users" /></th>
						<th>NAME</th>
						<th>EMAIL</th>
						<th>SCANS</th>
						<th>CREATED</th>
						<th>LAST ACTIVE</th>
						<th>INACTIVE FOR</th>
						<th>STATUS</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="user in filteredUsers"
						:key="user.id"
						:class="getRowClass(user)"
					>
						<td class="checkbox-col"><input type="checkbox" :checked="selectedIds.has(user.id)" @change="toggleRow(user.id)" :aria-label="'Select ' + user.name" /></td>
						<td>
							<div class="user-cell">
								<div class="avatar" :class="user.avatarBg">
									<img v-if="user.avatarSrc" :src="user.avatarSrc" :alt="user.name" class="avatar-img" />
									<template v-else>{{ user.initials }}</template>
								</div>
								<span class="user-name">{{ user.name }}</span>
							</div>
						</td>
						<td class="email-cell">{{ user.email }}</td>
						<td class="scan-count-cell">{{ user.scan_count ?? '—' }}</td>
						<td class="date-cell">{{ user.created }}</td>
						<td class="date-cell">{{ user.lastActive }}</td>
						<td>
							<span v-if="user.inactiveFor" class="inactive-badge" :class="user.inactiveForClass">
								{{ user.inactiveFor }}
							</span>
							<span v-else class="text-muted">Today</span>
						</td>
						<td>
							<div class="row-actions">
								<span class="status-badge" :class="user.status.toLowerCase()">
									{{ user.status }}
								</span>
								<a :href="`/admin/usersprofile/${user.id}`" class="view-profile-btn" title="View profile" @click.prevent="viewProfile(user.id)">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
										<circle cx="12" cy="12" r="3"></circle>
									</svg>
									View
								</a>
							</div>
						</td>
					</tr>
				</tbody>
			</table>

			<!-- Table Footer Legend & Timestamp -->
			<div class="table-footer">
				<div class="legend">
					<span class="legend-title">Row highlights:</span>
					<span class="legend-item"><span class="legend-dot orange"></span> Archived (180d+)</span>
					<span class="legend-item"><span class="legend-dot red"></span> Deletion due (187d+)</span>
				</div>
				<div class="as-of-date">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
					<span>As of {{ formattedCurrentDate }}</span>
				</div>
			</div>
		</div>
		<!-- User Scan History Modal -->
		<Teleport to="body">
			<div v-if="scanModalUser" class="scan-modal-overlay" @click.self="closeScanModal">
				<div class="scan-modal" role="dialog" aria-modal="true">
					<div class="scan-modal-header">
						<div class="scan-modal-title-group">
							<div class="scan-modal-avatar" :class="scanModalUser.avatarBg">
								<img v-if="scanModalUser.avatarSrc" :src="scanModalUser.avatarSrc" :alt="scanModalUser.name" class="avatar-img" />
								<template v-else>{{ scanModalUser.initials }}</template>
							</div>
							<div>
								<h2 class="scan-modal-title">{{ scanModalUser.name }}</h2>
								<p class="scan-modal-subtitle">{{ scanModalUser.email }} · {{ scanModalUser.scan_count }} total scan{{ scanModalUser.scan_count !== 1 ? 's' : '' }}</p>
							</div>
						</div>
						<button class="scan-modal-close" @click="closeScanModal" aria-label="Close">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>

					<div class="scan-modal-body">
						<p v-if="scanModalLoading" class="scan-modal-state">Loading scan history…</p>
						<p v-else-if="scanModalError" class="scan-modal-error">{{ scanModalError }}</p>
						<p v-else-if="scanModalScans.length === 0" class="scan-modal-state">This user has no scans yet.</p>
						<div v-else class="scan-list">
							<div v-for="scan in scanModalScans" :key="scan.id" class="scan-row">
								<div class="scan-thumb">
									<img v-if="scan.image_base64" :src="scan.image_base64" :alt="scan.product_name" class="scan-thumb-img" />
									<span v-else class="scan-thumb-fallback">📦</span>
								</div>
								<div class="scan-info">
									<span class="scan-product">{{ scan.brand_name ? scan.brand_name + ' ' : '' }}{{ scan.product_name }}</span>
									<span class="scan-date">{{ formatScanDate(scan.scan_time) }}</span>
								</div>
								<div class="scan-meta">
									<span class="scan-confidence" v-if="scan.ai_confidence_score != null">{{ scan.ai_confidence_score }}%</span>
									<span class="scan-verdict" :class="'verdict-' + scan.safety_verdict.toLowerCase()">{{ scan.safety_verdict }}</span>
									<span v-if="scan.flagged" class="scan-flagged-badge">Flagged</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

interface ApiUserRow {
	id: number
	name: string
	email: string
	avatar_base64: string | null
	created_at: string
	last_active: string
	inactive_days: number
	inactive_for: string | null
	status: 'Active' | 'Inactive' | 'Archived'
	deletion_due: boolean
	scan_count: number
}

interface UserProfile {
	id: number
	name: string
	initials: string
	avatarBg: string
	avatarSrc: string | null
	email: string
	created: string
	lastActive: string
	/** Raw epoch ms of last-active (falls back to created) — used for sorting. */
	sortTs: number
	inactiveFor: string | null
	inactiveForClass?: string
	status: 'Active' | 'Inactive' | 'Archived'
	highlight?: 'archived' | 'deletion'
	scan_count: number
}

const searchQuery = ref('')
const filterStatus = ref('All')
const sortOrder = ref<'Latest' | 'Oldest'>('Latest')
const policyExpanded = ref(false)

// Scan history modal
interface ScanHistoryRow {
	id: number
	scan_time: string
	safety_verdict: string
	flag_reason: string
	ai_confidence_score: number | null
	product_name: string
	brand_name: string
	image_base64: string | null
	flagged: boolean
	flag_status: string | null
}

const scanModalUser = ref<UserProfile | null>(null)
const scanModalScans = ref<ScanHistoryRow[]>([])
const scanModalLoading = ref(false)
const scanModalError = ref<string | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const users = ref<UserProfile[]>([])
const stats = ref({ total: 0, active: 0, inactive: 0, archived: 0 })

// --- Batch selection state ---
const selectedIds = ref<Set<number>>(new Set())
const batchActing = ref(false)

const formattedCurrentDate = computed(() =>
	new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
)

function initialsOf(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean)
	if (parts.length === 0) return '?'
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(iso: string): string {
	if (!iso) return '—'
	const d = new Date(iso)
	return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-CA')
}

/** Choose an inactivity-badge colour band from the raw day count. */
function inactiveForClass(days: number, deletionDue: boolean): string | undefined {
	if (deletionDue) return 'badge-red'
	if (days >= 180) return 'badge-orange'
	if (days >= 30) return 'badge-yellow'
	return undefined
}

function mapRow(r: ApiUserRow): UserProfile {
	let inactiveLabel = r.inactive_for
	if (r.status === 'Archived') {
		inactiveLabel = r.deletion_due
			? `Deletion due · ${r.inactive_for ?? ''}`.trim()
			: `Archived · ${r.inactive_for ?? ''}`.trim()
	}

	return {
		id: r.id,
		name: r.name,
		initials: initialsOf(r.name),
		avatarBg: r.status === 'Archived' ? 'bg-orange' : 'bg-green',
		avatarSrc: r.avatar_base64
			? (r.avatar_base64.startsWith('data:') ? r.avatar_base64 : `data:image/jpeg;base64,${r.avatar_base64}`)
			: null,
		email: r.email,
		created: formatDate(r.created_at),
		lastActive: formatDate(r.last_active),
		sortTs: new Date(r.last_active || r.created_at).getTime() || 0,
		inactiveFor: inactiveLabel,
		inactiveForClass: inactiveForClass(r.inactive_days, r.deletion_due),
		status: r.status,
		highlight: r.deletion_due ? 'deletion' : r.status === 'Archived' ? 'archived' : undefined,
		scan_count: r.scan_count ?? 0,
	}
}

async function fetchUsers(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		const data = await apiFetch<{ users: ApiUserRow[]; stats: typeof stats.value }>('/api/admin/users', {
			isAdmin: true,
		})
		users.value = (data.users ?? []).map(mapRow)
		stats.value = data.stats ?? { total: 0, active: 0, inactive: 0, archived: 0 }
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load user accounts.'
		console.error('Failed to fetch users:', err)
	} finally {
		isLoading.value = false
	}
}

function getRowClass(user: UserProfile) {
	if (user.highlight === 'deletion') return 'row-highlight-red'
	if (user.highlight === 'archived') return 'row-highlight-orange'
	return ''
}

// Metrics come straight from the backend aggregate so they stay correct even
// if the table is filtered client-side.
const userStats = computed(() => stats.value)

const filteredUsers = computed(() => {
	const filtered = users.value.filter((user) => {
		const query = searchQuery.value.trim().toLowerCase()
		const matchesQuery = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
		const matchesStatus = filterStatus.value === 'All' || user.status === filterStatus.value
		return matchesQuery && matchesStatus
	})

	// Sort by last-active timestamp: Latest = newest first, Oldest = oldest first.
	// Copy first so we never mutate the source array in place.
	return [...filtered].sort((a, b) =>
		sortOrder.value === 'Latest' ? b.sortTs - a.sortTs : a.sortTs - b.sortTs
	)
})

const selectedCount = computed(() => selectedIds.value.size)

const allVisibleSelected = computed(() => {
	const visible = filteredUsers.value
	return visible.length > 0 && visible.every((u) => selectedIds.value.has(u.id))
})

const someSelected = computed(() => selectedCount.value > 0 && !allVisibleSelected.value)

function toggleRow(id: number): void {
	const next = new Set(selectedIds.value)
	if (next.has(id)) next.delete(id)
	else next.add(id)
	selectedIds.value = next
}

function toggleSelectAll(): void {
	if (allVisibleSelected.value) selectedIds.value = new Set()
	else selectedIds.value = new Set(filteredUsers.value.map((u) => u.id))
}

function clearSelection(): void {
	selectedIds.value = new Set()
}

async function runBatch(action: 'notify'): Promise<void> {
	const ids = [...selectedIds.value]
	if (ids.length === 0) return
	batchActing.value = true
	errorMessage.value = null
	try {
		await apiFetch('/api/admin/users/batch', { method: 'POST', body: { ids, action }, isAdmin: true })
		clearSelection()
		await fetchUsers()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Batch action failed.'
		console.error('Batch action failed:', err)
	} finally {
		batchActing.value = false
	}
}

function formatScanDate(iso: string): string {
	if (!iso) return '—'
	const d = new Date(iso)
	return d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

async function viewProfile(userId: number): Promise<void> {
	const user = users.value.find((u) => u.id === userId)
	if (!user) return

	scanModalUser.value = user
	scanModalScans.value = []
	scanModalLoading.value = true
	scanModalError.value = null

	try {
		const res = await apiFetch<{ success: boolean; scans: ScanHistoryRow[] }>(
			`/api/admin/users/${userId}/scans`,
			{ isAdmin: true }
		)
		scanModalScans.value = res.scans ?? []
	} catch (err) {
		scanModalError.value = err instanceof ApiError ? err.message : 'Failed to load scan history.'
	} finally {
		scanModalLoading.value = false
	}
}

function closeScanModal(): void {
	scanModalUser.value = null
	scanModalScans.value = []
	scanModalError.value = null
}

onMounted(fetchUsers)
</script>

<style scoped>
.manage-user-profile {
	padding: 12px;
	background-color: #f8fafc;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	color: #334155;
}

/* Page Header */
.page-header {
	margin-bottom: 20px;
}
h1 {
	font-size: 1.5rem;
	font-weight: 600;
	margin: 0 0 4px;
	color: #0f172a;
}
.subtitle {
	color: #64748b;
	font-size: 0.88rem;
	margin: 0;
}

/* Lifecycle Banner Card */
.lifecycle-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 20px 24px;
	margin-bottom: 24px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.policy-header {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.72rem;
	font-weight: 700;
	color: #64748b;
	letter-spacing: 0.06em;
	margin-bottom: 18px;
}

.info-icon {
	color: #64748b;
}

.policy-body {
	display: flex;
	align-items: flex-start;
	gap: 24px;
	margin-bottom: 24px;
}

.policy-column {
	flex: 1;
	display: flex;
	align-items: flex-start;
	gap: 14px;
}

.policy-divider {
	width: 1px;
	background-color: #f1f5f9;
	align-self: stretch;
}

.policy-icon-wrapper {
	width: 36px;
	height: 36px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.orange-bg {
	background-color: #fff7ed;
	color: #ea580c;
}

.red-bg {
	background-color: #fef2f2;
	color: #ef4444;
}

.policy-title {
	font-size: 0.9rem;
	font-weight: 600;
	color: #1e293b;
	margin-bottom: 4px;
}

.policy-desc {
	margin: 0;
	font-size: 0.82rem;
	color: #64748b;
	line-height: 1.45;
}

.highlight-orange {
	color: #ea580c;
}

.highlight-red {
	color: #dc2626;
}

/* Timeline */
.lifecycle-timeline {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
}

.timeline-step {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.8rem;
	font-weight: 500;
	white-space: nowrap;
}

.timeline-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.green-dot { background-color: #16a34a; }
.orange-dot { background-color: #ea580c; }
.red-dot { background-color: #dc2626; }

.timeline-bar {
	height: 6px;
	flex: 1;
	border-radius: 4px;
	background: linear-gradient(to right, #86efac, #fde047, #fdba74);
}

.timeline-bar.red-gradient {
	background: linear-gradient(to right, #fdba74, #fca5a5);
}

/* Stat Cards Grid */
.stat-cards {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 16px;
	margin-bottom: 24px;
}

.stat-card {
	background: #ffffff;
	border-radius: 12px;
	padding: 16px 20px;
	display: flex;
	align-items: center;
	gap: 16px;
	border: 1px solid #e2e8f0;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.stat-card.green-card {
	background-color: #f0fdf4;
	border-color: #bbf7d0;
}

.stat-card.gray-card {
	background-color: #f8fafc;
	border-color: #e2e8f0;
}

.stat-card.orange-card {
	background-color: #fff7ed;
	border-color: #fed7aa;
}

.stat-icon {
	color: #64748b;
	display: flex;
	align-items: center;
}

.stat-content {
	display: flex;
	flex-direction: column;
}

.stat-value {
	font-size: 1.4rem;
	font-weight: 600;
	color: #0f172a;
	line-height: 1.1;
}

.stat-label {
	font-size: 0.8rem;
	color: #64748b;
	margin-top: 2px;
}

.green-text { color: #16a34a; }
.gray-text { color: #64748b; }
.orange-text { color: #ea580c; }
.red-text { color: #dc2626; }

/* Content Card & Table */
.content-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
	overflow: hidden;
}

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
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 8px 14px;
	width: 360px;
}

.search-icon {
	color: #94a3b8;
	margin-right: 10px;
}

.search-box input {
	border: none;
	outline: none;
	width: 100%;
	font-size: 0.88rem;
	color: #1e293b;
}

.filter-select {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 8px 16px;
	font-size: 0.88rem;
	color: #334155;
	outline: none;
	cursor: pointer;
}

.controls-right {
	display: flex;
	align-items: center;
	gap: 10px;
}

/* Data Table */
.data-table {
	width: 100%;
	border-collapse: collapse;
}

th {
	text-align: left;
	padding: 14px 20px;
	font-size: 0.725rem;
	font-weight: 700;
	color: #64748b;
	border-bottom: 1px solid #f1f5f9;
	letter-spacing: 0.05em;
}

td {
	padding: 14px 20px;
	border-bottom: 1px solid #f8fafc;
	font-size: 0.88rem;
	vertical-align: middle;
}

/* Row Highlights */
tr.row-highlight-orange {
	background-color: #fffbf5;
}

tr.row-highlight-red {
	background-color: #fff5f5;
}

.user-cell {
	display: flex;
	align-items: center;
	gap: 12px;
}

.avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.75rem;
	font-weight: 600;
	flex-shrink: 0;
}

.bg-green {
	background-color: #dcfce7;
	color: #15803d;
}

.bg-orange {
	background-color: #ffedd5;
	color: #c2410c;
}

.user-name {
	font-weight: 500;
	color: #0f172a;
}

.email-cell {
	color: #64748b;
}

.date-cell {
	color: #64748b;
	font-size: 0.85rem;
}

.text-muted {
	color: #94a3b8;
}

/* Inactive Badges */
.inactive-badge {
	display: inline-block;
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 0.78rem;
	font-weight: 500;
}

.badge-red {
	background-color: #ffe4e6;
	color: #e11d48;
}

.badge-orange {
	background-color: #ffedd5;
	color: #ea580c;
}

.badge-yellow {
	background-color: #fef9c3;
	color: #ca8a04;
}

/* Status Badges */
.status-badge {
	display: inline-block;
	padding: 4px 12px;
	border-radius: 12px;
	font-size: 0.78rem;
	font-weight: 500;
}

.status-badge.active {
	background-color: #dcfce7;
	color: #15803d;
}

.status-badge.inactive {
	background-color: #f1f5f9;
	color: #64748b;
}

.status-badge.archived {
	background-color: #ffedd5;
	color: #ea580c;
}

/* Table Footer */
.table-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 14px 20px;
	background: #f8fafc;
	border-top: 1px solid #f1f5f9;
	font-size: 0.8rem;
	color: #64748b;
}

.legend {
	display: flex;
	align-items: center;
	gap: 16px;
}

.legend-title {
	color: #94a3b8;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 6px;
}

.legend-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.legend-dot.orange { background-color: #fed7aa; }
.legend-dot.red { background-color: #fecaca; }

.as-of-date {
	display: flex;
	align-items: center;
	gap: 6px;
	color: #94a3b8;
}

/* Lifecycle policy toggle */
.policy-toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	font-size: 0.72rem;
	font-weight: 700;
	color: #64748b;
	letter-spacing: 0.06em;
	text-align: left;
}
.policy-toggle:hover { color: #334155; }
.chevron-icon {
	margin-left: auto;
	transition: transform 0.2s ease;
	color: #94a3b8;
}
.chevron-open { transform: rotate(180deg); }
.policy-content { margin-top: 18px; }

/* Controls bar user count */
.user-count-label {
	font-size: 0.8rem;
	color: #94a3b8;
	white-space: nowrap;
}

/* Refresh button */
.refresh-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	color: #64748b;
	cursor: pointer;
	transition: background 0.12s, color 0.12s;
	flex-shrink: 0;
}
.refresh-btn:hover { background: #f1f5f9; color: #334155; }

/* Scan count cell */
.scan-count-cell {
	color: #334155;
	font-weight: 600;
	font-size: 0.88rem;
	text-align: center;
}

/* Row actions (status + view) */
.row-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}
.view-profile-btn {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 0.75rem;
	font-weight: 500;
	color: #475569;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 6px;
	padding: 3px 8px;
	text-decoration: none;
	transition: background 0.12s, color 0.12s;
	white-space: nowrap;
}
.view-profile-btn:hover { background: #f1f5f9; color: #0f172a; }

/* Scan History Modal */
.scan-modal-overlay {
	position: fixed; inset: 0;
	background: rgba(15, 23, 42, 0.5);
	display: flex; align-items: center; justify-content: center;
	z-index: 1000; padding: 24px;
}
.scan-modal {
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 20px 60px rgba(0,0,0,0.18);
	width: 100%; max-width: 600px; max-height: 85vh;
	display: flex; flex-direction: column;
	overflow: hidden;
}
.scan-modal-header {
	display: flex; align-items: center; justify-content: space-between;
	padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9; gap: 12px;
}
.scan-modal-title-group {
	display: flex; align-items: center; gap: 14px;
}
.scan-modal-avatar {
	width: 40px; height: 40px; border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	font-size: 0.85rem; font-weight: 600; flex-shrink: 0;
}
.scan-modal-title {
	font-size: 1rem; font-weight: 600; margin: 0 0 2px; color: #0f172a;
}
.scan-modal-subtitle {
	font-size: 0.78rem; color: #64748b; margin: 0;
}
.scan-modal-close {
	background: none; border: none; color: #94a3b8;
	cursor: pointer; padding: 4px; border-radius: 6px;
	transition: color 0.12s, background 0.12s; flex-shrink: 0;
}
.scan-modal-close:hover { color: #334155; background: #f1f5f9; }
.scan-modal-body {
	overflow-y: auto; flex: 1; padding: 8px 0;
}
.scan-modal-state {
	padding: 40px; text-align: center; color: #64748b; font-size: 0.9rem;
}
.scan-modal-error {
	padding: 20px 24px; color: #dc2626; font-size: 0.85rem;
}
.scan-list { display: flex; flex-direction: column; }
.scan-row {
	display: flex; align-items: center; gap: 14px;
	padding: 12px 24px; border-bottom: 1px solid #f8fafc;
	transition: background 0.1s;
}
.scan-row:hover { background: #f8fafc; }
.scan-row:last-child { border-bottom: none; }
.scan-thumb {
	width: 44px; height: 44px; border-radius: 8px;
	background: #f8fafc; border: 1px solid #e2e8f0;
	display: flex; align-items: center; justify-content: center;
	overflow: hidden; flex-shrink: 0;
}
.scan-thumb-img { width: 100%; height: 100%; object-fit: cover; }
.scan-thumb-fallback { font-size: 1.2rem; }
.scan-info {
	flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;
}
.scan-product {
	font-size: 0.85rem; font-weight: 500; color: #1e293b;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.scan-date { font-size: 0.74rem; color: #94a3b8; }
.scan-meta {
	display: flex; align-items: center; gap: 6px; flex-shrink: 0;
}
.scan-confidence {
	font-size: 0.75rem; font-weight: 600; color: #475569;
}
.scan-verdict {
	display: inline-block; padding: 2px 8px; border-radius: 5px;
	font-size: 0.72rem; font-weight: 700;
}
.verdict-green  { background: #dcfce7; color: #15803d; }
.verdict-yellow { background: #fef9c3; color: #a16207; }
.verdict-red    { background: #fee2e2; color: #b91c1c; }
.scan-flagged-badge {
	display: inline-block; padding: 2px 7px; border-radius: 5px;
	font-size: 0.68rem; font-weight: 700;
	background: #fef3c7; color: #92400e;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.state-message, .empty-note { padding: 32px; text-align: center; color: #64748b; font-size: 0.9rem; }
.error-message { padding: 32px; text-align: center; color: #dc2626; font-size: 0.9rem; }

/* Batch selection */
.checkbox-col { width: 44px; text-align: center; }
.checkbox-col input { width: 16px; height: 16px; cursor: pointer; accent-color: #16a34a; }
.batch-toolbar { position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 20px; background: #ecfdf5; border-bottom: 1px solid #bbf7d0; }
.batch-info { display: flex; align-items: center; gap: 12px; }
.batch-count { font-size: 0.85rem; font-weight: 600; color: #15803d; }
.batch-clear { background: transparent; border: none; color: #64748b; font-size: 0.82rem; cursor: pointer; text-decoration: underline; padding: 0; }
.batch-clear:hover { color: #334155; }
.batch-buttons { display: flex; align-items: center; gap: 8px; }
.batch-btn { border: 1px solid transparent; border-radius: 8px; padding: 7px 14px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: background-color 0.15s ease, opacity 0.15s ease; }
.batch-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.batch-btn.notify { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.batch-btn.notify:hover:not(:disabled) { background: #dbeafe; }
</style>