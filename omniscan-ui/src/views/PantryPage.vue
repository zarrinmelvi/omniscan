<template>
	<ion-page>
		<!-- Fixed White Header Controls -->
		<div class="header-container">
			<!-- Search bar -->
			<div class="search-row">
				<ion-searchbar v-model="searchQuery" placeholder="Search" class="search-bar" :show-clear-button="searchQuery ? 'always' : 'never'" />
			</div>

			<!-- Active / Archived Segment Container -->
			<div class="view-toggle-wrap">
				<div class="view-toggle">
					<button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': view === 'active' }" @click="view = 'active'">
						Active
					</button>
					<button
						type="button"
						class="toggle-btn"
						:class="{ 'toggle-btn--archived-active': view === 'archived' }"
						@click="view = 'archived'">
						<ion-icon :icon="archiveOutline" />
						Archived
						<span v-if="archivedItems.length" class="count-badge">{{ archivedItems.length }}</span>
					</button>
				</div>
			</div>

			<!-- ACTIVE VIEW FILTERS -->
			<template v-if="view === 'active'">
				<div v-if="expiringOnly" class="filter-banner">
					<span>Showing items expiring soon</span>
					<button type="button" class="filter-clear" @click="expiringOnly = false">
						Clear
						<ion-icon :icon="closeOutline" />
					</button>
				</div>

				<div class="pill-row">
					<button
						v-for="loc in locationOptions"
						:key="loc"
						type="button"
						class="pill"
						:class="{ 'pill--active': locationFilter === loc }"
						@click="locationFilter = loc">
						{{ loc }}
					</button>
				</div>

				<div class="scanned-stat-row">
					<span class="scanned-stat-row__label">Total Items Scanned</span>
					<span class="scanned-stat-row__value">{{ totalItemsScanned }}</span>
				</div>

				<div class="sort-row">
					<span class="sort-row__label">Sort ↕</span>
					<ion-select
						v-model="sortOption"
						interface="popover"
						:interface-options="{ cssClass: 'compact-sort-popover' }"
						class="sort-text-select">
						<ion-select-option value="soonest">Expiring soonest</ion-select-option>
						<ion-select-option value="latest">Expiring latest</ion-select-option>
						<ion-select-option value="name">Name A–Z</ion-select-option>
					</ion-select>
				</div>
			</template>

			<!-- ARCHIVED VIEW HEADER INFO -->
			<template v-else>
				<div class="archived-header-row">
					<span class="archived-subhead">Items you've marked as consumed</span>
					<span class="auto-delete-info">
						<ion-icon :icon="timeOutline" />
						Auto-deleted after 7 days
					</span>
				</div>
			</template>
		</div>

		<!-- Scrollable Content -->
		<ion-content :fullscreen="true" class="pantry-content">
			<div class="pantry-wrap">
				<!-- ACTIVE VIEW GRID -->
				<template v-if="view === 'active'">
					<div v-if="isLoading" class="state-block">
						<ion-spinner name="crescent" />
					</div>

					<div v-else-if="loadError" class="state-block">
						<ion-icon :icon="alertCircleOutline" size="large" color="danger" />
						<p>{{ loadError }}</p>
						<ion-button @click="fetchPantryItems">Try again</ion-button>
					</div>

					<div v-else-if="filteredActiveItems.length === 0" class="empty-state">
						<ion-icon :icon="fileTrayOutline" class="empty-icon" />
						<p>{{ items.length === 0 ? 'Your pantry is empty.' : 'No items match your search or filter.' }}</p>
					</div>

					<div v-else class="card-grid">
						<div
							v-for="item in filteredActiveItems"
							:key="item.id"
							class="pantry-card"
							role="button"
							tabindex="0"
							@click="goToDetail(item.id)"
							@keydown.enter="goToDetail(item.id)">
							<div class="card-top">
								<div class="expiry-info">
									<span class="expiry-dot" :class="dotClass(item)"></span>
									<span class="expiry-days">{{ daysLabel(item) }}</span>
								</div>
								<button
									type="button"
									class="check-btn"
									:disabled="isArchiving"
									@click.stop="openConsumeModal(item)"
									aria-label="Mark as consumed">
									<ion-icon :icon="checkmarkCircleOutline" />
								</button>
							</div>

							<div class="card-image">
								<img
									v-if="item.product.image_base64"
									:src="item.product.image_base64"
									:alt="item.product.product_name"
									class="product-photo" />
								<div v-else class="placeholder-box">
									<ion-icon :icon="imageOutline" class="placeholder-icon" />
								</div>
							</div>

							<div class="card-body">
								<h3 class="card-title">{{ item.product.product_name }}</h3>
								<div class="card-meta">
									<span class="location-text">{{ item.storage_location }}</span>
									<span class="quantity-badge">{{ formatQuantity(item) }}</span>
								</div>
							</div>
						</div>
					</div>
				</template>

				<!-- ARCHIVED VIEW LIST -->
				<template v-else>
					<div v-if="isLoading" class="state-block">
						<ion-spinner name="crescent" />
					</div>

					<div v-else-if="loadError" class="state-block">
						<ion-icon :icon="alertCircleOutline" size="large" color="danger" />
						<p>{{ loadError }}</p>
						<ion-button @click="fetchPantryItems">Try again</ion-button>
					</div>

					<template v-else>
						<div v-if="filteredArchivedItems.length === 0" class="empty-state">
							<ion-icon :icon="archiveOutline" class="empty-icon" />
							<p>{{ archivedItems.length === 0 ? 'Nothing archived yet.' : 'No archived items match your search.' }}</p>
						</div>

						<div v-else class="archived-list">
							<div v-for="item in filteredArchivedItems" :key="item.id" class="archived-card">
								<div class="archived-thumb">
									<img
										v-if="item.product.image_base64"
										:src="item.product.image_base64"
										:alt="item.product.product_name"
										class="archived-photo" />
									<span v-else class="placeholder-initial">{{ item.product.product_name.charAt(0) }}</span>
								</div>

								<div class="archived-info">
									<h4 class="archived-title">{{ item.product.product_name }}</h4>
									<p class="archived-meta-location">{{ item.storage_location }}</p>
									<p class="archived-meta-consumed">
										<ion-icon :icon="archiveOutline" class="consumed-icon" />
										{{ consumedLabel(item) }}
									</p>
									<div class="delete-chip">
										<ion-icon :icon="timeOutline" />
										{{ deleteInLabel(item) }}
									</div>
								</div>

								<div class="archived-actions">
									<button
										type="button"
										class="soft-btn soft-btn--restore"
										:disabled="isRestoringId === item.id"
										@click="restoreItem(item.id)">
										<ion-icon :icon="refreshOutline" />
										Restore
									</button>
									<button
										type="button"
										class="soft-btn soft-btn--delete"
										:disabled="isDeletingId === item.id"
										@click="openDeleteModal(item)">
										<ion-icon :icon="trashOutline" />
										Delete
									</button>
								</div>
							</div>
						</div>
					</template>
				</template>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
	IonPage,
	IonContent,
	IonSearchbar,
	IonSelect,
	IonSelectOption,
	IonButton,
	IonIcon,
	IonSpinner,
	alertController,
	onIonViewWillEnter,
} from '@ionic/vue'
import {
	archiveOutline,
	checkmarkCircleOutline,
	fileTrayOutline,
	alertCircleOutline,
	timeOutline,
	refreshOutline,
	trashOutline,
	closeOutline,
	imageOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

interface Product {
	id: number
	product_name: string
	brand_name: string
	image_base64: string | null
}

interface PantryItemDto {
	id: number
	quantity: number
	portion_unit: string
	storage_location: string
	expiration_date: string | null
	best_before_date: string | null
	is_archived: boolean
	updated_at: string
	product: Product
}

type ViewMode = 'active' | 'archived'
type LocationFilter = 'All' | 'Fridge' | 'Freezer' | 'Cupboard'
type SortOption = 'soonest' | 'latest' | 'name'

const items = ref<PantryItemDto[]>([])
const isLoading = ref(true)
const loadError = ref('')
const totalItemsScanned = ref(0)

const view = ref<ViewMode>('active')
const locationOptions: LocationFilter[] = ['All', 'Fridge', 'Freezer', 'Cupboard']
const locationFilter = ref<LocationFilter>('All')
const sortOption = ref<SortOption>('soonest')
const searchQuery = ref('')

// Set when arriving from the Home dashboard's "Expiring Soon" card/carousel
// (/tabs/pantry?filter=expiring) – narrows the active view to items expiring
// within the same window used on the dashboard, sorted soonest-first.
const route = useRoute()
const router = useRouter()
const EXPIRING_SOON_THRESHOLD_DAYS = 3
const expiringOnly = ref(route.query.filter === 'expiring')

function goToDetail(itemId: number): void {
	router.push(`/tabs/pantry/${itemId}`)
}

const isArchiving = ref(false)
const isDeletingId = ref<number | null>(null)
const isRestoringId = ref<number | null>(null)

const activeItems = computed(() => items.value.filter((item) => !item.is_archived))
const archivedItems = computed(() =>
	items.value.filter((item) => item.is_archived).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
)

/* Active View Search + Filter */
const filteredActiveItems = computed(() => {
	let result = activeItems.value

	if (locationFilter.value !== 'All') {
		result = result.filter((item) => item.storage_location === locationFilter.value)
	}

	if (expiringOnly.value) {
		result = result.filter((item) => {
			const date = getRelevantDate(item)
			if (!date) return false
			const diff = daysBetween(new Date(), date)
			return diff >= 0 && diff <= EXPIRING_SOON_THRESHOLD_DAYS
		})
	}

	const query = searchQuery.value.trim().toLowerCase()
	if (query) {
		result = result.filter((item) => item.product.product_name.toLowerCase().includes(query))
	}

	const sorted = [...result]
	switch (sortOption.value) {
		case 'soonest':
			sorted.sort((a, b) => {
				const dateA = getRelevantDate(a)?.getTime() ?? Infinity
				const dateB = getRelevantDate(b)?.getTime() ?? Infinity
				return dateA - dateB
			})
			break
		case 'latest':
			sorted.sort((a, b) => {
				const dateA = getRelevantDate(a)?.getTime() ?? -Infinity
				const dateB = getRelevantDate(b)?.getTime() ?? -Infinity
				return dateB - dateA
			})
			break
		case 'name':
			sorted.sort((a, b) => a.product.product_name.localeCompare(b.product.product_name))
			break
	}

	return sorted
})

/* Search Bar functionality for Archived View */
const filteredArchivedItems = computed(() => {
	let result = archivedItems.value
	const query = searchQuery.value.trim().toLowerCase()
	if (query) {
		result = result.filter((item) => item.product.product_name.toLowerCase().includes(query))
	}
	return result
})

function daysBetween(from: Date, to: Date): number {
	const msPerDay = 1000 * 60 * 60 * 24
	const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate())
	const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate())
	return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / msPerDay)
}

