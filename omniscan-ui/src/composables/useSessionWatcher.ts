import { apiFetch, ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

// How often (ms) to poll the backend for session validity while the consumer
// is authenticated and the tab is in the foreground.
const CHECK_INTERVAL_MS = 4000

// Module-level guard so startSessionWatcher() is idempotent: repeated calls
// never create duplicate intervals or listeners.
let started = false
let intervalId: ReturnType<typeof setInterval> | null = null
let visibilityHandler: (() => void) | null = null

// Lightweight background watcher for the CONSUMER session only.
//
// The backend rejects stale tokens with 401 (a newer login elsewhere, or an
// admin login in the same browser, rotates the user's stored session_token so
// the sid baked into older tokens no longer matches). apiFetch() already calls
// handleUnauthorized() on any 401 — logging the consumer out and redirecting
// to '/'. The gap this closes: the consumer only hits the API on navigation,
// so an invalidated session would otherwise go unnoticed until the user
// navigates or refreshes. This polls /api/auth/me in the background so the
// logout happens within a few seconds, no manual refresh needed.
//
// Admin sessions are intentionally NOT watched here.
async function runCheck(): Promise<void> {
	try {
		const authStore = useAuthStore()

		// Only poll when it can possibly matter: an authenticated consumer on a
		// visible tab. Skipping when hidden/unauthenticated saves requests.
		if (!authStore.isAuthenticated) return
		if (document.visibilityState !== 'visible') return

		await apiFetch('/api/auth/me', { method: 'GET' })
		// Success: session still valid, nothing to do.
	} catch (err) {
		// A 401 means apiFetch() already ran handleUnauthorized() (logout +
		// redirect) internally — we only swallow the thrown ApiError here so it
		// doesn't surface as an unhandled rejection. Any other error (network,
		// 5xx) is ignored: we only act on an explicit 401.
		if (err instanceof ApiError) return
		return
	}
}

/**
 * Start the background consumer-session watcher.
 *
 * Idempotent: calling this more than once will not create additional intervals
 * or listeners — subsequent calls return the existing stop() function.
 *
 * @returns a stop() function that tears down the interval and listener.
 */
export function startSessionWatcher(): () => void {
	if (started) {
		return stop
	}
	started = true

	intervalId = setInterval(() => {
		void runCheck()
	}, CHECK_INTERVAL_MS)

	// When the tab becomes visible again (e.g. the user switches back to the
	// consumer tab after logging into admin elsewhere), check immediately so the
	// logout is instant rather than waiting for the next interval tick.
	visibilityHandler = () => {
		if (document.visibilityState === 'visible') {
			const authStore = useAuthStore()
			if (authStore.isAuthenticated) {
				void runCheck()
			}
		}
	}
	document.addEventListener('visibilitychange', visibilityHandler)

	return stop
}

function stop(): void {
	if (intervalId !== null) {
		clearInterval(intervalId)
		intervalId = null
	}
	if (visibilityHandler !== null) {
		document.removeEventListener('visibilitychange', visibilityHandler)
		visibilityHandler = null
	}
	started = false
}
