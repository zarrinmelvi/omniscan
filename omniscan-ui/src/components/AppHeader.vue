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
			<span class="app-header__datetime">{{ philippineTime }}</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const philippineTime = ref('')
let timeInterval: ReturnType<typeof setInterval> | undefined

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
	return map[route.path] ?? route.meta?.breadcrumb as string ?? ''
})

function updatePhilippineTime(): void {
	const now = new Date()
	const options: Intl.DateTimeFormatOptions = {
		timeZone: 'Asia/Manila',
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}
	const formatter = new Intl.DateTimeFormat('en-US', options)
	const parts = formatter.formatToParts(now)
	
	// Extract and reconstruct as "Weekday, Month Day, Year - Time AM/PM PHT"
	const weekday = parts.find(p => p.type === 'weekday')?.value
	const month = parts.find(p => p.type === 'month')?.value
	const day = parts.find(p => p.type === 'day')?.value
	const year = parts.find(p => p.type === 'year')?.value
	const hour = parts.find(p => p.type === 'hour')?.value
	const minute = parts.find(p => p.type === 'minute')?.value
	const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value
	
	philippineTime.value = `${weekday}, ${month} ${day}, ${year} - ${hour}:${minute} ${dayPeriod} PHT`
}

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

// Expose a refresh method so parent pages can refresh the badge after actions.
defineExpose({ fetchUnreadNotifs })

onMounted(() => {
	fetchUnreadNotifs()
	updatePhilippineTime()
	timeInterval = setInterval(updatePhilippineTime, 60000)
})

onUnmounted(() => {
	if (timeInterval) clearInterval(timeInterval)
})
</script>

<style scoped>
.app-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 16px;
	background: #ffffff;
	border-bottom: 1px solid #f1f5f9;
}
.app-header__left {
	display: flex;
	align-items: center;
	min-width: 0;
}
.app-header__breadcrumb {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 0.9rem;
}
.app-header__breadcrumb-root {
	color: #94a3b8;
}
.app-header__breadcrumb-sep {
	color: #94a3b8;
}
.app-header__breadcrumb-page {
	color: #111827;
	font-weight: 700;
}
.app-header__brand {
	font-size: 1.05rem;
	font-weight: 700;
	color: #05c450;
	letter-spacing: -0.01em;
}
.app-header__actions {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-left: auto;
}
.app-header__datetime {
	font-size: 0.78rem;
	color: #64748b;
	white-space: nowrap;
	margin-right: 16px;
	font-weight: 500;
}
.app-header__theme {
	width: 38px;
	height: 38px;
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
.dark .app-header__theme {
	background: #334155;
	color: #fbbf24;
}
.app-header__bell {
	position: relative;
	width: 38px;
	height: 38px;
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
.dark .app-header,
:global(body.dark) .app-header {
	background: #1e293b;
	border-bottom-color: #334155;
}
.dark .app-header__datetime,
:global(body.dark) .app-header__datetime {
	color: #94a3b8;
}
.dark .app-header__bell {
	background: #334155;
	color: #e2e8f0;
}
</style>
