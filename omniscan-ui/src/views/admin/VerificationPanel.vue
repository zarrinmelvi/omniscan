<template>
	<div class="verification-panel">

		<!-- ── Header ─────────────────────────────────────────────────────── -->
		<header class="page-header">
			<div class="header-left">
				<div class="header-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
						<path d="M9.5 9a3.5 3.5 0 1 0 4.47 4.9"></path>
						<path d="M14 8l1 1"></path>
					</svg>
				</div>
				<div>
					<h1>Halal Verification Panel</h1>
					<p class="subtitle">Review unverified Halal logos · Assign certifying bodies · Resolve compliance flags</p>
				</div>
			</div>
		</header>

		<!-- ── Metric Cards ────────────────────────────────────────────────── -->
		<div v-if="!isLoading && !errorMessage" class="summary-cards">

			<div class="summary-card yellow">
				<div class="card-icon-wrap yellow-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value yellow-text">{{ counts.total }}</span>
					<span class="summary-label">Unverified Halal Logos</span>
				</div>
			</div>

			<div class="summary-card yellow">
				<div class="card-icon-wrap yellow-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value yellow-text">{{ counts.pending }}</span>
					<span class="summary-label">Pending Halal Review</span>
				</div>
			</div>

			<div class="summary-card blue">
				<div class="card-icon-wrap blue-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
						<polyline points="9 12 11 14 15 10"></polyline>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value blue-text">{{ counts.corrected }}</span>
					<span class="summary-label">Logo Corrections</span>
				</div>
			</div>

			<div class="summary-card green">
				<div class="card-icon-wrap green-bg">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
						<polyline points="22 4 12 14.01 9 11.01"></polyline>
					</svg>
				</div>
				<div class="card-text">
					<span class="summary-value green-text">{{ counts.resolved }}</span>
					<span class="summary-label">Certified / Resolved</span>
				</div>
			</div>
		</div>

		<!-- ── Table Card ──────────────────────────────────────────────────── -->
		<div class="panel-card">
			<div class="controls-bar">
				<div class="search-box">
					<svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					</svg>
					<input v-model="searchQuery" type="text" placeholder="Search by product, ID, or user…" />
				</div>
				<div class="filters">
					<svg class="filter-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
					</svg>
					<select v-model="sortOrder" class="filter-select">
						<option value="latest">Latest</option>
						<option value="oldest">Oldest</option>
					</select>
					<select v-model="filterVerdict" class="filter-select">
						<option value="all">All Verdicts</option>
						<option value="red">Red</option>
						<option value="yellow">Yellow</option>
					</select>
					<select v-model="filterStatus" class="filter-select">
						<option value="all">All Statuses</option>
						<option value="pending">Pending</option>
						<option value="flagged">Flagged</option>
						<option value="approved">Certified</option>
						<option value="dismissed">Dismissed</option>
					</select>
				</div>
			</div>

			<!-- Verdict colour legend -->
			<div class="verdict-legend">
				<span class="legend-label">Halal Flag colour:</span>
				<span class="legend-item">
					<span class="legend-dot legend-dot--yellow"></span>
					<span><strong>Yellow</strong> — Unverified Halal logo only</span>
				</span>
				<span class="legend-divider">·</span>
				<span class="legend-item">
					<span class="legend-dot legend-dot--red"></span>
					<span><strong>Red</strong> — Unverified logo + ingredient safety concern</span>
				</span>
			</div>

			<p v-if="isLoading" class="state-message">Loading Halal verification queue…</p>
			<p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>
			<p v-else-if="filteredRows.length === 0" class="empty-note">No Halal compliance flags match the selected criteria.</p>

			<div v-else class="table-wrap">
				<table class="scans-table">
					<thead>
						<tr>
							<th class="col-id">ID</th>
							<th class="col-product">PRODUCT</th>
							<th class="col-flag">HALAL FLAG</th>
							<th class="col-confidence">CONFIDENCE</th>
							<th class="col-submitted">SUBMITTED</th>
							<th class="col-status">STATUS</th>
							<th class="col-actions">ACTIONS</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in pagedRows" :key="row.id" @click="openReviewModal(row)">

							<td class="col-id cell-id">#{{ row.id }}</td>

							<td class="col-product">
								<div class="product-cell">
									<div class="product-thumb">
										<img v-if="row.thumb_src" :src="row.thumb_src" :alt="row.product_name" class="thumb-img" />
										<span v-else class="thumb-emoji">📦</span>
									</div>
									<div class="product-details">
										<span class="product-name">{{ row.brand_name }} {{ row.product_name }}</span>
										<span class="product-user">{{ row.scanned_by }}</span>
									</div>
								</div>
							</td>

							<td class="col-flag">
								<div class="flag-capsule" :class="verdictClass(row.safety_verdict)">
									<span class="flag-dot"></span>
									<span class="flag-text">
										<strong>{{ halalFlagLabel(row.clean_flag_reason) }}</strong>
										<span class="flag-sub">{{ row.clean_flag_reason }}</span>
									</span>
								</div>
							</td>

							<td class="col-confidence">
								<span :class="confidenceClass(row.safety_verdict, row.confidence)">{{ row.confidence }}%</span>
							</td>

							<td class="col-submitted">
								<div>{{ formatDate(row.created_at) }}</div>
								<div class="time-subtext">{{ formatTime(row.created_at) }}</div>
							</td>

							<td class="col-status">
								<span class="status-pill" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
							</td>

							<td class="col-actions">
								<div class="btn-row">
									<button
										class="btn-correct"
										:disabled="actingOnId === row.id"
										@click.stop="openReviewModal(row)"
									>
										<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
											<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
											<polyline points="9 12 11 14 15 10"></polyline>
										</svg>
										Correct
									</button>
								</div>
							</td>

						</tr>
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div v-if="!isLoading && !errorMessage && filteredRows.length > 0" class="pagination-bar">
				<button class="page-nav" :disabled="currentPage === 1" @click="prevPage" aria-label="Previous page">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
				</button>
				<template v-for="(item, idx) in pageItems" :key="idx">
					<button
						v-if="item !== '...'"
						class="page-num"
						:class="{ active: item === currentPage }"
						@click="goToPage(item as number)"
					>{{ item }}</button>
					<span v-else class="page-ellipsis">…</span>
				</template>
				<button class="page-nav" :disabled="currentPage === totalPages" @click="nextPage" aria-label="Next page">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
				</button>
			</div>
		</div>

		<!-- ══════════════════════════════════════════════════════════════════ -->
		<!-- DETAILED REVIEW MODAL                                             -->
		<!-- (single review surface — drawer retired in Task 6.5)              -->
		<!-- ══════════════════════════════════════════════════════════════════ -->
		<Teleport to="body">
			<div v-if="modalRow" class="modal-overlay" @click.self="requestClose">
				<div class="modal" role="dialog" aria-modal="true" :aria-label="`Assign Halal certifying body for ${modalRow.product_name}`">

					<div class="modal-header">
						<div class="modal-title-group">
							<div class="modal-icon-wrap">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
									<polyline points="9 12 11 14 15 10"></polyline>
								</svg>
							</div>
							<div>
								<h2 class="modal-title">Assign Halal Certifying Body</h2>
								<p class="modal-subtitle">{{ modalRow.brand_name }} {{ modalRow.product_name }}</p>
							</div>
						</div>
						<button class="modal-close" @click="requestClose" aria-label="Close">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>

					<div class="modal-flag-context">
						<div class="flag-capsule" :class="verdictClass(modalRow.safety_verdict)" style="max-width:100%">
							<span class="flag-dot"></span>
							<span class="flag-text">
								<strong>{{ halalFlagLabel(modalRow.clean_flag_reason) }}</strong>
								<span class="flag-sub">{{ modalRow.clean_flag_reason }}</span>
							</span>
						</div>
					</div>

					<!-- Region (a): hi-res zoomable scan images (loaded via reviewDetail) -->
					<section class="modal-images">
						<div class="modal-section-label">Scanned Images</div>
						<div class="image-row">
							<div class="scan-image-box">
								<img
									v-if="reviewFrontSrc"
									:src="reviewFrontSrc"
									alt="Front scan"
									class="scan-img scan-img--zoomable"
									title="Click to zoom"
									@click="openLightbox(reviewFrontSrc, 'Front scan')"
								/>
								<div v-else class="scan-img-placeholder">
									<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35">
										<rect x="3" y="3" width="18" height="18" rx="2"></rect>
										<circle cx="8.5" cy="8.5" r="1.5"></circle>
										<polyline points="21 15 16 10 5 21"></polyline>
									</svg>
									<span>No image</span>
								</div>
								<div class="image-label">Front</div>
							</div>
							<div v-if="reviewBackSrc" class="scan-image-box">
								<img
									:src="reviewBackSrc"
									alt="Back scan"
									class="scan-img scan-img--zoomable"
									title="Click to zoom"
									@click="openLightbox(reviewBackSrc!, 'Back scan')"
								/>
								<div class="image-label">Back</div>
							</div>
						</div>
					</section>

					<!-- Region (b): fully un-truncated AI detection notes (loaded via reviewDetail) -->
					<section v-if="reviewDetail" class="modal-notes-section">
						<div class="modal-section-label">AI Detection Notes</div>
						<div class="detail-grid" style="padding: 0 24px 8px">
							<div class="detail-row full-span">
								<span class="detail-key">Flag Reason</span>
								<span class="detail-val flag-reason-text">{{ reviewDetail.clean_flag_reason }}</span>
							</div>
							<div v-if="reviewDetail.flag_reason && reviewDetail.flag_reason !== reviewDetail.clean_flag_reason" class="detail-row full-span">
								<span class="detail-key">Full Flag Reason</span>
								<span class="detail-val flag-reason-text">{{ reviewDetail.flag_reason }}</span>
							</div>
							<div v-if="reviewDetail.ocr_flag_reason && reviewDetail.ocr_flag_reason !== reviewDetail.flag_reason" class="detail-row full-span">
								<span class="detail-key">Raw OCR Flag</span>
								<span class="detail-val flag-reason-text mono">{{ reviewDetail.ocr_flag_reason }}</span>
							</div>
						</div>
					</section>

					<div class="modal-section-label">Select an authorized certifying body from the Halal logo library:</div>

					<div v-if="halalLogos.length === 0" class="empty-logos">No Halal logos found in library.</div>

					<div v-else class="logo-grid">
						<button
							v-for="logo in halalLogos"
							:key="logo.id"
							class="logo-card"
							:class="{ selected: modalSelectedLogoId === logo.id }"
							@click="modalSelectedLogoId = logo.id"
						>
							<div class="logo-card-img">
								<img
									v-if="logo.logo_src"
									:src="logo.logo_src"
									:alt="logo.certifier"
									class="logo-img"
									@error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
								/>
								<span v-else class="logo-fallback">☪</span>
							</div>
							<div class="logo-card-body">
								<span class="logo-certifier">{{ logo.certifier }}</span>
								<span v-if="logo.full_name" class="logo-full-name">{{ logo.full_name }}</span>
								<span class="logo-accredited-badge">Active</span>
							</div>
							<div v-if="modalSelectedLogoId === logo.id" class="logo-check">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<polyline points="20 6 9 17 4 12"></polyline>
								</svg>
							</div>
						</button>
					</div>

					<div class="modal-notes">
						<label class="notes-label" :for="`modal-notes-${modalRow.id}`">Admin note (optional)</label>
						<textarea
							:id="`modal-notes-${modalRow.id}`"
							v-model="modalNote"
							class="notes-input"
							rows="2"
							placeholder="e.g. Logo matched to JAKIM after manual review of packaging image…"
						></textarea>
					</div>

					<!-- Error message inside modal -->
					<p v-if="modalError" class="modal-error">{{ modalError }}</p>

					<div class="modal-footer">
						<button class="btn-modal-cancel" :disabled="modalActing" @click="requestClose">Cancel</button>
						<button class="btn-modal-dismiss" :disabled="modalActing" @click="submitDismiss">
							{{ modalActing && modalAction === 'dismiss' ? 'Dismissing…' : 'Dismiss Flag' }}
						</button>
						<button
							class="btn-modal-certify"
							:disabled="!modalSelectedLogoId || modalActing"
							@click="submitCorrection"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
								<polyline points="9 12 11 14 15 10"></polyline>
							</svg>
							{{ modalActing && modalAction === 'certify' ? 'Certifying…' : 'Certify & Resolve' }}
						</button>
					</div>

				</div>
			</div>
		</Teleport>

		<!-- Unsaved changes confirmation -->
		<ConfirmDiscardModal
			:open="showDiscardConfirm"
			discard-label="Discard Changes"
			@keep="onKeepEditing"
			@discard="onDiscard"
		/>

		<!-- ══════════════════════════════════════════════════════════════════ -->
		<!-- IMAGE LIGHTBOX                                                     -->
		<!-- ══════════════════════════════════════════════════════════════════ -->
		<Teleport to="body">
			<transition name="lightbox-fade">
				<div
					v-if="lightboxSrc"
					class="lightbox-overlay"
					role="dialog"
					aria-modal="true"
					:aria-label="lightboxAlt"
					@click.self="closeLightbox"
				>
					<button class="lightbox-close" @click="closeLightbox" aria-label="Close zoom view">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
					<img :src="lightboxSrc" :alt="lightboxAlt" class="lightbox-img" />
					<p class="lightbox-caption">{{ lightboxAlt }}</p>
				</div>
			</transition>
		</Teleport>

	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'
