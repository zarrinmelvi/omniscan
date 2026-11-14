<template>
	<ion-page>
		<ion-header v-if="!isDesktop" class="app-header-shell">
			<AppHeader />
		</ion-header>

		<ion-header v-if="!isDesktop" class="ion-no-border">
			<ion-toolbar class="settings-toolbar">
				<ion-buttons slot="start">
					<ion-button @click="goBackToProfile">
						<ion-icon :icon="chevronBackOutline" slot="icon-only" class="header-back-icon" />
					</ion-button>
				</ion-buttons>
				<ion-title class="header-title">Settings</ion-title>
			</ion-toolbar>
		</ion-header>

		<ion-content class="settings-content">
			<div class="content-container">
				<!-- Permissions -->
				<p class="section-label">PERMISSIONS</p>
				<div class="settings-card">
					<div class="settings-row">
						<div class="icon-wrapper icon-green">
							<ion-icon :icon="cameraOutline" class="row-icon" />
						</div>
						<div class="row-text">
							<p class="row-title">Camera</p>
							<p class="row-subtitle">
								{{ isDesktop ? 'Camera scanning is available on the mobile app' : "Allow OmniScan to scan product's ingredients & logo" }}
							</p>
						</div>
						<ion-toggle :checked="!isDesktop && cameraPermission" :disabled="isDesktop" @ion-change="onCameraToggleChange" class="custom-toggle" />
					</div>
					<div class="settings-row">
						<div class="icon-wrapper icon-orange">
							<ion-icon :icon="notificationsOutline" class="row-icon" />
						</div>
						<div class="row-text">
							<p class="row-title">Notifications</p>
							<p class="row-subtitle">Get expiry and recipe alerts</p>
						</div>
						<ion-toggle :checked="notificationsEnabled" @ion-change="onNotifToggleChange" class="custom-toggle" />
					</div>
				</div>

				<!-- Help & Support -->
				<p class="section-label section-label--top">HELP &amp; SUPPORT</p>
				<div class="settings-card">
					<button type="button" class="settings-row settings-row--button" @click="isTermsOpen = true">
						<div class="icon-wrapper icon-slate">
							<ion-icon :icon="shieldCheckmarkOutline" class="row-icon" />
						</div>
						<div class="row-text">
							<p class="row-title">Terms &amp; Conditions</p>
							<p class="row-subtitle">Privacy policy &amp; usage terms</p>
						</div>
						<ion-icon :icon="chevronForwardOutline" class="chevron" />
					</button>
					<button type="button" class="settings-row settings-row--button" @click="isFaqOpen = true">
						<div class="icon-wrapper icon-slate">
							<ion-icon :icon="helpCircleOutline" class="row-icon" />
						</div>
						<div class="row-text">
							<p class="row-title">FAQ</p>
							<p class="row-subtitle">Frequently asked questions</p>
						</div>
						<ion-icon :icon="chevronForwardOutline" class="chevron" />
					</button>
					<button type="button" class="settings-row settings-row--button" @click="isAboutOpen = true">
						<div class="icon-wrapper icon-green-light">
							<ion-icon :icon="informationCircleOutline" class="row-icon" />
						</div>
						<div class="row-text">
							<p class="row-title">About Us</p>
							<p class="row-subtitle">Our mission &amp; the OmniScan team</p>
						</div>
						<ion-icon :icon="chevronForwardOutline" class="chevron" />
					</button>
					<button type="button" class="settings-row settings-row--button" @click="contactSupport">
						<div class="icon-wrapper icon-purple-light">
							<ion-icon :icon="mailOutline" class="row-icon" />
						</div>
						<div class="row-text">
							<p class="row-title">Contact Support</p>
							<p class="row-subtitle">omniscan.official@gmail.com</p>
						</div>
						<ion-icon :icon="chevronForwardOutline" class="chevron" />
					</button>
				</div>

				<div class="version-container">
					<p class="version-text">OmniScan v2.2.2</p>
					<p class="version-text">© 2026 OmniScan. All rights reserved.</p>
				</div>
			</div>
		</ion-content>

		<!-- Terms & Conditions Modal -->
		<ion-modal :is-open="isTermsOpen" @didDismiss="isTermsOpen = false" class="custom-styled-modal">
			<ion-header class="ion-no-border modal-header-custom">
				<div class="modal-header-flex">
					<div>
						<h2 class="modal-title-custom">Terms &amp; Conditions</h2>
						<p class="terms-updated">Last updated: November 12, 2026</p>
					</div>
					<ion-button fill="clear" class="modal-close-icon-btn" @click="isTermsOpen = false">
						<ion-icon :icon="closeOutline" slot="icon-only" />
					</ion-button>
				</div>
			</ion-header>

			<ion-content class="modal-content-custom">
				<div class="terms-container">
					<p v-for="(para, pi) in termsIntro" :key="'ti-' + pi">{{ para }}</p>

					<div v-for="section in termsSections" :key="section.title">
						<h3>{{ section.title }}</h3>
						<div v-for="(block, bi) in section.blocks" :key="bi">
							<p v-if="block.type === 'p'">{{ block.text }}</p>
							<p v-else-if="block.type === 'strong'"><strong>{{ block.text }}</strong></p>
							<ul v-else>
								<li v-for="(item, ii) in block.items" :key="ii">{{ item }}</li>
							</ul>
						</div>
					</div>

					<div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
						<p style="font-weight: 600; margin-bottom: 4px; font-size: 0.9rem;">{{ termsFooterLines[0] }}</p>
						<p v-for="(line, fi) in termsFooterLines.slice(1)" :key="fi" style="font-size: 0.8rem; color: #6b7280; margin-bottom: 2px;">{{ line }}</p>
					</div>
				</div>
			</ion-content>
		</ion-modal>

		<!-- FAQ Modal -->
		<ion-modal :is-open="isFaqOpen" @didDismiss="isFaqOpen = false" class="custom-styled-modal">
			<ion-header class="ion-no-border modal-header-custom">
				<div class="modal-header-flex">
					<div>
						<h2 class="modal-title-custom">FAQ</h2>
						<p class="modal-subtitle-custom">Frequently Asked Questions</p>
					</div>
					<ion-button fill="clear" class="modal-close-icon-btn" @click="isFaqOpen = false">
						<ion-icon :icon="closeOutline" slot="icon-only" />
					</ion-button>
				</div>
			</ion-header>

			<ion-content class="modal-content-custom">
				<div class="faq-list-container">
					<ion-accordion-group class="faq-accordion-group">
						<ion-accordion v-for="(faq, index) in faqs" :key="index" :value="`faq-${index}`" class="faq-accordion-item">
							<ion-item slot="header" lines="none" class="faq-accordion-header">
								<div class="faq-badge">{{ index + 1 }}</div>
								<ion-label class="faq-question-label">{{ faq.q }}</ion-label>
							</ion-item>
							<div slot="content" class="faq-accordion-body">
								<p class="faq-answer-text">{{ faq.a }}</p>
								<ul v-if="faq.list && faq.list.length" class="faq-answer-list">
									<li v-for="(item, i) in faq.list" :key="i">{{ item }}</li>
								</ul>
								<p v-if="faq.outro" class="faq-answer-text faq-answer-outro">{{ faq.outro }}</p>
							</div>
						</ion-accordion>
					</ion-accordion-group>
				</div>
			</ion-content>
		</ion-modal>

		<!-- About Us Modal -->
		<ion-modal :is-open="isAboutOpen" @didDismiss="isAboutOpen = false" class="custom-styled-modal">
			<ion-header class="ion-no-border modal-header-custom">
				<div class="modal-header-flex">
					<h2 class="modal-title-custom">About Us</h2>
					<ion-button fill="clear" class="modal-close-icon-btn" @click="isAboutOpen = false">
						<ion-icon :icon="closeOutline" slot="icon-only" />
					</ion-button>
				</div>
			</ion-header>
			<ion-content class="modal-content-custom">
				<div class="about-container">
					<h3 class="about-app-title">OmniScan</h3>
					<p class="about-description">
						We are a group of proponents dedicated to developing innovative technological solutions that address everyday challenges in food safety and dietary management. Our project, OmniScan, was created in response to the growing need for a smarter and more reliable way to identify allergens, verify Halal certification, and assist users in making informed food choices. Recognizing the difficulties consumers face when interpreting food labels and managing dietary restrictions, we aim to bridge this gap through the integration of Artificial Intelligence, computer vision, and intelligent data analysis.
					</p>
					<p class="about-description">
						Our team is committed to promoting safer consumption practices by providing a system that not only detects potential health risks but also offers personalized recommendations based on each user’s dietary profile. By combining advanced technology with user-centered design, we strive to support individuals and households maintaining food safety, respecting religious dietary requirements, and reducing food waste. Through OmniScan, we envision a future where making safe and informed food decisions become more accessible, efficient, and convenient for everyone.
					</p>

					<p class="about-section-heading">Our Team</p>
					<ul class="about-team-list">
						<li>Zarrin Melvi V. Delos Santos</li>
						<li>Shanna Hazel A. Rogero</li>
						<li>Angel Fea P. Roma Cruz</li>
						<li>Ruben M. Sentales</li>
					</ul>

					<p class="about-footer-tag">A capstone project — STI College San Jose Del Monte, 2026.</p>
				</div>
			</ion-content>
		</ion-modal>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCameraPermission } from '@/composables/useCameraPermission'
