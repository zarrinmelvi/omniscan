<template>
	<ion-page>
		<ion-content class="auth-content" :scroll-y="true">
			<div class="auth-card">
				<!-- Back button shown ONLY on Step 1 -->
				<button v-if="step === 1" class="back-button" @click="handleBack">
					<ion-icon :icon="chevronBackOutline" />
				</button>

				<div class="progress-bar">
					<div class="progress-segment" :class="{ 'progress-segment--filled': step >= 1 }"></div>
					<div class="progress-segment" :class="{ 'progress-segment--filled': step >= 2 }"></div>
				</div>
				<p v-if="step === 1" class="step-label">Step 1 of 2</p>
				<p v-else class="step-label step-label--accent">Step 2 of 2</p>

				<!-- STEP 1: Create Account -->
				<template v-if="step === 1">
					<span class="brand-label">OmniScan</span>
					<h1 class="auth-title">Create Account</h1>
					<p class="auth-subtitle">Let's get started with your smart pantry</p>

					<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>

					<form @submit.prevent="handleRegister">
						<div class="form-group">
							<label class="input-label">Full Name</label>
							<div class="custom-input-wrapper">
								<input
									v-model="name"
									type="text"
									placeholder="Enter your name"
									class="custom-input"
									:class="{ 'input-error': fieldErrors.name }"
									@input="clearFieldError('name')" />
							</div>
						</div>

						<div class="form-group">
							<label class="input-label">Email Address</label>
							<div class="custom-input-wrapper">
								<input
									v-model="email"
									type="text"
									placeholder="your@email.com"
									class="custom-input"
									:class="{ 'input-error': fieldErrors.email }"
									@input="clearFieldError('email')" />
							</div>
						</div>

						<div class="form-group">
							<label class="input-label">Password</label>
							<div class="custom-input-wrapper">
								<input
									v-model="password"
									:type="showPassword ? 'text' : 'password'"
									placeholder="Create a password"
									class="custom-input"
									:class="{ 'input-error': fieldErrors.password }"
									@input="clearFieldError('password')" />
								<ion-icon
									:icon="showPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showPassword = !showPassword" />
							</div>
							<p class="hint-text">Min. 8 chars, 1 uppercase, 1 number, 1 special character</p>
						</div>

						<div class="form-group">
							<label class="input-label">Confirm Password</label>
							<div class="custom-input-wrapper">
								<input
									v-model="confirmPassword"
									:type="showPassword ? 'text' : 'password'"
									placeholder="Re-enter your password"
									class="custom-input"
									:class="{ 'input-error': fieldErrors.confirmPassword }"
									@input="clearFieldError('confirmPassword')" />
							</div>
						</div>

						<ion-button expand="block" type="submit" class="submit-button" :disabled="isSubmitting">
							{{ isSubmitting ? 'Creating account...' : 'Continue' }}
						</ion-button>
					</form>

					<p class="switch-auth">
						Already have an account?
						<router-link to="/login" class="switch-link">Sign In</router-link>
					</p>
				</template>

				<!-- STEP 2: Dietary Preferences -->
				<template v-else>
					<span class="brand-label">Almost There!</span>
					<h1 class="auth-title">Dietary Preferences</h1>
					<p class="auth-subtitle">Select your dietary preferences so we can help you make better choices</p>

					<div v-if="isLoadingAllergens" class="state-block">
						<ion-spinner name="crescent" />
					</div>

					<div v-else-if="allergensLoadError" class="inline-error">
						<ion-icon :icon="alertCircleOutline" color="danger" />
						<span>{{ allergensLoadError }}</span>
						<ion-button size="small" fill="clear" @click="fetchAllergenCatalog">Retry</ion-button>
					</div>

					<div v-else class="pref-grid">
						<button
							type="button"
							class="pref-card"
							:class="{ 'pref-card--selected': halalSelected }"
							@click="toggleHalal()">
							<span class="pref-emoji">🕌</span>
							<span class="pref-label">Halal</span>
						</button>

						<button
							v-for="allergen in allergenCatalog"
							:key="allergen.id"
							type="button"
							class="pref-card"
							:class="{ 'pref-card--selected': selectedAllergenIds.includes(allergen.id) }"
							@click="toggleAllergen(allergen.id)">
							<span class="pref-emoji">{{ emojiForAllergen(allergen.name) }}</span>
							<span class="pref-label">{{ formatAllergenName(allergen.name) }}</span>
						</button>
					</div>

					<p v-if="prefLimitWarning" class="pref-limit-warning">You can select up to 5 dietary preferences.</p>

					<div v-if="prefsError" class="form-error">{{ prefsError }}</div>

					<ion-button expand="block" class="submit-button" :disabled="isSavingPrefs" @click="completeSetup">
						{{ isSavingPrefs ? 'Saving...' : 'Complete Setup' }}
					</ion-button>

					<button type="button" class="skip-link" :disabled="isSavingPrefs" @click="skipForNow">Skip for now</button>
				</template>
			</div>
		</ion-content>

		<!-- Terms & Conditions Sheet Modal -->
		<ion-modal :is-open="isTermsOpen" @didDismiss="isTermsOpen = false" class="terms-sheet-modal">
			<div class="terms-card">
				<div class="terms-header">
					<h2>OmniScan Terms and Conditions</h2>
				</div>

				<div class="terms-scroll-area">
					<div class="terms-content">
						<p class="terms-date">Last Updated: September 7, 2026</p>

						<p>Welcome to OmniScan, a cross-platform pantry management and food information system developed as part of a Bachelor of Science in Information Technology capstone project at STI College San Jose Del Monte.</p>
						<p>These Terms &amp; Conditions (“Terms”) govern your access to and use of the OmniScan web application and mobile application (“Application” or “System”). By creating an account, accessing, or using OmniScan, you acknowledge that you have read, understood, and agreed to these Terms.</p>
						<p>If you do not agree with any part of these Terms, please discontinue your use of the Application.</p>

						<h4>1. Purpose of OmniScan</h4>
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

						<h4>2. Eligibility and Account Registration</h4>
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

						<h4>3. Dietary Profile Information</h4>
						<p>OmniScan allows users to create and manage personalized dietary profiles, including food allergies, allergen sensitivities, and Halal preferences.</p>
						<p>The information provided in your dietary profile is used to personalize food analysis, safety alerts, filtering, and recommendations.</p>
						<p>You are responsible for ensuring that the dietary information entered into your profile is complete and accurate. OmniScan cannot guarantee that every dietary restriction, allergy, ingredient, or certification will be identified.</p>

						<h4>4. Food Scanning and AI Analysis</h4>
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
							<li><strong>Green</strong> – Safe</li>
							<li><strong>Yellow</strong> – Caution</li>
							<li><strong>Red</strong> – Unsafe/Unsuitable</li>
						</ul>
						<p>These results are intended only as informational and decision-support guidance.</p>

						<h4>5. Food Safety Disclaimer</h4>
						<p>OmniScan does not guarantee that a food product is completely safe, allergen-free, Halal-certified, or suitable for a particular individual.</p>
						<p>Users must always verify the original product packaging, ingredient list, allergen statements, certification information, expiration or best-before dates, and other relevant product information before purchasing or consuming a food product.</p>
						<p>OmniScan should not be used as the sole basis for making decisions involving food allergies, severe dietary restrictions, medical conditions, or religious dietary requirements.</p>
						<p>If you have a serious food allergy or other health-related dietary concern, consult an appropriate qualified healthcare or dietary professional.</p>

						<h4>6. Limitations of Detection</h4>
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

						<h4>7. Halal Verification</h4>
						<p>OmniScan may identify selected Halal certification logos and analyze ingredient information related to Halal compliance.</p>
						<p>However, OmniScan does not represent itself as an official Halal certification authority.</p>
						<p>The absence of a recognized Halal logo or an “unverified” result does not necessarily mean that a product is non-Halal, while the detection of a logo does not independently guarantee the current validity of a certification.</p>
						<p>Users should verify certification information through the appropriate recognized Halal certification authority when necessary.</p>

						<h4>8. Pantry Management and Expiration Dates</h4>
						<p>OmniScan provides a digital pantry feature that allows users to store information about food products and monitor expiration or best-before dates.</p>
						<p>Users are responsible for accurately entering product information, expiration dates, best-before dates, product quantities, portion sizes, and other required pantry information.</p>
						<p>OmniScan provides reminders based on the information entered into the System. The Application does not guarantee that expiration dates are automatically or accurately identified from every product. Users are responsible for checking the actual date printed on the product packaging.</p>
						<p>Users should also update their pantry inventory when products are consumed, removed, discarded, or otherwise no longer available.</p>

						<h4>9. Recipe Recommendations</h4>
						<p>OmniScan may generate recipe suggestions based on available pantry ingredients and the user's dietary profile.</p>
						<p>Recipe recommendations may include suggested ingredients, quantities, portions, and preparation suggestions. AI-generated recipes are provided for informational and convenience purposes only.</p>
						<p>Users are responsible for verifying ingredient suitability, allergen information, Halal compliance, food freshness, proper food handling, cooking requirements, and appropriate ingredient quantities.</p>
						<p>Users should not rely solely on an AI-generated recipe to determine whether a meal is safe or suitable for them.</p>

						<h4>10. User-Uploaded Images and Information</h4>
						<p>Users may upload photographs of food products and related information for analysis.</p>
						<p>Users agree to upload only images and information that they have the right to submit and that are relevant to the intended use of OmniScan. Users should avoid uploading unnecessary personal, confidential, or sensitive information.</p>
						<p>OmniScan may process uploaded images and information to provide the System's scanning, analysis, and recommendation features.</p>

						<h4>11. Notifications and Reminders</h4>
						<p>OmniScan may send notifications regarding food items approaching their expiration dates, dietary warnings, recipe suggestions, account inactivity, and other system-related activities.</p>
						<p>Notifications are provided as reminders and may not always be received, displayed, or delivered on time due to device settings, connectivity issues, system interruptions, or other technical circumstances.</p>

						<h4>12. Account Inactivity and Deletion</h4>
						<p>OmniScan may monitor account activity for system administration purposes.</p>
						<p>An account that remains inactive for six (6) months may receive an email notification informing the user that the account is scheduled for deletion.</p>
						<p>If the account remains inactive for one (1) additional week after the notification, the account may be permanently deleted in accordance with the System's account-management procedures.</p>

						<h4>13. Acceptable Use</h4>
						<p>Users agree not to use OmniScan for unlawful purposes, attempt unauthorized access, disrupt System operations, upload malicious files, or misuse features. Violation of these Terms may result in suspension or termination of access.</p>

						<h4>14. System Availability</h4>
						<p>The developers aim to maintain OmniScan's availability; however, continuous or uninterrupted access is not guaranteed due to updates, server issues, or technical circumstances beyond control.</p>

						<h4>15. Accuracy of Information</h4>
						<p>While reasonable efforts are made, OmniScan does not guarantee that all information, analyses, classifications, recommendations, or alerts will always be complete, accurate, or current. Product packaging and formulations change over time.</p>

						<h4>16. Intellectual Property</h4>
						<p>The OmniScan name, system design, user interface, software components, documentation, logos, and original materials belong to their respective owners. Unauthorized copying or reproduction is prohibited.</p>

						<h4>17. Third-Party Services and Data Sources</h4>
						<p>OmniScan may rely on third-party technologies, services, or databases. Their availability and accuracy are outside the direct control of the development team.</p>

						<h4>18. Limitation of Liability</h4>
						<p>To the extent permitted by law, the OmniScan development team shall not be responsible for losses, damages, injuries, dietary reactions, or food-related incidents resulting from reliance solely on outputs provided by the Application.</p>

						<h4>19. User Responsibility</h4>
						<p>By using OmniScan, users acknowledge that they remain responsible for their own food purchasing, preparation, storage, consumption, and dietary decisions.</p>

						<h4>20. Privacy and Personal Information</h4>
						<p>OmniScan may collect information necessary to provide its features. Personal information is collected, stored, and processed in accordance with applicable data protection requirements.</p>

						<h4>21. Changes to These Terms</h4>
						<p>The development team may update or modify these Terms when necessary. Continued use of OmniScan after updated Terms become effective constitutes acknowledgment of the revised Terms.</p>

						<h4>22. Termination of Access</h4>
						<p>Access may be suspended or terminated if a user violates these Terms or engages in harmful activity.</p>

						<h4>23. Contact and Support</h4>
						<p>Users may contact support regarding technical issues or questions through the Contact Support feature available within the Application.</p>

						<h4>24. Acceptance of Terms</h4>
						<p>By selecting “I Agree”, “Accept”, or by accessing and using OmniScan, you acknowledge that you have read, understood, and agreed to comply with these Terms &amp; Conditions.</p>

						<div class="terms-footer-meta">
							<p><strong>OmniScan</strong></p>
							<p>A Cross-Platform Pantry Manager with Computer Vision for Allergen and Halal Detection and Artificial Intelligence Recommendations</p>
							<p>Developed as a Capstone Project</p>
							<p>STI College San Jose Del Monte</p>
							<p>Bachelor of Science in Information Technology</p>
						</div>
					</div>
				</div>

				<div class="terms-action-row">
					<button type="button" class="btn-terms-agree" @click="acceptTerms">I Agree</button>
					<button type="button" class="btn-terms-disagree" @click="disagreeTerms">I Disagree</button>
				</div>
			</div>
		</ion-modal>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner, IonModal, toastController } from '@ionic/vue'
