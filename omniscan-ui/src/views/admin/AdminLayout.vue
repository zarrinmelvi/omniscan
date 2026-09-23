<template>
	<div class="admin-layout">
		<aside class="sidebar">
			<div class="brand">
				<h1 class="brand-title">
					<span class="brand-name">OmniScan</span>
					<span class="brand-sub">Admin Portal</span>
				</h1>
			</div>

			<nav class="nav">
				<router-link to="/admin/dashboard" class="nav-item" active-class="active">
					<svg class="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="3" width="7" height="7" rx="1"></rect>
						<rect x="14" y="3" width="7" height="7" rx="1"></rect>
						<rect x="14" y="14" width="7" height="7" rx="1"></rect>
						<rect x="3" y="14" width="7" height="7" rx="1"></rect>
					</svg>
					Dashboard
				</router-link>

				<router-link to="/admin/verification" class="nav-item" active-class="active">
					<svg class="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 11l3 3L22 4"></path>
						<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
					</svg>
					Verification Panel
				</router-link>

				<router-link to="/admin/productsdata" class="nav-item" active-class="active">
					<svg class="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
					</svg>
					Manage Product Data
				</router-link>

				<router-link to="/admin/usersprofile" class="nav-item" active-class="active">
					<svg class="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
						<circle cx="12" cy="7" r="4"></circle>
					</svg>
					Manage User Profiles
				</router-link>

				<router-link to="/admin/systemlogs" class="nav-item" active-class="active">
					<svg class="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
						<polyline points="14 2 14 8 20 8"></polyline>
						<line x1="16" y1="13" x2="8" y2="13"></line>
						<line x1="16" y1="17" x2="8" y2="17"></line>
					</svg>
					System Logs
				</router-link>

				<router-link to="/admin/settings" class="nav-item" active-class="active">
					<svg class="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="3"></circle>
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
					</svg>
					Settings
				</router-link>
			</nav>

			<div class="sidebar-footer">
				<div class="admin-info">
					<div class="admin-avatar">{{ initials }}</div>
					<div class="admin-text">
						<div class="admin-name">{{ adminAuthStore.admin?.full_name ?? 'Zarrin Melvi Delos Santos' }}</div>
						<div class="status-row">
							<svg class="shield-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
							</svg>
							<span class="status-text">Admin · Session Active</span>
						</div>
					</div>
				</div>

				<button class="logout-button" @click="handleLogout">
					Log Out
				</button>
			</div>
		</aside>

		<main class="admin-main">
			<!-- Persistent Top Breadcrumb & Session Header -->
			<header class="top-bar">
				<div class="breadcrumb">
					<span>OmniScan</span> <span class="breadcrumb-slash">/</span> <span>{{ currentPageTitle }}</span>
				</div>
				<div class="user-session">
					<span class="session-time">{{ formattedSessionTime }}</span>
				</div>
			</header>

			<div class="page-body">
				<router-view />
			</div>
		</main>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuthStore'

const adminAuthStore = useAdminAuthStore()
const router = useRouter()
const route = useRoute()

// Dynamically sets breadcrumb page title matching actual router paths
const currentPageTitle = computed(() => {
	const path = route.path.toLowerCase()
	
	if (path.includes('verification')) return 'Verification Panel'
	if (path.includes('productsdata') || path.includes('products-data') || path.includes('product')) return 'Manage Product Data'
	if (path.includes('usersprofile') || path.includes('users-profile') || path.includes('user')) return 'Manage User Profiles'
	if (path.includes('systemlogs') || path.includes('system-logs') || path.includes('log')) return 'System Logs'
	if (path.includes('settings')) return 'Settings'
	
	return 'Dashboard'
})

// Real-time tracking of admin's local session time and location timezone
const now = ref(new Date())
let timeInterval: ReturnType<typeof setInterval> | null = null

const formattedSessionTime = computed(() => {
	const dateStr = now.value.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	const timeStr = now.value.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

	const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone

	return `${dateStr} - Session: ${timeStr} (${timeZoneName})`
})

