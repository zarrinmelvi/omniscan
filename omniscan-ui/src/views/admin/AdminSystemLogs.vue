<template>
	<div class="system-logs">
		<header class="page-header">
			<div class="header-top">
				<h1>System Logs</h1>
				<span class="live-indicator">
					<span class="dot"></span>
					Live
				</span>
			</div>
			<p class="subtitle">{{ tabSubtitle }}</p>
		</header>

		<!-- Tabs -->
		<div class="tabs-bar">
			<button
				v-for="tab in tabs"
				:key="tab.id"
				class="tab-btn"
				:class="{ active: activeTab === tab.id }"
				@click="switchTab(tab.id)"
			>
				{{ tab.label }}
			</button>
		</div>

		<p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

		<!-- ═══════════════════════════════════════════════════════ -->
		<!-- TAB 1 — OVERVIEW                                        -->
		<!-- ═══════════════════════════════════════════════════════ -->
		<div v-if="sysLoading && activeTab === 'overview'" class="sl-sk-overview">
			<div class="sl-sk-card shimmer"></div>
			<div class="sl-sk-card shimmer"></div>
		</div>
		<div v-else-if="activeTab === 'overview'">
			<!-- Two side-by-side summary cards -->
			<div class="ov-cards">
				<!-- Card 1: API response time -->
				<div class="ov-card">
					<div class="ov-status-row">
						<span
							class="ov-status-dot"
							:style="{ background: latencyHealth.dotColor }"
						></span>
						<span class="ov-status" :style="{ color: latencyHealth.dotColor }">
							{{ latencyHealth.label }}
						</span>
					</div>
					<div class="ov-card-label">API response time</div>
					<div class="ov-card-sub">
						<template v-if="peakAlert">
							Slowed at some point today ·
							<button class="ov-tab-link" @click="switchTab('api-latency')">See API Latency</button>
						</template>
						<template v-else>
							No slow periods today.
						</template>
					</div>
				</div>

				<!-- Card 2: Last saved change -->
				<div class="ov-card">
					<div class="ov-status" style="font-size: 1.6rem;">
						{{ lastChangeTime }}
					</div>
					<div class="ov-card-label">Last saved change</div>
					<div class="ov-card-sub">
						{{ lastChangeSummary }}
					</div>
				</div>
			</div>

			<!-- Recent changes list -->
			<div class="ov-recent">
				<div class="ov-recent-head-row">
					<span class="ov-recent-head">Recent changes</span>
					<button class="ov-tab-link" @click="switchTab('audit-log')">Open Audit Log</button>
				</div>
				<div v-if="recentAuditEvents.length === 0" class="empty-note">
					No changes recorded yet.
				</div>
				<div
					v-for="evt in recentAuditEvents"
					:key="evt.id"
					class="ov-change-row"
				>
					<div class="ov-evt-icon" :class="'ov-evt-' + eventCategory(evt)">
						<span v-html="eventIconSvg(eventCategory(evt))"></span>
					</div>
					<div class="ov-change-info">
						<div class="ov-change-text">{{ toPlainEnglish(evt.summary) }}</div>
						<div class="ov-change-sub">{{ formatRelativeDate(evt.created_at) }}</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ═══════════════════════════════════════════════════════ -->
		<!-- TAB 2 — API LATENCY                                     -->
		<!-- ═══════════════════════════════════════════════════════ -->
		<div v-if="sysLoading && activeTab === 'api-latency'" class="sl-sk-chart shimmer"></div>
		<div v-else-if="activeTab === 'api-latency'">
			<div class="lat-layout">
				<!-- LEFT: chart card -->
				<div class="chart-card">
					<div class="chart-header">
						<h2>Response time</h2>
						<span class="chart-subtitle">Today · built from real requests, not a timer</span>
					</div>

					<div v-if="latencySeries.length === 0" class="empty-note">
						No requests recorded on this instance yet.
					</div>

					<div v-else class="chart-container">
						<svg viewBox="0 0 760 200" class="lat-chart" preserveAspectRatio="none">
							<!-- Grid lines and Y-axis labels -->
							<line v-for="g in gridLines" :key="g.y" x1="44" :y1="g.y" x2="750" :y2="g.y" class="grid-line" />
							<text v-for="g in gridLines" :key="'t' + g.y" x="38" :y="g.y + 4" class="axis-label" text-anchor="end">{{ g.label }}</text>

							<!-- Goal line at 300ms -->
							<line
								:x1="44"
								:y1="goalLineY"
								:x2="750"
								:y2="goalLineY"
								class="goal-line"
							/>
							<text :x="752" :y="goalLineY + 4" class="goal-label" font-size="10" fill="#ef4444">Goal 300 ms</text>

							<!-- Slow period highlight -->
							<rect
								v-if="peakAlert && peakBucketX !== null"
								:x="peakBucketX - 20"
								y="20"
								width="40"
								height="155"
								class="slow-rect"
							/>
							<text
								v-if="peakAlert && peakBucketX !== null"
								:x="peakBucketX"
								y="35"
								class="slow-label"
								text-anchor="middle"
							>Slow · {{ overview.peak_latency }}ms</text>

							<!-- Latency polyline -->
							<polyline :points="chartPoints" fill="none" stroke="#008744" stroke-width="2" />
							<circle v-for="(p, i) in chartDots" :key="i" :cx="p.x" :cy="p.y" r="2.5" fill="#008744" />
						</svg>
						<div class="time-labels">
							<span v-for="(pt, i) in latencySeries" :key="i">{{ pt.label }}</span>
						</div>
					</div>

					<div v-if="peakAlert" class="alert-box">
						<svg class="alert-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
						<span>Peak latency of {{ overview.peak_latency }}ms exceeded the {{ latencyTarget }}ms target.</span>
					</div>
				</div>

				<!-- RIGHT: When it slows panel -->
				<div class="when-slows-card">
					<div class="wsc-title">When it slows</div>
					<div class="wsc-sub">Proposed cutoffs, to confirm</div>
					<div class="tier-rows">
						<div class="tier-row">
							<span class="tier-chip tier-fast">Fast</span>
							<span class="tier-desc">Under 300 ms</span>
						</div>
						<div class="tier-row">
							<span class="tier-chip tier-okay">Okay</span>
							<span class="tier-desc">300 to 1,000 ms</span>
						</div>
						<div class="tier-row">
							<span class="tier-chip tier-slow">Slow</span>
							<span class="tier-desc">Over 1,000 ms</span>
						</div>
					</div>
					<div class="wsc-after">After 3 slow requests in a row:</div>
					<ol class="wsc-steps">
						<li>The slow period is logged.</li>
						<li>A notice appears on the bell.</li>
						<li>An email is sent if "Email on system error" is on.</li>
						<li>The recovery is logged too.</li>
					</ol>
				</div>
			</div>

			<!-- Recent requests table removed per admin portal cleanup -->
		</div>

		<!-- ═══════════════════════════════════════════════════════ -->
		<!-- TAB 3 — AUDIT LOG                                       -->
		<!-- ═══════════════════════════════════════════════════════ -->
		<div v-if="activeTab === 'audit-log' || activeTab === 'api-latency'">
			<!-- Controls row — only shown on dedicated audit-log tab -->
			<div v-if="activeTab === 'audit-log'" class="al-controls">
				<div class="al-chips">
					<button
						v-for="cat in auditCategories"
						:key="cat.value"
						class="al-chip"
						:class="{ 'al-chip--active': selectedCategory === cat.value }"
						@click="selectedCategory = cat.value"
					>{{ cat.label }}</button>
				</div>
				<input
					v-model="auditSearch"
					type="text"
					class="al-search"
					placeholder="Search changes"
				/>
				<select v-model="auditDays" class="al-days-select">
					<option value="7">Last 7 days</option>
					<option value="30">Last 30 days</option>
					<option value="90">Last 90 days</option>
				</select>
			</div>

			<!-- Empty state -->
			<div v-if="filteredAuditEvents.length === 0" class="al-empty">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
				<p>No changes in the last {{ auditDays }} days.</p>
				<button v-if="auditDays !== '30'" class="al-show-more-btn" @click="auditDays = '30'">
					Show last 30 days
				</button>
			</div>

			<!-- Grouped events -->
			<div v-else>
				<div v-for="group in pagedGroupedAuditEvents" :key="group.label">
					<div class="al-group-head">{{ group.label }}</div>
					<div
						v-for="evt in group.events"
						:key="evt.id"
						class="al-event-row"
					>
						<div class="al-evt-icon" :class="'al-evt-' + eventCategory(evt)">
							<span v-html="eventIconSvg(eventCategory(evt))"></span>
						</div>
						<div class="al-evt-body">
							<div class="al-evt-text">{{ toPlainEnglish(evt.summary) }}</div>
							<div class="al-evt-sub">{{ formatTimeShort(new Date(evt.created_at).getTime()) }} · {{ extractUsername(evt.summary) !== 'Admin' ? extractUsername(evt.summary) : evt.triggered_by }}</div>
						</div>
						<div class="al-evt-right">
							<span class="al-cat-badge" :class="'al-cat-' + eventCategory(evt)">
								{{ categoryLabel(eventCategory(evt)) }}
							</span>
						</div>
					</div>
				</div>
				<div v-if="auditTotalPages > 1" class="al-pagination">
					<button :disabled="auditPage === 1" @click="auditPage--" class="page-nav">‹</button>
					<span class="al-page-info">{{ auditPage }} / {{ auditTotalPages }}</span>
					<button :disabled="auditPage === auditTotalPages" @click="auditPage++" class="page-nav">›</button>
				</div>
			</div>

			<div class="al-footer">
				Consumer sign-ins are not listed. Only admin sign-ins and changes to data appear here.
			</div>
		</div>

		<!-- ═══════════════════════════════════════════════════════ -->
		<!-- TAB 4 — FLAG AUDIT (allergens only)                     -->
		<!-- ═══════════════════════════════════════════════════════ -->
		<div v-if="activeTab === 'flag-audit'">
			<div v-if="flagStatsLoading" class="empty-note">Loading flag statistics…</div>
			<div v-else-if="!flagStats" class="empty-note">Unable to load flag statistics.</div>
			<div v-else>

				<!-- Section 1: Consumer allergen profiles -->
				<div class="fa-profile-section">
					<h2 class="fa-section-title">Consumers who listed each allergen</h2>
					<p class="fa-section-sub">
						Out of {{ flagStats.total_active_consumers.toLocaleString() }} active Consumers.
						This is about profiles, not scans.
					</p>
					<div
						v-for="item in topProfileAllergens"
						:key="item.allergen_id"
						class="fa-bar-row"
					>
						<span class="fa-allergen-name">{{ item.name }}</span>
						<div class="fa-bar-track">
							<div
								class="fa-bar-fill"
								:style="{ width: profileBarWidth(item.user_count) + '%' }"
							></div>
						</div>
						<span class="fa-bar-count">
							{{ item.user_count }}
							<span class="fa-bar-pct">({{ profilePct(item.user_count) }}%)</span>
						</span>
					</div>
				</div>

				<!-- Section 2: Scan flag counts -->
				<div class="fa-flag-section">
					<h2 class="fa-section-title">Times scans were flagged</h2>
					<p class="fa-section-sub">This is about scans, so it differs from the chart above.</p>

					<div v-if="flagStats.allergen_flag_counts.filter(a => a.flag_count > 0).length === 0" class="empty-note">
						No allergen flags recorded yet.
					</div>
					<div v-else>
						<div
							v-for="item in flagStats.allergen_flag_counts.filter(a => a.flag_count > 0)"
							:key="item.allergen_id"
							class="fa-flag-row"
							:class="{ 'fa-flag-row--expanded': expandedAllergen === item.allergen_id }"
							@click="toggleAllergen(item.allergen_id)"
						>
							<div class="fa-flag-main">
								<span class="fa-allergen-name">{{ item.name }}</span>
								<div class="fa-bar-track fa-bar-track--flag">
									<div
										class="fa-bar-fill fa-bar-fill--flag"
										:style="{ width: flagBarWidth(item.flag_count) + '%' }"
									></div>
								</div>
								<span class="fa-flag-count">{{ item.flag_count }}</span>
								<span class="fa-flag-date">{{ formatFlagDate(item.last_flagged_at) }}</span>
								<span class="fa-expand-arrow" :class="{ 'fa-expand-arrow--open': expandedAllergen === item.allergen_id }">
									▾
								</span>
							</div>
							<!-- Expanded sub-panel -->
							<div v-if="expandedAllergen === item.allergen_id" class="fa-expanded" @click.stop>
								<div class="fa-expanded-title">MOST FLAGGED PRODUCTS</div>
								<div v-if="item.top_products.length === 0" class="fa-expanded-empty">
									No specific products recorded.
								</div>
								<div
									v-for="prod in item.top_products"
									:key="prod.product_id ?? prod.product_name"
									class="fa-product-row"
								>
									<a
										class="fa-product-link"
										href="#"
										@click.prevent="$router.push('/admin/productsdata?tab=products')"
									>{{ prod.product_name }}</a>
									<span class="fa-product-count">{{ prod.flag_count }} flags</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'