function getRelevantDate(item: PantryItemDto): Date | null {
	const dateStr = item.expiration_date ?? item.best_before_date
	return dateStr ? new Date(dateStr) : null
}

function daysLabel(item: PantryItemDto): string {
	const date = getRelevantDate(item)
	if (!date) return 'No date set'
	const diff = daysBetween(new Date(), date)
	if (diff < 0) return `Expired ${Math.abs(diff)}d ago`
	if (diff === 0) return 'Expires today'
	return `${diff} days`
}

/* Threshold Logic */
function dotClass(item: PantryItemDto): string {
	const date = getRelevantDate(item)
	if (!date) return 'expiry-dot--warning'
	const diff = daysBetween(new Date(), date)
	if (diff <= 1) return 'expiry-dot--danger' // Red: Expired, Today, or 1 day
	if (diff <= 5) return 'expiry-dot--warning' // Amber/Orange: 2 to 5 days left
	return 'expiry-dot--success' // Green: 6+ days left
}

function consumedLabel(item: PantryItemDto): string {
	const diff = daysBetween(new Date(item.updated_at), new Date())
	if (diff <= 0) return 'Consumed Today'
	return `Consumed ${diff}d ago`
}

function deleteInLabel(item: PantryItemDto): string {
	const diff = daysBetween(new Date(item.updated_at), new Date())
	const remaining = Math.max(0, 7 - diff)
	return remaining === 0 ? 'Deletes today' : `Deletes in ${remaining}d`
}

