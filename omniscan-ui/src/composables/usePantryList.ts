import { ref, type Directive } from 'vue'
import { apiFetch, ApiError } from '@/utils/api'

/**
 * Shared, module-level pantry list cache used by PantryPage and HomePage.
 * - One request at a time (in-flight dedupe).
 * - Cached data stays visible while a silent refresh runs.
 * - Skeletons are only needed on the cold first load (`isFirstLoad`).
 */

export interface PantryListProduct {
	id: number
	product_name: string
	brand_name: string
	image_base64: string | null
	needs_image?: boolean
}

export interface PantryListItem {
	id: number
	quantity: number
	portion_unit: string
	pieces_count: number
	net_content: number | null
	net_unit: string | null
	storage_location: string
	category: string | null
	expiration_date: string | null
	best_before_date: string | null
	is_archived: boolean
	updated_at: string
	product: PantryListProduct
}

// Module-level state (shared by every consumer).
const items = ref<PantryListItem[]>([])
const isFirstLoad = ref(true)
const loadError = ref('')

let hasLoaded = false
let inFlight: Promise<void> | null = null
let generation = 0

/** Keep an already-known picture when the incoming product carries none. */
function withPreservedImage(incoming: PantryListItem, previous: PantryListItem | undefined): PantryListItem {
	const prevImage = previous?.product?.image_base64
	if (!incoming.product.image_base64 && prevImage) {
		return { ...incoming, product: { ...incoming.product, image_base64: prevImage, needs_image: false } }
	}
	return incoming
}

async function runFetch(): Promise<void> {
	const startedAt = generation
	try {
		const data = await apiFetch<{ success: boolean; items: PantryListItem[] }>('/api/pantry_item', { method: 'GET' })
		const previousById = new Map(items.value.map((i) => [i.id, i]))
		items.value = data.items.map((i) => withPreservedImage(i, previousById.get(i.id)))
		hasLoaded = true
		loadError.value = ''
	} catch (err) {
		// With cached data on screen a failed background refresh stays quiet.
		if (!hasLoaded) {
			loadError.value = err instanceof ApiError ? err.message : 'Failed to load your pantry.'
		}
	} finally {
		isFirstLoad.value = false
	}

	// The cache was invalidated while this request was running: its data may be stale.
	if (generation !== startedAt) {
		await runFetch()
	}
}

function refresh(options: { silent?: boolean } = {}): Promise<void> {
	if (inFlight) return inFlight

	// Skeletons only when there is nothing to show yet (cold start or retry after an error).
	if (!hasLoaded && !options.silent) {
		isFirstLoad.value = true
		loadError.value = ''
	} else if (!hasLoaded) {
		isFirstLoad.value = true
	}

	inFlight = runFetch().finally(() => {
		inFlight = null
	})
	return inFlight
}

/** Mark the cache as outdated (call after add / update / delete). */
function invalidate(): void {
	generation += 1
}

/** Insert or replace one item, keeping its picture if the new copy has none. */
function upsert(item: PantryListItem): void {
	const index = items.value.findIndex((i) => i.id === item.id)
	if (index === -1) {
		items.value = [...items.value, item]
		return
	}
	const next = items.value.slice()
	next[index] = withPreservedImage(item, items.value[index])
	items.value = next
}

/** Remove one item from the cache. */
function remove(id: number): void {
	items.value = items.value.filter((i) => i.id !== id)
}

// ---------------------------------------------------------------------------
// Lazy thumbnail fallback for legacy rows (product.needs_image === true)
// ---------------------------------------------------------------------------
const requestedImages = new Set<number>()

async function loadImageFor(itemId: number): Promise<void> {
	if (requestedImages.has(itemId)) return
	requestedImages.add(itemId)
	try {
		const data = await apiFetch<{ success: boolean; image_base64: string | null }>(
			`/api/pantry_item/${itemId}/image`,
			{ method: 'GET' },
		)
		const index = items.value.findIndex((i) => i.id === itemId)
		if (index === -1) return
		const current = items.value[index]!
		const next = items.value.slice()
		next[index] = {
			...current,
			product: { ...current.product, image_base64: data.image_base64 ?? null, needs_image: false },
		}
		items.value = next
	} catch {
		// Leave the placeholder; allow a retry on a later visit.
		requestedImages.delete(itemId)
	}
}

interface LazyState {
	observer: IntersectionObserver | null
	started: boolean
}
const lazyStates = new WeakMap<HTMLElement, LazyState>()

function setupLazy(el: HTMLElement, item: PantryListItem | undefined): void {
	if (!item || item.product.needs_image !== true || item.product.image_base64) return
	let state = lazyStates.get(el)
	if (!state) {
		state = { observer: null, started: false }
		lazyStates.set(el, state)
	}
	if (state.started || state.observer) return

	const start = () => {
		state!.started = true
		state!.observer?.disconnect()
		state!.observer = null
		void loadImageFor(item.id)
	}

	if (typeof IntersectionObserver === 'undefined') {
		start()
		return
	}
	state.observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((e) => e.isIntersecting)) start()
		},
		{ rootMargin: '200px' },
	)
	state.observer.observe(el)
}

/**
 * `v-pantry-lazy-image="item"`: when the item's product has `needs_image`, fetch its
 * thumbnail once the element scrolls into view and store it in the shared cache.
 */
const pantryLazyImage: Directive<HTMLElement, PantryListItem | undefined> = {
	mounted(el, binding) {
		setupLazy(el, binding.value)
	},
	updated(el, binding) {
		setupLazy(el, binding.value)
	},
	unmounted(el) {
		lazyStates.get(el)?.observer?.disconnect()
		lazyStates.delete(el)
	},
}

export function usePantryList() {
	return {
		items,
		isFirstLoad,
		loadError,
		refresh,
		invalidate,
		upsert,
		remove,
		pantryLazyImage,
	}
}
