<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar class="notif-toolbar">
				<ion-buttons slot="start">
					<ion-button @click="goBackToProfile">
						<ion-icon :icon="chevronBackOutline" slot="icon-only" class="back-icon" />
					</ion-button>
				</ion-buttons>
				<ion-title class="notif-header-title">
					Notifications
					<span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
				</ion-title>
				<ion-buttons slot="end">
					<ion-button
						fill="clear"
						class="mark-read-btn"
						:class="{ 'mark-read-btn--active': unreadCount > 0 }"
						:disabled="unreadCount === 0 || isMarkingAll"
						@click="markAllRead">
						Mark all read
					</ion-button>
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
					@click="handleNotifClick(notif)">
					<!-- Indicator bar for unread notifications -->
					<div v-if="!notif.is_read" class="unread-bar" />

					<div class="notif-icon" :style="{ background: bgForType(notif.type, notif.message), color: colorForType(notif.type, notif.message) }">
						<ion-icon :icon="iconForType(notif.type, notif.message)" />
					</div>
					<div class="notif-body">
						<p class="notif-title">{{ titleForType(notif.type, notif.message) }}</p>
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
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

const router = useRouter()

function goBackToProfile() {
	// Notifications now lives inside /tabs/ (a sibling of Profile in the same
	// nested outlet), so this push is just normal same-outlet navigation – see
	// SettingsPage.vue for why the previous top-level-route setup crashed.
	router.push('/tabs/profile')
}

// Only 'expiring' has a real backend trigger today (see detect-expiring.post.ts).
// The rest render correctly if the API ever returns them, but nothing
// currently generates them since Recipes isn't built yet.
type NotificationType = 'expiring' | 'recipe_suggestion' | 'pantry_match'

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

function titleForType(type: string, message: string = ''): string {
	const lowerType = type?.toLowerCase() || ''
	const lowerMsg = message.toLowerCase()

	if (lowerType === 'expiring' || lowerMsg.includes('expire') || lowerMsg.includes('expiring')) {
		return 'Expiring Soon ⚠️'
	}
	if (lowerType === 'recipe_suggestion' || lowerMsg.includes('suggestion')) {
		return 'New Recipe Suggestion 🍱'
	}
	if (lowerType === 'pantry_match' || lowerMsg.includes('pantry') || lowerMsg.includes('match')) {
		return 'Pantry Recipe Match 🍗'
	}
	return 'Notification'
}

function iconForType(type: string, message: string = '') {
	const title = titleForType(type, message)
	if (title.includes('Expiring')) {
		return warningOutline
	}
	return restaurantOutline
}

function colorForType(type: string, message: string = ''): string {
	const title = titleForType(type, message)
	if (title.includes('Expiring')) {
		return '#ea580c'
	}
	return '#16a34a'
}

function bgForType(type: string, message: string = ''): string {
	const title = titleForType(type, message)
	if (title.includes('Expiring')) {
		return '#ffedd5'
	}
	return '#dcfce7'
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
		// Non-critical — stays unread on failure
	}
}

async function markAllRead() {
	isMarkingAll.value = true
	try {
		await apiFetch('/api/notification/mark-all-read', { method: 'PUT' })
		notifications.value = notifications.value.map((n) => ({ ...n, is_read: true }))
		unreadCount.value = 0
	} catch {
		// Non-critical — leave state as-is on failure
	} finally {
		isMarkingAll.value = false
	}
}

onMounted(fetchNotifications)
</script>

<style scoped>
.notif-toolbar {
	--background: #ffffff;
	--border-width: 0;
	padding-top: 6px;
	padding-bottom: 2px;
}
.notif-header-title {
	font-weight: 700;
	font-size: 1.2rem;
	color: #111827;
}
.back-icon {
	color: #111827;
	font-size: 1.25rem;
}

/* Light green for disabled / all marked read */
.mark-read-btn {
	--color: #86efac;
	font-weight: 600;
	font-size: 0.88rem;
	text-transform: none;
	opacity: 1 !important;
	transition: color 0.2s ease;
}

/* Darker vibrant green when there are unread notifications */
.mark-read-btn--active {
	--color: #16a34a;
}

.unread-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	background: #10b981;
	color: #fff;
	border-radius: 50%;
	font-size: 0.72rem;
	font-weight: 600;
	margin-left: 6px;
	vertical-align: middle;
}
.notif-content {
	--background: #f8fafc;
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
	gap: 16px;
	padding: 8px 4px 16px;
}
.notif-card {
	position: relative;
	display: flex;
	align-items: flex-start;
	gap: 14px;
	background: #ffffff;
	border: 1px solid #f1f5f9;
	border-radius: 20px;
	padding: 18px 18px 18px 22px;
	text-align: left;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.025);
	overflow: hidden;
}
.unread-bar {
	position: absolute;
	left: 8px;
	top: 16px;
	bottom: 16px;
	width: 4px;
	background-color: #10b981;
	border-radius: 4px;
}
.notif-icon {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.2rem;
	flex-shrink: 0;
}
.notif-body {
	flex: 1;
	min-width: 0;
}
.notif-title {
	font-weight: 700;
	font-size: 0.95rem;
	margin: 0 0 3px;
	color: #1e293b;
	line-height: 1.25;
}
.notif-message {
	font-size: 0.84rem;
	font-weight: 400;
	color: #64748b;
	line-height: 1.35;
	margin: 0 0 5px;
}
.notif-time {
	font-size: 0.78rem;
	font-weight: 400;
	color: #94a3b8;
	margin: 0;
}
.read-check {
	color: #cbd5e1;
	font-size: 1.1rem;
	flex-shrink: 0;
	margin-top: 2px;
}
</style>