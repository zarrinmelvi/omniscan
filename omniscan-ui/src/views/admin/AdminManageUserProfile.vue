<template>
	<div class="manage-user-profile">
		<!-- Page Header -->
		<div class="page-header">
			<h1 class="page-title">Manage User Profiles</h1>
			<p class="subtitle">View accounts and watch the automatic lifecycle.</p>
		</div>

		<!-- Account lifecycle row -->
		<div class="lifecycle-row-card">
			<div class="lifecycle-row-head">
				<span class="lifecycle-row-title">Account lifecycle</span>
				<button class="how-link" type="button" @click="showHelp = !showHelp">How this works</button>
			</div>

			<p v-if="showHelp" class="lifecycle-help">
				Accounts idle for 6 months (180 days) are archived automatically and emailed a 7-day warning. If no login follows, the account is deleted and its personal data anonymized.
			</p>

			<div class="lc-track">
				<div class="lc-card lc-card--active">
					<div class="lc-card-label">Active</div>
					<div class="lc-card-value">{{ stats.active }}</div>
					<div class="lc-card-desc">Used within the last 6 months</div>
				</div>
				<span class="lc-arrow">→</span>
				<div class="lc-card lc-card--archived">
					<div class="lc-card-label">Archived</div>
					<div class="lc-card-value">{{ stats.archived }}</div>
					<div class="lc-card-desc">After 6 months (180 days) idle. Email sent automatically; 7 days to log back in</div>
				</div>
				<span class="lc-arrow">→</span>
				<div class="lc-card lc-card--deleted">
					<div class="lc-card-label">Deleted</div>
					<div class="lc-card-value">{{ stats.deleted }}</div>
					<div class="lc-card-desc">7 days after archive. Personal data anonymized</div>
				</div>
			</div>
		</div>

		<!-- Controls + content -->
		<div v-if="!isArchivedView" class="content-card">
			<div class="controls-bar">
				<div class="search-box">
					<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					</svg>
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Search by name, username or email"
					/>
				</div>

				<div class="controls-right">
					<select v-model="sortOrder" class="filter-select">
						<option value="Newest">Newest first</option>
						<option value="Oldest">Oldest first</option>
					</select>
					<select v-model="filterStatus" class="filter-select">
						<option value="All">All statuses</option>
						<option value="Active">Active</option>
						<option value="Inactive">Inactive</option>
						<option value="Archived">Archived</option>
					</select>
					<span class="user-count-label">{{ filteredUsers.length }} Consumers</span>
				</div>
			</div>

			<!-- Loading / error states -->
			<p v-if="isLoading" class="state-message">Loading…</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
			<p v-else-if="filteredUsers.length === 0" class="empty-note">No user accounts match the current filters.</p>

			<template v-else>
				<table class="data-table">
					<thead>
						<tr>
							<th>CONSUMER</th>
							<th>EMAIL</th>
							<th>SCANS</th>
							<th>PANTRY ITEMS</th>
							<th>CREATED</th>
							<th>LAST ACTIVE</th>
							<th>STATUS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="u in pagedUsers" :key="u.id">
							<td>
								<div class="user-cell">
									<div class="avatar bg-green">
										<img v-if="u.avatarSrc" :src="u.avatarSrc" :alt="u.name" class="avatar-img" />
										<template v-else>{{ u.initials }}</template>
									</div>
									<div class="consumer-id">
										<span class="user-name">{{ u.name }}</span>
										<span class="consumer-sub">@{{ u.username || 'user' }}</span>
									</div>
								</div>
							</td>
							<td class="email-cell">{{ u.email_masked }}</td>
							<td class="scan-count-cell">{{ u.scan_count }}</td>
							<td>
								<div class="pantry-cell">
									<div class="pantry-bar">
										<div
											class="pantry-bar__fill"
											:class="{ 'pantry-bar__fill--full': u.pantry_item_count >= 100 }"
											:style="{ width: Math.min(100, u.pantry_item_count) + '%' }"
										></div>
									</div>
									<span class="pantry-text">{{ u.pantry_item_count }} / 100</span>
									<span v-if="u.pantry_item_count >= 100" class="limit-chip">Limit reached</span>
								</div>
							</td>
							<td class="date-cell">{{ formatShortDate(u.created_at) }}</td>
							<td class="date-cell">
								{{ relativeLastActive(u.last_active) }}
								<span v-if="u.archives_in_days != null" class="archives-sub">Archives in {{ u.archives_in_days }} days</span>
							</td>
							<td>
								<span class="status-badge" :class="u.status.toLowerCase()">{{ u.status }}</span>
							</td>
						</tr>
					</tbody>
				</table>

				<!-- Pagination -->
				<div v-if="filteredUsers.length > 0" class="pagination-bar">
					<button class="page-nav" :disabled="currentPage === 1" @click="prevPage" aria-label="Previous page">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
					</button>
					<template v-for="(item, idx) in pageItems" :key="idx">
						<button
							v-if="item !== '...'"
							class="page-num"
							:class="{ active: item === currentPage }"
							@click="goToPage(item as number)"
						>{{ item }}</button>
						<span v-else class="page-ellipsis">…</span>
					</template>
					<button class="page-nav" :disabled="currentPage === totalPages" @click="nextPage" aria-label="Next page">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
					</button>
				</div>

				<div class="table-foot-note">
					No "View" button and no manual actions: archiving, the email and deletion all happen automatically. Pantry limit is 100 active items per account (fixed); archived items are not counted. Emails are masked.
				</div>
			</template>
		</div>

		<!-- Archived view -->
		<div v-else class="archived-layout">
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
							placeholder="Search by name, username or email"
						/>
					</div>

					<div class="controls-right">
						<select v-model="sortOrder" class="filter-select">
							<option value="Newest">Newest first</option>
							<option value="Oldest">Oldest first</option>
						</select>
						<select v-model="filterStatus" class="filter-select">
							<option value="All">All statuses</option>
							<option value="Active">Active</option>
							<option value="Inactive">Inactive</option>
							<option value="Archived">Archived</option>
						</select>
						<span class="user-count-label">{{ filteredUsers.length }} Consumers</span>
					</div>
				</div>

				<p v-if="isLoading" class="state-message">Loading…</p>
				<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
				<table v-else class="data-table">
					<thead>
						<tr>
							<th>CONSUMER</th>
							<th>EMAIL</th>
							<th>LAST ACTIVE</th>
							<th>ARCHIVED</th>
							<th>DELETES</th>
							<th>STATUS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-if="filteredUsers.length === 0">
							<td colspan="6" class="empty-note">No archived accounts.</td>
						</tr>
						<tr v-for="u in filteredUsers" :key="u.id" v-else>
							<td>
								<div class="user-cell">
									<div class="avatar bg-orange">
										<img v-if="u.avatarSrc" :src="u.avatarSrc" :alt="u.name" class="avatar-img" />
										<template v-else>{{ u.initials }}</template>
									</div>
									<div class="consumer-id">
										<span class="user-name">{{ u.name }}</span>
										<span class="consumer-sub">@{{ u.username || 'user' }}</span>
									</div>
								</div>
							</td>
							<td class="email-cell">{{ u.email_masked }}</td>
							<td class="date-cell">{{ formatShortDate(u.last_active) }}</td>
							<td class="date-cell">{{ formatShortDate(u.archived_on) }}</td>
							<td>
								<div>
									<div class="deletes-main">{{ formatShortDate(u.deletes_on) }}</div>
									<div class="deletes-sub">in {{ u.deletes_in_days }} days</div>
								</div>
							</td>
							<td>
								<span class="status-badge archived">Archived</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<aside class="email-preview-card">
				<div class="email-preview-title">Automatic email</div>
				<p class="email-preview-sub">Sent when an account is archived. Recorded in System Logs.</p>
				<div class="email-preview-box">
					<p class="epb-subject">Subject: Your OmniScan account will be deleted in 7 days</p>
					<p class="epb-line">Hi [First name],</p>
					<p class="epb-line">Your account has been inactive for 6 months and has been archived.</p>
					<p class="epb-line">Log in before [date] to keep it. After that, your account will be deleted and your personal data anonymized.</p>
					<p class="epb-line">The OmniScan team</p>
				</div>
				<p class="email-preview-note">Logging in during the 7 days restores the account to Active and cancels the deletion.</p>
			</aside>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