import { chevronBackOutline, eyeOutline, eyeOffOutline, alertCircleOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch, ApiError } from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const PREF_MAX = 5

const step = ref<1 | 2>(1)

// Step 1 — account creation
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const isTermsOpen = ref(false)
const errorMessage = ref<string | null>(null)

// Per-field validation error flags
const fieldErrors = reactive({
	name: false,
	email: false,
	password: false,
	confirmPassword: false,
})

function clearFieldError(field: keyof typeof fieldErrors) {
	fieldErrors[field] = false
}

async function showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
	const toast = await toastController.create({
		message,
		duration: 3000,
		color,
		position: 'top',
	})
	await toast.present()
}

// Strict email validation
const KNOWN_TLDS =
	'com|org|net|edu|gov|mil|int|info|biz|name|pro|' +
	'app|dev|io|ai|co|me|tv|cc|online|store|' +
	'us|uk|ca|au|de|fr|jp|cn|br|in|mx|ph|sg|nz|za|' +
	'ng|ke|pk|bd|id|my|th|vn|' +
	'es|it|nl|pl|se|no|fi|dk|be|ch|at|ru|tr|' +
	'sa|ae|eg|il|ar|cl|pe|ve'
const EMAIL_RE = new RegExp(`^[^\\s@]+@[^\\s@]+(\\.[^\\s@]+)*\\.(${KNOWN_TLDS})$`, 'i')

