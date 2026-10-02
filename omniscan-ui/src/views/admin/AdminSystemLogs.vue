<template>
	<div class="system-logs">
		<header class="page-header">
			<div class="header-top">
				<h1>System Logs</h1>
				<span class="live-indicator">
					<span class="dot"></span>
					Live · {{ currentTimeUtc }} UTC
				</span>
			</div>
			<p class="subtitle">Nitro server performance · Prisma queries · Ollama Pro latency</p>
		</header>

		<!-- Tabs -->
		<div class="tabs-bar">
			<button
				v-for="tab in tabs"
				:key="tab.id"
				class="tab-btn"
				:class="{ active: activeTab === tab.id }"
				@click="activeTab = tab.id"
			>
				{{ tab.label }}
			</button>
		</div>

		<p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

		<!-- OVERVIEW + API LATENCY TAB: chart -->
		<div v-if="activeTab === 'overview' || activeTab === 'api-latency'" class="chart-card">
			<div class="chart-header">
				<h2>API Latency (ms)</h2>
				<span class="chart-subtitle">Live · Target: &lt;{{ latencyTarget }}ms · p95: {{ overview.p95_latency }}ms</span>
			</div>

			<div v-if="latencySeries.length === 0" class="empty-note">
				No requests recorded on this instance yet. Interact with the app to generate telemetry.
			</div>

			<div v-else class="chart-container">
				<svg viewBox="0 0 800 200" class="chart-svg" preserveAspectRatio="none">
					<line v-for="g in gridLines" :key="g.y" x1="40" :y1="g.y" x2="780" :y2="g.y" class="grid-line" />
					<text v-for="g in gridLines" :key="'t' + g.y" x="32" :y="g.y + 4" class="axis-label">{{ g.label }}</text>
					<polyline :points="chartPoints" fill="none" stroke="#4f46e5" stroke-width="2" />
					<circle v-for="(p, i) in chartDots" :key="i" :cx="p.x" :cy="p.y" r="2.5" fill="#4f46e5" />
				</svg>
				<div class="time-labels">
					<span v-for="(pt, i) in latencySeries" :key="i">{{ pt.label }}</span>
				</div>
			</div>

			<div v-if="peakAlert" class="alert-box">
				<svg class="alert-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
				<span>Peak latency of {{ overview.peak_latency }}ms exceeded the {{ latencyTarget }}ms target. Possible Ollama Pro rate-limit or DB contention.</span>
			</div>
		</div>

		<!-- API LATENCY TAB: request log table -->
		<div v-if="activeTab === 'api-latency'" class="log-card">
			<div class="log-header">Recent API Requests ({{ data?.api_requests.length ?? 0 }})</div>
			<div class="log-scroll">
				<table class="log-table">
					<thead><tr><th>TIME</th><th>METHOD</th><th>PATH</th><th>STATUS</th><th>LATENCY</th></tr></thead>
					<tbody>
						<tr v-for="(r, i) in data?.api_requests ?? []" :key="i">
							<td class="mono muted">{{ r.time }}</td>
							<td><span class="method-chip">{{ r.method }}</span></td>
							<td class="mono">{{ r.path }}</td>
							<td><span class="status-chip" :class="statusChipClass(r.status)">{{ r.status }}</span></td>
							<td class="mono" :class="latencyClass(r.durationMs)">{{ r.durationMs }}ms</td>
						</tr>
						<tr v-if="(data?.api_requests.length ?? 0) === 0"><td colspan="5" class="empty-row">No requests recorded yet.</td></tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- PRISMA QUERIES TAB -->
		<div v-if="activeTab === 'prisma-queries'" class="log-card">
			<div class="log-header">Recent Prisma Queries ({{ data?.prisma_queries.length ?? 0 }})</div>
			<div class="log-scroll">
				<table class="log-table">
					<thead><tr><th>TIME</th><th>MODEL / TABLE</th><th>ACTION</th><th>DURATION</th></tr></thead>
					<tbody>
						<tr v-for="(q, i) in data?.prisma_queries ?? []" :key="i">
							<td class="mono muted">{{ q.time }}</td>
							<td class="mono">{{ q.model }}</td>
							<td><span class="method-chip">{{ q.action }}</span></td>
							<td class="mono" :class="latencyClass(q.durationMs)">{{ q.durationMs }}ms</td>
						</tr>
						<tr v-if="(data?.prisma_queries.length ?? 0) === 0"><td colspan="4" class="empty-row">No queries recorded yet.</td></tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- FLAG AUDIT TAB -->
		<div v-if="activeTab === 'flag-audit'" class="log-card">
			<div class="log-header">
				Non-Halal Flagged Scans — Allergen &amp; Safety Flags ({{ flagAuditRows.length }})
			</div>
			<div class="flag-audit-controls">
				<select v-model="flagAuditFilter" class="flag-filter-select">
					<option value="all">All Types</option>
					<option value="allergen">Allergen</option>
					<option value="other">Confidence Flag</option>
				</select>
			</div>
			<div class="log-scroll">
				<table class="log-table flag-audit-table">
					<thead>
						<tr>
							<th>ID</th>
							<th>PRODUCT</th>
							<th>SCANNED BY</th>
							<th>FLAG REASON</th>
							<th>TYPE</th>
							<th>STATUS</th>
							<th>DATE</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in filteredFlagAuditRows" :key="row.id">
							<td class="mono muted">#{{ row.id }}</td>
							<td>
								<div class="flag-product-name">{{ row.brand_name ? row.brand_name + ' ' : '' }}{{ row.product_name }}</div>
							</td>
							<td class="muted">{{ row.scanned_by }}</td>
							<td class="flag-reason-cell">{{ row.flag_reason }}</td>
							<td>
								<span class="flag-type-chip" :class="'ftype-' + row.halal_flag_type">
									{{ row.halal_flag_type === 'allergen' ? 'Allergen' : 'Confidence' }}
								</span>
							</td>
							<td>
								<span class="flag-status-chip fstatus-recorded">Recorded</span>
							</td>
							<td class="mono muted">{{ formatFlagDate(row.created_at) }}</td>
						</tr>
						<tr v-if="filteredFlagAuditRows.length === 0">
							<td colspan="7" class="empty-row">No flag records match the current filters.</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Service health cards (always visible) -->
		<div class="services-grid">
			<div v-for="svc in services" :key="svc.name" class="service-card">
				<div class="service-info">
					<span class="service-name">{{ svc.name }}</span>
					<span class="status-text" :class="serviceStatusClass(svc.status)">{{ serviceStatusLabel(svc.status) }}</span>
					<span class="service-detail">{{ svc.detail }}</span>
				</div>
				<div class="service-uptime">
					<span class="uptime-val">{{ svc.latencyMs != null ? svc.latencyMs + 'ms' : '—' }}</span>
					<span class="uptime-label">latency</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

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

