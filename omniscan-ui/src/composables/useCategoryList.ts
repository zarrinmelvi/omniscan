import { ref } from 'vue'
import { apiFetch } from '@/utils/api'

/**
 * Module-level singleton — shared across all component instances.
 *
 * Fetches the category list from GET /api/categories once per app session and
 * caches the result. Subsequent calls to fetchCategories() are no-ops unless
 * force=true is passed (useful after an admin edit, though not needed for
 * normal consumer flows).
 *
 * Consumers: ScanResultModal, PhotoPantryUploadModal, PantryItemDetail, PantryPage.
 */
const categoryNames = ref<string[]>([])
let hasFetched = false
let inFlight: Promise<void> | null = null

export function useCategoryList() {
	async function fetchCategories(force = false): Promise<void> {
		if (hasFetched && !force) return
		if (inFlight) return inFlight

		inFlight = (async () => {
			try {
				const data = await apiFetch<string[]>('/api/categories', { method: 'GET' })
				if (Array.isArray(data) && data.length > 0) {
					categoryNames.value = data
					hasFetched = true
				}
			} catch {
				// Non-critical: components fall back to whatever is already in
				// categoryNames (initially empty → no options shown until fetch succeeds).
			} finally {
				inFlight = null
			}
		})()

		return inFlight
	}

	return { categoryNames, fetchCategories }
}