import { useNotificationPrefs } from '@/composables/useNotificationPrefs'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import {
	IonPage,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonButton,
	IonContent,
	IonIcon,
	IonToggle,
	IonModal,
	IonAccordionGroup,
	IonAccordion,
	IonItem,
	IonLabel,
} from '@ionic/vue'
import { useBreakpoint } from '@/utils/useBreakpoint'
import AppHeader from '@/components/AppHeader.vue'
import { useDarkMode } from '@/composables/useDarkMode'
import { faqs } from '@/data/faqContent'
import { termsIntro, termsSections, termsFooterLines } from '@/data/termsContent'
import {
	chevronBackOutline,
	chevronForwardOutline,
	cameraOutline,
	notificationsOutline,
	moonOutline,
	shieldCheckmarkOutline,
	helpCircleOutline,
	informationCircleOutline,
	mailOutline,
	closeOutline,
} from 'ionicons/icons'

const router = useRouter()
const { isDesktop } = useBreakpoint()
const { isDark: isDarkSingleton, set: setDarkMode } = useDarkMode()

// Use router.back() so the Settings page slides out to the right (reverse
// of the forward-push animation used to enter it). router.push() would
// incorrectly animate as a new forward navigation.
// Guard: if no history exists (direct deep-link), replace instead.
function goBackToProfile() {
	if (window.history.length <= 1) {
		router.replace('/tabs/profile')
	} else {
		router.back()
	}
}

