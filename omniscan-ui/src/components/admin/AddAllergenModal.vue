<template>
	<Teleport to="body">
		<div v-if="open" class="aa-overlay" @click.self="requestClose">
			<div class="aa-modal" role="dialog" aria-modal="true" aria-labelledby="aa-title">

				<!-- Header -->
				<div class="aa-header">
					<h2 id="aa-title" class="aa-title">Add Allergen</h2>
					<button class="aa-close" @click="requestClose" aria-label="Close">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<!-- Body -->
				<div class="aa-body">

					<!-- ── Allergen name + autocomplete ── -->
					<div class="aa-field">
						<label class="aa-label" for="aa-name-input">Allergen name <span class="aa-required">*</span></label>
						<div class="aa-autocomplete-wrap" ref="autocompleteWrap">
							<input
								id="aa-name-input"
								ref="nameInputEl"
								v-model="nameInput"
								type="text"
								class="aa-input"
								:class="{
									'aa-input--error': !!duplicateRecord,
									'aa-input--focused': dropdownOpen,
								}"
								placeholder="e.g. Wheat"
								autocomplete="off"
								@input="onNameInput"
								@focus="onNameFocus"
								@keydown.down.prevent="moveSuggestion(1)"
								@keydown.up.prevent="moveSuggestion(-1)"
								@keydown.enter.prevent="confirmSuggestion"
								@keydown.escape="closeDropdown"
							/>

							<!-- Autocomplete dropdown -->
							<div v-if="dropdownOpen && suggestions.length > 0" class="aa-dropdown">
								<div
									v-for="(s, idx) in suggestions"
									:key="s.isCustom ? '__custom__' : s.name"
									class="aa-suggestion"
									:class="{ 'aa-suggestion--active': idx === activeSuggestionIdx, 'aa-suggestion--custom': s.isCustom }"
									@mousedown.prevent="selectSuggestion(s)"
								>
									<template v-if="s.isCustom">
										<span class="aa-suggestion-custom">+ Add "{{ nameInput }}" as a new allergen</span>
									</template>
									<template v-else>
										<span class="aa-suggestion-name">{{ s.name }}</span>
										<span v-if="s.scientificName" class="aa-suggestion-sci">{{ s.scientificName }}</span>
									</template>
								</div>
								<p class="aa-dropdown-hint">Suggestions come from the allergen dataset. Pick one or keep typing to add your own.</p>
							</div>
						</div>

						<!-- Duplicate error + summary card -->
						<template v-if="duplicateRecord">
							<p class="aa-dup-error">{{ nameInput.trim() }} is already in the allergen dictionary.</p>
							<div class="aa-dup-card">
								<span class="aa-dup-id">#{{ duplicateRecord.id }}</span>
								<span class="aa-dup-name">{{ duplicateRecord.name }}</span>
								<span v-if="duplicateRecord.scientific_name" class="aa-dup-sci">{{ duplicateRecord.scientific_name }}</span>
								<span v-if="duplicateRecord.is_predefined" class="aa-dup-badge">Predefined</span>
								<span class="aa-dup-count">{{ duplicateRecord.mapping_count }} mappings</span>
							</div>
							<div class="aa-dup-actions">
								<button class="aa-btn-edit-existing" @click="editExisting">Edit existing allergen</button>
								<button class="aa-btn-different-name" @click="useDifferentName">Use a different name</button>
							</div>
						</template>
					</div>

					<!-- ── Scientific name ── -->
					<div v-if="!duplicateRecord" class="aa-field">
						<div class="aa-label-row">
							<label class="aa-label" for="aa-sci-input">Scientific name</label>
							<span v-if="scientificFromDataset" class="aa-dataset-badge">From dataset</span>
						</div>
						<input
							id="aa-sci-input"
							v-model="scientificName"
							type="text"
							class="aa-input"
							placeholder="e.g. Triticum aestivum"
							@input="scientificFromDataset = false"
						/>
						<p v-if="scientificFromDataset" class="aa-field-hint">Filled automatically. You can still edit it.</p>
					</div>

					<!-- ── Mappings / Aliases ── -->
					<div v-if="!duplicateRecord" class="aa-field">
						<label class="aa-label">Mappings / Aliases ({{ aliasTags.length }})</label>

						<!-- Solid chips + inline input -->
						<div class="aa-tag-input" @click="focusAliasInput">
							<span
								v-for="(tag, idx) in aliasTags"
								:key="idx"
								class="aa-chip aa-chip--solid"
							>
								{{ tag }}
								<button type="button" class="aa-chip-remove" aria-label="Remove alias" @click.stop="removeAliasTag(idx)">
									<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
										<line x1="18" y1="6" x2="6" y2="18"></line>
										<line x1="6" y1="6" x2="18" y2="18"></line>
									</svg>
								</button>
							</span>
							<input
								ref="aliasInputEl"
								v-model="aliasInput"
								class="aa-alias-field"
								:placeholder="aliasTags.length ? 'Add alias…' : 'e.g. wheat flour, semolina'"
								@keydown="onAliasKeydown"
								@blur="commitAliasInput"
							/>
						</div>
						<p class="aa-field-hint">Press Enter or comma to add.</p>
						<p v-if="aliasError" class="aa-alias-error">{{ aliasError }}</p>

						<!-- Dashed suggestion chips from dataset -->
						<div v-if="suggestedAliases.length > 0" class="aa-suggested-row">
							<span class="aa-suggested-label">Suggested from dataset:</span>
							<button
								v-for="alias in suggestedAliases"
								:key="alias"
								type="button"
								class="aa-chip aa-chip--dashed"
								@click="addSuggestedAlias(alias)"
							>+ {{ alias }}</button>
							<button type="button" class="aa-btn-add-all" @click="addAllSuggested">Add all</button>
						</div>
					</div>

					<!-- ── Predefined checkbox ── -->
					<label v-if="!duplicateRecord" class="aa-check-row">
						<input v-model="isPredefined" type="checkbox" class="aa-checkbox" />
						<span>Predefined (core seed allergen)</span>
					</label>

					<!-- ── API error ── -->
					<div v-if="saveError" class="aa-api-error">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						{{ saveError }}
					</div>
				</div>

				<!-- Footer -->
				<div class="aa-footer">
					<button class="aa-btn-cancel" :disabled="saving" @click="requestClose">Cancel</button>
					<button
						class="aa-btn-create"
						:disabled="saving || !!duplicateRecord || !nameInput.trim()"
						@click="save"
					>
						{{ saving ? 'Creating…' : 'Create' }}
					</button>
				</div>

				<!-- ── Confirmation overlay ── -->
				<transition name="aa-confirm-fade">
					<div v-if="confirmOpen" class="aa-confirm-backdrop">
						<div class="aa-confirm-card" role="alertdialog" aria-modal="true">
							<h3 class="aa-confirm-title">Add allergen "{{ nameInput.trim() }}"?</h3>
							<p class="aa-confirm-body">This will add it to the allergen dictionary and sync it to the OmniScan knowledge base immediately.</p>
							<div class="aa-confirm-actions">
								<button class="aa-confirm-cancel" :disabled="saving" @click="confirmOpen = false">Cancel</button>
								<button class="aa-confirm-ok" :disabled="saving" @click="executeCreate">
									{{ saving ? 'Creating…' : 'Confirm' }}
								</button>
							</div>
						</div>
					</div>
				</transition>

			</div>
		</div>
	</Teleport>

	<!-- ── Unsaved-changes guard ── -->
	<ConfirmDiscardModal
		:open="showDiscardConfirm"
		discard-label="Discard Changes"
		message="You have unsaved changes. If you close now, the allergen name and any mappings you've added will be lost."
		@keep="onKeepEditing"
		@discard="onDiscard"
	/>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'
