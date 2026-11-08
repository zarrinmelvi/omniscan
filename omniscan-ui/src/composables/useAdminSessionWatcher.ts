import { watch, type WatchStopHandle } from 'vue'
import router from '@/router'
import {
	apiFetch,
	API_BASE_URL,
	handleUnauthorized,
	registerSessionReplacedHandler,
	setSessionReplacedNotice,
} from '@/utils/api'
import { useAdminAuthStore } from '@/stores/adminAuthStore'
import { createSessionStream, type SessionStream } from '@/composables/useSessionStream'
import { showAdminToast } from '@/composables/useAdminToast'

const ADMIN_TOKEN_KEY = 'omniscan_admin_token'
const REPLACED_MESSAGE = "Your admin account was signed in on another device, so you've been signed out here."

let started = false
let stream: SessionStream | null = null
let stopWatch: WatchStopHandle | null = null

// Module-level guard: the SSE stream and a 401 may report the same replacement
// at the same moment; only the first one shows the toast / navigates.
let handlingReplaced = false

async function handleReplaced(): Promise<void> {
	if (handlingReplaced) return
	// Session already cleared (e.g. a stale in-flight request): nothing to announce.
	if (!sessionStorage.getItem(ADMIN_TOKEN_KEY)) return
	handlingReplaced = true
	// Suppress the generic admin 401 redirect while we handle this.
	setSessionReplacedNotice('admin', true)
	try {
		// Clear the local admin session only; the server already invalidated it.
		useAdminAuthStore().logout()
		showAdminToast(REPLACED_MESSAGE, { duration: 5000, tone: 'warning' })
		await router.replace('/admin/login')
	} finally {
		setSessionReplacedNotice('admin', false)
		handlingReplaced = false
	}
}

async function fallbackCheck(): Promise<void> {
	try {
		// Lightweight authenticated admin GET; a 401 is handled inside apiFetch.
		await apiFetch('/api/admin/settings', { method: 'GET', isAdmin: true })
	} catch {
		/* network / 5xx: ignore */
	}
}

/**
 * Start the admin session watcher (SSE). Runs only while an admin is
 * authenticated and stops synchronously when the admin store is cleared
 * (explicit logout happens before anything else, so no self-notice).
 */
export function startAdminSessionWatcher(): () => void {
	if (started) return stop
	started = true
	registerSessionReplacedHandler('admin', handleReplaced)

	stream = createSessionStream({
		url: `${API_BASE_URL}/api/admin/session-stream`,
		getToken: () => sessionStorage.getItem(ADMIN_TOKEN_KEY),
		onReplaced: handleReplaced,
		onUnauthorized: () => handleUnauthorized(true),
		fallbackCheck,
	})

	const adminAuthStore = useAdminAuthStore()
	stopWatch = watch(
		() => adminAuthStore.isAuthenticated,
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
	registerSessionReplacedHandler('admin', null)
	stream?.stop()
	stream = null
	started = false
}
