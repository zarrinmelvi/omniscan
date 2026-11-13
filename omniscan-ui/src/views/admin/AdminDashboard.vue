<template>
	<div class="dashboard">
		<!-- ── Page Header ─────────────────────────────────────────── -->
		<div class="dash-header">
			<div>
				<h1 class="dash-title">Welcome back, {{ adminName }}.</h1>
				<p class="dash-sub dash-sub--clickable" @click="goToUnresolved" style="cursor:pointer">
					<span v-if="!isLoading" class="dash-flag-count">{{ unresolvedLogos }} unresolved {{ unresolvedLogos === 1 ? 'logo' : 'logos' }}</span>
					<span v-else class="sk-inline"></span>
					need your review.
				</p>
			</div>
			</div>

		<!-- ── 3-Card Metric Row ────────────────────────────────────── -->
		<div class="metric-grid">
			<!-- Skeleton -->
			<template v-if="isLoading">
				<div v-for="n in 3" :key="n" class="metric-card sk-card">
					<div class="sk-line" style="width:60%;height:12px;margin-bottom:14px"></div>
					<div class="sk-line" style="width:40%;height:32px;margin-bottom:10px"></div>
					<div class="sk-line" style="width:80%;height:10px"></div>
				</div>
			</template>
			<template v-else>
				<!-- Unresolved logos -->
				<div class="metric-card" role="link" tabindex="0"
					@click="goToUnresolved" @keydown.enter.prevent="goToUnresolved" @keydown.space.prevent="goToUnresolved">
					<div class="metric-label">Unresolved logos</div>
					<div class="metric-value">{{ unresolvedLogos }}</div>
					<div class="metric-sub">distinct logos, covering {{ unresolvedLogoScans }} scans</div>
				</div>
				<!-- Total Consumers -->
				<div class="metric-card" role="link" tabindex="0"
					@click="router.push('/admin/usersprofile')"
					@keydown.enter.prevent="router.push('/admin/usersprofile')"
					@keydown.space.prevent="router.push('/admin/usersprofile')">
					<div class="metric-label">Total Consumers</div>
					<div class="metric-value">{{ totalConsumers }}</div>
					<div class="metric-sub">registered accounts</div>
				</div>
				<!-- Online now -->
				<div class="metric-card" role="link" tabindex="0"
					@click="goToOnline" @keydown.enter.prevent="goToOnline" @keydown.space.prevent="goToOnline">
					<div class="metric-label">Online now</div>
					<div class="metric-value">{{ onlineConsumers }}</div>
					<div class="metric-sub">of {{ totalConsumers }} Consumers</div>
				</div>
			</template>
		</div>

		<!-- ── Row 2: Allergen Bar + Halal logo chart ──────────────── -->
		<div class="chart-row chart-row--2col">
			<!-- Allergen Horizontal Bar Chart -->
			<div class="chart-card">
				<div class="chart-card-header">
					<div>
						<div class="chart-title">Allergens listed by Consumers</div>
						<div class="chart-sub">Aggregate counts · max 5 per profile</div>
					</div>
					<router-link to="/admin/systemlogs?tab=flag-audit" class="view-all-link">View all</router-link>
				</div>
				<div v-if="isLoading" class="sk-bars">
					<div v-for="n in 8" :key="n" class="sk-bar-row">
						<div class="sk-line" style="width:70px;height:11px"></div>
						<div class="sk-bar-fill shimmer"></div>
					</div>
				</div>
				<div v-else-if="allergenDist.length === 0" class="chart-empty"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>No allergen data yet.</div>
				<div v-else class="allergen-bars">
					<div v-for="item in allergenDist" :key="item.name" class="bar-row" @click="goToAllergen(item.name)" style="cursor:pointer">
						<span class="bar-label">{{ formatAllergenName(item.name) }}</span>
						<div class="bar-track">
							<div class="bar-fill" :style="{ width: barWidth(item.count) + '%' }"></div>
						</div>
						<span class="bar-count">{{ item.count }}</span>
					</div>
				</div>
			</div>

			<!-- Scans by Halal logo (vertical bar chart) -->
			<div class="chart-card halal-chart" role="group" aria-labelledby="halal-chart-title" @click="goToHalalLibrary">
				<div class="chart-card-header">
					<div>
						<div id="halal-chart-title" class="chart-title">Scans by Halal logo</div>
						<div class="chart-sub">Share of scans per certifier logo</div>
					</div>
					<router-link to="/admin/productsdata?tab=halal" class="view-all-link" @click.stop>Manage</router-link>
				</div>
				<div v-if="isLoading" class="hb-skeleton">
					<div v-for="n in 5" :key="n" class="hb-sk-col shimmer"></div>
				</div>
				<div v-else-if="halalLogos.length === 0" class="chart-empty">No Halal logos in the library yet.</div>
				<div v-else class="hb-scroll">
					<div class="hb-cols">
						<div v-for="logo in halalLogos" :key="logo.id" class="hb-col" :title="logo.full_name">
							<div class="hb-label">{{ logo.count }} ({{ logo.pct.toFixed(1) }}%)</div>
							<div class="hb-track">
								<button
									type="button"
									class="hb-bar"
									:class="{ 'hb-bar--zero': logo.count === 0 }"
									:style="{ height: halalBarHeight(logo.count) + '%' }"
									:aria-label="`${logo.certifier}: ${logo.count} scans, ${logo.pct} percent. Open Halal Logo Library`"
									@click.stop="goToHalalLibrary"
								></button>
							</div>
							<div class="hb-name">{{ logo.certifier }}</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ── Row 3: Scans over time ───────────────────────────────── -->
		<div class="chart-row">
			<!-- Scans Over Time Area Chart -->
			<div class="chart-card">
				<div class="chart-card-header">
					<div>
						<div class="chart-title">Scans over time</div>
						<div class="chart-sub">Last {{ selectedRange === '7d' ? 7 : selectedRange === '90d' ? 90 : 30 }} days</div>
					</div>
					<div class="range-pills">
						<button
							v-for="r in ranges"
							:key="r.value"
							class="range-pill"
							:class="{ 'range-pill--active': selectedRange === r.value }"
							@click="setRange(r.value)">{{ r.label }}</button>
					</div>
				</div>
				<div v-if="isLoading" class="sk-chart-area shimmer"></div>
				<div v-else-if="scansOverTime.length === 0" class="chart-empty"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>No scans in this range yet.</div>
				<div v-else class="area-chart-wrap">
					<svg class="area-svg" :viewBox="`0 0 ${AREA_W} ${AREA_H}`" preserveAspectRatio="none">
						<defs>
							<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="#05c450" stop-opacity="0.35"/>
								<stop offset="100%" stop-color="#05c450" stop-opacity="0.03"/>
							</linearGradient>
						</defs>
						<path :d="areaPath" fill="url(#areaGrad)"/>
						<path :d="linePath" fill="none" stroke="#05c450" stroke-width="2"/>
					</svg>
					<div class="area-axis">
						<span>{{ axisLabels[0] }}</span>
						<span>{{ axisLabels[Math.floor(axisLabels.length / 2)] }}</span>
						<span>{{ axisLabels[axisLabels.length - 1] }}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- ── Halal Certifiers Needing Attention ────────────────────── -->
		<div class="table-card">
			<div class="table-header">
				<div class="chart-title">Halal certifiers needing attention</div>
				<router-link to="/admin/productsdata?tab=halal" class="view-all-link">Manage</router-link>
			</div>
			<template v-if="isLoading">
				<div v-for="n in 3" :key="n" class="sk-line" style="height:44px;border-radius:8px;margin-bottom:8px;background:#e5e7eb"></div>
			</template>
			<div v-else-if="attentionCertifiers.length === 0" class="empty-note">
				All certifiers are verified and up to date.
			</div>
			<div v-else class="cert-attention-list">
				<div
					v-for="c in attentionCertifiers"
					:key="c.id"
					class="cert-attention-row"
					@click="router.push('/admin/productsdata?tab=halal')"
				>
					<div class="cert-attention-name">{{ c.certifier }}</div>
					<span class="cert-attention-status" :class="`cert-status--${c.status}`">
						{{ c.status === 'unverified' ? 'Unverified products' : 'Overdue check' }}
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch, ApiError } from '@/utils/api'
import { useAdminAuthStore } from '@/stores/adminAuthStore'

