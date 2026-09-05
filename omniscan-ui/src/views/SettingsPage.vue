<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-buttons slot="start">
					<ion-button @click="goBackToProfile">
						<ion-icon :icon="chevronBackOutline" slot="icon-only" />
					</ion-button>
				</ion-buttons>
				<ion-title>Settings</ion-title>
			</ion-toolbar>
		</ion-header>

		<ion-content class="ion-padding settings-content">
			<p class="section-label">Permissions</p>
			<div class="settings-card">
				<div class="settings-row">
					<ion-icon :icon="cameraOutline" class="row-icon" />
					<div class="row-text">
						<p class="row-title">Camera</p>
						<p class="row-subtitle">Allow OmniScan to scan product ingredients &amp; logos</p>
					</div>
					<ion-toggle v-model="cameraPermission" @ion-change="savePrefs" />
				</div>
				<div class="settings-row">
					<ion-icon :icon="notificationsOutline" class="row-icon" />
					<div class="row-text">
						<p class="row-title">Notifications</p>
						<p class="row-subtitle">Get expiry and recipe alerts</p>
					</div>
					<ion-toggle v-model="notificationsPermission" @ion-change="savePrefs" />
				</div>
			</div>
			<p class="disclaimer-text">
				These two toggles are saved locally on this device only. They don't yet control anything on the server — real camera/push-permission
				enforcement isn't wired up.
			</p>

			<p class="section-label section-label--top">Appearance</p>
			<div class="settings-card">
				<div class="settings-row">
					<ion-icon :icon="moonOutline" class="row-icon" />
					<div class="row-text">
						<p class="row-title">Dark Mode</p>
						<p class="row-subtitle">Switch to a darker interface</p>
					</div>
					<ion-toggle v-model="darkMode" @ion-change="onDarkModeToggle" />
				</div>
			</div>

			<p class="section-label section-label--top">Help &amp; Support</p>
			<div class="settings-card">
				<button type="button" class="settings-row settings-row--button" @click="isTermsOpen = true">
					<ion-icon :icon="documentTextOutline" class="row-icon" />
					<div class="row-text">
						<p class="row-title">Terms &amp; Conditions</p>
						<p class="row-subtitle">Privacy policy &amp; usage terms</p>
					</div>
					<ion-icon :icon="chevronForwardOutline" class="chevron" />
				</button>
				<button type="button" class="settings-row settings-row--button" @click="isFaqOpen = true">
					<ion-icon :icon="helpCircleOutline" class="row-icon" />
					<div class="row-text">
						<p class="row-title">FAQ</p>
						<p class="row-subtitle">Frequently asked questions</p>
					</div>
					<ion-icon :icon="chevronForwardOutline" class="chevron" />
				</button>
				<button type="button" class="settings-row settings-row--button" @click="isAboutOpen = true">
					<ion-icon :icon="informationCircleOutline" class="row-icon" />
					<div class="row-text">
						<p class="row-title">About Us</p>
						<p class="row-subtitle">Our mission &amp; the OmniScan team</p>
					</div>
					<ion-icon :icon="chevronForwardOutline" class="chevron" />
				</button>
				<button type="button" class="settings-row settings-row--button" @click="contactSupport">
					<ion-icon :icon="mailOutline" class="row-icon" />
					<div class="row-text">
						<p class="row-title">Contact Support</p>
						<p class="row-subtitle">support@omniscan.app</p>
					</div>
					<ion-icon :icon="chevronForwardOutline" class="chevron" />
				</button>
			</div>

			<p class="version-text">OmniScan v1.0.0 · © 2026 OmniScan. All rights reserved.</p>
		</ion-content>

		<!-- Terms & Conditions -->
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

		<!-- FAQ -->
		<ion-modal :is-open="isFaqOpen" @didDismiss="isFaqOpen = false">
			<ion-header>
				<ion-toolbar>
					<ion-title>FAQ</ion-title>
					<ion-buttons slot="end">
						<ion-button @click="isFaqOpen = false"><ion-icon :icon="closeOutline" slot="icon-only" /></ion-button>
					</ion-buttons>
				</ion-toolbar>
			</ion-header>
			<ion-content class="ion-padding">
				<div v-for="faq in faqs" :key="faq.q" class="faq-item">
					<p class="faq-question">{{ faq.q }}</p>
					<p class="faq-answer">{{ faq.a }}</p>
				</div>
			</ion-content>
		</ion-modal>

		<!-- About Us -->
		<ion-modal :is-open="isAboutOpen" @didDismiss="isAboutOpen = false">
			<ion-header>
				<ion-toolbar>
					<ion-title>About Us</ion-title>
					<ion-buttons slot="end">
						<ion-button @click="isAboutOpen = false"><ion-icon :icon="closeOutline" slot="icon-only" /></ion-button>
					</ion-buttons>
				</ion-toolbar>
			</ion-header>
			<ion-content class="ion-padding">
				<h2>OmniScan</h2>
				<p>
					OmniScan is a cross-platform pantry manager that uses computer vision and AI to help you scan food packaging, detect allergens,
					identify Halal certification, track expiration dates, and get recipe ideas from what's already in your pantry.
				</p>
				<p class="faq-question">Our Team</p>
				<ul class="team-list">
					<li>ZarrinMelvi V. Delos Santos</li>
					<li>Shanna Hazel A. Rogero</li>
					<li>Angel Fea P. Roma Cruz</li>
					<li>Ruben M. Sentales</li>
				</ul>
				<p class="faq-answer">A capstone project — STI College San Jose Del Monte, 2026.</p>
			</ion-content>
		</ion-modal>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonToggle, IonModal } from '@ionic/vue'