interface SystemLogsResponse {
	overview: Overview
	latency_target_ms: number
	services: ServiceHealth[]
	latency_series: SeriesPoint[]
	api_requests: ApiRequestRow[]
	prisma_queries: QueryRow[]
	raw_logs: LogRow[]
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

const activeTab = ref('overview')
const tabs = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'api-latency', label: 'API Latency' },
	{ id: 'prisma-queries', label: 'Prisma Queries' },
	{ id: 'flag-audit', label: 'Flag Audit' },
]

const data = ref<SystemLogsResponse | null>(null)
const errorMessage = ref<string | null>(null)

const flagAuditRows = ref<FlagAuditRow[]>([])
const flagAuditFilter = ref<'all' | 'allergen' | 'other'>('all')

const filteredFlagAuditRows = computed(() => {
	return flagAuditRows.value.filter((r) => {
		if (flagAuditFilter.value !== 'all' && r.halal_flag_type !== flagAuditFilter.value) return false
		return true
	})
})

const overview = computed<Overview>(() => data.value?.overview ?? { avg_latency: 0, peak_latency: 0, p95_latency: 0, total_requests: 0, db_status: '—' })
const services = computed<ServiceHealth[]>(() => data.value?.services ?? [])
const latencySeries = computed<SeriesPoint[]>(() => data.value?.latency_series ?? [])
const latencyTarget = computed(() => data.value?.latency_target_ms ?? 300)
const peakAlert = computed(() => overview.value.peak_latency > latencyTarget.value)

