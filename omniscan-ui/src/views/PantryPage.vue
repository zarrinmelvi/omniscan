<template>
	<ion-page>
		<ion-content :fullscreen="true" class="pantry-content">
			<div class="pantry-wrap">
				<!-- Search + filter trigger -->
				<div class="search-row">
					<ion-searchbar
						v-model="searchQuery"
						placeholder="Search"
						class="search-bar"
						:show-clear-button="searchQuery ? 'always' : 'never'" />
					<!-- Sort lives behind this icon on small screens; -->
					<!-- the text sort control below stays visible too since your mockup shows both. -->
					<ion-select v-model="sortOption" interface="popover" class="sort-icon-select" aria-label="Sort pantry items">
						<ion-icon slot="trigger" :icon="optionsOutline" class="sort-icon" />
						<ion-select-option value="soonest">Expiring soonest</ion-select-option>
						<ion-select-option value="latest">Expiring latest</ion-select-option>
						<ion-select-option value="name">Name A–Z</ion-select-option>
					</ion-select>
				</div>

				<!-- Active / Archived toggle -->
				<div class="view-toggle">
					<button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': view === 'active' }" @click="view = 'active'">
						Active
					</button>
					<button
						type="button"
						class="toggle-btn toggle-btn--dark"
						:class="{ 'toggle-btn--active-dark': view === 'archived' }"
						@click="view = 'archived'">
						<ion-icon :icon="archiveOutline" />
						Archived
						<span v-if="archivedItems.length" class="count-badge">{{ archivedItems.length }}</span>
					</button>
				</div>

				<!-- ACTIVE VIEW -->
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

					<div class="sort-row">
						<span class="sort-row__label">Sort ↕</span>
						<ion-select v-model="sortOption" interface="popover" class="sort-text-select">
							<ion-select-option value="soonest">Expiring soonest</ion-select-option>
							<ion-select-option value="latest">Expiring latest</ion-select-option>
							<ion-select-option value="name">Name A–Z</ion-select-option>
						</ion-select>
					</div>

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
						<p>{{ items.length === 0 ? 'Your pantry is empty.' : 'No items match this filter.' }}</p>
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
								<span class="expiry-dot" :class="dotClass(item)"></span>
								<span class="expiry-days">{{ daysLabel(item) }}</span>
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
								<span v-else class="placeholder-initial">{{ item.product.product_name.charAt(0) }}</span>
							</div>

							<div class="card-body">
								<h3 class="card-title">{{ item.product.product_name }}</h3>
								<div class="card-meta">
									<span>{{ item.storage_location }}</span>
									<span>{{ formatQuantity(item) }}</span>
								</div>
							</div>
						</div>
					</div>
				</template>

				<!-- ARCHIVED VIEW -->
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
						<p class="archived-subhead">Items you've marked as consumed</p>

						<div v-if="archivedItems.length === 0" class="empty-state">
							<ion-icon :icon="archiveOutline" class="empty-icon" />
							<p>Nothing archived yet.</p>
						</div>

						<div v-else class="archived-list">
							<div v-for="item in archivedItems" :key="item.id" class="archived-card">
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
									<p class="archived-meta">{{ item.storage_location }} · {{ consumedLabel(item) }}</p>
									<span class="delete-chip">
										<ion-icon :icon="timeOutline" />
										{{ deleteInLabel(item) }}
									</span>
								</div>

								<div class="archived-actions">
									<ion-button
										size="small"
										fill="outline"
										color="success"
										:disabled="isRestoringId === item.id"
										@click="restoreItem(item.id)">
										<ion-icon :icon="refreshOutline" slot="start" />
										Restore
									</ion-button>
									<ion-button
										size="small"
										fill="outline"
										color="danger"
										:disabled="isDeletingId === item.id"
										@click="openDeleteModal(item)">
										<ion-icon :icon="trashOutline" slot="start" />
										Delete
									</ion-button>
								</div>
							</div>
						</div>
					</template>
				</template>
			</div>

			<!-- Mark as Consumed confirmation -->
			<ion-modal :is-open="isConsumeModalOpen" @didDismiss="closeConsumeModal" class="confirm-modal">
				<div class="modal-body">
					<div class="modal-icon modal-icon--success">
						<ion-icon :icon="checkmarkCircleOutline" />
					</div>
					<h2>Mark as Consumed?</h2>
					<p>This item will be moved to the Archive and automatically deleted after 7 days. You can restore it anytime.</p>
					<div v-if="consumeError" class="form-error">{{ consumeError }}</div>
					<div class="modal-actions">
						<ion-button expand="block" fill="outline" :disabled="isArchiving" @click="closeConsumeModal"> Cancel </ion-button>
						<ion-button expand="block" color="success" :disabled="isArchiving" @click="confirmConsume">
							{{ isArchiving ? 'Saving…' : 'Confirm' }}
						</ion-button>
					</div>
				</div>
			</ion-modal>

			<!-- Delete permanently confirmation -->
			<ion-modal :is-open="isDeleteModalOpen" @didDismiss="closeDeleteModal" class="confirm-modal">
				<div class="modal-body">
					<div class="modal-icon modal-icon--danger">
						<ion-icon :icon="trashOutline" />
					</div>
					<h2>Delete permanently?</h2>
					<p>This removes the item for good — it won't be recoverable from the Archive afterward.</p>
					<div v-if="deleteError" class="form-error">{{ deleteError }}</div>
					<div class="modal-actions">
						<ion-button expand="block" fill="outline" :disabled="isDeletingId !== null" @click="closeDeleteModal"> Cancel </ion-button>
						<ion-button expand="block" color="danger" :disabled="isDeletingId !== null" @click="confirmDelete">
							{{ isDeletingId !== null ? 'Deleting…' : 'Delete' }}
						</ion-button>
					</div>
				</div>
			</ion-modal>
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
	IonModal,
	onIonViewWillEnter,
} from '@ionic/vue'
import {
	optionsOutline,
	archiveOutline,
	checkmarkCircleOutline,
	fileTrayOutline,
	alertCircleOutline,
	timeOutline,
	refreshOutline,
	trashOutline,
	closeOutline,
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

const view = ref<ViewMode>('active')
const locationOptions: LocationFilter[] = ['All', 'Fridge', 'Freezer', 'Cupboard']
const locationFilter = ref<LocationFilter>('All')
const sortOption = ref<SortOption>('soonest')
const searchQuery = ref('')

// Set when arriving from the Home dashboard's "Expiring Soon" card/carousel
// (/tabs/pantry?filter=expiring) — narrows the active view to items expiring
// within the same window used on the dashboard, sorted soonest-first.
const route = useRoute()
const router = useRouter()
const EXPIRING_SOON_THRESHOLD_DAYS = 3
const expiringOnly = ref(route.query.filter === 'expiring')

function goToDetail(itemId: number): void {
	router.push(`/tabs/pantry/${itemId}`)
}

const isConsumeModalOpen = ref(false)
const itemPendingConsume = ref<PantryItemDto | null>(null)
const isArchiving = ref(false)
const consumeError = ref('')

const isDeleteModalOpen = ref(false)
const itemPendingDelete = ref<PantryItemDto | null>(null)
const isDeletingId = ref<number | null>(null)
const deleteError = ref('')

const isRestoringId = ref<number | null>(null)

const activeItems = computed(() => items.value.filter((item) => !item.is_archived))
const archivedItems = computed(() =>
	items.value.filter((item) => item.is_archived).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
)

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
	}

	return sorted
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
	return `${diff} day${diff === 1 ? '' : 's'}`
}

