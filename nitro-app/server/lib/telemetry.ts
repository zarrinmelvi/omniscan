// In-memory telemetry ring buffers for the admin System Logs view.
//
// IMPORTANT: this lives in module scope, so it is per-warm-instance on a
// serverless deployment (Vercel). Numbers reflect the current instance's
// lifetime, not all-time history — that's an accepted tradeoff for having
// zero-infra live metrics. Buffers are bounded so memory can't grow unbounded.

export interface RequestSample {
	ts: number // epoch ms
	method: string
	path: string
	status: number
	durationMs: number
}

export interface QuerySample {
	ts: number
	model: string // Prisma model, e.g. "User" (best-effort parse)
	action: string // e.g. "findMany"
	durationMs: number
}

export interface LogEvent {
	ts: number
	level: 'info' | 'warn' | 'error'
	source: string // e.g. "api", "prisma", "ollama"
	message: string
}

const MAX_REQUESTS = 500
const MAX_QUERIES = 500
const MAX_LOGS = 300

const requests: RequestSample[] = []
const queries: QuerySample[] = []
const logs: LogEvent[] = []

// Process start — used as a proxy for "instance uptime".
const startedAt = Date.now()

function pushBounded<T>(arr: T[], item: T, max: number): void {
	arr.push(item)
	if (arr.length > max) arr.splice(0, arr.length - max)
}

export function recordRequest(sample: RequestSample): void {
	pushBounded(requests, sample, MAX_REQUESTS)
	// Auto-log server errors so they surface in the Raw Logs tab.
	if (sample.status >= 500) {
		recordLog({ ts: sample.ts, level: 'error', source: 'api', message: `${sample.method} ${sample.path} -> ${sample.status} (${sample.durationMs}ms)` })
	} else if (sample.status >= 400) {
		recordLog({ ts: sample.ts, level: 'warn', source: 'api', message: `${sample.method} ${sample.path} -> ${sample.status} (${sample.durationMs}ms)` })
	}
}

export function recordQuery(sample: QuerySample): void {
	pushBounded(queries, sample, MAX_QUERIES)
}

export function recordLog(event: LogEvent): void {
	pushBounded(logs, event, MAX_LOGS)
}

export function getRequests(): RequestSample[] {
	return requests
}

export function getQueries(): QuerySample[] {
	return queries
}

export function getLogs(): LogEvent[] {
	return logs
}

export function getStartedAt(): number {
	return startedAt
}

/** Percentile helper over a numeric array (0–100). */
export function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
	return sorted[idx]
}
