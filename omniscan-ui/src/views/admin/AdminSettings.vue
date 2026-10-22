<template>
	<div class="settings-page">
		<h1 class="gs-page-title">General Settings</h1>
		<p class="gs-subtitle">Your preferences for the Admin Portal. Changes save automatically.</p>

		<div class="gs-grid">
			<!-- LEFT COLUMN: Appearance + Notifications -->
			<div class="gs-grid-left">
				<!-- Appearance -->
				<section class="gs-card">
					<h2 class="gs-section-head">Appearance</h2>

					<div class="gs-row">
						<div class="gs-row-info">
							<div class="gs-row-label">Theme</div>
							<div class="gs-row-sub">Also available from the moon icon in the header.</div>
						</div>
						<div class="theme-seg">
							<button
								type="button"
								class="theme-seg__btn"
								:class="{ 'theme-seg__btn--active': !form.darkMode }"
								@click="form.darkMode = false"
							>
								Light
							</button>
							<button
								type="button"
								class="theme-seg__btn"
								:class="{ 'theme-seg__btn--active': form.darkMode }"
								@click="form.darkMode = true"
							>
								Dark
							</button>
						</div>
					</div>

					<div class="gs-row">
						<div class="gs-row-info">
							<div class="gs-row-label">Rows per page</div>
							<div class="gs-row-sub">How many items tables and lists show at once.</div>
						</div>
						<select v-model="form.rowsPerPage" class="gs-select">
							<option :value="10">10</option>
							<option :value="25">25</option>
							<option :value="50">50</option>
							<option :value="100">100</option>
						</select>
					</div>
				</section>

				<!-- Notifications -->
				<section class="gs-card">
					<h2 class="gs-section-head">Notifications</h2>

					<div class="gs-sent-row">
						<span class="gs-sent-email">{{ notifyEmail }}</span>
						<button type="button" class="gs-sent-change" @click="focusEmail">Change</button>
					</div>

					<div class="gs-toggle-row">
						<span class="gs-toggle-icon">
							<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
							</svg>
						</span>
						<div class="gs-toggle-info">
							<div class="gs-toggle-label">Email on system error</div>
							<div class="gs-toggle-sub">After 3 slow requests in a row, or when a change can't be saved.</div>
						</div>
						<label class="toggle-switch">
							<input v-model="form.emailOnSystemError" type="checkbox" />
							<span class="slider"></span>
						</label>
					</div>

					<div class="gs-toggle-row">
						<span class="gs-toggle-icon">
							<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect x="2" y="4" width="20" height="16" rx="2"></rect>
								<path d="m22 7-10 5L2 7"></path>
							</svg>
						</span>
						<div class="gs-toggle-info">
							<div class="gs-toggle-label">Daily summary report</div>
							<div class="gs-toggle-sub">Exceptions and resolved items, once a day.</div>
						</div>
						<label class="toggle-switch">
							<input v-model="form.dailySummaryReport" type="checkbox" />
							<span class="slider"></span>
						</label>
					</div>

					<div class="gs-toggle-row">
						<span class="gs-toggle-icon">
							<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
								<polyline points="9 12 11 14 15 10"></polyline>
							</svg>
						</span>
						<div class="gs-toggle-info">
							<div class="gs-toggle-label">Monthly logo-check reminder</div>
							<div class="gs-toggle-sub">A nudge to re-check the Halal Logo Library.</div>
						</div>
						<label class="toggle-switch">
							<input v-model="form.monthlyLogoReminder" type="checkbox" />
							<span class="slider"></span>
						</label>
					</div>
				</section>
			</div>

			<!-- RIGHT COLUMN: Account -->
			<section class="gs-card gs-account-card">
				<h2 class="gs-section-head">Account</h2>

				<div class="gs-avatar">{{ initials }}</div>
				<div class="gs-acct-name">{{ editName || adminAuthStore.admin?.full_name || 'Admin' }}</div>
				<div class="gs-acct-sub">Admin · Signed in today at {{ signInTime }}</div>

				<div class="gs-field">
					<label class="gs-label" for="gs-name-input">Display name</label>
					<input id="gs-name-input" v-model="editName" class="gs-input" type="text" autocomplete="name" />
				</div>

				<div class="gs-field">
					<label class="gs-label" for="gs-email-input">Email</label>
					<input id="gs-email-input" v-model="editEmail" class="gs-input" type="email" autocomplete="email" />
					<span class="gs-hint">Used for sign-in and notifications.</span>
				</div>

				<div class="gs-btn-row">
					<button type="button" class="gs-btn gs-btn--outline" @click="showToast('Change password is coming soon.')">
						Change password
					</button>
					<button type="button" class="gs-btn gs-btn--primary" @click="saveProfile">Save name</button>
				</div>

				<button type="button" class="gs-btn gs-btn--danger" @click="signOut">Sign out</button>
			</section>
		</div>

		<div v-if="gsToast.visible" class="gs-toast">{{ gsToast.message }}</div>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch, ApiError } from '@/utils/api'
