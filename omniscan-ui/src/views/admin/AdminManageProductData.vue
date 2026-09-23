<template>
	<div class="manage-product-data">
		<!-- Header Section -->
		<header class="page-header">
			<h1>Manage Product Data</h1>
			<p class="subtitle">
				Update allergen dictionary · Maintain halal logo library · Refine ingredient mappings
			</p>
		</header>

		<!-- Sub-Navigation Pill Tabs -->
		<div class="tabs-bar">
			<button
				class="tab-button"
				:class="{ active: activeTab === 'allergen' }"
				@click="switchTab('allergen')"
			>
				<svg class="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
				</svg>
				Allergen Dictionary
			</button>

			<button
				class="tab-button"
				:class="{ active: activeTab === 'halal' }"
				@click="switchTab('halal')"
			>
				<svg class="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
				</svg>
				Halal Logo Library
			</button>

			<button
				class="tab-button"
				:class="{ active: activeTab === 'ingredient' }"
				@click="switchTab('ingredient')"
			>
				<svg class="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
				</svg>
				Ingredient Mappings
			</button>
		</div>

		<!-- Main Card / Table Container -->
		<div class="content-card">
			<div class="controls-bar">
				<span class="section-title">{{ getTabTitle }}</span>

				<div class="action-controls">
					<!-- Search Input -->
					<div class="search-box">
						<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8"></circle>
							<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
						</svg>
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Search..."
						/>
					</div>

					<!-- Add New Button -->
					<button class="btn-add" @click="handleAddNew">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<line x1="12" y1="5" x2="12" y2="19"></line>
							<line x1="5" y1="12" x2="19" y2="12"></line>
						</svg>
						Add New
					</button>
				</div>
			</div>

			<!-- Loading / Error States -->
			<p v-if="isLoading" class="state-message">Loading data...</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>

			<!-- 1. Allergen Dictionary Table -->
			<template v-else-if="activeTab === 'allergen'">
				<p v-if="filteredAllergens.length === 0" class="empty-note">No allergen records found.</p>
				<table v-else class="data-table">
					<thead>
						<tr>
							<th class="col-id">ID</th>
							<th class="col-allergen">ALLERGEN</th>
							<th class="col-aliases">COMMON ALIASES</th>
							<th class="col-severity">SEVERITY</th>
							<th class="col-flags">DIETARY FLAGS</th>
							<th class="col-updated">UPDATED</th>
							<th class="col-actions">ACTIONS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in filteredAllergens" :key="item.id">
							<td class="col-id cell-id">{{ item.code }}</td>
							<td class="col-allergen cell-allergen">{{ item.allergen }}</td>
							<td class="col-aliases cell-aliases">{{ item.common_aliases }}</td>
							<td class="col-severity">
								<span class="severity-badge" :class="item.severity.toLowerCase()">
									{{ item.severity.toUpperCase() }}
								</span>
							</td>
							<td class="col-flags">
								<div class="flags-wrapper">
									<span v-for="(flag, idx) in item.dietary_flags" :key="idx" class="flag-chip">
										{{ flag }}
									</span>
								</div>
							</td>
							<td class="col-updated cell-updated">{{ item.updated }}</td>
							<td class="col-actions">
								<div class="actions-row">
									<button class="btn-edit" @click="editItem(item)">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M12 20h9"></path>
											<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
										</svg>
										Edit
									</button>
									<button class="btn-delete" @click="deleteItem(item.id)" aria-label="Delete">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="3 6 5 6 21 6"></polyline>
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</template>

			<!-- 2. Halal Logo Library Table -->
			<template v-else-if="activeTab === 'halal'">
				<p v-if="filteredHalalLogos.length === 0" class="empty-note">No halal logo records found.</p>
				<table v-else class="data-table">
					<thead>
						<tr>
							<th class="col-id">ID</th>
							<th>CERTIFIER</th>
							<th>COUNTRY</th>
							<th>STATUS</th>
							<th class="col-actions">ACTIONS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="logo in filteredHalalLogos" :key="logo.id">
							<td class="cell-id">#{{ logo.id }}</td>
							<td class="cell-allergen">{{ logo.certifier }}</td>
							<td class="cell-aliases">{{ logo.country || 'N/A' }}</td>
							<td>
								<span class="severity-badge low">RECOGNIZED</span>
							</td>
							<td class="col-actions">
								<div class="actions-row">
									<button class="btn-edit" @click="editItem(logo)">Edit</button>
									<button class="btn-delete" @click="deleteItem(logo.id)" aria-label="Delete">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="3 6 5 6 21 6"></polyline>
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</template>

			<!-- 3. Ingredient Mappings Table -->
			<template v-else-if="activeTab === 'ingredient'">
				<p v-if="filteredIngredients.length === 0" class="empty-note">No ingredient mapping records found.</p>
				<table v-else class="data-table">
					<thead>
						<tr>
							<th class="col-id">ID</th>
							<th>INGREDIENT NAME</th>
							<th>E-NUMBER / ALIAS</th>
							<th>HALAL STATUS</th>
							<th class="col-actions">ACTIONS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="ing in filteredIngredients" :key="ing.id">
							<td class="cell-id">#{{ ing.id }}</td>
							<td class="cell-allergen">{{ ing.name }}</td>
							<td class="cell-aliases">{{ ing.e_number || ing.aliases || 'N/A' }}</td>
							<td>
								<span
									class="severity-badge"
									:class="{
										low: ing.halal_status === 'Halal',
										high: ing.halal_status === 'Haram',
										medium: ing.halal_status === 'Syubhah' || ing.halal_status === 'Doubtful'
									}"
								>
									{{ (ing.halal_status || 'CHECK').toUpperCase() }}
								</span>
							</td>
							<td class="col-actions">
								<div class="actions-row">
									<button class="btn-edit" @click="editItem(ing)">Edit</button>
									<button class="btn-delete" @click="deleteItem(ing.id)" aria-label="Delete">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="3 6 5 6 21 6"></polyline>
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</template>

			<!-- Bottom Sync Footer Notice -->
			<div class="card-footer-notice">
				Changes sync to Ollama Pro context on next verification cycle.
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