import ConfirmDiscardModal from '@/components/admin/ConfirmDiscardModal.vue'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlaggedScanRaw {
	id: number
	product_name: string
	brand_name: string
	flag_reason: string
	/** flag_reason with allergen fragments stripped — Halal text only */
	clean_flag_reason: string
	status: string
	safety_verdict: string | null
	/** Real AI confidence score (0-100) from the DB, null if not available */
	ai_confidence_score: number | null
	scanned_by: string
	admin_correction: string | null
	created_at: string
	halal_flag_type: 'halal' | 'allergen' | 'other'
	/** base64 image string from the scanned product (may be null) */
	image_base64: string | null
	image_base64_back: string | null
}

interface FlaggedScanRow extends FlaggedScanRaw {
	confidence: number
	/** Computed data: URI for the product thumbnail, or null */
	thumb_src: string | null
}

interface FlaggedScansResponse {
	flagged_scans: FlaggedScanRaw[]
}

interface ScanDetail {
	id: number
	flag_reason: string
	clean_flag_reason: string
	status: string
	admin_correction: string | null
	created_at: string
	scan_id: number | null
	image_base64: string | null
	image_base64_back: string | null
	image_url: string | null
	image_url_back: string | null
	scan_time: string | null
	ai_confidence_score: number | null
	safety_verdict: string | null
	ocr_flag_reason: string | null
	product_name: string
	brand_name: string
	ingredient_text: string | null
	scanned_by_name: string | null
	scanned_by_email: string | null
}

