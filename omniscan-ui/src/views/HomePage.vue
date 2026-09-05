<template>
	<ion-page>
		<ion-content :fullscreen="true" class="home-content">
			<div class="home-wrap">
				<!-- Greeting header -->
				<div class="greeting-row">
					<div>
						<h1 class="greeting-title">{{ greeting }}, {{ userName || '…' }}!</h1>
						<p class="greeting-date">{{ formattedDate }}</p>
					</div>
					<button type="button" class="avatar-wrap" @click="goToProfile" aria-label="Go to profile">
						<img v-if="avatarBase64" :src="avatarBase64" alt="Profile photo" class="avatar-image" />
						<span v-else class="avatar-initial">{{ (userName || '?').charAt(0) }}</span>
					</button>
				</div>

				<div v-if="loadError" class="inline-error">
					<ion-icon :icon="alertCircleOutline" color="danger" />
					<span>{{ loadError }}</span>
					<ion-button size="small" fill="clear" @click="loadDashboard">Retry</ion-button>
				</div>

				<!-- Stat cards -->
				<div class="stats-row">
					<button type="button" class="stat-card" @click="goToPantry">
						<span class="stat-label">Pantry Items:</span>
						<span class="stat-value">{{ isLoading ? '—' : pantryItemCount }}</span>
						<span class="stat-bar stat-bar--green"></span>
					</button>
					<button type="button" class="stat-card" @click="goToExpiringPantry">
						<span class="stat-label">Expiring Soon:</span>
						<span class="stat-value">{{ isLoading ? '—' : expiringItems.length }}</span>
						<span class="stat-bar stat-bar--orange"></span>
					</button>
				</div>

				<!-- Expiring Soon carousel -->
				<div class="section-header">
					<h2 class="section-title">Expiring Soon</h2>
				</div>

				<div v-if="isLoading" class="state-block">
					<ion-spinner name="crescent" />
				</div>

				<div v-else-if="expiringItems.length === 0" class="empty-note">Nothing expiring in the next few days.</div>

				<div v-else class="carousel-row">
					<button type="button" class="carousel-nav" aria-label="Scroll left" @click="scrollCarousel(-1)">
						<ion-icon :icon="chevronBackOutline" />
					</button>

					<div ref="carouselRef" class="carousel-track">
						<button v-for="item in expiringItems" :key="item.id" type="button" class="expiring-card" @click="goToExpiringPantry">
							<span class="expiring-badge" :class="{ 'expiring-badge--urgent': (daysUntil(item) ?? Infinity) <= 1 }">
								{{ expiryLabel(item) }}
							</span>
							<div class="expiring-image">
								<img
									v-if="item.product.image_base64"
									:src="item.product.image_base64"
									:alt="item.product.product_name"
									class="expiring-photo" />
								<span v-else class="placeholder-initial">{{ item.product.product_name.charAt(0) }}</span>
							</div>
							<p class="expiring-name">{{ item.product.product_name }}</p>
						</button>
					</div>

					<button type="button" class="carousel-nav" aria-label="Scroll right" @click="scrollCarousel(1)">
						<ion-icon :icon="chevronForwardOutline" />
					</button>
				</div>

				<!-- Recommended for You (stubbed — no recommendation endpoint yet) -->
				<div class="section-header section-header--top">
					<h2 class="section-title">Recommended for You</h2>
				</div>
				<div class="placeholder-card">
					<ion-icon :icon="restaurantOutline" class="placeholder-icon" />
					<p>Personalized recipe recommendations are coming soon.</p>
				</div>

				<!-- Recent Activities -->
				<div class="section-header section-header--top">
					<h2 class="section-title">Recent Activities</h2>
				</div>

				<div v-if="isLoading" class="state-block">
					<ion-spinner name="crescent" />
				</div>

				<div v-else-if="activitiesLoadError" class="inline-error">
					<ion-icon :icon="alertCircleOutline" color="danger" />
					<span>{{ activitiesLoadError }}</span>
					<ion-button size="small" fill="clear" @click="loadDashboard">Retry</ion-button>
				</div>

				<div v-else-if="activities.length === 0" class="placeholder-card">
					<ion-icon :icon="timeOutline" class="placeholder-icon" />
					<p>Your recent scans, additions, and consumed items will show up here.</p>
				</div>

				<div v-else class="activity-list">
					<div v-for="activity in activities" :key="activity.id" class="activity-row">
						<div class="activity-icon" :class="`activity-icon--${activity.type}`">
							<ion-icon :icon="iconForActivityType(activity.type)" />
						</div>
						<div class="activity-info">
							<p class="activity-name">{{ activity.message }}</p>
							<p class="activity-meta">{{ labelForActivityType(activity.type) }} · {{ formatRelativeTime(activity.occurred_at) }}</p>
						</div>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonIcon, IonSpinner, IonButton, onIonViewWillEnter } from '@ionic/vue'
