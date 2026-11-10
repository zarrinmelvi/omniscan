// 30-day inactivity warning removal (requirement 2.6, task 3.10).
// Kept separate from the baseline preservation tests: these are EXPECTED TO
// FAIL on unfixed code and pass once the cron entry and email send are removed.
//
// Validates: Requirements 2.6, 3.2 (column kept)

import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const DAY = 24 * 60 * 60 * 1000

const h = vi.hoisted(() => ({
	users: [] as any[],
	sendInactivityWarningEmail: vi.fn(async () => ({ success: true })),
}))

vi.mock('nitropack/runtime', () => ({ defineTask: (t: any) => t }))
vi.mock('../lib/prisma', () => ({
	prisma: {
		user: {
			findMany: async () => h.users.map((u) => ({ ...u })),
			update: async () => ({}),
		},
		notification: { create: async () => ({}) },
	},
}))
vi.mock('../utils/email', () => ({
	sendInactivityWarningEmail: h.sendInactivityWarningEmail,
	sendAccountArchivedEmail: vi.fn(async () => ({ success: true })),
}))

const root = resolve(__dirname, '../..')

describe('30-day inactivity warning is removed (2.6)', () => {
	it('vercel.json has no /api/cron/inactivity-warning cron entry', () => {
		const cfg = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'))
		const paths = (cfg.crons ?? []).map((c: any) => c.path)
		expect(paths).not.toContain('/api/cron/inactivity-warning')
	})

	it('no 30-day warning email is sent for ACTIVE users inactive 30-179 days', async () => {
		const taskPath = resolve(root, 'server/tasks/notifications/inactivity-warning.ts')
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 30, max: 179 }), async (days) => {
				h.users = [
					{
						id: 1,
						name: 'Ada',
						email: 'ada@gmail.com',
						status: 'ACTIVE',
						last_active: new Date(Date.now() - days * DAY),
						inactivity_warning_sent_at: null,
					},
				]
				h.sendInactivityWarningEmail.mockClear()
				// If the task file was deleted by 3.10, nothing can send the email.
				if (existsSync(taskPath)) {
					const mod: any = await import(/* @vite-ignore */ taskPath)
					await mod.default.run({ payload: {}, context: {} })
				}
				expect(h.sendInactivityWarningEmail).not.toHaveBeenCalled()
			}),
			{ numRuns: 10 },
		)
	})
})
