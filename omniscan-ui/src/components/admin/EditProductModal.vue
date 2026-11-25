<template>
	<Teleport to="body">
		<div v-if="open" class="ep-overlay" @click.self="requestClose">
			<div class="ep-modal" role="dialog" aria-modal="true" aria-labelledby="ep-title">

				<!-- Header -->
				<div class="ep-header">
					<h2 id="ep-title" class="ep-title">Edit product</h2>
					<button class="ep-close" @click="requestClose" aria-label="Close">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<!-- Body -->
				<div class="ep-body">
					<!-- Product name + Brand (two columns) -->
					<div class="ep-row-two">
						<label class="ep-field">
							<span class="ep-label">Product name</span>
							<input
								v-model="form.product_name"
								type="text"
								class="ep-input"
								:class="{ 'ep-input--error': errors.product_name }"
								maxlength="200"
								placeholder="Product name"
							/>
							<span v-if="errors.product_name" class="ep-field-error">{{ errors.product_name }}</span>
						</label>
						<label class="ep-field">
							<span class="ep-label">Brand</span>
							<input
								v-model="form.brand_name"
								type="text"
								class="ep-input"
								:class="{ 'ep-input--error': errors.brand_name }"
								maxlength="200"
								placeholder="Brand"
							/>
							<span v-if="errors.brand_name" class="ep-field-error">{{ errors.brand_name }}</span>
						</label>
					</div>

					<!-- Pantry category -->
					<label class="ep-field">
						<span class="ep-label">Pantry category</span>
						<div class="ep-select-wrap">
							<select
								v-model="form.category"
								class="ep-select"
								:disabled="categoriesLoading"
							>
								<option v-if="categoriesLoading" value="">Loading…</option>
								<option
									v-for="cat in categories"
									:key="cat.name"
									:value="cat.name"
								>{{ cat.name }}</option>
							</select>
						</div>
						<span class="ep-hint">Categories come from Manage Categories.</span>
					</label>

					<!-- API error -->
					<div v-if="apiError" class="ep-api-error">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
						{{ apiError }}
					</div>
				</div>

				<!-- Footer -->
				<div class="ep-footer">
					<button class="ep-btn-cancel" :disabled="saving" @click="requestClose">Cancel</button>
					<button class="ep-btn-save" :disabled="saving || categoriesLoading" @click="save">
						{{ saving ? 'Saving…' : 'Save changes' }}
					</button>
				</div>

			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

// ─── Props / Emits ───────────────────────────────────────────────────────────
interface ProductProp {
	id: number
	product_name: string
	brand_name: string
	category: string
}

const props = defineProps<{ open: boolean; product: ProductProp | null }>()
const emit = defineEmits<{
	(e: 'close'): void
	(e: 'saved', payload: { id: number; product_name: string; brand_name: string; category: string }): void
}>()

// ─── Types ───────────────────────────────────────────────────────────────────
interface CategoryOption {
	name: string
	is_locked: boolean
}

// ─── State ───────────────────────────────────────────────────────────────────
const form = ref({ product_name: '', brand_name: '', category: '' })
const errors = ref<{ product_name?: string; brand_name?: string }>({})
const apiError = ref<string | null>(null)
const saving = ref(false)

const categories = ref<CategoryOption[]>([])
const categoriesLoading = ref(false)

// ─── Lifecycle ───────────────────────────────────────────────────────────────
watch(() => props.open, (val) => {
	if (val && props.product) {
		// Pre-fill form from the row that was clicked.
		form.value = {
			product_name: props.product.product_name,
			brand_name:   props.product.brand_name,
			category:     props.product.category,
		}
		errors.value  = {}
		apiError.value = null
		void fetchCategories()
	}
})

