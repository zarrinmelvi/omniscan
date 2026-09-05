<template>
	<ion-tabs>
		<ion-router-outlet></ion-router-outlet>

		<ion-tab-bar slot="bottom" v-show="!hideTabBar">
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonRouterOutlet } from '@ionic/vue'
import { homeOutline, fileTrayStackedOutline, cameraOutline, restaurantOutline, personCircleOutline } from 'ionicons/icons'

// Settings and Notifications are routed as children of /tabs/ (sharing this
// outlet) so back-navigation works reliably, but they're meant to look like
// full-screen pushed pages, not tabs — so the bar hides on those two routes.
const route = useRoute()
const hideTabBar = computed(() => route.path === '/tabs/settings' || route.path === '/tabs/notifications')
</script>
