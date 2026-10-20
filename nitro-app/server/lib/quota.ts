import { prisma } from './prisma'
import { createError } from 'h3'

// Max ACTIVE (non-archived, non-deleted) pantry items a consumer may hold.
export const MAX_ACTIVE_PANTRY_ITEMS = 100

export async function countActivePantryItems(userId: number): Promise<number> {
	return prisma.pantryItem.count({
		where: { user_id: userId, is_archived: false, deleted_at: null },
	})
}

/**
 * Throws a 429 quota error when the user is already at/over the active cap.
 * Call BEFORE creating a new pantry item.
 */
export async function assertPantryQuotaAvailable(userId: number): Promise<void> {
	const active = await countActivePantryItems(userId)
	if (active >= MAX_ACTIVE_PANTRY_ITEMS) {
		throw createError({
			statusCode: 429,
			statusMessage: `Storage limit reached. You can keep up to ${MAX_ACTIVE_PANTRY_ITEMS} active pantry items. Archive or remove items to free up space.`,
			data: { quota_exceeded: true, limit: MAX_ACTIVE_PANTRY_ITEMS, active },
		})
	}
}
