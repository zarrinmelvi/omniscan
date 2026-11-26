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
			</div>

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
						<option value="Online">Online</option>
						<option value="Offline">Offline</option>
					</select>
					<span class="user-count-label">{{ totalCount }} Consumers</span>
				</div>
			</div>

			<!-- Loading / error states -->
			<div v-if="isLoading" class="data-table-wrap">
				<table class="data-table">
					<thead>
						<tr><th>CONSUMER</th><th>EMAIL</th><th>PANTRY ITEMS</th><th>CREATED</th><th>STATUS</th></tr>
					</thead>
					<tbody>
						<tr v-for="n in 8" :key="n" class="users-sk-row">
							<td><div class="sk-cell shimmer" style="width:140px;height:14px"></div></td>
							<td><div class="sk-cell shimmer" style="width:120px;height:12px"></div></td>
							<td><div class="sk-cell shimmer" style="width:100px;height:10px"></div></td>
							<td><div class="sk-cell shimmer" style="width:50px;height:12px"></div></td>
							<td><div class="sk-cell shimmer" style="width:60px;height:20px;border-radius:9999px"></div></td>
						</tr>
					</tbody>
				</table>
			</div>
			<div v-else-if="errorMessage" class="admin-error-banner">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				<span>{{ errorMessage }}</span>
				<button class="admin-error-retry" @click="fetchUsers">Try again</button>
			</div>
			<p v-else-if="filteredUsers.length === 0" class="empty-note">No user accounts match the current filters.</p>

			<template v-else>
				<table class="data-table">
					<thead>
						<tr>
							<th>CONSUMER</th>
							<th>EMAIL</th>
							<th>PANTRY ITEMS</th>
							<th>CREATED</th>
							<th>STATUS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="u in pagedUsers" :key="u.id" class="row-clickable" tabindex="0" @click="openModal(u.id)" @keydown.enter="openModal(u.id)">
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
							<td>
								<span class="status-badge" :class="statusBadgeLabel(u).toLowerCase()">{{ statusBadgeLabel(u) }}</span>
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
							<option value="Online">Online</option>
							<option value="Offline">Offline</option>
						</select>
						<span class="user-count-label">{{ totalCount }} Consumers</span>
					</div>
				</div>

				<div v-if="isLoading" class="data-table-wrap">
					<table class="data-table">
						<thead>
							<tr><th>CONSUMER</th><th>EMAIL</th><th>LAST ACTIVE</th><th>ARCHIVED</th><th>DELETES</th><th>STATUS</th></tr>
						</thead>
						<tbody>
							<tr v-for="n in 5" :key="n" class="users-sk-row">
								<td><div class="sk-cell shimmer" style="width:130px;height:14px"></div></td>
								<td><div class="sk-cell shimmer" style="width:120px;height:12px"></div></td>
								<td><div class="sk-cell shimmer" style="width:60px;height:12px"></div></td>
								<td><div class="sk-cell shimmer" style="width:60px;height:12px"></div></td>
								<td><div class="sk-cell shimmer" style="width:80px;height:12px"></div></td>
								<td><div class="sk-cell shimmer" style="width:60px;height:20px;border-radius:9999px"></div></td>
							</tr>
						</tbody>
					</table>
				</div>
				<div v-else-if="errorMessage" class="admin-error-banner">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<span>{{ errorMessage }}</span>
					<button class="admin-error-retry" @click="fetchUsers">Try again</button>
				</div>
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
						<tr v-for="u in filteredUsers" :key="u.id" v-else class="row-clickable" tabindex="0" @click="openModal(u.id)" @keydown.enter="openModal(u.id)">
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
								<span class="status-badge" :class="statusBadgeLabel(u).toLowerCase()">{{ statusBadgeLabel(u) }}</span>
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
<!-- Consumer Detail Modal (Ticket 1) -->
<Teleport to="body">
<div v-if="modal.open" class="cdm-backdrop" role="dialog" aria-modal="true" aria-labelledby="cdm-title" @click.self="closeModal">
<div class="cdm-panel">
<div class="cdm-header">
<div class="cdm-avatar">
	<img v-if="modal.avatarSrc" :src="modal.avatarSrc" alt="" class="cdm-avatar-img" />
	<template v-else>{{ modal.initials }}</template>