import { searchAllergenDataset, type AllergenDatasetEntry } from '@/data/allergenDataset'
import ConfirmDiscardModal from '@/components/admin/ConfirmDiscardModal.vue'

// ─── Props / Emits ───────────────────────────────────────────────────────────
interface AllergenRow {
	id: number
	name: string
	scientific_name: string
	is_predefined: boolean
	mapping_count: number
	aliases?: string[]
	mappings?: Array<{ id: number; scientific_term: string; simplified_term: string }>
}

const props = defineProps<{
	open: boolean
	existingAllergens: AllergenRow[]
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'created', payload: { id: number; name: string }): void
	(e: 'edit-existing', id: number): void
}>()

// ─── State ───────────────────────────────────────────────────────────────────
// Name field
const nameInput           = ref('')
const nameInputEl         = ref<HTMLInputElement | null>(null)
const autocompleteWrap    = ref<HTMLElement | null>(null)

// Autocomplete
interface Suggestion extends AllergenDatasetEntry { isCustom?: false }
interface CustomSuggestion { name: string; scientificName: string; aliases: string[]; isCustom: true }
type AnyS = Suggestion | CustomSuggestion
const suggestions         = ref<AnyS[]>([])
const dropdownOpen        = ref(false)
const activeSuggestionIdx = ref(-1)
const selectedEntry       = ref<AllergenDatasetEntry | null>(null)

