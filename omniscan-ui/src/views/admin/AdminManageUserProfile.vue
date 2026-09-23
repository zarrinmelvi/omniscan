<template>
	<div class="manage-user-profile">
		<!-- Page Header -->
		<header class="page-header">
			<h1>Manage User Profiles</h1>
			<p class="subtitle">
				View and monitor user accounts · Review flagged profiles
			</p>
		</header>

		<!-- Account Lifecycle Policy Card -->
		<div class="lifecycle-card">
			<div class="policy-header">
				<svg class="info-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="12" y1="16" x2="12" y2="12"></line>
					<line x1="12" y1="8" x2="12.01" y2="8"></line>
				</svg>
				<span>ACCOUNT LIFECYCLE POLICY</span>
			</div>

			<div class="policy-body">
				<div class="policy-column">
					<div class="policy-icon-wrapper orange-bg">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"></path>
							<path d="M3 8l9 5 9-5"></path>
							<path d="M12 13v8"></path>
						</svg>
					</div>
					<div class="policy-text">
						<div class="policy-title">6 Months Inactive &rarr; Archived</div>
						<p class="policy-desc">
							Accounts with no activity for <span class="highlight-orange">6 months (180 days)</span> are automatically moved to <span class="highlight-orange">Archive</span>. The user is notified by email and has 1 week to log back in before permanent deletion.
						</p>
					</div>
				</div>

				<div class="policy-divider"></div>

				<div class="policy-column">
					<div class="policy-icon-wrapper red-bg">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6"></polyline>
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
						</svg>
					</div>
					<div class="policy-text">
						<div class="policy-title">+1 Week After Archive &rarr; Deleted</div>
						<p class="policy-desc">
							If no login occurs within <span class="highlight-red">7 days of archiving</span>, the account is permanently <span class="highlight-red">deleted</span>. All personal data is anonymised in compliance with PDPA / GDPR.
						</p>
					</div>
				</div>
			</div>

			<!-- Lifecycle Visual Timeline -->
			<div class="lifecycle-timeline">
				<div class="timeline-step">
					<span class="timeline-dot green-dot"></span>
					<span class="timeline-text green-text">Active</span>
				</div>
				<div class="timeline-bar"></div>
				<div class="timeline-step">
					<span class="timeline-dot orange-dot"></span>
					<span class="timeline-text orange-text">6 months &rarr; Archive</span>
				</div>
				<div class="timeline-bar red-gradient"></div>
				<div class="timeline-step">
					<span class="timeline-dot red-dot"></span>
					<span class="timeline-text red-text">+1 week &rarr; Deleted</span>
				</div>
			</div>
		</div>

		<!-- Stat Cards Grid -->
		<div class="stat-cards">
			<div class="stat-card default-card">
				<div class="stat-icon">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
						<circle cx="9" cy="7" r="4"></circle>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
					</svg>
				</div>
				<div class="stat-content">
					<div class="stat-value">{{ userStats.total }}</div>
					<div class="stat-label">Total Users</div>
				</div>
			</div>

			<div class="stat-card green-card">
				<div class="stat-icon green-text">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
						<polyline points="9 12 11 14 15 10"></polyline>
					</svg>
				</div>
				<div class="stat-content">
					<div class="stat-value green-text">{{ userStats.active }}</div>
					<div class="stat-label green-text">Active</div>
				</div>
			</div>

			<div class="stat-card gray-card">
				<div class="stat-icon gray-text">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				</div>
				<div class="stat-content">
					<div class="stat-value gray-text">{{ userStats.inactive }}</div>
					<div class="stat-label gray-text">Inactive</div>
				</div>
			</div>

			<div class="stat-card orange-card">
				<div class="stat-icon orange-text">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"></path>
						<path d="M3 8l9 5 9-5"></path>
						<path d="M12 13v8"></path>
					</svg>
				</div>
				<div class="stat-content">
					<div class="stat-value orange-text">{{ userStats.archived }}</div>
					<div class="stat-label orange-text">Archived</div>
				</div>
			</div>
		</div>

		<!-- Table Container -->
		<div class="content-card">
			<div class="controls-bar">
				<div class="search-box">
					<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					</svg>
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Search by name or email..."
					/>
				</div>

				<select v-model="filterStatus" class="filter-select">
					<option value="All">All</option>
					<option value="Active">Active</option>
					<option value="Inactive">Inactive</option>
					<option value="Archived">Archived</option>
				</select>
			</div>

			<!-- User Accounts Table -->
			<table class="data-table">
				<thead>
					<tr>
						<th>NAME</th>
						<th>EMAIL</th>
						<th>CREATED</th>
						<th>LAST ACTIVE</th>
						<th>INACTIVE FOR</th>
						<th>STATUS</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="user in filteredUsers"
						:key="user.id"
						:class="getRowClass(user)"
					>
						<td>
							<div class="user-cell">
								<div class="avatar" :class="user.avatarBg">{{ user.initials }}</div>
								<span class="user-name">{{ user.name }}</span>
							</div>
						</td>
						<td class="email-cell">{{ user.email }}</td>
						<td class="date-cell">{{ user.created }}</td>
						<td class="date-cell">{{ user.lastActive }}</td>
						<td>
							<span v-if="user.inactiveFor" class="inactive-badge" :class="user.inactiveForClass">
								{{ user.inactiveFor }}
							</span>
							<span v-else class="text-muted">Today</span>
						</td>
						<td>
							<span class="status-badge" :class="user.status.toLowerCase()">
								{{ user.status }}
							</span>
						</td>
					</tr>
				</tbody>
			</table>

			<!-- Table Footer Legend & Timestamp -->
			<div class="table-footer">
				<div class="legend">
					<span class="legend-title">Row highlights:</span>
					<span class="legend-item"><span class="legend-dot orange"></span> Archived (180d+)</span>
					<span class="legend-item"><span class="legend-dot red"></span> Deletion due (187d+)</span>
				</div>
				<div class="as-of-date">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"></circle>
						<polyline points="12 6 12 12 16 14"></polyline>
					</svg>
					<span>As of {{ formattedCurrentDate }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface UserProfile {
	id: number
	name: string
	initials: string
	avatarBg: string
	email: string
	created: string
	lastActive: string
	inactiveFor: string | null
	inactiveForClass?: string
	status: 'Active' | 'Inactive' | 'Archived'
	highlight?: 'archived' | 'deletion'
}

const searchQuery = ref('')
const filterStatus = ref('All')

// Dynamic real-time date string formatted as "Month Day, Year"
const formattedCurrentDate = computed(() => {
	return new Date().toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	})
})