function formatQuantity(item: PantryItemDto): string {
	return `${item.quantity}${item.portion_unit}`
}

async function fetchPantryItems(): Promise<void> {
	isLoading.value = true
	loadError.value = ''

	try {
		const data = await apiFetch<{ success: boolean; items: PantryItemDto[] }>('/api/pantry_item', {
			method: 'GET',
		})
		items.value = data.items
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to load your pantry.'
	} finally {
		isLoading.value = false
	}
}

// Same /api/users response ProfilePage.vue reads this from — moved here per
// request, not duplicated logic against a different source. A failure here
// is silent (falls back to 0) rather than surfacing its own error state,
// since this is a minor stat, not core pantry functionality that should
// block or degrade the rest of the page.
async function fetchTotalItemsScanned(): Promise<void> {
	try {
		const data = await apiFetch<{ stats: { total_items_scanned: number } }>('/api/users', { method: 'GET' })
		totalItemsScanned.value = data.stats.total_items_scanned
	} catch (err) {
		console.error('Failed to load total items scanned:', err)
	}
}

async function openConsumeModal(item: PantryItemDto): Promise<void> {
	const alert = await alertController.create({
		header: 'Mark as Consumed?',
		message: 'This item will be moved to the Archive and automatically deleted after 7 days. You can restore it anytime.',
		cssClass: 'custom-make-alert',
		buttons: [
			{
				text: 'Cancel',
				role: 'cancel',
				cssClass: 'alert-button-cancel',
			},
			{
				text: 'Confirm',
				cssClass: 'alert-button-confirm',
				handler: () => {
					confirmConsume(item.id)
				},
			},
		],
	})

	await alert.present()
}