type TabType = 'allergen' | 'halal' | 'ingredient'

interface AllergenItem {
	id: number
	code: string
	allergen: string
	common_aliases: string
	severity: 'HIGH' | 'MEDIUM' | 'LOW'
	dietary_flags: string[]
	updated: string
}

interface HalalLogoOption {
	id: number
	certifier: string
	country?: string
}

interface IngredientMapping {
	id: number
	name: string
	e_number?: string
	aliases?: string
	halal_status?: 'Halal' | 'Haram' | 'Syubhah' | 'Doubtful'
}

const activeTab = ref<TabType>('allergen')
const searchQuery = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

// Fallback values matching mockup design
const allergens = ref<AllergenItem[]>([
	{
		id: 1,
		code: 'A001',
		allergen: 'Gluten',
		common_aliases: 'Wheat, Barley, Rye, Triticale, Spelt',
		severity: 'HIGH',
		dietary_flags: ['Celiac', 'Gluten-Free'],
		updated: '2026-04-01',
	},
	{
		id: 2,
		code: 'A002',
		allergen: 'Tree Nuts',
		common_aliases: 'Almonds, Cashews, Walnuts, Pecans, Pistachios',
		severity: 'HIGH',
		dietary_flags: ['Nut Allergy'],
		updated: '2026-03-28',
	},
	{
		id: 3,
		code: 'A003',
		allergen: 'Pork Derivatives',
		common_aliases: 'Gelatin (Pork), Lard, Pepsin, E471 (pork)',
		severity: 'HIGH',
		dietary_flags: ['Halal', 'Kosher'],
		updated: '2026-03-27',
	},
	{
		id: 4,
		code: 'A004',
		allergen: 'Milk / Dairy',
		common_aliases: 'Lactose, Whey, Casein, Milk Solids',
		severity: 'MEDIUM',
		dietary_flags: ['Vegan', 'Lactose-Free'],
		updated: '2026-03-25',
	},
])

const halalLogos = ref<HalalLogoOption[]>([])
const ingredientMappings = ref<IngredientMapping[]>([
	{ id: 1, name: 'Mono- and diglycerides of fatty acids', e_number: 'E471', halal_status: 'Syubhah' },
	{ id: 2, name: 'Pork Gelatin', aliases: 'Gelatin (porcine)', halal_status: 'Haram' },
	{ id: 3, name: 'Soy Lecithin', e_number: 'E322', halal_status: 'Halal' },
])

const getTabTitle = computed(() => {
	if (activeTab.value === 'halal') return 'Maintain halal logo library'
	if (activeTab.value === 'ingredient') return 'Refine ingredient mappings'
	return 'Update allergen entries & severity'
})

