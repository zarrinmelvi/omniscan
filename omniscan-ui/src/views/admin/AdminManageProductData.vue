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
			<button class="tab-button" :class="{ active: activeTab === 'allergen' }" @click="switchTab('allergen')">
				<svg class="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
				</svg>
				Allergen Dictionary
			</button>

			<button class="tab-button" :class="{ active: activeTab === 'halal' }" @click="switchTab('halal')">
				<svg class="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
				</svg>
				Halal Logo Library
			</button>

			<button class="tab-button" :class="{ active: activeTab === 'ingredient' }" @click="switchTab('ingredient')">
				<svg class="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
				</svg>
				Ingredient Mappings
			</button>
		</div>

		<!-- Main Card Container -->
		<div class="content-card">
			<div class="controls-bar">
				<span class="section-title">{{ getTabTitle }}</span>
				<div class="action-controls">
					<div class="search-box">
						<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8"></circle>
							<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
						</svg>
						<input v-model="searchQuery" type="text" placeholder="Search..." />
					</div>
					<button class="btn-add" @click="handleAddNew">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<line x1="12" y1="5" x2="12" y2="19"></line>
							<line x1="5" y1="12" x2="19" y2="12"></line>
						</svg>
						Add New
					</button>
				</div>
			</div>

			<p v-if="isLoading" class="state-message">Loading data...</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>

			<!-- ══════════════════════════════════════════════════════════ -->
			<!-- 1. ALLERGEN DICTIONARY (table)                            -->
			<!-- ══════════════════════════════════════════════════════════ -->
			<template v-else-if="activeTab === 'allergen'">
				<p v-if="filteredAllergens.length === 0" class="empty-note">No allergen records found.</p>
				<div v-else class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th class="col-id">ID</th>
								<th>ALLERGEN</th>
								<th>COMMON ALIASES</th>
								<th>SEVERITY</th>
								<th>DIETARY FLAGS</th>
								<th>UPDATED</th>
								<th class="col-actions">ACTIONS</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="item in filteredAllergens" :key="item.id">
								<td class="cell-id">{{ item.code }}</td>
								<td class="cell-allergen">{{ item.allergen }}</td>
								<td class="cell-aliases">{{ item.common_aliases }}</td>
								<td>
									<span class="severity-badge" :class="item.severity.toLowerCase()">{{ item.severity }}</span>
								</td>
								<td>
									<div class="flags-wrapper">
										<span v-for="(flag, idx) in item.dietary_flags" :key="idx" class="flag-chip">{{ flag }}</span>
									</div>
								</td>
								<td class="cell-updated">{{ item.updated }}</td>
								<td class="col-actions">
									<div class="actions-row">
										<button class="btn-edit" @click="editItem(item)">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
				</div>
			</template>

			<!-- ══════════════════════════════════════════════════════════ -->
			<!-- 2. HALAL LOGO LIBRARY (card grid)                         -->
			<!-- ══════════════════════════════════════════════════════════ -->
			<template v-else-if="activeTab === 'halal'">
				<p v-if="filteredHalalLogos.length === 0" class="empty-note">No certifier records found.</p>
				<div v-else class="certifier-grid">
					<div v-for="logo in filteredHalalLogos" :key="logo.id" class="certifier-card">
						<div class="certifier-card-top">
							<div class="certifier-logo">
								<img
									v-if="logo.logo_src"
									:src="logo.logo_src"
									:alt="logo.certifier"
									class="certifier-logo-img"
									@error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
								/>
								<span v-else class="certifier-logo-fallback">☪</span>
							</div>
							<span class="status-badge" :class="statusClass(logo.status)">{{ logo.status }}</span>
						</div>

						<div class="certifier-body">
							<h3 class="certifier-name">{{ logo.certifier }}</h3>
							<p class="certifier-fullname">{{ logo.full_name }}</p>
							<div class="certifier-meta">
								<span class="meta-region">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<circle cx="12" cy="10" r="3"></circle>
										<path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"></path>
									</svg>
									{{ logo.region }}
								</span>
								<span class="meta-code">{{ logo.cert_code }}</span>
							</div>
						</div>

						<div class="certifier-actions">
							<button class="cert-btn cert-btn-edit" @click="editItem(logo)">Edit</button>
							<button class="cert-btn cert-btn-review" @click="reviewCertifier(logo)">Review</button>
							<button class="cert-btn cert-btn-renew" @click="renewCertifier(logo)">Renew</button>
						</div>
					</div>
				</div>
			</template>

			<!-- ══════════════════════════════════════════════════════════ -->
			<!-- 3. INGREDIENT MAPPINGS (table)                            -->
			<!-- ══════════════════════════════════════════════════════════ -->
			<template v-else-if="activeTab === 'ingredient'">
				<p v-if="filteredIngredients.length === 0" class="empty-note">No ingredient mapping records found.</p>
				<div v-else class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th class="col-id">ID</th>
								<th>INGREDIENT</th>
								<th>MAPPED CATEGORY</th>
								<th>DIETARY IMPACT</th>
								<th>CONFIDENCE</th>
								<th>HALAL STATUS</th>
								<th class="col-actions">ACTIONS</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="ing in filteredIngredients" :key="ing.id">
								<td class="cell-id">{{ ing.code }}</td>
								<td>
									<div class="ingredient-name-cell">
										<span class="cell-allergen">{{ ing.name }}</span>
										<span v-if="ing.e_number" class="ingredient-enumber">{{ ing.e_number }}</span>
									</div>
								</td>
								<td class="cell-aliases">{{ ing.mapped_category }}</td>
								<td class="cell-impact">{{ ing.dietary_impact }}</td>
								<td>
									<div class="confidence-cell">
										<div class="confidence-bar">
											<div class="confidence-fill" :class="confidenceClass(ing.confidence)" :style="{ width: ing.confidence + '%' }"></div>
										</div>
										<span class="confidence-pct">{{ ing.confidence }}%</span>
									</div>
								</td>
								<td>
									<span class="halal-badge" :class="halalClass(ing.halal_status)">{{ ing.halal_status }}</span>
								</td>
								<td class="col-actions">
									<div class="actions-row">
										<button class="btn-edit" @click="editItem(ing)">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<path d="M12 20h9"></path>
												<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
											</svg>
											Edit
										</button>
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
				</div>
			</template>

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

