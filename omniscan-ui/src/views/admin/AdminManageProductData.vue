<template>
	<div class="manage-product-data">
		<header class="page-header">
			<h1>Manage Product Data</h1>
			<p class="subtitle">Allergen dictionary · Halal certifier library · Ingredient mappings — all synced to the OmniScan knowledge base</p>
		</header>

		<!-- Tabs -->
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
					<button class="btn-add" @click="openCreateModal">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<line x1="12" y1="5" x2="12" y2="19"></line>
							<line x1="5" y1="12" x2="19" y2="12"></line>
						</svg>
						Add New
					</button>
				</div>
			</div>

			<p v-if="isLoading" class="state-message">Loading data…</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>

			<!-- 1. ALLERGEN DICTIONARY -->
			<template v-else-if="activeTab === 'allergen'">
				<p v-if="filteredAllergens.length === 0" class="empty-note">No allergen records found.</p>
				<div v-else class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th class="col-id">ID</th>
								<th>ALLERGEN</th>
								<th>SCIENTIFIC NAME</th>
								<th>MAPPINGS</th>
								<th>SOURCE</th>
								<th>UPDATED</th>
								<th class="col-actions">ACTIONS</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="item in filteredAllergens" :key="item.id">
								<td class="cell-id">#{{ item.id }}</td>
								<td class="cell-allergen">{{ item.name }}</td>
								<td class="cell-aliases">{{ item.scientific_name || '—' }}</td>
								<td><span class="count-chip">{{ item.mapping_count }}</span></td>
								<td>
									<span class="source-badge" :class="item.is_predefined ? 'src-seed' : 'src-custom'">
										{{ item.is_predefined ? 'Predefined' : 'Custom' }}
									</span>
								</td>
								<td class="cell-updated">{{ formatDate(item.updated_at) }}</td>
								<td class="col-actions">
									<div class="actions-row">
										<button class="btn-edit" @click="openEditModal(item)">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<path d="M12 20h9"></path>
												<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
											</svg>
											Edit
										</button>
										<button class="btn-delete" @click="removeItem(item.id)" aria-label="Delete">
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

			<!-- 2. HALAL LOGO LIBRARY (card grid) -->
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
							<span class="status-badge" :class="logo.is_accredited ? 'status-active' : 'status-review'">
								{{ logo.is_accredited ? 'Accredited' : 'Recognized' }}
							</span>
						</div>
						<div class="certifier-body">
							<h3 class="certifier-name">{{ logo.certifier }}</h3>
							<p class="certifier-fullname">{{ logo.full_name }}</p>
							<a v-if="logo.source_url" :href="logo.source_url" target="_blank" rel="noopener" class="certifier-source">
								<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
									<polyline points="15 3 21 3 21 9"></polyline>
									<line x1="10" y1="14" x2="21" y2="3"></line>
								</svg>
								Official source
							</a>
						</div>
						<div class="certifier-actions">
							<button class="cert-btn cert-btn-edit" @click="openEditModal(logo)">Edit</button>
							<button class="cert-btn cert-btn-review" @click="toggleAccredited(logo)">
								{{ logo.is_accredited ? 'Unaccredit' : 'Accredit' }}
							</button>
							<button class="cert-btn cert-btn-delete" @click="removeItem(logo.id)">Delete</button>
						</div>
					</div>
				</div>
			</template>

			<!-- 3. INGREDIENT MAPPINGS -->
			<template v-else-if="activeTab === 'ingredient'">
				<p v-if="filteredIngredients.length === 0" class="empty-note">No ingredient mapping records found.</p>
				<div v-else class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th class="col-id">ID</th>
								<th>SCIENTIFIC TERM</th>
								<th>SIMPLIFIED TERM</th>
								<th>MAPPED ALLERGEN</th>
								<th>UPDATED</th>
								<th class="col-actions">ACTIONS</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="ing in filteredIngredients" :key="ing.id">
								<td class="cell-id">#{{ ing.id }}</td>
								<td class="cell-allergen">{{ ing.scientific_term }}</td>
								<td class="cell-aliases">{{ ing.simplified_term }}</td>
								<td><span class="allergen-chip">{{ ing.allergen_name }}</span></td>
								<td class="cell-updated">{{ formatDate(ing.updated_at) }}</td>
								<td class="col-actions">
									<div class="actions-row">
										<button class="btn-edit" @click="openEditModal(ing)">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<path d="M12 20h9"></path>
												<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
											</svg>
											Edit
										</button>
										<button class="btn-delete" @click="removeItem(ing.id)" aria-label="Delete">
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
				All changes are persisted to the OmniScan knowledge base and reflected across the Verification Panel and scan pipeline.
			</div>
		</div>

		<!-- ══════════════════ CREATE / EDIT MODAL ══════════════════ -->
		<Teleport to="body">
			<div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
				<div class="modal" role="dialog" aria-modal="true">
					<div class="modal-header">
						<h2 class="modal-title">{{ modalMode === 'create' ? 'Add' : 'Edit' }} {{ tabSingular }}</h2>
						<button class="modal-close" @click="closeModal" aria-label="Close">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>

					<div class="modal-body">
						<!-- Allergen form -->
						<template v-if="activeTab === 'allergen'">
							<label class="field">
								<span class="field-label">Allergen name *</span>
								<input v-model="form.name" type="text" class="field-input" placeholder="e.g. Gluten" />
							</label>
							<label class="field">
								<span class="field-label">Scientific name</span>
								<input v-model="form.scientific_name" type="text" class="field-input" placeholder="e.g. Triticum aestivum" />
							</label>

							<!-- Mappings / Aliases tag editor -->
							<div class="field">
								<span class="field-label">Mappings / Aliases ({{ aliasTags.length }})</span>
								<div class="tag-input" @click="($refs.aliasField as HTMLInputElement)?.focus()">
									<span v-for="(tag, idx) in aliasTags" :key="idx" class="tag-chip">
										{{ tag }}
										<button type="button" class="tag-remove" aria-label="Remove alias" @click.stop="removeAliasTag(idx)">
											<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
												<line x1="18" y1="6" x2="6" y2="18"></line>
												<line x1="6" y1="6" x2="18" y2="18"></line>
											</svg>
										</button>
									</span>
									<input
										ref="aliasField"
										v-model="aliasInput"
										class="tag-field"
										:placeholder="aliasTags.length ? 'Add alias…' : 'e.g. wheat, barley, rye'"
										@keydown="onAliasKeydown"
										@blur="addAliasTag"
									/>
								</div>
								<span class="field-hint">Press Enter or comma to add. These become ingredient mappings linked to this allergen.</span>
							</div>

							<label class="field-check">
								<input v-model="form.is_predefined" type="checkbox" />
								<span>Predefined (core seed allergen)</span>
							</label>
						</template>

						<!-- Halal certifier form -->
						<template v-else-if="activeTab === 'halal'">
							<label class="field">
								<span class="field-label">Certifier code *</span>
								<input v-model="form.certifier" type="text" class="field-input" placeholder="e.g. JAKIM" />
							</label>
							<label class="field">
								<span class="field-label">Full name</span>
								<input v-model="form.full_name" type="text" class="field-input" placeholder="e.g. Jabatan Kemajuan Islam Malaysia" />
							</label>
							<label class="field">
								<span class="field-label">Logo image path</span>
								<input v-model="form.image_path" type="text" class="field-input" placeholder="e.g. reference-logos/jakim.svg" />
							</label>
							<label class="field">
								<span class="field-label">Official source URL</span>
								<input v-model="form.source_url" type="text" class="field-input" placeholder="https://…" />
							</label>
							<label class="field-check">
								<input v-model="form.is_accredited" type="checkbox" />
								<span>Accredited certifying body</span>
							</label>
						</template>

						<!-- Ingredient mapping form -->
						<template v-else-if="activeTab === 'ingredient'">
							<label class="field">
								<span class="field-label">Scientific term *</span>
								<input v-model="form.scientific_term" type="text" class="field-input" placeholder="e.g. casein" />
							</label>
							<label class="field">
								<span class="field-label">Simplified term</span>
								<input v-model="form.simplified_term" type="text" class="field-input" placeholder="e.g. milk protein" />
							</label>
							<label class="field">
								<span class="field-label">Mapped allergen *</span>
								<select v-model.number="form.allergen_id" class="field-input">
									<option :value="undefined" disabled>Select an allergen…</option>
									<option v-for="a in allergens" :key="a.id" :value="a.id">{{ a.name }}</option>
								</select>
							</label>
						</template>

						<p v-if="modalError" class="modal-error">{{ modalError }}</p>
					</div>

					<div class="modal-footer">
						<button class="btn-modal-cancel" :disabled="saving" @click="closeModal">Cancel</button>
						<button class="btn-modal-save" :disabled="saving" @click="saveModal">
							{{ saving ? 'Saving…' : (modalMode === 'create' ? 'Create' : 'Save Changes') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

type TabType = 'allergen' | 'halal' | 'ingredient'

interface AllergenMapping {
	id: number
	scientific_term: string
	simplified_term: string
}

interface AllergenRow {
	id: number
	name: string
	scientific_name: string
	is_predefined: boolean
	mapping_count: number
	updated_at: string
	mappings?: AllergenMapping[]
	aliases?: string[]
}

interface CertifierRow {
	id: number
	certifier: string
	full_name: string
	image_path: string
	source_url: string
	is_accredited: boolean
	logo_src: string | null
}

interface MappingRow {
	id: number
	scientific_term: string
	simplified_term: string
	allergen_id: number
	allergen_name: string
	updated_at: string
}

const activeTab = ref<TabType>('allergen')
const searchQuery = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const allergens = ref<AllergenRow[]>([])
const halalLogos = ref<CertifierRow[]>([])
const ingredientMappings = ref<MappingRow[]>([])

// ─── Modal state ──────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const modalError = ref<string | null>(null)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = ref<Record<string, any>>({})

// Alias/mapping editor state (Allergen modal only)
const aliasTags = ref<string[]>([])
const aliasInput = ref('')
// Snapshot of the aliases as loaded, so we only PUT the mapping sync when changed.
const aliasOriginal = ref<string[]>([])

function addAliasTag(): void {
	const raw = aliasInput.value.trim().replace(/,+$/, '').trim()
	if (!raw) return
	// Support pasting a comma-separated batch.
	const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
	for (const p of parts) {
		if (!aliasTags.value.some((t) => t.toLowerCase() === p.toLowerCase())) {
			aliasTags.value.push(p)
		}
	}
	aliasInput.value = ''
}

function removeAliasTag(index: number): void {
	aliasTags.value.splice(index, 1)
}

function onAliasKeydown(e: KeyboardEvent): void {
	if (e.key === 'Enter' || e.key === ',') {
		e.preventDefault()
		addAliasTag()
	} else if (e.key === 'Backspace' && aliasInput.value === '' && aliasTags.value.length) {
		aliasTags.value.pop()
	}
}

function aliasesChanged(): boolean {
	if (aliasTags.value.length !== aliasOriginal.value.length) return true
	const a = [...aliasTags.value].map((s) => s.toLowerCase()).sort()
	const b = [...aliasOriginal.value].map((s) => s.toLowerCase()).sort()
	return a.some((v, i) => v !== b[i])
}

const getTabTitle = computed(() => {
	if (activeTab.value === 'halal') return 'Maintain halal certifier library'
	if (activeTab.value === 'ingredient') return 'Refine ingredient → allergen mappings'
	return 'Update allergen dictionary'
})

const tabSingular = computed(() => {
	if (activeTab.value === 'halal') return 'Certifier'
	if (activeTab.value === 'ingredient') return 'Ingredient Mapping'
	return 'Allergen'
})

// ─── Filtering ──────────────────────────────────────────────────────────────
const filteredAllergens = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return allergens.value
	return allergens.value.filter((a) => a.name.toLowerCase().includes(q) || a.scientific_name.toLowerCase().includes(q))
})

