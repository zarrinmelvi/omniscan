<template>
	<div class="system-logs">
		<!-- Page Title & Subtitle -->
		<header class="page-header">
			<div class="header-top">
				<h1>System Logs</h1>
				<span class="live-indicator">
					<span class="dot"></span>
					Live - {{ currentTimeUtc }} UTC
				</span>
			</div>
			<p class="subtitle">Nitro server performance · Prisma queries · Ollama Pro latency</p>
		</header>

		<!-- Sub-Navigation Tabs -->
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

		<!-- Top Summary Stat Cards -->
		<div class="stat-cards">
			<div class="stat-card purple-card">
				<div class="card-header-row">
					<svg class="card-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
					</svg>
					<span class="stat-label">Avg. Latency</span>
				</div>
				<div class="stat-value purple-text">{{ stats.avgLatency }}ms</div>
			</div>

			<div class="stat-card orange-card">
				<div class="card-header-row">
					<svg class="card-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
						<line x1="12" y1="9" x2="12" y2="13"></line>
						<line x1="12" y1="17" x2="12.01" y2="17"></line>
					</svg>
					<span class="stat-label">Peak Latency</span>
				</div>
				<div class="stat-value orange-text">{{ stats.peakLatency }}ms</div>
			</div>

			<div class="stat-card blue-card">
				<div class="card-header-row">
					<svg class="card-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
					</svg>
					<span class="stat-label">Total Requests</span>
				</div>
				<div class="stat-value blue-text">{{ stats.totalRequests.toLocaleString() }}</div>
			</div>

			<div class="stat-card green-card">
				<div class="card-header-row">
					<svg class="card-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
						<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
						<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
						<path d="M21 19c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
					</svg>
					<span class="stat-label">DB Status</span>
				</div>
				<div class="stat-value green-text">{{ stats.dbStatus }}</div>
			</div>
		</div>

		<!-- Main API Latency Chart Box -->
		<div class="chart-card">
			<div class="chart-header">
				<h2>API Latency - Today (ms)</h2>
				<span class="chart-subtitle">Ollama Pro · Nitro - Target: &lt;300ms</span>
			</div>

			<!-- SVG Graph Visualization -->
			<div class="chart-container">
				<svg viewBox="0 0 800 200" class="chart-svg" preserveAspectRatio="none">
					<!-- Horizontal Grid Lines -->
					<line x1="40" y1="20" x2="780" y2="20" class="grid-line" />
					<line x1="40" y1="65" x2="780" y2="65" class="grid-line" />
					<line x1="40" y1="110" x2="780" y2="110" class="grid-line" />
					<line x1="40" y1="155" x2="780" y2="155" class="grid-line" opacity="0.8" />

					<!-- Y-Axis Labels -->
					<text x="32" y="24" class="axis-label">600</text>
					<text x="32" y="69" class="axis-label">450</text>
					<text x="32" y="114" class="axis-label">300</text>
					<text x="32" y="159" class="axis-label">150</text>
					<text x="38" y="180" class="axis-label">0</text>

					<!-- Smoothed Latency Trend Line -->
					<path
						d="M 40 150 
						   C 80 152, 120 150, 160 148 
						   C 200 140, 240 135, 280 137 
						   C 320 138, 360 125, 400 120 
						   C 440 125, 480 142, 520 148 
						   C 560 150, 600 110, 640 108 
						   C 680 112, 720 130, 780 148"
						fill="none"
						stroke="#4f46e5"
						stroke-width="2"
					/>
				</svg>

				<!-- Time X-Axis Labels -->
				<div class="time-labels">
					<span>08:00</span>
					<span>08:30</span>
					<span>09:00</span>
					<span>09:30</span>
					<span>10:00</span>
					<span>10:30</span>
					<span>11:00</span>
					<span>11:30</span>
					<span>12:00</span>
					<span>12:30</span>
					<span>13:00</span>
					<span>13:30</span>
				</div>
			</div>

			<!-- Chart Legend -->
			<div class="chart-legend">
				<span class="legend-item">
					<span class="legend-dot purple"></span>
					Latency (ms)
				</span>
				<span class="legend-item">
					<span class="legend-dot green"></span>
					Requests
				</span>
			</div>

			<!-- Alert Box -->
			<div class="alert-box">
				<svg class="alert-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
					<line x1="12" y1="9" x2="12" y2="13"></line>
					<line x1="12" y1="17" x2="12.01" y2="17"></line>
				</svg>
				<span>Peak latency of 312ms exceeded 300ms target at 12:00. Possible GPT rate-limit event.</span>
			</div>
		</div>

		<!-- Service Status Cards Grid -->
		<div class="services-grid">
			<div class="service-card">
				<div class="service-info">
					<span class="service-name">Nitro API Server</span>
					<span class="status-text green-status">Operational</span>
				</div>
				<div class="service-uptime">
					<span class="uptime-val">99.98%</span>
					<span class="uptime-label">uptime</span>
				</div>
			</div>

			<div class="service-card">
				<div class="service-info">
					<span class="service-name">Neon PostgreSQL</span>
					<span class="status-text green-status">Operational</span>
				</div>
				<div class="service-uptime">
					<span class="uptime-val">99.95%</span>
					<span class="uptime-label">uptime</span>
				</div>
			</div>

			<div class="service-card">
				<div class="service-info">
					<span class="service-name">Ollama Pro</span>
					<span class="status-text orange-status">Degraded (rate-limit)</span>
				</div>
				<div class="service-uptime">
					<span class="uptime-val">97.2%</span>
					<span class="uptime-label">uptime</span>
				</div>
			</div>

			<div class="service-card">
				<div class="service-info">
					<span class="service-name">Prisma ORM</span>
					<span class="status-text green-status">Operational</span>
				</div>
				<div class="service-uptime">
					<span class="uptime-val">100%</span>
					<span class="uptime-label">uptime</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const activeTab = ref('overview')