interface CertifierCard {
	id: number
	certifier: string
	full_name: string
	region: string
	cert_code: string
	status: 'Active' | 'Under Review' | 'Expired'
	logo_src: string | null
}

interface IngredientMapping {
	id: number
	code: string
	name: string
	e_number?: string
	mapped_category: string
	dietary_impact: string
	confidence: number
	halal_status: 'HALAL' | 'HARAM' | 'SYUBHAH'
}

const activeTab = ref<TabType>('allergen')
const searchQuery = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

// ─── Allergen Dictionary mock data ───────────────────────────────────────────
const allergens = ref<AllergenItem[]>([
	{ id: 1, code: 'A001', allergen: 'Gluten', common_aliases: 'Wheat, Barley, Rye, Triticale, Spelt, Malt', severity: 'HIGH', dietary_flags: ['Celiac', 'Gluten-Free'], updated: '2026-04-01' },
	{ id: 2, code: 'A002', allergen: 'Tree Nuts', common_aliases: 'Almonds, Cashews, Walnuts, Pecans, Pistachios, Hazelnuts', severity: 'HIGH', dietary_flags: ['Nut Allergy', 'Clean Label'], updated: '2026-03-28' },
	{ id: 3, code: 'A003', allergen: 'Pork Derivatives', common_aliases: 'Gelatin (Pork), Lard, Pepsin, E471 (pork), Bacon Fat', severity: 'HIGH', dietary_flags: ['Halal', 'Kosher'], updated: '2026-03-27' },
	{ id: 4, code: 'A004', allergen: 'Milk / Dairy', common_aliases: 'Lactose, Whey, Casein, Milk Solids, Butterfat', severity: 'MEDIUM', dietary_flags: ['Vegan', 'Lactose-Free'], updated: '2026-03-25' },
	{ id: 5, code: 'A005', allergen: 'Soy', common_aliases: 'Soybean, Soy Lecithin, Tofu, Edamame, Soy Protein Isolate', severity: 'MEDIUM', dietary_flags: ['Vegan', 'Clean Label'], updated: '2026-03-22' },
	{ id: 6, code: 'A006', allergen: 'Shellfish', common_aliases: 'Shrimp, Crab, Lobster, Prawn, Crayfish, Krill', severity: 'HIGH', dietary_flags: ['Halal', 'Kosher'], updated: '2026-03-20' },
	{ id: 7, code: 'A007', allergen: 'Artificial Sweeteners', common_aliases: 'Aspartame, Sucralose, Saccharin, Acesulfame-K, E951', severity: 'LOW', dietary_flags: ['Clean Label'], updated: '2026-03-18' },
])