// Scientific name
const scientificName      = ref('')
const scientificFromDataset = ref(false)

// Alias chips
const aliasTags           = ref<string[]>([])
const aliasInput          = ref('')
const aliasInputEl        = ref<HTMLInputElement | null>(null)
const aliasError          = ref<string | null>(null)
const suggestedAliases    = ref<string[]>([])

// Predefined
const isPredefined        = ref(false)

// Duplicate detection
const duplicateRecord     = ref<AllergenRow | null>(null)

// Save
const saving              = ref(false)
const saveError           = ref<string | null>(null)
const confirmOpen         = ref(false)

// Unsaved-changes guard
const showDiscardConfirm  = ref(false)
const hasUnsavedData      = computed(() => nameInput.value.trim() !== '' || aliasTags.value.length > 0)

// ─── Lifecycle ───────────────────────────────────────────────────────────────
watch(() => props.open, (val) => {
	if (val) resetState()
})

function resetState(): void {
	nameInput.value           = ''
	scientificName.value      = ''
	scientificFromDataset.value = false
	aliasTags.value           = []
	aliasInput.value          = ''
	aliasError.value          = null
	suggestedAliases.value    = []
	isPredefined.value        = false
	duplicateRecord.value     = null
	suggestions.value         = []
	dropdownOpen.value        = false
	activeSuggestionIdx.value = -1
	selectedEntry.value       = null
	saveError.value           = null
	confirmOpen.value         = false
	nextTick(() => nameInputEl.value?.focus())
}

// ─── Duplicate detection ──────────────────────────────────────────────────────
watch(nameInput, (val) => {
	const trimmed = val.trim().toLowerCase()
	if (!trimmed) {
		duplicateRecord.value = null
		return
	}
	// Match exact name, OR existing name is typed name + 's', OR typed name is existing name + 's'.
	// This catches "Peanut" vs existing "Peanuts" (and vice-versa).
	duplicateRecord.value = props.existingAllergens.find((a) => {
		const existing = a.name.toLowerCase()
		return existing === trimmed
			|| existing === trimmed + 's'
			|| existing + 's' === trimmed
	}) ?? null
})

// ─── Autocomplete ─────────────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onNameInput(): void {
	selectedEntry.value = null
	scientificFromDataset.value = false
	if (searchTimer) clearTimeout(searchTimer)
	searchTimer = setTimeout(rebuildSuggestions, 120)
}

function onNameFocus(): void {
	if (nameInput.value.trim()) rebuildSuggestions()
}

function rebuildSuggestions(): void {
	const q = nameInput.value.trim()
	if (!q) { suggestions.value = []; dropdownOpen.value = false; return }

	const dataset = searchAllergenDataset(q, 7)
	const list: AnyS[] = [...dataset]
	list.push({ name: q, scientificName: '', aliases: [], isCustom: true })
	suggestions.value = list
	dropdownOpen.value = true
	activeSuggestionIdx.value = -1
}

