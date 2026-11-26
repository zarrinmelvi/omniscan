<template>
	<ion-modal
		:is-open="isOpen"
		:backdrop-dismiss="false"
		class="complete-profile-modal"
	>
		<ion-content class="cp-content">
			<div class="cp-wrap">
				<div class="cp-icon">
					<ion-icon :icon="personCircleOutline" />
				</div>

				<h2 class="cp-title">Complete your profile</h2>
				<p class="cp-subtitle">
					Your Google account doesn't include a last name. Please add one to finish setting up your profile.
				</p>

				<div class="cp-field">
					<label class="cp-label">Last Name <span class="cp-required">*</span></label>
					<input
						v-model="lastName"
						type="text"
						class="cp-input"
						:class="{ 'cp-input--error': !!error }"
						placeholder="Enter your last name"
						maxlength="50"
						@input="error = ''"
					/>
					<p v-if="error" class="cp-error">{{ error }}</p>
				</div>

				<button
					class="cp-btn-save"
					:disabled="saving || !lastName.trim()"
					@click="save"
				>
					<ion-spinner v-if="saving" name="crescent" class="cp-spinner" />
					<span v-else>Save and continue</span>
				</button>
			</div>
		</ion-content>
	</ion-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonModal, IonContent, IonIcon, IonSpinner } from '@ionic/vue'
import { personCircleOutline } from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const authStore = useAuthStore()

// Only letters (including accented), spaces, hyphens, and apostrophes.
const NAME_RE = /^[a-zA-ZÀ-ÿ\u0100-\u024F' -]{1,50}$/

const lastName = ref('')
const saving = ref(false)
const error = ref('')

async function save(): Promise<void> {
	const trimmed = lastName.value.trim()
	if (!trimmed) {
		error.value = 'Last name is required.'
		return
	}
	if (!NAME_RE.test(trimmed)) {
		error.value = 'Last name may only contain letters, spaces, hyphens, and apostrophes.'
		return
	}

	saving.value = true
	error.value = ''
	try {
		await apiFetch('/api/users', {
			method: 'PUT',
			body: { last_name: trimmed },
		})

		// Patch the in-memory user so the rest of the app sees the update
		// immediately without a full profile refetch.
		if (authStore.user) {
			authStore.user = {
				...authStore.user,
				last_name: trimmed,
				name: [authStore.user.first_name ?? authStore.user.name, trimmed]
					.filter(Boolean)
					.join(' '),
			}
		}

		emit('done')
	} catch (err) {
		error.value = err instanceof ApiError ? err.message : 'Failed to save. Please try again.'
	} finally {
		saving.value = false
	}
}
</script>

<style scoped>
.complete-profile-modal {
	--height: auto;
	--border-radius: 20px;
	--backdrop-opacity: 0.55;
}

.cp-content {
	--background: #ffffff;
}

.cp-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 36px 28px 40px;
	text-align: center;
	gap: 0;
}

.cp-icon {
	font-size: 3.5rem;
	color: #008744;
	line-height: 1;
	margin-bottom: 16px;
}

.cp-title {
	font-size: 1.2rem;
	font-weight: 700;
	color: #0f172a;
	margin: 0 0 10px;
}

.cp-subtitle {
	font-size: 0.88rem;
	color: #64748b;
	line-height: 1.55;
	margin: 0 0 24px;
	max-width: 320px;
}

.cp-field {
	width: 100%;
	text-align: left;
	margin-bottom: 24px;
}

.cp-label {
	display: block;
	font-size: 0.8rem;
	font-weight: 600;
	color: #475569;
	margin-bottom: 6px;
}

.cp-required {
	color: #ef4444;
}

.cp-input {
	width: 100%;
	box-sizing: border-box;
	height: 44px;
	border: 1px solid #cbd5e1;
	border-radius: 10px;
	padding: 0 14px;
	font-size: 0.9rem;
	color: #1e293b;
	font-family: inherit;
	outline: none;
	transition: border-color 0.12s;
}

.cp-input:focus {
	border-color: #008744;
}

.cp-input--error {
	border-color: #ef4444;
}

.cp-error {
	margin: 6px 0 0;
	font-size: 0.78rem;
	color: #dc2626;
}

.cp-btn-save {
	width: 100%;
	height: 46px;
	background: #008744;
	border: none;
	border-radius: 12px;
	color: #fff;
	font-size: 0.95rem;
	font-weight: 700;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	transition: background 0.12s;
}

.cp-btn-save:hover:not(:disabled) {
	background: #00753a;
}

.cp-btn-save:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.cp-spinner {
	width: 20px;
	height: 20px;
	color: #fff;
}
</style>
