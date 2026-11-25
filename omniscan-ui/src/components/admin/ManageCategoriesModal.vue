<template>
	<Teleport to="body">
		<div v-if="open" class="mc-overlay" @click.self="requestClose">
			<div class="mc-modal" role="dialog" aria-modal="true" aria-labelledby="mc-title">

				<!-- Header -->
				<div class="mc-header">
					<h2 id="mc-title" class="mc-title">Manage Categories</h2>
					<button class="mc-close" @click="requestClose" aria-label="Close">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<!-- Add input bar -->
				<div class="mc-add-bar">
					<input
						v-model="newName"
						type="text"
						class="mc-add-input"
						:class="{ 'mc-add-input--error': !!addError }"
						placeholder="+ New category name"
						maxlength="50"
						@keydown.enter="initiateAdd"
					/>
					<button class="mc-add-btn" :disabled="busy" @click="initiateAdd">Add</button>
				</div>
				<p v-if="addError" class="mc-inline-error">{{ addError }}</p>

				<!-- Category table -->
				<div class="mc-table-wrap">
					<table class="mc-table">
						<thead>
							<tr>
								<th class="mc-th-cat">CATEGORY</th>
								<th class="mc-th-count">PRODUCTS</th>
								<th class="mc-th-actions">ACTIONS</th>
							</tr>
						</thead>
						<tbody>
							<!-- Loading skeleton -->
							<template v-if="isLoading">
								<tr v-for="n in 6" :key="'sk-' + n" class="mc-sk-row">
									<td><div class="mc-sk-cell shimmer" style="width:120px;height:13px"></div></td>
									<td><div class="mc-sk-cell shimmer" style="width:28px;height:13px"></div></td>
									<td><div class="mc-sk-cell shimmer" style="width:110px;height:28px;border-radius:20px"></div></td>
								</tr>
							</template>

							<template v-else>
								<tr
									v-for="cat in categories"
									:key="cat.id"
									:ref="(el) => setRowRef(cat.id, el)"
									class="mc-row"
									:class="{
										'mc-row--locked': cat.is_locked,
										'mc-row--highlight': highlightedId === cat.id,
									}"
								>
									<!-- Category name / inline rename input -->
									<td class="mc-td-cat">
										<template v-if="renamingId === cat.id">
											<input
												:ref="(el) => { if (el) renameInputEl = el as HTMLInputElement }"
												v-model="renameValue"
												type="text"
												class="mc-rename-input"
												:class="{ 'mc-rename-input--error': !!renameError }"
												maxlength="50"
												@keydown.enter="initiateSave(cat)"
												@keydown.escape="cancelRename"
											/>
											<p v-if="renameError" class="mc-inline-error mc-rename-error">{{ renameError }}</p>
										</template>
										<span v-else class="mc-cat-name">{{ cat.name }}</span>
									</td>

									<!-- Product count -->
									<td class="mc-td-count">{{ cat.product_count }}</td>

									<!-- Actions -->
									<td class="mc-td-actions">
										<template v-if="cat.is_locked">
											<span class="mc-locked-badge">Locked</span>
										</template>
										<template v-else-if="renamingId === cat.id">
											<button class="mc-btn-save" :disabled="busy" @click="initiateSave(cat)">Save</button>
											<button class="mc-btn-cancel-rename" :disabled="busy" @click="cancelRename">Cancel</button>
										</template>
										<template v-else>
											<button class="mc-btn-rename" :disabled="busy" @click="startRename(cat)">Rename</button>
											<button class="mc-btn-delete" :disabled="busy" @click="initiateDelete(cat)">Delete</button>
										</template>
									</td>
								</tr>
							</template>
						</tbody>
					</table>
				</div>

				<!-- API error banner -->
				<div v-if="apiError" class="mc-api-error">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					{{ apiError }}
				</div>

				<!-- Toast notification -->
				<transition name="mc-toast-fade">
					<div v-if="toast.visible" class="mc-toast">{{ toast.message }}</div>
				</transition>

				<!-- Footer -->
				<div class="mc-footer">
					<button class="mc-btn-close" @click="requestClose">Close</button>
				</div>

				<!-- ── Confirmation sub-dialog ── -->
				<transition name="mc-confirm-fade">
					<div v-if="confirm.open" class="mc-confirm-backdrop">
						<div class="mc-confirm-card" role="alertdialog" aria-modal="true">
							<h3 class="mc-confirm-title">{{ confirm.title }}</h3>
							<p class="mc-confirm-body">{{ confirm.body }}</p>
							<div class="mc-confirm-actions">
								<button class="mc-confirm-cancel" :disabled="busy" @click="cancelConfirm">Cancel</button>
								<button
									class="mc-confirm-ok"
									:class="{ 'mc-confirm-ok--danger': confirm.type === 'delete' }"
									:disabled="busy"
									@click="executeConfirm"
								>
									{{ busy ? 'Please wait…' : confirm.okLabel }}
								</button>
							</div>
						</div>
					</div>
				</transition>

			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

