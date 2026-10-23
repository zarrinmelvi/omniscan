<template>
	<div class="vp-root">

		<!-- ── Page Header ────────────────────────────────────────── -->
		<div class="vp-header">
			<h1 class="vp-title">Exceptions queue</h1>
			<p class="vp-subtitle">The AI resolves most scans on its own. Only what it could not settle reaches you.</p>
		</div>

		<!-- ── 4 Queue Metric Cards ───────────────────────────────── -->
		<div class="queue-metrics">
			<div class="qm-card">
				<div class="qm-label">Auto-resolved by AI</div>
				<div class="qm-value qm-value--neutral">{{ queueMetrics.autoResolved }}%</div>
				<div class="qm-sub">no admin action needed</div>
			</div>
			<div class="qm-card qm-card--clickable" @click="activeTab = 'unmatched'">
				<div class="qm-label">Needs your decision</div>
				<div class="qm-value qm-value--green">{{ queueMetrics.needsDecision }}</div>
				<div class="qm-sub">distinct logos, covering {{ queueMetrics.needsDecisionScans }} scans</div>
			</div>
			<div class="qm-card qm-card--clickable" @click="showAwaitingRescan = true">
				<div class="qm-label">Awaiting Consumer rescan</div>
				<div class="qm-value qm-value--neutral">{{ queueMetrics.awaitingRescan }}</div>
				<div class="qm-sub">unclear scans, not yours to review</div>
			</div>
			<div class="qm-card">
				<div class="qm-label">Resolved this week</div>
				<div class="qm-value qm-value--neutral">{{ queueMetrics.resolvedThisWeek }}</div>
				<div class="qm-sub">each one cleared many scans</div>
			</div>
		</div>

		<!-- ── Tab Filter Row ─────────────────────────────────────── -->
		<div class="tab-row">
			<button
				class="tab-btn"
				:class="{ 'tab-btn--active': activeTab === 'unmatched' }"
				@click="activeTab = 'unmatched'">
				Unmatched logos · {{ unmatchedCards.length }}
			</button>
			<button
				class="tab-btn"
				:class="{ 'tab-btn--active': activeTab === 'duplicates' }"
				@click="activeTab = 'duplicates'">
				Possible duplicates · {{ duplicateCards.length }}
			</button>
		</div>

		<!-- ── Main single-col layout ────────────────────────────── -->
		<div class="vp-body">

			<!-- queue cards -->
			<div class="vp-queue">

				<div v-if="isLoading" class="sk-stack">
					<div v-for="n in 3" :key="n" class="sk-card shimmer"></div>
				</div>

				<div v-else-if="activeTabCards.length === 0" class="vp-empty-state">
					<svg class="vp-empty-icon" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
						<polyline points="22 4 12 14.01 9 11.01"/>
					</svg>
					<div class="vp-empty-title">No decisions needed</div>
					<div class="vp-empty-sub">The AI resolved every scan. New items appear here automatically.</div>
				</div>

				<template v-else>
					<div
						v-for="(card, idx) in activeTabCards"
						:key="card.id"
						class="logo-card"
						:class="{ 'logo-card--expanded': expandedId === card.id }">

						<!-- COLLAPSED state -->
						<template v-if="expandedId !== card.id">
							<div class="logo-card-collapsed">
								<div class="logo-thumb">
									<img v-if="card.thumb" :src="card.thumb" :alt="card.title" class="logo-img" />
									<span v-else class="logo-placeholder">Logo</span>
								</div>
								<div class="logo-collapsed-info">
									<div class="logo-card-title">{{ card.title }}</div>
									<div class="logo-card-meta">{{ card.scanCount }} scans · {{ card.productCount }} products · {{ card.consumerCount }} Consumers</div>
								</div>
								<button class="btn-review" @click="expandCard(card.id, idx)">Review</button>
							</div>
						</template>

						<!-- EXPANDED state -->
						<template v-else>
							<div class="logo-card-expanded">
								<div class="logo-expanded-top">
									<div class="logo-thumb-lg">
										<img v-if="card.thumb" :src="card.thumb" :alt="card.title" class="logo-img" />
										<div v-else class="logo-crop-placeholder">
											<span>Logo crop</span>
										</div>
									</div>
									<div class="logo-expanded-info">
										<div class="logo-expanded-header">
											<span class="logo-card-title">{{ card.title }}</span>
											<span class="needs-decision-badge">Needs decision</span>
										</div>
										<div class="logo-stats">
											Seen on <strong>{{ card.scanCount }} scans</strong> · <strong>{{ card.productCount }} products</strong> · <strong>{{ card.consumerCount }} Consumers</strong>
										</div>
										<div class="logo-examples">
											Example products: {{ card.examples.join(', ') }}
										</div>
									</div>
								</div>

								<!-- Action buttons -->
								<div class="logo-actions">
									<button class="btn-add-certifier" @click="openAddDialog(card)">Add to certifier registry</button>
									<button class="btn-outline" @click="openNotHalalDialog(card)">Not a Halal certifier</button>
								</div>

								<!-- Impact banner -->
								<div class="impact-banner">
									If you add it: <strong>{{ card.productCount }} products update automatically</strong> and <strong>{{ card.consumerCount }} Consumers are notified</strong> of the new verdict.
								</div>
							</div>
						</template>

					</div>
				</template>
			</div>

		</div>

		<!-- ── Awaiting Rescan read-only list ─────────────────────── -->
		<Teleport to="body">
			<div v-if="showAwaitingRescan" class="modal-overlay" @click.self="showAwaitingRescan = false">
				<div class="modal-box">
					<div class="modal-box-header">
						<span class="modal-box-title">Awaiting Consumer rescan</span>
						<button class="modal-close-btn" @click="showAwaitingRescan = false">✕</button>
					</div>
					<p class="modal-box-sub">These scans are unclear — Consumers have been asked to re-upload. No action needed from you.</p>
					<div v-if="awaitingRescanItems.length === 0" class="modal-empty">No items awaiting rescan.</div>
					<div v-else class="awaiting-list">
						<div v-for="item in awaitingRescanItems" :key="item.id" class="awaiting-row">
							<span class="awaiting-product">{{ item.product_name }}</span>
							<span class="awaiting-badge">Awaiting rescan</span>
						</div>
					</div>
					<div class="modal-box-footer">
						<button class="btn-modal-secondary" @click="showAwaitingRescan = false">Close</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ── Add to certifier registry dialog ───────────────────── -->
		<Teleport to="body">
			<div v-if="addDialog.open" class="modal-overlay" @click.self="addDialog.open = false">
				<div class="modal-box">
					<div class="modal-box-title">Add this logo to the registry?</div>
					<p class="modal-box-body">Name this certifier so the AI can recognize it on future scans. {{ addDialog.card?.productCount }} products will update automatically and {{ addDialog.card?.consumerCount }} Consumers will be notified. This is recorded in System Logs.</p>
					<div class="dialog-field">
						<label class="dialog-label">Certifier code</label>
						<input class="dialog-input" v-model="addDialog.certifier" placeholder="e.g. JAKIM" />
					</div>
					<div class="dialog-field">
						<label class="dialog-label">Full name</label>
						<input class="dialog-input" v-model="addDialog.full_name" placeholder="e.g. Jabatan Kemajuan Islam Malaysia" />
					</div>
					<div class="dialog-field">
						<label class="dialog-label">Official source URL</label>
						<input class="dialog-input" v-model="addDialog.source_url" placeholder="https://…" />
					</div>
					<p class="dialog-error" v-if="addDialog.error">{{ addDialog.error }}</p>
					<div class="modal-box-actions">
						<button class="btn-modal-secondary" :disabled="addDialog.saving" @click="addDialog.open = false">Cancel</button>
						<button class="btn-modal-primary" :disabled="addDialog.saving || !addDialog.certifier.trim()" @click="confirmAddCertifier">{{ addDialog.saving ? 'Adding…' : 'Confirm and add' }}</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ── Not a Halal certifier dialog ───────────────────────── -->
		<Teleport to="body">
			<div v-if="notHalalDialog.open" class="modal-overlay" @click.self="notHalalDialog.open = false">
				<div class="modal-box">
					<div class="modal-box-title">Mark as not a Halal certifier?</div>
					<p class="modal-box-body">Please provide a short reason so it can be noted in the audit log.</p>
					<textarea v-model="notHalalDialog.reason" class="dialog-textarea" placeholder="e.g. Logo belongs to a non-food brand, not a Halal certifier." rows="3"></textarea>
					<div class="modal-box-actions">
						<button class="btn-modal-secondary" @click="notHalalDialog.open = false">Cancel</button>
						<button class="btn-modal-primary" @click="confirmNotHalal">Confirm</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ── Toast ──────────────────────────────────────────────── -->
		<Teleport to="body">
			<Transition name="toast-fade">
				<div v-if="toast.visible" class="vp-toast">{{ toast.message }}</div>
			</Transition>
		</Teleport>

	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFetch, ApiError } from '@/utils/api'