function closeDropdown(): void {
	dropdownOpen.value = false
	activeSuggestionIdx.value = -1
}

function moveSuggestion(dir: 1 | -1): void {
	if (!dropdownOpen.value || suggestions.value.length === 0) return
	const max = suggestions.value.length - 1
	let next = activeSuggestionIdx.value + dir
	if (next < 0) next = max
	if (next > max) next = 0
	activeSuggestionIdx.value = next
}

function confirmSuggestion(): void {
	if (!dropdownOpen.value) return
	if (activeSuggestionIdx.value >= 0 && activeSuggestionIdx.value < suggestions.value.length) {
		selectSuggestion(suggestions.value[activeSuggestionIdx.value])
	} else {
		closeDropdown()
	}
}

function selectSuggestion(s: AnyS): void {
	closeDropdown()
	if (s.isCustom) return  // just keep the typed name, no auto-fill

	// Auto-fill from dataset
	nameInput.value           = s.name
	scientificName.value      = s.scientificName
	scientificFromDataset.value = !!s.scientificName
	selectedEntry.value       = s as AllergenDatasetEntry

	// Split aliases into solid (first 4) and dashed suggestions (rest).
	// Skip any that are already in aliasTags.
	const all = (s.aliases ?? []).filter(
		(a) => !aliasTags.value.some((t) => t.toLowerCase() === a.toLowerCase()),
	)
	const solid     = all.slice(0, 4)
	const suggested = all.slice(4)

	for (const a of solid) {
		if (!aliasTags.value.some((t) => t.toLowerCase() === a.toLowerCase())) {
			aliasTags.value.push(a)
		}
	}
	suggestedAliases.value = suggested
}

// ─── Alias chip management ────────────────────────────────────────────────────
const ALLERGEN_NAME_RE = /^[A-Za-z\s\-]+$/
const ALIAS_RE         = /^[A-Za-z\s\-]+$/

function focusAliasInput(): void {
	aliasInputEl.value?.focus()
}

function commitAliasInput(): void {
	const raw = aliasInput.value.trim().replace(/,+$/, '').trim()
	if (!raw) return
	aliasError.value = null
	const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
	for (const p of parts) {
		if (p.length > 50) {
			aliasError.value = `"${p}" exceeds the 50-character limit.`
			return
		}
		if (!ALIAS_RE.test(p)) {
			aliasError.value = `"${p}" — only letters, spaces, and hyphens are allowed.`
			return
		}
		if (!aliasTags.value.some((t) => t.toLowerCase() === p.toLowerCase())) {
			aliasTags.value.push(p)
		}
	}
	aliasInput.value = ''
}

function onAliasKeydown(e: KeyboardEvent): void {
	if (e.key === 'Enter' || e.key === ',') {
		e.preventDefault()
		commitAliasInput()
	} else if (e.key === 'Backspace' && aliasInput.value === '' && aliasTags.value.length) {
		aliasTags.value.pop()
	}
}

function removeAliasTag(index: number): void {
	aliasTags.value.splice(index, 1)
}

function addSuggestedAlias(alias: string): void {
	if (!aliasTags.value.some((t) => t.toLowerCase() === alias.toLowerCase())) {
		aliasTags.value.push(alias)
	}
	suggestedAliases.value = suggestedAliases.value.filter((a) => a !== alias)
}

function addAllSuggested(): void {
	for (const alias of suggestedAliases.value) {
		if (!aliasTags.value.some((t) => t.toLowerCase() === alias.toLowerCase())) {
			aliasTags.value.push(alias)
		}
	}
	suggestedAliases.value = []
}

// ─── Duplicate actions ────────────────────────────────────────────────────────
function editExisting(): void {
	if (duplicateRecord.value) emit('edit-existing', duplicateRecord.value.id)
}

function useDifferentName(): void {
	nameInput.value = ''
	duplicateRecord.value = null
	nextTick(() => nameInputEl.value?.focus())
}

