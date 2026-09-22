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

				<!-- Expiring Soon Carousel -->
				<div class="section-header">
					<h2 class="section-title">Expiring Soon</h2>
				</div>

				<div v-if="isLoading" class="state-block">
					<ion-spinner name="crescent" />
				</div>

				<div v-else-if="expiringItems.length === 0" class="empty-note">Nothing expiring in the next few days.</div>

				<div v-else class="carousel-container">
					<!-- Floating White Circle Overlay Navigation Buttons -->
					<button type="button" class="carousel-nav carousel-nav--left" aria-label="Scroll left" @click="scrollCarousel(-1)">
						<ion-icon :icon="chevronBackOutline" />
					</button>

					<div ref="carouselRef" class="carousel-track">
						<button
							v-for="item in expiringItems"
							:key="item.id"
							type="button"
							class="expiring-card"
							@click="goToPantryItemDetail(item.id)">
							<span
								class="expiring-badge"
								:class="{
									'expiring-badge--urgent': (daysUntil(item) ?? Infinity) <= 1,
									'expiring-badge--warning': (daysUntil(item) ?? Infinity) > 1,
								}">
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

					<button type="button" class="carousel-nav carousel-nav--right" aria-label="Scroll right" @click="scrollCarousel(1)">
						<ion-icon :icon="chevronForwardOutline" />
					</button>
				</div>

				<!-- Recommended for You -->
				<div class="section-header section-header--top">
					<h2 class="section-title">Recommended for You</h2>
				</div>

				<div v-if="isLoading" class="state-block">
					<ion-spinner name="crescent" />
				</div>

				<div v-else-if="recommendedRecipes.length === 0" class="placeholder-card">
					<ion-icon :icon="restaurantOutline" class="placeholder-icon" />
					<p>Personalized recipe recommendations are coming soon.</p>
				</div>

				<div v-else class="recommended-list">
					<div v-for="recipe in recommendedRecipes" :key="recipe.id" class="recipe-card" @click="openRecipeDetail(recipe)">
						<div class="recipe-img-wrap">
							<img v-if="recipe.image_url" :src="recipe.image_url" :alt="recipe.name" class="recipe-img" />
							<div v-else class="recipe-placeholder">
								<ion-icon :icon="restaurantOutline" />
							</div>
						</div>
						<div class="recipe-info">
							<h3 class="recipe-title">{{ recipe.name }}</h3>
							<p class="recipe-match">{{ recipe.matched_count }} in pantry</p>
						</div>
						<ion-icon :icon="chevronForwardOutline" class="recipe-arrow" />
					</div>
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

			<!-- Recipe Detail Modal -->
			<RecipeDetailModal
				:is-open="isDetailModalOpen"
				:recipe="selectedRecipe"
				@close="isDetailModalOpen = false"
				@toggle-like="toggleLike"
				@make="handleMakeFromModal"
				@unmake="handleUnmakeFromModal" />

			<!-- Rounded Confirmation Alert -->
			<ion-alert
				:is-open="isAlertOpen"
				header="Make this recipe?"
				:message="alertMessage"
				:buttons="alertButtons"
				class="custom-make-alert"
				@didDismiss="isAlertOpen = false" />

			<!-- Result Modal -->
			<ion-modal :is-open="isResultModalOpen" @didDismiss="isResultModalOpen = false">
				<ion-header>
					<ion-toolbar>
						<ion-title>{{ madeRecipeResult?.name ?? 'Recipe Made' }}</ion-title>
						<ion-buttons slot="end">
							<ion-button @click="isResultModalOpen = false">
								<ion-icon :icon="closeOutline" slot="icon-only" />
							</ion-button>
						</ion-buttons>
					</ion-toolbar>
				</ion-header>

				<ion-content class="ion-padding">
					<div v-if="madeRecipeResult">
						<p v-if="archivedCount > 0" class="archived-note">
							{{ archivedCount }} pantry item{{ archivedCount === 1 ? '' : 's' }} used and archived.
						</p>

						<p class="section-label">Adjusted Ingredients</p>
						<ion-chip v-for="(ingredient, index) in madeRecipeResult.adjusted_ingredients" :key="index" color="success">
							{{ ingredient.name }} — {{ ingredient.amount_text }}
						</ion-chip>

						<p class="section-label mt-4">Instructions</p>
						<p class="instructions-text">{{ madeRecipeResult.adapted_instructions }}</p>

						<div v-if="madeRecipeResult.notes" class="notes-block">
							<p class="section-label">Notes</p>
							<p>{{ madeRecipeResult.notes }}</p>
						</div>
					</div>

					<ion-button expand="block" class="mt-4 submit-btn" @click="isResultModalOpen = false">Done</ion-button>
				</ion-content>
			</ion-modal>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
	IonPage,
	IonContent,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonChip,
	IonIcon,
	IonSpinner,
	IonButton,
	IonAlert,
	IonModal,
	onIonViewWillEnter,
} from '@ionic/vue'
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
	closeOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'
import RecipeDetailModal, { type RecipeWarning } from '@/components/RecipeDetailModal.vue'

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