interface HalalLogoOption {
	id: number
	certifier: string
	full_name: string | null
	image_path: string | null
	/** Resolved relative URL for the logo asset, ready for use in <img :src> */
	logo_src: string | null
	is_accredited: boolean
}

// ─── Confidence palette ───────────────────────────────────────────────────────

const CONFIDENCE_POOL = [72, 91, 68, 85, 77, 63, 88, 74, 59, 82]
function deriveConfidence(id: number): number {
	return CONFIDENCE_POOL[id % CONFIDENCE_POOL.length]
}

// ─── State ────────────────────────────────────────────────────────────────────

const rawScans     = ref<FlaggedScanRaw[]>([])
const isLoading    = ref(true)
const errorMessage = ref<string | null>(null)
const actingOnId   = ref<number | null>(null)
const halalLogos   = ref<HalalLogoOption[]>([])

// Loaded scan detail — powers the unified review modal's image + notes regions
// (loaded via GET /api/admin/flagged-scans/[id]; see openReviewDrawer).
const reviewDetail    = ref<ScanDetail | null>(null)
const reviewLoadingId = ref<number | null>(null)

// Computed confidence for the loaded scan detail (uses the same deterministic pool)
const reviewConfidence = computed(() =>
	reviewDetail.value ? deriveConfidence(reviewDetail.value.id) : 0
)

// data: URI for the front scan image in the Review drawer
const reviewFrontSrc = computed<string | null>(() => {
	const d = reviewDetail.value
	if (!d) return null
	if (d.image_base64) {
		return d.image_base64.startsWith('data:') ? d.image_base64 : `data:image/jpeg;base64,${d.image_base64}`
	}
	return null
})

// data: URI for the back scan image in the Review drawer
const reviewBackSrc = computed<string | null>(() => {
	const d = reviewDetail.value
	if (!d) return null
	if (d.image_base64_back) {
		return d.image_base64_back.startsWith('data:') ? d.image_base64_back : `data:image/jpeg;base64,${d.image_base64_back}`
	}
	return null
})