import {
	alertCircleOutline,
	chevronBackOutline,
	chevronForwardOutline,
	restaurantOutline,
	timeOutline,
	refreshCircleOutline,
	warningOutline,
	addCircleOutline,
	checkmarkCircleOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

const router = useRouter()

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

interface UserDto {
	id: number
	name: string
	avatar_base64: string | null
}

type ActivityType = 'scanned' | 'added' | 'consumed' | 'expiring'

interface ActivityLogDto {
	id: number
	type: ActivityType
	message: string
	occurred_at: string
	product_id: number | null
	pantry_item_id: number | null
}

// Anything within this many days (and not yet expired) counts as "expiring soon" —
// matches the danger/warning thresholds already used on the Pantry page.
const EXPIRING_SOON_THRESHOLD_DAYS = 3

const isLoading = ref(true)
const loadError = ref('')

const userName = ref('')
const avatarBase64 = ref<string | null>(null)
const pantryItems = ref<PantryItemDto[]>([])
const activities = ref<ActivityLogDto[]>([])
const activitiesLoadError = ref('')

const carouselRef = ref<HTMLElement | null>(null)

const activeItems = computed(() => pantryItems.value.filter((item) => !item.is_archived))
const pantryItemCount = computed(() => activeItems.value.length)

const expiringItems = computed(() =>
	activeItems.value
		.filter((item) => {
			const diff = daysUntil(item)
			return diff !== null && diff >= 0 && diff <= EXPIRING_SOON_THRESHOLD_DAYS
		})
		.sort((a, b) => (daysUntil(a) ?? Infinity) - (daysUntil(b) ?? Infinity)),
)

const greeting = computed(() => {
	const hour = new Date().getHours()
	if (hour < 12) return 'Good morning'
	if (hour < 18) return 'Good afternoon'
	return 'Good evening'
})

const formattedDate = computed(() => new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))

function getRelevantDate(item: PantryItemDto): Date | null {
	const dateStr = item.expiration_date ?? item.best_before_date
	return dateStr ? new Date(dateStr) : null
}

function daysUntil(item: PantryItemDto): number | null {
	const date = getRelevantDate(item)
	if (!date) return null
	const msPerDay = 1000 * 60 * 60 * 24
	const today = new Date()
	const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
	const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	return Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / msPerDay)
}

function expiryLabel(item: PantryItemDto): string {
	const diff = daysUntil(item)
	if (diff === null) return 'No date set'
	if (diff === 0) return 'Expires today'
	return `Expires in ${diff} day${diff === 1 ? '' : 's'}`
}

function scrollCarousel(direction: 1 | -1) {
	carouselRef.value?.scrollBy({ left: direction * 220, behavior: 'smooth' })
}

function goToPantry() {
	router.push('/tabs/pantry')
}

function goToProfile() {
	router.push('/tabs/profile')
}

function iconForActivityType(type: ActivityType) {
	switch (type) {
		case 'scanned':
			return refreshCircleOutline
		case 'expiring':
			return warningOutline
		case 'added':
			return addCircleOutline
		case 'consumed':
			return checkmarkCircleOutline
	}
}

function labelForActivityType(type: ActivityType): string {
	switch (type) {
		case 'scanned':
			return 'Scanned'
		case 'expiring':
			return 'Expiring'
		case 'added':
			return 'Added'
		case 'consumed':
			return 'Consumed'
	}
}

// Simplification: uses one consistent granularity (hours, then Yesterday,
// then "N Days Ago") rather than mixing hour- and day-based wording per
// activity type — the mockup showed both styles across different rows,
// which reads more like illustrative sample data than a strict spec.
function formatRelativeTime(iso: string): string {
	const then = new Date(iso)
	const now = new Date()
	const diffMs = now.getTime() - then.getTime()
	const diffMins = Math.floor(diffMs / 60000)

	if (diffMins < 1) return 'Just now'
	if (diffMins < 60) return `${diffMins} Minute${diffMins === 1 ? '' : 's'} Ago`

	const diffHours = Math.floor(diffMins / 60)
	const dayDiff = daysBetween(then, now)

	if (dayDiff === 0) return `${diffHours} Hour${diffHours === 1 ? '' : 's'} Ago`
	if (dayDiff === 1) return 'Yesterday'
	return `${dayDiff} Days Ago`
}

function daysBetween(from: Date, to: Date): number {
	const msPerDay = 1000 * 60 * 60 * 24
	const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate())
	const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate())
	return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / msPerDay)
}

function goToExpiringPantry() {
	router.push({ path: '/tabs/pantry', query: { filter: 'expiring' } })
}

async function loadDashboard() {
	isLoading.value = true
	loadError.value = ''
	activitiesLoadError.value = ''

	try {
		const [userRes, pantryRes] = await Promise.all([
			apiFetch<{ success: boolean; user: UserDto }>('/api/users', { method: 'GET' }),
			apiFetch<{ success: boolean; items: PantryItemDto[] }>('/api/pantry_item', { method: 'GET' }),
		])

		userName.value = userRes.user.name
		avatarBase64.value = userRes.user.avatar_base64
		pantryItems.value = pantryRes.items
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to load your dashboard.'
	}

	// Fetched separately so a broken activity feed doesn't block the rest
	// of the dashboard (stats and expiring carousel) from rendering.
	try {
		const activityRes = await apiFetch<{ success: boolean; activities: ActivityLogDto[] }>('/api/activity_log', {
			method: 'GET',
		})
		activities.value = activityRes.activities
	} catch (err) {
		activitiesLoadError.value = err instanceof ApiError ? err.message : 'Failed to load recent activity.'
	} finally {
		isLoading.value = false
	}
}

