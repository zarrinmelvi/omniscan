<template>
	<ion-page>
		<ion-header class="ion-no-border">
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
							<p class="row-subtitle">Allow OmniScan to scan product's ingredients &amp; logo</p>
						</div>
						<ion-toggle v-model="cameraPermission" @ion-change="savePrefs" class="custom-toggle" />
					</div>
					<div class="settings-row">
						<div class="icon-wrapper icon-orange">
							<ion-icon :icon="notificationsOutline" class="row-icon" />
						</div>
						<div class="row-text">
							<p class="row-title">Notifications</p>
							<p class="row-subtitle">Get expiry and recipe alerts</p>
						</div>
						<ion-toggle v-model="notificationsPermission" @ion-change="savePrefs" class="custom-toggle" />
					</div>
				</div>

				<!-- Appearance -->
				<p class="section-label section-label--top">APPEARANCE</p>
				<div class="settings-card">
					<div class="settings-row">
						<div class="icon-wrapper icon-purple">
							<ion-icon :icon="moonOutline" class="row-icon" />
						</div>
						<div class="row-text">
							<p class="row-title">Dark Mode</p>
							<p class="row-subtitle">Switch to a darker interface</p>
						</div>
						<ion-toggle v-model="darkMode" @ion-change="onDarkModeToggle" class="custom-toggle" />
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
							<p class="row-subtitle">support@omniscan.app</p>
						</div>
						<ion-icon :icon="chevronForwardOutline" class="chevron" />
					</button>
				</div>

				<div class="version-container">
					<p class="version-text">OmniScan v1.0.0</p>
					<p class="version-text">© 2026 OmniScan. All rights reserved.</p>
				</div>
			</div>
		</ion-content>

		<!-- Terms & Conditions Modal -->
		<ion-modal :is-open="isTermsOpen" @didDismiss="isTermsOpen = false">
			<ion-header>
				<ion-toolbar>
					<ion-title>Terms &amp; Conditions</ion-title>
					<ion-buttons slot="end">
						<ion-button @click="isTermsOpen = false"><ion-icon :icon="closeOutline" slot="icon-only" /></ion-button>
					</ion-buttons>
				</ion-toolbar>
			</ion-header>
			<ion-content class="ion-padding">
				<p class="placeholder-note">Placeholder text — this has not been reviewed by a lawyer. Replace before shipping to real users.</p>
				<p class="legal-updated">Last updated: [date]</p>
				<h3>1. Acceptance of Terms</h3>
				<p>
					By downloading or using OmniScan ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree to these
					terms, please do not use the App. These terms apply to all users of the App.
				</p>
				<h3>2. Use of the App</h3>
				<p>
					OmniScan is a personal pantry management tool. You agree to use it only for lawful purposes and in a manner that does not infringe
					the rights of others. The App is intended for personal, non-commercial use only.
				</p>
				<h3>3. Data &amp; Privacy</h3>
				<p>
					We collect the minimum data necessary to provide our services, including your dietary preferences, pantry information, and usage
					analytics. We do not sell your personal data to third parties. Data is stored securely and used solely to improve your experience
					with OmniScan.
				</p>
				<h3>4. Camera &amp; Permissions</h3>
				<p>
					OmniScan requests camera access solely for barcode and product scanning. Images captured during scanning are processed to extract
					product information and are not shared with third parties beyond what's necessary for that analysis.
				</p>
				<h3>5. Accuracy of Detection</h3>
				<p>
					OmniScan's allergen and Halal detection relies on visible packaging information and a predefined dataset. It may not catch every
					allergen, certification, or product — always verify critical dietary decisions independently.
				</p>
				<ion-button expand="block" class="understand-button" @click="isTermsOpen = false">I Understand</ion-button>
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
						OmniScan is a cross-platform pantry manager that uses computer vision and AI to help you scan food packaging, detect allergens,
						identify Halal certification, track expiration dates, and get recipe ideas from what's already in your pantry.
					</p>

					<p class="about-section-heading">Our Team</p>
					<ul class="about-team-list">
						<li>ZarrinMelvi V. Delos Santos</li>
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

// Settings now lives inside /tabs/ (a sibling of Profile in the same nested
// outlet), so this push is just normal same-outlet navigation – the earlier
// crash was from Settings being a top-level route in a *different* outlet
// than Profile, which Ionic's tabs outlet doesn't reliably restore from.
function goBackToProfile() {
	router.push('/tabs/profile')
}

const DARK_MODE_KEY = 'omniscan_dark_mode'
const CAMERA_PREF_KEY = 'omniscan_pref_camera'
const NOTIF_PREF_KEY = 'omniscan_pref_notifications'