const { hasPermission: cameraPermission, requestPermission, setPermission } = useCameraPermission()
const { notificationsEnabled, loadPrefs, savePrefs } = useNotificationPrefs()

const darkMode = ref(isDarkSingleton.value)

const isTermsOpen = ref(false)
const isFaqOpen = ref(false)
const isAboutOpen = ref(false)

async function onNotifToggleChange(event: CustomEvent) {
	await savePrefs(event.detail.checked)
	// Sync local reminders: schedule if ON, cancel if OFF.
	if (event.detail.checked) {
		const { syncExpiryReminders } = await import('@/utils/reminderScheduler')
		await syncExpiryReminders()
	} else {
		const { cancelAllReminders } = await import('@/utils/reminderScheduler')
		await cancelAllReminders()
	}
}

async function onCameraToggleChange(event: CustomEvent) {
	// Desktop shows the toggle as off/disabled; never overwrite the saved preference from there.
	if (isDesktop.value) return
	const isEnabled = event.detail.checked
	if (isEnabled) {
		// Request actual camera permission immediately when turning ON.
		// If denied (NotAllowedError), requestPermission sets the ref to
		// false, which reverts the toggle to OFF automatically.
		await requestPermission()
	} else {
		setPermission(false)
	}
}

async function updateNativeStatusBar(isDark: boolean) {
	if (Capacitor.isNativePlatform()) {
		// Style.Dark = Light icons for dark mode
		// Style.Light = Dark icons for light mode
		await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
	}
}

