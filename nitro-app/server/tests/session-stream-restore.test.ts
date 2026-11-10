// Unit tests for restoring ARCHIVED users on the session-stream heartbeat.
// Validates: Requirements 1.2, 1.3, 2.2, 2.3, 3.6

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventEmitter } from 'events'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	const state: any = { user: null as any, jwtPayload: {} as any, updateCalls: [] as any[] }
	const prisma: any = {
		user: {
			findUnique: async () => (state.user ? { ...state.user } : null),
			updateMany: async ({ where, data }: any) => {
				state.updateCalls.push({ where, data })
				const u = state.user
				const ok = u && Object.entries(where).every(([k, v]) => u[k] === v)
				if (ok) Object.assign(u, data)
				return { count: ok ? 1 : 0 }
			},
		},
	}
	return { state, prisma }
})

vi.mock('../lib/prisma', () => ({ prisma: h.prisma }))
vi.mock('jsonwebtoken', () => ({
	default: { verify: vi.fn(() => h.state.jwtPayload) },
}))

import { handleSessionStream } from '../lib/session-stream'

const DAY = 24 * 60 * 60 * 1000

const archived = (over: any = {}) => ({
	id: 1,
	status: 'ARCHIVED',
	session_token: 'sid-1',
	deleted_at: null,
	archived_at: new Date(Date.now() - 3 * DAY),
	inactivity_warning_sent_at: new Date(Date.now() - 100 * DAY),
	last_active: new Date(Date.now() - 200 * DAY),
	...over,
})

async function runStream(waitFor: () => void) {
	const req: any = new EventEmitter()
	req.headers = { authorization: 'Bearer abc' }
	const res: any = new EventEmitter()
	Object.assign(res, {
		setHeader() {},
		flushHeaders() {},
		write() {
			return true
		},
		end() {
			this.writableEnded = true
		},
		writableEnded: false,
		destroyed: false,
	})
	const done = handleSessionStream({ node: { req, res } } as any, 'user')
	await vi.waitFor(waitFor)
	req.emit('close')
	await done
}

beforeEach(() => {
	h.state.user = null
	h.state.updateCalls = []
	h.state.jwtPayload = { userId: 1, sid: 'sid-1' }
})

describe('session-stream heartbeat restore', () => {
	it('restores an ARCHIVED user when the session token matches', async () => {
		h.state.user = archived()
		const before = Date.now()
		await runStream(() => expect(h.state.user.status).toBe('ACTIVE'))
		expect(h.state.user.archived_at).toBeNull()
		expect(h.state.user.inactivity_warning_sent_at).toBeNull()
		expect(h.state.user.last_active.getTime()).toBeGreaterThanOrEqual(before)
	})

	it('restores nothing when the JWT sid does not match the stored session token', async () => {
		// Stored token differs: the stream ends with session_replaced and the guarded
		// updates never match, so the user stays ARCHIVED.
		h.state.user = archived({ session_token: 'other-sid' })
		const lastActive = h.state.user.last_active
		const archivedAt = h.state.user.archived_at
		await runStream(() => {})
		expect(h.state.user.status).toBe('ARCHIVED')
		expect(h.state.user.archived_at).toBe(archivedAt)
		expect(h.state.user.last_active).toBe(lastActive)
	})

	it('guards the restore write by session_token even if the token changes mid-flight', async () => {
		h.state.user = archived()
		await runStream(() => expect(h.state.updateCalls.length).toBeGreaterThan(0))
		const restore = h.state.updateCalls.find((c: any) => c.where.status === 'ARCHIVED')
		expect(restore.where).toEqual({ id: 1, session_token: 'sid-1', status: 'ARCHIVED' })
	})

	it('leaves an ACTIVE user ACTIVE while refreshing last_active', async () => {
		h.state.user = archived({ status: 'ACTIVE', archived_at: null })
		const before = Date.now()
		await runStream(() => expect(h.state.user.last_active.getTime()).toBeGreaterThanOrEqual(before))
		expect(h.state.user.status).toBe('ACTIVE')
		expect(h.state.user.inactivity_warning_sent_at).toBeNull()
	})
})