// ─── Save — step 1: open confirmation dialog ─────────────────────────────────
function save(): void {
	const name = nameInput.value.trim()
	if (!name || duplicateRecord.value) return
	saveError.value = null
	if (name.length > 50) {
		saveError.value = 'Allergen name must be 50 characters or fewer.'
		return
	}
	if (!ALLERGEN_NAME_RE.test(name)) {
		saveError.value = 'Allergen name may only contain letters, spaces, and hyphens.'
		return
	}
	// Flush any uncommitted alias text before opening the confirmation dialog.
	if (aliasInput.value.trim()) commitAliasInput()
	if (aliasError.value) return
	confirmOpen.value = true
}

// ─── Save — step 2: confirmed, fire the API ───────────────────────────────────
async function executeCreate(): Promise<void> {
	const name = nameInput.value.trim()
	if (!name) return
	saving.value    = true
	saveError.value = null
	try {
		// 1. Create the allergen record
		const created = await apiFetch<{ success: boolean; allergen: { id: number; name: string } }>(
			'/api/allergen',
			{
				method: 'POST',
				body: {
					name,
					scientific_name: scientificName.value.trim(),
					is_predefined:   isPredefined.value,
				},
				isAdmin: true,
			},
		)
		const newId = created.allergen.id

		// 2. Sync aliases if any were added
		if (aliasTags.value.length > 0) {
			await apiFetch('/api/allergen/mappings', {
				method: 'PUT',
				body: { allergen_id: newId, aliases: aliasTags.value },
				isAdmin: true,
			})
		}

		confirmOpen.value = false
		emit('created', { id: newId, name: created.allergen.name })
	} catch (err) {
		confirmOpen.value = false
		saveError.value = err instanceof ApiError ? err.message : 'Failed to create allergen. Please try again.'
	} finally {
		saving.value = false
	}
}

// ─── Close guard ─────────────────────────────────────────────────────────────
function requestClose(): void {
	if (saving.value) return
	if (hasUnsavedData.value) {
		showDiscardConfirm.value = true
		return
	}
	emit('close')
}

function onKeepEditing(): void {
	showDiscardConfirm.value = false
}

function onDiscard(): void {
	showDiscardConfirm.value = false
	emit('close')
}
</script>

<style scoped>
/* ── Overlay ── */
.aa-overlay {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1100;
	padding: 24px;
}

