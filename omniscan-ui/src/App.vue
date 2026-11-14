<template>
	<!-- Admin routes: use plain router-view without Ionic wrapper -->
	<template v-if="isAdminRoute">
		<router-view />
		<!-- Global admin toast: lives here so it survives layout -> login navigation -->
		<AdminToast />
	</template>

	<!-- User-facing routes: Ionic app with adaptive navigation -->
	<ion-app v-else :class="{ 'desktop-active': isDesktop && isTabsRoute }">
		<!-- Desktop sidebar — CSS-hidden on mobile -->
		<DesktopNav
			v-if="isDesktop && isTabsRoute"
			:userName="authStore.user?.name"
			:userEmail="authStore.user?.email"
			:userAvatarBase64="authStore.user?.avatar_base64 ?? null" />

		<!-- Persistent desktop header — fixed div, hidden on mobile via CSS -->
		<div v-if="isDesktop && isTabsRoute" class="desktop-header-bar">
			<AppHeader />
		</div>

		<!-- Single router outlet — always rendered, never conditionally swapped -->
		<ion-router-outlet />
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
import AppHeader from '@/components/AppHeader.vue'
import AdminToast from '@/components/admin/AdminToast.vue'
import { startSessionWatcher } from '@/composables/useSessionWatcher'
import { useAuthStore } from '@/stores/authStore'
import { useDarkMode } from '@/composables/useDarkMode'
import { refreshNotifBadge, clearBadge } from '@/utils/appBadge'
import { syncExpiryReminders, cancelAllReminders } from '@/utils/reminderScheduler'
import { useNotificationPrefs } from '@/composables/useNotificationPrefs'

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

		// Listen for deep link redirects back to the app (OAuth / custom scheme callbacks).
		// Only handle actual deep links that target the app's custom scheme or a known
		// callback path. Do NOT trigger on omniscan.website URLs — those are web OAuth
		// redirects that the native Google Sign-In plugin handles internally. Reacting
		// to them here would reload the app from the live website and lose the native session.
		await App.addListener('appUrlOpen', (event) => {
			console.log('[appUrlOpen] URL received:', event.url)

			// Only handle the web OAuth callback path — not generic omniscan.website URLs.
			if (event.url.includes('google-auth-callback')) {
				console.log('[appUrlOpen] Google auth callback detected, routing to /tabs/home')
				router.push('/tabs/home')
			}
		})

		// Refresh the notification badge and sync expiry reminders when the
		// app returns to the foreground (user switched away and came back).
		await App.addListener('appStateChange', ({ isActive }) => {
			if (isActive) {
				refreshNotifBadge()
				syncExpiryReminders()
			}
		})
	}

	// Watch the consumer session in the background
	startSessionWatcher()
})

// Sync reminders and badge when auth state changes (login / logout / refresh).
// On login (or session restore on app launch): load the notification toggle
// preference from the server, refresh the badge, and schedule reminders.
// On logout: clear the badge and cancel all scheduled reminders.
watch(
	() => authStore.isAuthenticated,
	async (authed, wasAuthed) => {
		if (authed) {
			const { loadPrefs } = useNotificationPrefs()
			await loadPrefs()
			await refreshNotifBadge()
			await syncExpiryReminders()
		} else if (wasAuthed) {
			await clearBadge()
			await cancelAllReminders()
		}
	},
)
</script>

<style>
/* Override Ionic web's built-in centering/max-width on ion-app, ion-tabs,
   ion-router-outlet and ion-page. On desktop these must fill 100% of the
   available width — the sidebar handles the left offset, not a max-width. */
ion-app,
ion-tabs,
ion-router-outlet,
.ion-page,
ion-page {
	max-width: 100% !important;
	width: 100% !important;
	margin-left: 0 !important;
	margin-right: 0 !important;
}

/* Neutralize Ionic's default safe-area indentation on desktop */
ion-app.desktop-active,
ion-app.desktop-active ion-tabs,
ion-app.desktop-active ion-router-outlet {
	--ion-safe-area-left: 0px;
	--ion-safe-area-right: 0px;
	--ion-safe-area-top: 0px;
	--ion-safe-area-bottom: 0px;
	max-width: 100% !important;
	width: 100% !important;
	margin: 0 !important;
}

/* ── Desktop layout via CSS on ion-app.desktop-active ─────────── */

/* Only the DIRECT child outlet of ion-app gets the fixed positioning.
   The inner outlet inside ion-tabs must NOT be offset. */
ion-app.desktop-active > ion-router-outlet {
	position: fixed !important;
	top: 56px; /* height of the header bar */
	right: 0;
	bottom: 0;
	left: 180px; /* width of the sidebar */
	width: auto;
}

/* Inner outlet inside ion-tabs: fill its parent naturally, no extra offset */
ion-app.desktop-active ion-tabs > ion-router-outlet {
	position: absolute !important;
	top: 0 !important;
	left: 0 !important;
	right: 0 !important;
	bottom: 0 !important;
	width: 100% !important;
	margin: 0 !important;
	padding: 0 !important;
}

/* ion-tabs itself must fill the outer outlet */
ion-app.desktop-active ion-tabs {
	position: absolute !important;
	inset: 0 !important;
	width: 100% !important;
	max-width: 100% !important;
	margin: 0 !important;
	padding: 0 !important;
}

/* Persistent header bar — fixed above the outlet */
.desktop-header-bar {
	display: none; /* hidden by default (mobile) */
}

ion-app.desktop-active .desktop-header-bar {
	display: block;
	position: fixed;
	top: 0;
	left: 180px;
	right: 0;
	z-index: 100;
	height: 56px;
	background: var(--ion-background-color, #ffffff);
}

/* ion-page inside the inner outlet on desktop: fill the fixed viewport */
ion-app.desktop-active ion-tabs > ion-router-outlet .ion-page,
ion-app.desktop-active ion-tabs > ion-router-outlet ion-page {
	position: absolute !important;
	inset: 0;
	contain: layout style size !important;
}

/* ion-content scrolls internally */
ion-app.desktop-active ion-tabs > ion-router-outlet ion-page ion-content {
	--overflow: auto;
}

/* On desktop, per-page ion-header AppHeaders are hidden —
   the .desktop-header-bar above takes their place */
ion-app.desktop-active ion-tabs > ion-router-outlet ion-page ion-header.app-header-shell {
	display: none !important;
}
</style>