const filteredHalalLogos = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return halalLogos.value
	return halalLogos.value.filter((c) => c.certifier.toLowerCase().includes(q) || c.full_name.toLowerCase().includes(q))
})

const filteredIngredients = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return ingredientMappings.value
	return ingredientMappings.value.filter(
		(m) => m.scientific_term.toLowerCase().includes(q) || m.simplified_term.toLowerCase().includes(q) || m.allergen_name.toLowerCase().includes(q)
	)
})

function formatDate(iso?: string): string {
	if (!iso) return '—'
	const d = new Date(iso)
	return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-CA')
}

// ─── Fetching ─────────────────────────────────────────────────────────────────
async function fetchAllergens(): Promise<void> {
	const data = await apiFetch<AllergenRow[]>('/api/allergen', { isAdmin: true })
	allergens.value = Array.isArray(data) ? data : []
}

async function fetchHalalLogos(): Promise<void> {
	const data = await apiFetch<{ halalLogo: CertifierRow[] }>('/api/halal_logo?take=100&skip=0', { isAdmin: true })
	halalLogos.value = data.halalLogo ?? []
}

async function fetchMappings(): Promise<void> {
	const data = await apiFetch<{ ingredient_mappings: MappingRow[] }>('/api/ingredient_mapping', { isAdmin: true })
	ingredientMappings.value = data.ingredient_mappings ?? []
}