const dbStatusClass = computed(() => {
	const s = overview.value.db_status
	if (s === 'NOMINAL') return 'green-text'
	if (s === 'SLOW') return 'orange-text'
	if (s === 'DOWN') return 'red-text'
	return 'green-text'
})

// --- Chart geometry (maps the live series onto the 800x200 viewBox) ---
const CHART_LEFT = 40
const CHART_RIGHT = 780
const CHART_TOP = 20
const CHART_BOTTOM = 175

const chartMax = computed(() => {
	const vals = latencySeries.value.map((p) => p.value)
	const peak = Math.max(latencyTarget.value, ...(vals.length ? vals : [0]))
	// Round up to a "nice" ceiling so the axis reads cleanly.
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

function pointFor(index: number, value: number) {
	const n = latencySeries.value.length
	const x = n <= 1 ? CHART_LEFT : CHART_LEFT + (CHART_RIGHT - CHART_LEFT) * (index / (n - 1))
	const y = CHART_BOTTOM - (CHART_BOTTOM - CHART_TOP) * (value / chartMax.value)
	return { x, y }
}

const chartDots = computed(() => latencySeries.value.map((p, i) => pointFor(i, p.value)))
const chartPoints = computed(() => chartDots.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))

// --- Cell class helpers ---
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
function serviceStatusClass(status: string): string {
	if (status === 'operational') return 'green-status'
	if (status === 'degraded') return 'orange-status'
	return 'red-status'
}
function serviceStatusLabel(status: string): string {
	if (status === 'operational') return 'Operational'
	if (status === 'degraded') return 'Degraded'
	return 'Down'
}

// --- Live clock ---
const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | null = null
const currentTimeUtc = computed(() => {
	const h = String(now.value.getUTCHours()).padStart(2, '0')
	const m = String(now.value.getUTCMinutes()).padStart(2, '0')
	const s = String(now.value.getUTCSeconds()).padStart(2, '0')
	return `${h}:${m}:${s}`
})

// --- Polling ---
let poller: ReturnType<typeof setInterval> | null = null

function formatFlagDate(iso: string): string {
	if (!iso) return '—'
	const d = new Date(iso)
	return d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

async function fetchFlagAudit(): Promise<void> {
	try {
		const res = await apiFetch<{ success: boolean; flagged_scans: any[] }>(
			'/api/admin/flagged-scans?type=all',
			{ isAdmin: true }
		)
		flagAuditRows.value = (res.flagged_scans ?? [])
			.filter((s) => s.halal_flag_type !== 'halal')
			.map((s) => ({
				id: s.id,
				product_name: s.product_name ?? 'Unknown product',
				brand_name: s.brand_name ?? '',
				scanned_by: s.scanned_by ?? '—',
				flag_reason: s.flag_reason ?? '—',
				halal_flag_type: s.halal_flag_type === 'allergen' ? 'allergen' : 'other',
				status: s.status ?? 'pending',
				created_at: s.created_at ?? '',
			}))
	} catch (err) {
		console.error('Failed to load flag audit:', err)
	}
}

async function fetchLogs(): Promise<void> {
	try {
		data.value = await apiFetch<SystemLogsResponse>('/api/admin/system-logs', { isAdmin: true })
		errorMessage.value = null
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to load system telemetry.'
	}
}

onMounted(() => {
	fetchLogs()
	fetchFlagAudit()
	clock = setInterval(() => (now.value = new Date()), 1000)
	poller = setInterval(fetchLogs, 5000) // refresh telemetry every 5s
})

onUnmounted(() => {
	if (clock) clearInterval(clock)
	if (poller) clearInterval(poller)
})
</script>

<style scoped>
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

.tabs-bar { display: flex; gap: 8px; margin-bottom: 24px; }
.tab-btn { padding: 8px 18px; border-radius: 8px; border: none; background: transparent; color: #64748b; font-size: 0.88rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
.tab-btn:hover { color: #0f172a; }
.tab-btn.active { background: #008744; color: #ffffff; font-weight: 600; border-color: #008744; }

.error-message { padding: 14px 18px; margin-bottom: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.85rem; }

.orange-text { color: #ea580c; }
.blue-text { color: #2563eb; }
.green-text { color: #16a34a; }
.red-text { color: #dc2626; }

.chart-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02); }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.chart-header h2 { font-size: 0.95rem; font-weight: 600; margin: 0; color: #1e293b; }
.chart-subtitle { font-size: 0.8rem; color: #94a3b8; }
.chart-container { position: relative; width: 100%; }
.chart-svg { width: 100%; height: 180px; overflow: visible; }
.grid-line { stroke: #f1f5f9; stroke-width: 1; }
.axis-label { font-size: 11px; fill: #94a3b8; }
.time-labels { display: flex; justify-content: space-between; padding-left: 36px; padding-right: 12px; margin-top: 8px; font-size: 0.7rem; color: #94a3b8; }
.time-labels span { flex: 1; text-align: center; }

.alert-box { display: flex; align-items: center; gap: 10px; background-color: #fffbeb; border: 1px solid #fef08a; border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #854d0e; margin-top: 16px; }
.alert-icon { color: #d97706; flex-shrink: 0; }

.empty-note { padding: 40px; text-align: center; color: #94a3b8; font-size: 0.85rem; }

/* Log cards */
.log-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; overflow: hidden; }
.log-header { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; font-weight: 600; color: #475569; }
.log-scroll { max-height: 420px; overflow-y: auto; }
.log-table { width: 100%; border-collapse: collapse; }
.log-table th { position: sticky; top: 0; background: #f8fafc; text-align: left; padding: 10px 20px; font-size: 0.68rem; font-weight: 700; color: #64748b; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
.log-table td { padding: 10px 20px; border-bottom: 1px solid #f8fafc; font-size: 0.82rem; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.muted { color: #94a3b8; }
.empty-row { text-align: center; color: #94a3b8; padding: 32px; }

.method-chip { display: inline-block; background: #eef2ff; color: #4338ca; border-radius: 5px; padding: 2px 7px; font-size: 0.72rem; font-weight: 700; font-family: ui-monospace, monospace; }
.status-chip { display: inline-block; border-radius: 5px; padding: 2px 8px; font-size: 0.72rem; font-weight: 700; }
.chip-green { background: #dcfce7; color: #15803d; }
.chip-blue { background: #dbeafe; color: #2563eb; }
.chip-yellow { background: #fef9c3; color: #a16207; }
.chip-red { background: #fee2e2; color: #b91c1c; }

/* Services */
.services-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.service-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
.service-info { display: flex; flex-direction: column; gap: 3px; }
.service-name { font-size: 0.9rem; font-weight: 600; color: #1e293b; }
.status-text { font-size: 0.8rem; font-weight: 500; }
.service-detail { font-size: 0.74rem; color: #94a3b8; }
.green-status { color: #16a34a; }
.orange-status { color: #d97706; }
.red-status { color: #dc2626; }
.service-uptime { display: flex; flex-direction: column; align-items: flex-end; }
.uptime-val { font-size: 0.9rem; font-weight: 600; color: #334155; }
.uptime-label { font-size: 0.75rem; color: #94a3b8; }

/* Flag Audit Tab */
.flag-audit-controls {
	display: flex;
	gap: 10px;
	padding: 12px 20px;
	border-bottom: 1px solid #f1f5f9;
}
.flag-filter-select {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 6px 12px;
	font-size: 0.82rem;
	color: #334155;
	outline: none;
	cursor: pointer;
}
.flag-audit-table {
	min-width: 900px;
}
.flag-product-name {
	font-weight: 500;
	color: #1e293b;
	font-size: 0.83rem;
}
.flag-reason-cell {
	max-width: 280px;
	font-size: 0.78rem;
	color: #475569;
	line-height: 1.4;
	word-break: break-word;
}
.flag-type-chip {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 5px;
	font-size: 0.72rem;
	font-weight: 700;
}
.ftype-allergen { background: #fee2e2; color: #b91c1c; }
.ftype-other    { background: #eff6ff; color: #2563eb; }

.flag-status-chip {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 5px;
	font-size: 0.72rem;
	font-weight: 600;
}
.fstatus-recorded  { background: #f1f5f9; color: #475569; }
</style>