</div>
<div class="cdm-title-block">
<span id="cdm-title" class="cdm-name">{{ modal.name }}</span>
<span class="cdm-username">@{{ modal.username || 'user' }}</span>
</div>
<span class="cdm-status" :class="modal.statusClass">{{ modal.status }}</span>
</div>
<div v-if="modal.loading" class="cdm-loading">
<div class="cdm-sk shimmer"></div>
<div class="cdm-sk shimmer" style="margin-top:12px"></div>
</div>
<div v-else-if="modal.error" class="cdm-error">{{ modal.error }}</div>
<div v-else class="cdm-body">
<div class="cdm-allergen-box">
<div class="cdm-allergen-header-row">
<span class="cdm-allergen-label">Declared Allergens</span>
<button v-if="!modal.allergensRevealed" class="cdm-allergen-btn" :disabled="modal.allergenLoading" @click="showAllergens">{{ modal.allergenLoading ? 'Loading...' : 'Show Allergens' }}</button>
<button v-else class="cdm-allergen-btn" @click="hideAllergens">Hide Allergens</button>
</div>
<div v-if="!modal.allergensRevealed" class="cdm-allergen-masked">
<span class="cdm-masked-pill">●●●●●</span>
<span class="cdm-masked-pill">●●●●●</span>
<span class="cdm-masked-pill">●●●●●</span>
</div>
<div v-else class="cdm-allergen-revealed">
<div v-if="modal.allergens.length === 0" class="cdm-no-allergens">No declared allergens.</div>
<div v-else class="cdm-allergen-tags">
<span v-for="allergen in modal.allergens" :key="allergen" class="cdm-allergen-tag">{{ allergen }}</span>
</div>
<div class="cdm-allergen-note">Viewed by {{ modal.viewedBy }} · recorded in System Logs at {{ modal.viewedTime }}</div>
</div>
<div v-if="modal.allergenError" class="cdm-allergen-error">{{ modal.allergenError }}</div>
</div>
<div class="cdm-pantry-header">
<span class="cdm-pantry-title">Consumer Pantry Inventory ({{ modal.pantryCount }} / 100)</span>
<span class="cdm-readonly-pill">Read-Only</span>
</div>
<p v-if="modal.pantryItems.length === 0" class="cdm-empty">No items in this consumer's pantry yet.</p>
<table v-else class="cdm-table">
<thead>
<tr>
<th>PANTRY ITEM</th>
<th>CATEGORY</th>
<th>EXPIRY</th>
<th></th>
</tr>
</thead>
<tbody>
<tr v-for="item in modal.pantryItems" :key="item.id">
<td class="cdm-item-name">{{ item.product_name }}</td>
<td><span class="cdm-cat-chip">{{ item.category }}</span></td>
<td class="cdm-expiry">{{ formatShortDate(item.expiration_date) }}</td>
<td><button class="cdm-catalog-btn" @click="viewInCatalog(item.product_id)">View in catalog ›</button></td>
</tr>
</tbody>
</table>
</div>
<div class="cdm-footer">
<button class="cdm-close-btn" @click="closeModal">Close</button>
</div>
</div>
</div>
</Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
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
	is_online?: boolean
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
const filterStatus = ref<'All' | 'Online' | 'Offline'>('All')
const sortOrder = ref<'Newest' | 'Oldest'>('Newest')

function statusBadgeLabel(u: UserRow): 'Online' | 'Offline' {
	return u.is_online ? 'Online' : 'Offline'
}
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
		sortTs: new Date(r.created_at).getTime() || 0,
	}
}

const PAGE_SIZE = 10
const totalCount = ref(0)
const totalPages = ref(1)
let fetchSeq = 0

