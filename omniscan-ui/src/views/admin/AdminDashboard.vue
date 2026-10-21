<template>
	<div class="dashboard">
		<!-- ── Page Header ─────────────────────────────────────────── -->
		<div class="dash-header">
			<div>
				<h1 class="dash-title">Welcome back, {{ adminName }}.</h1>
				<p class="dash-sub">
					<span v-if="!isLoading" class="dash-flag-count">{{ stats?.pending_flags ?? 0 }} items</span>
					<span v-else class="sk-inline"></span>
					need your review. Showing sample data.
				</p>
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

		<!-- ── 4-Card Metric Row ────────────────────────────────────── -->
		<div class="metric-grid">
			<!-- Skeleton -->
			<template v-if="isLoading">
				<div v-for="n in 4" :key="n" class="metric-card sk-card">
					<div class="sk-line" style="width:60%;height:12px;margin-bottom:14px"></div>
					<div class="sk-line" style="width:40%;height:32px;margin-bottom:10px"></div>
					<div class="sk-line" style="width:80%;height:10px"></div>
				</div>
			</template>
			<template v-else>
				<!-- Total Scans -->
				<div class="metric-card" @click="router.push('/admin/productsdata?sort=newest')">
					<div class="metric-label">Total scans</div>
					<div class="metric-value">{{ stats?.total_scans ?? 0 }}</div>
					<div class="metric-footer">
						<span class="trend trend--up">▲ {{ stats?.trends?.total_scans_pct ?? 12 }}% vs prior</span>
						<svg class="sparkline" viewBox="0 0 60 24" preserveAspectRatio="none">
							<polyline :points="sparklinePoints(stats?.sparklines?.scans ?? [])" fill="none" stroke="#05c450" stroke-width="1.5"/>
						</svg>
					</div>
				</div>
				<!-- Pending Flags -->
				<div class="metric-card" @click="router.push('/admin/verification?tab=needs-decision')">
					<div class="metric-label">Pending flags</div>
					<div class="metric-value">{{ stats?.pending_flags ?? 0 }}</div>
					<div class="metric-footer">
						<span class="trend trend--up">▲ {{ stats?.trends?.pending_flags_pct ?? 8 }}% vs prior</span>
						<svg class="sparkline" viewBox="0 0 60 24" preserveAspectRatio="none">
							<polyline :points="sparklinePoints(stats?.sparklines?.flags ?? [])" fill="none" stroke="#f97316" stroke-width="1.5"/>
						</svg>
					</div>
				</div>
				<!-- Active Consumers -->
				<div class="metric-card" @click="router.push('/admin/usersprofile')">
					<div class="metric-label">Active Consumers</div>
					<div class="metric-value">{{ stats?.active_consumers ?? 0 }}</div>
					<div class="metric-footer">
						<span class="trend trend--up">▲ {{ stats?.trends?.active_consumers_pct ?? 5 }}% vs prior</span>
						<svg class="sparkline" viewBox="0 0 60 24" preserveAspectRatio="none">
							<polyline :points="sparklinePoints(stats?.sparklines?.consumers ?? [])" fill="none" stroke="#05c450" stroke-width="1.5"/>
						</svg>
					</div>
				</div>
				<!-- API Health -->
				<div class="metric-card" @click="router.push('/admin/systemlogs?filter=api')">
					<div class="metric-label">API health</div>
					<div class="metric-value">{{ stats?.api_latency_ms ?? 142 }} <span class="metric-unit">ms</span></div>
					<div class="metric-footer">
						<span class="health-pill">Healthy</span>
						<svg class="sparkline" viewBox="0 0 60 24" preserveAspectRatio="none">
							<polyline :points="sparklinePoints(stats?.sparklines?.api_health ?? [])" fill="none" stroke="#05c450" stroke-width="1.5"/>
						</svg>
					</div>
				</div>
			</template>
		</div>

		<!-- ── Row 2: Allergen Bar + Donut ─────────────────────────── -->
		<div class="chart-row chart-row--2col">
			<!-- Allergen Horizontal Bar Chart -->
			<div class="chart-card">
				<div class="chart-card-header">
					<div>
						<div class="chart-title">Allergens listed by Consumers</div>
						<div class="chart-sub">Aggregate counts · max 5 per profile</div>
					</div>
					<router-link to="/admin/users" class="view-all-link">View all</router-link>
				</div>
				<div v-if="isLoading" class="sk-bars">
					<div v-for="n in 8" :key="n" class="sk-bar-row">
						<div class="sk-line" style="width:70px;height:11px"></div>
						<div class="sk-bar-fill shimmer"></div>
					</div>
				</div>
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

			<!-- Scan Verdicts Donut -->
			<div class="chart-card">
				<div class="chart-card-header">
					<div>
						<div class="chart-title">Scan verdicts</div>
						<div class="chart-sub">Click a slice to filter flagged items</div>
					</div>
				</div>
				<div v-if="isLoading" class="sk-donut-wrap">
					<div class="sk-donut shimmer"></div>
				</div>
				<div v-else class="donut-wrap">
					<svg class="donut-svg" viewBox="0 0 120 120">
						<circle cx="60" cy="60" r="46" fill="none" stroke-width="18" class="donut-track"/>
						<circle
							v-for="seg in donutSegments" :key="seg.verdict"
							cx="60" cy="60" r="46" fill="none" stroke-width="18"
							:stroke="seg.color"
							:stroke-dasharray="seg.dash"
							:stroke-dashoffset="seg.offset"
							stroke-linecap="butt"
							class="donut-seg"
							@click="filterByVerdict(seg.verdict)"
							style="cursor:pointer"
						/>
						<text x="60" y="57" text-anchor="middle" class="donut-center-val">{{ scanVerdicts?.total ?? 0 }}</text>
						<text x="60" y="70" text-anchor="middle" class="donut-center-label">scans</text>
					</svg>
					<div class="donut-legend">
						<div v-for="seg in donutSegments" :key="seg.verdict" class="legend-row">
							<span class="legend-dot" :style="{ background: seg.color }"></span>
							<span class="legend-label">{{ seg.verdict }} {{ seg.pct }}%</span>
						</div>
					</div>
				</div>
				<p class="donut-caption">Halal is tracked separately as a dietary label, not an allergen.</p>
			</div>
		</div>

		<!-- ── Row 3: Area Line + Histogram ────────────────────────── -->
		<div class="chart-row chart-row--2col">
			<!-- Scans Over Time Area Chart -->
			<div class="chart-card">
				<div class="chart-card-header">
					<div>
						<div class="chart-title">Scans over time</div>
						<div class="chart-sub">Last {{ selectedRange === '7d' ? 7 : selectedRange === '90d' ? 90 : 30 }} days</div>
					</div>
				</div>
				<div v-if="isLoading" class="sk-chart-area shimmer"></div>
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

			<!-- AI Confidence Distribution Histogram -->
			<div class="chart-card">
				<div class="chart-card-header">
					<div>
						<div class="chart-title">AI confidence distribution</div>
						<div class="chart-sub">Threshold locked at 90%</div>
					</div>
				</div>
				<div v-if="isLoading" class="sk-chart-area shimmer"></div>
				<div v-else class="hist-wrap">
					<svg class="hist-svg" :viewBox="`0 0 ${HIST_W} ${HIST_H}`" preserveAspectRatio="none">
						<g v-for="(bar, i) in histBars" :key="bar.label">
							<rect
								:x="bar.x" :y="bar.y"
								:width="bar.w" :height="bar.barH"
								:fill="bar.aboveThreshold ? '#05c450' : '#2d6a4f'"
								rx="3"
								@click="bar.aboveThreshold ? null : goToTrainingCorrections()"
								style="cursor: pointer"
							/>
						</g>
						<!-- 90% threshold dashed line -->
						<line
							:x1="thresholdX" y1="0"
							:x2="thresholdX" :y2="HIST_H - 28"
							stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 3"
						/>
						<text :x="thresholdX + 3" y="12" class="threshold-label">90% threshold</text>
					</svg>
					<div class="hist-axis">
						<span v-for="bar in histBars" :key="bar.label">{{ bar.label }}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- ── Recent Flagged Items Table ───────────────────────────── -->
		<div class="table-card">
			<div class="table-header">
				<div class="chart-title">Recent flagged items</div>
				<router-link to="/admin/verification" class="view-all-link">View all</router-link>
			</div>
			<table class="flag-table">
				<thead>
					<tr>
						<th>PRODUCT</th>
						<th>REASON</th>
						<th>VERDICT</th>
						<th>SCANS</th>
						<th>STATUS</th>
					</tr>
				</thead>
				<tbody>
					<!-- Skeleton rows -->
					<template v-if="isLoading">
						<tr v-for="n in 3" :key="n" class="sk-row">
							<td colspan="5"><div class="sk-line" style="height:14px;width:100%"></div></td>
						</tr>
					</template>
					<template v-else>
						<tr v-if="recentFlaggedItems.length === 0">
							<td colspan="5" class="empty-note">No pending flagged items.</td>
						</tr>
						<tr
							v-for="item in recentFlaggedItems"
							:key="item.id"
							class="flag-row"
							@click="goToFlaggedItem(item.id)">
							<td class="flag-product">{{ item.product_name }}</td>
							<td class="flag-reason">{{ item.flag_reason }}</td>
							<td>
								<span class="verdict-badge" :class="`verdict-badge--${(item.safety_verdict ?? 'red').toLowerCase()}`">
									{{ item.safety_verdict ?? 'Red' }}
								</span>
							</td>
							<td class="flag-scans">{{ item.scan_count }}</td>
							<td>
								<span class="status-badge" :class="item.status === 'Pending' ? 'status-badge--pending' : 'status-badge--rescan'">
									{{ item.status }}
								</span>
							</td>
						</tr>
					</template>
				</tbody>
			</table>
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
}
interface ScanVerdicts { Green: number; Yellow: number; Red: number; total: number }
interface ScansOverTimeEntry { date: string; count: number }
interface ConfBucket { label: string; count: number }
interface AllergenEntry { name: string; count: number }
interface RecentFlaggedItem {
	id: number
	product_name: string
	brand_name: string
	flag_reason: string
	safety_verdict: string | null
	scan_count: number
	status: string
}