// Step 2 — dietary preferences
interface Allergen {
	id: number
	name: string
	scientific_name: string
}

const allergenCatalog = ref<Allergen[]>([])
const selectedAllergenIds = ref<number[]>([])
const halalSelected = ref(false)
const isLoadingAllergens = ref(false)
const allergensLoadError = ref('')
const isSavingPrefs = ref(false)
const prefsError = ref('')
const prefLimitWarning = ref(false)

const prefTotal = computed(() => selectedAllergenIds.value.length + (halalSelected.value ? 1 : 0))

const ALLERGEN_EMOJI: Record<string, string> = {
	milk: '🥛',
	eggs: '🥚',
	fish: '🐟',
	shellfish: '🦐',
	'tree nuts': '🌰',
	peanuts: '🥜',
	wheat: '🌾',
	soy: '🫘',
}

function emojiForAllergen(name: string): string {
	return ALLERGEN_EMOJI[name.toLowerCase()] ?? '🍽️'
}

function formatAllergenName(name: string): string {
	return name.replace(/\b\w/g, (char) => char.toUpperCase())
}

function handleBack(): void {
	if (window.history.length <= 1) {
		router.replace('/')
	} else {
		router.back()
	}
}

async function handleRegister(): Promise<void> {
	errorMessage.value = null
	fieldErrors.name = false
	fieldErrors.email = false
	fieldErrors.password = false
	fieldErrors.confirmPassword = false

	let hasEmptyField = false
	if (!name.value.trim()) { fieldErrors.name = true; hasEmptyField = true }
	if (!email.value.trim()) { fieldErrors.email = true; hasEmptyField = true }
	if (!password.value) { fieldErrors.password = true; hasEmptyField = true }
	if (!confirmPassword.value) { fieldErrors.confirmPassword = true; hasEmptyField = true }
	if (hasEmptyField) {
		errorMessage.value = 'Please fill in all required fields.'
		return
	}

	if (!EMAIL_RE.test(email.value)) {
		fieldErrors.email = true
		errorMessage.value = 'Please enter a valid email address (e.g. user@example.com).'
		return
	}

	if (password.value.length < 8) {
		fieldErrors.password = true
		errorMessage.value = 'Password must be at least 8 characters.'
		return
	}

	if (!/[A-Z]/.test(password.value)) {
		fieldErrors.password = true
		errorMessage.value = 'Password must contain at least one uppercase letter.'
		return
	}

	if (!/[0-9]/.test(password.value)) {
		fieldErrors.password = true
		errorMessage.value = 'Password must contain at least one number.'
		return
	}

	if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password.value)) {
		fieldErrors.password = true
		errorMessage.value = 'Password must contain at least one special character (e.g. !@#$%).'
		return
	}

	if (name.value.trim() === password.value) {
		fieldErrors.name = true
		fieldErrors.password = true
		errorMessage.value = 'Name and password cannot be identical.'
		return
	}

	if (password.value !== confirmPassword.value) {
		fieldErrors.password = true
		fieldErrors.confirmPassword = true
		errorMessage.value = 'Passwords do not match.'
		return
	}

	isTermsOpen.value = true
}

