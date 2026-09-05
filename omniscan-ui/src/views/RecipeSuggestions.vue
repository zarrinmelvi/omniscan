<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-title>Recipe Suggestions</ion-title>
			</ion-toolbar>
		</ion-header>

		<ion-content class="ion-padding">
			<ion-segment v-model="activeTab" shape="round" class="tab-segment" @ionChange="onTabChange">
				<ion-segment-button value="all">
					<ion-label>All Recipes</ion-label>
				</ion-segment-button>
				<ion-segment-button value="liked">
					<ion-label>Liked</ion-label>
				</ion-segment-button>
				<ion-segment-button value="made">
					<ion-label>Made</ion-label>
				</ion-segment-button>
			</ion-segment>

			<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>

			<div v-if="isLoading" class="flex justify-center py-10">
				<ion-spinner name="crescent" />
			</div>

			<div v-else-if="recipes.length === 0" class="empty-state">
				<ion-icon :icon="restaurantOutline" class="empty-icon" />
				<p>{{ emptyMessage }}</p>
			</div>

			<ion-card v-for="recipe in recipes" :key="recipe.id">
				<ion-card-header class="card-header-row">
					<div>
						<ion-card-title>{{ recipe.name }}</ion-card-title>
						<ion-card-subtitle>
							{{ recipe.matched_count }}/{{ recipe.total_count }} ingredients in pantry
							<ion-chip v-if="recipe.made" color="success" class="made-chip">Made</ion-chip>
						</ion-card-subtitle>
					</div>
					<ion-button fill="clear" class="like-button" :disabled="likingId === recipe.id" @click="toggleLike(recipe)">
						<ion-icon :icon="recipe.liked ? heart : heartOutline" :color="recipe.liked ? 'danger' : 'medium'" slot="icon-only" />
					</ion-button>
				</ion-card-header>

				<ion-card-content>
					<ion-progress-bar :value="recipe.matched_count / recipe.total_count" :color="matchColor(recipe)" class="mb-3" />

					<p class="text-gray-700 mb-3">{{ recipe.instructions }}</p>

					<div v-if="recipe.missing_ingredients.length > 0">
						<p class="missing-label">Missing:</p>
						<ion-chip v-for="(missing, index) in recipe.missing_ingredients" :key="index" color="medium">
							{{ missing }}
						</ion-chip>
					</div>
					<p v-else class="all-set-label">You have everything for this recipe!</p>

					<ion-button expand="block" fill="outline" class="mt-4" :disabled="makingId === recipe.id" @click="confirmMakeRecipe(recipe)">
						{{ makingId === recipe.id ? 'Updating pantry...' : 'Make Recipe' }}
					</ion-button>
				</ion-card-content>
			</ion-card>

			<ion-alert
				:is-open="isAlertOpen"
				header="Make this recipe?"
				:message="alertMessage"
				:buttons="alertButtons"
				@didDismiss="isAlertOpen = false" />

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
						<p class="archived-note" v-if="archivedCount > 0">
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

					<ion-button expand="block" class="mt-4" @click="isResultModalOpen = false">Done</ion-button>
				</ion-content>
			</ion-modal>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
	IonPage,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonContent,
	IonCard,
	IonCardHeader,
	IonCardTitle,
	IonCardSubtitle,
	IonCardContent,
	IonChip,
	IonIcon,
	IonSpinner,
	IonProgressBar,
	IonButton,
	IonAlert,
	IonModal,
	IonSegment,
	IonSegmentButton,
	IonLabel,
} from '@ionic/vue'
import { restaurantOutline, closeOutline, heart, heartOutline } from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

interface SuggestedRecipe {
	id: number
	name: string
	instructions: string
	matched_count: number
	total_count: number
	missing_ingredients: string[]
	liked: boolean
	made: boolean
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

const isResultModalOpen = ref(false)
const madeRecipeResult = ref<MadeRecipeResult | null>(null)
const archivedCount = ref(0)

const isAlertOpen = ref(false)
const alertMessage = ref('')
const pendingRecipeId = ref<number | null>(null)

const alertButtons = [
	{ text: 'Cancel', role: 'cancel' },
	{
		text: 'Confirm',
		role: 'confirm',
		handler: () => {
			if (pendingRecipeId.value !== null) {
				void makeRecipe(pendingRecipeId.value)
			}
		},
	},
]

function matchColor(recipe: SuggestedRecipe): 'success' | 'warning' {
	return recipe.matched_count / recipe.total_count >= 0.8 ? 'success' : 'warning'
}

function confirmMakeRecipe(recipe: SuggestedRecipe): void {
	pendingRecipeId.value = recipe.id
	alertMessage.value = `This will remove "${recipe.name}"'s matched ingredients from your pantry.`
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

function onTabChange(): void {
	void fetchSuggestions()
}

async function toggleLike(recipe: SuggestedRecipe): Promise<void> {
	if (likingId.value === recipe.id) return

	likingId.value = recipe.id
	// Optimistic update — flip immediately, revert below if the request fails.
	// A card the user just liked while on the Liked tab stays visible until
	// the next refetch rather than vanishing mid-tap, which reads as a bug
	// even though it'd be technically correct.
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

onMounted(() => {
	fetchSuggestions()
})
</script>

<style scoped>
.tab-segment {
	margin-bottom: 16px;
}
.card-header-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
}
.like-button {
	margin: 0;
	flex-shrink: 0;
}
.made-chip {
	height: 20px;
	font-size: 0.7rem;
	margin-left: 6px;
	vertical-align: middle;
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
.missing-label {
	font-size: 0.85rem;
	font-weight: 600;
	color: var(--ion-color-medium);
	margin-bottom: 4px;
}
.all-set-label {
	font-size: 0.85rem;
	color: var(--ion-color-success);
	font-weight: 500;
}
.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 12px;
	font-size: 0.85rem;
}
.archived-note {
	font-size: 0.85rem;
	color: var(--ion-color-success);
	font-weight: 600;
	margin-bottom: 16px;
}
.section-label {
	font-size: 0.85rem;
	font-weight: 700;
	color: var(--ion-color-medium);
	text-transform: uppercase;
	letter-spacing: 0.02em;
	margin-bottom: 8px;
}
.instructions-text {
	white-space: pre-line;
	color: var(--ion-color-dark);
	line-height: 1.5;
}
.notes-block {
	margin-top: 16px;
	padding: 12px;
	background: var(--ion-color-light);
	border-radius: 8px;
}
.mt-4 {
	margin-top: 16px;
}
</style>