// ── Types ─────────────────────────────────────────────────────────────────
interface DashboardStats {
	total_scans: number
	pending_flags: number
	resolution_rate: number
	active_consumers: number
	api_latency_ms: number
	trends: { total_scans_pct: number; pending_flags_pct: number; active_consumers_pct: number }
	sparklines: { scans: number[]; flags: number[]; consumers: number[]; api_health: number[] }
	unresolved_logos?: number
	unresolved_logo_scans?: number
	total_consumers?: number
	online_consumers?: number
}
interface HalalLogoEntry { id: number; certifier: string; full_name: string; count: number; pct: number }
interface HalalLogoScans { total: number; logos: HalalLogoEntry[] }
interface ScansOverTimeEntry { date: string; count: number }
interface AllergenEntry { name: string; count: number }
interface AttentionCertifier {
	id: number
	certifier: string
	full_name: string
	status: 'unverified' | 'overdue' | 'ok'
	unverified_product_count: number
}

// ── State ──────────────────────────────────────────────────────────────────
const router = useRouter()
const adminStore = useAdminAuthStore()
const adminName = computed(() => adminStore.admin?.full_name?.split(' ')[0] ?? 'Admin')

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const stats = ref<DashboardStats | null>(null)
const halalLogoScans = ref<HalalLogoScans | null>(null)
const unresolvedLogos = computed(() => stats.value?.unresolved_logos ?? 0)
const unresolvedLogoScans = computed(() => stats.value?.unresolved_logo_scans ?? 0)
const totalConsumers = computed(() => stats.value?.total_consumers ?? 0)
const onlineConsumers = computed(() => stats.value?.online_consumers ?? 0)
const halalLogos = computed<HalalLogoEntry[]>(() => halalLogoScans.value?.logos ?? [])
const maxHalalCount = computed(() => Math.max(...halalLogos.value.map((l) => l.count), 1))
function halalBarHeight(count: number): number { return (count / maxHalalCount.value) * 100 }
const scansOverTime = ref<ScansOverTimeEntry[]>([])
const allergenDist = ref<AllergenEntry[]>([])
const attentionCertifiers = ref<AttentionCertifier[]>([])