// ── State ──────────────────────────────────────────────────────────────────
const router = useRouter()
const adminStore = useAdminAuthStore()
const adminName = computed(() => adminStore.admin?.full_name?.split(' ')[0] ?? 'Admin')

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const stats = ref<DashboardStats | null>(null)
const scanVerdicts = ref<ScanVerdicts | null>(null)
const scansOverTime = ref<ScansOverTimeEntry[]>([])
const confDistribution = ref<ConfBucket[]>([])
const allergenDist = ref<AllergenEntry[]>([])
const recentFlaggedItems = ref<RecentFlaggedItem[]>([])

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
			scan_verdicts: ScanVerdicts
			scans_over_time: ScansOverTimeEntry[]
			ai_confidence_distribution: ConfBucket[]
			allergen_distribution: AllergenEntry[]
			recent_flagged_items: RecentFlaggedItem[]
		}>(`/api/admin/dashboard?range=${selectedRange.value}`, { isAdmin: true })
		stats.value = data.stats
		scanVerdicts.value = data.scan_verdicts
		scansOverTime.value = data.scans_over_time
		confDistribution.value = data.ai_confidence_distribution
		allergenDist.value = data.allergen_distribution.length > 0 ? data.allergen_distribution : [
			{ name: 'Peanuts', count: 58 }, { name: 'Shellfish', count: 51 }, { name: 'Milk', count: 44 },
			{ name: 'Eggs', count: 39 }, { name: 'Soy', count: 31 }, { name: 'Wheat', count: 27 },
			{ name: 'Fish', count: 19 }, { name: 'Tree nuts', count: 16 },
		]
		recentFlaggedItems.value = data.recent_flagged_items
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

