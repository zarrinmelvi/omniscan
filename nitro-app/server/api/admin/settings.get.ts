import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { getAdminSettings } from '../../lib/admin-settings'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)
	try {
		return await getAdminSettings()
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to load admin settings:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to load settings.' })
	}
})
