import { prisma } from './prisma'

export const DAILY_SUMMARY_STATE_KEY = 'daily_summary_state'

interface DailySummaryState {
	lastSentDate: string | null // 'YYYY-MM-DD' (UTC) of the last successful summary send
}

const DEFAULT_STATE: DailySummaryState = { lastSentDate: null }

/** UTC calendar date as 'YYYY-MM-DD'. */
export function utcDateKey(d: Date = new Date()): string {
	return d.toISOString().slice(0, 10)
}

export async function getDailySummaryState(): Promise<DailySummaryState> {
	const row = await prisma.appSetting.findUnique({ where: { key: DAILY_SUMMARY_STATE_KEY } })
	if (!row) return { ...DEFAULT_STATE }
	const v = (row.value ?? {}) as Partial<DailySummaryState>
	return { lastSentDate: typeof v.lastSentDate === 'string' ? v.lastSentDate : null }
}

/** Record that a summary was successfully sent for the given UTC date key. */
export async function markDailySummarySent(dateKey: string): Promise<void> {
	await prisma.appSetting.upsert({
		where: { key: DAILY_SUMMARY_STATE_KEY },
		update: { value: { lastSentDate: dateKey } },
		create: { key: DAILY_SUMMARY_STATE_KEY, value: { lastSentDate: dateKey } },
	})
}
