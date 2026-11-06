<template>
	<div class="app-layout" :class="{ 'app-layout--desktop': isDesktop }">
		<!-- Left Sidebar Navigation for Desktop/Tablet -->
		<DesktopNav
			v-if="isDesktop"
			:user-name="userName"
			:user-email="userEmail"
			:user-avatar-base64="userAvatarBase64" />

		<!-- Main Page Content Container -->
		<div class="app-main">
			<AppHeader v-if="isDesktop" />

			<ion-tabs>
				<ion-router-outlet></ion-router-outlet>

				<!-- Bottom tab bar: hidden on desktop (>= 768px) and settings/notifications -->
				<ion-tab-bar slot="bottom" v-show="!hideTabBar && !isDesktop">
					<ion-tab-button tab="home" href="/tabs/home">
						<ion-icon :icon="homeOutline" />
						<ion-label>Home</ion-label>
					</ion-tab-button>

					<ion-tab-button tab="pantry" href="/tabs/pantry">
						<ion-icon :icon="fileTrayStackedOutline" />
						<ion-label>Pantry</ion-label>
					</ion-tab-button>

					<ion-tab-button tab="scan" href="/tabs/scan">
						<ion-icon :icon="cameraOutline" />
						<ion-label>Scan</ion-label>
					</ion-tab-button>

					<ion-tab-button tab="recipes" href="/tabs/recipes">
						<ion-icon :icon="restaurantOutline" />
						<ion-label>Recipes</ion-label>
					</ion-tab-button>

					<ion-tab-button tab="profile" href="/tabs/profile">
						<ion-icon :icon="personCircleOutline" />
						<ion-label>Profile</ion-label>
					</ion-tab-button>
				</ion-tab-bar>
			</ion-tabs>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonRouterOutlet } from '@ionic/vue'
import { homeOutline, fileTrayStackedOutline, cameraOutline, restaurantOutline, personCircleOutline } from 'ionicons/icons'
import DesktopNav from '@/components/DesktopNav.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useBreakpoint } from '@/utils/useBreakpoint'
import { apiFetch } from '@/utils/api'

interface UserDto {
	id: number
	name: string
	email?: string
	avatar_base64: string | null
}

const route = useRoute()
const { isDesktop } = useBreakpoint()

const userName = ref('')
const userEmail = ref('')
const userAvatarBase64 = ref<string | null>(null)

const hideTabBar = computed(() => route.path === '/tabs/settings' || route.path === '/tabs/notifications')

async function loadUserInfo(): Promise<void> {
	try {
		const res = await apiFetch<{ success: boolean; user: UserDto }>('/api/users', { method: 'GET' })
		if (res.user) {
			userName.value = res.user.name
			userEmail.value = res.user.email || ''
			userAvatarBase64.value = res.user.avatar_base64
		}
	} catch {
		/* ignore */
	}
}

onMounted(() => {
	loadUserInfo()
})
</script>

<style scoped>
.app-layout {
	display: flex;
	width: 100%;
	height: 100vh;
	overflow: hidden;
}

.app-main {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	height: 100%;
	overflow: hidden;
}
</style>