async function acceptTerms(): Promise<void> {
	isTermsOpen.value = false
	isSubmitting.value = true
	try {
		await authStore.register(name.value.trim(), email.value, password.value)
		await authStore.login(email.value, password.value)
		await showToast('Account created successfully!', 'success')
		step.value = 2
		fetchAllergenCatalog()
	} catch (err) {
		if (err instanceof ApiError) {
			if (err.status === 409 || err.message.toLowerCase().includes('email')) {
				fieldErrors.email = true
				errorMessage.value = 'This email address already exists.'
			} else {
				errorMessage.value = err.message
			}
		} else {
			errorMessage.value = 'Registration failed. Please try again.'
		}
	} finally {
		isSubmitting.value = false
	}
}

function disagreeTerms(): void {
	isTermsOpen.value = false
}

async function fetchAllergenCatalog(): Promise<void> {
	isLoadingAllergens.value = true
	allergensLoadError.value = ''

	try {
		allergenCatalog.value = await apiFetch<Allergen[]>('/api/allergen', { method: 'GET' })
	} catch (err) {
		allergensLoadError.value = err instanceof ApiError ? err.message : 'Could not load allergen options.'
	} finally {
		isLoadingAllergens.value = false
	}
}

function toggleAllergen(id: number): void {
	if (selectedAllergenIds.value.includes(id)) {
		selectedAllergenIds.value = selectedAllergenIds.value.filter((existingId) => existingId !== id)
		prefLimitWarning.value = false
	} else {
		if (prefTotal.value >= PREF_MAX) {
			prefLimitWarning.value = true
			return
		}
		selectedAllergenIds.value.push(id)
	}
}