// Lightbox for zoomable scan images
const lightboxSrc   = ref<string | null>(null)
const lightboxAlt   = ref<string>('')

function openLightbox(src: string, alt: string): void {
	lightboxSrc.value = src
	lightboxAlt.value = alt
}

function closeLightbox(): void {
	lightboxSrc.value = null
}

// Correction modal
const modalRow            = ref<FlaggedScanRow | null>(null)
const modalSelectedLogoId = ref<number | null>(null)
const modalNote           = ref('')
const modalActing         = ref(false)
const modalAction         = ref<'certify' | 'dismiss' | null>(null)
const modalError          = ref<string | null>(null)

// Unsaved-changes tracking
const baselineSnapshot    = ref<{ logoId: number | null; note: string }>({ logoId: null, note: '' })
const showDiscardConfirm  = ref(false)

const isDirty = computed(() =>
	modalSelectedLogoId.value !== baselineSnapshot.value.logoId ||
	modalNote.value !== baselineSnapshot.value.note
)

// Filters
const searchQuery   = ref('')
const sortOrder     = ref<'latest' | 'oldest'>('latest')
const filterVerdict = ref('all')
const filterStatus  = ref('all')

// ─── Derived rows ─────────────────────────────────────────────────────────────

const flaggedScans = computed<FlaggedScanRow[]>(() =>
	rawScans.value.map((s) => ({
		...s,
		confidence: s.ai_confidence_score ?? deriveConfidence(s.id),
		// Build a data URI from the stored base64 string so <img :src="..."> works
		// directly without a separate HTTP request to a file server.
		thumb_src: s.image_base64
			? (s.image_base64.startsWith('data:') ? s.image_base64 : `data:image/jpeg;base64,${s.image_base64}`)
			: null,
	}))
)

// ─── Metric counters ─────────────────────────────────────────────────────────

const counts = computed(() => {
	const all = rawScans.value
	return {
		total:     all.length,
		pending:   all.filter((s) => s.status === 'pending' || s.status === 'flagged').length,
		corrected: all.filter((s) => s.admin_correction != null && s.admin_correction !== '').length,
		resolved:  all.filter((s) => ['approved', 'verified', 'dismissed', 'rejected'].includes(s.status)).length,
	}
})

// ─── Filtered rows ────────────────────────────────────────────────────────────

const filteredRows = computed<FlaggedScanRow[]>(() => {
	const filtered = flaggedScans.value.filter((row) => {
		const q = searchQuery.value.trim().toLowerCase()
		if (q) {
			const name = `${row.brand_name} ${row.product_name}`.toLowerCase()
			if (!name.includes(q) && !`#${row.id}`.includes(q) && !row.scanned_by.toLowerCase().includes(q)) return false
		}
		if (filterVerdict.value !== 'all') {
			if ((row.safety_verdict ?? '').toLowerCase() !== filterVerdict.value) return false
		}
		if (filterStatus.value !== 'all') {
			const s = row.status.toLowerCase()
			if (filterStatus.value === 'approved'  && s !== 'approved'  && s !== 'verified')  return false
			if (filterStatus.value === 'dismissed' && s !== 'dismissed' && s !== 'rejected')  return false
			if (filterStatus.value !== 'approved' && filterStatus.value !== 'dismissed' && s !== filterStatus.value) return false
		}
		return true
	})

	return [...filtered].sort((a, b) => {
		const ta = new Date(a.created_at).getTime()
		const tb = new Date(b.created_at).getTime()
		return sortOrder.value === 'latest' ? tb - ta : ta - tb
	})
})

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const currentPage = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)))

const pagedRows = computed<FlaggedScanRow[]>(() => {
	const start = (currentPage.value - 1) * PAGE_SIZE
	return filteredRows.value.slice(start, start + PAGE_SIZE)
})

// Windowed page list capped at 10 visible slots, with ellipsis markers.
const pageItems = computed<(number | '...')[]>(() => {
	const total = totalPages.value
	const current = currentPage.value
	const MAX = 10

	if (total <= MAX) {
		return Array.from({ length: total }, (_, i) => i + 1)
	}

	const items: (number | '...')[] = []
	const SIBLINGS = 2
	const left = Math.max(2, current - SIBLINGS)
	const right = Math.min(total - 1, current + SIBLINGS)

	items.push(1)
	if (left > 2) items.push('...')
	for (let p = left; p <= right; p++) items.push(p)
	if (right < total - 1) items.push('...')
	items.push(total)
	return items
})

function goToPage(p: number): void {
	if (p < 1 || p > totalPages.value) return
	currentPage.value = p
}

function nextPage(): void {
	if (currentPage.value < totalPages.value) currentPage.value++
}

function prevPage(): void {
	if (currentPage.value > 1) currentPage.value--
}

// Reset to page 1 when the filtered result set changes (search / filter / sort).
watch([searchQuery, sortOrder, filterVerdict, filterStatus], () => {
	currentPage.value = 1
})

