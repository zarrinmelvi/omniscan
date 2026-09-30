import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { getRequests, getQueries, getLogs, getStartedAt, percentile } from '../../lib/telemetry'
import { OLLAMA_ENDPOINT } from '../../lib/ollama-models'

interface ServiceHealth {
	name: string
	status: 'operational' | 'degraded' | 'down'
	detail: string
	latencyMs: number | null
}

/** Live probe: time a trivial round-trip to Neon. */
async function probeDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
	const start = Date.now()
	try {
		await prisma.$queryRaw`SELECT 1`
		return { ok: true, latencyMs: Date.now() - start }
	} catch {
		return { ok: false, latencyMs: Date.now() - start }
	}
}

/** Live probe: HEAD/GET the Ollama host root to check reachability. */
async function probeOllama(): Promise<{ ok: boolean; rateLimited: boolean; latencyMs: number }> {
	const base = (process.env.OLLAMA_HOST || 'https://ollama.com').replace(/\/$/, '')
	const start = Date.now()
	try {
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), 4000)
		const res = await fetch(base, { method: 'GET', signal: controller.signal })
		clearTimeout(timer)
		return { ok: res.ok || res.status < 500, rateLimited: res.status === 429, latencyMs: Date.now() - start }
	} catch {
		return { ok: false, rateLimited: false, latencyMs: Date.now() - start }
	}
}

function formatTime(ts: number): string {
	const d = new Date(ts)
	return d.toISOString().slice(11, 19) // HH:MM:SS UTC
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	try {
		const now = Date.now()
		const requests = getRequests()
		const queries = getQueries()
		const logs = getLogs()

		// --- Overview metrics from the request buffer ---
		const durations = requests.map((r) => r.durationMs)
		const avgLatency = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
		const peakLatency = durations.length ? Math.max(...durations) : 0
		const totalRequests = requests.length

		// --- Live DB probe ---
		const db = await probeDatabase()
		const dbStatus = db.ok ? (db.latencyMs < 250 ? 'NOMINAL' : 'SLOW') : 'DOWN'

		// --- Live sub-system health ---
		const ollama = await probeOllama()
		const uptimeMs = now - getStartedAt()

		const services: ServiceHealth[] = [
			{
				name: 'Nitro API Server',
				status: 'operational',
				detail: `Up ${Math.max(1, Math.round(uptimeMs / 1000))}s (this instance)`,
				latencyMs: avgLatency || null,
			},
			{
				name: 'Neon PostgreSQL',
				status: db.ok ? (db.latencyMs < 250 ? 'operational' : 'degraded') : 'down',
				detail: db.ok ? `SELECT 1 in ${db.latencyMs}ms` : 'Unreachable',
				latencyMs: db.latencyMs,
			},
			{
				name: 'Ollama Pro',
				status: ollama.ok ? (ollama.rateLimited ? 'degraded' : 'operational') : 'down',
				detail: ollama.rateLimited ? 'Rate-limited (429)' : ollama.ok ? `Reachable in ${ollama.latencyMs}ms` : 'Unreachable',
				latencyMs: ollama.latencyMs,
			},
			{
				name: 'Prisma ORM',
				status: db.ok ? 'operational' : 'down',
				detail: `${queries.length} queries observed (this instance)`,
				latencyMs: queries.length ? Math.round(queries.reduce((a, q) => a + q.durationMs, 0) / queries.length) : null,
			},
		]

		// --- Latency time-series for the chart: bucket requests into ~12 slots. ---
		const BUCKETS = 12
		let series: { label: string; value: number }[] = []
		if (requests.length > 0) {
			const first = requests[0].ts
			const span = Math.max(1, now - first)
			const bucketMs = span / BUCKETS
			const buckets: number[][] = Array.from({ length: BUCKETS }, () => [])
			for (const r of requests) {
				const idx = Math.min(BUCKETS - 1, Math.floor((r.ts - first) / bucketMs))
				buckets[idx].push(r.durationMs)
			}
			series = buckets.map((b, i) => ({
				label: formatTime(first + i * bucketMs),
				value: b.length ? Math.round(b.reduce((a, c) => a + c, 0) / b.length) : 0,
			}))
		}

		// --- Recent log streams (most-recent-first) ---
		const recentRequests = [...requests].slice(-100).reverse().map((r) => ({
			ts: r.ts,
			time: formatTime(r.ts),
			method: r.method,
			path: r.path,
			status: r.status,
			durationMs: r.durationMs,
		}))

		const recentQueries = [...queries].slice(-100).reverse().map((q) => ({
			ts: q.ts,
			time: formatTime(q.ts),
			model: q.model,
			action: q.action,
			durationMs: q.durationMs,
		}))

		const recentLogs = [...logs].slice(-100).reverse().map((l) => ({
			ts: l.ts,
			time: formatTime(l.ts),
			level: l.level,
			source: l.source,
			message: l.message,
		}))

		const p95 = percentile(durations, 95)

		return {
			success: true,
			generated_at: new Date(now).toISOString(),
			overview: {
				avg_latency: avgLatency,
				peak_latency: peakLatency,
				p95_latency: p95,
				total_requests: totalRequests,
				db_status: dbStatus,
			},
			latency_target_ms: 300,
			services,
			latency_series: series,
			api_requests: recentRequests,
			prisma_queries: recentQueries,
			raw_logs: recentLogs,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to build system logs:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch system logs.' })
	}
})