async function fetchTabContent(tab: TabType): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		if (tab === 'allergen') {
			await fetchAllergens()
		} else if (tab === 'halal') {
			await fetchHalalLogos()
		} else if (tab === 'ingredient') {
			// The ingredient form needs the allergen list for its dropdown.
			await Promise.all([fetchMappings(), allergens.value.length ? Promise.resolve() : fetchAllergens()])
		}
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to fetch records from the knowledge base.'
	} finally {
		isLoading.value = false
	}
}

function switchTab(tab: TabType): void {
	activeTab.value = tab
	searchQuery.value = ''
	fetchTabContent(tab)
}

// ─── Modal open/close ─────────────────────────────────────────────────────────
function openCreateModal(): void {
	modalMode.value = 'create'
	editingId.value = null
	modalError.value = null
	if (activeTab.value === 'allergen') {
		form.value = { name: '', scientific_name: '', is_predefined: false }
		aliasTags.value = []
		aliasOriginal.value = []
		aliasInput.value = ''
	} else if (activeTab.value === 'halal') {
		form.value = { certifier: '', full_name: '', image_path: '', source_url: '', is_accredited: false }
	} else {
		form.value = { scientific_term: '', simplified_term: '', allergen_id: undefined }
	}
	modalOpen.value = true
}