function toggleHalal(): void {
	if (!halalSelected.value && prefTotal.value >= PREF_MAX) {
		prefLimitWarning.value = true
		return
	}
	halalSelected.value = !halalSelected.value
	if (!halalSelected.value) {
		prefLimitWarning.value = false
	}
}

async function completeSetup(): Promise<void> {
	if (isSavingPrefs.value) return

	isSavingPrefs.value = true
	prefsError.value = ''

	const customPrefTags = allergenCatalog.value
		.filter((a) => selectedAllergenIds.value.includes(a.id))
		.map((a) => `${formatAllergenName(a.name)}-free`)

	try {
		await apiFetch('/api/users', {
			method: 'PUT',
			body: {
				halal_pref: halalSelected.value,
				allergen_ids: selectedAllergenIds.value,
				custom_preferences: customPrefTags,
			},
		})
		await authStore.checkAuth()
		window.location.href = '/tabs/home'
	} catch (err) {
		prefsError.value = err instanceof ApiError ? err.message : 'Failed to save your preferences.'
	} finally {
		isSavingPrefs.value = false
	}
}

async function skipForNow(): Promise<void> {
	if (isSavingPrefs.value) return
	await authStore.checkAuth()
	window.location.href = '/tabs/home'
}
</script>

<style scoped>
.auth-content {
	--background: #ffffff;
	--overflow: auto;
}