async function confirmConsume(targetId: number): Promise<void> {
	isArchiving.value = true

	try {
		const data = await apiFetch<{ success: boolean; item: PantryItemDto }>(`/api/pantry_item/${targetId}`, {
			method: 'PUT',
			body: { is_archived: true },
		})

		// Update in place so the UI reflects the change instantly without
		// waiting on a full refetch.
		const index = items.value.findIndex((item) => item.id === targetId)
		if (index !== -1) items.value[index] = data.item
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to archive this item.'
	} finally {
		isArchiving.value = false
	}
}

async function restoreItem(id: number): Promise<void> {
	isRestoringId.value = id

	try {
		const data = await apiFetch<{ success: boolean; item: PantryItemDto }>(`/api/pantry_item/${id}`, {
			method: 'PUT',
			body: { is_archived: false },
		})

		const index = items.value.findIndex((item) => item.id === id)
		if (index !== -1) items.value[index] = data.item
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to restore this item.'
	} finally {
		isRestoringId.value = null
	}
}

async function openDeleteModal(item: PantryItemDto): Promise<void> {
	const alert = await alertController.create({
		header: 'Delete permanently?',
		message: "This removes the item for good — it won't be recoverable from the Archive afterward.",
		cssClass: 'custom-make-alert',
		buttons: [
			{
				text: 'Cancel',
				role: 'cancel',
				cssClass: 'alert-button-cancel',
			},
			{
				text: 'Delete',
				cssClass: 'alert-button-danger',
				handler: () => {
					confirmDelete(item.id)
				},
			},
		],
	})

	await alert.present()
}