function openEditModal(item: any): void {
	modalMode.value = 'edit'
	editingId.value = item.id
	modalError.value = null
	if (activeTab.value === 'allergen') {
		form.value = { name: item.name, scientific_name: item.scientific_name, is_predefined: item.is_predefined }
		const loaded: string[] = Array.isArray(item.aliases)
			? item.aliases
			: Array.isArray(item.mappings)
				? item.mappings.map((m: AllergenMapping) => m.scientific_term)
				: []
		aliasTags.value = [...loaded]
		aliasOriginal.value = [...loaded]
		aliasInput.value = ''
	} else if (activeTab.value === 'halal') {
		form.value = { certifier: item.certifier, full_name: item.full_name, image_path: item.image_path, source_url: item.source_url, is_accredited: item.is_accredited }
	} else {
		form.value = { scientific_term: item.scientific_term, simplified_term: item.simplified_term, allergen_id: item.allergen_id }
	}
	modalOpen.value = true
}

function closeModal(): void {
	if (saving.value) return
	modalOpen.value = false
	modalError.value = null
}

// ─── Save (create or edit) ─────────────────────────────────────────────────────
async function saveModal(): Promise<void> {
	saving.value = true
	modalError.value = null
	try {
		const endpointMap: Record<TabType, string> = {
			allergen: '/api/allergen',
			halal: '/api/halal_logo',
			ingredient: '/api/ingredient_mapping',
		}
		const endpoint = endpointMap[activeTab.value]
		const payload: Record<string, any> = { ...form.value }
		if (modalMode.value === 'edit' && editingId.value != null) payload.id = editingId.value

		// 1. Save the core record (create or update). Capture the id for new allergens
		//    so we can attach aliases to it immediately after.
		const saved = await apiFetch<any>(endpoint, {
			method: modalMode.value === 'create' ? 'POST' : 'PUT',
			body: payload,
			isAdmin: true,
		})

		// 2. For allergens, reconcile the linked alias/mapping list if it changed
		//    (or always on create when tags were provided).
		if (activeTab.value === 'allergen') {
			const targetId =
				modalMode.value === 'edit'
					? editingId.value
					: (saved?.allergen?.id ?? saved?.id ?? null)

			if (targetId != null && (modalMode.value === 'create' ? aliasTags.value.length > 0 : aliasesChanged())) {
				const res = await apiFetch<{ skipped?: string[] }>('/api/allergen/mappings', {
					method: 'PUT',
					body: { allergen_id: targetId, aliases: aliasTags.value },
					isAdmin: true,
				})
				if (res?.skipped && res.skipped.length) {
					modalError.value = `Saved. These aliases are already mapped to another allergen and were skipped: ${res.skipped.join(', ')}`
					await fetchTabContent(activeTab.value)
					saving.value = false
					return
				}
			}
		}

		modalOpen.value = false
		await fetchTabContent(activeTab.value)
	} catch (err) {
		modalError.value = err instanceof ApiError ? err.message : 'Failed to save. Please try again.'
	} finally {
		saving.value = false
	}
}