import { useRoute } from 'vue-router'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Overview {
	avg_latency: number
	peak_latency: number
	p95_latency: number
	total_requests: number
	db_status: string
}
interface ServiceHealth {
	name: string
	status: 'operational' | 'degraded' | 'down'
	detail: string
	latencyMs: number | null
}
interface SeriesPoint { label: string; value: number }
interface ApiRequestRow { ts: number; time: string; method: string; path: string; status: number; durationMs: number }
interface QueryRow { ts: number; time: string; model: string; action: string; durationMs: number }
interface LogRow { ts: number; time: string; level: 'info' | 'warn' | 'error'; source: string; message: string }

interface AuditEventRow {
	id: number
	event_type: string
	entity: string
	entity_id: number | null
	triggered_by: string
	summary: string
	created_at: string
}

interface LastAuditEvent {
	summary: string
	created_at: string
}

interface SystemLogsResponse {
	overview: Overview
	latency_target_ms: number
	services: ServiceHealth[]
	latency_series: SeriesPoint[]
	api_requests: ApiRequestRow[]
	prisma_queries: QueryRow[]
	raw_logs: LogRow[]
	audit_events: AuditEventRow[]
	last_audit_event: LastAuditEvent | null
}

interface TopProduct {
	product_id: number | null
	product_name: string
	brand_name: string | null
	flag_count: number
}