import { useAdminAuthStore } from '@/stores/adminAuthStore'

const DARK_MODE_KEY = 'omniscan_dark_mode'

/** Apply (or remove) the global dark theme class and persist to localStorage. */
function applyDarkMode(enabled: boolean): void {
	document.documentElement.classList.toggle('ion-palette-dark', enabled)
	localStorage.setItem(DARK_MODE_KEY, enabled ? 'true' : 'false')
}

const adminAuthStore = useAdminAuthStore()
const router = useRouter()

// The snapshot of "now" used for the "Signed in today at …" line. Computed once
// at setup so the time stays stable for the lifetime of the page visit.
const signInTime = new Date().toLocaleTimeString('en-US', {
	hour: '2-digit',
	minute: '2-digit',
	hour12: true,
})

// Form state — only the preferences this page manages. darkMode is applied
// live via its own watcher below; every field auto-saves (debounced) to the
// shared /api/admin/settings endpoint.
const form = reactive({
	darkMode: false,
	rowsPerPage: 10,
	emailOnSystemError: true,
	dailySummaryReport: true,
	monthlyLogoReminder: true,
})

// Editable admin profile fields (separate from the auto-saving preferences).
const editName = ref(adminAuthStore.admin?.full_name ?? '')
const editEmail = ref(adminAuthStore.admin?.email ?? '')

const notifyEmail = computed(() => adminAuthStore.admin?.email ?? 'omniscan.official@gmail.com')

// Avatar initials: first letter of up to the first two words of the name.
const initials = computed(() => {
	const name = (editName.value || adminAuthStore.admin?.full_name || '').trim()
	if (!name) return 'A'
	const parts = name.split(/\s+/).filter(Boolean)
	const letters = parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
	return letters.slice(0, 2) || 'A'
})

// Lightweight bottom-pill toast (same pattern as other admin pages).
const gsToast = reactive({ visible: false, message: '' })
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(message: string): void {
	gsToast.message = message
	gsToast.visible = true
	if (toastTimer) clearTimeout(toastTimer)
	toastTimer = setTimeout(() => {
		gsToast.visible = false
	}, 2500)
}

async function fetchSettings(): Promise<void> {
	// localStorage is the source of truth for the live theme; a stale/absent
	// backend value must never downgrade it.
	const localDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true'

	try {
		const data = await apiFetch<Record<string, unknown>>('/api/admin/settings', {
			method: 'GET',
			isAdmin: true,
		})
		// Merge only the fields this page owns so we don't pull unrelated keys
		// (AI/thresholds) into the form object.
		if (typeof data.rowsPerPage === 'number') form.rowsPerPage = data.rowsPerPage
		if (typeof data.emailOnSystemError === 'boolean') form.emailOnSystemError = data.emailOnSystemError
		if (typeof data.dailySummaryReport === 'boolean') form.dailySummaryReport = data.dailySummaryReport
		if (typeof data.monthlyLogoReminder === 'boolean') form.monthlyLogoReminder = data.monthlyLogoReminder
		// localStorage wins over the backend for the live theme.
		form.darkMode = localDarkMode
		applyDarkMode(form.darkMode)
	} catch (err) {
		// Endpoint absent or unreachable — keep local default state.
		console.warn('Could not load remote settings, using default state:', err)
	}

	// Reflect the signed-in admin's profile in the editable fields after load.
	editName.value = adminAuthStore.admin?.full_name ?? ''
	editEmail.value = adminAuthStore.admin?.email ?? ''
}

// Debounced auto-save of all preferences. Suppressed until the initial load
// has settled so mounting the page never triggers a spurious write.
let saveTimer: ReturnType<typeof setTimeout> | undefined
let isLoaded = false