const ranges: { label: string; value: '7d' | '30d' | '90d' }[] = [
	{ label: '7 days', value: '7d' },
	{ label: '30 days', value: '30d' },
	{ label: '90 days', value: '90d' },
]
const selectedRange = ref<'7d' | '30d' | '90d'>('30d')

// ── Data loading ───────────────────────────────────────────────────────────
async function loadDashboard(): Promise<void> {
	isLoading.value = true
	errorMessage.value = null
	try {
		const data = await apiFetch<{
			stats: DashboardStats
			halal_logo_scans?: HalalLogoScans
			scans_over_time: ScansOverTimeEntry[]
			allergen_distribution: AllergenEntry[]
			attention_certifiers: AttentionCertifier[]
		}>(`/api/admin/dashboard?range=${selectedRange.value}`, { isAdmin: true })
		stats.value = data.stats
		halalLogoScans.value = data.halal_logo_scans ?? null
		scansOverTime.value = data.scans_over_time
		allergenDist.value = data.allergen_distribution
		attentionCertifiers.value = data.attention_certifiers ?? []
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load dashboard.'
	} finally {
		isLoading.value = false
	}
}

function setRange(r: '7d' | '30d' | '90d'): void {
	selectedRange.value = r
	loadDashboard()
}

function goToUnresolved(): void { router.push('/admin/verification?tab=needs-decision') }
function goToOnline(): void { router.push('/admin/usersprofile?status=online') }
function goToHalalLibrary(): void { router.push('/admin/productsdata?tab=halal') }
function goToAllergen(name: string): void { router.push('/admin/productsdata?allergen=' + encodeURIComponent(name)) }