const filteredAllergens = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return allergens.value
	return allergens.value.filter(
		(item) =>
			item.code.toLowerCase().includes(q) ||
			item.allergen.toLowerCase().includes(q) ||
			item.common_aliases.toLowerCase().includes(q)
	)
})

const filteredHalalLogos = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return halalLogos.value
	return halalLogos.value.filter((item) => item.certifier.toLowerCase().includes(q))
})

const filteredIngredients = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return ingredientMappings.value
	return ingredientMappings.value.filter(
		(item) =>
			item.name.toLowerCase().includes(q) ||
			(item.e_number && item.e_number.toLowerCase().includes(q)) ||
			(item.aliases && item.aliases.toLowerCase().includes(q))
	)
})

function formatAllergenRecord(item: Record<string, any>, index: number): AllergenItem {
	const rawCode = item.code || item.allergen_code || `A00${index + 1}`
	const rawName = item.allergen || item.name || item.allergen_name || 'Unknown Allergen'
	
	let aliasesStr = 'None'
	if (Array.isArray(item.aliases)) {
		aliasesStr = item.aliases.join(', ')
	} else if (Array.isArray(item.common_aliases)) {
		aliasesStr = item.common_aliases.join(', ')
	} else if (typeof item.common_aliases === 'string') {
		aliasesStr = item.common_aliases
	} else if (typeof item.aliases === 'string') {
		aliasesStr = item.aliases
	}

	const rawSeverity = (item.severity || 'HIGH').toString().toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW'
	
	let flags: string[] = []
	if (Array.isArray(item.dietary_flags)) {
		flags = item.dietary_flags
	} else if (Array.isArray(item.flags)) {
		flags = item.flags
	} else if (typeof item.dietary_flags === 'string') {
		flags = item.dietary_flags.split(',').map((f: string) => f.trim())
	}

	let updatedDate = new Date().toISOString().split('T')[0]
	if (item.updatedAt) {
		updatedDate = new Date(item.updatedAt).toISOString().split('T')[0]
	} else if (item.updated) {
		updatedDate = item.updated
	}

	return {
		id: item.id ?? index + 1,
		code: rawCode,
		allergen: rawName,
		common_aliases: aliasesStr,
		severity: rawSeverity,
		dietary_flags: flags,
		updated: updatedDate,
	}
}

async function fetchTabContent(tab: TabType): Promise<void> {
	isLoading.value = true
	errorMessage.value = null

	try {
		if (tab === 'allergen') {
			try {
				const data = await apiFetch<any>('/api/admin/allergens', { isAdmin: true })
				const rawList = Array.isArray(data) ? data : (data.allergens || data.allergen || data.data || [])
				if (rawList.length) {
					allergens.value = rawList.map((item: any, idx: number) => formatAllergenRecord(item, idx))
				}
			} catch (err) {
				console.warn('Backend allergen route pending, using fallback values.')
			}
		} else if (tab === 'halal') {
			try {
				const data = await apiFetch<any>('/api/halal_logo?take=100&skip=0', { isAdmin: true })
				const rawList = Array.isArray(data) ? data : (data.halalLogo || data.data || [])
				if (rawList.length) {
					halalLogos.value = rawList
				}
			} catch (err) {
				console.warn('Backend halal logo route pending.')
			}
		} else if (tab === 'ingredient') {
			try {
				const data = await apiFetch<any>('/api/admin/ingredient-mappings', { isAdmin: true })
				const rawList = Array.isArray(data) ? data : (data.ingredients || data.data || [])
				if (rawList.length) {
					ingredientMappings.value = rawList
				}
			} catch (err) {
				console.warn('Backend ingredient mapping route pending.')
			}
		}
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to fetch database records.'
	} finally {
		isLoading.value = false
	}
}

function switchTab(tab: TabType): void {
	activeTab.value = tab
	searchQuery.value = ''
	fetchTabContent(tab)
}

function handleAddNew(): void {
	console.log(`Open modal to add new item for ${activeTab.value}`)
}

function editItem(item: unknown): void {
	console.log(`Edit item in ${activeTab.value}:`, item)
}

function deleteItem(id: number): void {
	if (confirm('Are you sure you want to delete this record?')) {
		if (activeTab.value === 'allergen') {
			allergens.value = allergens.value.filter((i) => i.id !== id)
		} else if (activeTab.value === 'halal') {
			halalLogos.value = halalLogos.value.filter((i) => i.id !== id)
		} else if (activeTab.value === 'ingredient') {
			ingredientMappings.value = ingredientMappings.value.filter((i) => i.id !== id)
		}
	}
}