function dotClass(item: PantryItemDto): string {
	const date = getRelevantDate(item)
	if (!date) return 'expiry-dot--warning'
	const diff = daysBetween(new Date(), date)
	if (diff <= 1) return 'expiry-dot--danger'
	if (diff <= 3) return 'expiry-dot--warning'
	return 'expiry-dot--success'
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

function openConsumeModal(item: PantryItemDto): void {
	itemPendingConsume.value = item
	consumeError.value = ''
	isConsumeModalOpen.value = true
}

function closeConsumeModal(): void {
	isConsumeModalOpen.value = false
	itemPendingConsume.value = null
}

async function confirmConsume(): Promise<void> {
	if (!itemPendingConsume.value) return
	const targetId = itemPendingConsume.value.id

	isArchiving.value = true
	consumeError.value = ''

	try {
		const data = await apiFetch<{ success: boolean; item: PantryItemDto }>(`/api/pantry_item/${targetId}`, {
			method: 'PUT',
			body: { is_archived: true },
		})

		// Update in place so the UI reflects the change instantly without
		// waiting on a full refetch.
		const index = items.value.findIndex((item) => item.id === targetId)
		if (index !== -1) items.value[index] = data.item

		closeConsumeModal()
	} catch (err) {
		consumeError.value = err instanceof ApiError ? err.message : 'Failed to archive this item.'
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

function openDeleteModal(item: PantryItemDto): void {
	itemPendingDelete.value = item
	deleteError.value = ''
	isDeleteModalOpen.value = true
}

function closeDeleteModal(): void {
	isDeleteModalOpen.value = false
	itemPendingDelete.value = null
}

async function confirmDelete(): Promise<void> {
	if (!itemPendingDelete.value) return
	const targetId = itemPendingDelete.value.id

	isDeletingId.value = targetId
	deleteError.value = ''

	try {
		await apiFetch(`/api/pantry_item/${targetId}`, {
			method: 'DELETE',
		})

		items.value = items.value.filter((item) => item.id !== targetId)
		closeDeleteModal()
	} catch (err) {
		deleteError.value = err instanceof ApiError ? err.message : 'Failed to delete this item.'
	} finally {
		isDeletingId.value = null
	}
}

onIonViewWillEnter(() => {
	// onMounted only fires once for the lifetime of this cached tab page —
	// Ionic keeps tab pages alive rather than destroying/recreating them on
	// each visit, so a plain onMounted fetch goes stale after the first
	// visit (e.g. items added via Scan never show up here without a full
	// page reload). onIonViewWillEnter re-fires on every re-entry instead.
	expiringOnly.value = route.query.filter === 'expiring'
	if (expiringOnly.value) sortOption.value = 'soonest'
	fetchPantryItems()
})
</script>

<style scoped>
.pantry-content {
	--background: #f7f8fa;
}
.pantry-wrap {
	padding: 8px 16px 24px;
}

.search-row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 12px;
}
.search-bar {
	flex: 1;
	--background: #ececef;
	--border-radius: 12px;
	--box-shadow: none;
	padding: 0;
}
.sort-icon-select {
	--padding-start: 8px;
	--padding-end: 8px;
	max-width: 40px;
}
.sort-icon {
	font-size: 1.3rem;
	color: var(--ion-color-medium);
}

.view-toggle {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}
.toggle-btn {
	flex: 1;
	border: none;
	border-radius: 999px;
	padding: 10px 0;
	font-weight: 600;
	font-size: 0.9rem;
	background: #ececef;
	color: #374151;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}
.toggle-btn--active {
	background: #16a34a;
	color: #ffffff;
}
.toggle-btn--active-dark {
	background: #111827;
	color: #ffffff;
}
.count-badge {
	background: rgba(255, 255, 255, 0.25);
	border-radius: 999px;
	padding: 1px 8px;
	font-size: 0.75rem;
}

.filter-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #eff6ff;
	color: #1d4ed8;
	border-radius: 12px;
	padding: 10px 12px;
	margin-bottom: 12px;
	font-size: 0.85rem;
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
	font-size: 0.85rem;
}

.pill-row {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
	flex-wrap: wrap;
}
.pill {
	border: 1px solid #d1d5db;
	background: #ffffff;
	color: #374151;
	border-radius: 999px;
	padding: 6px 16px;
	font-size: 0.85rem;
}
.pill--active {
	border-color: #16a34a;
	color: #16a34a;
	background: #f0fdf4;
	font-weight: 600;
}

.sort-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
	font-size: 0.85rem;
	color: #6b7280;
}
.sort-text-select {
	max-width: 200px;
	font-weight: 600;
	color: #111827;
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

.card-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12px;
}
.pantry-card {
	background: #ffffff;
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	cursor: pointer;
}
.card-top {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 10px 10px 0;
}
.expiry-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}
.expiry-dot--danger {
	background: #ef4444;
}
.expiry-dot--warning {
	background: #f59e0b;
}
.expiry-dot--success {
	background: #22c55e;
}
.expiry-days {
	font-size: 0.75rem;
	color: #6b7280;
	flex: 1;
}
.check-btn {
	border: none;
	background: none;
	font-size: 1.3rem;
	color: #9ca3af;
	line-height: 0;
	padding: 2px;
}
.check-btn:active {
	color: #16a34a;
}
.card-image {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 96px;
	margin: 8px 10px 0;
	background: #f3f4f6;
	border-radius: 12px;
}