onMounted(loadDashboard)

// ── Sparklines ────────────────────────────────────────────────────────────
function sparklinePoints(vals: number[]): string {
	if (!vals || vals.length === 0) return ''
	const max = Math.max(...vals, 1)
	const min = Math.min(...vals)
	const range = max - min || 1
	const W = 60, H = 24
	return vals.map((v, i) => {
		const x = (i / (vals.length - 1)) * W
		const y = H - ((v - min) / range) * (H - 4) - 2
		return `${x.toFixed(1)},${y.toFixed(1)}`
	}).join(' ')
}

// ── Allergen bars ─────────────────────────────────────────────────────────
const maxAllergenCount = computed(() => Math.max(...allergenDist.value.map((a) => a.count), 1))
function barWidth(count: number): number { return (count / maxAllergenCount.value) * 100 }
function formatAllergenName(name: string): string {
	return name.replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Area chart ────────────────────────────────────────────────────────────
const AREA_W = 560, AREA_H = 160

const areaPath = computed(() => {
	const data = scansOverTime.value
	if (data.length === 0) return ''
	const max = Math.max(...data.map((d) => d.count), 1)
	const pts = data.map((d, i) => {
		const x = (i / (data.length - 1)) * AREA_W
		const y = AREA_H - 24 - (d.count / max) * (AREA_H - 32)
		return [x, y] as [number, number]
	})
	const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
	return `${line} L${AREA_W},${AREA_H - 24} L0,${AREA_H - 24} Z`
})

const linePath = computed(() => {
	const data = scansOverTime.value
	if (data.length === 0) return ''
	const max = Math.max(...data.map((d) => d.count), 1)
	return data.map((d, i) => {
		const x = (i / (data.length - 1)) * AREA_W
		const y = AREA_H - 24 - (d.count / max) * (AREA_H - 32)
		return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
	}).join(' ')
})

const axisLabels = computed(() => {
	const data = scansOverTime.value
	if (data.length === 0) return ['', '', '']
	return data.map((d) => {
		const dt = new Date(d.date)
		return `${dt.toLocaleString('en', { month: 'short' })} ${dt.getDate()}`
	})
})

</script>

<style scoped>
/* ── Base layout ─────────────────────────────────────── */
.dashboard {
	padding: 28px 32px;
	background: #fafafa;
	min-height: 100vh;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── Page header ──────────────────────────────────────── */
.dash-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 24px;
	flex-wrap: wrap;
}
.dash-title {
	font-size: 1.65rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 4px;
	letter-spacing: -0.02em;
}
.dash-sub {
	font-size: 0.875rem;
	color: #6b7280;
	margin: 0;
}
.dash-flag-count {
	color: #05c450;
	font-weight: 600;
}
.sk-inline {
	display: inline-block;
	width: 36px;
	height: 12px;
	background: #e5e7eb;
	border-radius: 4px;
	vertical-align: middle;
}
.range-pills {
	display: flex;
	gap: 6px;
	flex-shrink: 0;
}
.range-pill {
	padding: 6px 14px;
	border-radius: 9999px;
	border: 1px solid #e5e7eb;
	background: transparent;
	color: #6b7280;
	font-size: 0.82rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s;
}
.range-pill--active {
	background: #008744;
	color: #ffffff;
	border-color: #008744;
}
.range-pill:hover:not(.range-pill--active) {
	background: rgba(0, 135, 68, 0.08);
	border-color: #008744;
	color: #008744;
}

/* ── 3-card metric grid ───────────────────────────────── */
.metric-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
	margin-bottom: 20px;
}
@media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .metric-grid { grid-template-columns: 1fr; } }