function goToVerification(): void { router.push('/admin/verification') }
function filterByVerdict(verdict: string): void { router.push(`/admin/verification?verdict=${verdict}`) }
function goToAllergen(name: string): void { router.push('/admin/productsdata?allergen=' + encodeURIComponent(name)) }
function goToTrainingCorrections(): void { router.push('/admin/verification?tab=training-corrections') }
function goToFlaggedItem(id: number): void { router.push('/admin/verification?card=' + id) }

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

// ── Donut chart ───────────────────────────────────────────────────────────
const DONUT_R = 46
const DONUT_CIRC = 2 * Math.PI * DONUT_R

const donutSegments = computed(() => {
	const v = scanVerdicts.value ?? { Green: 62, Yellow: 21, Red: 17, total: 100 }
	const total = v.total || 1
	const segs = [
		{ verdict: 'Green', color: '#05c450', count: v.Green },
		{ verdict: 'Yellow', color: '#f59e0b', count: v.Yellow },
		{ verdict: 'Red', color: '#ef4444', count: v.Red },
	]
	let cumulative = 0
	return segs.map((s) => {
		const pct = Math.round((s.count / total) * 100)
		const dash = (s.count / total) * DONUT_CIRC
		const gap = DONUT_CIRC - dash
		// SVG starts at 3 o'clock; rotate to 12 o'clock by subtracting quarter circumference
		const offset = -(cumulative / total) * DONUT_CIRC + DONUT_CIRC / 4
		cumulative += s.count
		return { ...s, pct, dash: `${dash.toFixed(2)} ${gap.toFixed(2)}`, offset: offset.toFixed(2) }
	})
})

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