async function autosave(): Promise<void> {
	if (!isLoaded) return
	try {
		await apiFetch('/api/admin/settings', {
			method: 'PUT',
			body: { ...form },
			isAdmin: true,
		})
	} catch (err) {
		console.warn('Auto-save failed:', err)
	}
}

watch(
	form,
	() => {
		if (saveTimer) clearTimeout(saveTimer)
		saveTimer = setTimeout(autosave, 800)
	},
	{ deep: true, immediate: false },
)

// Live-apply the theme the instant the toggle flips so the change is visible
// immediately (persistence to the backend still happens via the auto-save).
watch(
	() => form.darkMode,
	(enabled) => applyDarkMode(enabled),
)

async function saveProfile(): Promise<void> {
	try {
		const res = await apiFetch<{ success: boolean; admin: { id: number; full_name: string; email: string | null } }>(
			'/api/admin/profile',
			{
				method: 'PUT',
				body: { full_name: editName.value.trim(), email: editEmail.value.trim() },
				isAdmin: true,
			},
		)
		// Keep the in-memory admin in sync so the sidebar/header reflect the change.
		if (adminAuthStore.admin) {
			adminAuthStore.admin.full_name = res.admin.full_name
			adminAuthStore.admin.email = res.admin.email
		}
		// Mirror into the sessionStorage admin record so a refresh keeps the new
		// values (the store rehydrates from there on reload).
		const stored = sessionStorage.getItem('omniscan_admin')
		if (stored) {
			try {
				const parsed = JSON.parse(stored) as { full_name?: string; email?: string | null }
				parsed.full_name = res.admin.full_name
				parsed.email = res.admin.email
				sessionStorage.setItem('omniscan_admin', JSON.stringify(parsed))
			} catch {
				/* ignore malformed session record */
			}
		}
		showToast('Profile updated.')
	} catch (err) {
		showToast(err instanceof ApiError ? err.message : 'Failed to update profile.')
	}
}

function focusEmail(): void {
	document.getElementById('gs-email-input')?.focus()
}

function signOut(): void {
	adminAuthStore.logout()
	router.push('/admin/login')
}

onMounted(() => {
	// Seed the toggle from the already-applied localStorage preference so the
	// switch reflects reality before the backend settings load.
	form.darkMode = localStorage.getItem(DARK_MODE_KEY) === 'true'
	fetchSettings().then(() => {
		isLoaded = true
		// Cancel any auto-save that may have been scheduled while seeding the
		// form from the backend, so loading the page never writes back to the DB.
		if (saveTimer) {
			clearTimeout(saveTimer)
			saveTimer = undefined
		}
		// One-time DB migration: point the admin account at the shared inbox.
		// Fire-and-forget — after the first success the DB email is updated and
		// this guard no longer fires.
		if (adminAuthStore.admin?.email !== 'omniscan.official@gmail.com') {
			apiFetch<{ success: boolean }>('/api/admin/profile', {
				method: 'PUT',
				body: { email: 'omniscan.official@gmail.com' },
				isAdmin: true,
			})
				.then(() => {
					if (adminAuthStore.admin) adminAuthStore.admin.email = 'omniscan.official@gmail.com'
					editEmail.value = 'omniscan.official@gmail.com'
				})
				.catch(() => {})
		}
	})
})
</script>

<style scoped>
.settings-page {
	padding: 24px 32px;
	background: #f8fafc;
	min-height: 100vh;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	color: #1e293b;
}

.gs-page-title {
	font-size: 1.75rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 4px;
	letter-spacing: -0.02em;
}

.gs-subtitle {
	font-size: 0.875rem;
	color: #6b7280;
	margin: 0 0 24px;
}

.gs-grid {
	display: grid;
	grid-template-columns: 1fr 360px;
	gap: 24px;
	align-items: start;
}

@media (max-width: 1024px) {
	.gs-grid {
		grid-template-columns: 1fr;
	}
}

.gs-card {
	background: #fff;
	border: 1px solid #e2e8f0;
	border-radius: 14px;
	padding: 20px 24px;
	margin-bottom: 20px;
}

.gs-account-card {
	margin-bottom: 0;
}

.gs-section-head {
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 16px;
}

/* Setting rows */
.gs-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 0;
	border-bottom: 1px solid #f1f5f9;
}

.gs-row:last-child {
	border-bottom: none;
}

.gs-row-info {
	flex: 1;
	padding-right: 20px;
}

