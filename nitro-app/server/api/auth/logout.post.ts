import { defineEventHandler } from 'h3'
import { prisma } from '../../lib/prisma'
import { readBearerSession } from '../../lib/session-stream'
import { logAuditEvent } from '../../lib/audit-logger'

// Idempotent logout: always 200. Clears the session only if the presented
// token's sid is still the current one, so a replaced (stale) device can
// never sign out the newer device.
export default defineEventHandler(async (event) => {
	try {
		const session = readBearerSession(event, 'user')
		if (session?.sid) {
			const result = await prisma.user.updateMany({
				where: { id: session.accountId, session_token: session.sid },
				data: { session_token: null },
			})
			if (result.count > 0) {
				await logAuditEvent({
					event_type: 'LOGOUT',
					entity: 'user',
					entity_id: session.accountId,
					triggered_by_user_id: session.accountId,
					summary: `User ${session.accountId} logged out`,
				})
			}
		}
	} catch (err) {
		console.error('[logout] failed (ignored):', err)
	}
	return { success: true }
})