// ─── Halal Logo Library mock data (card grid) ────────────────────────────────
const halalLogos = ref<CertifierCard[]>([
	{ id: 1, certifier: 'JAKIM',        full_name: 'Jabatan Kemajuan Islam Malaysia',              region: 'Malaysia',      cert_code: 'MS1500:2019',  status: 'Active',       logo_src: '/reference-logos/jakim.svg' },
	{ id: 2, certifier: 'MUI',          full_name: 'Majelis Ulama Indonesia',                      region: 'Indonesia',     cert_code: 'HAS-23000',    status: 'Active',       logo_src: '/reference-logos/mui.svg' },
	{ id: 3, certifier: 'ESMA',         full_name: 'Emirates Authority for Standardization',       region: 'UAE',           cert_code: 'UAE.S 2055-1', status: 'Under Review', logo_src: '/reference-logos/esma.svg' },
	{ id: 4, certifier: 'HMC UK',       full_name: 'Halal Monitoring Committee',                   region: 'United Kingdom', cert_code: 'HMC-2024',    status: 'Active',       logo_src: '/reference-logos/hmc.svg' },
	{ id: 5, certifier: 'IFANCA USA',   full_name: 'Islamic Food and Nutrition Council of America', region: 'United States', cert_code: 'MACC-2023',   status: 'Active',       logo_src: '/reference-logos/ifanca.svg' },
	{ id: 6, certifier: 'SANHA',        full_name: 'South African National Halaal Authority',      region: 'South Africa',  cert_code: 'SANHA-1998',   status: 'Expired',      logo_src: '/reference-logos/sanha.svg' },
	{ id: 7, certifier: 'GreenA',       full_name: 'GreenA Halal Certification',                   region: 'Turkey',        cert_code: 'GIMDES-TR',    status: 'Under Review', logo_src: '/reference-logos/greena.svg' },
])

// ─── Ingredient Mappings mock data ───────────────────────────────────────────
const ingredientMappings = ref<IngredientMapping[]>([
	{ id: 1, code: 'IM01', name: 'Gelatin',                          mapped_category: 'Animal-derived gelling agent', dietary_impact: 'Source-dependent — porcine gelatin is non-permissible; bovine requires certification', confidence: 68, halal_status: 'SYUBHAH' },
	{ id: 2, code: 'IM02', name: 'Carmine',            e_number: 'E120', mapped_category: 'Natural red colourant (insect-derived)', dietary_impact: 'Derived from cochineal insects — not vegan; scholarly dispute on permissibility', confidence: 74, halal_status: 'SYUBHAH' },
	{ id: 3, code: 'IM03', name: 'Whey Protein',                     mapped_category: 'Dairy protein', dietary_impact: 'Contains milk; rennet source affects permissibility', confidence: 82, halal_status: 'SYUBHAH' },
	{ id: 4, code: 'IM04', name: 'Lecithin',           e_number: 'E322', mapped_category: 'Emulsifier', dietary_impact: 'Soy or egg-derived lecithin is permissible; verify non-animal source', confidence: 91, halal_status: 'HALAL' },
	{ id: 5, code: 'IM05', name: 'Natural Flavour',                  mapped_category: 'Flavouring compound', dietary_impact: 'Ambiguous — may contain alcohol carriers or animal extracts', confidence: 59, halal_status: 'SYUBHAH' },
	{ id: 6, code: 'IM06', name: 'Mono- and Diglycerides', e_number: 'E471', mapped_category: 'Emulsifier (fatty acids)', dietary_impact: 'Fat source may be plant or animal; animal source needs certification', confidence: 63, halal_status: 'SYUBHAH' },
	{ id: 7, code: 'IM07', name: 'Shellac',            e_number: 'E904', mapped_category: 'Glazing agent (insect resin)', dietary_impact: 'Secreted by lac insects — generally impermissible as a consumable coating', confidence: 71, halal_status: 'HARAM' },
])