const users = ref<UserProfile[]>([
	{
		id: 1,
		name: 'Aisha Musa',
		initials: 'AM',
		avatarBg: 'bg-green',
		email: 'aisha_m@mail.com',
		created: '2025-08-14',
		lastActive: '2026-04-22',
		inactiveFor: '1d',
		status: 'Active',
	},
	{
		id: 2,
		name: 'Omar Khalid',
		initials: 'OK',
		avatarBg: 'bg-green',
		email: 'omar.k@inbox.net',
		created: '2025-09-02',
		lastActive: '2026-04-20',
		inactiveFor: '3d',
		status: 'Active',
	},
	{
		id: 3,
		name: 'Fatima Hassan',
		initials: 'FH',
		avatarBg: 'bg-green',
		email: 'fatima.h@mail.io',
		created: '2025-07-20',
		lastActive: '2026-04-15',
		inactiveFor: '8d',
		status: 'Active',
	},
	{
		id: 4,
		name: 'Layla Ibrahim',
		initials: 'LI',
		avatarBg: 'bg-orange',
		email: 'layla.ib@webmail.com',
		created: '2025-10-11',
		lastActive: '2025-10-15',
		inactiveFor: 'Deletion due · 6mo 10d',
		inactiveForClass: 'badge-red',
		status: 'Archived',
		highlight: 'deletion',
	},
	{
		id: 5,
		name: 'Zara Noor',
		initials: 'ZN',
		avatarBg: 'bg-green',
		email: 'znoor@quickmail.io',
		created: '2025-11-30',
		lastActive: '2026-04-08',
		inactiveFor: '15d',
		status: 'Active',
	},
	{
		id: 6,
		name: 'Kai Johnson',
		initials: 'KJ',
		avatarBg: 'bg-orange',
		email: 'kai.j@mail.net',
		created: '2025-12-05',
		lastActive: '2025-10-22',
		inactiveFor: 'Archived · 6mo 3d',
		inactiveForClass: 'badge-orange',
		status: 'Archived',
		highlight: 'archived',
	},
	{
		id: 7,
		name: 'Sara Lee',
		initials: 'SL',
		avatarBg: 'bg-green',
		email: 'sara.l@post.com',
		created: '2026-01-18',
		lastActive: '2026-03-10',
		inactiveFor: '1mo 14d',
		inactiveForClass: 'badge-yellow',
		status: 'Inactive',
	},
	{
		id: 8,
		name: 'Ali Rahman',
		initials: 'AR',
		avatarBg: 'bg-green',
		email: 'ali.r@securemail.io',
		created: '2026-02-07',
		lastActive: '2026-04-23',
		inactiveFor: null,
		status: 'Active',
	},
])