interface ApiUserRow {
	id: number
	name: string
	username: string | null
	email: string
	email_masked: string
	avatar_base64: string | null
	created_at: string
	last_active: string
	inactive_days: number
	inactive_for: string | null
	status: 'Active' | 'Inactive' | 'Archived'
	deletion_due: boolean
	scan_count: number
	pantry_item_count: number
	archives_in_days: number | null
	archived_on: string | null
	deletes_on: string | null
	deletes_in_days: number | null
}

interface UserRow extends ApiUserRow {
	initials: string
	avatarSrc: string | null
	sortTs: number
}

interface Stats {
	total: number
	active: number
	inactive: number
	archived: number
	deleted: number
}

const searchQuery = ref('')
const filterStatus = ref<'All' | 'Active' | 'Inactive' | 'Archived'>('All')
const sortOrder = ref<'Newest' | 'Oldest'>('Newest')
const showHelp = ref(false)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const users = ref<UserRow[]>([])
const stats = ref<Stats>({ total: 0, active: 0, inactive: 0, archived: 0, deleted: 0 })
const currentPage = ref(1)

function initialsOf(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean)
	if (parts.length === 0) return '?'
	return parts
		.slice(0, 2)
		.map((p) => p[0])
		.join('')
		.toUpperCase()
}

