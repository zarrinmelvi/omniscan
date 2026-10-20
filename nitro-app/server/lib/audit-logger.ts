import { prisma } from './prisma'

export type AuditEventType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SCAN' | 'FLAG' | 'REVIEW'

export interface AuditPayload {
	event_type: AuditEventType
	entity: string
	entity_id?: number | null
	triggered_by_user_id?: number | null
	triggered_by_admin_id?: number | null
	summary: string
	metadata?: Record<string, unknown> | null
}

/**
 * Event-driven audit logger. Writes exactly one AuditEvent row per
 * state-changing action (CREATE/UPDATE/DELETE/LOGIN/SCAN/FLAG/REVIEW).
 *
 * Non-blocking by design: a failure to write an audit row must NEVER crash
 * or roll back the originating request. All errors are swallowed and logged
 * to the console only.
 */
export async function logAuditEvent(payload: AuditPayload): Promise<void> {
	try {
		await prisma.auditEvent.create({
			data: {
				event_type: payload.event_type,
				entity: payload.entity,
				entity_id: payload.entity_id ?? null,
				triggered_by_user_id: payload.triggered_by_user_id ?? null,
				triggered_by_admin_id: payload.triggered_by_admin_id ?? null,
				summary: payload.summary,
				metadata: payload.metadata ? (payload.metadata as any) : undefined,
			},
		})
	} catch (err) {
		console.error('[AuditLogger] Failed to write audit event (non-blocking):', err)
	}
}