import { useAdminAuthStore } from '@/stores/adminAuthStore'

// ── Types ────────────────────────────────────────────────────────────────
interface FlaggedScanRaw {
	id: number
	product_name: string
	brand_name: string
	flag_reason: string
	clean_flag_reason: string
	status: string
	safety_verdict: string | null
	ai_confidence_score: number | null
	scanned_by: string
	admin_correction: string | null
	created_at: string
	halal_flag_type: string
	image_base64: string | null
	image_base64_back: string | null
}

interface ServerCard {
	id: number
	title: string
	scanCount: number
	productCount: number
	consumerCount: number
	examples: string[]
	thumb: string | null
	rawIds: number[]
}

interface QueueMetricsRaw {
	auto_resolved_pct: number
	needs_decision: number
	needs_decision_scans: number
	awaiting_rescan: number
	resolved_this_week: number
}

interface QueueCard {
	id: number
	title: string
	scanCount: number
	productCount: number
	consumerCount: number
	examples: string[]
	thumb: string | null
	type: 'unmatched' | 'duplicate' | 'training'
	rawIds: number[]
}

// ── State ────────────────────────────────────────────────────────────────
const route = useRoute()
const router = useRouter()
const adminStore = useAdminAuthStore()
const adminName = computed(() => adminStore.admin?.full_name ?? 'Admin')