function getRowClass(user: UserProfile) {
	if (user.highlight === 'deletion') return 'row-highlight-red'
	if (user.highlight === 'archived') return 'row-highlight-orange'
	return ''
}

const userStats = computed(() => {
	const total = users.value.length
	const active = users.value.filter((u) => u.status === 'Active').length
	const inactive = users.value.filter((u) => u.status === 'Inactive').length
	const archived = users.value.filter((u) => u.status === 'Archived').length
	return { total, active, inactive, archived }
})

const filteredUsers = computed(() => {
	return users.value.filter((user) => {
		const query = searchQuery.value.trim().toLowerCase()
		const matchesQuery =
			!query ||
			user.name.toLowerCase().includes(query) ||
			user.email.toLowerCase().includes(query)

		const matchesStatus =
			filterStatus.value === 'All' || user.status === filterStatus.value

		return matchesQuery && matchesStatus
	})
})
</script>

<style scoped>
.manage-user-profile {
	padding: 12px;
	background-color: #f8fafc;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	color: #334155;
}

/* Page Header */
.page-header {
	margin-bottom: 20px;
}
h1 {
	font-size: 1.5rem;
	font-weight: 600;
	margin: 0 0 4px;
	color: #0f172a;
}
.subtitle {
	color: #64748b;
	font-size: 0.88rem;
	margin: 0;
}

/* Lifecycle Banner Card */
.lifecycle-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 20px 24px;
	margin-bottom: 24px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.policy-header {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.72rem;
	font-weight: 700;
	color: #64748b;
	letter-spacing: 0.06em;
	margin-bottom: 18px;
}

.info-icon {
	color: #64748b;
}

.policy-body {
	display: flex;
	align-items: flex-start;
	gap: 24px;
	margin-bottom: 24px;
}

.policy-column {
	flex: 1;
	display: flex;
	align-items: flex-start;
	gap: 14px;
}

.policy-divider {
	width: 1px;
	background-color: #f1f5f9;
	align-self: stretch;
}

