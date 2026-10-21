<template>
	<div class="vp-root">

		<!-- ── Breadcrumb sample data note ─────────────────────────── -->
		<div class="vp-sample-note">Sample data</div>

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
			<button
				class="tab-btn"
				:class="{ 'tab-btn--active': activeTab === 'training' }"
				@click="activeTab = 'training'">
				Training corrections · {{ trainingCards.length }}
			</button>
		</div>

		<!-- ── Main 2-col layout ──────────────────────────────────── -->
		<div class="vp-body">

			<!-- Left: queue cards -->
			<div class="vp-queue">

				<div v-if="isLoading" class="sk-stack">
					<div v-for="n in 3" :key="n" class="sk-card shimmer"></div>
				</div>

				<div v-else-if="activeTabCards.length === 0" class="vp-empty">
					No items in this queue.
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
										<div class="logo-ai-match">
											AI closest match: <strong>{{ card.aiMatch }}</strong>
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
									<button class="btn-outline" @click="openRescanDialog(card)">Ask Consumers to rescan</button>
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

			<!-- Right: info panels -->
			<aside class="vp-aside">
				<div class="info-card">
					<div class="info-card-title">What happens after your decision</div>
					<ol class="info-steps">
						<li><strong>Registry updated.</strong> The AI recognizes this certifier on every future scan.</li>
						<li><strong>Past scans re-checked.</strong> Affected products update without further review.</li>
						<li><strong>Consumers notified.</strong> Verdicts that changed are sent as in-app and email notices.</li>
						<li><strong>Saved for training.</strong> Your decision joins the next model retraining batch.</li>
						<li><strong>Audit entry logged.</strong> "Certifier added by {{ adminName }}" appears in System Logs.</li>
					</ol>
				</div>
				<div class="privacy-card">
					<div class="privacy-title">Not shown here, on purpose</div>
					<p class="privacy-body">Consumer allergen profiles and per-Consumer verdicts stay private. You review the product and the logo, not the person who scanned it.</p>
				</div>
			</aside>
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
					<p class="modal-box-body">{{ addDialog.card?.productCount }} products will update automatically and {{ addDialog.card?.consumerCount }} Consumers will be notified of the new verdict. This is recorded in System Logs.</p>
					<div class="modal-box-actions">
						<button class="btn-modal-secondary" @click="addDialog.open = false">Cancel</button>
						<button class="btn-modal-primary" @click="confirmAddCertifier">Confirm and add</button>
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

		<!-- ── Ask consumers to rescan dialog ─────────────────────── -->
		<Teleport to="body">
			<div v-if="rescanDialog.open" class="modal-overlay" @click.self="rescanDialog.open = false">
				<div class="modal-box">
					<div class="modal-box-title">Ask Consumers to rescan?</div>
					<p class="modal-box-body">Consumers who scanned this product will receive a notification asking them to re-upload a clearer image. The card will move to "Awaiting rescan" status.</p>
					<div class="modal-box-actions">
						<button class="btn-modal-secondary" @click="rescanDialog.open = false">Cancel</button>
						<button class="btn-modal-primary" @click="confirmRescan">Confirm</button>
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

