import { prisma } from './prisma'

export const ADMIN_CONFIG_KEY = 'admin_config'

export interface AdminSettings {
	// General
	portalName: string
	darkMode: boolean
	// AI & Scanning
	aiModel: string
	reviewConfidenceThreshold: number
	autoFlagThreshold: number
	enableVisionScan: boolean
	autoReviewLowRisk: boolean
	// Notifications
	emailOnNewFlag: boolean
	emailOnSystemError: boolean
	dailySummaryReport: boolean
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
	portalName: 'OmniScan Admin Portal',
	darkMode: false,
	aiModel: 'Ollama Pro',
	reviewConfidenceThreshold: 75,
	autoFlagThreshold: 90,
	enableVisionScan: true,
	autoReviewLowRisk: false,
	emailOnNewFlag: true,
	emailOnSystemError: true,
	dailySummaryReport: true,
}

function clampPct(n: unknown, fallback: number): number {
	const v = typeof n === 'number' && Number.isFinite(n) ? n : Number(n)
	if (!Number.isFinite(v)) return fallback
	return Math.min(100, Math.max(0, Math.round(v)))
}

function asString(v: unknown, fallback: string): string {
	return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function asBool(v: unknown, fallback: boolean): boolean {
	return typeof v === 'boolean' ? v : fallback
}

/**
 * Merge an untrusted partial object over the defaults, coercing/validating
 * every field. Unknown keys are dropped; out-of-range percentages are clamped.
 */
export function normalizeAdminSettings(input: Partial<AdminSettings> | null | undefined): AdminSettings {
	const src = (input ?? {}) as Record<string, unknown>
	const d = DEFAULT_ADMIN_SETTINGS
	return {
		portalName: asString(src.portalName, d.portalName),
		darkMode: asBool(src.darkMode, d.darkMode),
		aiModel: asString(src.aiModel, d.aiModel),
		reviewConfidenceThreshold: clampPct(src.reviewConfidenceThreshold, d.reviewConfidenceThreshold),
		autoFlagThreshold: clampPct(src.autoFlagThreshold, d.autoFlagThreshold),
		enableVisionScan: asBool(src.enableVisionScan, d.enableVisionScan),
		autoReviewLowRisk: asBool(src.autoReviewLowRisk, d.autoReviewLowRisk),
		emailOnNewFlag: asBool(src.emailOnNewFlag, d.emailOnNewFlag),
		emailOnSystemError: asBool(src.emailOnSystemError, d.emailOnSystemError),
		dailySummaryReport: asBool(src.dailySummaryReport, d.dailySummaryReport),
	}
}

/** Read the persisted admin settings, falling back to defaults if unset. */
export async function getAdminSettings(): Promise<AdminSettings> {
	const row = await prisma.appSetting.findUnique({ where: { key: ADMIN_CONFIG_KEY } })
	if (!row) return { ...DEFAULT_ADMIN_SETTINGS }
	return normalizeAdminSettings(row.value as Partial<AdminSettings>)
}

/** Persist a full settings object (already normalized) as the single config row. */
export async function saveAdminSettings(settings: AdminSettings): Promise<AdminSettings> {
	await prisma.appSetting.upsert({
		where: { key: ADMIN_CONFIG_KEY },
		update: { value: settings },
		create: { key: ADMIN_CONFIG_KEY, value: settings },
	})
	return settings
}