interface AllergenFlagCount {
	allergen_id: number
	name: string
	flag_count: number
	last_flagged_at: string | null
	top_products: TopProduct[]
}

interface AllergenProfileCount {
	allergen_id: number
	name: string
	user_count: number
}

interface FlagAuditStatsResponse {
	success: boolean
	allergen_profile_counts: AllergenProfileCount[]
	allergen_flag_counts: AllergenFlagCount[]
	total_active_consumers: number
}

interface FlagAuditRow {
	id: number
	product_name: string
	brand_name: string
	scanned_by: string
	flag_reason: string
	halal_flag_type: 'allergen' | 'other'
	status: string
	created_at: string
}

// ─── State ───────────────────────────────────────────────────────────────────

const activeTab = ref('overview')
const route = useRoute()

const tabs = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'api-latency', label: 'API Latency' },
	{ id: 'audit-log', label: 'Audit Log' },
	{ id: 'flag-audit', label: 'Flag Audit' },
]

const data = ref<SystemLogsResponse | null>(null)
const errorMessage = ref<string | null>(null)
const flagStats = ref<FlagAuditStatsResponse | null>(null)
const flagStatsLoading = ref(false)
const flagStatsLoaded = ref(false)
const sysLoading = ref(true)
const expandedAllergen = ref<number | null>(null)
const showSlowOnly = ref(false)

// Audit log filter state
const auditSearch = ref('')
const auditDays = ref('7')
const selectedCategory = ref<string>('all')

// Legacy flag audit rows (kept for compatibility)
const flagAuditRows = ref<FlagAuditRow[]>([])

const auditCategories = [
	{ value: 'all', label: 'All changes' },
	{ value: 'accounts', label: 'Accounts' },
	{ value: 'product-data', label: 'Product data' },
	{ value: 'halal-registry', label: 'Halal registry' },
	{ value: 'settings', label: 'Settings' },
]

// ─── Computed from API data ───────────────────────────────────────────────────

const overview = computed<Overview>(() => data.value?.overview ?? { avg_latency: 0, peak_latency: 0, p95_latency: 0, total_requests: 0, db_status: '—' })
const auditEvents = computed<AuditEventRow[]>(() => data.value?.audit_events ?? [])
const latencySeries = computed<SeriesPoint[]>(() => data.value?.latency_series ?? [])
const latencyTarget = computed(() => data.value?.latency_target_ms ?? 300)
const peakAlert = computed(() => overview.value.peak_latency > latencyTarget.value)

// ─── Tab subtitle ─────────────────────────────────────────────────────────────

const tabSubtitle = computed(() => {
	switch (activeTab.value) {
		case 'overview': return 'How the system is running. Entries appear only when something changes.'
		case 'api-latency': return 'Response time today, and what happens when it slows.'
		case 'audit-log': return 'Every change to your data, in plain language. Written when something changes, never on a timer.'
		case 'flag-audit': return 'Which allergens trigger the most flags. Counts only; Consumer details stay private.'
		default: return ''
	}
})

// ─── Overview computed ────────────────────────────────────────────────────────

const latencyHealth = computed<{ label: string; dotColor: string; class: string }>(() => {
	const avg = overview.value.avg_latency
	const target = latencyTarget.value
	if (avg === 0 && overview.value.total_requests === 0) return { label: 'Normal', dotColor: '#16a34a', class: 'health-ok' }
	if (avg >= target) return { label: 'Down', dotColor: '#dc2626', class: 'health-bad' }
	if (avg >= target * 0.66) return { label: 'Degraded', dotColor: '#ea580c', class: 'health-warn' }
	return { label: 'Normal', dotColor: '#16a34a', class: 'health-ok' }
})

const dbHealth = computed<{ class: string }>(() => {
	const s = overview.value.db_status
	if (s === 'NOMINAL') return { class: 'health-ok' }
	if (s === 'SLOW') return { class: 'health-warn' }
	if (s === 'DOWN') return { class: 'health-bad' }
	return { class: 'health-neutral' }
})

const alerts = computed<{ level: 'warn' | 'error'; message: string }[]>(() => {
	const out: { level: 'warn' | 'error'; message: string }[] = []
	if (peakAlert.value) {
		out.push({ level: 'warn', message: `Peak latency ${overview.value.peak_latency}ms exceeded the ${latencyTarget.value}ms target.` })
	}
	if (overview.value.db_status === 'SLOW') {
		out.push({ level: 'warn', message: 'Database responding slower than normal.' })
	}
	if (overview.value.db_status === 'DOWN') {
		out.push({ level: 'error', message: 'Database connection is down.' })
	}
	if (errorMessage.value) {
		out.push({ level: 'error', message: errorMessage.value })
	}
	return out
})