async function onDarkModeToggle() {
	setDarkMode(darkMode.value)
	await updateNativeStatusBar(darkMode.value)
}

function contactSupport() {
	window.location.href = 'mailto:omniscan.official@gmail.com'
}

onMounted(async () => {
	// Load notification preference from the server (single source of truth).
	// This also performs the one-time legacy sync from localStorage if the
	// old key still exists.
	await loadPrefs()
	darkMode.value = isDarkSingleton.value

	await updateNativeStatusBar(darkMode.value)
})
</script>

<style scoped>
.settings-toolbar {
	--background: #f8f9fa;
	--border-width: 0;
	padding-top: 8px;
}

.header-title {
	font-weight: 700;
	font-size: 1.15rem;
	color: #111827;
	text-align: left;
}

.header-back-icon {
	color: #111827;
	font-size: 1.2rem;
}

.settings-content {
	--background: #f8f9fa;
}

.content-container {
	/* Mobile: 12px padding as per task requirements */
	padding: 12px;
	padding-bottom: 80px; /* Extra bottom padding to prevent content being hidden behind fixed actions */
	max-width: 100%;
	margin: 0 auto;
}

/* Desktop: centered max-width 600px with 16px padding */
@media (min-width: 768px) {
	.content-container {
		max-width: 600px;
		padding: 16px;
		padding-bottom: 32px; /* No fixed bottom buttons on desktop */
	}
}

.section-label {
	font-weight: 600;
	font-size: 0.72rem;
	color: #8e8e93;
	letter-spacing: 0.5px;
	/* Mobile: 12px gap between sections */
	margin: 12px 0 10px 4px;
}

.section-label--top {
	/* Mobile: 12px gap between sections */
	margin-top: 12px;
}

/* Desktop: 16px gap between sections */
@media (min-width: 768px) {
	.section-label {
		margin: 16px 0 12px 4px;
	}
	
	.section-label--top {
		margin-top: 16px;
	}
}

.settings-card {
	background: #ffffff;
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
	/* Single-column layout - all rows stack vertically */
	display: flex;
	flex-direction: column;
	/* Mobile: 12px gap between cards */
	margin-bottom: 12px;
}

.settings-card:last-of-type {
	margin-bottom: 0;
}

/* Desktop: 16px gap between cards */
@media (min-width: 768px) {
	.settings-card {
		margin-bottom: 16px;
	}
}

.settings-row {
	display: flex;
	align-items: center;
	gap: 14px;
	/* Ensure minimum 44px height for touch targets */
	min-height: 44px;
	padding: 14px 16px;
	border-bottom: 1px solid #f3f4f6;
	width: 100%;
	background: none;
	border-left: none;
	border-right: none;
	border-top: none;
	text-align: left;
}

.settings-row:last-child {
	border-bottom: none;
}

.settings-row--button {
	color: inherit;
	cursor: pointer;
}