.product-photo {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: 12px;
}
.archived-photo {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: 10px;
}

.placeholder-initial {
	font-size: 1.75rem;
	font-weight: 700;
	color: #9ca3af;
}
.card-body {
	padding: 10px;
}
.card-title {
	font-size: 0.9rem;
	font-weight: 600;
	margin: 0 0 4px;
	color: #111827;
}
.card-meta {
	display: flex;
	justify-content: space-between;
	font-size: 0.78rem;
	color: #6b7280;
}

.archived-subhead {
	font-size: 0.85rem;
	color: #6b7280;
	margin: 4px 0 12px;
}
.archived-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.archived-card {
	display: flex;
	align-items: center;
	gap: 12px;
	background: #ffffff;
	border-radius: 14px;
	padding: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.archived-thumb {
	width: 48px;
	height: 48px;
	border-radius: 10px;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.archived-info {
	flex: 1;
	min-width: 0;
}
.archived-title {
	font-size: 0.9rem;
	font-weight: 600;
	margin: 0 0 2px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.archived-meta {
	font-size: 0.78rem;
	color: #6b7280;
	margin: 0 0 4px;
}
.delete-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 0.72rem;
	color: #b45309;
	background: #fffbeb;
	border-radius: 999px;
	padding: 2px 8px;
}
.archived-actions {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.modal-body {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 32px 24px;
	gap: 8px;
}
.modal-icon {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.8rem;
	margin-bottom: 8px;
}
.modal-icon--success {
	background: #fff7ed;
	color: #f59e0b;
}
.modal-icon--danger {
	background: #fef2f2;
	color: #ef4444;
}
.modal-actions {
	display: flex;
	gap: 12px;
	width: 100%;
	margin-top: 16px;
}
.modal-actions ion-button {
	flex: 1;
}
.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	font-size: 0.85rem;
	width: 100%;
}
</style>