import {
	chevronBackOutline,
	chevronForwardOutline,
	cameraOutline,
	notificationsOutline,
	moonOutline,
	documentTextOutline,
	helpCircleOutline,
	informationCircleOutline,
	mailOutline,
	closeOutline,
} from 'ionicons/icons'

const router = useRouter()

// Settings now lives inside /tabs/ (a sibling of Profile in the same nested
// outlet), so this push is just normal same-outlet navigation — the earlier
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
		q: 'How accurate is the allergen detection?',
		a: 'OmniScan checks against a predefined allergen dataset and readable ingredient labels. It may miss rare or newly identified allergens, or labels that are damaged, unclear, or incomplete — always double-check anything critical.',
	},
	{
		q: 'Does a Halal logo mean the product is certified everywhere?',
		a: "OmniScan recognizes a set of known Halal certification logos in its dataset. It doesn't cover every international certification body, so an unrecognized logo doesn't necessarily mean a product isn't Halal.",
	},
	{
		q: 'How many photos can I upload per day?',
		a: 'Up to 7 photo uploads per day, shared across web and mobile.',
	},
	{
		q: 'Do I need to manually remove consumed pantry items?',
		a: "Yes. OmniScan doesn't automatically detect when you've used a product — mark items as consumed from your Pantry so your inventory stays accurate.",
	},
	{
		q: 'Is my data shared with third parties?',
		a: 'No. Your dietary preferences and pantry data are used only to power your own scans, alerts, and recommendations.',
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
.settings-content {
	--background: #f7f8fa;
}
.section-label {
	font-weight: 600;
	font-size: 0.85rem;
	color: #374151;
	margin: 0 0 8px;
}
.section-label--top {
	margin-top: 20px;
}
.settings-card {
	background: #ffffff;
	border-radius: 14px;
	overflow: hidden;
}
.settings-row {
	display: flex;
	align-items: center;
	gap: 12px;
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
}
.row-icon {
	font-size: 1.3rem;
	color: #16a34a;
	flex-shrink: 0;
}
.row-text {
	flex: 1;
	min-width: 0;
}
.row-title {
	font-size: 0.9rem;
	font-weight: 600;
	color: #111827;
	margin: 0;
}
.row-subtitle {
	font-size: 0.78rem;
	color: #6b7280;
	margin: 2px 0 0;
}
.chevron {
	color: #9ca3af;
	flex-shrink: 0;
}
.disclaimer-text {
	font-size: 0.75rem;
	color: #9ca3af;
	margin: 8px 4px 0;
}
.version-text {
	text-align: center;
	font-size: 0.75rem;
	color: #9ca3af;
	margin: 24px 0 8px;
}

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
.faq-item {
	margin-bottom: 16px;
}
.faq-question {
	font-weight: 600;
	margin: 0 0 4px;
}
.faq-answer {
	color: #4b5563;
	font-size: 0.9rem;
	margin: 0;
}
.team-list {
	margin: 8px 0 16px;
	padding-left: 20px;
}
.team-list li {
	margin-bottom: 4px;
}
</style>