onMounted(() => {
	fetchTabContent('allergen')
})
</script>

<style scoped>
.manage-product-data {
	padding: 8px 4px 32px 4px;
	background-color: #f8fafc;
	font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	color: #334155;
}

.page-header {
	margin-bottom: 24px;
}

h1 {
	font-size: 1.4rem;
	font-weight: 700;
	margin: 0 0 4px;
	color: #0f172a;
}

.subtitle {
	color: #64748b;
	font-size: 0.88rem;
	margin: 0;
}

.tabs-bar {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 24px;
}

.tab-button {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 10px 18px;
	border-radius: 12px;
	border: 1px solid #e2e8f0;
	background: #ffffff;
	color: #334155;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.15s ease;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.tab-button:hover {
	background: #f1f5f9;
	color: #0f172a;
}

.tab-button.active {
	background: #008744;
	color: #ffffff;
	border-color: #008744;
}

.tab-icon {
	flex-shrink: 0;
}

.content-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 16px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
	overflow: hidden;
}

.controls-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px 24px;
}

.section-title {
	font-size: 0.92rem;
	color: #64748b;
	font-weight: 500;
}

.action-controls {
	display: flex;
	align-items: center;
	gap: 12px;
}

.search-box {
	display: flex;
	align-items: center;
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	padding: 8px 14px;
	width: 220px;
}

.search-icon {
	color: #94a3b8;
	margin-right: 8px;
	flex-shrink: 0;
}

.search-box input {
	border: none;
	outline: none;
	width: 100%;
	font-size: 0.88rem;
	color: #1e293b;
	background: transparent;
}

.btn-add {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: #008744;
	color: #ffffff;
	border: none;
	border-radius: 10px;
	padding: 9px 18px;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.btn-add:hover {
	background: #00753a;
}

.data-table {
	width: 100%;
	border-collapse: collapse;
}

th {
	text-align: left;
	padding: 14px 24px;
	font-size: 0.73rem;
	font-weight: 700;
	color: #64748b;
	background: #ffffff;
	border-bottom: 1px solid #f1f5f9;
	letter-spacing: 0.05em;
}

td {
	padding: 18px 24px;
	border-bottom: 1px solid #f8fafc;
	font-size: 0.88rem;
	vertical-align: middle;
}

.cell-id {
	color: #94a3b8;
	font-weight: 600;
	font-size: 0.82rem;
}

.cell-allergen {
	font-weight: 600;
	color: #0f172a;
}

.cell-aliases {
	color: #64748b;
	max-width: 240px;
	line-height: 1.35;
}

.severity-badge {
	display: inline-block;
	padding: 4px 12px;
	border-radius: 12px;
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.02em;
}

.severity-badge.high {
	background-color: #ffe4e6;
	color: #e11d48;
}

.severity-badge.medium {
	background-color: #fef9c3;
	color: #ca8a04;
}

.severity-badge.low {
	background-color: #e0f2fe;
	color: #0284c7;
}

.flags-wrapper {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
}

.flag-chip {
	display: inline-block;
	background: #f1f5f9;
	color: #475569;
	border-radius: 6px;
	padding: 3px 8px;
	font-size: 0.75rem;
	font-weight: 500;
}

.cell-updated {
	color: #94a3b8;
	font-size: 0.82rem;
}

.actions-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.btn-edit {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: #ffffff;
	border: 1px solid #e2e8f0;
	color: #1e293b;
	border-radius: 20px;
	padding: 6px 14px;
	font-size: 0.8rem;
	font-weight: 600;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.btn-edit:hover {
	background: #f8fafc;
}

.btn-delete {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	background: #ffffff;
	border: 1px solid #fecaca;
	color: #ef4444;
	border-radius: 50%;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.btn-delete:hover {
	background: #fef2f2;
}

/* Footer Sync Notice Styling */
.card-footer-notice {
	padding: 16px 24px;
	background-color: #f8fafc;
	border-top: 1px solid #f1f5f9;
	font-size: 0.82rem;
	color: #94a3b8;
}

.state-message,
.empty-note {
	padding: 32px;
	text-align: center;
	color: #64748b;
	font-size: 0.9rem;
}

.error-message {
	padding: 32px;
	text-align: center;
	color: #dc2626;
	font-size: 0.9rem;
}
</style>