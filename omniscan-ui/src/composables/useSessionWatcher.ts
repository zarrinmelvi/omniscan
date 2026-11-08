import { watch, type WatchStopHandle } from 'vue'
import { toastController } from '@ionic/vue'
import router from '@/router'
import {
	apiFetch,
	API_BASE_URL,
	handleUnauthorized,
	registerSessionReplacedHandler,
	setSessionReplacedNotice,
} from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { createSessionStream, type SessionStream } from '@/composables/useSessionStream'

const CONSUMER_TOKEN_KEY = 'omniscan_token'

// Module-level guard so startSessionWatcher() is idempotent.
let started = false
let stream: SessionStream | null = null
let stopWatch: WatchStopHandle | null = null

const REPLACED_MESSAGE = "Your account was signed in on another device, so you've been signed out here."

// Module-level guard: the SSE stream and a 401 may report the same replacement
// at the same moment; only the first one shows the toast / navigates.
let handlingReplaced = false

async function handleReplaced(): Promise<void> {
	if (handlingReplaced) return
	// Session already cleared (e.g. a stale in-flight request): nothing to announce.
	if (!localStorage.getItem(CONSUMER_TOKEN_KEY)) return
	handlingReplaced = true
	// Suppress the generic 401 redirect (api.ts) while we handle this.
	setSessionReplacedNotice('consumer', true)
	try {
		// Clear the local session only; the server already invalidated it, so no
		// logout API call is needed.
		useAuthStore().logout()

		try {
			const toast = await toastController.create({
				message: REPLACED_MESSAGE,
				duration: 5000,
				position: 'top',
				color: 'warning',
				buttons: [{ text: 'Dismiss', role: 'cancel' }],
			})
			// Present before navigating, but don't await dismissal.
			await toast.present()
		} catch {
			/* toast failure must not block the redirect */
		}

		await router.replace('/login')
	} finally {
		setSessionReplacedNotice('consumer', false)
		handlingReplaced = false
	}
}

async function fallbackCheck(): Promise<void> {
	try {
		// A 401 is handled inside apiFetch (handleUnauthorized).
		await apiFetch('/api/auth/me', { method: 'GET' })
	} catch {
		/* network / 5xx: ignore, only explicit 401 matters */
	}
}

/**
 * Start the background consumer-session watcher (SSE based).
 *
 * Idempotent. The stream runs only while the consumer is authenticated: it
 * starts when the auth store becomes authenticated and stops synchronously the
 * moment it is cleared (explicit logout, 401, etc.), so the user's own device
 * never receives a "signed in elsewhere" notice for its own logout.
 *
 * @returns a stop() function that tears everything down.
 */
export function startSessionWatcher(): () => void {
	if (started) return stop
	started = true
	registerSessionReplacedHandler('consumer', handleReplaced)

	stream = createSessionStream({
		url: `${API_BASE_URL}/api/auth/session-stream`,
		getToken: () => localStorage.getItem(CONSUMER_TOKEN_KEY),
		onReplaced: handleReplaced,
		onUnauthorized: () => handleUnauthorized(false),
		fallbackCheck,
	})

	const authStore = useAuthStore()
	stopWatch = watch(
		() => authStore.isAuthenticated,
		(authed) => {
			if (authed) stream?.start()
			else stream?.stop()
		},
		{ immediate: true, flush: 'sync' },
	)

	return stop
}

function stop(): void {
	stopWatch?.()
	stopWatch = null
	registerSessionReplacedHandler('consumer', null)
	stream?.stop()
	stream = null
	started = false
}