/* ── Modal ── */
.aa-modal {
	position: relative;
	background: #fff;
	border-radius: 16px;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
	width: 100%;
	max-width: 520px;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* ── Header ── */
.aa-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 24px 16px;
	border-bottom: 1px solid #f1f5f9;
	flex-shrink: 0;
}
.aa-title { font-size: 1.05rem; font-weight: 700; margin: 0; color: #0f172a; }
.aa-close {
	background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;
	border-radius: 6px; transition: color .12s, background .12s;
	display: flex; align-items: center;
}
.aa-close:hover { color: #334155; background: #f1f5f9; }

/* ── Body ── */
.aa-body {
	padding: 20px 24px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	overflow-y: auto;
}

/* ── Fields ── */
.aa-field { display: flex; flex-direction: column; gap: 6px; }
.aa-label { font-size: 0.8rem; font-weight: 600; color: #475569; }
.aa-required { color: #ef4444; }
.aa-label-row { display: flex; align-items: center; gap: 8px; }
.aa-dataset-badge {
	display: inline-flex; align-items: center;
	padding: 2px 8px; border-radius: 9999px;
	background: #dcfce7; color: #15803d;
	font-size: 0.7rem; font-weight: 700;
}
.aa-input {
	height: 40px;
	border: 1px solid #cbd5e1;
	border-radius: 10px;
	padding: 0 12px;
	font-size: 0.88rem;
	color: #1e293b;
	outline: none;
	font-family: inherit;
	background: #fff;
	transition: border-color 0.12s;
	width: 100%;
	box-sizing: border-box;
}
.aa-input:focus,
.aa-input--focused { border-color: #008744; }
.aa-input--error { border-color: #ef4444 !important; }
.aa-field-hint { font-size: 0.72rem; color: #94a3b8; margin: 0; }

/* ── Autocomplete dropdown ── */
.aa-autocomplete-wrap { position: relative; }
.aa-dropdown {
	position: absolute;
	top: calc(100% + 4px);
	left: 0; right: 0;
	background: #fff;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	box-shadow: 0 8px 24px rgba(0,0,0,0.1);
	z-index: 200;
	overflow: hidden;
}
.aa-suggestion {
	display: flex;
	align-items: baseline;
	gap: 8px;
	padding: 10px 14px;
	cursor: pointer;
	font-size: 0.88rem;
	transition: background 0.1s;
}
.aa-suggestion:hover,
.aa-suggestion--active { background: #f0fdf4; }
.aa-suggestion--custom { color: #008744; font-weight: 500; }
.aa-suggestion-name { font-weight: 600; color: #0f172a; }
.aa-suggestion-sci { color: #64748b; font-style: italic; font-size: 0.82rem; }
.aa-suggestion-custom { color: #008744; font-weight: 500; }
.aa-dropdown-hint {
	margin: 0;
	padding: 7px 14px;
	font-size: 0.72rem;
	color: #94a3b8;
	border-top: 1px solid #f1f5f9;
	background: #fafafa;
}

/* ── Duplicate ── */
.aa-dup-error  { margin: 0; font-size: 0.82rem; color: #dc2626; font-weight: 500; }
.aa-alias-error { margin: 4px 0 0; font-size: 0.82rem; color: #dc2626; font-weight: 500; }
.aa-dup-card {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	flex-wrap: wrap;
	font-size: 0.84rem;
}
.aa-dup-id { color: #94a3b8; font-weight: 600; font-size: 0.8rem; }
.aa-dup-name { font-weight: 700; color: #0f172a; }
.aa-dup-sci { color: #64748b; }
.aa-dup-badge {
	padding: 2px 8px; border-radius: 9999px;
	background: #dbeafe; color: #1d4ed8;
	font-size: 0.72rem; font-weight: 700;
}
.aa-dup-count { color: #64748b; margin-left: auto; white-space: nowrap; }
.aa-dup-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.aa-btn-edit-existing {
	height: 36px; padding: 0 16px;
	background: #008744; border: none; color: #fff;
	border-radius: 8px; font-size: 0.84rem; font-weight: 600;
	cursor: pointer; transition: background .12s;
}
.aa-btn-edit-existing:hover { background: #00753a; }
.aa-btn-different-name {
	height: 36px; padding: 0 16px;
	background: #fff; border: 1px solid #e2e8f0; color: #334155;
	border-radius: 8px; font-size: 0.84rem; font-weight: 500;
	cursor: pointer; transition: background .12s;
}
.aa-btn-different-name:hover { background: #f8fafc; }

/* ── Alias chip editor ── */
.aa-tag-input {
	display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
	border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 10px;
	min-height: 42px; cursor: text; background: #fff;
	transition: border-color .12s;
}
.aa-tag-input:focus-within { border-color: #008744; }
.aa-chip {
	display: inline-flex; align-items: center; gap: 5px;
	border-radius: 20px; padding: 3px 10px;
	font-size: 0.78rem; font-weight: 500; cursor: default;
	white-space: nowrap;
}
.aa-chip--solid {
	background: #f0fdf4; color: #15803d;
	border: 1px solid #bbf7d0;
}
.aa-chip--dashed {
	background: #fff; color: #008744;
	border: 1.5px dashed #86efac;
	cursor: pointer; transition: background .1s, border-color .1s;
}
.aa-chip--dashed:hover { background: #f0fdf4; border-color: #4ade80; }
.aa-chip-remove {
	display: inline-flex; align-items: center; justify-content: center;
	width: 16px; height: 16px;
	border: none; background: rgba(21,128,61,0.12); color: #15803d;
	border-radius: 50%; cursor: pointer; padding: 0;
	transition: background .12s;
}
.aa-chip-remove:hover { background: rgba(21,128,61,0.28); }
.aa-alias-field {
	flex: 1; min-width: 120px; border: none; outline: none;
	font-size: 0.85rem; color: #1e293b; background: transparent;
	padding: 2px 0; font-family: inherit;
}

/* Suggested dashed chips row */
.aa-suggested-row {
	display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
	margin-top: 4px;
}
.aa-suggested-label { font-size: 0.72rem; color: #94a3b8; white-space: nowrap; }
.aa-btn-add-all {
	height: 24px; padding: 0 10px;
	background: none; border: none; color: #008744;
	font-size: 0.78rem; font-weight: 600; cursor: pointer;
	transition: color .12s;
}
.aa-btn-add-all:hover { color: #00753a; }

/* Predefined checkbox */
.aa-check-row {
	display: flex; align-items: center; gap: 8px;
	font-size: 0.85rem; color: #334155; cursor: pointer;
}
.aa-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #008744; }

/* API error */
.aa-api-error {
	display: flex; align-items: center; gap: 8px;
	padding: 10px 14px; background: #fef2f2;
	border: 1px solid #fecaca; border-radius: 8px;
	font-size: 0.82rem; color: #dc2626;
}

/* ── Footer ── */
.aa-footer {
	display: flex; align-items: center; justify-content: flex-end; gap: 8px;
	padding: 16px 24px; border-top: 1px solid #f1f5f9; flex-shrink: 0;
}
.aa-btn-cancel {
	height: 36px; padding: 0 18px;
	background: #fff; border: 1px solid #e2e8f0; color: #64748b;
	border-radius: 8px; font-size: 0.85rem; cursor: pointer; transition: background .12s;
}
.aa-btn-cancel:hover:not(:disabled) { background: #f8fafc; }
.aa-btn-create {
	height: 36px; padding: 0 20px;
	background: #008744; border: none; color: #fff;
	border-radius: 8px; font-size: 0.85rem; font-weight: 600;
	cursor: pointer; transition: background .12s;
}
.aa-btn-create:hover:not(:disabled) { background: #00753a; }
.aa-btn-cancel:disabled,
.aa-btn-create:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Confirmation overlay ── */
.aa-confirm-backdrop {
	position: absolute;
	inset: 0;
	background: rgba(15, 23, 42, 0.35);
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 16px;
	z-index: 20;
	padding: 24px;
}
.aa-confirm-card {
	background: #fff;
	border-radius: 14px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
	padding: 24px;
	width: 100%;
	max-width: 360px;
}
.aa-confirm-title {
	font-size: 1rem;
	font-weight: 700;
	color: #0f172a;
	margin: 0 0 10px;
}
.aa-confirm-body {
	font-size: 0.875rem;
	color: #334155;
	margin: 0 0 20px;
	line-height: 1.55;
}
.aa-confirm-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}
.aa-confirm-cancel {
	height: 36px; padding: 0 18px;
	background: #fff; border: 1px solid #e2e8f0; color: #64748b;
	border-radius: 8px; font-size: 0.85rem; cursor: pointer; transition: background .12s;
}
.aa-confirm-cancel:hover:not(:disabled) { background: #f8fafc; }
.aa-confirm-ok {
	height: 36px; padding: 0 18px;
	background: #008744; border: none; color: #fff;
	border-radius: 8px; font-size: 0.85rem; font-weight: 600;
	cursor: pointer; transition: background .12s;
}
.aa-confirm-ok:hover:not(:disabled) { background: #00753a; }
.aa-confirm-cancel:disabled,
.aa-confirm-ok:disabled { opacity: 0.5; cursor: not-allowed; }
.aa-confirm-fade-enter-active,
.aa-confirm-fade-leave-active { transition: opacity 0.18s ease; }
.aa-confirm-fade-enter-from,
.aa-confirm-fade-leave-to    { opacity: 0; }
</style>