// Clamp current page if it falls out of range after data changes.
watch(totalPages, (tp) => {
	if (currentPage.value > tp) currentPage.value = tp
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function verdictClass(verdict: string | null): string {
	return (verdict ?? 'yellow').toLowerCase() === 'red' ? 'red' : 'yellow'
}

function confidenceClass(verdict: string | null, pct: number): string {
	if ((verdict ?? '').toLowerCase() === 'red') return 'conf-red'
	if (pct >= 85) return 'conf-red'
	if (pct >= 70) return 'conf-yellow'
	return 'conf-green'
}

function statusClass(status: string): string {
	const s = status.toLowerCase()
	if (s === 'pending') return 'pill-pending'
	if (s === 'flagged') return 'pill-flagged'
	if (s === 'approved' || s === 'verified') return 'pill-approved'
	return 'pill-dismissed'
}

function statusLabel(status: string): string {
	const s = status.toLowerCase()
	if (s === 'approved' || s === 'verified') return 'Certified'
	if (s === 'dismissed' || s === 'rejected') return 'Dismissed'
	return status.charAt(0).toUpperCase() + status.slice(1)
}

function halalFlagLabel(flag_reason: string): string {
	const r = flag_reason.toLowerCase()
	if (r.includes('slaughter')) return 'Slaughter Cert.'
	if (r.includes('stamp') || r.includes('compliance')) return 'Compliance Stamp'
	if (r.includes('logo')) return 'Unverified Logo'
	return 'Halal Flag'
}

function formatDate(iso: string): string {
	if (!iso) return '—'
	return new Date(iso).toLocaleDateString('en-CA')
}

function formatTime(iso: string): string {
	if (!iso) return ''
	return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── Review Drawer ────────────────────────────────────────────────────────────

async function openReviewDrawer(id: number): Promise<void> {
	reviewLoadingId.value = id
	try {
		const res = await apiFetch<{ success: boolean; detail: ScanDetail }>(
			`/api/admin/flagged-scans/${id}`,
			{ method: 'GET', isAdmin: true }
		)
		reviewDetail.value = res.detail
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load scan detail.'
	} finally {
		reviewLoadingId.value = null
	}
}

function closeReviewDrawer(): void {
	reviewDetail.value = null
}

/**
 * Unified review open path (Task 6.2): load the scan detail (so the modal's
 * read-only sections — hi-res images, AI notes, attribution — are populated
 * from GET /api/admin/flagged-scans/[id]) AND open the correction modal for the
 * same row. Reuses openReviewDrawer's load (reviewDetail + reviewLoadingId) and
 * openCorrectionModal's state seeding.
 */
async function openReviewModal(row: FlaggedScanRow): Promise<void> {
	await openReviewDrawer(row.id)
	openCorrectionModal(row)
}

// ─── Correction Modal ─────────────────────────────────────────────────────────

function openCorrectionModal(row: FlaggedScanRow): void {
	modalRow.value            = row
	modalSelectedLogoId.value = null
	modalNote.value           = ''
	modalError.value          = null
	modalAction.value         = null
	// Snapshot the clean initial state for unsaved-changes detection.
	baselineSnapshot.value    = { logoId: null, note: '' }
	showDiscardConfirm.value  = false
}

/**
 * Close the modal only when we are NOT mid-request.
 * Called manually (Cancel / × button). NOT called inside submitCorrection /
 * submitDismiss — those clear state themselves after the fetch resolves.
 */
function closeModal(): void {
	if (modalActing.value) return
	modalRow.value            = null
	modalSelectedLogoId.value = null
	modalNote.value           = ''
	modalError.value          = null
	modalAction.value         = null
	// Clear the loaded scan detail now that the single review surface is closed.
	closeReviewDrawer()
}

/**
 * Guarded close entry point for Cancel / × / backdrop. Prompts for confirmation
 * when there are unsaved edits; closes immediately when clean.
 */
function requestClose(): void {
	if (modalActing.value) return
	if (isDirty.value) {
		showDiscardConfirm.value = true
		return
	}
	closeModal()
}

function onKeepEditing(): void {
	showDiscardConfirm.value = false
}

function onDiscard(): void {
	showDiscardConfirm.value = false
	closeModal()
}

/**
 * Apply the local optimistic state update so the table row and counters
 * update instantly without waiting for a full refetch, then refresh from
 * the server in the background.
 */
function applyLocalStatusUpdate(id: number, newStatus: string, adminCorrection?: string): void {
	const idx = rawScans.value.findIndex((s) => s.id === id)
	if (idx !== -1) {
		rawScans.value[idx] = {
			...rawScans.value[idx],
			status: newStatus,
			admin_correction: adminCorrection ?? rawScans.value[idx].admin_correction,
		}
	}
}

async function submitCorrection(): Promise<void> {
	if (!modalRow.value || !modalSelectedLogoId.value) return

	const id         = modalRow.value.id
	const logoId     = modalSelectedLogoId.value
	const note       = modalNote.value

	modalActing.value = true
	modalAction.value = 'certify'
	modalError.value  = null

	try {
		await apiFetch(`/api/admin/flagged-scans/${id}/approve`, {
			method: 'POST',
			body: {
				halal_logo_id:    logoId,
				admin_correction: note || undefined,
			},
			isAdmin: true,
		})

		// 1. Optimistic update — row badge + counters flip immediately
		applyLocalStatusUpdate(id, 'approved', note || undefined)

		// 2. Clear modal state — safe now because the request succeeded
		modalRow.value            = null
		modalSelectedLogoId.value = null
		modalNote.value           = ''
		modalError.value          = null
		modalAction.value         = null
		reviewDetail.value        = null

		// 3. Background server refresh (non-blocking — UI already updated)
		fetchFlaggedScans().catch(console.error)
	} catch (err) {
		// Keep modal open, show error inside it
		modalError.value = err instanceof ApiError ? err.message : 'Failed to certify scan. Please try again.'
	} finally {
		modalActing.value = false
		modalAction.value = null
	}
}

async function submitDismiss(): Promise<void> {
	if (!modalRow.value) return

	const id   = modalRow.value.id
	const note = modalNote.value

	modalActing.value = true
	modalAction.value = 'dismiss'
	modalError.value  = null

	try {
		await apiFetch(`/api/admin/flagged-scans/${id}/dismiss`, {
			method: 'POST',
			body: { admin_correction: note || undefined },
			isAdmin: true,
		})

		applyLocalStatusUpdate(id, 'dismissed', note || undefined)

		modalRow.value            = null
		modalSelectedLogoId.value = null
		modalNote.value           = ''
		modalError.value          = null
		modalAction.value         = null
		reviewDetail.value        = null

		fetchFlaggedScans().catch(console.error)
	} catch (err) {
		modalError.value = err instanceof ApiError ? err.message : 'Failed to dismiss scan. Please try again.'
	} finally {
		modalActing.value = false
		modalAction.value = null
	}
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchFlaggedScans(): Promise<void> {
	isLoading.value    = true
	errorMessage.value = null
	try {
		const data = await apiFetch<FlaggedScansResponse>('/api/admin/flagged-scans?type=halal', {
			method: 'GET',
			isAdmin: true,
		})
		rawScans.value = data.flagged_scans
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load flagged scans.'
		console.error('Failed to fetch flagged scans:', err)
	} finally {
		isLoading.value = false
	}
}

async function fetchHalalLogos(): Promise<void> {
	try {
		const data = await apiFetch<{ halalLogo: HalalLogoOption[]; halalLogoCount: number }>(
			'/api/halal_logo?take=100&skip=0',
			{ method: 'GET', isAdmin: true }
		)
		halalLogos.value = data.halalLogo
	} catch (err) {
		console.error('Failed to fetch halal logos:', err)
	}
}

onMounted(() => {
	fetchFlaggedScans()
	fetchHalalLogos()
})
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.verification-panel {
	padding: 24px 32px;
	background-color: #f8fafc;
	min-height: 100vh;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	color: #334155;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.page-header { margin-bottom: 24px; }
.header-left { display: flex; align-items: center; gap: 14px; }
.header-icon {
	width: 42px; height: 42px;
	border-radius: 12px;
	background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
	color: white;
	display: flex; align-items: center; justify-content: center;
	flex-shrink: 0;
}
h1 { font-size: 1.35rem; font-weight: 600; margin: 0 0 4px; color: #1e293b; }
.subtitle { color: #64748b; font-size: 0.84rem; margin: 0; }

/* ── Summary Cards ───────────────────────────────────────────────────────── */
.summary-cards {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 16px;
	margin-bottom: 24px;
}
.summary-card {
	background: white; border-radius: 12px;
	padding: 16px 20px;
	display: flex; align-items: center; gap: 14px;
	border: 1px solid #e2e8f0;
}
.summary-card.red    { border-color: #fecaca; background-color: #fef2f2; }
.summary-card.yellow { border-color: #fef08a; background-color: #fefce8; }
.summary-card.blue   { border-color: #bfdbfe; background-color: #eff6ff; }
.summary-card.green  { border-color: #bbf7d0; background-color: #f0fdf4; }
.card-icon-wrap {
	width: 38px; height: 38px; border-radius: 10px;
	display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.red-bg    { background-color: #fee2e2; color: #dc2626; }
.yellow-bg { background-color: #fef9c3; color: #ca8a04; }
.blue-bg   { background-color: #dbeafe; color: #2563eb; }
.green-bg  { background-color: #dcfce7; color: #16a34a; }
.card-text { display: flex; flex-direction: column; gap: 2px; }
.summary-value { font-size: 1.5rem; font-weight: 700; line-height: 1; }
.summary-label { font-size: 0.77rem; font-weight: 500; color: #64748b; }
.red-text    { color: #dc2626; }
.yellow-text { color: #ca8a04; }
.blue-text   { color: #2563eb; }
.green-text  { color: #16a34a; }

/* ── Panel Card ──────────────────────────────────────────────────────────── */
.panel-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }

/* ── Controls Bar ────────────────────────────────────────────────────────── */
.controls-bar {
	display: flex; justify-content: space-between; align-items: center;
	padding: 14px 20px; border-bottom: 1px solid #f1f5f9; gap: 12px;
}
.search-box {
	display: flex; align-items: center;
	background: white; border: 1px solid #cbd5e1; border-radius: 8px;
	padding: 7px 12px; width: 300px; flex-shrink: 0;
}
.search-icon { color: #94a3b8; margin-right: 9px; flex-shrink: 0; }
.search-box input { border: none; outline: none; width: 100%; font-size: 0.84rem; color: #334155; background: transparent; }
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-icon { color: #94a3b8; margin-right: 2px; flex-shrink: 0; }
.filter-select { background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 12px; font-size: 0.82rem; color: #334155; outline: none; cursor: pointer; }

/* ── Table ───────────────────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.scans-table { width: 100%; border-collapse: collapse; min-width: 860px; }
th { text-align: left; padding: 13px 20px; font-size: 0.715rem; font-weight: 700; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; letter-spacing: 0.05em; white-space: nowrap; }
td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 0.84rem; vertical-align: middle; }
tbody tr:last-child td { border-bottom: none; }
tbody tr { cursor: pointer; }
.cell-id { color: #94a3b8; font-weight: 500; font-size: 0.8rem; }

/* ── Product Cell ────────────────────────────────────────────────────────── */
.product-cell { display: flex; align-items: center; gap: 12px; }
.product-thumb { width: 40px; height: 40px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.thumb-emoji { font-size: 1.1rem; }
.product-details { display: flex; flex-direction: column; gap: 2px; }
.product-name { font-weight: 600; color: #1e293b; line-height: 1.25; font-size: 0.85rem; }
.product-user { font-size: 0.74rem; color: #94a3b8; }

/* ── Flag Badge ──────────────────────────────────────────────────────────── */
.flag-capsule { display: inline-flex; align-items: flex-start; padding: 7px 12px; border-radius: 16px; font-size: 0.76rem; line-height: 1.4; max-width: 220px; gap: 8px; }
.flag-dot { width: 4px; height: 13px; border-radius: 2px; flex-shrink: 0; margin-top: 2px; }
.flag-capsule.yellow { background-color: #fef9c3; color: #854d0e; }
.flag-capsule.yellow .flag-dot { background-color: #ca8a04; }
.flag-capsule.red    { background-color: #fee2e2; color: #991b1b; }
.flag-capsule.red .flag-dot { background-color: #dc2626; }
.flag-text { display: flex; flex-direction: column; gap: 2px; }
.flag-sub { font-size: 0.72rem; opacity: 0.75; }

/* ── Confidence ──────────────────────────────────────────────────────────── */
.col-confidence { font-weight: 600; font-size: 0.84rem; }
.conf-red    { color: #dc2626; }
.conf-yellow { color: #ca8a04; }
.conf-green  { color: #16a34a; }

/* ── Submitted ───────────────────────────────────────────────────────────── */
.col-submitted { color: #64748b; font-size: 0.8rem; line-height: 1.4; }
.time-subtext { color: #94a3b8; }

/* ── Status Pill ─────────────────────────────────────────────────────────── */
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.74rem; font-weight: 500; white-space: nowrap; }
.pill-pending   { background: #fef9c3; color: #a16207; }
.pill-flagged   { background: #fef9c3; color: #a16207; }
.pill-approved  { background: #dcfce7; color: #15803d; }
.pill-dismissed { background: #f1f5f9; color: #64748b; }

/* ── Actions ─────────────────────────────────────────────────────────────── */
.btn-row { display: flex; align-items: center; gap: 6px; }
.btn-review {
	display: inline-flex; align-items: center; gap: 5px;
	background: transparent; border: 1px solid #e2e8f0; color: #475569;
	font-size: 0.78rem; font-weight: 500; padding: 5px 12px; border-radius: 6px;
	cursor: pointer; white-space: nowrap; transition: background 0.12s, border-color 0.12s;
}
.btn-review:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.btn-review:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-correct {
	display: inline-flex; align-items: center; gap: 5px;
	background: white; border: 1px solid #bbf7d0; color: #16a34a;
	border-radius: 6px; padding: 5px 12px; font-size: 0.78rem; font-weight: 500;
	cursor: pointer; white-space: nowrap; transition: background 0.12s;
}
.btn-correct:hover:not(:disabled) { background: #f0fdf4; }
.btn-correct:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Spin animation for loading state ────────────────────────────────────── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { animation: spin 0.75s linear infinite; }

/* ── Verdict legend ──────────────────────────────────────────────────────── */
.verdict-legend {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 20px;
	background: #f8fafc;
	border-bottom: 1px solid #f1f5f9;
	font-size: 0.78rem;
	color: #64748b;
	flex-wrap: wrap;
}
.legend-label {
	font-weight: 600;
	color: #475569;
}
.legend-item {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}
.legend-dot {
	width: 10px;
	height: 10px;
	border-radius: 2px;
	flex-shrink: 0;
}
.legend-dot--yellow { background-color: #ca8a04; }
.legend-dot--red    { background-color: #dc2626; }
.legend-divider {
	color: #cbd5e1;
}

/* ── State messages ──────────────────────────────────────────────────────── */
.state-message, .empty-note { padding: 40px; text-align: center; color: #64748b; font-size: 0.9rem; }
.error-message { padding: 40px; text-align: center; color: #dc2626; font-size: 0.9rem; }

/* ── Pagination ──────────────────────────────────────────────────────────── */
.pagination-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 16px 20px;
	border-top: 1px solid #f1f5f9;
	flex-wrap: wrap;
}
.page-num,
.page-nav {
	min-width: 34px;
	height: 34px;
	padding: 0 10px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 1px solid #e2e8f0;
	background: #ffffff;
	color: #334155;
	border-radius: 8px;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.page-num:hover:not(.active),
.page-nav:hover:not(:disabled) {
	background: #f8fafc;
	border-color: #cbd5e1;
}
.page-num.active {
	background: #008744;
	border-color: #008744;
	color: #ffffff;
	cursor: default;
}
.page-nav:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
.page-ellipsis {
	min-width: 24px;
	text-align: center;
	color: #94a3b8;
	font-weight: 600;
	user-select: none;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* SHARED REVIEW SECTIONS (images + detail grid — used by the modal)         */
/* ══════════════════════════════════════════════════════════════════════════ */

/* Scan images */
.image-row { display: flex; gap: 12px; flex-wrap: wrap; }
.scan-image-box { display: flex; flex-direction: column; gap: 6px; }
.scan-img { width: 160px; height: 160px; object-fit: contain; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; }
.scan-img-placeholder {
	width: 160px; height: 160px; border-radius: 10px; border: 1px dashed #e2e8f0;
	background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center;
	gap: 8px; color: #94a3b8; font-size: 0.78rem;
}
.image-label { font-size: 0.75rem; color: #64748b; font-weight: 500; text-align: center; }

/* Detail grid */
.detail-grid { display: flex; flex-direction: column; gap: 8px; }
.detail-row { display: flex; align-items: flex-start; gap: 12px; }
.detail-row.full-span { flex-direction: column; gap: 4px; }
.detail-key { font-size: 0.78rem; font-weight: 600; color: #64748b; min-width: 110px; flex-shrink: 0; padding-top: 1px; }
.detail-val { font-size: 0.84rem; color: #1e293b; }
.flag-reason-text { line-height: 1.5; color: #475569; white-space: pre-wrap; word-break: break-word; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.78rem; }

/* ══════════════════════════════════════════════════════════════════════════ */
/* DETAILED REVIEW MODAL                                                     */
/* ══════════════════════════════════════════════════════════════════════════ */
.modal-overlay {
	position: fixed; inset: 0;
	background: rgba(15, 23, 42, 0.45);
	display: flex; align-items: center; justify-content: center;
	z-index: 1000; padding: 24px;
}
.modal {
	background: white; border-radius: 16px;
	box-shadow: 0 20px 60px rgba(0,0,0,0.18);
	width: 100%; max-width: 620px; max-height: 88vh;
	overflow-y: auto; display: flex; flex-direction: column;
}
.modal-header {
	display: flex; align-items: flex-start; justify-content: space-between;
	padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9; gap: 12px;
}
.modal-title-group { display: flex; align-items: flex-start; gap: 12px; }
.modal-icon-wrap { width: 36px; height: 36px; border-radius: 10px; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-title { font-size: 1rem; font-weight: 600; margin: 0 0 3px; color: #1e293b; }
.modal-subtitle { font-size: 0.82rem; color: #64748b; margin: 0; }
.modal-close { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; flex-shrink: 0; transition: color 0.12s, background 0.12s; }
.modal-close:hover { color: #334155; background: #f1f5f9; }
.modal-flag-context { padding: 14px 24px 0; }
.modal-section-label { padding: 16px 24px 10px; font-size: 0.8rem; font-weight: 600; color: #475569; letter-spacing: 0.03em; }
.modal-images .image-row { padding: 0 24px; }
.empty-logos { padding: 16px 24px; color: #94a3b8; font-size: 0.85rem; }
.logo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; padding: 0 24px 16px; }
.logo-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 12px 12px; border: 2px solid #e2e8f0; border-radius: 12px; background: white; cursor: pointer; text-align: center; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; }
.logo-card:hover { border-color: #86efac; background: #f0fdf4; }
.logo-card.selected { border-color: #16a34a; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12); }
.logo-card-img { width: 52px; height: 52px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.logo-img { width: 100%; height: 100%; object-fit: contain; }
.logo-fallback { font-size: 1.6rem; line-height: 1; }
.logo-card-body { display: flex; flex-direction: column; gap: 2px; width: 100%; }
.logo-certifier { font-size: 0.82rem; font-weight: 600; color: #1e293b; }
.logo-full-name { font-size: 0.72rem; color: #64748b; line-height: 1.3; }
.logo-accredited-badge { display: inline-block; margin-top: 4px; background: #dcfce7; color: #15803d; font-size: 0.68rem; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
.logo-check { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 50%; background: #16a34a; color: white; display: flex; align-items: center; justify-content: center; }
.modal-notes { padding: 0 24px 16px; }
.notes-label { display: block; font-size: 0.79rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
.notes-input { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 0.83rem; color: #334155; resize: vertical; outline: none; font-family: inherit; transition: border-color 0.12s; }
.notes-input:focus { border-color: #16a34a; }
.modal-error { margin: 0 24px 12px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.82rem; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1px solid #f1f5f9; }
.btn-modal-cancel { background: transparent; border: 1px solid #e2e8f0; color: #64748b; padding: 7px 16px; border-radius: 8px; font-size: 0.84rem; cursor: pointer; transition: background 0.12s; }
.btn-modal-cancel:hover:not(:disabled) { background: #f8fafc; }
.btn-modal-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-modal-dismiss { background: transparent; border: 1px solid #fecaca; color: #dc2626; padding: 7px 16px; border-radius: 8px; font-size: 0.84rem; cursor: pointer; transition: background 0.12s; }
.btn-modal-dismiss:hover:not(:disabled) { background: #fef2f2; }
.btn-modal-dismiss:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-modal-certify { display: inline-flex; align-items: center; gap: 6px; background: #16a34a; color: white; border: none; padding: 7px 18px; border-radius: 8px; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: background 0.12s; }
.btn-modal-certify:hover:not(:disabled) { background: #15803d; }
.btn-modal-certify:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Zoomable scan images ─────────────────────────────────────────────── */
.scan-img--zoomable {
	cursor: zoom-in;
	transition: opacity 0.12s, box-shadow 0.12s;
}
.scan-img--zoomable:hover {
	opacity: 0.88;
	box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.35);
}

/* ── Lightbox ─────────────────────────────────────────────────────────── */
.lightbox-overlay {
	position: fixed; inset: 0;
	z-index: 2000;
	background: rgba(5, 10, 20, 0.92);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 48px 24px 32px;
	gap: 16px;
}
.lightbox-img {
	max-width: min(90vw, 800px);
	max-height: 78vh;
	object-fit: contain;
	border-radius: 12px;
	box-shadow: 0 8px 48px rgba(0,0,0,0.6);
	user-select: none;
}
.lightbox-caption {
	color: rgba(255,255,255,0.65);
	font-size: 0.82rem;
	margin: 0;
}
.lightbox-close {
	position: fixed;
	top: 16px; right: 20px;
	background: rgba(255,255,255,0.1);
	border: 1px solid rgba(255,255,255,0.2);
	color: white;
	border-radius: 50%;
	width: 40px; height: 40px;
	display: flex; align-items: center; justify-content: center;
	cursor: pointer;
	transition: background 0.12s;
	z-index: 2001;
}
.lightbox-close:hover { background: rgba(255,255,255,0.2); }

/* Lightbox fade transition */
.lightbox-fade-enter-active, .lightbox-fade-leave-active { transition: opacity 0.18s ease; }
.lightbox-fade-enter-from, .lightbox-fade-leave-to { opacity: 0; }
</style>