async function fetchUsers(): Promise<void> {
	const seq = ++fetchSeq
	isLoading.value = true
	errorMessage.value = null
	try {
		const params = new URLSearchParams({
			page: String(currentPage.value),
			pageSize: String(PAGE_SIZE),
			sort: sortOrder.value,
			status: filterStatus.value,
		})
		const search = searchQuery.value.trim()
		if (search) params.set('search', search)
		const data = await apiFetch<{
			users: ApiUserRow[]
			pagination: { page: number; page_size: number; total: number; total_pages: number }
			lifecycle: { active: number; archived: number; deleted: number }
		}>(`/api/admin/users?${params.toString()}`, { isAdmin: true })
		if (seq !== fetchSeq) return
		users.value = (data.users ?? []).map(mapRow)
		totalCount.value = data.pagination?.total ?? 0
		totalPages.value = Math.max(1, data.pagination?.total_pages ?? 1)
		// Server clamps out-of-range pages; stay in sync without refetching.
		if (data.pagination?.page && data.pagination.page !== currentPage.value) {
			skipNextPageWatch = true
			currentPage.value = data.pagination.page
		}
		stats.value = {
			...stats.value,
			active: data.lifecycle?.active ?? 0,
			archived: data.lifecycle?.archived ?? 0,
			deleted: data.lifecycle?.deleted ?? 0,
		}
	} catch (err) {
		if (seq !== fetchSeq) return
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load user accounts.'
		console.error('Failed to fetch users:', err)
	} finally {
		if (seq === fetchSeq) isLoading.value = false
	}
}

const isArchivedView = computed(() => false)

// Rows for the current page (already filtered/sorted by the server).
const filteredUsers = computed<UserRow[]>(() => users.value)
const pagedUsers = filteredUsers

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

let skipNextPageWatch = false
let searchTimer: ReturnType<typeof setTimeout> | null = null

function resetAndFetch(): void {
	if (currentPage.value !== 1) {
		// The page watcher triggers the fetch.
		currentPage.value = 1
	} else {
		void fetchUsers()
	}
}

watch(searchQuery, () => {
	if (searchTimer) clearTimeout(searchTimer)
	searchTimer = setTimeout(resetAndFetch, 300)
})

const route = useRoute()

function firstQueryValue(v: unknown): string {
	const raw = Array.isArray(v) ? v[0] : v
	return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

/** Maps ?status= (or ?sort=) from the URL onto the status filter. status wins over sort. */
function applyQueryFilters(): void {
	const status = firstQueryValue(route.query.status)
	const value = status || firstQueryValue(route.query.sort)
	if (value === 'online') filterStatus.value = 'Online'
	else if (value === 'offline' && status) filterStatus.value = 'Offline'
}

// Apply before the filter watcher exists so the first request already carries the status.
applyQueryFilters()

watch([filterStatus, sortOrder], () => {
	if (searchTimer) clearTimeout(searchTimer)
	resetAndFetch()
})

watch(
	() => route.query,
	() => {
		const before = filterStatus.value
		applyQueryFilters()
		// If the filter changed, the watcher above already resets and fetches.
		if (filterStatus.value === before) resetAndFetch()
	},
)

watch(currentPage, () => {
	if (skipNextPageWatch) {
		skipNextPageWatch = false
		return
	}
	void fetchUsers()
})

function formatShortDate(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	return Number.isNaN(d.getTime())
		? '—'
		: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}



// -- Consumer Detail Modal (Ticket 1) -----------------------------------------
import { useRouter } from 'vue-router'
const router = useRouter()

interface ModalPantryItem {
id: number
product_id: number
product_name: string
category: string
expiration_date: string | null
}

const modal = ref<{
open: boolean
loading: boolean
error: string | null
userId: number | null
name: string
username: string | null
status: string
statusClass: string
initials: string
avatarSrc: string | null
pantryCount: number
pantryItems: ModalPantryItem[]; allergensRevealed: boolean; allergens: string[]; allergenLoading: boolean; allergenError: string | null; viewedBy: string; viewedTime: string
}>({
open: false, loading: false, error: null, userId: null,
name: '', username: null, status: '', statusClass: '', initials: '', avatarSrc: null,
pantryCount: 0, pantryItems: [], allergensRevealed: false, allergens: [], allergenLoading: false, allergenError: null, viewedBy: '', viewedTime: '',
})

function statusClassOf(s: string): string {
const l = s.toLowerCase()
if (l === 'active') return 'cdm-status--active'
if (l === 'archived') return 'cdm-status--archived'
return 'cdm-status--inactive'
}

async function openModal(userId: number): Promise<void> {
modal.value = {
open: true, loading: true, error: null, userId: userId,
name: '', username: null, status: '', statusClass: '', initials: '', avatarSrc: null,
pantryCount: 0, pantryItems: [], allergensRevealed: false, allergens: [], allergenLoading: false, allergenError: null, viewedBy: '', viewedTime: '',
}
try {
type DetailResponse = {
success: boolean
user: {
id: number
name: string
username: string | null
status: string
avatar_base64: string | null
pantry_items: ModalPantryItem[]
pantry_count: number
pantry_max: number
}
}
const data = await apiFetch<DetailResponse>('/api/admin/users/' + userId, { isAdmin: true })
const u = data.user
const rawAvatar = u.avatar_base64
const avatarSrc = rawAvatar
	? rawAvatar.startsWith('data:') ? rawAvatar : `data:image/jpeg;base64,${rawAvatar}`
	: null
modal.value = {
open: true, loading: false, error: null, userId: userId,
name: u.name,
username: u.username,
status: u.status,
statusClass: statusClassOf(u.status),
initials: initialsOf(u.name),
avatarSrc,
pantryCount: u.pantry_count,
pantryItems: u.pantry_items,
allergensRevealed: false, allergens: [], allergenLoading: false, allergenError: null, viewedBy: '', viewedTime: '',
}
} catch (err) {
modal.value.loading = false
modal.value.error = err instanceof ApiError ? err.message : 'Failed to load consumer details.'
}
}

function closeModal(): void {
modal.value.open = false
}

async function showAllergens(): Promise<void> {
	const userId = modal.value.userId
	if (!userId) return
	modal.value.allergenLoading = true
	modal.value.allergenError = null
	try {
		// Step 1: Write audit log — MUST succeed before allergens are revealed
		type LogResponse = { success: boolean; viewed_by: string; time_label: string }
		const logResult = await apiFetch<LogResponse>('/api/admin/users/' + userId + '/log-allergen-view', { method: 'POST', isAdmin: true })
		// Step 2: Fetch allergens only if log succeeded
		type AllergenResponse = { success: boolean; allergens: string[] }
		const allergenResult = await apiFetch<AllergenResponse>('/api/admin/users/' + userId + '/allergens', { isAdmin: true })
		modal.value.allergens = allergenResult.allergens
		modal.value.viewedBy = logResult.viewed_by
		modal.value.viewedTime = logResult.time_label
		modal.value.allergensRevealed = true
	} catch (err) {
		modal.value.allergenError = err instanceof ApiError ? err.message : 'Failed to load allergens. Please try again.'
	} finally {
		modal.value.allergenLoading = false
	}
}

function hideAllergens(): void {
	modal.value.allergensRevealed = false
	modal.value.allergens = []
	modal.value.allergenError = null
}

function viewInCatalog(productId: number): void {
closeModal()
void router.push('/admin/productsdata?tab=products&highlight=' + productId)
}
onMounted(fetchUsers)
onBeforeUnmount(() => {
	if (searchTimer) clearTimeout(searchTimer)
})
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
	align-items: center;
	gap: 12px;
	padding: 16px 24px;
	border-bottom: 1px solid #f1f5f9;
	flex-wrap: wrap;
}

