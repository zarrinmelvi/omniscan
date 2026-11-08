import { defineEventHandler } from 'h3'
import { prisma } from '../../lib/prisma'
import { readBearerSession } from '../../lib/session-stream'
import { logAuditEvent } from '../../lib/audit-logger'

// Idempotent admin logout: always 200. Clears the session only if the
// presented token's sid is still the current one.
export default defineEventHandler(async (event) => {
	try {
		const session = readBearerSession(event, 'admin')
		if (session?.sid) {
			const result = await prisma.admin.updateMany({
				where: { id: session.accountId, session_token: session.sid },
				data: { session_token: null },
			})
			if (result.count > 0) {
				await logAuditEvent({
					event_type: 'LOGOUT',
					entity: 'admin',
					entity_id: session.accountId,
					triggered_by_admin_id: session.accountId,
					summary: `Admin ${session.accountId} logged out`,
				})
			}
		}
	} catch (err) {
		console.error('[logout] failed (ignored):', err)
	}
	return { success: true }
})