const rawScans = ref<FlaggedScanRaw[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

// Server-provided queue data (the single source of truth now)
const metrics = ref<QueueMetricsRaw | null>(null)
const unmatchedCardsData = ref<ServerCard[]>([])
const duplicateCardsData = ref<ServerCard[]>([])
const trainingCardsData = ref<ServerCard[]>([])

type TabType = 'unmatched' | 'duplicates'
const activeTab = ref<TabType>('unmatched')
const expandedId = ref<number | null>(null)

const showAwaitingRescan = ref(false)

const addDialog = ref<{ open: boolean; card: QueueCard | null; certifier: string; full_name: string; source_url: string; saving: boolean; error: string | null }>({ open: false, card: null, certifier: '', full_name: '', source_url: '', saving: false, error: null })
const notHalalDialog = ref<{ open: boolean; card: QueueCard | null; reason: string }>({ open: false, card: null, reason: '' })

const toast = ref({ visible: false, message: '' })

// IDs that have been resolved (removed from queue after action)
const resolvedIds = ref<Set<number>>(new Set())

// ── Queue metrics ────────────────────────────────────────────────────────
const queueMetrics = computed(() => {
	const m = metrics.value
	const visibleUnmatched = unmatchedCards.value
	const needsDecisionScans = m?.needs_decision_scans ?? visibleUnmatched.reduce((sum, c) => sum + c.scanCount, 0)
	return {
		autoResolved: m?.auto_resolved_pct ?? 0,
		needsDecision: visibleUnmatched.length,
		needsDecisionScans,
		awaitingRescan: m?.awaiting_rescan ?? 0,
		resolvedThisWeek: m?.resolved_this_week ?? 0,
	}
})

// ── Queue cards sourced from the server, filtered by optimistic removals ──
function mapServerCard(c: ServerCard, type: QueueCard['type']): QueueCard {
	return {
		id: c.id,
		title: c.title,
		scanCount: c.scanCount,
		productCount: c.productCount,
		consumerCount: c.consumerCount,
		examples: c.examples,
		thumb: c.thumb,
		type,
		rawIds: c.rawIds,
	}
}

const unmatchedCards = computed<QueueCard[]>(() =>
	unmatchedCardsData.value
		.filter((c) => !resolvedIds.value.has(c.id))
		.map((c) => mapServerCard(c, 'unmatched'))
)

const duplicateCards = computed<QueueCard[]>(() =>
	duplicateCardsData.value
		.filter((c) => !resolvedIds.value.has(c.id))
		.map((c) => mapServerCard(c, 'duplicate'))
)

const trainingCards = computed<QueueCard[]>(() =>
	trainingCardsData.value
		.filter((c) => !resolvedIds.value.has(c.id))
		.map((c) => mapServerCard(c, 'training'))
)

const activeTabCards = computed<QueueCard[]>(() => {
	if (activeTab.value === 'unmatched') return unmatchedCards.value
	return duplicateCards.value
})

const awaitingRescanItems = computed(() =>
	rawScans.value.filter((s) => s.status === 'awaiting_rescan').map((s) => ({ id: s.id, product_name: s.product_name }))
)

// ── Card expand / deep-link ──────────────────────────────────────────────
function expandCard(id: number, _idx: number): void {
	expandedId.value = expandedId.value === id ? null : id
}

// ── Dialog actions ───────────────────────────────────────────────────────
function openAddDialog(card: QueueCard): void {
	addDialog.value = { open: true, card, certifier: '', full_name: '', source_url: '', saving: false, error: null }
}

function openNotHalalDialog(card: QueueCard): void {
	notHalalDialog.value = { open: true, card, reason: '' }
}

function showToast(msg: string): void {
	toast.value = { visible: true, message: msg }
	setTimeout(() => { toast.value.visible = false }, 3500)
}

async function confirmAddCertifier(): Promise<void> {
	const card = addDialog.value.card
	if (!card) return
	const certifier = addDialog.value.certifier.trim()
	const fullName = addDialog.value.full_name.trim()
	const sourceUrl = addDialog.value.source_url.trim()
	if (!certifier) { addDialog.value.error = 'Certifier code is required.'; return }
	addDialog.value.saving = true
	addDialog.value.error = null
	try {
		await apiFetch('/api/halal_logo', {
			method: 'POST',
			isAdmin: true,
			body: {
				certifier,
				full_name: fullName,
				source_url: sourceUrl,
				...(sourceUrl ? { direct_logo_url: sourceUrl } : {}),
			},
		})
		addDialog.value.open = false
		// Remove the resolved card from the queue (optimistic) and refresh real data.
		resolvedIds.value = new Set([...resolvedIds.value, card.id])
		expandedId.value = null
		showToast(`Certifier "${certifier}" added. ${card.productCount} products will update.`)
		await fetchQueue()
	} catch (err) {
		addDialog.value.error = err instanceof ApiError ? err.message : 'Failed to add certifier. It may already exist.'
	} finally {
		addDialog.value.saving = false
	}
}

function confirmNotHalal(): void {
	const card = notHalalDialog.value.card
	if (!card) return
	notHalalDialog.value.open = false
	resolvedIds.value = new Set([...resolvedIds.value, card.id])
	expandedId.value = null
	showToast('Marked as not a Halal certifier.')
}

// ── API ──────────────────────────────────────────────────────────────────
async function fetchQueue(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		// Primary source of truth: the live verification queue endpoint.
		const data = await apiFetch<{
			metrics: QueueMetricsRaw
			unmatched: ServerCard[]
			duplicates: ServerCard[]
			training: ServerCard[]
		}>('/api/admin/verification-queue', { method: 'GET', isAdmin: true })
		metrics.value = data.metrics
		unmatchedCardsData.value = data.unmatched
		duplicateCardsData.value = data.duplicates
		trainingCardsData.value = data.training

		// The awaiting-rescan read-only modal list isn't part of the queue
		// endpoint payload, so fetch flagged scans for that list only.
		try {
			const flags = await apiFetch<{ flagged_scans: FlaggedScanRaw[] }>(
				'/api/admin/flagged-scans?type=all',
				{ method: 'GET', isAdmin: true }
			)
			rawScans.value = flags.flagged_scans
		} catch {
			rawScans.value = []
		}
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load queue.'
	} finally {
		isLoading.value = false
	}
}

