<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-buttons slot="start">
					<ion-button @click="goBackToProfile">
						<ion-icon :icon="chevronBackOutline" slot="icon-only" />
					</ion-button>
				</ion-buttons>
				<ion-title>
					Notifications
					<span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
				</ion-title>
				<ion-buttons slot="end">
					<ion-button fill="clear" :disabled="unreadCount === 0 || isMarkingAll" @click="markAllRead"> Mark all read </ion-button>
				</ion-buttons>
			</ion-toolbar>
		</ion-header>

		<ion-content class="ion-padding notif-content">
			<div v-if="isLoading" class="state-block">
				<ion-spinner name="crescent" />
			</div>

			<div v-else-if="loadError" class="state-block">
				<ion-icon :icon="alertCircleOutline" size="large" color="danger" />
				<p>{{ loadError }}</p>
				<ion-button @click="fetchNotifications">Try again</ion-button>
			</div>

			<div v-else-if="notifications.length === 0" class="empty-state">
				<ion-icon :icon="notificationsOffOutline" class="empty-icon" />
				<p>No notifications yet.</p>
			</div>

			<div v-else class="notif-list">
				<button
					v-for="notif in notifications"
					:key="notif.id"
					type="button"
					class="notif-card"
					:class="{ 'notif-card--unread': !notif.is_read }"
					:style="{ borderLeftColor: !notif.is_read ? colorForType(notif.type) : 'transparent' }"
					@click="handleNotifClick(notif)">
					<div class="notif-icon" :style="{ background: bgForType(notif.type), color: colorForType(notif.type) }">
						<ion-icon :icon="iconForType(notif.type)" />
					</div>
					<div class="notif-body">
						<p class="notif-title">{{ titleForType(notif.type) }}</p>
						<p class="notif-message">{{ notif.message }}</p>
						<p class="notif-time">{{ formatRelativeTime(notif.created_at) }}</p>
					</div>
					<ion-icon v-if="notif.is_read" :icon="checkmarkOutline" class="read-check" />
				</button>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/vue'
import {
	chevronBackOutline,
	alertCircleOutline,
	notificationsOffOutline,
	checkmarkOutline,
	warningOutline,
	restaurantOutline,
	searchOutline,
	handLeftOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

const router = useRouter()

// Notifications now lives inside /tabs/ (a sibling of Profile in the same
// nested outlet), so this push is just normal same-outlet navigation — see
// SettingsPage.vue for why the previous top-level-route setup crashed.
function goBackToProfile() {
	router.push('/tabs/profile')
}

type NotificationType = 'expiring' | 'recipe_suggestion' | 'recipe_idea' | 'pantry_match'

interface NotificationDto {
	id: number
	type: NotificationType | string
	message: string
	is_read: boolean
	created_at: string
}

const notifications = ref<NotificationDto[]>([])
const unreadCount = ref(0)
const isLoading = ref(true)
const loadError = ref('')
const isMarkingAll = ref(false)

// Only 'expiring' has a real backend trigger today (see detect-expiring.post.ts).
// The rest render correctly if the API ever returns them, but nothing
// currently generates them since Recipes isn't built yet.
function iconForType(type: string) {
	switch (type) {
		case 'expiring':
			return warningOutline
		case 'recipe_suggestion':
			return restaurantOutline
		case 'recipe_idea':
			return searchOutline
		case 'pantry_match':
			return handLeftOutline
		default:
			return warningOutline
	}
}

function titleForType(type: string): string {
	switch (type) {
		case 'expiring':
			return 'Expiring Soon'
		case 'recipe_suggestion':
			return 'New Recipe Suggestion'
		case 'recipe_idea':
			return 'Recipe Idea'
		case 'pantry_match':
			return 'Pantry Recipe Match'
		default:
			return 'Notification'
	}
}

function colorForType(type: string): string {
	switch (type) {
		case 'expiring':
			return '#ea580c'
		case 'recipe_suggestion':
		case 'recipe_idea':
		case 'pantry_match':
			return '#16a34a'
		default:
			return '#6b7280'
	}
}

function bgForType(type: string): string {
	switch (type) {
		case 'expiring':
			return '#fff7ed'
		case 'recipe_suggestion':
		case 'recipe_idea':
		case 'pantry_match':
			return '#f0fdf4'
		default:
			return '#f3f4f6'
	}
}

function daysBetween(from: Date, to: Date): number {
	const msPerDay = 1000 * 60 * 60 * 24
	const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate())
	const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate())
	return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / msPerDay)
}

function formatRelativeTime(iso: string): string {
	const then = new Date(iso)
	const now = new Date()
	const diffMins = Math.floor((now.getTime() - then.getTime()) / 60000)

	if (diffMins < 1) return 'Just now'
	if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`

	const diffHours = Math.floor(diffMins / 60)
	const dayDiff = daysBetween(then, now)

	if (dayDiff === 0) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
	if (dayDiff === 1) return 'Yesterday'
	return `${dayDiff} days ago`
}

async function fetchNotifications() {
	isLoading.value = true
	loadError.value = ''

	try {
		const data = await apiFetch<{ success: boolean; unread_count: number; notifications: NotificationDto[] }>('/api/notification', {
			method: 'GET',
		})
		notifications.value = data.notifications
		unreadCount.value = data.unread_count
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to load notifications.'
	} finally {
		isLoading.value = false
	}
}

async function handleNotifClick(notif: NotificationDto) {
	if (notif.is_read) return

	try {
		await apiFetch(`/api/notification/${notif.id}`, { method: 'PUT' })
		notif.is_read = true
		unreadCount.value = Math.max(0, unreadCount.value - 1)
	} catch {
		// Non-critical — the notification just stays marked unread if this fails.
	}
}

async function markAllRead() {
	isMarkingAll.value = true
	try {
		await apiFetch('/api/notification/mark-all-read', { method: 'PUT' })
		notifications.value = notifications.value.map((n) => ({ ...n, is_read: true }))
		unreadCount.value = 0
	} catch {
		// Non-critical — leave state as-is on failure, user can retry the tap.
	} finally {
		isMarkingAll.value = false
	}
}

onMounted(fetchNotifications)
</script>

<style scoped>
.notif-content {
	--background: #f7f8fa;
}
.unread-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 20px;
	height: 20px;
	padding: 0 6px;
	background: #16a34a;
	color: #fff;
	border-radius: 999px;
	font-size: 0.7rem;
	margin-left: 6px;
	vertical-align: middle;
}
.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 48px 16px;
	text-align: center;
}
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 64px 0;
	color: var(--ion-color-medium);
}
.empty-icon {
	font-size: 3rem;
	margin-bottom: 8px;
}
.notif-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.notif-card {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	background: #ffffff;
	border: none;
	border-left: 3px solid transparent;
	border-radius: 12px;
	padding: 12px;
	text-align: left;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.notif-card--unread {
	background: #fefefe;
}
.notif-icon {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.1rem;
	flex-shrink: 0;
}
.notif-body {
	flex: 1;
	min-width: 0;
}
.notif-title {
	font-weight: 600;
	font-size: 0.9rem;
	margin: 0 0 2px;
	color: #111827;
}
.notif-message {
	font-size: 0.83rem;
	color: #4b5563;
	margin: 0 0 4px;
}
.notif-time {
	font-size: 0.75rem;
	color: #9ca3af;
	margin: 0;
}
.read-check {
	color: #16a34a;
	flex-shrink: 0;
	margin-top: 2px;
}
</style>