/* Icon Badges */
.icon-wrapper {
	/* Ensure minimum 44px touch target */
	min-width: 44px;
	min-height: 44px;
	width: 44px;
	height: 44px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.icon-green {
	background-color: #f0fdf4;
	color: #16a34a;
}

.icon-orange {
	background-color: #fff7ed;
	color: #f97316;
}

.icon-purple {
	background-color: #f5f3ff;
	color: #a855f7;
}

.icon-slate {
	background-color: #f1f5f9;
	color: #64748b;
}

.icon-green-light {
	background-color: #f0fdf4;
	color: #22c55e;
}

.icon-purple-light {
	background-color: #faf5ff;
	color: #e879f9;
}

.row-icon {
	font-size: 1.15rem;
}

.row-text {
	flex: 1;
	min-width: 0;
}

.row-title {
	font-size: 0.88rem;
	font-weight: 600;
	color: #1f2937;
	margin: 0;
}

.row-subtitle {
	font-size: 0.76rem;
	color: #8e8e93;
	margin: 2px 0 0;
}

.custom-toggle {
	--track-background-checked: #22c55e;
	--handle-background-checked: #ffffff;
}

.chevron {
	color: #c7c7cc;
	font-size: 0.85rem;
	flex-shrink: 0;
}

.version-container {
	/* Mobile: 12px gap */
	margin-top: 24px;
	text-align: center;
}

/* Desktop: 16px gap */
@media (min-width: 768px) {
	.version-container {
		margin-top: 32px;
	}
}

.version-text {
	font-size: 0.75rem;
	color: #9ca3af;
	margin: 2px 0;
}

/* Custom Styled Full Modals (Terms, FAQ & About Us) */
.modal-header-custom {
	background: #ffffff;
	padding: 18px 20px 8px;
	border-bottom: 1px solid #f3f4f6;
}

.modal-header-flex {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.modal-title-custom {
	font-size: 1.25rem;
	font-weight: 700;
	color: #111827;
	margin: 0;
}

.modal-subtitle-custom {
	font-size: 0.8rem;
	color: #9ca3af;
	margin: 2px 0 0;
}

.modal-close-icon-btn {
	--color: #374151;
	--padding-start: 0;
	--padding-end: 0;
	margin: 0;
}

.modal-content-custom {
	--background: #ffffff;
}

/* Terms & Conditions Inner Styling */
.terms-container {
	padding: 16px 20px 32px;
	font-size: 0.85rem;
	line-height: 1.55;
	color: #4b5563;
}

.terms-updated {
	font-size: 0.78rem;
	color: #9ca3af;
	margin: 2px 0 0;
}

.terms-container h3 {
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
	margin: 16px 0 6px;
}

.terms-container p {
	margin: 0 0 10px;
	text-align: left;
}

.terms-container ul {
	margin: 0 0 12px;
	padding-left: 20px;
}

.terms-container li {
	margin-bottom: 4px;
}

/* FAQ UI Refinements */
.faq-list-container {
	padding: 16px 16px 28px;
}

.faq-accordion-group {
	background: transparent;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.faq-accordion-item {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 14px;
	overflow: hidden;
}

.faq-accordion-header {
	--background: #ffffff;
	--padding-start: 12px;
	--inner-padding-end: 12px;
	--min-height: 54px;
}

.faq-badge {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background-color: #dcfce7;
	color: #16a34a;
	font-size: 0.76rem;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 12px;
	flex-shrink: 0;
}

.faq-question-label {
	font-size: 0.85rem;
	font-weight: 600;
	color: #1f2937;
	white-space: normal;
}

.faq-accordion-body {
	padding: 0 16px 14px 48px;
	background: #ffffff;
}

.faq-answer-list {
	margin: 6px 0 0;
	padding-left: 18px;
	font-size: 0.82rem;
	color: #4b5563;
	line-height: 1.5;
	text-align: left;
}

.faq-answer-outro {
	margin-top: 8px;
}

html.ion-palette-dark .faq-answer-list {
	color: #94a3b8 !important;
}

.faq-answer-text {
	font-size: 0.82rem;
	font-weight: 400;
	color: #4b5563;
	line-height: 1.5;
	margin: 0;
	text-align: left;
}

/* About Us Layout */
.about-container {
	padding: 20px 20px 32px;
}

.about-app-title {
	font-size: 1.35rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 12px;
}

.about-description {
	font-size: 0.88rem;
	font-weight: 400;
	color: #4b5563;
	line-height: 1.55;
	margin: 0 0 16px;
	text-align: left;
}

.about-section-heading {
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
	margin: 20px 0 8px;
}

.about-team-list {
	margin: 0 0 20px;
	padding-left: 20px;
	font-size: 0.88rem;
	color: #374151;
	line-height: 1.6;
}

.about-team-list li {
	margin-bottom: 4px;
	font-weight: 500;
}

.about-footer-tag {
	font-size: 0.8rem;
	color: #6b7280;
	margin: 0;
}
</style>