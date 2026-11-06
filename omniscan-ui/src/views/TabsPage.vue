<template>
	<div class="app-layout" :class="{ 'app-layout--desktop': isDesktop }">
		<!-- Main Page Content Container -->
		<div class="app-main">
			<AppHeader v-if="isDesktop" />

			<div class="app-content">
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
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonRouterOutlet } from '@ionic/vue'
import { homeOutline, fileTrayStackedOutline, cameraOutline, restaurantOutline, personCircleOutline } from 'ionicons/icons'
import AppHeader from '@/components/AppHeader.vue'
import { useBreakpoint } from '@/utils/useBreakpoint'

const route = useRoute()
const { isDesktop } = useBreakpoint()

const hideTabBar = computed(() => route.path === '/tabs/settings' || route.path === '/tabs/notifications')
</script>

<style scoped>
.app-layout {
	display: flex;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	background: #ffffff;
}

.app-main {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	height: 100vh;
	overflow: hidden;
}

.app-content {
	flex: 1;
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

:global(html.ion-palette-dark) .app-layout {
	background: #0f172a;
}
</style>