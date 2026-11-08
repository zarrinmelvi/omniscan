import { createError, getHeader } from 'h3'
import type { H3Event } from 'h3'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const CHECK_INTERVAL_MS = 2500
const PING_INTERVAL_MS = 15_000
const MAX_STREAM_MS = 45_000
const PRESENCE_INTERVAL_MS = 60_000
const MAX_CONSECUTIVE_DB_ERRORS = 3
const EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

export type SessionKind = 'user' | 'admin'

function unauthorized() {
	return createError({ statusCode: 401, statusMessage: EXPIRED_MESSAGE })
}

/** Returns the stored session_token (or null if none / account missing / deleted). */
async function readStoredSessionToken(kind: SessionKind, id: number): Promise<string | null> {
	if (kind === 'user') {
		const row = await prisma.user.findUnique({
			where: { id },
			select: { session_token: true, deleted_at: true },
		})
		if (!row || row.deleted_at != null) return null
		return row.session_token ?? null
	}
	const row = await prisma.admin.findUnique({ where: { id }, select: { session_token: true } })
	return row?.session_token ?? null
}

/** True if the account exists and is not deleted (used for the initial 401 check). */
async function accountExists(kind: SessionKind, id: number): Promise<boolean> {
	if (kind === 'user') {
		const row = await prisma.user.findUnique({ where: { id }, select: { deleted_at: true } })
		return !!row && row.deleted_at == null
	}
	const row = await prisma.admin.findUnique({ where: { id }, select: { id: true } })
	return !!row
}

/**
 * Verifies the Bearer JWT on the request (same secret/payload checks as the
 * stream and auth middleware). Returns null for missing/invalid/expired tokens.
 */
export function readBearerSession(
	event: H3Event,
	kind: SessionKind,
): { accountId: number; sid: string | undefined } | null {
	const secret = process.env.JWT_SECRET
	const authHeader = getHeader(event, 'authorization')
	if (!secret || !authHeader || !authHeader.startsWith('Bearer ')) return null
	const token = authHeader.slice('Bearer '.length).trim()
	if (!token) return null
	try {
		const payload = jwt.verify(token, secret) as Record<string, unknown>
		let accountId: number
		if (kind === 'admin') {
			if (payload.type !== 'admin' || typeof payload.adminId !== 'number') return null
			accountId = payload.adminId
		} else {
			if (typeof payload.userId !== 'number') return null
			accountId = payload.userId
		}
		const sid = typeof payload.sid === 'string' && payload.sid ? payload.sid : undefined
		return { accountId, sid }
	} catch {
		return null
	}
}

export async function handleSessionStream(event: H3Event, kind: SessionKind) {
	const secret = process.env.JWT_SECRET
	const authHeader = getHeader(event, 'authorization')
	if (!secret || !authHeader || !authHeader.startsWith('Bearer ')) throw unauthorized()
	const token = authHeader.slice('Bearer '.length).trim()
	if (!token) throw unauthorized()

	let accountId: number
	let sid: string | undefined
	try {
		const payload = jwt.verify(token, secret) as Record<string, unknown>
		if (kind === 'admin') {
			if (payload.type !== 'admin' || typeof payload.adminId !== 'number') throw new Error('bad payload')
			accountId = payload.adminId
		} else {
			if (typeof payload.userId !== 'number') throw new Error('bad payload')
			accountId = payload.userId
		}
		sid = typeof payload.sid === 'string' && payload.sid ? payload.sid : undefined
	} catch {
		throw unauthorized()
	}

	try {
		if (!(await accountExists(kind, accountId))) throw unauthorized()
	} catch (err) {
		if ((err as { statusCode?: number })?.statusCode === 401) throw err
		// DB failure on connect: let the client retry rather than treat as signed out.
		console.error('[session-stream] initial account lookup failed:', err)
		throw createError({ statusCode: 503, statusMessage: 'Service temporarily unavailable.' })
	}

	const req = event.node.req
	const res = event.node.res

	res.statusCode = 200
	res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
	res.setHeader('Cache-Control', 'no-cache, no-transform')
	res.setHeader('Connection', 'keep-alive')
	res.setHeader('X-Accel-Buffering', 'no')
	res.flushHeaders()

	return new Promise<void>((resolve) => {
		let closed = false
		let checking = false
		let dbErrors = 0
		let checkTimer: ReturnType<typeof setInterval> | undefined
		let pingTimer: ReturnType<typeof setInterval> | undefined
		let maxTimer: ReturnType<typeof setTimeout> | undefined

		const cleanup = () => {
			if (closed) return
			closed = true
			if (checkTimer) clearInterval(checkTimer)
			if (pingTimer) clearInterval(pingTimer)
			if (maxTimer) clearTimeout(maxTimer)
			req.off('close', cleanup)
			res.off('close', cleanup)
			resolve()
		}

		const write = (chunk: string) => {
			if (closed || res.writableEnded || res.destroyed) return
			try {
				res.write(chunk)
			} catch {
				cleanup()
			}
		}

		const finish = (chunk?: string) => {
			if (closed) return
			if (chunk) write(chunk)
			cleanup()
			try {
				if (!res.writableEnded) res.end()
			} catch {
				/* ignore */
			}
		}

		const reconnect = () => finish('event: reconnect\ndata: {}\n\n')

		// Presence heartbeat (consumer users only). Only counts while this
		// session is still the current one; also clears the inactivity warning
		// stamp (same as login does) so the lifecycle job restarts its cycle.
		let lastTouchAt = 0
		const touchPresence = async () => {
			if (kind !== 'user' || !sid) return
			lastTouchAt = Date.now()
			try {
				await prisma.user.updateMany({
					where: { id: accountId, session_token: sid },
					data: { last_active: new Date(), inactivity_warning_sent_at: null },
				})
			} catch (err) {
				console.error('[session-stream] last_active update failed:', err)
			}
		}

		const check = async () => {
			if (closed || checking || !sid) return
			checking = true
			try {
				const stored = await readStoredSessionToken(kind, accountId)
				if (closed) return
				dbErrors = 0
				if (stored == null || stored !== sid) {
					finish('event: session_replaced\ndata: {"reason":"signed_in_elsewhere"}\n\n')
				} else if (kind === 'user' && Date.now() - lastTouchAt >= PRESENCE_INTERVAL_MS) {
					await touchPresence()
				}
			} catch (err) {
				if (closed) return
				dbErrors++
				console.error(`[session-stream] session check failed (${dbErrors}/${MAX_CONSECUTIVE_DB_ERRORS}):`, err)
				if (dbErrors >= MAX_CONSECUTIVE_DB_ERRORS) reconnect()
			} finally {
				checking = false
			}
		}

		req.on('close', cleanup)
		res.on('close', cleanup)

		write('retry: 3000\n\n')
		write('event: ready\ndata: {}\n\n')

		checkTimer = setInterval(check, CHECK_INTERVAL_MS)
		pingTimer = setInterval(() => write(': ping\n\n'), PING_INTERVAL_MS)
		maxTimer = setTimeout(reconnect, MAX_STREAM_MS)

		// Immediate check at connect.
		void check()
	})
}
