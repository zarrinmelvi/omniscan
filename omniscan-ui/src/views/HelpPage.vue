<template>
	<ion-page>
		<ion-content :fullscreen="true" class="help-content">
			<!-- Header (same markup and classes as WelcomePage) -->
			<header class="help-header">
				<div class="brand">OmniScan</div>
				<nav class="actions" aria-label="Account">
					<button class="theme" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" :aria-pressed="isDark" @click="toggleTheme">
						<!-- Moon icon shows in LIGHT mode; Sun icon shows in DARK mode -->
						<ion-icon :icon="isDark ? sunnyOutline : moonOutline" />
					</button>
					<ion-button class="pill" @click="router.push('/register')">Sign up</ion-button>
					<ion-button class="pill secondary" @click="router.push('/login')">Sign in</ion-button>
				</nav>
			</header>

			<main class="help-main">
				<ion-button class="back-btn" fill="clear" @click="router.push('/')">
					<ion-icon :icon="arrowBackOutline" slot="start" aria-hidden="true" />
					Back to home
				</ion-button>

				<div class="help-eyebrow">HELP AND SUPPORT</div>
				<h1 class="help-title">How can we help?</h1>
				<p class="help-subtitle">Quick answers to common questions about OmniScan.</p>

				<section class="help-card" aria-labelledby="help-faq-title">
					<h2 id="help-faq-title" class="help-card-title">Common questions</h2>
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
				</section>
			</main>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton, IonIcon, IonAccordionGroup, IonAccordion, IonItem, IonLabel } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { moonOutline, sunnyOutline, arrowBackOutline } from 'ionicons/icons'
import { useDarkMode } from '@/composables/useDarkMode'
import { faqs } from '@/data/faqContent'

const router = useRouter()
const { isDark, toggle } = useDarkMode()

function toggleTheme() {
	toggle()
}
</script>

<style scoped>
* {
	box-sizing: border-box;
	-webkit-tap-highlight-color: transparent;
}

.help-content {
	--background: #f4f9f5;
	--color: #12291b;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* ion-content's own background in dark mode (same pattern as WelcomePage) */
html.ion-palette-dark .help-content {
	--background: #0f172a !important;
	--color: #f1f5f9 !important;
	background: #0f172a !important;
}

.help-content::part(scroll) {
	overflow-x: hidden;
}

html.ion-palette-dark .help-content::part(scroll) {
	background: #0f172a !important;
}

ion-button {
	text-transform: none;
	font-weight: 600;
	--box-shadow: none;
}

/* Header */
.help-header {
	position: relative;
	z-index: 10;
	max-width: 1200px;
	margin: 0 auto;
	height: 76px;
	padding: 0 32px;
	padding-top: env(safe-area-inset-top);
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: transparent;
}

html.ion-palette-dark .help-header {
	background: rgba(15, 23, 42, 0.92) !important;
	backdrop-filter: blur(8px);
}

.brand {
	font-size: 24px;
	font-weight: 800;
	color: #278846;
	letter-spacing: -0.5px;
}

html.ion-palette-dark .brand {
	color: #63cd77 !important;
}

.actions {
	display: flex;
	gap: 12px;
	align-items: center;
}

.theme {
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
	transition: background 0.2s ease, color 0.2s ease;
}

.theme:hover {
	background: #e2e8f0;
}

.theme ion-icon {
	font-size: 1.15rem;
	color: #334155 !important;
}

html.ion-palette-dark .theme {
	background: #334155 !important;
}

html.ion-palette-dark .theme ion-icon {
	color: #fbbf24 !important;
}

/* Pill buttons */
ion-button.pill {
	background: transparent !important;
	--border-radius: 30px;
	--background: #34a853 !important;
	--background-hover: #2d9248 !important;
	--background-activated: #2d9248 !important;
	--color: #ffffff !important;
	--padding-start: 22px;
	--padding-end: 22px;
	--padding-top: 10px;
	--padding-bottom: 10px;
	font-size: 13px;
	height: auto;
	margin: 0;
	opacity: 1 !important;
}

ion-button.pill.secondary {
	--background: #e8f5ec !important;
	--background-hover: #d6ebd9 !important;
	--background-activated: #d6ebd9 !important;
	--color: #1f5e34 !important;
}

html.ion-palette-dark ion-button.pill {
	background: transparent !important;
	--background: #34a853 !important;
	--color: #ffffff !important;
}

html.ion-palette-dark ion-button.pill.secondary {
	background: transparent !important;
	--background: #334155 !important;
	--background-hover: #475569 !important;
	--background-activated: #475569 !important;
	--color: #f1f5f9 !important;
	color: #f1f5f9 !important;
}

/* Main content */
.help-main {
	max-width: 780px;
	margin: 0 auto;
	padding: 8px 26px 64px;
}

ion-button.back-btn {
	--color: #278846;
	--padding-start: 0;
	--padding-end: 8px;
	margin: 0 0 20px;
	font-size: 14px;
}

html.ion-palette-dark ion-button.back-btn {
	--color: #63cd77 !important;
}

.help-eyebrow {
	font-size: 11px;
	color: #278846;
	text-transform: uppercase;
	font-weight: 700;
	letter-spacing: 0.8px;
}

html.ion-palette-dark .help-eyebrow {
	color: #63cd77 !important;
}

.help-title {
	font-size: clamp(32px, 5vw, 44px);
	line-height: 1.1;
	letter-spacing: -1.5px;
	color: #0f2417;
	font-weight: 800;
	margin: 12px 0;
}

html.ion-palette-dark .help-title {
	color: #f1f5f9 !important;
}

.help-subtitle {
	color: #3d5946;
	font-size: 15px;
	margin: 0 0 28px;
}

html.ion-palette-dark .help-subtitle {
	color: #94a3b8 !important;
}

/* Card */
.help-card {
	background: #ffffff;
	border: 1px solid #e2efe5;
	border-radius: 20px;
	padding: 28px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}

html.ion-palette-dark .help-card {
	background: #1e293b !important;
	border: 1px solid #334155 !important;
}

.help-card-title {
	font-size: 22px;
	font-weight: 700;
	line-height: 1.2;
	letter-spacing: -0.5px;
	color: #0f2417;
	margin: 0 0 16px;
}

html.ion-palette-dark .help-card-title {
	color: #f1f5f9 !important;
}

/* FAQ accordion (light rules copied from SettingsPage; dark rules come from dark-mode.css) */
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
	text-align: left;
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

/* Explicit navy dark rules for this page (match global values, win on specificity) */
html.ion-palette-dark .faq-accordion-item {
	background: #1e293b !important;
	border-color: #334155 !important;
}

html.ion-palette-dark .faq-accordion-header {
	--background: #1e293b !important;
}

html.ion-palette-dark .faq-question-label {
	color: #f1f5f9 !important;
}

html.ion-palette-dark .faq-accordion-body {
	background: #1e293b !important;
}

html.ion-palette-dark .faq-answer-text {
	color: #94a3b8 !important;
}

/* Mobile */
@media (max-width: 650px) {
	.help-header {
		height: 64px;
		padding: 0 18px;
		padding-top: env(safe-area-inset-top);
	}

	.brand {
		font-size: 20px;
	}

	.actions {
		gap: 8px;
	}

	ion-button.pill {
		--padding-start: 14px;
		--padding-end: 14px;
		--padding-top: 8px;
		--padding-bottom: 8px;
		font-size: 12px;
	}

	.help-main {
		padding: 8px 18px 48px;
	}

	.help-card {
		padding: 18px;
	}

	.faq-accordion-body {
		padding: 0 14px 14px 14px;
	}
}
</style>