// ─── Props / Emits ───────────────────────────────────────────────────────────
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
	(e: 'close'): void
	(e: 'categories-changed'): void
}>()

// ─── Types ───────────────────────────────────────────────────────────────────
interface CategoryRow {
	id: number
	name: string
	is_locked: boolean
	product_count: number
}

type ConfirmType = 'add' | 'rename' | 'delete'

interface ConfirmState {
	open: boolean
	type: ConfirmType
	title: string
	body: string
	okLabel: string
	payload: Record<string, any>
}

// ─── State ───────────────────────────────────────────────────────────────────
const categories     = ref<CategoryRow[]>([])
const isLoading      = ref(false)
const busy           = ref(false)
const apiError       = ref<string | null>(null)

// Add-bar
const newName        = ref('')
const addError       = ref<string | null>(null)

// Inline rename
const renamingId     = ref<number | null>(null)
const renameValue    = ref('')
const renameError    = ref<string | null>(null)
const renameInputEl  = ref<HTMLInputElement | null>(null)

// Row highlight (newly added)
const highlightedId  = ref<number | null>(null)
const rowRefs        = ref<Record<number, HTMLElement | null>>({})
let highlightTimer: ReturnType<typeof setTimeout> | null = null

// Toast
const toast = ref<{ visible: boolean; message: string }>({ visible: false, message: '' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

// Confirmation dialog
const confirm = ref<ConfirmState>({
	open: false, type: 'add', title: '', body: '', okLabel: '', payload: {},
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────
watch(() => props.open, (val) => {
	if (val) {
		resetLocalState()
		void fetchCategories()
	}
})

function setRowRef(id: number, el: unknown): void {
	rowRefs.value[id] = (el as HTMLElement) ?? null
}

// ─── Fetch ───────────────────────────────────────────────────────────────────
async function fetchCategories(): Promise<void> {
	isLoading.value = true
	apiError.value  = null
	try {
		const data = await apiFetch<{ success: boolean; categories: CategoryRow[] }>(
			'/api/admin/categories',
			{ isAdmin: true },
		)
		categories.value = data.categories ?? []
	} catch (err) {
		apiError.value = err instanceof ApiError ? err.message : 'Failed to load categories.'
	} finally {
		isLoading.value = false
	}
}

// ─── Validation helpers ───────────────────────────────────────────────────────
function validateName(name: string, excludeId: number | null = null): string | null {
	const trimmed = name.trim()
	if (!trimmed)             return 'Category name is required.'
	if (trimmed.length > 50)  return 'Maximum 50 characters.'
	const conflict = categories.value.find(
		(c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== excludeId,
	)
	if (conflict) return `"${conflict.name}" already exists.`
	return null
}

// ─── Add flow ─────────────────────────────────────────────────────────────────
function initiateAdd(): void {
	addError.value = null
	const err = validateName(newName.value)
	if (err) { addError.value = err; return }

	const name = newName.value.trim()
	confirm.value = {
		open:    true,
		type:    'add',
		title:   `Add category "${name}"?`,
		body:    'It will show up for consumers right away in scan, upload, and Edit in pantry detail.',
		okLabel: 'Confirm',
		payload: { name },
	}
}

// ─── Rename flow ──────────────────────────────────────────────────────────────
function startRename(cat: CategoryRow): void {
	// Cancel any other open rename first.
	renamingId.value  = cat.id
	renameValue.value = cat.name
	renameError.value = null
	nextTick(() => renameInputEl.value?.focus())
}

function cancelRename(): void {
	renamingId.value  = null
	renameValue.value = ''
	renameError.value = null
}

function initiateSave(cat: CategoryRow): void {
	renameError.value = null
	const newNameTrimmed = renameValue.value.trim()

	// No-op if unchanged.
	if (newNameTrimmed.toLowerCase() === cat.name.toLowerCase()) {
		cancelRename()
		return
	}

	const err = validateName(newNameTrimmed, cat.id)
	if (err) { renameError.value = err; return }

	confirm.value = {
		open:    true,
		type:    'rename',
		title:   `Rename ${cat.name} to ${newNameTrimmed}?`,
		body:    `Its ${cat.product_count} products and consumer pantries keep their category under the new name, and consumers see it right away.`,
		okLabel: 'Confirm',
		payload: { id: cat.id, old_name: cat.name, new_name: newNameTrimmed },
	}
}

// ─── Delete flow ──────────────────────────────────────────────────────────────
function initiateDelete(cat: CategoryRow): void {
	confirm.value = {
		open:    true,
		type:    'delete',
		title:   `Delete ${cat.name}?`,
		body:    `${cat.product_count} products in this category will move to Uncategorized. Consumer pantries keep their items.`,
		okLabel: 'Delete category',
		payload: { id: cat.id, name: cat.name },
	}
}

// ─── Confirmation ─────────────────────────────────────────────────────────────
function cancelConfirm(): void {
	confirm.value.open = false
}

async function executeConfirm(): Promise<void> {
	busy.value = true
	apiError.value = null
	const { type, payload } = confirm.value
	try {
		await apiFetch('/api/admin/categories', {
			method: 'POST',
			body: { action: type, ...payload },
			isAdmin: true,
		})

		confirm.value.open = false

		// Refresh the list.
		await fetchCategories()

		// Post-operation UX.
		if (type === 'add') {
			newName.value  = ''
			addError.value = null
			showToast('Category added')
			// Highlight the new row.
			const added = categories.value.find((c) => c.name === payload.name)
			if (added) flashHighlight(added.id)
		} else if (type === 'rename') {
			cancelRename()
			showToast('Category renamed')
		}
		// delete: no toast per spec, just refresh.

		emit('categories-changed')
	} catch (err) {
		confirm.value.open = false
		apiError.value = err instanceof ApiError ? err.message : 'Operation failed. Please try again.'
	} finally {
		busy.value = false
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showToast(message: string): void {
	toast.value = { visible: true, message }
	if (toastTimer) clearTimeout(toastTimer)
	toastTimer = setTimeout(() => { toast.value = { visible: false, message: '' } }, 3000)
}

function flashHighlight(id: number): void {
	highlightedId.value = id
	if (highlightTimer) clearTimeout(highlightTimer)
	// Scroll the new row into view after the DOM updates.
	nextTick(() => {
		const el = rowRefs.value[id]
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	})
	highlightTimer = setTimeout(() => { highlightedId.value = null }, 2500)
}

function resetLocalState(): void {
	newName.value      = ''
	addError.value     = null
	renamingId.value   = null
	renameValue.value  = ''
	renameError.value  = null
	apiError.value     = null
	confirm.value.open = false
	toast.value        = { visible: false, message: '' }
	highlightedId.value = null
}

function requestClose(): void {
	if (busy.value) return
	emit('close')
}
</script>

<style scoped>
/* ── Overlay ── */
.mc-overlay {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1100;
	padding: 24px;
}

/* ── Modal shell ── */
.mc-modal {
	position: relative;
	background: #fff;
	border-radius: 16px;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
	width: 100%;
	max-width: 500px;
	max-height: 88vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* ── Header ── */
.mc-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 24px 16px;
	border-bottom: 1px solid #f1f5f9;
	flex-shrink: 0;
}
.mc-title {
	font-size: 1.05rem;
	font-weight: 700;
	margin: 0;
	color: #0f172a;
}
.mc-close {
	background: none;
	border: none;
	color: #94a3b8;
	cursor: pointer;
	padding: 4px;
	border-radius: 6px;
	transition: color 0.12s, background 0.12s;
	display: flex;
	align-items: center;
	justify-content: center;
}
.mc-close:hover { color: #334155; background: #f1f5f9; }

/* ── Add bar ── */
.mc-add-bar {
	display: flex;
	gap: 8px;
	padding: 16px 24px 0;
	flex-shrink: 0;
}
.mc-add-input {
	flex: 1;
	height: 40px;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	padding: 0 12px;
	font-size: 0.88rem;
	color: #1e293b;
	outline: none;
	font-family: inherit;
	transition: border-color 0.12s;
	background: #fff;
}
.mc-add-input:focus { border-color: #008744; }
.mc-add-input--error { border-color: #ef4444; }
.mc-add-btn {
	height: 40px;
	padding: 0 20px;
	background: #008744;
	color: #fff;
	border: none;
	border-radius: 10px;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
	flex-shrink: 0;
}
.mc-add-btn:hover:not(:disabled) { background: #00753a; }
.mc-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mc-inline-error {
	margin: 4px 24px 0;
	font-size: 0.75rem;
	color: #dc2626;
	flex-shrink: 0;
}

/* ── Table ── */
.mc-table-wrap {
	overflow-y: auto;
	flex: 1;
	margin-top: 12px;
}
.mc-table {
	width: 100%;
	border-collapse: collapse;
}
.mc-table thead th {
	text-align: left;
	padding: 8px 24px;
	font-size: 0.72rem;
	font-weight: 700;
	color: #64748b;
	letter-spacing: 0.05em;
	background: #f8fafc;
	border-bottom: 1px solid #f1f5f9;
	white-space: nowrap;
}
.mc-th-count   { width: 80px; }
.mc-th-actions { width: 160px; }
.mc-row td {
	padding: 11px 24px;
	border-bottom: 1px solid #f8fafc;
	font-size: 0.88rem;
	vertical-align: middle;
	transition: background 0.8s ease;
}
.mc-row--locked td { background: #f8fafc; color: #94a3b8; }
.mc-row--highlight td { background: #f0fdf4; }
.mc-cat-name   { font-weight: 500; color: #0f172a; }
.mc-td-count   { color: #64748b; }
.mc-td-actions { white-space: nowrap; }

/* Locked badge */
.mc-locked-badge {
	font-size: 0.75rem;
	color: #94a3b8;
	font-weight: 500;
	font-style: italic;
}

/* Action buttons */
.mc-btn-rename,
.mc-btn-delete,
.mc-btn-save,
.mc-btn-cancel-rename {
	height: 30px;
	padding: 0 12px;
	border-radius: 20px;
	font-size: 0.78rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s, border-color 0.12s;
}
.mc-btn-rename {
	background: #fff;
	border: 1px solid #e2e8f0;
	color: #334155;
	margin-right: 6px;
}
.mc-btn-rename:hover:not(:disabled) { background: #f8fafc; }
.mc-btn-delete {
	background: #fff;
	border: 1.5px solid #ef4444;
	color: #ef4444;
}
.mc-btn-delete:hover:not(:disabled) { background: #fef2f2; }
.mc-btn-save {
	background: #008744;
	border: none;
	color: #fff;
	margin-right: 6px;
}
.mc-btn-save:hover:not(:disabled) { background: #00753a; }
.mc-btn-cancel-rename {
	background: #fff;
	border: 1px solid #e2e8f0;
	color: #64748b;
}
.mc-btn-cancel-rename:hover:not(:disabled) { background: #f8fafc; }
.mc-btn-rename:disabled,
.mc-btn-delete:disabled,
.mc-btn-save:disabled,
.mc-btn-cancel-rename:disabled { opacity: 0.5; cursor: not-allowed; }

/* Inline rename input */
.mc-rename-input {
	width: 100%;
	height: 34px;
	border: 1.5px solid #008744;
	border-radius: 8px;
	padding: 0 10px;
	font-size: 0.88rem;
	color: #0f172a;
	outline: none;
	font-family: inherit;
	background: #fff;
	box-sizing: border-box;
}
.mc-rename-input--error { border-color: #ef4444; }
.mc-rename-error { margin: 4px 0 0; }

/* ── API error ── */
.mc-api-error {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0 24px 8px;
	padding: 10px 14px;
	background: #fef2f2;
	border: 1px solid #fecaca;
	border-radius: 8px;
	font-size: 0.82rem;
	color: #dc2626;
	flex-shrink: 0;
}

/* ── Toast ── */
.mc-toast {
	position: absolute;
	bottom: 72px;
	left: 50%;
	transform: translateX(-50%);
	background: #111827;
	color: #fff;
	padding: 10px 20px;
	border-radius: 9999px;
	font-size: 0.82rem;
	font-weight: 500;
	white-space: nowrap;
	z-index: 10;
	pointer-events: none;
}
.mc-toast-fade-enter-active,
.mc-toast-fade-leave-active { transition: opacity 0.25s ease; }
.mc-toast-fade-enter-from,
.mc-toast-fade-leave-to    { opacity: 0; }

/* ── Footer ── */
.mc-footer {
	display: flex;
	justify-content: flex-end;
	padding: 14px 24px;
	border-top: 1px solid #f1f5f9;
	flex-shrink: 0;
}
.mc-btn-close {
	height: 36px;
	padding: 0 20px;
	background: #fff;
	border: 1px solid #e2e8f0;
	color: #334155;
	border-radius: 8px;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.mc-btn-close:hover { background: #f8fafc; }

/* ── Confirmation sub-dialog ── */
.mc-confirm-backdrop {
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
.mc-confirm-card {
	background: #fff;
	border-radius: 14px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
	padding: 24px;
	width: 100%;
	max-width: 360px;
}
.mc-confirm-title {
	font-size: 1rem;
	font-weight: 700;
	color: #0f172a;
	margin: 0 0 10px;
}
.mc-confirm-body {
	font-size: 0.875rem;
	color: #334155;
	margin: 0 0 20px;
	line-height: 1.55;
}
.mc-confirm-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}
.mc-confirm-cancel {
	height: 36px;
	padding: 0 18px;
	background: #fff;
	border: 1px solid #e2e8f0;
	color: #64748b;
	border-radius: 8px;
	font-size: 0.85rem;
	cursor: pointer;
	transition: background 0.12s;
}
.mc-confirm-cancel:hover:not(:disabled) { background: #f8fafc; }
.mc-confirm-ok {
	height: 36px;
	padding: 0 18px;
	background: #008744;
	border: none;
	color: #fff;
	border-radius: 8px;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.mc-confirm-ok:hover:not(:disabled) { background: #00753a; }
.mc-confirm-ok--danger { background: #dc2626; }
.mc-confirm-ok--danger:hover:not(:disabled) { background: #b91c1c; }
.mc-confirm-cancel:disabled,
.mc-confirm-ok:disabled { opacity: 0.5; cursor: not-allowed; }
.mc-confirm-fade-enter-active,
.mc-confirm-fade-leave-active { transition: opacity 0.18s ease; }
.mc-confirm-fade-enter-from,
.mc-confirm-fade-leave-to    { opacity: 0; }

/* ── Skeletons ── */
.mc-sk-row td { padding: 12px 24px; border-bottom: 1px solid #f8fafc; }
.mc-sk-cell { border-radius: 6px; display: block; }
.shimmer {
	background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
	0%   { background-position: 100% 0; }
	100% { background-position: -100% 0; }
}
</style>