interface SuggestedRecipe {
	id: number
	name: string
	instructions: string
	matched_ingredients?: { name: string; quantity: number | null; unit: string | null }[]
	matched_count: number
	total_count: number
	missing_ingredients: { name: string; quantity: number | null; unit: string | null }[]
	liked: boolean
	made: boolean
	image_url?: string
	allergen_warnings?: (string | RecipeWarning)[]
}

interface MadeRecipeResult {
	id: number
	name: string
	adapted_instructions: string
	adjusted_ingredients: { name: string; amount_text: string }[]
	notes: string
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
const recommendedRecipes = ref<SuggestedRecipe[]>([])
const activities = ref<ActivityLogDto[]>([])
const activitiesLoadError = ref('')

// Recipe Modal States
const isDetailModalOpen = ref(false)
const selectedRecipe = ref<SuggestedRecipe | null>(null)
const likingId = ref<number | null>(null)
const makingId = ref<number | null>(null)

const isResultModalOpen = ref(false)
const madeRecipeResult = ref<MadeRecipeResult | null>(null)
const archivedCount = ref(0)

const isAlertOpen = ref(false)
const alertMessage = ref('')
const pendingRecipeId = ref<number | null>(null)

const alertButtons = [
	{
		text: 'Cancel',
		role: 'cancel',
		cssClass: 'alert-button-cancel',
	},
	{
		text: 'Confirm',
		role: 'confirm',
		cssClass: 'alert-button-confirm',
		handler: () => {
			if (pendingRecipeId.value !== null) {
				void makeRecipe(pendingRecipeId.value)
			}
		},
	},
]

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
	carouselRef.value?.scrollBy({ left: direction * 180, behavior: 'smooth' })
}

function goToPantry() {
	router.push('/tabs/pantry')
}

function goToProfile() {
	router.push('/tabs/profile')
}

function goToPantryItemDetail(id: number) {
	router.push(`/tabs/pantry/${id}`)
}

function openRecipeDetail(recipe: SuggestedRecipe): void {
	selectedRecipe.value = recipe
	isDetailModalOpen.value = true
}

function handleMakeFromModal(recipe: SuggestedRecipe): void {
	isDetailModalOpen.value = false
	confirmMakeRecipe(recipe)
}

function handleUnmakeFromModal(recipe: SuggestedRecipe): void {
	isDetailModalOpen.value = false
	void unmakeRecipe(recipe.id)
}

function confirmMakeRecipe(recipe: SuggestedRecipe): void {
	pendingRecipeId.value = recipe.id
	alertMessage.value = `This will reduce your pantry quantities for "${recipe.name}". Continue?`
	isAlertOpen.value = true
}

async function toggleLike(recipe: SuggestedRecipe): Promise<void> {
	if (likingId.value === recipe.id) return

	likingId.value = recipe.id
	const previousLiked = recipe.liked
	recipe.liked = !previousLiked

	try {
		const data = await apiFetch<{ liked: boolean; made: boolean }>(`/api/recipes/${recipe.id}/like`, { method: 'POST' })
		recipe.liked = data.liked
		recipe.made = data.made
	} catch (err) {
		recipe.liked = previousLiked
		loadError.value = err instanceof ApiError ? err.message : 'Failed to update like status.'
	} finally {
		likingId.value = null
	}
}

async function makeRecipe(recipeId: number): Promise<void> {
	makingId.value = recipeId

	try {
		const data = await apiFetch<{
			recipe: MadeRecipeResult
			archived_count?: number
			made?: boolean
			liked?: boolean
		}>('/api/recipes/make', {
			method: 'POST',
			body: { recipe_id: recipeId },
		})

		madeRecipeResult.value = data.recipe
		archivedCount.value = data.archived_count ?? 0
		isResultModalOpen.value = true

		const affected = recommendedRecipes.value.find((r) => r.id === recipeId)
		if (affected) {
			affected.made = data.made ?? true
			affected.liked = data.liked ?? affected.liked
		}

		await loadDashboard()
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to update pantry after making this recipe.'
	} finally {
		makingId.value = null
	}
}