const initials = computed(() => {
	const name = adminAuthStore.admin?.full_name ?? 'Zarrin Melvi Delos Santos'
	return (
		name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase() || 'ZM'
	)
})

function handleLogout(): void {
	adminAuthStore.logout()
	router.push({ path: '/admin/login' })
}

onMounted(() => {
	timeInterval = setInterval(() => {
		now.value = new Date()
	}, 1000)
})

onUnmounted(() => {
	if (timeInterval) clearInterval(timeInterval)
})
</script>

<style scoped>
.admin-layout {
	display: flex;
	min-height: 100vh;
	background: #f8fafc;
	font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Sidebar pinned to screen height so footer cannot push off-screen */
.sidebar {
	width: 250px;
	height: 100vh;
	position: sticky;
	top: 0;
	flex-shrink: 0;
	background: #ffffff;
	border-right: 1px solid #e2e8f0;
	display: flex;
	flex-direction: column;
	padding: 24px 16px;
	box-sizing: border-box;
}

.brand {
	padding: 0 8px 24px;
	flex-shrink: 0;
}

.brand-title {
	display: flex;
	flex-direction: column;
	margin: 0;
	line-height: 1.15;
}

.brand-name {
	font-size: 1.3rem;
	font-weight: 800;
	color: #0f172a;
	letter-spacing: -0.02em;
}

.brand-sub {
	font-size: 0.92rem;
	font-weight: 400;
	color: #64748b;
	margin-top: 2px;
}

.nav {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6px;
	overflow-y: auto;
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	border-radius: 12px;
	color: #334155;
	text-decoration: none;
	font-size: 0.92rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s ease;
}

.nav-item:hover {
	background: #f8fafc;
	color: #0f172a;
}

.nav-item.active {
	background: #008744;
	color: #ffffff;
}

.nav-icon {
	flex-shrink: 0;
}

/* Pinned Footer prevents Sign Out from vanishing */
.sidebar-footer {
	flex-shrink: 0;
	padding-top: 16px;
	border-top: 1px solid #f1f5f9;
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-top: auto;
}

.admin-info {
	display: flex;
	align-items: center;
	gap: 10px;
}

.admin-avatar {
	width: 38px;
	height: 38px;
	border-radius: 50%;
	background: #008744;
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.85rem;
	font-weight: 600;
	flex-shrink: 0;
}

.admin-text {
	min-width: 0;
}

.admin-name {
	font-size: 0.88rem;
	font-weight: 600;
	color: #0f172a;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.status-row {
	display: flex;
	align-items: center;
	gap: 4px;
	color: #008744;
	margin-top: 2px;
}

.shield-icon {
	color: #008744;
	flex-shrink: 0;
}

.status-text {
	font-size: 0.73rem;
	font-weight: 600;
}

/* Red "Log Out" Hoverable Button Style */
.logout-button {
	width: 100%;
	padding: 10px;
	border: none;
	border-radius: 10px;
	background: transparent;
	color: #dc2626;
	font-size: 0.9rem;
	font-weight: 700;
	cursor: pointer;
	text-align: center;
	transition: background-color 0.15s ease, color 0.15s ease;
}

.logout-button:hover {
	background: #fff1f2;
	color: #e11d48;
}

.admin-main {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	height: 100vh;
}

/* Header Top Bar */
.top-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px 36px;
	background: #ffffff;
	border-bottom: 1px solid #e2e8f0;
	font-size: 0.85rem;
	color: #475569;
	flex-shrink: 0;
}

.breadcrumb {
	font-weight: 400;
	color: #334155;
}

.breadcrumb-slash {
	margin: 0 4px;
	color: #94a3b8;
}

.user-session {
	display: flex;
	align-items: center;
}

.session-time {
	font-size: 0.82rem;
	color: #64748b;
}

.page-body {
	padding: 24px 36px;
	flex: 1;
}
</style>