async function confirmDelete(targetId: number): Promise<void> {
	isDeletingId.value = targetId

	try {
		await apiFetch(`/api/pantry_item/${targetId}`, {
			method: 'DELETE',
		})

		items.value = items.value.filter((item) => item.id !== targetId)
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to delete this item.'
	} finally {
		isDeletingId.value = null
	}
}

// onMounted only fires once for the lifetime of this cached tab page –
// Ionic keeps tab pages alive rather than destroying/recreating them on
// each visit, so a plain onMounted fetch goes stale after the first
// visit (e.g. items added via Scan never show up here without a full
// page reload). onIonViewWillEnter re-fires on every re-entry instead.
onIonViewWillEnter(() => {
	expiringOnly.value = route.query.filter === 'expiring'
	if (expiringOnly.value) sortOption.value = 'soonest'
	fetchPantryItems()
	fetchTotalItemsScanned()
})
</script>

<style scoped>
/* Header Container */
.header-container {
	background: #ffffff;
	padding: 12px 16px 8px;
	border-bottom: 1px solid #f1f5f9;
	z-index: 10;
}

/* Scrollable Content */
.pantry-content {
	--background: #fafafa;
}
.pantry-wrap {
	padding: 14px 16px 24px;
}

/* Search bar */
.search-row {
	margin-bottom: 12px;
	width: 100%;
}
.search-bar {
	--background: #f1f5f9;
	--border-radius: 24px;
	--box-shadow: none;
	padding: 0;
	width: 100%;
}

/* View Toggle Container */
.view-toggle-wrap {
	margin-bottom: 12px;
}
.view-toggle {
	display: flex;
	background: #f1f5f9;
	border-radius: 24px;
	padding: 4px;
}
.toggle-btn {
	flex: 1;
	border: none;
	border-radius: 20px;
	padding: 8px 0;
	font-weight: 600;
	font-size: 0.85rem;
	background: transparent;
	color: #64748b;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	transition: all 0.2s ease;
}
.toggle-btn--active {
	background: #00a651;
	color: #ffffff;
}
.toggle-btn--archived-active {
	background: #334155;
	color: #ffffff;
}
.count-badge {
	background: #ffffff;
	color: #334155;
	border-radius: 999px;
	padding: 0 7px;
	font-size: 0.72rem;
	font-weight: 700;
}

/* Sub-location Filter Pills */
.pill-row {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
	overflow-x: auto;
	padding-bottom: 2px;
}
.pill {
	border: 1px solid #e2e8f0;
	background: #ffffff;
	color: #475569;
	border-radius: 20px;
	padding: 5px 14px;
	font-size: 0.82rem;
	font-weight: 500;
	white-space: nowrap;
}
.pill--active {
	border-color: #00a651;
	color: #00a651;
	background: #ffffff;
	font-weight: 600;
}

/* Sort Row */
.sort-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 4px;
	font-size: 0.82rem;
	color: #64748b;
}

.scanned-stat-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
	font-size: 0.82rem;
	color: #64748b;
}
.scanned-stat-row__value {
	font-weight: 700;
	color: #0f172a;
}

/* Sort dropdown text: font weight removed */
.sort-text-select {
	max-width: 160px;
	font-size: 0.82rem;
	font-weight: 400;
	color: #0f172a;
}

/* Cards Grid */
.card-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 14px;
}
.pantry-card {
	background: #ffffff;
	border-radius: 20px;
	padding: 12px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}
.card-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
}
.expiry-info {
	display: flex;
	align-items: center;
	gap: 6px;
}
.expiry-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
}
.expiry-dot--danger {
	background: #ef4444;
}
.expiry-dot--warning {
	background: #f59e0b;
}
.expiry-dot--success {
	background: #10b981;
}
.expiry-days {
	font-size: 0.75rem;
	color: #6b7280;
	font-weight: 500;
}
.check-btn {
	border: none;
	background: none;
	font-size: 1.2rem;
	color: #9ca3af;
	line-height: 0;
	padding: 0;
	cursor: pointer;
}

