<template>
	<div class="app-header">
		<slot name="title">
			<span class="app-header__brand">OmniScan</span>
		</slot>
		<div class="app-header__actions">
			<slot name="actions" />
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { notificationsOutline } from 'ionicons/icons'
import { apiFetch } from '@/utils/api'

const router = useRouter()
const unreadNotifCount = ref(0)

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

onMounted(fetchUnreadNotifs)
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
.dark .app-header__bell {
	background: #334155;
	color: #e2e8f0;
}
</style>