// ── Histogram ─────────────────────────────────────────────────────────────
const HIST_W = 280, HIST_H = 140

const histBars = computed(() => {
	const data = confDistribution.value.length > 0 ? confDistribution.value : [
		{ label: '<50', count: 4 }, { label: '50–70', count: 8 }, { label: '70–80', count: 14 },
		{ label: '80–90', count: 22 }, { label: '90–95', count: 31 }, { label: '95+', count: 38 },
	]
	const maxCount = Math.max(...data.map((d) => d.count), 1)
	const n = data.length
	const barW = (HIST_W / n) * 0.65
	const gap = (HIST_W / n) * 0.35
	return data.map((d, i) => {
		const barH = (d.count / maxCount) * (HIST_H - 32)
		const x = i * (HIST_W / n) + gap / 2
		const y = HIST_H - 28 - barH
		// threshold is at the 80–90 / 90–95 boundary (index 4 = '90–95' bucket start)
		const aboveThreshold = i >= 4
		return { ...d, x, y, w: barW, barH, aboveThreshold }
	})
})

// threshold line x = start of '90–95' bucket
const thresholdX = computed(() => {
	const n = 6
	const gap = (HIST_W / n) * 0.35
	return 4 * (HIST_W / n) + gap / 2 - 1
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
	background: #111827;
	color: #ffffff;
	border-color: #111827;
}

/* ── 4-card metric grid ───────────────────────────────── */
.metric-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
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

/* ── Donut chart ──────────────────────────────────────── */
.donut-wrap {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 20px;
	padding: 8px 0;
}
.donut-svg {
	width: 130px;
	height: 130px;
	flex-shrink: 0;
}
.donut-track { stroke: #f3f4f6; }
.donut-seg { transition: opacity 0.15s; }
.donut-seg:hover { opacity: 0.8; }
.donut-center-val {
	font-size: 22px;
	font-weight: 700;
	fill: #111827;
}
.donut-center-label {
	font-size: 9px;
	fill: #9ca3af;
}
.donut-legend { display: flex; flex-direction: column; gap: 8px; }
.legend-row { display: flex; align-items: center; gap: 8px; }
.legend-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	flex-shrink: 0;
}
.legend-label { font-size: 0.8rem; color: #374151; }
.donut-caption {
	font-size: 0.72rem;
	color: #9ca3af;
	margin: 12px 0 0;
	line-height: 1.4;
}

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

/* ── Histogram ────────────────────────────────────────── */
.hist-wrap { display: flex; flex-direction: column; gap: 4px; }
.hist-svg {
	width: 100%;
	height: 120px;
	overflow: visible;
}
.threshold-label {
	font-size: 7px;
	fill: #ef4444;
	font-weight: 600;
}
.hist-axis {
	display: flex;
	justify-content: space-between;
	font-size: 0.68rem;
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
.sk-donut-wrap { display: flex; justify-content: center; padding: 24px 0; }
.sk-donut {
	width: 130px;
	height: 130px;
	border-radius: 50%;
}
.sk-chart-area {
	width: 100%;
	height: 140px;
	border-radius: 10px;
}
.sk-row td { padding: 10px 12px; }
</style>
