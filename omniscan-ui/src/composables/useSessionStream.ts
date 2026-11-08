// Generic SSE session-stream client.
//
// Uses fetch() + ReadableStream (not EventSource) because EventSource cannot
// send an Authorization header. See createSessionStream() for the contract.

const MAX_BACKOFF_MS = 30000
const DEFAULT_RETRY_MS = 3000
const FALLBACK_AFTER_FAILURES = 3
const FALLBACK_INTERVAL_MS = 30000

export interface SseMessage {
	event: string
	data: string
}

/**
 * Minimal spec-compliant SSE parser. Feed it decoded text chunks; it returns
 * completed messages. Handles \n, \r\n and \r line endings, multi-line data,
 * comments, and events split across chunks.
 */
export class SseParser {
	private buffer = ''
	private eventName = ''
	private dataLines: string[] = []
	private first = true
	/** Latest `retry:` value received (ms), if any. */
	retry: number | null = null

	feed(chunk: string): SseMessage[] {
		if (this.first && chunk.length > 0) {
			this.first = false
			if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1)
		}
		this.buffer += chunk
		const out: SseMessage[] = []

		let start = 0
		const buf = this.buffer
		for (let i = 0; i < buf.length; i++) {
			const ch = buf[i]
			if (ch !== '\n' && ch !== '\r') continue
			// A trailing "\r" might be the first half of "\r\n": wait for more data.
			if (ch === '\r' && i === buf.length - 1) break
			const line = buf.slice(start, i)
			if (ch === '\r' && buf[i + 1] === '\n') i++
			start = i + 1
			const msg = this.processLine(line)
			if (msg) out.push(msg)
		}
		this.buffer = buf.slice(start)
		return out
	}

	private processLine(line: string): SseMessage | null {
		if (line === '') {
			const hasData = this.dataLines.length > 0
			const name = this.eventName
			if (!hasData && !name) return null
			const msg: SseMessage = { event: name || 'message', data: this.dataLines.join('\n') }
			this.eventName = ''
			this.dataLines = []
			return msg
		}
		if (line[0] === ':') return null // comment / ping

		const colon = line.indexOf(':')
		let field = line
		let value = ''
		if (colon !== -1) {
			field = line.slice(0, colon)
			value = line.slice(colon + 1)
			if (value[0] === ' ') value = value.slice(1)
		}

		switch (field) {
			case 'event':
				this.eventName = value
				break
			case 'data':
				this.dataLines.push(value)
				break
			case 'retry':
				if (/^\d+$/.test(value)) this.retry = parseInt(value, 10)
				break
			default:
				break // id / unknown fields ignored
		}
		return null
	}
}

export interface SessionStreamOptions {
	url: string
	getToken: () => string | null
	onReplaced: () => void | Promise<void>
	onUnauthorized: () => void | Promise<void>
	fallbackCheck?: () => void | Promise<void>
}

export interface SessionStream {
	start: () => void
	stop: () => void
}

// On Capacitor native, CapacitorHttp (enabled in capacitor.config.ts) patches
// window.fetch and buffers whole responses, which would defeat streaming.
// Capacitor keeps the original as window.CapacitorWebFetch.
function getFetch(): typeof fetch {
	const w = window as unknown as { CapacitorWebFetch?: typeof fetch }
	return w.CapacitorWebFetch ? w.CapacitorWebFetch.bind(window) : window.fetch.bind(window)
}