.metric-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 14px;
	padding: 20px 22px;
	display: flex;
	flex-direction: column;
	gap: 4px;
	cursor: pointer;
	transition: box-shadow 0.15s;
}
.metric-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.metric-label {
	font-size: 0.78rem;
	color: #9ca3af;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}
.metric-value {
	font-size: 2.25rem;
	font-weight: 700;
	color: #111827;
	line-height: 1.1;
}
.metric-unit {
	font-size: 1rem;
	font-weight: 500;
	color: #6b7280;
}
.metric-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 6px;
}
.trend {
	font-size: 0.75rem;
	font-weight: 500;
}
.trend--up { color: #05c450; }
.trend--down { color: #ef4444; }
.sparkline {
	width: 60px;
	height: 24px;
	overflow: visible;
}
.health-pill {
	display: inline-block;
	background: #d1fae5;
	color: #065f46;
	border-radius: 9999px;
	padding: 2px 10px;
	font-size: 0.72rem;
	font-weight: 600;
}

/* ── Chart rows ───────────────────────────────────────── */
.chart-row {
	display: grid;
	gap: 16px;
	margin-bottom: 20px;
}
.chart-row--2col { grid-template-columns: 3fr 2fr; }
@media (max-width: 900px) { .chart-row--2col { grid-template-columns: 1fr; } }

.chart-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 14px;
	padding: 20px 22px;
}
.chart-card-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 18px;
}
.chart-title {
	font-size: 0.95rem;
	font-weight: 600;
	color: #111827;
}
.chart-sub {
	font-size: 0.75rem;
	color: #9ca3af;
	margin-top: 2px;
}
.view-all-link {
	font-size: 0.8rem;
	color: #05c450;
	text-decoration: none;
	font-weight: 500;
	white-space: nowrap;
}

/* ── Allergen bars ────────────────────────────────────── */
.allergen-bars { display: flex; flex-direction: column; gap: 8px; }
.bar-row {
	display: grid;
	grid-template-columns: 80px 1fr 32px;
	align-items: center;
	gap: 10px;
}
.bar-label {
	font-size: 0.78rem;
	color: #4b5563;
	text-align: right;
	white-space: nowrap;
}
.bar-track {
	height: 10px;
	background: #f3f4f6;
	border-radius: 9999px;
	overflow: hidden;
}
.bar-fill {
	height: 100%;
	background: #05c450;
	border-radius: 9999px;
	transition: width 0.4s ease;
}
.bar-count {
	font-size: 0.78rem;
	color: #6b7280;
	font-weight: 500;
}

/* ── Halal logo vertical bar chart ───────────────────── */
.halal-chart { cursor: pointer; min-width: 0; }
.hb-scroll { overflow-x: auto; padding-bottom: 6px; }
.hb-cols { display: flex; gap: 8px; align-items: flex-end; min-width: min-content; }
.hb-col {
	min-width: 56px;
	flex: 1 0 56px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}
