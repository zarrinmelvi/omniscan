<template>
	<div class="settings-page">
		<!-- Page Header -->
		<header class="page-header">
			<h1>Settings</h1>
			<p class="subtitle">Configure the OmniScan Admin Portal</p>
		</header>

		<div class="settings-container">
			<!-- Sidebar Navigation Tabs -->
			<nav class="settings-tabs">
				<button 
					class="tab-button" 
					:class="{ active: activeTab === 'general' }"
					@click="activeTab = 'general'"
				>
					<svg class="tab-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="2" y1="12" x2="22" y2="12"></line>
						<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
					</svg>
					<span class="tab-label">General</span>
					<svg class="chevron-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>

				<button 
					class="tab-button" 
					:class="{ active: activeTab === 'ai' }"
					@click="activeTab = 'ai'"
				>
					<svg class="tab-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
					</svg>
					<span class="tab-label">AI & Scanning</span>
					<svg class="chevron-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>

				<button 
					class="tab-button" 
					:class="{ active: activeTab === 'notifications' }"
					@click="activeTab = 'notifications'"
				>
					<svg class="tab-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
						<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
					</svg>
					<span class="tab-label">Notifications</span>
					<svg class="chevron-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>
			</nav>

			<!-- Settings Content Form -->
			<div class="settings-card">
				<p v-if="isLoading" class="state-message">Loading settings…</p>
				<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>

				<form v-else @submit.prevent="handleSave">
					<!-- General Tab -->
					<div v-if="activeTab === 'general'" class="settings-group">
						<div class="setting-row">
							<div class="setting-info">
								<label for="portalName" class="setting-title">Portal Name</label>
								<p class="setting-desc">Displayed in the browser tab and header</p>
							</div>
							<div class="setting-control">
								<input 
									id="portalName" 
									v-model="form.portalName" 
									type="text" 
									class="text-input" 
								/>
							</div>
						</div>

						<div class="setting-row">
							<div class="setting-info">
								<label class="setting-title">Dark Mode</label>
								<p class="setting-desc">Switch the admin portal to a dark colour scheme</p>
							</div>
							<div class="setting-control flex-end">
								<svg class="control-icon-moon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
								</svg>
								<label class="toggle-switch">
									<input v-model="form.darkMode" type="checkbox" />
									<span class="slider"></span>
								</label>
							</div>
						</div>
					</div>

					<!-- AI & Scanning Tab -->
					<div v-if="activeTab === 'ai'" class="settings-group">
						<div class="setting-row">
							<div class="setting-info">
								<label for="aiModel" class="setting-title">AI Model</label>
								<p class="setting-desc">Language model for ingredient analysis</p>
							</div>
							<div class="setting-control">
								<input 
									id="aiModel" 
									v-model="form.aiModel" 
									type="text" 
									class="text-input" 
								/>
							</div>
						</div>

						<div class="setting-row">
							<div class="setting-info">
								<label for="reviewThreshold" class="setting-title">Review Confidence Threshold (%)</label>
								<p class="setting-desc">Scans below this confidence are sent to the verification panel</p>
							</div>
							<div class="setting-control">
								<input 
									id="reviewThreshold" 
									v-model.number="form.reviewConfidenceThreshold" 
									type="number" 
									class="text-input number-input" 
								/>
							</div>
						</div>

						<div class="setting-row">
							<div class="setting-info">
								<label for="autoFlagThreshold" class="setting-title">Auto-Flag Threshold (%)</label>
								<p class="setting-desc">Scans above this confidence are automatically flagged as high priority</p>
							</div>
							<div class="setting-control">
								<input 
									id="autoFlagThreshold" 
									v-model.number="form.autoFlagThreshold" 
									type="number" 
									class="text-input number-input" 
								/>
							</div>
						</div>

						<div class="setting-row">
							<div class="setting-info">
								<label class="setting-title">Enable Vision Scan</label>
								<p class="setting-desc">Use Ollama Pro Vision to analyse product images</p>
							</div>
							<div class="setting-control flex-end">
								<label class="toggle-switch">
									<input v-model="form.enableVisionScan" type="checkbox" />
									<span class="slider"></span>
								</label>
							</div>
						</div>

						<div class="setting-row">
							<div class="setting-info">
								<label class="setting-title">Auto-Review Low-Risk Scans</label>
								<p class="setting-desc">Automatically approve scans with confidence above threshold</p>
							</div>
							<div class="setting-control flex-end">
								<label class="toggle-switch">
									<input v-model="form.autoReviewLowRisk" type="checkbox" />
									<span class="slider"></span>
								</label>
							</div>
						</div>
					</div>

					<!-- Notifications Tab -->
					<div v-if="activeTab === 'notifications'" class="settings-group">
						<div class="setting-row">
							<div class="setting-info">
								<label class="setting-title">Email on New Flag</label>
								<p class="setting-desc">Get notified when a RED flag is detected</p>
							</div>
							<div class="setting-control flex-end">
								<label class="toggle-switch">
									<input v-model="form.emailOnNewFlag" type="checkbox" />
									<span class="slider"></span>
								</label>
							</div>
						</div>

						<div class="setting-row">
							<div class="setting-info">
								<label class="setting-title">Email on System Error</label>
								<p class="setting-desc">Get notified on API errors or DB issues</p>
							</div>
							<div class="setting-control flex-end">
								<label class="toggle-switch">
									<input v-model="form.emailOnSystemError" type="checkbox" />
									<span class="slider"></span>
								</label>
							</div>
						</div>

						<div class="setting-row">
							<div class="setting-info">
								<label class="setting-title">Daily Summary Report</label>
								<p class="setting-desc">Receive a daily PDF summary of verification activity</p>
							</div>
							<div class="setting-control flex-end">
								<label class="toggle-switch">
									<input v-model="form.dailySummaryReport" type="checkbox" />
									<span class="slider"></span>
								</label>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>

		<!-- Bottom Save Action Button -->
		<div class="actions-footer">
			<button class="save-button" :disabled="isSaving" @click="handleSave">
				<svg class="save-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
					<polyline points="17 21 17 13 7 13 7 21"></polyline>
					<polyline points="7 3 7 8 15 8"></polyline>
				</svg>
				<span>{{ isSaving ? 'Saving...' : 'Save Changes' }}</span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