// Ionic keeps tab views alive in the DOM when you switch tabs (it doesn't
// unmount/remount them), so onMounted() only fires once, ever. Using
// onIonViewWillEnter instead means this refetches every time you land back
// on the Home tab, so the stats never go stale after adding/removing items
// elsewhere.
onIonViewWillEnter(() => {
	loadDashboard()
})
</script>

<style scoped>
.home-content {
	--background: #f7f8fa;
}
.home-wrap {
	padding: 16px 16px 96px;
}

.greeting-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 16px;
}
.greeting-title {
	font-size: 1.4rem;
	font-weight: 700;
	margin: 0;
	color: #111827;
}
.greeting-date {
	font-size: 0.85rem;
	color: #6b7280;
	margin: 4px 0 0;
}
.avatar-wrap {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	overflow: hidden;
	border: none;
	padding: 0;
	cursor: pointer;
}
.avatar-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.avatar-initial {
	font-size: 1.1rem;
	font-weight: 700;
	color: #9ca3af;
}

.inline-error {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 0;
	color: var(--ion-color-danger);
	font-size: 0.85rem;
}

.stats-row {
	display: flex;
	gap: 12px;
	margin-bottom: 20px;
}
.stat-card {
	flex: 1;
	background: #ffffff;
	border: none;
	border-radius: 16px;
	padding: 14px 16px 16px;
	text-align: left;
	display: flex;
	flex-direction: column;
	gap: 4px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.stat-label {
	font-size: 0.8rem;
	color: #6b7280;
}
.stat-value {
	font-size: 1.6rem;
	font-weight: 700;
	color: #111827;
}
.stat-bar {
	display: block;
	height: 4px;
	border-radius: 999px;
	margin-top: 6px;
}
.stat-bar--green {
	background: #16a34a;
}
.stat-bar--orange {
	background: #f59e0b;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}
.section-header--top {
	margin-top: 24px;
}
.section-title {
	font-size: 1.05rem;
	font-weight: 700;
	color: #111827;
	margin: 0;
}

.state-block {
	display: flex;
	justify-content: center;
	padding: 24px 0;
}
.empty-note {
	color: #9ca3af;
	font-size: 0.85rem;
	padding: 8px 0 4px;
}

.carousel-row {
	display: flex;
	align-items: center;
	gap: 4px;
}
.carousel-nav {
	flex-shrink: 0;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1px solid #e5e7eb;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #6b7280;
}
.carousel-track {
	display: flex;
	gap: 12px;
	overflow-x: auto;
	scroll-snap-type: x proximity;
	padding-bottom: 4px;
}
.carousel-track::-webkit-scrollbar {
	display: none;
}
.expiring-card {
	flex-shrink: 0;
	width: 140px;
	background: #ffffff;
	border: none;
	border-radius: 16px;
	padding: 10px;
	text-align: left;
	scroll-snap-align: start;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.expiring-badge {
	display: inline-block;
	background: #fef3c7;
	color: #92400e;
	font-size: 0.7rem;
	font-weight: 600;
	border-radius: 999px;
	padding: 3px 10px;
	margin-bottom: 8px;
}
.expiring-badge--urgent {
	background: #fee2e2;
	color: #b91c1c;
}
.expiring-image {
	height: 80px;
	background: #f3f4f6;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 8px;
	overflow: hidden;
}
.expiring-photo {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.placeholder-initial {
	font-size: 1.5rem;
	font-weight: 700;
	color: #9ca3af;
}
.expiring-name {
	font-size: 0.85rem;
	font-weight: 600;
	color: #111827;
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.placeholder-card {
	background: #ffffff;
	border-radius: 16px;
	padding: 24px 16px;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 8px;
	color: #6b7280;
	font-size: 0.85rem;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.placeholder-icon {
	font-size: 1.8rem;
	color: #9ca3af;
}

.activity-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.activity-row {
	display: flex;
	align-items: center;
	gap: 12px;
	background: #ffffff;
	border-radius: 14px;
	padding: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.activity-icon {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.3rem;
	flex-shrink: 0;
}
.activity-icon--scanned {
	background: #eff6ff;
	color: #2563eb;
}
.activity-icon--expiring {
	background: #fff7ed;
	color: #ea580c;
}
.activity-icon--added {
	background: #f0fdf4;
	color: #16a34a;
}
.activity-icon--consumed {
	background: #f3f4f6;
	color: #6b7280;
}
.activity-info {
	flex: 1;
	min-width: 0;
}
.activity-name {
	font-size: 0.9rem;
	font-weight: 600;
	color: #111827;
	margin: 0 0 2px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.activity-meta {
	font-size: 0.78rem;
	color: #6b7280;
	margin: 0;
}
</style>
