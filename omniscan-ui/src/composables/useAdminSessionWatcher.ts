import { ref, watch, type WatchStopHandle } from 'vue'
import router from '@/router'
import { apiFetch, API_BASE_URL, handleUnauthorized, setSessionReplacedNotice } from '@/utils/api'
import { useAdminAuthStore } from '@/stores/adminAuthStore'
import { createSessionStream, type SessionStream } from '@/composables/useSessionStream'

const ADMIN_TOKEN_KEY = 'omniscan_admin_token'

/** Drives the "signed in on another device" modal rendered by AdminLayout. */
export const adminSessionReplacedOpen = ref(false)

let started = false
let stream: SessionStream | null = null
let stopWatch: WatchStopHandle | null = null

async function handleReplaced(): Promise<void> {
	// Suppress the generic admin 401 redirect while the modal is up.
	setSessionReplacedNotice('admin', true)
	// Clear the local admin session only; the server already invalidated it.
	useAdminAuthStore().logout()
	adminSessionReplacedOpen.value = true
}

/** Called when the user dismisses the modal. */
export async function dismissAdminSessionReplaced(): Promise<void> {
	adminSessionReplacedOpen.value = false
	try {
		await router.replace({ path: '/admin/login', query: { reason: 'session_replaced' } })
	} finally {
		setSessionReplacedNotice('admin', false)
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
	stream?.stop()
	stream = null
	started = false
}
