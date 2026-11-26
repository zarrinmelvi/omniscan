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

		<!-- Prompt Google users who registered without a last name -->
		<CompleteProfileModal
			:is-open="showCompleteProfile"
			@done="showCompleteProfile = false"
		/>
	</ion-app>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
import CompleteProfileModal from '@/components/CompleteProfileModal.vue'

const route = useRoute()
const router = useRouter()
const { isDesktop } = useBreakpoint()
const authStore = useAuthStore()
const { isDark } = useDarkMode()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isTabsRoute = computed(() => route.path.startsWith('/tabs/'))

// Show the "complete your profile" prompt for Google users who have no last name.
const showCompleteProfile = ref(false)

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
			// Prompt Google users who registered without a last name.
			if (authStore.user?.oauth_provider === 'google' && !authStore.user?.last_name) {
				showCompleteProfile.value = true
			}
		} else if (wasAuthed) {
			await clearBadge()
			await cancelAllReminders()
		}
	},
)
</script>

<style>
/* ── Ion-app / ion-tabs baseline reset ──────────────────────────── */
/* Prevent Ionic web from centering ion-app with a max-width. */
ion-app {
	max-width: 100% !important;
	width: 100% !important;
	margin: 0 !important;
}

/* ion-tabs and ion-page must not add extra width/margin. */
ion-tabs,
.ion-page,
ion-page {
	max-width: 100% !important;
	margin: 0 !important;
}

/* ── Desktop layout (ion-app.desktop-active) ────────────────────── */

/* Outer ion-router-outlet: fixed to the viewport, right of the sidebar.
   Use width: auto + right: 0 so width = calc(100vw - 180px) exactly.
   Do NOT set width: 100% here — that would be 100vw and overflow. */
ion-app.desktop-active > ion-router-outlet {
	position: fixed !important;
	top: 56px;    /* header bar height */
	left: 180px;  /* sidebar width */
	right: 0;
	bottom: 0;
	width: auto !important;
	max-width: none !important;
	overflow: hidden;
}

/* ion-tabs fills the outer outlet completely */
ion-app.desktop-active ion-tabs {
	position: absolute !important;
	inset: 0 !important;
	width: 100% !important;
	max-width: 100% !important;
	margin: 0 !important;
	padding: 0 !important;
	overflow: hidden;
}

/* Inner ion-router-outlet (inside ion-tabs) fills ion-tabs */
ion-app.desktop-active ion-tabs > ion-router-outlet {
	position: absolute !important;
	inset: 0 !important;
	width: 100% !important;
	max-width: 100% !important;
	margin: 0 !important;
	padding: 0 !important;
	overflow: hidden;
}

/* ion-page fills the inner outlet */
ion-app.desktop-active ion-tabs > ion-router-outlet .ion-page,
ion-app.desktop-active ion-tabs > ion-router-outlet ion-page {
	position: absolute !important;
	inset: 0 !important;
	width: 100% !important;
	max-width: 100% !important;
	contain: layout style size !important;
	overflow: hidden;
}

/* ion-content scrolls internally */
ion-app.desktop-active ion-tabs > ion-router-outlet ion-page ion-content {
	--overflow: auto;
	width: 100% !important;
}

/* Zero safe-area insets on desktop (sidebar handles the offset) */
ion-app.desktop-active {
	--ion-safe-area-left: 0px;
	--ion-safe-area-right: 0px;
	--ion-safe-area-top: 0px;
	--ion-safe-area-bottom: 0px;
}

/* ── Persistent desktop header bar ─────────────────────────────── */
.desktop-header-bar {
	display: none;
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

/* ── Hide per-page AppHeader on desktop (shell header takes its place) ── */
ion-app.desktop-active ion-tabs > ion-router-outlet ion-page ion-header.app-header-shell {
	display: none !important;
}
</style>