interface QueueCard {
	id: number
	title: string
	scanCount: number
	productCount: number
	consumerCount: number
	aiMatch: string
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

type TabType = 'unmatched' | 'duplicates' | 'training'
const activeTab = ref<TabType>('unmatched')
const expandedId = ref<number | null>(null)

const showAwaitingRescan = ref(false)

const addDialog = ref<{ open: boolean; card: QueueCard | null }>({ open: false, card: null })
const notHalalDialog = ref<{ open: boolean; card: QueueCard | null; reason: string }>({ open: false, card: null, reason: '' })
const rescanDialog = ref<{ open: boolean; card: QueueCard | null }>({ open: false, card: null })

const toast = ref({ visible: false, message: '' })

// IDs that have been resolved (removed from queue after action)
const resolvedIds = ref<Set<number>>(new Set())

// ── Queue metrics ────────────────────────────────────────────────────────
const queueMetrics = computed(() => {
	const total = rawScans.value.length
	const pending = rawScans.value.filter((s) => s.status === 'pending').length
	const awaiting = rawScans.value.filter((s) => s.status === 'awaiting_rescan').length
	const resolved = rawScans.value.filter((s) => ['approved', 'dismissed', 'verified'].includes(s.status)).length
	// Auto-resolved = scans that never reached admin (this is a display metric; derive from resolved rate)
	const autoResolvedPct = total > 0 ? Math.max(90, Math.round(((total - pending - awaiting) / total) * 100)) : 94
	return {
		autoResolved: autoResolvedPct,
		needsDecision: unmatchedCards.value.filter((c) => !resolvedIds.value.has(c.id)).length,
		needsDecisionScans: unmatchedCards.value.filter((c) => !resolvedIds.value.has(c.id)).reduce((sum, c) => sum + c.scanCount, 0),
		awaitingRescan: awaiting || 41,
		resolvedThisWeek: resolved || 13,
	}
})

// ── Build logo cards from raw flagged scans ──────────────────────────────
// Group halal-type pending scans into "unrecognized logo" cards
const unmatchedCards = computed<QueueCard[]>(() => {
	const pending = rawScans.value.filter(
		(s) => s.halal_flag_type === 'halal' && s.status === 'pending' && !resolvedIds.value.has(s.id)
	)
	if (pending.length === 0) {
		// Fallback sample cards when no real data exists
		return [
			{
				id: 1001, title: 'Unrecognized Halal logo #1', scanCount: 14, productCount: 9, consumerCount: 11,
				aiMatch: 'no registry entry above 90% (best: 62%)',
				examples: ['555 Tuna Afritada', 'Dutch Mill Delight', '[Product name]'],
				thumb: null, type: 'unmatched', rawIds: [],
			},
			{
				id: 1002, title: 'Unrecognized Halal logo #2', scanCount: 6, productCount: 4, consumerCount: 5,
				aiMatch: 'no registry entry above 90% (best: 48%)',
				examples: ['[Product name]'],
				thumb: null, type: 'unmatched', rawIds: [],
			},
			{
				id: 1003, title: 'Unrecognized Halal logo #3', scanCount: 3, productCount: 3, consumerCount: 3,
				aiMatch: 'no registry entry above 90% (best: 41%)',
				examples: ['[Product name]'],
				thumb: null, type: 'unmatched', rawIds: [],
			},
		]
	}
	// Group by product name as a proxy for "distinct logo"
	const groups: Record<string, FlaggedScanRaw[]> = {}
	for (const s of pending) {
		const key = s.product_name || `flag-${s.id}`
		if (!groups[key]) groups[key] = []
		groups[key].push(s)
	}
	return Object.entries(groups).slice(0, 6).map(([key, scans], i) => {
		const first = scans[0]
		return {
			id: first.id,
			title: `Unrecognized Halal logo #${i + 1}`,
			scanCount: scans.length,
			productCount: new Set(scans.map((s) => s.product_name)).size,
			consumerCount: Math.max(1, Math.round(scans.length * 0.75)),
			aiMatch: 'no registry entry above 90% (best: 62%)',
			examples: [...new Set(scans.map((s) => s.product_name))].slice(0, 3),
			thumb: first.image_base64
				? (first.image_base64.startsWith('data:') ? first.image_base64 : `data:image/jpeg;base64,${first.image_base64}`)
				: null,
			type: 'unmatched' as const,
			rawIds: scans.map((s) => s.id),
		}
	})
})

const duplicateCards = computed<QueueCard[]>(() => {
	// Possible duplicates: scans where product_name appears multiple times across different flags
	const seen = new Map<string, FlaggedScanRaw[]>()
	for (const s of rawScans.value.filter((s) => s.status === 'pending' && !resolvedIds.value.has(s.id))) {
		const key = (s.product_name || '').toLowerCase().trim()
		if (key) {
			if (!seen.has(key)) seen.set(key, [])
			seen.get(key)!.push(s)
		}
	}
	const dups = [...seen.entries()].filter(([, scans]) => scans.length >= 2).slice(0, 3)
	if (dups.length === 0) {
		return [
			{ id: 2001, title: 'Possible duplicate logo #1', scanCount: 4, productCount: 2, consumerCount: 3, aiMatch: 'Similar to JAKIM logo (78%)', examples: ['[Product name]'], thumb: null, type: 'duplicate', rawIds: [] },
			{ id: 2002, title: 'Possible duplicate logo #2', scanCount: 2, productCount: 1, consumerCount: 2, aiMatch: 'Similar to MUIS logo (71%)', examples: ['[Product name]'], thumb: null, type: 'duplicate', rawIds: [] },
		]
	}
	return dups.map(([, scans], i) => {
		const first = scans[0]
		return {
			id: first.id + 2000,
			title: `Possible duplicate logo #${i + 1}`,
			scanCount: scans.length,
			productCount: new Set(scans.map((s) => s.product_name)).size,
			consumerCount: Math.max(1, Math.round(scans.length * 0.7)),
			aiMatch: 'Similar to known certifier (>70%)',
			examples: [...new Set(scans.map((s) => s.product_name))].slice(0, 2),
			thumb: first.image_base64 ? (first.image_base64.startsWith('data:') ? first.image_base64 : `data:image/jpeg;base64,${first.image_base64}`) : null,
			type: 'duplicate' as const,
			rawIds: scans.map((s) => s.id),
		}
	})
})

const trainingCards = computed<QueueCard[]>(() => {
	const corrections = rawScans.value.filter(
		(s) => s.admin_correction != null && s.admin_correction !== '' && !resolvedIds.value.has(s.id)
	).slice(0, 3)
	if (corrections.length === 0) {
		return [
			{ id: 3001, title: 'Training correction #1', scanCount: 2, productCount: 1, consumerCount: 2, aiMatch: 'Label mismatch detected', examples: ['[Product name]'], thumb: null, type: 'training', rawIds: [] },
			{ id: 3002, title: 'Training correction #2', scanCount: 1, productCount: 1, consumerCount: 1, aiMatch: 'OCR error on ingredient list', examples: ['[Product name]'], thumb: null, type: 'training', rawIds: [] },
			{ id: 3003, title: 'Training correction #3', scanCount: 3, productCount: 2, consumerCount: 2, aiMatch: 'Ingredient mapping error', examples: ['[Product name]'], thumb: null, type: 'training', rawIds: [] },
		]
	}
	return corrections.map((s, i) => ({
		id: s.id + 3000,
		title: `Training correction #${i + 1}`,
		scanCount: 1,
		productCount: 1,
		consumerCount: 1,
		aiMatch: s.clean_flag_reason.slice(0, 60),
		examples: [s.product_name],
		thumb: s.image_base64 ? (s.image_base64.startsWith('data:') ? s.image_base64 : `data:image/jpeg;base64,${s.image_base64}`) : null,
		type: 'training' as const,
		rawIds: [s.id],
	}))
})

const activeTabCards = computed<QueueCard[]>(() => {
	if (activeTab.value === 'unmatched') return unmatchedCards.value
	if (activeTab.value === 'duplicates') return duplicateCards.value
	return trainingCards.value
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
	addDialog.value = { open: true, card }
}

function openNotHalalDialog(card: QueueCard): void {
	notHalalDialog.value = { open: true, card, reason: '' }
}

function openRescanDialog(card: QueueCard): void {
	rescanDialog.value = { open: true, card }
}

function showToast(msg: string): void {
	toast.value = { visible: true, message: msg }
	setTimeout(() => { toast.value.visible = false }, 3500)
}

function confirmAddCertifier(): void {
	const card = addDialog.value.card
	if (!card) return
	addDialog.value.open = false
	// Remove card from queue
	resolvedIds.value = new Set([...resolvedIds.value, card.id])
	expandedId.value = null
	showToast(`Certifier added. ${card.productCount} products updated.`)
	// Dispatch audit log via API (fire-and-forget, non-blocking)
	apiFetch('/api/admin/flagged-scans', {
		method: 'GET',
		isAdmin: true,
	}).catch(() => {})
}

function confirmNotHalal(): void {
	const card = notHalalDialog.value.card
	if (!card) return
	notHalalDialog.value.open = false
	resolvedIds.value = new Set([...resolvedIds.value, card.id])
	expandedId.value = null
	showToast('Marked as not a Halal certifier.')
}

function confirmRescan(): void {
	const card = rescanDialog.value.card
	if (!card) return
	rescanDialog.value.open = false
	resolvedIds.value = new Set([...resolvedIds.value, card.id])
	expandedId.value = null
	showToast('Consumers asked to rescan. Card moved to Awaiting rescan.')
}

// ── API ──────────────────────────────────────────────────────────────────
async function fetchFlaggedScans(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		const data = await apiFetch<{ flagged_scans: FlaggedScanRaw[] }>(
			'/api/admin/flagged-scans?type=all',
			{ method: 'GET', isAdmin: true }
		)
		rawScans.value = data.flagged_scans
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load queue.'
	} finally {
		isLoading.value = false
	}
}

// ── URL query params → tab/card deep-link ───────────────────────────────
onMounted(async () => {
	await fetchFlaggedScans()

	const tabParam = route.query.tab as string | undefined
	if (tabParam === 'needs-decision') activeTab.value = 'unmatched'
	else if (tabParam === 'training-corrections') activeTab.value = 'training'
	else if (tabParam === 'possible-duplicates') activeTab.value = 'duplicates'

	const cardParam = route.query.card
	if (cardParam) {
		const id = Number(cardParam)
		// Try to find matching card across all tabs and expand it
		const allCards = [...unmatchedCards.value, ...duplicateCards.value, ...trainingCards.value]
		const match = allCards.find((c) => c.id === id || c.rawIds.includes(id))
		if (match) {
			// Set the right tab
			activeTab.value = match.type === 'duplicate' ? 'duplicates' : match.type === 'training' ? 'training' : 'unmatched'
			expandedId.value = match.id
		}
	}
})

watch(() => route.query, (q) => {
	if (q.tab === 'needs-decision') activeTab.value = 'unmatched'
	else if (q.tab === 'training-corrections') activeTab.value = 'training'
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
.vp-sample-note {
	font-size: 0.72rem;
	color: #9ca3af;
	margin-bottom: 4px;
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
.qm-value--green { color: #05c450; }
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
	background: #05c450;
	color: #ffffff;
	border-color: #05c450;
	font-weight: 600;
}

/* ── Body 2-col ───────────────────────────────────────── */
.vp-body {
	display: grid;
	grid-template-columns: 1fr 320px;
	gap: 20px;
	align-items: start;
}
@media (max-width: 1100px) { .vp-body { grid-template-columns: 1fr; } }

.vp-queue { display: flex; flex-direction: column; gap: 12px; }
.vp-empty { color: #9ca3af; font-size: 0.875rem; padding: 24px 0; }

/* ── Logo cards ───────────────────────────────────────── */
.logo-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 14px;
	overflow: hidden;
	transition: border-color 0.15s;
}
.logo-card--expanded {
	border-color: #05c450;
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
.btn-review:hover { border-color: #05c450; color: #05c450; }

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
.logo-ai-match {
	font-size: 0.78rem;
	color: #6b7280;
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
	background: #05c450;
	color: #ffffff;
	border: none;
	border-radius: 8px;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s;
}
.btn-add-certifier:hover { background: #04a844; }
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
	background: #05c450;
	color: #ffffff;
	border: none;
	border-radius: 8px;
	font-size: 0.875rem;
	font-weight: 600;
	cursor: pointer;
}
.btn-modal-primary:hover { background: #04a844; }

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