type TabType = 'general' | 'ai' | 'notifications'

const activeTab = ref<TabType>('general')
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref<string | null>(null)

// Form reactive state initialized with image default values
const form = reactive({
	// General
	portalName: 'OmniScan Admin Portal',
	darkMode: false,

	// AI & Scanning
	aiModel: 'Ollama Pro',
	reviewConfidenceThreshold: 75,
	autoFlagThreshold: 90,
	enableVisionScan: true,
	autoReviewLowRisk: false,

	// Notifications
	emailOnNewFlag: true,
	emailOnSystemError: true,
	dailySummaryReport: true,
})

async function fetchSettings(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null

	try {
		const data = await apiFetch<typeof form>('/api/admin/settings', {
			method: 'GET',
			isAdmin: true,
		})
		Object.assign(form, data)
	} catch (err) {
		// If endpoint is not created yet, fail silently and keep local default state
		console.warn('Could not load remote settings, using default state:', err)
	} finally {
		isLoading.value = false
	}
}

async function handleSave(): Promise<void> {
	isSaving.value = true
	errorMessage.value = null

	try {
		await apiFetch('/api/admin/settings', {
			method: 'PUT',
			body: form,
			isAdmin: true,
		})
		alert('Settings saved successfully!')
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to save settings.'
		console.error('Failed to save settings:', err)
	} finally {
		isSaving.value = false
	}
}

onMounted(() => {
	fetchSettings()
})
</script>

<style scoped>
.settings-page {
	padding: 24px 32px;
	background-color: #f8fafc;
	min-height: 100vh;
	font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	color: #1e293b;
}

/* Page Header */
.page-header {
	margin-bottom: 28px;
}

h1 {
	font-size: 1.5rem;
	font-weight: 700;
	margin: 0 0 4px;
	color: #0f172a;
}

.subtitle {
	color: #64748b;
	font-size: 0.9rem;
	margin: 0;
}

/* Main Layout Grid */
.settings-container {
	display: flex;
	gap: 32px;
	align-items: flex-start;
}

/* Navigation Tabs (Left Side) */
.settings-tabs {
	width: 220px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.tab-button {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	padding: 12px 16px;
	border: 1px solid transparent;
	border-radius: 12px;
	background: transparent;
	color: #475569;
	font-size: 0.92rem;
	font-weight: 600;
	cursor: pointer;
	text-align: left;
	transition: all 0.15s ease;
}

.tab-button:hover {
	background: #f1f5f9;
	color: #0f172a;
}

.tab-button.active {
	background: #008744;
	color: #ffffff;
}

.tab-icon {
	flex-shrink: 0;
}

.tab-label {
	flex: 1;
}

.chevron-icon {
	flex-shrink: 0;
	opacity: 0.8;
}

/* Settings Form Outer Card (Right Side) */
.settings-card {
	flex: 1;
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 14px;
	padding: 8px 28px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.setting-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 22px 0;
	border-bottom: 1px solid #f1f5f9;
}

.setting-row:last-child {
	border-bottom: none;
}

.setting-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding-right: 24px;
}

.setting-title {
	font-size: 0.95rem;
	font-weight: 600;
	color: #1e293b;
	cursor: pointer;
}

.setting-desc {
	font-size: 0.85rem;
	color: #64748b;
	margin: 0;
}

.setting-control {
	display: flex;
	align-items: center;
}

.setting-control.flex-end {
	gap: 12px;
	justify-content: flex-end;
}

/* Inputs */
.text-input {
	width: 240px;
	padding: 8px 14px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	font-size: 0.9rem;
	color: #1e293b;
	background: #ffffff;
	outline: none;
	transition: border-color 0.15s ease;
}

.text-input:focus {
	border-color: #008744;
}

.number-input {
	width: 90px;
	text-align: center;
}

/* Toggle Switch Styling */
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

.control-icon-moon {
	color: #64748b;
}

/* Save Button Footer */
.actions-footer {
	display: flex;
	justify-content: flex-end;
	margin-top: 24px;
}

.save-button {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	background: #008744;
	color: #ffffff;
	border: none;
	border-radius: 8px;
	padding: 10px 20px;
	font-size: 0.9rem;
	font-weight: 600;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.save-button:hover {
	background: #00753a;
}

.save-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.state-message, .error-message {
	padding: 24px 0;
	text-align: center;
	font-size: 0.9rem;
}

.error-message {
	color: #dc2626;
}
</style>