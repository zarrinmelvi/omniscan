<template>
	<!-- Admin routes: use plain router-view without Ionic wrapper -->
	<router-view v-if="isAdminRoute" />
	
	<!-- User-facing routes: Ionic app with adaptive navigation -->
	<ion-app v-else>
		<!-- Desktop navigation sidebar (>= 1024px AND /tabs/ routes only) -->
		<DesktopNav v-if="isDesktop && isTabsRoute" />
		
		<!-- Main content area with offset when desktop nav is shown -->
		<ion-router-outlet :class="{ 'with-desktop-nav': isDesktop && isTabsRoute }" />
	</ion-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useBreakpoint } from '@/utils/useBreakpoint'
import DesktopNav from '@/components/DesktopNav.vue'

const route = useRoute()
const { isDesktop } = useBreakpoint()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isTabsRoute = computed(() => route.path.startsWith('/tabs/'))

// Helper to update native status bar icons based on dark mode state
async function updateStatusBar(isDark: boolean) {
	if (Capacitor.isNativePlatform()) {
		// Style.Dark = Light text/icons for dark backgrounds
		// Style.Light = Dark text/icons for light backgrounds
		await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
	}
}

onMounted(async () => {
	const darkModeEnabled = localStorage.getItem('omniscan_dark_mode') === 'true'
	document.documentElement.classList.toggle('ion-palette-dark', darkModeEnabled)

	if (Capacitor.isNativePlatform()) {
		await StatusBar.setOverlaysWebView({ overlay: false })
		await updateStatusBar(darkModeEnabled)
	}
})
</script>

<style scoped>
/* Offset main content when desktop navigation is shown */
.with-desktop-nav {
	margin-left: 260px;
}

/* Remove offset on smaller screens */
@media (max-width: 1023px) {
	.with-desktop-nav {
		margin-left: 0;
	}
}
</style>