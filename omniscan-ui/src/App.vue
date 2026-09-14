<template>
	<ion-app v-if="!isAdminRoute">
		<ion-router-outlet />
	</ion-app>
	<router-view v-else />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { IonApp, IonRouterOutlet } from '@ionic/vue'

const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

// Applies the Dark Mode preference saved from Settings on every app boot —
// without this, the toggle would only visually take effect while the
// Settings page itself was open.
onMounted(() => {
	const darkModeEnabled = localStorage.getItem('omniscan_dark_mode') === 'true'
	document.documentElement.classList.toggle('ion-palette-dark', darkModeEnabled)
})
</script>