function mapRow(r: ApiUserRow): UserRow {
	return {
		...r,
		initials: initialsOf(r.name),
		avatarSrc: r.avatar_base64
			? r.avatar_base64.startsWith('data:')
				? r.avatar_base64
				: `data:image/jpeg;base64,${r.avatar_base64}`
			: null,
		sortTs: new Date(r.last_active || r.created_at).getTime() || 0,
	}
}

async function fetchUsers(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		const data = await apiFetch<{ users: ApiUserRow[]; stats: Stats }>('/api/admin/users', {
			isAdmin: true,
		})
		users.value = (data.users ?? []).map(mapRow)
		stats.value = data.stats ?? { total: 0, active: 0, inactive: 0, archived: 0, deleted: 0 }
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load user accounts.'
		console.error('Failed to fetch users:', err)
	} finally {
		isLoading.value = false
	}
}

const isArchivedView = computed(() => filterStatus.value === 'Archived')

const filteredUsers = computed<UserRow[]>(() => {
	const query = searchQuery.value.trim().toLowerCase()
	const filtered = users.value.filter((u) => {
		const matchesQuery =
			!query ||
			u.name.toLowerCase().includes(query) ||
			(u.username ?? '').toLowerCase().includes(query) ||
			u.email_masked.toLowerCase().includes(query)
		const matchesStatus = filterStatus.value === 'All' || u.status === filterStatus.value
		return matchesQuery && matchesStatus
	})

	return [...filtered].sort((a, b) =>
		sortOrder.value === 'Newest' ? b.sortTs - a.sortTs : a.sortTs - b.sortTs
	)
})

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / PAGE_SIZE)))

const pagedUsers = computed<UserRow[]>(() => {
	const start = (currentPage.value - 1) * PAGE_SIZE
	return filteredUsers.value.slice(start, start + PAGE_SIZE)
})

const pageItems = computed<(number | '...')[]>(() => {
	const total = totalPages.value
	const current = currentPage.value
	const MAX = 10

	if (total <= MAX) {
		return Array.from({ length: total }, (_, i) => i + 1)
	}

	const items: (number | '...')[] = []
	const SIBLINGS = 2
	const left = Math.max(2, current - SIBLINGS)
	const right = Math.min(total - 1, current + SIBLINGS)

	items.push(1)
	if (left > 2) items.push('...')
	for (let p = left; p <= right; p++) items.push(p)
	if (right < total - 1) items.push('...')
	items.push(total)
	return items
})

function goToPage(p: number): void {
	if (p < 1 || p > totalPages.value) return
	currentPage.value = p
}

function nextPage(): void {
	if (currentPage.value < totalPages.value) currentPage.value++
}

function prevPage(): void {
	if (currentPage.value > 1) currentPage.value--
}

watch([searchQuery, filterStatus, sortOrder], () => {
	currentPage.value = 1
})

watch(totalPages, (tp) => {
	if (currentPage.value > tp) currentPage.value = tp
})

function formatShortDate(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	return Number.isNaN(d.getTime())
		? '—'
		: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function relativeLastActive(iso: string): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)))
	if (days === 0) return 'Today'
	if (days === 1) return 'Yesterday'
	return `${days} days ago`
}

onMounted(fetchUsers)
</script>

<style scoped>
.manage-user-profile {
	padding: 12px;
	background: #f8fafc;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	color: #334155;
}

/* Page Header */
.page-header {
	margin-bottom: 20px;
}
.page-title {
	font-size: 1.5rem;
	font-weight: 600;
	margin: 0 0 4px;
	color: #0f172a;
}
.subtitle {
	color: #64748b;
	font-size: 0.88rem;
	margin: 0 0 20px;
}

