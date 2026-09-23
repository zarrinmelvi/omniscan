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
		<ion-modal :is-open="isTermsOpen" @didDismiss="isTermsOpen = false" class="custom-styled-modal">
			<ion-header class="ion-no-border modal-header-custom">
				<div class="modal-header-flex">
					<div>
						<h2 class="modal-title-custom">Terms &amp; Conditions</h2>
						<p class="terms-updated">Last updated: September 7, 2026</p>
					</div>
					<ion-button fill="clear" class="modal-close-icon-btn" @click="isTermsOpen = false">
						<ion-icon :icon="closeOutline" slot="icon-only" />
					</ion-button>
				</div>
			</ion-header>

			<ion-content class="modal-content-custom">
				<div class="terms-container">
					<h3>1. Purpose of OmniScan</h3>
					<p>OmniScan is designed to assist users in making more informed food purchasing and household food management decisions.</p>
					<p>The Application provides features that may include:</p>
					<ul>
						<li>Food product scanning and image uploading;</li>
						<li>Ingredient text extraction and interpretation;</li>
						<li>Potential allergen detection;</li>
						<li>Halal logo and dietary compliance checking;</li>
						<li>Color-coded food safety alerts;</li>
						<li>Alternative product recommendations;</li>
						<li>Digital pantry management;</li>
						<li>Expiration and best-before date reminders;</li>
						<li>AI-generated recipe recommendations; and</li>
						<li>Personalized dietary profiles.</li>
					</ul>
					<p>OmniScan uses technologies such as Optical Character Recognition (OCR), computer vision, artificial intelligence, and reference databases to provide these features.</p>

					<h3>2. Eligibility and Account Registration</h3>
					<p>Users may be required to create an account to access certain features of OmniScan.</p>
					<p>When creating an account, you agree to:</p>
					<ul>
						<li>Provide accurate and truthful information;</li>
						<li>Keep your account information up to date;</li>
						<li>Keep your login credentials confidential;</li>
						<li>Not share your account with unauthorized individuals; and</li>
						<li>Notify the system administrators or support team of any suspected unauthorized access.</li>
					</ul>
					<p>You are responsible for activities performed through your account.</p>

					<h3>3. Dietary Profile Information</h3>
					<p>OmniScan allows users to create and manage personalized dietary profiles, including food allergies, allergen sensitivities, and Halal preferences.</p>
					<p>The information provided in your dietary profile is used to personalize food analysis, safety alerts, filtering, and recommendations.</p>
					<p>You are responsible for ensuring that the dietary information entered into your profile is complete and accurate. OmniScan cannot guarantee that every dietary restriction, allergy, ingredient, or certification will be identified.</p>

					<h3>4. Food Scanning and AI Analysis</h3>
					<p>OmniScan may analyze uploaded or scanned food product images using OCR, computer vision, artificial intelligence, and reference databases.</p>
					<p>The results provided by OmniScan may include:</p>
					<ul>
						<li>Ingredient information;</li>
						<li>Simplified ingredient explanations;</li>
						<li>Potential allergen warnings;</li>
						<li>Halal-related information;</li>
						<li>Dietary suitability indicators;</li>
						<li>Safety alerts; and</li>
						<li>Alternative product recommendations.</li>
					</ul>
					<p>The color-coded results may be presented as:</p>
					<ul>
						<li>Green – Safe</li>
						<li>Yellow – Caution</li>
						<li>Red – Unsafe/Unsuitable</li>
					</ul>
					<p>These results are intended only as informational and decision-support guidance.</p>

					<h3>5. Food Safety Disclaimer</h3>
					<p>OmniScan does not guarantee that a food product is completely safe, allergen-free, Halal-certified, or suitable for a particular individual.</p>
					<p>Users must always verify the original product packaging, ingredient list, allergen statements, certification information, expiration or best-before dates, and other relevant product information before purchasing or consuming a food product.</p>
					<p>OmniScan should not be used as the sole basis for making decisions involving food allergies, severe dietary restrictions, medical conditions, or religious dietary requirements.</p>
					<p>If you have a serious food allergy or other health-related dietary concern, consult an appropriate qualified healthcare or dietary professional.</p>

					<h3>6. Limitations of Detection</h3>
					<p>OmniScan's detection and analysis capabilities are subject to the information available to the System.</p>
					<p>The System may not detect:</p>
					<ul>
						<li>Rare or newly identified allergens;</li>
						<li>Allergens not included in its reference database;</li>
						<li>All international Halal certifications;</li>
						<li>Newly released products not yet included in the product database;</li>
						<li>Products with unclear, damaged, missing, or unreadable labels;</li>
						<li>Products with unclear or absent Halal logos; or</li>
						<li>Ingredients whose composition cannot be reliably determined from the available information.</li>
					</ul>
					<p>The accuracy of scanning may also be affected by image quality, packaging design, text readability, lighting, print resolution, and completeness of the product label.</p>

					<h3>7. Halal Verification</h3>
					<p>OmniScan may identify selected Halal certification logos and analyze ingredient information related to Halal compliance.</p>
					<p>However, OmniScan does not represent itself as an official Halal certification authority.</p>
					<p>The absence of a recognized Halal logo or an “unverified” result does not necessarily mean that a product is non-Halal, while the detection of a logo does not independently guarantee the current validity of a certification.</p>
					<p>Users should verify certification information through the appropriate recognized Halal certification authority when necessary.</p>

					<h3>8. Pantry Management and Expiration Dates</h3>
					<p>OmniScan provides a digital pantry feature that allows users to store information about food products and monitor expiration or best-before dates.</p>
					<p>Users are responsible for accurately entering:</p>
					<ul>
						<li>Product information;</li>
						<li>Expiration dates;</li>
						<li>Best-before dates;</li>
						<li>Product quantities;</li>
						<li>Portion sizes; and</li>
						<li>Other required pantry information.</li>
					</ul>
					<p>OmniScan provides reminders based on the information entered into the System.</p>
					<p>The Application does not guarantee that expiration dates are automatically or accurately identified from every product. Users are responsible for checking the actual date printed on the product packaging.</p>
					<p>Users should also update their pantry inventory when products are consumed, removed, discarded, or otherwise no longer available.</p>

					<h3>9. Recipe Recommendations</h3>
					<p>OmniScan may generate recipe suggestions based on available pantry ingredients and the user's dietary profile.</p>
					<p>Recipe recommendations may include suggested ingredients, quantities, portions, and preparation suggestions.</p>
					<p>AI-generated recipes are provided for informational and convenience purposes only.</p>
					<p>Users are responsible for verifying:</p>
					<ul>
						<li>Ingredient suitability;</li>
						<li>Allergen information;</li>
						<li>Halal compliance;</li>
						<li>Food freshness;</li>
						<li>Proper food handling;</li>
						<li>Cooking requirements; and</li>
						<li>Appropriate ingredient quantities.</li>
					</ul>
					<p>Users should not rely solely on an AI-generated recipe to determine whether a meal is safe or suitable for them.</p>

					<h3>10. User-Uploaded Images and Information</h3>
					<p>Users may upload photographs of food products and related information for analysis.</p>
					<p>Users agree to upload only images and information that they have the right to submit and that are relevant to the intended use of OmniScan.</p>
					<p>Users should avoid uploading unnecessary personal, confidential, or sensitive information.</p>
					<p>OmniScan may process uploaded images and information to provide the System's scanning, analysis, and recommendation features.</p>

					<h3>11. Notifications and Reminders</h3>
					<p>OmniScan may send notifications regarding:</p>
					<ul>
						<li>Food items approaching their expiration dates;</li>
						<li>Dietary warnings;</li>
						<li>Recipe suggestions;</li>
						<li>Account inactivity; and</li>
						<li>Other system-related activities.</li>
					</ul>
					<p>Notifications are provided as reminders and may not always be received, displayed, or delivered on time due to device settings, connectivity issues, system interruptions, or other technical circumstances.</p>
					<p>Users remain responsible for independently checking their food products and account information.</p>

					<h3>12. Account Inactivity and Deletion</h3>
					<p>OmniScan may monitor account activity for system administration purposes.</p>
					<p>An account that remains inactive for six (6) months may receive an email notification informing the user that the account is scheduled for deletion.</p>
					<p>If the account remains inactive for one (1) additional week after the notification, the account may be permanently deleted in accordance with the System's account-management procedures.</p>
					<p>Users are responsible for maintaining activity on their accounts if they wish to retain them.</p>

					<h3>13. Acceptable Use</h3>
					<p>Users agree not to:</p>
					<ul>
						<li>Use OmniScan for unlawful purposes;</li>
						<li>Attempt to gain unauthorized access to another user's account;</li>
						<li>Interfere with or disrupt the operation of the System;</li>
						<li>Attempt to bypass system security measures or usage restrictions;</li>
						<li>Upload malicious files or content intended to damage the System;</li>
						<li>Misuse scanning, recommendation, or other System features;</li>
						<li>Attempt to access administrative functions without authorization; or</li>
						<li>Use the System in a manner that may negatively affect other users or the operation of OmniScan.</li>
					</ul>
					<p>Violation of these Terms may result in suspension or termination of access.</p>

					<h3>14. System Availability</h3>
					<p>The developers aim to maintain OmniScan's availability and functionality; however, continuous or uninterrupted access is not guaranteed.</p>
					<p>The System may occasionally become unavailable because of:</p>
					<ul>
						<li>Maintenance;</li>
						<li>Software updates;</li>
						<li>Server or database issues;</li>
						<li>Internet connectivity problems;</li>
						<li>Third-party service interruptions;</li>
						<li>Security incidents; or</li>
						<li>Other technical circumstances beyond the developers' control.</li>
					</ul>
					<p>The developers reserve the right to modify, temporarily suspend, or discontinue features when necessary for maintenance, security, improvement, or other legitimate purposes.</p>

					<h3>15. Accuracy of Information</h3>
					<p>OmniScan uses databases, OCR, computer vision, and AI technologies to process food-related information.</p>
					<p>While reasonable efforts may be made to improve the accuracy of the System, OmniScan does not guarantee that all information, analyses, classifications, recommendations, or alerts will always be complete, accurate, or current.</p>
					<p>Product formulations, ingredients, packaging, certification status, and other product information may change over time.</p>
					<p>Users should always rely on the most current information provided on the actual product packaging and, when appropriate, official certification or regulatory sources.</p>

					<h3>16. Intellectual Property</h3>
					<p>The OmniScan name, system design, user interface, software components, documentation, logos, and other original materials developed for the project are owned by or belong to their respective owners, subject to applicable licenses and intellectual property rights.</p>
					<p>Users may use OmniScan only for its intended purpose.</p>
					<p>Unauthorized copying, modification, distribution, reverse engineering, or reproduction of protected components of the System is prohibited except where permitted by applicable law or the relevant license.</p>
					<p>Third-party software, frameworks, datasets, and services used by OmniScan remain subject to their respective licenses and terms.</p>

					<h3>17. Third-Party Services and Data Sources</h3>
					<p>OmniScan may rely on third-party technologies, services, datasets, databases, or software components to support its functionality.</p>
					<p>These may include technologies used for artificial intelligence, databases, application development, and other system operations.</p>
					<p>The availability and accuracy of third-party services or data are outside the direct control of the OmniScan development team.</p>

					<h3>18. Limitation of Liability</h3>
					<p>To the extent permitted by applicable law, the OmniScan development team shall not be responsible for losses, damages, injuries, dietary reactions, food-related incidents, or other consequences resulting from reliance solely on information, classifications, alerts, recommendations, or other outputs provided by the Application.</p>
					<p>Users acknowledge that OmniScan is intended as a decision-support and food-management tool and not as a replacement for professional medical, dietary, religious, regulatory, or food-safety advice.</p>

					<h3>19. User Responsibility</h3>
					<p>By using OmniScan, users acknowledge that they remain responsible for their own food purchasing, preparation, storage, consumption, and dietary decisions.</p>
					<p>Users should independently verify important food-related information before consuming a product, particularly when dealing with allergies, severe dietary restrictions, or religious dietary requirements.</p>

					<h3>20. Privacy and Personal Information</h3>
					<p>OmniScan may collect information necessary to provide its features, including account information, dietary profile information, pantry records, scan history, and other information entered or generated through the System.</p>
					<p>Personal information should be collected, stored, processed, and protected in accordance with the System's applicable privacy policies and relevant data protection requirements.</p>
					<p>Users should review the OmniScan Privacy Policy for information regarding the collection, use, storage, retention, and deletion of their personal information.</p>

					<h3>21. Changes to These Terms</h3>
					<p>The OmniScan development team may update or modify these Terms when necessary to reflect changes in the System, its features, security practices, or applicable requirements.</p>
					<p>Updated Terms may be made available through the Application.</p>
					<p>Continued use of OmniScan after updated Terms become effective constitutes acknowledgment of the revised Terms.</p>

					<h3>22. Termination of Access</h3>
					<p>Access to OmniScan may be suspended or terminated if a user violates these Terms, attempts to compromise the System, misuses the Application, or engages in activities that may harm the System or other users.</p>
					<p>Users may also discontinue their use of the Application at any time.</p>

					<h3>23. Contact and Support</h3>
					<p>Users may contact the OmniScan support team regarding technical issues, concerns, questions, or inquiries through the Contact Support feature available within the Application.</p>
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