// ─── Tab title ───────────────────────────────────────────────────────────────
const getTabTitle = computed(() => {
	if (activeTab.value === 'halal') return 'Maintain halal certifier library'
	if (activeTab.value === 'ingredient') return 'Refine ingredient mappings'
	return 'Update allergen entries & severity'
})

// ─── Filtering ────────────────────────────────────────────────────────────────
const filteredAllergens = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return allergens.value
	return allergens.value.filter(
		(item) => item.code.toLowerCase().includes(q) || item.allergen.toLowerCase().includes(q) || item.common_aliases.toLowerCase().includes(q)
	)
})

const filteredHalalLogos = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return halalLogos.value
	return halalLogos.value.filter(
		(item) => item.certifier.toLowerCase().includes(q) || item.full_name.toLowerCase().includes(q) || item.region.toLowerCase().includes(q) || item.cert_code.toLowerCase().includes(q)
	)
})

const filteredIngredients = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return ingredientMappings.value
	return ingredientMappings.value.filter(
		(item) => item.name.toLowerCase().includes(q) || (item.e_number && item.e_number.toLowerCase().includes(q)) || item.mapped_category.toLowerCase().includes(q)
	)
})

// ─── Badge class helpers ───────────────────────────────────────────────────────
function statusClass(status: string): string {
	if (status === 'Active') return 'status-active'
	if (status === 'Under Review') return 'status-review'
	return 'status-expired'
}

function halalClass(status: string): string {
	if (status === 'HALAL') return 'halal-ok'
	if (status === 'HARAM') return 'halal-no'
	return 'halal-doubt'
}

function confidenceClass(pct: number): string {
	if (pct >= 80) return 'conf-high'
	if (pct >= 65) return 'conf-mid'
	return 'conf-low'
}

// ─── API fetch (with graceful fallback to mock data) ─────────────────────────
async function fetchTabContent(tab: TabType): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		if (tab === 'halal') {
			try {
				const data = await apiFetch<any>('/api/halal_logo?take=100&skip=0', { isAdmin: true })
				const rawList = Array.isArray(data) ? data : data.halalLogo || data.data || []
				if (rawList.length) {
					// Merge server records with the design metadata (region / cert code / status)
					// keyed by certifier acronym. Falls back to mock cards for anything unmatched.
					const byCertifier = new Map(halalLogos.value.map((c) => [c.certifier.toUpperCase(), c]))
					const merged: CertifierCard[] = rawList.map((row: any, idx: number) => {
						const key = (row.certifier || '').toUpperCase()
						const template = byCertifier.get(key)
						return {
							id: row.id ?? idx + 1,
							certifier: row.certifier ?? template?.certifier ?? 'Unknown',
							full_name: row.full_name ?? template?.full_name ?? '',
							region: template?.region ?? row.region ?? 'N/A',
							cert_code: template?.cert_code ?? row.cert_code ?? '—',
							status: template?.status ?? 'Active',
							logo_src: row.logo_src ?? template?.logo_src ?? null,
						}
					})
					if (merged.length) halalLogos.value = merged
				}
			} catch {
				console.warn('Halal logo route unavailable — using design mock cards.')
			}
		}
		// allergen and ingredient tabs use the rich mock data defined above.
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