async function unmakeRecipe(recipeId: number): Promise<void> {
	try {
		await apiFetch<{ success: boolean }>('/api/recipes/made', {
			method: 'DELETE',
			body: { recipe_id: recipeId },
		})
		await loadDashboard()
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to remove recipe from Made list.'
	}
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
// activity type – the mockup showed both styles across different rows,
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

async function fetchRecommendations() {
	try {
		const data = await apiFetch<{ success: boolean; recipes: SuggestedRecipe[] }>('/api/recipes/suggest', {
			method: 'GET',
		})
		recommendedRecipes.value = (data.recipes || []).slice(0, 3)
	} catch {
		recommendedRecipes.value = []
	}
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

		await fetchRecommendations()
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
	--background: #f8fafc;
}
.home-wrap {
	padding: 16px 16px 96px;
}

.greeting-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 20px;
}
.greeting-title {
	font-size: 1.3rem;
	font-weight: 600;
	margin: 0;
	color: #0f172a;
	letter-spacing: -0.2px;
}
.greeting-date {
	font-size: 0.82rem;
	color: #8e8e93;
	margin: 2px 0 0;
}
.avatar-wrap {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	background: #e5e5ea;
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
	font-weight: 600;
	color: #8e8e93;
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
	margin-bottom: 24px;
}
.stat-card {
	flex: 1;
	background: #ffffff;
	border: none;
	border-radius: 16px;
	padding: 14px 16px;
	text-align: left;
	display: flex;
	flex-direction: column;
	gap: 6px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
.stat-label {
	font-size: 0.75rem;
	color: #8e8e93;
}
.stat-value {
	font-size: 1.5rem;
	font-weight: 600;
	color: #0f172a;
}
.stat-bar {
	display: block;
	height: 3px;
	border-radius: 999px;
	margin-top: 4px;
}
.stat-bar--green {
	background: #22c55e;
}
.stat-bar--orange {
	background: #f97316;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}
.section-header--top {
	margin-top: 28px;
}
.section-title {
	font-size: 1.1rem;
	font-weight: 600;
	color: #0f172a;
	margin: 0;
	letter-spacing: -0.2px;
}

.state-block {
	display: flex;
	justify-content: center;
	padding: 24px 0;
}
.empty-note {
	color: #8e8e93;
	font-size: 0.85rem;
	padding: 8px 0 4px;
}

.carousel-container {
	position: relative;
	width: 100%;
}

.carousel-nav {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	z-index: 10;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	border: none;
	background: #ffffff;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
	display: flex;
	align-items: center;
	justify-content: center;
	color: #334155;
	padding: 0;
	cursor: pointer;
}

.carousel-nav--left {
	left: -8px;
}

.carousel-nav--right {
	right: -8px;
}

.carousel-track {
	display: flex;
	gap: 12px;
	overflow-x: auto;
	scroll-snap-type: x proximity;
	padding: 8px 4px;
}

.carousel-track::-webkit-scrollbar {
	display: none;
}

.expiring-card {
	flex-shrink: 0;
	width: 140px;
	background: #ffffff;
	border: none;
	border-radius: 18px;
	padding: 10px;
	text-align: center;
	scroll-snap-align: start;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
	display: flex;
	flex-direction: column;
	align-items: center;
}
.expiring-badge {
	display: inline-block;
	font-size: 0.68rem;
	font-weight: 500;
	border-radius: 999px;
	padding: 3px 8px;
	margin-bottom: 6px;
}
.expiring-badge--urgent {
	background: #fee2e2;
	color: #dc2626;
}
.expiring-badge--warning {
	background: #fef3c7;
	color: #d97706;
}

.expiring-image {
	height: 80px;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 6px;
}
.expiring-photo {
	max-height: 100%;
	max-width: 100%;
	object-fit: contain;
}
.placeholder-initial {
	font-size: 1.5rem;
	font-weight: 600;
	color: #8e8e93;
}

.expiring-name {
	font-size: 0.8rem;
	font-weight: 500;
	color: #0f172a;
	margin: 0;
	width: 100%;
	text-align: center;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.recommended-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.recipe-card {
	background: #ffffff;
	border-radius: 18px;
	padding: 12px;
	display: flex;
	align-items: center;
	gap: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
	cursor: pointer;
}
.recipe-img-wrap {
	width: 60px;
	height: 60px;
	border-radius: 12px;
	overflow: hidden;
	flex-shrink: 0;
	background: #f2f2f7;
}
.recipe-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.recipe-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.3rem;
	color: #8e8e93;
}
.recipe-info {
	flex: 1;
	min-width: 0;
}
.recipe-title {
	font-size: 0.92rem;
	font-weight: 600;
	color: #0f172a;
	margin: 0 0 2px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.recipe-match {
	font-size: 0.75rem;
	color: #22c55e;
	font-weight: 500;
	margin: 0;
}
.recipe-arrow {
	color: #c7c7cc;
	font-size: 1.1rem;
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
	color: #8e8e93;
	font-size: 0.85rem;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
.placeholder-icon {
	font-size: 1.8rem;
	color: #c7c7cc;
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
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
.activity-icon {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.2rem;
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
	color: #22c55e;
}
.activity-icon--consumed {
	background: #f2f2f7;
	color: #8e8e93;
}
.activity-info {
	flex: 1;
	min-width: 0;
}
.activity-name {
	font-size: 0.88rem;
	font-weight: 600;
	color: #0f172a;
	margin: 0 0 2px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.activity-meta {
	font-size: 0.75rem;
	color: #8e8e93;
	margin: 0;
}

.archived-note {
	font-size: 0.85rem;
	color: #22c55e;
	font-weight: 600;
	margin-bottom: 16px;
}

.section-label {
	font-size: 0.85rem;
	font-weight: 700;
	color: #6b7280;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	margin-bottom: 8px;
}

.instructions-text {
	white-space: pre-line;
	color: #111827;
	line-height: 1.5;
}

.notes-block {
	margin-top: 16px;
	padding: 12px;
	background: #f3f4f6;
	border-radius: 8px;
}

.submit-btn {
	--background: #22c55e;
	--border-radius: 9999px;
}

.mt-4 {
	margin-top: 16px;
}
</style>
