<template>
	<ion-page>
		<ion-content class="recipe-content">
			<!-- Header Block -->
			<div class="header-container">
				<h1 class="page-title">Recipes</h1>
				<p class="page-subtitle">Based on your pantry items</p>

				<!-- Custom Segment Tabs -->
				<div class="tab-chips-container">
					<button
						type="button"
						class="tab-chip"
						:class="{ 'tab-chip--active-all': activeTab === 'all' }"
						@click="setTab('all')">
						All Recipes
					</button>
					<button
						type="button"
						class="tab-chip"
						:class="{ 'tab-chip--active-liked': activeTab === 'liked' }"
						@click="setTab('liked')">
						<ion-icon :icon="activeTab === 'liked' ? heart : heartOutline" class="chip-icon" />
						Liked
					</button>
					<button
						type="button"
						class="tab-chip"
						:class="{ 'tab-chip--active-made': activeTab === 'made' }"
						@click="setTab('made')">
						<ion-icon :icon="archiveOutline" class="chip-icon" />
						Made
						<span v-if="madeCount > 0" class="tab-badge">{{ madeCount }}</span>
					</button>
				</div>
			</div>

			<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>

			<div v-if="isLoading" class="loading-container">
				<ion-spinner name="crescent" />
			</div>

			<!-- Dynamic Empty States -->
			<div v-else-if="recipes.length === 0" class="empty-state">
				<template v-if="activeTab === 'liked'">
					<ion-icon :icon="heartOutline" class="empty-icon light-gray-icon" />
					<h3 class="empty-title">No liked recipes yet</h3>
					<p class="empty-subtext">Tap the heart icon on any recipe to save it here</p>
				</template>
				<template v-else-if="activeTab === 'made'">
					<ion-icon :icon="archiveOutline" class="empty-icon light-gray-icon" />
					<h3 class="empty-title">No made recipes yet</h3>
					<p class="empty-subtext">Recipes you make will appear here</p>
				</template>
				<template v-else>
					<ion-icon :icon="restaurantOutline" class="empty-icon light-gray-icon" />
					<h3 class="empty-title">No recipes found</h3>
					<p class="empty-subtext">{{ emptyMessage }}</p>
				</template>
			</div>

			<!-- Recipe Cards Grid -->
			<div v-else class="cards-list">
				<div v-for="recipe in recipes" :key="recipe.id" class="recipe-card" @click="openRecipeDetail(recipe)">
					<div class="card-image-wrapper">
						<img v-if="recipe.image_url" :src="recipe.image_url" :alt="recipe.name" class="recipe-image" />
						<div v-else class="recipe-image-placeholder">
							<ion-icon :icon="restaurantOutline" class="placeholder-icon" />
						</div>

						<div v-if="recipe.made || activeTab === 'made'" class="made-overlay-badge">
							<ion-icon :icon="checkmarkCircle" class="made-badge-icon" />
							<span>Made</span>
						</div>

						<button
							type="button"
							class="heart-overlay-btn"
							:disabled="likingId === recipe.id"
							@click.stop="toggleLike(recipe)">
							<ion-icon :icon="recipe.liked ? heart : heartOutline" :class="{ 'heart-icon--liked': recipe.liked }" />
						</button>
					</div>

					<div class="card-body">
						<div class="title-row">
							<h2 class="card-title">{{ recipe.name }}</h2>
							<ion-icon :icon="chevronForwardOutline" class="chevron-icon" />
						</div>

						<p class="card-instructions">{{ recipe.instructions }}</p>

						<div class="card-footer">
							<span class="pantry-count">{{ recipe.matched_count }} in pantry</span>
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
import { ref, computed, onMounted } from 'vue'
import {
	IonPage,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonContent,
	IonChip,
	IonIcon,
	IonSpinner,
	IonButton,
	IonAlert,
	IonModal,
} from '@ionic/vue'
import { restaurantOutline, closeOutline, heart, heartOutline, archiveOutline, checkmarkCircle, chevronForwardOutline } from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'
import RecipeDetailModal from '@/components/RecipeDetailModal.vue'

interface SuggestedRecipe {
	id: number
	name: string
	instructions: string
	matched_ingredients?: string[]
	matched_count: number
	total_count: number
	missing_ingredients: string[]
	liked: boolean
	made: boolean
	image_url?: string
}

interface MadeRecipeResult {
	id: number
	name: string
	adapted_instructions: string
	adjusted_ingredients: { name: string; amount_text: string }[]
	notes: string
}

type RecipeTab = 'all' | 'liked' | 'made'

const TAB_ENDPOINTS: Record<RecipeTab, string> = {
	all: '/api/recipes/suggest',
	liked: '/api/recipes/liked',
	made: '/api/recipes/made',
}

const TAB_DEFAULT_EMPTY_MESSAGE: Record<RecipeTab, string> = {
	all: 'No safe recipes match your pantry right now.',
	liked: "You haven't liked any recipes yet.",
	made: "You haven't made any recipes yet.",
}

const activeTab = ref<RecipeTab>('all')
const emptyMessage = ref<string>(TAB_DEFAULT_EMPTY_MESSAGE.all)
const likingId = ref<number | null>(null)

