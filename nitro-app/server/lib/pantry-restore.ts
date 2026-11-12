/**
 * Restore-eligibility rule for archived pantry items.
 *
 * Condition A (consumed): an item archived because its quantity reached 0 is
 * permanently archived — it cannot be restored.
 * Condition B (expired): an item archived because it passed its expiration or
 * best-before date (quantity still > 0) may be restored.
 *
 * The reason an item was archived is inferred from its current quantity: a
 * non-positive quantity means it was fully consumed, so restore is blocked.
 */
export interface RestoreDecision {
	allowed: boolean
	reason?: string
}

export function canRestorePantryItem(quantity: number): RestoreDecision {
	if (!Number.isFinite(quantity) || quantity <= 0) {
		return {
			allowed: false,
			reason: 'This item was fully consumed and cannot be restored.',
		}
	}
	return { allowed: true }
}