// ─── Delete ─────────────────────────────────────────────────────────────────
async function removeItem(id: number): Promise<void> {
	if (!confirm('Delete this record from the knowledge base? This cannot be undone.')) return
	const endpointMap: Record<TabType, string> = {
		allergen: '/api/allergen',
		halal: '/api/halal_logo',
		ingredient: '/api/ingredient_mapping',
	}
	try {
		await apiFetch(`${endpointMap[activeTab.value]}?id=${id}`, { method: 'DELETE', isAdmin: true })
		await fetchTabContent(activeTab.value)
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to delete record.'
	}
}

// ─── Quick accredited toggle on certifier cards ────────────────────────────────
async function toggleAccredited(logo: CertifierRow): Promise<void> {
	try {
		await apiFetch('/api/halal_logo', {
			method: 'PUT',
			body: { id: logo.id, is_accredited: !logo.is_accredited },
			isAdmin: true,
		})
		await fetchHalalLogos()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to update certifier.'
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
.tab-button { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; color: #334155; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
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

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; min-width: 820px; }
th { text-align: left; padding: 14px 24px; font-size: 0.73rem; font-weight: 700; color: #64748b; background: #fff; border-bottom: 1px solid #f1f5f9; letter-spacing: 0.05em; white-space: nowrap; }
td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; font-size: 0.88rem; vertical-align: middle; }
.cell-id { color: #94a3b8; font-weight: 600; font-size: 0.82rem; }
.cell-allergen { font-weight: 600; color: #0f172a; }
.cell-aliases { color: #64748b; max-width: 260px; line-height: 1.35; }
.cell-updated { color: #94a3b8; font-size: 0.82rem; }

.count-chip { display: inline-block; min-width: 24px; text-align: center; background: #eef2ff; color: #4338ca; border-radius: 20px; padding: 2px 10px; font-size: 0.78rem; font-weight: 700; }
.allergen-chip { display: inline-block; background: #f0fdf4; color: #15803d; border-radius: 20px; padding: 3px 12px; font-size: 0.78rem; font-weight: 600; }
.source-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
.source-badge.src-seed { background: #e0f2fe; color: #0284c7; }
.source-badge.src-custom { background: #f1f5f9; color: #64748b; }

.actions-row { display: flex; align-items: center; gap: 8px; }
.btn-edit { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; color: #1e293b; border-radius: 20px; padding: 6px 14px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: background-color 0.15s ease; white-space: nowrap; }
.btn-edit:hover { background: #f8fafc; }
.btn-delete { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #fff; border: 1px solid #fecaca; color: #ef4444; border-radius: 50%; cursor: pointer; transition: background-color 0.15s ease; }
.btn-delete:hover { background: #fef2f2; }

/* Certifier grid */
.certifier-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 8px 24px 24px; }
.certifier-card { border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; display: flex; flex-direction: column; overflow: hidden; transition: box-shadow 0.15s ease, border-color 0.15s ease; }
.certifier-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-color: #cbd5e1; }
.certifier-card-top { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 16px 0; }
.certifier-logo { width: 56px; height: 56px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.certifier-logo-img { width: 100%; height: 100%; object-fit: contain; }
.certifier-logo-fallback { font-size: 1.8rem; }
.status-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }
.status-badge.status-active { background: #dcfce7; color: #15803d; }
.status-badge.status-review { background: #fef9c3; color: #a16207; }
.certifier-body { padding: 14px 16px 8px; flex: 1; }
.certifier-name { font-size: 1rem; font-weight: 700; margin: 0 0 2px; color: #0f172a; }
.certifier-fullname { font-size: 0.78rem; color: #64748b; margin: 0 0 10px; line-height: 1.35; }
.certifier-source { display: inline-flex; align-items: center; gap: 4px; font-size: 0.74rem; color: #2563eb; text-decoration: none; font-weight: 500; }
.certifier-source:hover { text-decoration: underline; }
.certifier-actions { display: flex; gap: 6px; padding: 12px 16px 16px; border-top: 1px solid #f1f5f9; margin-top: 8px; }
.cert-btn { flex: 1; border-radius: 8px; padding: 7px 0; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: background 0.12s, border-color 0.12s; }
.cert-btn-edit { background: #fff; border-color: #e2e8f0; color: #334155; }
.cert-btn-edit:hover { background: #f8fafc; }
.cert-btn-review { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
.cert-btn-review:hover { background: #dcfce7; }
.cert-btn-delete { background: #fff; border-color: #fecaca; color: #dc2626; }
.cert-btn-delete:hover { background: #fef2f2; }

.card-footer-notice { padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 0.82rem; color: #94a3b8; }
.state-message, .empty-note { padding: 32px; text-align: center; color: #64748b; font-size: 0.9rem; }
.error-message { padding: 32px; text-align: center; color: #dc2626; font-size: 0.9rem; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
.modal { background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.18); width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9; }
.modal-title { font-size: 1.05rem; font-weight: 700; margin: 0; color: #0f172a; }
.modal-close { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; transition: color 0.12s, background 0.12s; }
.modal-close:hover { color: #334155; background: #f1f5f9; }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 0.8rem; font-weight: 600; color: #475569; }
.field-input { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; font-size: 0.88rem; color: #1e293b; outline: none; font-family: inherit; transition: border-color 0.12s; background: #fff; }
.field-input:focus { border-color: #008744; }
.field-check { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #334155; cursor: pointer; }
.field-hint { font-size: 0.72rem; color: #94a3b8; margin-top: 2px; }
.tag-input { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; min-height: 42px; cursor: text; background: #fff; transition: border-color 0.12s; }
.tag-input:focus-within { border-color: #008744; }
.tag-chip { display: inline-flex; align-items: center; gap: 5px; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 20px; padding: 3px 6px 3px 10px; font-size: 0.78rem; font-weight: 500; }
.tag-remove { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border: none; background: rgba(21,128,61,0.12); color: #15803d; border-radius: 50%; cursor: pointer; padding: 0; transition: background 0.12s; }
.tag-remove:hover { background: rgba(21,128,61,0.28); }
.tag-field { flex: 1; min-width: 120px; border: none; outline: none; font-size: 0.85rem; color: #1e293b; background: transparent; padding: 2px 0; font-family: inherit; }
.modal-error { margin: 0; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.82rem; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1px solid #f1f5f9; }
.btn-modal-cancel { background: transparent; border: 1px solid #e2e8f0; color: #64748b; padding: 8px 18px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; transition: background 0.12s; }
.btn-modal-cancel:hover:not(:disabled) { background: #f8fafc; }
.btn-modal-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-modal-save { background: #008744; color: #fff; border: none; padding: 8px 20px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: background 0.12s; }
.btn-modal-save:hover:not(:disabled) { background: #00753a; }
.btn-modal-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