export function createSessionStream(options: SessionStreamOptions): SessionStream {
	const { url, getToken, onReplaced, onUnauthorized, fallbackCheck } = options

	let running = false
	let paused = false
	let controller: AbortController | null = null
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null
	let fallbackTimer: ReturnType<typeof setInterval> | null = null
	let failures = 0
	let retryMs = DEFAULT_RETRY_MS

	function clearReconnectTimer(): void {
		if (reconnectTimer !== null) {
			clearTimeout(reconnectTimer)
			reconnectTimer = null
		}
	}

	function stopFallback(): void {
		if (fallbackTimer !== null) {
			clearInterval(fallbackTimer)
			fallbackTimer = null
		}
	}

	function startFallback(): void {
		if (!fallbackCheck || fallbackTimer !== null) return
		fallbackTimer = setInterval(() => {
			if (!running || paused) return
			try {
				const r = fallbackCheck()
				if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {})
			} catch {
				/* ignore */
			}
		}, FALLBACK_INTERVAL_MS)
	}

	function abortCurrent(): void {
		if (controller) {
			const c = controller
			controller = null
			c.abort()
		}
	}

	function scheduleReconnect(delay: number): void {
		clearReconnectTimer()
		if (!running || paused) return
		if (delay <= 0) {
			void connect()
			return
		}
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null
			void connect()
		}, delay)
	}

	function backoffDelay(): number {
		const exp = Math.min(MAX_BACKOFF_MS, retryMs * Math.pow(2, Math.max(0, failures - 1)))
		const jitter = Math.random() * Math.min(1000, exp * 0.25)
		return Math.min(MAX_BACKOFF_MS, exp + jitter)
	}

	function recordFailure(): void {
		failures++
		if (failures >= FALLBACK_AFTER_FAILURES) startFallback()
		scheduleReconnect(backoffDelay())
	}

	async function connect(): Promise<void> {
		if (!running || paused || controller) return

		const token = getToken()
		if (!token) {
			stop()
			return
		}

		const ctrl = new AbortController()
		controller = ctrl
		const isCurrent = (): boolean => controller === ctrl

		let replaced = false

		try {
			const response = await getFetch()(url, {
				method: 'GET',
				headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
				cache: 'no-store',
				signal: ctrl.signal,
			})
			if (!isCurrent()) return

			if (response.status === 401) {
				controller = null
				stop()
				await onUnauthorized()
				return
			}
			if (!response.ok || !response.body) {
				controller = null
				recordFailure()
				return
			}

			// Connected: reset failure state.
			failures = 0
			stopFallback()

			const reader = response.body.getReader()
			const decoder = new TextDecoder('utf-8')
			const parser = new SseParser()

			outer: for (;;) {
				const { value, done } = await reader.read()
				if (!isCurrent()) return
				if (done) break
				const messages = parser.feed(decoder.decode(value, { stream: true }))
				if (parser.retry !== null) retryMs = Math.max(500, parser.retry)
				for (const msg of messages) {
					if (msg.event === 'session_replaced') {
						replaced = true
						break outer
					}
					if (msg.event === 'reconnect') break outer
				}
			}

			// Release the connection.
			try {
				await reader.cancel()
			} catch {
				/* ignore */
			}
			if (!isCurrent()) return
			controller = null

			if (replaced) {
				stop()
				await onReplaced()
				return
			}
			// `reconnect` event or clean end of stream: reconnect immediately.
			scheduleReconnect(0)
		} catch {
			// Aborted connections (stop/pause) are not failures.
			if (!isCurrent()) return
			controller = null
			recordFailure()
		}
	}

	function onVisibility(): void {
		if (!running) return
		if (document.visibilityState === 'hidden') {
			paused = true
			clearReconnectTimer()
			abortCurrent()
		} else if (paused) {
			paused = false
			scheduleReconnect(0)
		}
	}

	function onOnline(): void {
		if (!running || paused) return
		// Drop any pending backoff and try right away (no-op if already connected).
		if (!controller) scheduleReconnect(0)
	}

	function start(): void {
		if (running) return
		if (!getToken()) return
		running = true
		failures = 0
		retryMs = DEFAULT_RETRY_MS
		paused = document.visibilityState === 'hidden'
		document.addEventListener('visibilitychange', onVisibility)
		window.addEventListener('online', onOnline)
		if (!paused) void connect()
	}

	function stop(): void {
		running = false
		paused = false
		clearReconnectTimer()
		stopFallback()
		abortCurrent()
		document.removeEventListener('visibilitychange', onVisibility)
		window.removeEventListener('online', onOnline)
	}

	return { start, stop }
}