.card-image {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 110px;
	margin-bottom: 8px;
	width: 100%;
}
.product-photo {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: 12px;
}
.placeholder-box {
	width: 100%;
	height: 100%;
	background: #f3f4f6;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
}
.placeholder-icon {
	font-size: 2.5rem;
	color: #9ca3af;
}

.card-body {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

/* Item name: font weight removed */
.card-title {
	font-size: 0.85rem;
	font-weight: 400;
	margin: 0;
	color: #111827;
	line-height: 1.2;
}
.card-meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 0.75rem;
	color: #9ca3af;
}
.quantity-badge {
	background: #f3f4f6;
	color: #6b7280;
	padding: 2px 6px;
	border-radius: 6px;
	font-weight: 500;
}

/* Archived Header Row */
.archived-header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 0 6px;
}
.archived-subhead {
	font-size: 0.78rem;
	color: #64748b;
}
.auto-delete-info {
	font-size: 0.74rem;
	color: #d97706;
	display: flex;
	align-items: center;
	gap: 4px;
	font-weight: 500;
}

/* Archived List & Cards */
.archived-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.archived-card {
	display: flex;
	align-items: center;
	gap: 12px;
	background: #ffffff;
	border-radius: 20px;
	padding: 14px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}
.archived-thumb {
	width: 54px;
	height: 54px;
	border-radius: 12px;
	background: transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	overflow: hidden;
}
.archived-photo {
	width: 100%;
	height: 100%;
	object-fit: contain;
}
.placeholder-initial {
	font-size: 1.5rem;
	font-weight: 700;
	color: #9ca3af;
}
.archived-info {
	flex: 1;
	min-width: 0;
}

/* Archived title: font weight removed */
.archived-title {
	font-size: 0.88rem;
	font-weight: 400;
	margin: 0 0 2px;
	color: #0f172a;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.archived-meta-location {
	font-size: 0.78rem;
	color: #64748b;
	margin: 0 0 2px;
}
.archived-meta-consumed {
	font-size: 0.75rem;
	color: #94a3b8;
	margin: 0 0 6px;
	display: flex;
	align-items: center;
	gap: 4px;
}
.consumed-icon {
	font-size: 0.85rem;
}

.delete-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 0.72rem;
	color: #b45309;
	background: #fffbeb;
	border-radius: 12px;
	padding: 2px 8px;
	font-weight: 500;
}

.archived-actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.soft-btn {
	border: none;
	border-radius: 16px;
	padding: 6px 14px;
	font-size: 0.78rem;
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 5px;
	cursor: pointer;
	transition: opacity 0.2s ease;
}
.soft-btn:disabled {
	opacity: 0.6;
}
.soft-btn--restore {
	background: #ecfdf5;
	color: #10b981;
}
.soft-btn--delete {
	background: #fef2f2;
	color: #ef4444;
}

/* States */
.filter-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #eff6ff;
	color: #1d4ed8;
	border-radius: 12px;
	padding: 8px 12px;
	margin-bottom: 10px;
	font-size: 0.82rem;
	font-weight: 500;
}
.filter-clear {
	display: flex;
	align-items: center;
	gap: 4px;
	border: none;
	background: none;
	color: #1d4ed8;
	font-weight: 600;
	font-size: 0.82rem;
}

.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 48px 16px;
	text-align: center;
}
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 64px 0;
	color: var(--ion-color-medium);
}
.empty-icon {
	font-size: 3rem;
	margin-bottom: 8px;
}
</style>

<style>
/* Popover Sizing */
.compact-sort-popover .popover-content {
	width: 170px !important;
	border-radius: 12px !important;
}
.compact-sort-popover ion-item {
	--min-height: 40px;
	font-size: 0.82rem;
}
</style>
