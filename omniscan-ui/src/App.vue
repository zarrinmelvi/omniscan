<template>
	<!-- Admin routes: use plain router-view without Ionic wrapper -->
	<template v-if="isAdminRoute">
		<router-view />
		<!-- Global admin toast: lives here so it survives layout -> login navigation -->
		<AdminToast />
	</template>

	<!-- User-facing routes: Ionic app with adaptive navigation -->
	<ion-app v-else>
		<!-- Desktop navigation sidebar (>= 1024px AND /tabs/ routes only) -->
		<DesktopNav
			v-if="isDesktop && isTabsRoute"
			:userName="authStore.user?.name"
			:userEmail="authStore.user?.email"
			:userAvatarBase64="null" />

		<!-- Main content area with offset when desktop nav is shown -->
		<ion-router-outlet :class="{ 'with-desktop-nav': isDesktop && isTabsRoute }" />
	</ion-app>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App } from '@capacitor/app'
import { useBreakpoint } from '@/utils/useBreakpoint'
import DesktopNav from '@/components/DesktopNav.vue'
import AdminToast from '@/components/admin/AdminToast.vue'
import { startSessionWatcher } from '@/composables/useSessionWatcher'
import { useAuthStore } from '@/stores/authStore'
import { useDarkMode } from '@/composables/useDarkMode'

const route = useRoute()
const router = useRouter()
const { isDesktop } = useBreakpoint()
const authStore = useAuthStore()
const { isDark } = useDarkMode()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isTabsRoute = computed(() => route.path.startsWith('/tabs/'))

// Helper to update native status bar icons and background color based on dark mode state
async function updateStatusBar(dark: boolean) {
	if (Capacitor.isNativePlatform()) {
		// Style.Dark = Light icons for dark background (#09130e)
		// Style.Light = Dark icons for light background (#f8f9fa)
		await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
		await StatusBar.setBackgroundColor({ color: dark ? '#09130e' : '#f8f9fa' })
	}
}

// Dynamically watch for dark mode changes across the entire app
watch(isDark, (dark) => {
	updateStatusBar(dark)
})

onMounted(async () => {
	if (Capacitor.isNativePlatform()) {
		await StatusBar.show()
		await StatusBar.setOverlaysWebView({ overlay: true })
		await updateStatusBar(isDark.value)

		// Listen for deep link redirects back to the app (OAuth / custom scheme callbacks)
		await App.addListener('appUrlOpen', (event) => {
			console.log('App opened with URL:', event.url)

			// Handle redirect back from Google OAuth or omniscan.website domain
			if (event.url.includes('google-auth-callback') || event.url.includes('omniscan.website')) {
				router.push('/tabs/home')
			}
		})
	}

	// Watch the consumer session in the background
	startSessionWatcher()
})
</script>

<style scoped>
/* Offset main content when desktop navigation is shown */
.with-desktop-nav {
	margin-left: 180px;
}

/* Remove offset on smaller screens */
@media (max-width: 1023px) {
	.with-desktop-nav {
		margin-left: 0;
	}
}
</style>