const cameraPermission = ref(true)
const notificationsPermission = ref(true)
const darkMode = ref(false)

const isTermsOpen = ref(false)
const isFaqOpen = ref(false)
const isAboutOpen = ref(false)

const faqs = [
	{
		q: 'What is OmniScan?',
		a: 'OmniScan is a smart pantry management system that uses Artificial Intelligence and computer vision to scan food products, detect allergens, verify Halal certification, and provide personalized food recommendations.',
	},
	{
		q: 'How does OmniScan work?',
		a: 'Users can scan food packaging using their device camera or upload an image. The system analyzes the product using computer vision and OCR to extract ingredient information, detect allergens, and recognize Halal certification logos.',
	},
	{
		q: 'What allergens can the system detect?',
		a: 'OmniScan can detect common allergens such as milk, eggs, peanuts, tree nuts, soy, wheat, fish, and shellfish. Additionally, users can customize their dietary profile by adding other allergies or ingredient sensitivities.',
	},
	{
		q: 'Can I add my own dietary restrictions?',
		a: 'Yes. The system includes a personalized dietary profile where users can add allergies, dietary restrictions (e.g., Halal, vegetarian, vegan), health conditions, and nutritional preferences.',
	},
	{
		q: 'How does the Halal detection feature work?',
		a: 'The system identifies authorized Halal certification logos from food packaging and verifies them using a stored database of recognized certification marks.',
	},
	{
		q: 'Does OmniScan suggest food or recipes?',
		a: 'Yes. OmniScan provides AI-powered recommendations, including safer alternative products and recipe suggestions based on the ingredients available in your pantry and your dietary profile.',
	},
	{
		q: 'Can OmniScan track expiration dates?',
		a: 'Yes. The system monitors expiration dates of stored products and notifies users when items are near expiration to help reduce food waste.',
	},
	{
		q: 'Is an internet connection required?',
		a: 'Some features, such as AI recommendations and database updates, may require an internet connection, while basic scanning functions may still work with limited offline capability depending on the system design.',
	},
	{
		q: 'Is my personal data safe?',
		a: 'Yes. OmniScan is designed to protect user data. Personal information and dietary profiles are securely stored and used only to provide personalized system features and recommendations.',
	},
	{
		q: 'Who can use OmniScan?',
		a: 'OmniScan is designed for anyone, especially individuals with food allergies, dietary restrictions, health conditions, or those who want to make safer and more informed food choices.',
	},
]

function savePrefs() {
	localStorage.setItem(CAMERA_PREF_KEY, String(cameraPermission.value))
	localStorage.setItem(NOTIF_PREF_KEY, String(notificationsPermission.value))
}

function applyDarkModeClass(enabled: boolean) {
	document.documentElement.classList.toggle('ion-palette-dark', enabled)
}

function onDarkModeToggle() {
	localStorage.setItem(DARK_MODE_KEY, String(darkMode.value))
	applyDarkModeClass(darkMode.value)
}

function contactSupport() {
	window.location.href = 'mailto:support@omniscan.app'
}

onMounted(() => {
	cameraPermission.value = localStorage.getItem(CAMERA_PREF_KEY) !== 'false'
	notificationsPermission.value = localStorage.getItem(NOTIF_PREF_KEY) !== 'false'
	darkMode.value = localStorage.getItem(DARK_MODE_KEY) === 'true'
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
	padding: 12px 18px 32px;
}

.section-label {
	font-weight: 600;
	font-size: 0.72rem;
	color: #8e8e93;
	letter-spacing: 0.5px;
	margin: 12px 0 10px 4px;
}

.section-label--top {
	margin-top: 24px;
}

.settings-card {
	background: #ffffff;
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.settings-row {
	display: flex;
	align-items: center;
	gap: 14px;
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
	width: 36px;
	height: 36px;
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
	margin-top: 32px;
	text-align: center;
}

.version-text {
	font-size: 0.75rem;
	color: #9ca3af;
	margin: 2px 0;
}

/* Base Modal Styling */
.placeholder-note {
	background: #fef3c7;
	color: #92400e;
	border-radius: 8px;
	padding: 8px 12px;
	font-size: 0.8rem;
	margin-bottom: 8px;
}

.legal-updated {
	font-size: 0.78rem;
	color: #9ca3af;
	margin-bottom: 16px;
}

.understand-button {
	--background: #16a34a;
	--border-radius: 12px;
	font-weight: 600;
	margin-top: 20px;
}

/* Custom Styled Sheet Modals (FAQ & About Us) */
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

.faq-answer-text {
	font-size: 0.82rem;
	font-weight: 400;
	color: #4b5563;
	line-height: 1.5;
	margin: 0;
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
	margin: 0 0 20px;
}

.about-section-heading {
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 8px;
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