const lastChangeTime = computed(() => {
	const evt = data.value?.last_audit_event
	if (!evt) return '—'
	return new Date(evt.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
})

const lastChangeSummary = computed(() => {
	const evt = data.value?.last_audit_event
	if (!evt) return 'No changes yet.'
	return toPlainEnglish(evt.summary)
})

const recentAuditEvents = computed(() => auditEvents.value.slice(0, 3))

// ─── Chart geometry ───────────────────────────────────────────────────────────

const CHART_LEFT = 44
const CHART_RIGHT = 750
const CHART_TOP = 20
const CHART_BOTTOM = 175

const chartMax = computed(() => {
	const vals = latencySeries.value.map((p) => p.value)
	const peak = Math.max(latencyTarget.value, ...(vals.length ? vals : [0]))
	return Math.max(150, Math.ceil(peak / 150) * 150)
})

const gridLines = computed(() => {
	const max = chartMax.value
	const steps = 4
	const out: { y: number; label: string }[] = []
	for (let i = 0; i <= steps; i++) {
		const frac = i / steps
		const y = CHART_TOP + (CHART_BOTTOM - CHART_TOP) * frac
		const label = String(Math.round(max * (1 - frac)))
		out.push({ y, label })
	}
	return out
})

const goalLineY = computed(() => {
	const target = latencyTarget.value
	const max = chartMax.value
	return CHART_BOTTOM - (CHART_BOTTOM - CHART_TOP) * (target / max)
})

function pointFor(index: number, value: number) {
	const n = latencySeries.value.length
	const x = n <= 1 ? CHART_LEFT : CHART_LEFT + (CHART_RIGHT - CHART_LEFT) * (index / (n - 1))
	const y = CHART_BOTTOM - (CHART_BOTTOM - CHART_TOP) * (value / chartMax.value)
	return { x, y }
}

const chartDots = computed(() => latencySeries.value.map((p, i) => pointFor(i, p.value)))
const chartPoints = computed(() => chartDots.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))

// Peak bucket X for slow-rect overlay
const peakBucketX = computed<number | null>(() => {
	if (!peakAlert.value || latencySeries.value.length === 0) return null
	let maxIdx = 0
	let maxVal = 0
	latencySeries.value.forEach((p, i) => {
		if (p.value > maxVal) { maxVal = p.value; maxIdx = i }
	})
	return pointFor(maxIdx, latencySeries.value[maxIdx].value).x
})

// ─── API Latency Tab ──────────────────────────────────────────────────────────

const filteredRequests = computed(() => {
	const requests = data.value?.api_requests ?? []
	if (showSlowOnly.value) return requests.filter(r => r.durationMs >= 1000)
	return requests
})

function pathToDescription(path: string): string {
	if (path.startsWith('/api/scan')) return 'Scanned a product label'
	if (path.startsWith('/api/admin/login')) return 'Admin signed in'
	if (path.startsWith('/api/auth/login')) return 'Consumer signed in'
	if (path.startsWith('/api/pantry_item')) return 'Updated pantry'
	if (path.startsWith('/api/admin/flagged-scans')) return 'Reviewed a flag'
	if (path.startsWith('/api/admin/products/merge')) return 'Merged two products'
	if (path.startsWith('/api/halal_logo/rescrape')) return 'Re-scraped a certifier logo'
	if (path.startsWith('/api/halal_logo/mark-checked')) return 'Marked certifier as checked'
	if (path.startsWith('/api/allergen')) return 'Updated allergen data'
	if (path.startsWith('/api/admin/settings')) return 'Saved settings'
	return path
}

function latencyBadgeClass(ms: number): string {
	if (ms < 300) return 'lat-badge--fast'
	if (ms < 1000) return 'lat-badge--okay'
	return 'lat-badge--slow'
}

