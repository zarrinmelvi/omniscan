import { defineEventHandler, getRequestURL } from 'h3'
import { recordRequest } from '../lib/telemetry'

// Times every /api/** request and records the sample once the response
// finishes. Registered as global middleware so it wraps all routes.
export default defineEventHandler((event) => {
	const url = getRequestURL(event)
	if (!url.pathname.startsWith('/api/')) return

	const start = Date.now()
	const method = event.node.req.method || 'GET'
	const res = event.node.res

	res.once('finish', () => {
		recordRequest({
			ts: start,
			method,
			path: url.pathname,
			status: res.statusCode,
			durationMs: Date.now() - start,
		})
	})
})