/* Lifecycle row */
.lifecycle-row-card {
	background: #fff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 20px 24px;
	margin-bottom: 24px;
}
.lifecycle-row-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16px;
}
.lifecycle-row-title {
	font-size: 0.95rem;
	font-weight: 600;
	color: #0f172a;
}
.how-link {
	background: none;
	border: none;
	color: #16a34a;
	font-size: 0.82rem;
	font-weight: 600;
	cursor: pointer;
	text-decoration: underline;
}
.lifecycle-help {
	font-size: 0.82rem;
	color: #64748b;
	line-height: 1.5;
	margin: 0 0 16px;
}
.lc-track {
	display: flex;
	align-items: stretch;
	gap: 12px;
}
.lc-card {
	flex: 1;
	border: 1px solid #e2e8f0;
	border-top-width: 3px;
	border-radius: 10px;
	padding: 16px 18px;
	background: #fff;
}
.lc-card--active {
	border-top-color: #16a34a;
}
.lc-card--archived {
	border-top-color: #ea580c;
}
.lc-card--deleted {
	border-top-color: #dc2626;
}
.lc-card-label {
	font-size: 0.8rem;
	color: #64748b;
	margin-bottom: 6px;
}
.lc-card-value {
	font-size: 1.8rem;
	font-weight: 700;
	color: #0f172a;
	line-height: 1;
	margin-bottom: 8px;
}
.lc-card-desc {
	font-size: 0.76rem;
	color: #94a3b8;
	line-height: 1.4;
}
.lc-arrow {
	display: flex;
	align-items: center;
	color: #cbd5e1;
	font-size: 1.2rem;
}

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
	width: 260px;
	flex-shrink: 0;
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

.user-count-label {
	font-size: 0.8rem;
	color: #94a3b8;
	white-space: nowrap;
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

.consumer-id {
	display: flex;
	flex-direction: column;
}

.consumer-sub {
	font-size: 0.74rem;
	color: #94a3b8;
}

.email-cell {
	color: #64748b;
}

.date-cell {
	color: #64748b;
	font-size: 0.85rem;
}

.scan-count-cell {
	color: #334155;
	font-weight: 600;
	font-size: 0.88rem;
	text-align: center;
}

/* Pantry usage */
.pantry-cell {
	display: flex;
	align-items: center;
	gap: 10px;
}
.pantry-bar {
	width: 90px;
	height: 8px;
	border-radius: 9999px;
	background: #f1f5f9;
	overflow: hidden;
	flex-shrink: 0;
}
.pantry-bar__fill {
	height: 100%;
	background: #16a34a;
	border-radius: 9999px;
	transition: width 0.3s;
}
.pantry-bar__fill--full {
	background: #dc2626;
}
.pantry-text {
	font-size: 0.8rem;
	color: #64748b;
	white-space: nowrap;
}
.limit-chip {
	font-size: 0.68rem;
	font-weight: 700;
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 9999px;
	padding: 2px 8px;
	white-space: nowrap;
}

.archives-sub {
	display: block;
	font-size: 0.72rem;
	color: #94a3b8;
	margin-top: 2px;
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

/* Table foot note */
.table-foot-note {
	padding: 14px 20px;
	background: #f8fafc;
	border-top: 1px solid #f1f5f9;
	font-size: 0.78rem;
	color: #94a3b8;
	line-height: 1.5;
}

/* Archived layout */
.archived-layout {
	display: grid;
	grid-template-columns: 1fr 340px;
	gap: 20px;
	align-items: start;
}
@media (max-width: 1024px) {
	.archived-layout {
		grid-template-columns: 1fr;
	}
}

.deletes-main {
	font-weight: 700;
	color: #0f172a;
}
.deletes-sub {
	font-size: 0.74rem;
	color: #94a3b8;
}

/* Email preview */
.email-preview-card {
	background: #fff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 20px;
}
.email-preview-title {
	font-size: 0.95rem;
	font-weight: 600;
	color: #0f172a;
	margin-bottom: 4px;
}
.email-preview-sub {
	font-size: 0.78rem;
	color: #64748b;
	margin: 0 0 14px;
}
.email-preview-box {
	background: #fffdf5;
	border: 1px solid #fde68a;
	border-radius: 10px;
	padding: 16px;
}
.epb-subject {
	font-weight: 700;
	color: #0f172a;
	font-size: 0.82rem;
	margin: 0 0 10px;
}
.epb-line {
	font-size: 0.8rem;
	color: #475569;
	margin: 0 0 8px;
	line-height: 1.5;
}
.email-preview-note {
	font-size: 0.74rem;
	color: #94a3b8;
	margin: 12px 0 0;
	line-height: 1.5;
}

/* States */
.avatar-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: 50%;
}
.state-message,
.empty-note {
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

/* Pagination */
.pagination-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 16px 20px;
	border-top: 1px solid #f1f5f9;
	flex-wrap: wrap;
}
.page-num,
.page-nav {
	min-width: 34px;
	height: 34px;
	padding: 0 10px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 1px solid #e2e8f0;
	background: #ffffff;
	color: #334155;
	border-radius: 8px;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.page-num:hover:not(.active),
.page-nav:hover:not(:disabled) {
	background: #f1f5f9;
	border-color: #cbd5e1;
}
.page-num.active {
	background: #008744;
	border-color: #008744;
	color: #ffffff;
	cursor: default;
}
.page-nav:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
.page-ellipsis {
	min-width: 24px;
	text-align: center;
	color: #94a3b8;
	font-weight: 600;
	user-select: none;
}
</style>