function reviewCertifier(logo: CertifierCard): void {
	console.log('Review certifier:', logo.certifier)
}

function renewCertifier(logo: CertifierCard): void {
	console.log('Renew certifier:', logo.certifier)
}

function deleteItem(id: number): void {
	if (!confirm('Are you sure you want to delete this record?')) return
	if (activeTab.value === 'allergen') {
		allergens.value = allergens.value.filter((i) => i.id !== id)
	} else if (activeTab.value === 'halal') {
		halalLogos.value = halalLogos.value.filter((i) => i.id !== id)
	} else if (activeTab.value === 'ingredient') {
		ingredientMappings.value = ingredientMappings.value.filter((i) => i.id !== id)
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

.page-header { margin-bottom: 24px; }
h1 { font-size: 1.4rem; font-weight: 700; margin: 0 0 4px; color: #0f172a; }
.subtitle { color: #64748b; font-size: 0.88rem; margin: 0; }

.tabs-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.tab-button {
	display: inline-flex; align-items: center; gap: 8px;
	padding: 10px 18px; border-radius: 12px;
	border: 1px solid #e2e8f0; background: #fff; color: #334155;
	font-size: 0.88rem; font-weight: 600; cursor: pointer;
	transition: all 0.15s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
.tab-button:hover { background: #f1f5f9; color: #0f172a; }
.tab-button.active { background: #008744; color: #fff; border-color: #008744; }
.tab-icon { flex-shrink: 0; }

.content-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden; }

.controls-bar { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; gap: 12px; flex-wrap: wrap; }
.section-title { font-size: 0.92rem; color: #64748b; font-weight: 500; }
.action-controls { display: flex; align-items: center; gap: 12px; }
.search-box { display: flex; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 14px; width: 220px; }
.search-icon { color: #94a3b8; margin-right: 8px; flex-shrink: 0; }
.search-box input { border: none; outline: none; width: 100%; font-size: 0.88rem; color: #1e293b; background: transparent; }
.btn-add { display: inline-flex; align-items: center; gap: 6px; background: #008744; color: #fff; border: none; border-radius: 10px; padding: 9px 18px; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background-color 0.15s ease; }
.btn-add:hover { background: #00753a; }

/* ── Tables ─────────────────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; min-width: 900px; }
th { text-align: left; padding: 14px 24px; font-size: 0.73rem; font-weight: 700; color: #64748b; background: #fff; border-bottom: 1px solid #f1f5f9; letter-spacing: 0.05em; white-space: nowrap; }
td { padding: 18px 24px; border-bottom: 1px solid #f8fafc; font-size: 0.88rem; vertical-align: middle; }
.cell-id { color: #94a3b8; font-weight: 600; font-size: 0.82rem; }
.cell-allergen { font-weight: 600; color: #0f172a; }
.cell-aliases { color: #64748b; max-width: 240px; line-height: 1.35; }
.cell-impact { color: #475569; max-width: 280px; line-height: 1.4; font-size: 0.82rem; }
.cell-updated { color: #94a3b8; font-size: 0.82rem; }

.severity-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em; }
.severity-badge.high { background-color: #ffe4e6; color: #e11d48; }
.severity-badge.medium { background-color: #fef9c3; color: #ca8a04; }
.severity-badge.low { background-color: #e0f2fe; color: #0284c7; }

.flags-wrapper { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 4px; }
.flag-chip { display: inline-block; background: #f1f5f9; color: #475569; border-radius: 6px; padding: 3px 8px; font-size: 0.75rem; font-weight: 500; }

.actions-row { display: flex; align-items: center; gap: 8px; }
.btn-edit { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; color: #1e293b; border-radius: 20px; padding: 6px 14px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: background-color 0.15s ease; white-space: nowrap; }
.btn-edit:hover { background: #f8fafc; }
.btn-delete { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #fff; border: 1px solid #fecaca; color: #ef4444; border-radius: 50%; cursor: pointer; transition: background-color 0.15s ease; }
.btn-delete:hover { background: #fef2f2; }

/* ── Ingredient specifics ───────────────────────────────────────────────── */
.ingredient-name-cell { display: flex; flex-direction: column; gap: 3px; }
.ingredient-enumber { display: inline-block; width: fit-content; background: #eef2ff; color: #4338ca; border-radius: 5px; padding: 1px 7px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.03em; }

.confidence-cell { display: flex; align-items: center; gap: 8px; min-width: 120px; }
.confidence-bar { flex: 1; height: 6px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
.confidence-fill { height: 100%; border-radius: 4px; }
.confidence-fill.conf-high { background: #16a34a; }
.confidence-fill.conf-mid { background: #ca8a04; }
.confidence-fill.conf-low { background: #dc2626; }
.confidence-pct { font-size: 0.76rem; font-weight: 600; color: #475569; min-width: 30px; }

.halal-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; }
.halal-badge.halal-ok { background: #dcfce7; color: #15803d; }
.halal-badge.halal-no { background: #fee2e2; color: #b91c1c; }
.halal-badge.halal-doubt { background: #fef3c7; color: #b45309; }

/* ── Halal Certifier Card Grid ──────────────────────────────────────────── */
.certifier-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 16px;
	padding: 8px 24px 24px;
}
.certifier-card {
	border: 1px solid #e2e8f0;
	border-radius: 14px;
	background: #fff;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.certifier-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-color: #cbd5e1; }

.certifier-card-top {
	display: flex; align-items: flex-start; justify-content: space-between;
	padding: 16px 16px 0;
}
.certifier-logo {
	width: 56px; height: 56px; border-radius: 12px;
	background: #f8fafc; border: 1px solid #e2e8f0;
	display: flex; align-items: center; justify-content: center; overflow: hidden;
	flex-shrink: 0;
}
.certifier-logo-img { width: 100%; height: 100%; object-fit: contain; }
.certifier-logo-fallback { font-size: 1.8rem; }

.status-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }
.status-badge.status-active { background: #dcfce7; color: #15803d; }
.status-badge.status-review { background: #fef9c3; color: #a16207; }
.status-badge.status-expired { background: #fee2e2; color: #b91c1c; }

.certifier-body { padding: 14px 16px 8px; flex: 1; }
.certifier-name { font-size: 1rem; font-weight: 700; margin: 0 0 2px; color: #0f172a; }
.certifier-fullname { font-size: 0.78rem; color: #64748b; margin: 0 0 12px; line-height: 1.35; }
.certifier-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.meta-region { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; color: #475569; font-weight: 500; }
.meta-code { font-size: 0.72rem; font-weight: 700; color: #4338ca; background: #eef2ff; border-radius: 5px; padding: 2px 8px; letter-spacing: 0.02em; }

.certifier-actions { display: flex; gap: 6px; padding: 12px 16px 16px; border-top: 1px solid #f1f5f9; margin-top: 8px; }
.cert-btn { flex: 1; border-radius: 8px; padding: 7px 0; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: background 0.12s, border-color 0.12s; }
.cert-btn-edit { background: #fff; border-color: #e2e8f0; color: #334155; }
.cert-btn-edit:hover { background: #f8fafc; }
.cert-btn-review { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
.cert-btn-review:hover { background: #dbeafe; }
.cert-btn-renew { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
.cert-btn-renew:hover { background: #dcfce7; }

/* ── Footer / states ────────────────────────────────────────────────────── */
.card-footer-notice { padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 0.82rem; color: #94a3b8; }
.state-message, .empty-note { padding: 32px; text-align: center; color: #64748b; font-size: 0.9rem; }
.error-message { padding: 32px; text-align: center; color: #dc2626; font-size: 0.9rem; }
</style>