.gs-row-label {
	font-size: 0.9rem;
	font-weight: 600;
	color: #111827;
}

.gs-row-sub {
	font-size: 0.78rem;
	color: #9ca3af;
	margin-top: 2px;
}

/* Theme segmented control */
.theme-seg {
	display: flex;
	background: #f1f5f9;
	border-radius: 9999px;
	padding: 3px;
}

.theme-seg__btn {
	border: none;
	background: transparent;
	color: #6b7280;
	padding: 6px 16px;
	border-radius: 9999px;
	font-size: 0.82rem;
	font-weight: 600;
	cursor: pointer;
}

.theme-seg__btn--active {
	background: #008744;
	color: #fff;
}

.gs-select {
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 7px 12px;
	font-size: 0.85rem;
	color: #374151;
	background: #fff;
	cursor: pointer;
}

/* Sent-to row */
.gs-sent-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	background: #f0fdf4;
	border: 1px solid #bbf7d0;
	border-radius: 8px;
	margin-bottom: 16px;
	font-size: 0.82rem;
}

.gs-sent-email {
	color: #16a34a;
	font-weight: 600;
	flex: 1;
}

.gs-sent-change {
	background: none;
	border: none;
	color: #16a34a;
	font-weight: 600;
	cursor: pointer;
	text-decoration: underline;
	font-size: 0.82rem;
}

/* Toggle rows */
.gs-toggle-row {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px 0;
	border-bottom: 1px solid #f1f5f9;
}

.gs-toggle-row:last-child {
	border-bottom: none;
}

.gs-toggle-icon {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.gs-toggle-info {
	flex: 1;
}

.gs-toggle-label {
	font-size: 0.9rem;
	font-weight: 600;
	color: #111827;
}

.gs-toggle-sub {
	font-size: 0.75rem;
	color: #9ca3af;
	margin-top: 2px;
}

/* Toggle switch */
.toggle-switch {
	position: relative;
	display: inline-block;
	width: 44px;
	height: 24px;
	flex-shrink: 0;
}

.toggle-switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

.slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #cbd5e1;
	transition: 0.2s ease;
	border-radius: 24px;
}

.slider:before {
	position: absolute;
	content: "";
	height: 18px;
	width: 18px;
	left: 3px;
	bottom: 3px;
	background-color: white;
	transition: 0.2s ease;
	border-radius: 50%;
}

input:checked + .slider {
	background-color: #008744;
}

input:checked + .slider:before {
	transform: translateX(20px);
}

/* Account card */
.gs-avatar {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: #16a34a;
	color: #fff;
	font-size: 1rem;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 12px;
}

.gs-acct-name {
	font-size: 1.05rem;
	font-weight: 700;
	color: #111827;
	margin-bottom: 2px;
}

.gs-acct-sub {
	font-size: 0.78rem;
	color: #9ca3af;
	margin-bottom: 20px;
}

/* Form fields */
.gs-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-bottom: 14px;
}

.gs-label {
	font-size: 0.75rem;
	font-weight: 600;
	color: #374151;
}

.gs-input {
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 10px 12px;
	font-size: 0.875rem;
	color: #111827;
	outline: none;
}

.gs-input:focus {
	border-color: #008744;
}

.gs-hint {
	font-size: 0.72rem;
	color: #9ca3af;
}

/* Buttons */
.gs-btn-row {
	display: flex;
	gap: 10px;
	margin-bottom: 16px;
}

.gs-btn {
	border-radius: 8px;
	padding: 9px 20px;
	font-size: 0.875rem;
	font-weight: 600;
	cursor: pointer;
}

.gs-btn--outline {
	border: 1px solid #e2e8f0;
	background: #fff;
	color: #374151;
}

.gs-btn--primary {
	background: #008744;
	color: #fff;
	border: none;
}

.gs-btn--primary:hover {
	background: #00753a;
}

.gs-btn--danger {
	background: #fff;
	border: 2px solid #dc2626;
	color: #dc2626;
	width: 100%;
	margin-top: 4px;
}

.gs-btn--danger:hover {
	background: #fef2f2;
}

/* Toast */
.gs-toast {
	position: fixed;
	bottom: 28px;
	left: 50%;
	transform: translateX(-50%);
	background: #111827;
	color: #fff;
	padding: 12px 24px;
	border-radius: 9999px;
	font-size: 0.875rem;
	font-weight: 500;
	z-index: 10000;
}
</style>