/* Hide scrollbar track visually on mobile web views */
.auth-content::part(scroll) {
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.auth-content::part(scroll)::-webkit-scrollbar {
	display: none;
}

.auth-card {
	max-width: 380px;
	margin: 0 auto;
	padding: 12px 24px 140px;
	background: #ffffff;
	min-height: 100%;
}

.back-button {
	background: none;
	border: none;
	font-size: 1.25rem;
	color: #111827;
	padding: 4px 0;
	margin-bottom: 8px;
	cursor: pointer;
	display: flex;
	align-items: center;
}

.progress-bar {
	display: flex;
	gap: 6px;
	margin-bottom: 6px;
}

.progress-segment {
	flex: 1;
	height: 4px;
	background: #e5e7eb;
	border-radius: 9999px;
}

.progress-segment--filled {
	background: #05c450;
}

.step-label {
	font-size: 0.75rem;
	color: #6b7280;
	margin: 0 0 24px;
}

.step-label--accent {
	color: #6b7280;
}

.brand-label {
	display: block;
	color: #05c450;
	font-weight: 600;
	font-size: 0.85rem;
	margin-bottom: 4px;
}

.auth-title {
	font-size: 1.85rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 6px;
	letter-spacing: -0.02em;
}

.auth-subtitle {
	color: #6b7280;
	font-size: 0.85rem;
	line-height: 1.4;
	margin: 0 0 24px;
}

.form-group {
	margin-bottom: 14px;
}

.input-label {
	display: block;
	font-size: 0.8rem;
	font-weight: 600;
	color: #374151;
	margin-bottom: 6px;
}

.custom-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.custom-input {
	width: 100%;
	height: 46px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 0 14px;
	font-size: 0.9rem;
	color: #111827;
	outline: none;
	background: #ffffff;
	transition: border-color 0.2s;
}

.custom-input:focus {
	border-color: #05c450;
}

.custom-input.input-error {
	border-color: #ef4444 !important;
}

.custom-input.input-error:focus {
	border-color: #ef4444 !important;
}

.custom-input::placeholder {
	color: #9ca3af;
}

.password-toggle {
	position: absolute;
	right: 14px;
	font-size: 1.1rem;
	color: #6b7280;
	cursor: pointer;
}

.hint-text {
	font-size: 0.75rem;
	color: #6b7280;
	margin: 4px 0 0;
}

.submit-button {
	--background: #05c450;
	--background-activated: #04ab45;
	--border-radius: 9999px;
	--box-shadow: none;
	--color: #ffffff;
	font-weight: 600;
	font-size: 0.95rem;
	height: 48px;
	text-transform: none;
	margin-top: 24px;
}

.switch-auth {
	text-align: center;
	margin-top: 20px;
	font-size: 0.85rem;
	color: #4b5563;
}

.switch-link {
	color: #05c450;
	font-weight: 600;
	text-decoration: none;
	margin-left: 2px;
}

.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 12px;
	font-size: 0.85rem;
}