function latencyBadgeLabel(ms: number): string {
	if (ms < 300) return 'Fast'
	if (ms < 1000) return 'Okay'
	return 'Slow'
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

function extractUsername(summary: string): string {
	const match = summary.match(/Admin\s+(\w+)/i)
	if (match && match[1]) {
		return match[1].charAt(0).toUpperCase() + match[1].slice(1)
	}
	return 'Admin'
}

function toPlainEnglish(summary: string): string {
	if (!summary) return summary
	const s = summary
	const lower = s.toLowerCase()
	const username = extractUsername(s)

	if (lower.includes('logged in') && lower.includes('admin')) return `${username} signed in to the Admin Portal`
	if (lower.includes('logged in via google')) return 'Consumer signed in via Google'
	if (lower.includes('logged in')) return 'Consumer signed in'
	if (lower.includes('merged product')) return `${username} merged two products`
	if (lower.includes('marked certifier') && lower.includes('checked')) {
		const m = s.match(/certifier[:\s]+([^\s,]+)/i)
		return `${username} marked ${m ? m[1] : 'certifier'} as checked`
	}
	if (lower.includes('updated') && lower.includes('logo for certifier')) {
		const m = s.match(/certifier[:\s]+([^\s,]+)/i)
		return `${username} updated logo for ${m ? m[1] : 'certifier'}`
	}
	if (/added.*certifier|certifier.*added/i.test(s)) return `${username} added a certifier to the registry`
	if (lower.includes('approved flagged scan')) return `${username} approved a flagged scan`
	if (lower.includes('dismissed flagged scan')) return `${username} dismissed a flagged scan`
	if (lower.includes('updated their profile')) return `${username} updated their profile`
	if (lower.includes('scanned')) return 'Consumer scanned a product'
	// Capitalize first letter
	return s.charAt(0).toUpperCase() + s.slice(1)
}

type EventCategory = 'accounts' | 'product-data' | 'halal-registry' | 'settings' | 'other'

function eventCategory(evt: AuditEventRow): EventCategory {
	const type = evt.event_type?.toUpperCase() ?? ''
	const entity = evt.entity ?? ''
	const summary = evt.summary?.toLowerCase() ?? ''

	if (type === 'LOGIN') return 'accounts'
	if (entity === 'Admin' || entity === 'User') return 'accounts'
	if (entity.includes('Product') || entity.includes('FlaggedScan') || entity.includes('IngredientMapping') || entity.includes('Allergen')) return 'product-data'
	if (entity.includes('HalalLogo')) return 'halal-registry'
	if (entity === 'AppSetting' || summary.includes('settings') || summary.includes('profile')) return 'settings'
	return 'other'
}

function categoryLabel(cat: EventCategory): string {
	switch (cat) {
		case 'accounts': return 'Accounts'
		case 'product-data': return 'Product data'
		case 'halal-registry': return 'Halal registry'
		case 'settings': return 'Settings'
		default: return 'Other'
	}
}

function eventIconSvg(cat: EventCategory): string {
	switch (cat) {
		case 'accounts':
			return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
		case 'product-data':
			return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'
		case 'halal-registry':
			return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
		case 'settings':
			return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
		default:
			return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
	}
}

const filteredAuditEvents = computed(() => {
	const cutoff = Date.now() - Number(auditDays.value) * 86400000
	return auditEvents.value.filter((evt) => {
		const ts = new Date(evt.created_at).getTime()
		if (ts < cutoff) return false
		if (selectedCategory.value !== 'all' && eventCategory(evt) !== selectedCategory.value) return false
		if (auditSearch.value.trim()) {
			const q = auditSearch.value.toLowerCase()
			if (!evt.summary.toLowerCase().includes(q) && !toPlainEnglish(evt.summary).toLowerCase().includes(q)) return false
		}
		return true
	})
})

interface AuditGroup { label: string; events: AuditEventRow[] }

const groupedAuditEvents = computed<AuditGroup[]>(() => {
	const groups: Map<string, AuditEventRow[]> = new Map()
	const todayStr = new Date().toDateString()
	const yesterdayStr = new Date(Date.now() - 86400000).toDateString()

	for (const evt of filteredAuditEvents.value) {
		const d = new Date(evt.created_at)
		const ds = d.toDateString()
		let label: string
		if (ds === todayStr) label = 'TODAY'
		else if (ds === yesterdayStr) label = 'YESTERDAY'
		else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

		if (!groups.has(label)) groups.set(label, [])
		groups.get(label)!.push(evt)
	}

	return Array.from(groups.entries()).map(([label, events]) => ({ label, events }))
})

// ─── Audit Log Pagination ─────────────────────────────────────────────────────

const auditPage = ref(1)
const AUDIT_PAGE_SIZE = 20

const auditTotalPages = computed(() => Math.max(1, Math.ceil(filteredAuditEvents.value.length / AUDIT_PAGE_SIZE)))

const pagedGroupedAuditEvents = computed<AuditGroup[]>(() => {
	const start = (auditPage.value - 1) * AUDIT_PAGE_SIZE
	const paged = filteredAuditEvents.value.slice(start, start + AUDIT_PAGE_SIZE)
	const groups: Map<string, AuditEventRow[]> = new Map()
	const todayStr = new Date().toDateString()
	const yesterdayStr = new Date(Date.now() - 86400000).toDateString()
	for (const evt of paged) {
		const d = new Date(evt.created_at)
		const ds = d.toDateString()
		let label: string
		if (ds === todayStr) label = 'TODAY'
		else if (ds === yesterdayStr) label = 'YESTERDAY'
		else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
		if (!groups.has(label)) groups.set(label, [])
		groups.get(label)!.push(evt)
	}
	return [...groups.entries()].map(([label, events]) => ({ label, events }))
})

watch(filteredAuditEvents, () => { auditPage.value = 1 })

// ─── Flag Audit Tab ────────────────────────────────────────────────────────────

const topProfileAllergens = computed(() => {
	if (!flagStats.value) return []
	return flagStats.value.allergen_profile_counts.slice(0, 8)
})

const maxProfileCount = computed(() => {
	if (!flagStats.value || flagStats.value.allergen_profile_counts.length === 0) return 1
	return Math.max(...flagStats.value.allergen_profile_counts.map(a => a.user_count), 1)
})

const maxFlagCount = computed(() => {
	if (!flagStats.value || flagStats.value.allergen_flag_counts.length === 0) return 1
	return Math.max(...flagStats.value.allergen_flag_counts.map(a => a.flag_count), 1)
})

function profileBarWidth(count: number): number {
	const max = maxProfileCount.value
	if (max === 0) return 0
	return Math.round((count / max) * 100)
}

function profilePct(count: number): string {
	const total = flagStats.value?.total_active_consumers ?? 0
	if (total === 0) return '0'
	return ((count / total) * 100).toFixed(1)
}

function flagBarWidth(count: number): number {
	const max = maxFlagCount.value
	if (max === 0) return 0
	return Math.round((count / max) * 100)
}

function toggleAllergen(id: number) {
	expandedAllergen.value = expandedAllergen.value === id ? null : id
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function formatTimeShort(tsOrIso: number | string): string {
	const d = typeof tsOrIso === 'number' ? new Date(tsOrIso) : new Date(tsOrIso)
	return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatRelativeDate(iso: string): string {
	if (!iso) return '—'
	const d = new Date(iso)
	const todayStr = new Date().toDateString()
	const yesterdayStr = new Date(Date.now() - 86400000).toDateString()
	const timeStr = formatTimeShort(iso)
	if (d.toDateString() === todayStr) return `Today, ${timeStr}`
	if (d.toDateString() === yesterdayStr) return `Yesterday, ${timeStr}`
	return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`
}

function formatFlagDate(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	return d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatAuditTime(iso: string): string {
	if (!iso) return '—'
	const d = new Date(iso)
	return d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function statusChipClass(status: number): string {
	if (status >= 500) return 'chip-red'
	if (status >= 400) return 'chip-yellow'
	if (status >= 300) return 'chip-blue'
	return 'chip-green'
}

function latencyClass(ms: number): string {
	if (ms >= latencyTarget.value) return 'red-text'
	if (ms >= latencyTarget.value * 0.66) return 'orange-text'
	return ''
}

function eventTypeClass(type: string): string {
	const t = type.toUpperCase()
	if (t === 'LOGIN') return 'evt-login'
	if (t === 'SCAN') return 'evt-scan'
	if (t === 'FLAG') return 'evt-flag'
	if (t === 'REVIEW') return 'evt-review'
	if (t === 'DELETE') return 'evt-delete'
	if (t === 'CREATE') return 'evt-create'
	if (t === 'UPDATE') return 'evt-update'
	return 'evt-other'
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function fetchLogs(): Promise<void> {
	try {
		data.value = await apiFetch<SystemLogsResponse>('/api/admin/system-logs', { isAdmin: true })
		errorMessage.value = null
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load system telemetry.'
	} finally {
		sysLoading.value = false
	}
}

async function fetchFlagStats(): Promise<void> {
	if (flagStatsLoaded.value) return
	flagStatsLoading.value = true
	try {
		flagStats.value = await apiFetch<FlagAuditStatsResponse>('/api/admin/flag-audit-stats', { isAdmin: true })
		flagStatsLoaded.value = true
	} catch (err) {
		console.error('Failed to load flag audit stats:', err)
	} finally {
		flagStatsLoading.value = false
	}
}

async function fetchFlagAudit(): Promise<void> {
	try {
		const res = await apiFetch<{ success: boolean; flagged_scans: Record<string, unknown>[] }>(
			'/api/admin/flagged-scans?type=all',
			{ isAdmin: true }
		)
		flagAuditRows.value = (res.flagged_scans ?? [])
			.filter((s) => (s.halal_flag_type as string) !== 'halal')
			.map((s) => ({
				id: s.id as number,
				product_name: (s.product_name as string) ?? 'Unknown product',
				brand_name: (s.brand_name as string) ?? '',
				scanned_by: (s.scanned_by as string) ?? '—',
				flag_reason: (s.flag_reason as string) ?? '—',
				halal_flag_type: (s.halal_flag_type as string) === 'allergen' ? 'allergen' : 'other',
				status: (s.status as string) ?? 'pending',
				created_at: (s.created_at as string) ?? '',
			}))
	} catch (err) {
		console.error('Failed to load flag audit:', err)
	}
}

function switchTab(tabId: string) {
	activeTab.value = tabId
	if (tabId === 'flag-audit' && !flagStatsLoaded.value) {
		fetchFlagStats()
	}
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | null = null
let poller: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	const VALID_TABS = ['overview', 'api-latency', 'audit-log', 'flag-audit'] as const
	const tabParam = route.query.tab
	if (typeof tabParam === 'string' && (VALID_TABS as readonly string[]).includes(tabParam)) {
		activeTab.value = tabParam
	}
	fetchLogs()
	if (activeTab.value === 'flag-audit') fetchFlagStats()
	clock = setInterval(() => (now.value = new Date()), 1000)
	poller = setInterval(fetchLogs, 5000)
})

onUnmounted(() => {
	if (clock) clearInterval(clock)
	if (poller) clearInterval(poller)
})
</script>

<style scoped>
/* ────────────────────────────────────────────────────
   Base page
──────────────────────────────────────────────────── */
.system-logs {
	padding: 24px 32px;
	background-color: #f8fafc;
	min-height: 100vh;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	color: #334155;
}
.page-header { margin-bottom: 20px; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: #0f172a; }
.subtitle { color: #64748b; font-size: 0.88rem; margin: 0; }

.live-indicator { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; font-size: 0.78rem; font-weight: 600; }
.dot { width: 6px; height: 6px; border-radius: 50%; background-color: #16a34a; animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ────────────────────────────────────────────────────
   Tabs
──────────────────────────────────────────────────── */
.tabs-bar { display: flex; gap: 8px; margin-bottom: 24px; }
.tab-btn { padding: 8px 18px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; color: #334155; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
.tab-btn:hover:not(.active) { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
.tab-btn.active { background: #008744; color: #ffffff; font-weight: 600; border-color: #008744; }

.error-message { padding: 14px 18px; margin-bottom: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.85rem; }

/* Utility colors */
.orange-text { color: #ea580c; }
.green-text { color: #16a34a; }
.red-text { color: #dc2626; }

/* ────────────────────────────────────────────────────
   Overview tab
──────────────────────────────────────────────────── */
.ov-cards {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20px;
	margin-bottom: 24px;
}
.ov-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 24px;
	box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}
.ov-status-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 4px;
}
.ov-status-dot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	flex-shrink: 0;
}
.ov-status {
	font-size: 2rem;
	font-weight: 700;
	line-height: 1;
}
.ov-card-label {
	font-size: 0.82rem;
	font-weight: 600;
	color: #64748b;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin: 8px 0 6px;
}
.ov-card-sub {
	font-size: 0.84rem;
	color: #64748b;
	line-height: 1.5;
}
.ov-tab-link {
	background: none;
	border: none;
	padding: 0;
	color: #008744;
	font-size: 0.84rem;
	cursor: pointer;
	text-decoration: underline;
}
.ov-tab-link:hover { color: #005c2e; }

.ov-recent {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 24px;
}
.ov-recent-head-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
}
.ov-recent-head {
	font-size: 0.9rem;
	font-weight: 700;
	color: #0f172a;
}
.ov-change-row {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 10px 0;
	border-top: 1px solid #f1f5f9;
}
.ov-change-row:first-of-type { border-top: none; }
.ov-evt-icon {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.ov-evt-accounts     { background: #dbeafe; color: #2563eb; }
.ov-evt-product-data { background: #dcfce7; color: #15803d; }
.ov-evt-halal-registry { background: #ede9fe; color: #7c3aed; }
.ov-evt-settings     { background: #f1f5f9; color: #64748b; }
.ov-evt-other        { background: #f1f5f9; color: #64748b; }
.ov-change-info { flex: 1; }
.ov-change-text { font-size: 0.88rem; color: #1e293b; }
.ov-change-sub  { font-size: 0.76rem; color: #94a3b8; margin-top: 2px; }

/* ────────────────────────────────────────────────────
   API Latency tab
──────────────────────────────────────────────────── */
.lat-layout {
	display: grid;
	grid-template-columns: 1fr 280px;
	gap: 20px;
	margin-bottom: 24px;
	align-items: start;
}

/* Chart card */
.chart-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.chart-header h2 { font-size: 0.95rem; font-weight: 600; margin: 0; color: #1e293b; }
.chart-subtitle { font-size: 0.8rem; color: #94a3b8; }
.chart-container { position: relative; width: 100%; }
.lat-chart { width: 100%; height: 200px; overflow: visible; }
.grid-line { stroke: #f1f5f9; stroke-width: 1; }
.axis-label { font-size: 11px; fill: #94a3b8; }
.goal-line { stroke: #ef4444; stroke-dasharray: 4 3; stroke-width: 1.5; }
.goal-label { font-size: 10px; fill: #ef4444; }
.slow-rect { fill: #fef08a; opacity: 0.35; }
.slow-label { font-size: 11px; fill: #a16207; }
.time-labels { display: flex; justify-content: space-between; padding-left: 40px; padding-right: 12px; margin-top: 8px; font-size: 0.7rem; color: #94a3b8; }
.time-labels span { flex: 1; text-align: center; }
.alert-box { display: flex; align-items: center; gap: 10px; background-color: #fffbeb; border: 1px solid #fef08a; border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #854d0e; margin-top: 16px; }
.alert-icon { color: #d97706; flex-shrink: 0; }

/* When it slows card */
.when-slows-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 20px;
}
.wsc-title { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
.wsc-sub { font-size: 0.8rem; color: #94a3b8; margin-bottom: 16px; }
.tier-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.tier-row { display: flex; align-items: center; gap: 10px; }
.tier-chip { display: inline-block; padding: 3px 12px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; }
.tier-fast { background: #dcfce7; color: #15803d; }
.tier-okay { background: #fef9c3; color: #a16207; }
.tier-slow { background: #fee2e2; color: #b91c1c; }
.tier-desc { font-size: 0.82rem; color: #475569; }
.wsc-after { font-size: 0.82rem; font-weight: 600; color: #334155; margin-bottom: 6px; }
.wsc-steps { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.wsc-steps li { font-size: 0.8rem; color: #475569; }

/* Recent requests table */
.log-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; overflow: hidden; }
.log-header-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; }
.log-header-text { font-size: 0.85rem; font-weight: 600; color: #475569; }
.log-header { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; font-weight: 600; color: #475569; }
.slow-only-btn {
	padding: 5px 14px; border-radius: 8px; border: 1px solid #e2e8f0;
	background: #ffffff; color: #475569; font-size: 0.78rem; font-weight: 600; cursor: pointer;
}
.slow-only-btn--active { background: #008744; color: #ffffff; border-color: #008744; }
.log-scroll { max-height: 420px; overflow-y: auto; }
.log-table { width: 100%; border-collapse: collapse; }
.log-table th { position: sticky; top: 0; background: #f8fafc; text-align: left; padding: 10px 20px; font-size: 0.68rem; font-weight: 700; color: #64748b; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
.log-table td { padding: 10px 20px; border-bottom: 1px solid #f8fafc; font-size: 0.82rem; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.muted { color: #94a3b8; }
.empty-row { text-align: center; color: #94a3b8; padding: 32px; }
.empty-note { padding: 40px; text-align: center; color: #94a3b8; font-size: 0.85rem; }

.lat-badge { display: inline-block; padding: 2px 9px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; }
.lat-badge--fast { background: #dcfce7; color: #15803d; }
.lat-badge--okay { background: #fef9c3; color: #a16207; }
.lat-badge--slow { background: #fee2e2; color: #b91c1c; }
.lat-details-link { color: #008744; text-decoration: underline; font-size: 0.82rem; cursor: pointer; }
.lat-details-link:hover { color: #005c2e; }

/* ────────────────────────────────────────────────────
   Audit Log tab
──────────────────────────────────────────────────── */
.al-controls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
	padding: 0 0 16px;
	margin-bottom: 20px;
}
.al-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.al-chip {
	padding: 5px 14px; border-radius: 9999px; border: 1px solid #e2e8f0;
	background: #f8fafc; color: #475569; font-size: 0.78rem; font-weight: 600; cursor: pointer;
}
.al-chip:hover { border-color: #008744; color: #008744; }
.al-chip--active { background: #008744; color: #fff; border-color: #008744; }
.al-search {
	width: 200px; padding: 7px 14px; border-radius: 8px;
	border: 1px solid #e2e8f0; background: #fff; color: #334155; font-size: 0.85rem;
}
.al-search:focus { outline: none; border-color: #008744; }
.al-days-select {
	width: auto; min-width: 130px; padding: 7px 12px; border-radius: 8px; border: 1px solid #e2e8f0;
	background: #fff; color: #334155; font-size: 0.82rem; cursor: pointer;
}
.al-group-head {
	font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; color: #9ca3af;
	padding: 16px 0 6px; text-transform: uppercase;
}
.al-event-row {
	display: flex; align-items: center; gap: 12px;
	padding: 12px 0; border-bottom: 1px solid #f1f5f9;
}
.al-event-row:last-child { border-bottom: none; }
.al-evt-icon {
	width: 32px; height: 32px; border-radius: 50%;
	display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.al-evt-accounts      { background: #dbeafe; color: #2563eb; }
.al-evt-product-data  { background: #dcfce7; color: #15803d; }
.al-evt-halal-registry { background: #ede9fe; color: #7c3aed; }
.al-evt-settings      { background: #f1f5f9; color: #64748b; }
.al-evt-other         { background: #f1f5f9; color: #64748b; }
.al-evt-body { flex: 1; }
.al-evt-text { font-size: 0.88rem; color: #1e293b; }
.al-evt-sub  { font-size: 0.76rem; color: #94a3b8; margin-top: 2px; }
.al-evt-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.al-cat-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; }
.al-cat-accounts      { background: #dbeafe; color: #2563eb; }
.al-cat-product-data  { background: #dcfce7; color: #15803d; }
.al-cat-halal-registry { background: #ede9fe; color: #7c3aed; }
.al-cat-settings      { background: #f1f5f9; color: #64748b; }
.al-cat-other         { background: #f1f5f9; color: #64748b; }
.al-footer { font-size: 0.78rem; color: #94a3b8; margin-top: 20px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
.al-pagination { display:flex; align-items:center; justify-content:center; gap:12px; padding:16px 0; }
.al-page-info { font-size:0.82rem; color:#64748b; }
.page-nav { min-width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:1px solid #e2e8f0; background:#fff; color:#334155; border-radius:8px; font-size:1rem; cursor:pointer; transition:background 0.12s; }
.page-nav:hover:not(:disabled) { background:#f1f5f9; }
.page-nav:disabled { opacity:0.4; cursor:not-allowed; }
.al-empty { text-align: center; padding: 48px 24px; }
.al-empty svg { margin: 0 auto 12px; display: block; }
.al-empty p { color: #94a3b8; font-size: 0.88rem; margin-bottom: 12px; }
.al-show-more-btn { padding: 7px 18px; border-radius: 8px; border: 1px solid #008744; background: #fff; color: #008744; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
.al-show-more-btn:hover { background: #f0fdf4; }

/* ────────────────────────────────────────────────────
   Flag Audit tab
──────────────────────────────────────────────────── */
.fa-profile-section, .fa-flag-section {
	background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
	padding: 24px; margin-bottom: 20px;
}
.fa-section-title { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.fa-section-sub { font-size: 0.82rem; color: #64748b; margin: 0 0 16px; }
.fa-bar-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
.fa-allergen-name { width: 80px; text-align: right; font-size: 0.82rem; color: #374151; flex-shrink: 0; }
.fa-bar-track { flex: 1; height: 12px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
.fa-bar-fill { height: 100%; background: #008744; border-radius: 9999px; transition: width 0.3s ease; }
.fa-bar-count { font-size: 0.82rem; color: #374151; font-weight: 500; white-space: nowrap; }
.fa-bar-pct { color: #94a3b8; font-size: 0.75rem; }

.fa-flag-row {
	border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px;
	overflow: hidden; cursor: pointer;
	transition: border-color 0.15s ease;
}
.fa-flag-row:hover { border-color: #008744; }
.fa-flag-row--expanded { border-color: #008744; }
.fa-flag-main {
	display: flex; align-items: center; gap: 12px; padding: 12px 16px;
}
.fa-flag-main .fa-allergen-name { text-align: left; }
.fa-bar-track--flag { flex: 1; }
.fa-bar-fill--flag { background: #ef4444; }
.fa-flag-count { font-size: 0.88rem; font-weight: 700; color: #0f172a; white-space: nowrap; min-width: 24px; }
.fa-flag-date { font-size: 0.76rem; color: #94a3b8; white-space: nowrap; }
.fa-expand-arrow { color: #94a3b8; font-size: 0.9rem; transition: transform 0.2s ease; }
.fa-expand-arrow--open { transform: rotate(180deg); }
.fa-expanded { background: #f8fafc; padding: 12px 16px; border-top: 1px solid #e2e8f0; }
.fa-expanded-title { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.07em; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; }
.fa-expanded-empty { font-size: 0.82rem; color: #94a3b8; }
.fa-product-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
.fa-product-link { color: #008744; text-decoration: underline; cursor: pointer; font-size: 0.82rem; }
.fa-product-link:hover { color: #005c2e; }
.fa-product-count { font-size: 0.78rem; color: #64748b; }

/* Keep old flag audit styles for any still-used code */
.flag-audit-table { min-width: 900px; }
.flag-product-name { font-weight: 500; color: #1e293b; font-size: 0.83rem; }
.flag-reason-cell { max-width: 280px; font-size: 0.78rem; color: #475569; line-height: 1.4; word-break: break-word; }
.flag-type-chip { display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 0.72rem; font-weight: 700; }
.ftype-allergen { background: #fee2e2; color: #b91c1c; }
.ftype-other    { background: #eff6ff; color: #2563eb; }
.flag-status-chip { display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 0.72rem; font-weight: 600; }
.fstatus-recorded { background: #f1f5f9; color: #475569; }

/* Keep old card styles */
.method-chip { display: inline-block; background: #eef2ff; color: #4338ca; border-radius: 5px; padding: 2px 7px; font-size: 0.72rem; font-weight: 700; font-family: ui-monospace, monospace; }
.status-chip { display: inline-block; border-radius: 5px; padding: 2px 8px; font-size: 0.72rem; font-weight: 700; }
.chip-green { background: #dcfce7; color: #15803d; }
.chip-blue  { background: #dbeafe; color: #2563eb; }
.chip-yellow { background: #fef9c3; color: #a16207; }
.chip-red   { background: #fee2e2; color: #b91c1c; }

/* Keep old audit card styles (still referenced by eventTypeClass) */
.audit-cards { display: flex; flex-direction: column; gap: 10px; padding: 16px 20px; }
.audit-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; background: #ffffff; }
.audit-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.evt-chip { display: inline-block; padding: 2px 9px; border-radius: 5px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; }
.evt-login  { background: #dbeafe; color: #2563eb; }
.evt-scan   { background: #dcfce7; color: #15803d; }
.evt-flag   { background: #fef9c3; color: #a16207; }
.evt-review { background: #ede9fe; color: #7c3aed; }
.evt-create { background: #dcfce7; color: #15803d; }
.evt-update { background: #e0f2fe; color: #0369a1; }
.evt-delete { background: #fee2e2; color: #b91c1c; }
.evt-other  { background: #f1f5f9; color: #475569; }
.audit-entity { font-size: 0.8rem; font-weight: 600; color: #475569; }
.audit-time { font-size: 0.74rem; margin-left: auto; }
.audit-summary { font-size: 0.88rem; color: #1e293b; line-height: 1.4; }
.audit-trigger { font-size: 0.76rem; margin-top: 4px; }

/* Keep health card styles for dark-mode.css compatibility */
.health-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px; }
.health-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
.health-card--clickable { cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
.health-card--clickable:hover { border-color: #008744; box-shadow: 0 4px 14px rgba(0,0,0,0.08); transform: translateY(-2px); }
.health-card-head { display: flex; align-items: center; gap: 10px; }
.health-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.health-title { font-size: 0.9rem; font-weight: 600; color: #1e293b; }
.health-status { font-size: 1.35rem; font-weight: 700; line-height: 1.1; }
.health-ok { background: #dcfce7; color: #16a34a; }
.health-warn { background: #fef9c3; color: #a16207; }
.health-bad { background: #fee2e2; color: #dc2626; }
.health-neutral { background: #f1f5f9; color: #64748b; }
.health-status.health-ok { background: transparent; color: #16a34a; }
.health-status.health-warn { background: transparent; color: #a16207; }
.health-status.health-bad { background: transparent; color: #dc2626; }
.health-status.health-neutral { background: transparent; color: #64748b; }
.health-metrics { display: flex; gap: 18px; }
.health-metric { display: flex; flex-direction: column; }
.hm-value { font-size: 1rem; font-weight: 700; color: #0f172a; line-height: 1.1; }
.hm-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; }
.health-foot { font-size: 0.74rem; color: #94a3b8; margin-top: auto; }
.health-alert-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.health-alert-item { display: flex; align-items: flex-start; gap: 8px; font-size: 0.82rem; color: #475569; line-height: 1.4; }
.alert-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.alert-dot.warn { background: #d97706; }
.alert-dot.error { background: #dc2626; }

/* Stat card kept for dark-mode.css compat */
.stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }

/* Group B: System Logs skeleton */
.sl-sk-overview { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
.sl-sk-card { height:140px; border-radius:14px; }
.sl-sk-chart { height:200px; border-radius:14px; margin-bottom:24px; }
.shimmer {
	background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: -100% 0; }
}

/* ── Interactive state focus rings ── */
.tab-btn:focus-visible { outline: 2px solid #008744; outline-offset: 2px; }
.al-chip:focus-visible { outline: 2px solid #008744; outline-offset: 2px; }
.al-chip:hover:not(.al-chip--active) { background: #f0fdf4; border-color: #16a34a; color: #15803d; }
</style>