.search-box {
	height: 40px;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 0 12px;
	background: #fff;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	flex: 1;
	min-width: 200px;
}

.search-box input {
	border: none;
	outline: none;
	flex: 1;
	font-size: 0.875rem;
	color: #1e293b;
	background: transparent;
	height: 100%;
}

.controls-right {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-shrink: 0;
}

.filter-select {
	height: 40px;
	padding: 0 12px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	font-size: 0.875rem;
	color: #334155;
	background: #fff;
	cursor: pointer;
}

.user-count-label {
	font-size: 0.82rem;
	color: #94a3b8;
	white-space: nowrap;
	display: flex;
	align-items: center;
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
.status-badge.active,
.status-badge.online {
	background-color: #dcfce7;
	color: #15803d;
}
.status-badge.inactive,
.status-badge.offline {
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

/* Group A: Error banner */
.admin-error-banner { display:flex; align-items:center; gap:10px; padding:14px 18px; margin:16px 20px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; font-size:0.85rem; color:#b91c1c; }
.admin-error-banner svg { flex-shrink:0; color:#dc2626; }
.admin-error-banner span { flex:1; }
.admin-error-retry { border:1px solid #fca5a5; background:#fff; border-radius:6px; padding:5px 14px; font-size:0.78rem; font-weight:600; color:#dc2626; cursor:pointer; flex-shrink:0; }
.admin-error-retry:hover { background:#fef2f2; }

/* Group B: Table skeleton */
.data-table-wrap { overflow-x:auto; }
.users-sk-row td { padding:14px 20px; border-bottom:1px solid #f8fafc; }
.sk-cell { border-radius:6px; display:block; }
.shimmer {
	background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: -100% 0; }
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
.row-clickable { cursor: pointer; }
.row-clickable:hover td { background: #f8fafc; }
.row-clickable:focus-visible { outline: 2px solid #008744; outline-offset: -2px; }
.cdm-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
.cdm-panel { background: #fff; border-radius: 16px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.cdm-header { display: flex; align-items: center; gap: 12px; padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9; }
.cdm-avatar { width: 42px; height: 42px; border-radius: 50%; background: #c05328; color: #fff; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cdm-avatar-img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; display: block; }
.cdm-title-block { flex: 1; min-width: 0; }
.cdm-name { display: block; font-size: 1.05rem; font-weight: 700; color: #0f172a; }
.cdm-username { font-size: 0.8rem; color: #94a3b8; }
.cdm-status { padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }
.cdm-status--active { background: #dcfce7; color: #15803d; }
.cdm-status--archived { background: #ffedd5; color: #ea580c; }
.cdm-status--inactive { background: #f1f5f9; color: #64748b; }
.cdm-loading { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
.cdm-sk { height: 72px; border-radius: 10px; }
.cdm-error { padding: 24px; color: #dc2626; font-size: 0.88rem; text-align: center; }
.cdm-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }
.cdm-allergen-label { font-size: 0.88rem; font-weight: 700; color: #c2410c; }
.cdm-pantry-header { display: flex; align-items: center; gap: 10px; }
.cdm-pantry-title { font-size: 1rem; font-weight: 700; color: #0f172a; }
.cdm-readonly-pill { background: #f1f5f9; color: #64748b; border-radius: 9999px; padding: 2px 10px; font-size: 0.72rem; font-weight: 600; }
.cdm-empty { font-size: 0.85rem; color: #9ca3af; text-align: center; padding: 20px 0; margin: 0; border: 1px solid #f1f5f9; border-radius: 8px; }
.cdm-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
.cdm-table th { text-align: left; padding: 8px 12px; font-size: 0.7rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.04em; border-bottom: 1px solid #f1f5f9; }
.cdm-table td { padding: 10px 12px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
.cdm-table tbody tr:last-child td { border-bottom: none; }
.cdm-item-name { font-weight: 500; color: #0f172a; }
.cdm-cat-chip { background: #f1f5f9; color: #475569; border-radius: 6px; padding: 2px 8px; font-size: 0.75rem; font-weight: 500; }
.cdm-expiry { color: #64748b; white-space: nowrap; }
.cdm-catalog-btn { background: none; border: none; color: #008744; font-size: 0.8rem; font-weight: 600; cursor: pointer; padding: 0; white-space: nowrap; }
.cdm-catalog-btn:hover { text-decoration: underline; }
.cdm-footer { padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; }
.cdm-close-btn { border: 1px solid #e2e8f0; background: #fff; color: #374151; border-radius: 8px; padding: 8px 20px; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
.cdm-close-btn:hover { background: #f8fafc; }
.cdm-allergen-box { background: #fff8f1; border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.cdm-allergen-header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cdm-allergen-label { font-size: 0.88rem; font-weight: 700; color: #c2410c; }
.cdm-allergen-btn { border: 1px solid #d1d5db; background: #fff; color: #374151; border-radius: 7px; padding: 5px 14px; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.cdm-allergen-btn:hover:not(:disabled) { background: #f9fafb; }
.cdm-allergen-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.cdm-allergen-masked { display: flex; gap: 8px; flex-wrap: wrap; }
.cdm-masked-pill { background: #f1f5f9; color: #94a3b8; border-radius: 9999px; padding: 3px 12px; font-size: 0.8rem; letter-spacing: 2px; }
.cdm-allergen-revealed { display: flex; flex-direction: column; gap: 6px; }
.cdm-allergen-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.cdm-allergen-tag { background: #fff; border: 1px solid #fb923c; color: #c2410c; border-radius: 9999px; padding: 3px 12px; font-size: 0.8rem; font-weight: 600; }
.cdm-no-allergens { font-size: 0.82rem; color: #9ca3af; font-style: italic; }
.cdm-allergen-note { font-size: 0.74rem; color: #9ca3af; }
.cdm-allergen-error { font-size: 0.82rem; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 10px; }</style>