.inline-error {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 0;
	color: var(--ion-color-danger);
	font-size: 0.85rem;
}

.state-block {
	display: flex;
	justify-content: center;
	padding: 24px 0;
}

/* Step 2 Cards Grid */
.pref-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12px;
	margin-bottom: 24px;
}

.pref-card {
	border: 1px solid #e5e7eb;
	background: #ffffff;
	border-radius: 16px;
	padding: 18px 12px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.pref-card--selected {
	border-color: #05c450;
	background: #f0fdf4;
	box-shadow: 0 0 0 1px #05c450;
}

.pref-emoji {
	font-size: 1.8rem;
	line-height: 1;
}

.pref-label {
	font-size: 0.85rem;
	font-weight: 600;
	color: #111827;
}

.skip-link {
	display: block;
	width: 100%;
	text-align: center;
	background: none;
	border: none;
	color: #6b7280;
	font-size: 0.85rem;
	padding: 16px 0 0;
	cursor: pointer;
}

.pref-limit-warning {
	color: #d97706;
	font-size: 0.78rem;
	margin: -12px 0 12px;
}
</style>

<!-- Global CSS Overrides for Register Terms Modal Overlay -->
<style>
ion-modal.terms-sheet-modal {
	--height: 85%;
	--width: 92%;
	--max-width: 440px;
	--border-radius: 20px;
	--background: transparent;
	--box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
}

.terms-sheet-modal .terms-card {
	background: #ffffff;
	border-radius: 20px;
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	box-sizing: border-box;
}

.terms-sheet-modal .terms-header {
	padding: 18px 20px 14px;
	border-bottom: 1px solid #e2e8f0;
	text-align: center;
}

.terms-sheet-modal .terms-header h2 {
	margin: 0;
	font-size: 1.1rem;
	font-weight: 700;
	color: #0f172a;
}

.terms-sheet-modal .terms-scroll-area {
	flex: 1;
	overflow-y: auto;
	padding: 16px 20px;
}

.terms-sheet-modal .terms-date {
	font-size: 0.78rem;
	color: #64748b;
	margin: 0 0 16px;
	font-weight: 500;
}

.terms-sheet-modal .terms-content h4 {
	font-size: 0.88rem;
	font-weight: 700;
	color: #1e293b;
	margin: 16px 0 6px;
}

.terms-sheet-modal .terms-content p {
	font-size: 0.82rem;
	line-height: 1.45;
	color: #334155;
	margin: 0 0 10px;
}

.terms-sheet-modal .terms-content ul {
	margin: 0 0 12px;
	padding-left: 20px;
}

.terms-sheet-modal .terms-content li {
	font-size: 0.82rem;
	line-height: 1.4;
	color: #334155;
	margin-bottom: 4px;
}

.terms-sheet-modal .terms-footer-meta {
	margin-top: 20px;
	padding-top: 14px;
	border-top: 1px dashed #cbd5e1;
}

.terms-sheet-modal .terms-footer-meta p {
	font-size: 0.75rem;
	color: #64748b;
	margin: 2px 0;
}

.terms-sheet-modal .terms-action-row {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 12px 20px 18px;
	border-top: 1px solid #e2e8f0;
	background: #ffffff;
}

.terms-sheet-modal .btn-terms-agree {
	width: 100%;
	height: 44px;
	background: #05c450;
	border: none;
	border-radius: 9999px;
	color: #ffffff;
	font-weight: 600;
	font-size: 0.95rem;
	cursor: pointer;
}

.terms-sheet-modal .btn-terms-disagree {
	width: 100%;
	height: 44px;
	background: #ffffff;
	border: 1px solid #cbd5e1;
	border-radius: 9999px;
	color: #475569;
	font-weight: 600;
	font-size: 0.95rem;
	cursor: pointer;
}
</style>