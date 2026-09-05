<template>
	<ion-app v-if="!isAdminRoute">
		<ion-router-outlet />
	</ion-app>
	<!-- Admin routes skip <ion-app>/<ion-router-outlet> entirely — they're a
	     desktop verification/management UI, not a mobile app screen, so they
	     use plain Vue components under views/admin/ instead of Ionic's
	     mobile-oriented ones. Ionic's base CSS (normalize/structure/
	     typography, imported globally in main.ts) still applies here, which
	     is fine — it's a reasonable reset either way — but nothing under
	     views/admin/ should import @ionic/vue components. -->
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