// ── URL query params → tab/card deep-link ───────────────────────────────
onMounted(async () => {
	await fetchQueue()

	const tabParam = route.query.tab as string | undefined
	if (tabParam === 'needs-decision') activeTab.value = 'unmatched'
	else if (tabParam === 'possible-duplicates') activeTab.value = 'duplicates'

	const cardParam = route.query.card
	if (cardParam) {
		const id = Number(cardParam)
		// Try to find matching card across all tabs and expand it
		const allCards = [...unmatchedCards.value, ...duplicateCards.value, ...trainingCards.value]
		const match = allCards.find((c) => c.id === id || c.rawIds.includes(id))
		if (match) {
			// Set the right tab
			activeTab.value = match.type === 'duplicate' ? 'duplicates' : 'unmatched'
			expandedId.value = match.id
		}
	}
})

watch(() => route.query, (q) => {
	if (q.tab === 'needs-decision') activeTab.value = 'unmatched'
	else if (q.tab === 'possible-duplicates') activeTab.value = 'duplicates'
})
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────── */
.vp-root {
	padding: 24px 32px;
	background: #fafafa;
	min-height: 100vh;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.vp-header { margin-bottom: 20px; }
.vp-title {
	font-size: 1.75rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 6px;
	letter-spacing: -0.02em;
}
.vp-subtitle {
	font-size: 0.875rem;
	color: #6b7280;
	margin: 0;
}

/* ── Queue metrics ────────────────────────────────────── */
.queue-metrics {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 14px;
	margin-bottom: 22px;
}
@media (max-width: 900px) { .queue-metrics { grid-template-columns: repeat(2, 1fr); } }

.qm-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 18px 20px;
}
.qm-card--clickable { cursor: pointer; transition: box-shadow 0.15s; }
.qm-card--clickable:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); border-color: #d1d5db; }
.qm-label {
	font-size: 0.75rem;
	color: #9ca3af;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	margin-bottom: 6px;
}
.qm-value {
	font-size: 2.1rem;
	font-weight: 700;
	line-height: 1;
	margin-bottom: 4px;
}
.qm-value--green { color: #008744; }
.qm-value--neutral { color: #111827; }
.qm-sub { font-size: 0.75rem; color: #9ca3af; }

/* ── Tab row ──────────────────────────────────────────── */
.tab-row {
	display: flex;
	gap: 8px;
	margin-bottom: 20px;
	flex-wrap: wrap;
}
.tab-btn {
	padding: 8px 18px;
	border-radius: 9999px;
	border: 1px solid #e5e7eb;
	background: transparent;
	color: #6b7280;
	font-size: 0.85rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s;
}
.tab-btn--active {
	background: #008744;
	color: #ffffff;
	border-color: #008744;
	font-weight: 600;
}

/* ── Body single-col ──────────────────────────────────── */
.vp-body {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
@media (max-width: 1100px) { .vp-body { flex-direction: column; } }

.vp-queue { display: flex; flex-direction: column; gap: 12px; }
.vp-empty { color: #9ca3af; font-size: 0.875rem; padding: 24px 0; }

/* ── Empty state ──────────────────────────────────────── */
.vp-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 24px; text-align:center; gap:10px; }
.vp-empty-icon { color:#16a34a; margin-bottom:4px; }
.vp-empty-title { font-size:1rem; font-weight:600; color:#111827; }
.vp-empty-sub { font-size:0.85rem; color:#9ca3af; max-width:320px; line-height:1.5; }

/* ── Logo cards ───────────────────────────────────────── */
.logo-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 14px;
	overflow: hidden;
	transition: border-color 0.15s;
}
.logo-card--expanded {
	border-color: #008744;
	border-width: 1.5px;
}

/* collapsed */
.logo-card-collapsed {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 16px 20px;
}
.logo-thumb {
	width: 52px;
	height: 52px;
	border-radius: 10px;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	overflow: hidden;
	font-size: 0.7rem;
	color: #9ca3af;
	border: 1px solid #e5e7eb;
}
.logo-img { width: 100%; height: 100%; object-fit: cover; }
.logo-collapsed-info { flex: 1; min-width: 0; }
.logo-card-title { font-size: 0.9rem; font-weight: 600; color: #111827; }
.logo-card-meta { font-size: 0.78rem; color: #6b7280; margin-top: 2px; }
.btn-review {
	padding: 7px 18px;
	border-radius: 8px;
	border: 1px solid #e5e7eb;
	background: #ffffff;
	color: #111827;
	font-size: 0.82rem;
	font-weight: 600;
	cursor: pointer;
	flex-shrink: 0;
	transition: all 0.15s;
}
.btn-review:hover { border-color: #008744; color: #008744; }

/* expanded */
.logo-card-expanded { padding: 20px; }
.logo-expanded-top {
	display: flex;
	gap: 16px;
	margin-bottom: 16px;
	flex-wrap: wrap;
}
.logo-thumb-lg {
	width: 80px;
	height: 80px;
	border-radius: 12px;
	background: #f3f4f6;
	border: 1px dashed #d1d5db;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	overflow: hidden;
}
.logo-crop-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	font-size: 0.7rem;
	color: #9ca3af;
}
.logo-expanded-info { flex: 1; }
.logo-expanded-header {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 8px;
	flex-wrap: wrap;
}
.needs-decision-badge {
	display: inline-block;
	padding: 2px 10px;
	border-radius: 9999px;
	background: #fef3c7;
	color: #d97706;
	font-size: 0.72rem;
	font-weight: 600;
}
.logo-stats {
	font-size: 0.82rem;
	color: #374151;
	margin-bottom: 4px;
}
.logo-examples {
	font-size: 0.78rem;
	color: #6b7280;
}
.logo-actions {
	display: flex;
	gap: 10px;
	margin-bottom: 14px;
	flex-wrap: wrap;
}
.btn-add-certifier {
	padding: 9px 20px;
	background: #008744;
	color: #ffffff;
	border: none;
	border-radius: 8px;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s;
}
.btn-add-certifier:hover { background: #00753a; }
.btn-outline {
	padding: 9px 18px;
	background: transparent;
	color: #374151;
	border: 1px solid #d1d5db;
	border-radius: 8px;
	font-size: 0.85rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s;
}
.btn-outline:hover { border-color: #9ca3af; color: #111827; }
.impact-banner {
	padding: 12px 16px;
	background: #f0fdf4;
	border: 1px solid #bbf7d0;
	border-radius: 8px;
	font-size: 0.82rem;
	color: #374151;
	line-height: 1.5;
}

/* ── Right aside ──────────────────────────────────────── */
.vp-aside { display: flex; flex-direction: column; gap: 14px; }
.info-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 14px;
	padding: 20px;
}
.info-card-title {
	font-size: 0.9rem;
	font-weight: 600;
	color: #111827;
	margin-bottom: 14px;
}
.info-steps {
	margin: 0;
	padding-left: 18px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.info-steps li {
	font-size: 0.82rem;
	color: #374151;
	line-height: 1.5;
}
.privacy-card {
	background: #f0f9ff;
	border: 1px solid #bae6fd;
	border-radius: 14px;
	padding: 18px 20px;
}
.privacy-title {
	font-size: 0.85rem;
	font-weight: 600;
	color: #0369a1;
	margin-bottom: 6px;
}
.privacy-body {
	font-size: 0.78rem;
	color: #0c4a6e;
	line-height: 1.5;
	margin: 0;
}

/* ── Skeleton ─────────────────────────────────────────── */
.sk-stack { display: flex; flex-direction: column; gap: 12px; }
.sk-card {
	height: 86px;
	border-radius: 14px;
	background: #e5e7eb;
}
.shimmer {
	background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: -100% 0; }
}

/* ── Modals ───────────────────────────────────────────── */
.modal-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
}
.modal-box {
	background: #ffffff;
	border-radius: 16px;
	padding: 28px 32px;
	max-width: 440px;
	width: 90%;
	box-shadow: 0 20px 60px rgba(0,0,0,0.18);
}
.modal-box-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}
.modal-box-title {
	font-size: 1.05rem;
	font-weight: 700;
	color: #111827;
	margin-bottom: 10px;
}
.modal-box-sub {
	font-size: 0.85rem;
	color: #6b7280;
	margin: 0 0 14px;
}
.modal-box-body {
	font-size: 0.875rem;
	color: #374151;
	margin-bottom: 20px;
	line-height: 1.5;
}
.modal-close-btn {
	background: none;
	border: none;
	cursor: pointer;
	font-size: 1rem;
	color: #9ca3af;
	padding: 4px;
}
.dialog-textarea {
	width: 100%;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	padding: 10px 12px;
	font-size: 0.875rem;
	color: #111827;
	resize: vertical;
	margin-bottom: 16px;
	box-sizing: border-box;
	font-family: inherit;
}
.dialog-input {
	width: 100%;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	padding: 10px 12px;
	font-size: 0.875rem;
	color: #111827;
	box-sizing: border-box;
	font-family: inherit;
}
.dialog-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-bottom: 12px;
}
.dialog-label {
	font-size: 0.75rem;
	font-weight: 600;
	color: #374151;
}
.dialog-error {
	color: #dc2626;
	font-size: 0.78rem;
	margin: 4px 0 0;
}
.modal-box-actions {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
.modal-box-footer {
	display: flex;
	justify-content: flex-end;
	margin-top: 16px;
}
.btn-modal-secondary {
	padding: 9px 20px;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	background: transparent;
	color: #374151;
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;
}
.btn-modal-primary {
	padding: 9px 22px;
	background: #008744;
	color: #ffffff;
	border: none;
	border-radius: 8px;
	font-size: 0.875rem;
	font-weight: 600;
	cursor: pointer;
}
.btn-modal-primary:hover { background: #00753a; }

/* Awaiting rescan list */
.awaiting-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 4px; }
.awaiting-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.awaiting-product { font-size: 0.85rem; color: #111827; }
.awaiting-badge { font-size: 0.72rem; background: #ede9fe; color: #7c3aed; padding: 2px 10px; border-radius: 9999px; font-weight: 600; }
.modal-empty { font-size: 0.85rem; color: #9ca3af; padding: 12px 0; }

/* ── Toast ────────────────────────────────────────────── */
.vp-toast {
	position: fixed;
	bottom: 28px;
	left: 50%;
	transform: translateX(-50%);
	background: #111827;
	color: #ffffff;
	padding: 12px 24px;
	border-radius: 9999px;
	font-size: 0.875rem;
	font-weight: 500;
	z-index: 10000;
	box-shadow: 0 8px 30px rgba(0,0,0,0.2);
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
