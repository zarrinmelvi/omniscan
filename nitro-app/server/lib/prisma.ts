import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { recordQuery, recordLog } from './telemetry'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })

// `log: ['query']` emits a 'query' event per SQL statement; we capture the
// duration for the admin System Logs "Prisma Queries" tab. Best-effort model/
// action parsing from the SQL text — Prisma's event doesn't expose the model
// name directly.
const prisma = new PrismaClient({
	adapter,
	log: [
		{ emit: 'event', level: 'query' },
		{ emit: 'event', level: 'error' },
	],
})

// @ts-expect-error — $on('query') is available at runtime with the event log config
prisma.$on('query', (e: { query: string; duration: number }) => {
	const q = e.query || ''
	// Try to pull the primary table name out of the SQL for a friendly label.
	const tableMatch = q.match(/(?:from|into|update|join)\s+"?(\w+)"?/i)
	const actionMatch = q.trim().split(/\s+/)[0]?.toUpperCase() || 'QUERY'
	recordQuery({
		ts: Date.now(),
		model: tableMatch?.[1] ?? 'unknown',
		action: actionMatch,
		durationMs: typeof e.duration === 'number' ? e.duration : 0,
	})
})

// @ts-expect-error — $on('error') available at runtime with the event log config
prisma.$on('error', (e: { message: string }) => {
	recordLog({ ts: Date.now(), level: 'error', source: 'prisma', message: e.message })
})

export { prisma }