const tabs = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'api-latency', label: 'API Latency' },
	{ id: 'prisma-queries', label: 'Prisma Queries' },
	{ id: 'raw-logs', label: 'Raw Logs' },
]

const stats = ref({
	avgLatency: 199,
	peakLatency: 312,
	totalRequests: 2990,
	dbStatus: 'NOMINAL',
})

// Real-time UTC Time formatting matching the top right badge
const now = ref(new Date())
let timeInterval: ReturnType<typeof setInterval> | null = null

const currentTimeUtc = computed(() => {
	const hours = String(now.value.getUTCHours()).padStart(2, '0')
	const minutes = String(now.value.getUTCMinutes()).padStart(2, '0')
	return `${hours}:${minutes}`
})

onMounted(() => {
	timeInterval = setInterval(() => {
		now.value = new Date()
	}, 1000)
})

onUnmounted(() => {
	if (timeInterval) clearInterval(timeInterval)
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

/* Page Header */
.page-header {
	margin-bottom: 20px;
}

.header-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 4px;
}

h1 {
	font-size: 1.5rem;
	font-weight: 700;
	margin: 0;
	color: #0f172a;
}

.subtitle {
	color: #64748b;
	font-size: 0.88rem;
	margin: 0;
}

/* Live Badge Indicator */
.live-indicator {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 12px;
	border-radius: 20px;
	background-color: #f0fdf4;
	border: 1px solid #bbf7d0;
	color: #16a34a;
	font-size: 0.78rem;
	font-weight: 600;
}

.dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background-color: #16a34a;
}

/* Tabs Navigation Bar */
.tabs-bar {
	display: flex;
	gap: 8px;
	margin-bottom: 24px;
}

.tab-btn {
	padding: 8px 18px;
	border-radius: 8px;
	border: none;
	background: transparent;
	color: #64748b;
	font-size: 0.88rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s ease;
}

.tab-btn:hover {
	color: #0f172a;
}

.tab-btn.active {
	background: #ffffff;
	color: #0f172a;
	font-weight: 600;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Stat Cards Top Row Grid */
.stat-cards {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 16px;
	margin-bottom: 24px;
}

.stat-card {
	background: #ffffff;
	border-radius: 12px;
	padding: 16px 20px;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.purple-card { border: 1px solid #e9d5ff; background-color: #faf5ff; }
.orange-card { border: 1px solid #ffedd5; background-color: #fff7ed; }
.blue-card { border: 1px solid #dbeafe; background-color: #eff6ff; }
.green-card { border: 1px solid #dcfce7; background-color: #f0fdf4; }

.card-header-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 8px;
}

.card-icon {
	color: #64748b;
}

.stat-label {
	font-size: 0.82rem;
	color: #475569;
	font-weight: 500;
}

.stat-value {
	font-size: 1.6rem;
	font-weight: 700;
	line-height: 1.1;
}

.purple-text { color: #9333ea; }
.orange-text { color: #ea580c; }
.blue-text { color: #2563eb; }
.green-text { color: #16a34a; }

/* Chart Card Box */
.chart-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 24px;
	margin-bottom: 24px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.chart-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.chart-header h2 {
	font-size: 0.95rem;
	font-weight: 600;
	margin: 0;
	color: #1e293b;
}

.chart-subtitle {
	font-size: 0.8rem;
	color: #94a3b8;
}

/* SVG & Graph Container */
.chart-container {
	position: relative;
	width: 100%;
}

.chart-svg {
	width: 100%;
	height: 180px;
	overflow: visible;
}

.grid-line {
	stroke: #f1f5f9;
	stroke-width: 1;
}

.axis-label {
	font-size: 11px;
	fill: #94a3b8;
}

.time-labels {
	display: flex;
	justify-content: space-between;
	padding-left: 36px;
	padding-right: 12px;
	margin-top: 8px;
	font-size: 0.75rem;
	color: #94a3b8;
}

/* Legend */
.chart-legend {
	display: flex;
	justify-content: center;
	gap: 20px;
	margin-top: 16px;
	margin-bottom: 20px;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.8rem;
	color: #64748b;
}

.legend-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.legend-dot.purple { background-color: #6366f1; }
.legend-dot.green { background-color: #10b981; }

/* Alert Box */
.alert-box {
	display: flex;
	align-items: center;
	gap: 10px;
	background-color: #fffbebf5;
	border: 1px solid #fef08a;
	border-radius: 8px;
	padding: 12px 16px;
	font-size: 0.82rem;
	color: #854d0e;
}

.alert-icon {
	color: #d97706;
	flex-shrink: 0;
}

/* Bottom Services Grid */
.services-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16px;
}

.service-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 18px 24px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.service-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.service-name {
	font-size: 0.9rem;
	font-weight: 600;
	color: #1e293b;
}

.status-text {
	font-size: 0.8rem;
	font-weight: 500;
}

.green-status { color: #16a34a; }
.orange-status { color: #d97706; }

.service-uptime {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.uptime-val {
	font-size: 0.9rem;
	font-weight: 600;
	color: #334155;
}

.uptime-label {
	font-size: 0.75rem;
	color: #94a3b8;
}
</style>