// ─── Fetch categories ─────────────────────────────────────────────────────────
async function fetchCategories(): Promise<void> {
	categoriesLoading.value = true
	try {
		const data = await apiFetch<{ success: boolean; categories: CategoryOption[] }>(
			'/api/admin/categories',
			{ isAdmin: true },
		)
		categories.value = data.categories ?? []
		// If the product's current category isn't in the list (edge case after a delete),
		// fall back to 'Uncategorized'.
		const names = categories.value.map((c) => c.name)
		if (form.value.category && !names.includes(form.value.category)) {
			form.value.category = 'Uncategorized'
		}
	} catch {
		// Non-fatal: keep existing categories list (may be empty).
	} finally {
		categoriesLoading.value = false
	}
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(): boolean {
	const e: typeof errors.value = {}
	if (!form.value.product_name.trim()) e.product_name = 'Product name is required.'
	if (!form.value.brand_name.trim())   e.brand_name   = 'Brand is required.'
	errors.value = e
	return Object.keys(e).length === 0
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function save(): Promise<void> {
	if (!validate() || !props.product) return
	saving.value  = true
	apiError.value = null
	try {
		const res = await apiFetch<{
			success: boolean
			product: { id: number; product_name: string; brand_name: string; category?: string }
		}>(`/api/admin/products/${props.product.id}`, {
			method: 'PUT',
			body: {
				product_name: form.value.product_name.trim(),
				brand_name:   form.value.brand_name.trim(),
				category:     form.value.category,
			},
			isAdmin: true,
		})

		emit('saved', {
			id:           res.product.id,
			product_name: res.product.product_name,
			brand_name:   res.product.brand_name,
			category:     res.product.category ?? form.value.category,
		})
	} catch (err) {
		apiError.value = err instanceof ApiError ? err.message : 'Failed to save. Please try again.'
	} finally {
		saving.value = false
	}
}

// ─── Close guard ─────────────────────────────────────────────────────────────
function requestClose(): void {
	if (saving.value) return
	emit('close')
}
</script>

<style scoped>
/* ── Overlay ── */
.ep-overlay {
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
.ep-modal {
	background: #fff;
	border-radius: 16px;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
	width: 100%;
	max-width: 520px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* ── Header ── */
.ep-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 24px 16px;
	border-bottom: 1px solid #f1f5f9;
}
.ep-title {
	font-size: 1.05rem;
	font-weight: 700;
	margin: 0;
	color: #0f172a;
}
.ep-close {
	background: none;
	border: none;
	color: #94a3b8;
	cursor: pointer;
	padding: 4px;
	border-radius: 6px;
	transition: color 0.12s, background 0.12s;
	display: flex;
	align-items: center;
}
.ep-close:hover { color: #334155; background: #f1f5f9; }

/* ── Body ── */
.ep-body {
	padding: 20px 24px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

/* Two-column row */
.ep-row-two {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}

/* Field */
.ep-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.ep-label {
	font-size: 0.8rem;
	font-weight: 600;
	color: #475569;
}
.ep-input {
	height: 40px;
	border: 1px solid #cbd5e1;
	border-radius: 8px;
	padding: 0 12px;
	font-size: 0.88rem;
	color: #1e293b;
	outline: none;
	font-family: inherit;
	background: #fff;
	transition: border-color 0.12s;
}
.ep-input:focus { border-color: #008744; }
.ep-input--error { border-color: #ef4444; }
.ep-field-error {
	font-size: 0.72rem;
	color: #dc2626;
}

/* Category select */
.ep-select-wrap {
	position: relative;
}
.ep-select {
	width: 100%;
	height: 40px;
	border: 1.5px solid #008744;
	border-radius: 8px;
	padding: 0 12px;
	font-size: 0.88rem;
	color: #1e293b;
	background: #fff;
	outline: none;
	font-family: inherit;
	cursor: pointer;
	appearance: auto;
	transition: border-color 0.12s;
}
.ep-select:disabled { opacity: 0.6; cursor: not-allowed; }
.ep-hint {
	font-size: 0.72rem;
	color: #94a3b8;
	margin-top: 2px;
}

/* API error */
.ep-api-error {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px;
	background: #fef2f2;
	border: 1px solid #fecaca;
	border-radius: 8px;
	font-size: 0.82rem;
	color: #dc2626;
}

/* ── Footer ── */
.ep-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	padding: 16px 24px;
	border-top: 1px solid #f1f5f9;
}
.ep-btn-cancel {
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
.ep-btn-cancel:hover:not(:disabled) { background: #f8fafc; }
.ep-btn-save {
	height: 36px;
	padding: 0 20px;
	background: #008744;
	border: none;
	color: #fff;
	border-radius: 8px;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.ep-btn-save:hover:not(:disabled) { background: #00753a; }
.ep-btn-cancel:disabled,
.ep-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