.policy-icon-wrapper {
	width: 36px;
	height: 36px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.orange-bg {
	background-color: #fff7ed;
	color: #ea580c;
}

.red-bg {
	background-color: #fef2f2;
	color: #ef4444;
}

.policy-title {
	font-size: 0.9rem;
	font-weight: 600;
	color: #1e293b;
	margin-bottom: 4px;
}

.policy-desc {
	margin: 0;
	font-size: 0.82rem;
	color: #64748b;
	line-height: 1.45;
}

.highlight-orange {
	color: #ea580c;
}

.highlight-red {
	color: #dc2626;
}

/* Timeline */
.lifecycle-timeline {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
}

.timeline-step {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.8rem;
	font-weight: 500;
	white-space: nowrap;
}

.timeline-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.green-dot { background-color: #16a34a; }
.orange-dot { background-color: #ea580c; }
.red-dot { background-color: #dc2626; }

.timeline-bar {
	height: 6px;
	flex: 1;
	border-radius: 4px;
	background: linear-gradient(to right, #86efac, #fde047, #fdba74);
}

.timeline-bar.red-gradient {
	background: linear-gradient(to right, #fdba74, #fca5a5);
}

/* Stat Cards Grid */
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
	align-items: center;
	gap: 16px;
	border: 1px solid #e2e8f0;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.stat-card.green-card {
	background-color: #f0fdf4;
	border-color: #bbf7d0;
}

.stat-card.gray-card {
	background-color: #f8fafc;
	border-color: #e2e8f0;
}

.stat-card.orange-card {
	background-color: #fff7ed;
	border-color: #fed7aa;
}

.stat-icon {
	color: #64748b;
	display: flex;
	align-items: center;
}

.stat-content {
	display: flex;
	flex-direction: column;
}

.stat-value {
	font-size: 1.4rem;
	font-weight: 600;
	color: #0f172a;
	line-height: 1.1;
}

.stat-label {
	font-size: 0.8rem;
	color: #64748b;
	margin-top: 2px;
}

.green-text { color: #16a34a; }
.gray-text { color: #64748b; }
.orange-text { color: #ea580c; }
.red-text { color: #dc2626; }

/* Content Card & Table */
.content-card {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
	overflow: hidden;
}

.controls-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px 20px;
	border-bottom: 1px solid #f1f5f9;
}

.search-box {
	display: flex;
	align-items: center;
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 8px 14px;
	width: 360px;
}

.search-icon {
	color: #94a3b8;
	margin-right: 10px;
}

.search-box input {
	border: none;
	outline: none;
	width: 100%;
	font-size: 0.88rem;
	color: #1e293b;
}

.filter-select {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 8px 16px;
	font-size: 0.88rem;
	color: #334155;
	outline: none;
	cursor: pointer;
}

/* Data Table */
.data-table {
	width: 100%;
	border-collapse: collapse;
}

th {
	text-align: left;
	padding: 14px 20px;
	font-size: 0.725rem;
	font-weight: 700;
	color: #64748b;
	border-bottom: 1px solid #f1f5f9;
	letter-spacing: 0.05em;
}

td {
	padding: 14px 20px;
	border-bottom: 1px solid #f8fafc;
	font-size: 0.88rem;
	vertical-align: middle;
}

/* Row Highlights */
tr.row-highlight-orange {
	background-color: #fffbf5;
}

tr.row-highlight-red {
	background-color: #fff5f5;
}

.user-cell {
	display: flex;
	align-items: center;
	gap: 12px;
}

.avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.75rem;
	font-weight: 600;
	flex-shrink: 0;
}

.bg-green {
	background-color: #dcfce7;
	color: #15803d;
}

.bg-orange {
	background-color: #ffedd5;
	color: #c2410c;
}

.user-name {
	font-weight: 500;
	color: #0f172a;
}

.email-cell {
	color: #64748b;
}

.date-cell {
	color: #64748b;
	font-size: 0.85rem;
}

.text-muted {
	color: #94a3b8;
}

/* Inactive Badges */
.inactive-badge {
	display: inline-block;
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 0.78rem;
	font-weight: 500;
}

.badge-red {
	background-color: #ffe4e6;
	color: #e11d48;
}

.badge-orange {
	background-color: #ffedd5;
	color: #ea580c;
}

.badge-yellow {
	background-color: #fef9c3;
	color: #ca8a04;
}

/* Status Badges */
.status-badge {
	display: inline-block;
	padding: 4px 12px;
	border-radius: 12px;
	font-size: 0.78rem;
	font-weight: 500;
}

.status-badge.active {
	background-color: #dcfce7;
	color: #15803d;
}

.status-badge.inactive {
	background-color: #f1f5f9;
	color: #64748b;
}

.status-badge.archived {
	background-color: #ffedd5;
	color: #ea580c;
}

/* Table Footer */
.table-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 14px 20px;
	background: #f8fafc;
	border-top: 1px solid #f1f5f9;
	font-size: 0.8rem;
	color: #64748b;
}

.legend {
	display: flex;
	align-items: center;
	gap: 16px;
}

.legend-title {
	color: #94a3b8;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 6px;
}

.legend-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.legend-dot.orange { background-color: #fed7aa; }
.legend-dot.red { background-color: #fecaca; }

.as-of-date {
	display: flex;
	align-items: center;
	gap: 6px;
	color: #94a3b8;
}
</style>