const recipes = ref<SuggestedRecipe[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const makingId = ref<number | null>(null)

const madeCount = computed(() => {
	if (activeTab.value === 'made') return recipes.value.length
	return recipes.value.filter((r) => r.made).length
})

// Detail modal state
const isDetailModalOpen = ref(false)
const selectedRecipe = ref<SuggestedRecipe | null>(null)

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

function setTab(tab: RecipeTab): void {
	if (activeTab.value === tab) return
	activeTab.value = tab
	fetchSuggestions()
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

async function fetchSuggestions(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null

	try {
		const data = await apiFetch<{ success: boolean; recipes: SuggestedRecipe[]; message?: string }>(TAB_ENDPOINTS[activeTab.value], {
			method: 'GET',
		})
		recipes.value = data.recipes
		emptyMessage.value = data.message ?? TAB_DEFAULT_EMPTY_MESSAGE[activeTab.value]
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load recipes.'
		console.error('Failed to fetch recipes:', err)
	} finally {
		isLoading.value = false
	}
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
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to update like status.'
		console.error('Toggle like error:', err)
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

		const affected = recipes.value.find((r) => r.id === recipeId)
		if (affected) {
			affected.made = data.made ?? true
			affected.liked = data.liked ?? affected.liked
		}

		await fetchSuggestions()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to update pantry after making this recipe.'
		console.error('Make recipe error:', err)
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
		await fetchSuggestions()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to remove recipe from Made list.'
		console.error('Unmake recipe error:', err)
	}
}

onMounted(() => {
	fetchSuggestions()
})
</script>

<style scoped>
.recipe-content {
	--background: #f9fafb;
}

.header-container {
	padding: 24px 20px 16px;
	background: #ffffff;
}

.page-title {
	font-size: 1.75rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 4px;
	letter-spacing: -0.02em;
}

.page-subtitle {
	color: #6b7280;
	font-size: 0.85rem;
	margin: 0 0 20px;
}

/* Custom Segment Tabs */
.tab-chips-container {
	display: flex;
	gap: 10px;
}

.tab-chip {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 16px;
	border-radius: 9999px;
	background: #f3f4f6;
	color: #4b5563;
	font-size: 0.85rem;
	font-weight: 600;
	border: none;
	cursor: pointer;
	transition: all 0.2s ease;
}

.tab-chip--active-all {
	background: #05c450;
	color: #ffffff;
}

.tab-chip--active-liked {
	background: #ff2d55;
	color: #ffffff;
}

.tab-chip--active-made {
	background: #344154;
	color: #ffffff;
}

.tab-badge {
	background: #ffffff;
	color: #344154;
	font-size: 0.72rem;
	font-weight: 700;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-left: 2px;
}

.chip-icon {
	font-size: 0.95rem;
}

.loading-container {
	display: flex;
	justify-content: center;
	padding: 40px 0;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 80px 20px;
	text-align: center;
}

.empty-icon {
	font-size: 4rem;
	margin-bottom: 16px;
}

.light-gray-icon {
	color: #e5e7eb;
}

.empty-title {
	font-size: 1.1rem;
	font-weight: 600;
	color: #9ca3af;
	margin: 0 0 6px;
}

.empty-subtext {
	font-size: 0.82rem;
	color: #9ca3af;
	margin: 0;
}

.cards-list {
	padding: 16px 20px 32px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.recipe-card {
	background: #ffffff;
	border-radius: 20px;
	overflow: hidden;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	border: 1px solid #f3f4f6;
	cursor: pointer;
	transition: transform 0.2s ease;
}

.card-image-wrapper {
	position: relative;
	width: 100%;
	height: 180px;
	background: #e5e7eb;
}

.recipe-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.recipe-image-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f3f4f6;
}

.placeholder-icon {
	font-size: 2.5rem;
	color: #9ca3af;
}

.made-overlay-badge {
	position: absolute;
	top: 14px;
	left: 14px;
	display: flex;
	align-items: center;
	gap: 4px;
	background: rgba(52, 65, 84, 0.85);
	backdrop-filter: blur(4px);
	color: #ffffff;
	font-size: 0.75rem;
	font-weight: 600;
	padding: 4px 10px;
	border-radius: 9999px;
}

.made-badge-icon {
	color: #05c450;
	font-size: 0.9rem;
}

.heart-overlay-btn {
	position: absolute;
	top: 14px;
	right: 14px;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.85);
	backdrop-filter: blur(4px);
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: #6b7280;
	font-size: 1.15rem;
	transition: background 0.2s;
}

.heart-icon--liked {
	color: #ef4444;
}

.card-body {
	padding: 16px;
}

.title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 6px;
}

.card-title {
	font-size: 1.15rem;
	font-weight: 700;
	color: #111827;
	margin: 0;
}

.chevron-icon {
	color: #9ca3af;
	font-size: 1.1rem;
}

.card-instructions {
	font-size: 0.82rem;
	color: #6b7280;
	line-height: 1.45;
	margin: 0 0 14px;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.pantry-count {
	font-size: 0.78rem;
	font-weight: 600;
	color: #05c450;
}

.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	margin: 16px 20px 0;
	font-size: 0.85rem;
}

.archived-note {
	font-size: 0.85rem;
	color: #05c450;
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
	--background: #05c450;
	--border-radius: 9999px;
}

.mt-4 {
	margin-top: 16px;
}
</style>