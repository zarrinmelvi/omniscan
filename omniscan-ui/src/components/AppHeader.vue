<template>
	<div class="app-header">
		<div class="app-header__left">
			<div v-if="isDesktop" class="app-header__breadcrumb">
				<span class="app-header__breadcrumb-root">OmniScan</span>
				<span class="app-header__breadcrumb-sep"> / </span>
				<span class="app-header__breadcrumb-page">{{ breadcrumbLabel }}</span>
			</div>
			<slot v-else name="title">
				<span class="app-header__brand">OmniScan</span>
			</slot>
		</div>
		<div class="app-header__actions">
			<slot name="actions" />
			<button type="button" class="app-header__theme" @click="toggleDarkMode" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
				<ion-icon :icon="isDark ? sunnyOutline : moonOutline" />
			</button>
			<button type="button" class="app-header__bell" @click="goToNotifications" aria-label="Notifications">
				<ion-icon :icon="notificationsOutline" />
				<span v-if="unreadNotifCount > 0" class="app-header__notif-badge">
					{{ unreadNotifCount > 9 ? '9+' : unreadNotifCount }}
				</span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { notificationsOutline, moonOutline, sunnyOutline } from 'ionicons/icons'
import { apiFetch } from '@/utils/api'
import { useDarkMode } from '@/composables/useDarkMode'
import { useBreakpoint } from '@/utils/useBreakpoint'

const router = useRouter()
const route = useRoute()
const { isDesktop } = useBreakpoint()
const { isDark, toggle: toggleDarkMode } = useDarkMode()

const props = defineProps<{ pageName?: string }>()

const unreadNotifCount = ref(0)

const breadcrumbLabel = computed(() => {
	if (props.pageName) return props.pageName
	const map: Record<string, string> = {
		'/tabs/home': 'Home',
		'/tabs/pantry': 'Pantry',
		'/tabs/scan': 'Upload',
		'/tabs/recipes': 'Recipes',
		'/tabs/profile': 'Profile',
		'/tabs/settings': 'Settings',
		'/tabs/notifications': 'Notifications',
	}
	return map[route.path] ?? (route.meta?.breadcrumb as string) ?? ''
})

async function fetchUnreadNotifs(): Promise<void> {
	try {
		const res = await apiFetch<{ success: boolean; unread_count: number }>('/api/notification', { method: 'GET' })
		unreadNotifCount.value = res.unread_count || 0
	} catch {
		unreadNotifCount.value = 0
	}
}

function goToNotifications(): void {
	router.push('/tabs/notifications')
}

defineExpose({ fetchUnreadNotifs })

onMounted(() => {
	fetchUnreadNotifs()
})
</script>

<style scoped>
.app-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 60px;
	padding: 0 24px;
	background: #ffffff;
	border-bottom: 1px solid var(--ion-border-color, #e5e7eb);
	width: 100%;
	box-sizing: border-box;
	flex-shrink: 0;
}
.app-header__left {
	display: flex;
	align-items: center;
	min-width: 0;
}
.app-header__breadcrumb {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.95rem;
}
.app-header__breadcrumb-root {
	color: #6b7280;
	font-weight: 500;
}
.app-header__breadcrumb-sep {
	color: #9ca3af;
}
.app-header__breadcrumb-page {
	color: #111827;
	font-weight: 700;
}
.app-header__brand {
	font-size: 1.1rem;
	font-weight: 800;
	color: #05c450;
	letter-spacing: -0.01em;
}
.app-header__actions {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-left: auto;
}
.app-header__theme {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	border-radius: 50%;
	background: #f1f5f9;
	color: #334155;
	font-size: 1.15rem;
	cursor: pointer;
}
.dark .app-header__theme,
:global(html.ion-palette-dark) .app-header__theme {
	background: #334155;
	color: #fbbf24;
}
.app-header__bell {
	position: relative;
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	border-radius: 50%;
	background: #f1f5f9;
	color: #334155;
	font-size: 1.2rem;
	cursor: pointer;
}
.app-header__notif-badge {
	position: absolute;
	top: -2px;
	right: -2px;
	min-width: 17px;
	height: 17px;
	padding: 0 4px;
	border-radius: 9999px;
	background: #ef4444;
	color: #ffffff;
	font-size: 0.65rem;
	font-weight: 700;
	line-height: 17px;
	text-align: center;
	border: 2px solid #ffffff;
}
:global(html.ion-palette-dark) .app-header {
	background: #1e293b;
	border-bottom-color: #334155;
}
:global(html.ion-palette-dark) .app-header__breadcrumb-root {
	color: #94a3b8;
}
:global(html.ion-palette-dark) .app-header__breadcrumb-page {
	color: #f1f5f9;
}
:global(html.ion-palette-dark) .app-header__bell {
	background: #334155;
	color: #e2e8f0;
}
</style>