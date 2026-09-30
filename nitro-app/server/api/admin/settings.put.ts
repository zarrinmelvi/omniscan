import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { normalizeAdminSettings, saveAdminSettings, getAdminSettings } from '../../lib/admin-settings'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as Record<string, unknown> | null
	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'A settings object is required.' })
	}

	try {
		// Merge the incoming (partial, untrusted) body over whatever is currently
		// stored, then normalize/validate the result before persisting.
		const current = await getAdminSettings()
		const merged = normalizeAdminSettings({ ...current, ...body })
		const saved = await saveAdminSettings(merged)
		return { success: true, settings: saved }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to save admin settings:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to save settings.' })
	}
})