.hb-label { font-size: 0.7rem; color: #4b5563; font-weight: 500; white-space: nowrap; }
.hb-track {
	height: 160px;
	width: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	background: #f3f4f6;
	border-radius: 8px;
	overflow: hidden;
}
.hb-bar {
	width: 60%;
	min-height: 4px;
	padding: 0;
	border: none;
	background: #05c450;
	border-radius: 6px 6px 0 0;
	cursor: pointer;
	transition: height 0.4s ease, opacity 0.15s;
}
.hb-bar:hover { opacity: 0.8; }
.hb-bar.hb-bar--zero { background: #cbd5e1; }
.hb-bar:focus-visible { outline: 2px solid #008744; outline-offset: 2px; }
.hb-name { font-size: 0.72rem; color: #374151; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hb-skeleton { display: flex; gap: 8px; align-items: flex-end; height: 160px; }
.hb-sk-col { flex: 1; height: 100%; border-radius: 8px; }
.metric-sub { font-size: 0.75rem; color: #9ca3af; margin-top: 2px; }

html.ion-palette-dark .halal-chart .chart-title { color: #f1f5f9; }
html.ion-palette-dark .halal-chart .chart-sub { color: #94a3b8; }
html.ion-palette-dark .halal-chart .hb-label { color: #cbd5e1; }
html.ion-palette-dark .halal-chart .hb-name { color: #f1f5f9; }
html.ion-palette-dark .halal-chart .hb-track { background: #162032; }
html.ion-palette-dark .halal-chart .hb-bar { background: #05c450; }
html.ion-palette-dark .halal-chart .hb-bar.hb-bar--zero { background: #475569; }
html.ion-palette-dark .halal-chart .hb-bar:focus-visible { outline: 2px solid #6ee7a0; }

/* ── Area chart ───────────────────────────────────────── */
.area-chart-wrap { display: flex; flex-direction: column; gap: 6px; }
.area-svg {
	width: 100%;
	height: 140px;
}
.area-axis {
	display: flex;
	justify-content: space-between;
	font-size: 0.7rem;
	color: #9ca3af;
	padding: 0 2px;
}

/* ── Table ────────────────────────────────────────────── */
.table-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 14px;
	padding: 20px 22px;
}
.table-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16px;
}
.flag-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 0.875rem;
}
.flag-table th {
	text-align: left;
	padding: 8px 12px;
	font-size: 0.7rem;
	font-weight: 600;
	letter-spacing: 0.06em;
	color: #9ca3af;
	border-bottom: 1px solid #f3f4f6;
}
.flag-table td {
	padding: 12px;
	border-bottom: 1px solid #f9fafb;
	vertical-align: middle;
}
.flag-row { cursor: pointer; transition: background 0.12s; }
.flag-row:hover { background: #f9fafb; }
.flag-product { font-weight: 600; color: #111827; }
.flag-reason { color: #6b7280; }
.flag-scans { color: #374151; font-weight: 500; text-align: center; }
.empty-note { color: #9ca3af; font-size: 0.875rem; text-align: center; padding: 24px; }

/* ── Certifier attention list ────────────────────────── */
.cert-attention-list { display: flex; flex-direction: column; }
.cert-attention-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid #f3f4f6;
	cursor: pointer;
	transition: background 0.12s;
}
.cert-attention-row:last-child { border-bottom: none; }
.cert-attention-row:hover { background: #f9fafb; }
.cert-attention-name { font-size: 0.875rem; font-weight: 600; color: #111827; }
.cert-attention-status { font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 9999px; }
.cert-status--unverified { background: #fef3c7; color: #d97706; }
.cert-status--overdue { background: #fee2e2; color: #dc2626; }
.cert-status--ok { background: #d1fae5; color: #065f46; }
.chart-empty { display:flex; flex-direction:column; align-items:center; gap:8px; padding:40px 12px; text-align:center; color:#9ca3af; font-size:0.85rem; }
.chart-empty svg { color:#d1d5db; }

/* Verdict badges */
.verdict-badge {
	display: inline-block;
	padding: 3px 12px;
	border-radius: 9999px;
	font-size: 0.72rem;
	font-weight: 600;
}
.verdict-badge--red { background: #fee2e2; color: #dc2626; }
.verdict-badge--yellow { background: #fef3c7; color: #d97706; }
.verdict-badge--green { background: #d1fae5; color: #065f46; }

/* Status badges */
.status-badge {
	display: inline-block;
	padding: 3px 12px;
	border-radius: 9999px;
	font-size: 0.72rem;
	font-weight: 600;
}
.status-badge--pending { background: #fef3c7; color: #d97706; }
.status-badge--rescan { background: #ede9fe; color: #7c3aed; }

/* ── Skeleton ─────────────────────────────────────────── */
.sk-card { min-height: 130px; justify-content: flex-start; }
.sk-line {
	background: #e5e7eb;
	border-radius: 6px;
	display: block;
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
.sk-bars { display: flex; flex-direction: column; gap: 10px; }
.sk-bar-row { display: flex; align-items: center; gap: 10px; }
.sk-bar-fill {
	flex: 1;
	height: 10px;
	border-radius: 9999px;
}
.sk-chart-area {
	width: 100%;
	height: 140px;
	border-radius: 10px;
}
.sk-row td { padding: 10px 12px; }
</style>
