// server/middleware/cors.ts
//
// Runs on every request. Two jobs:
// 1. Set CORS headers on every response, so simple requests (GET) that
//    already "worked" but logged a console warning (e.g. /api/recipes/suggest
//    earlier this project) stop warning.
// 2. Explicitly handle OPTIONS preflight requests, which the browser sends
//    automatically before any POST/PUT/DELETE with a JSON body. Nitro had no
//    handler for OPTIONS at all, so the preflight itself was failing before
//    the real request (e.g. POST /api/recipes/make) ever reached the server
//    — this is what was actually blocking "Make Recipe" testing, not the
//    make.post.ts route logic itself.
//
// Dev-only origin list below (Vite on 5173). Add the production frontend
// origin here once deployed — this file is the one place to update.
import { defineEventHandler, setResponseHeaders, setResponseStatus } from 'h3'

const ALLOWED_ORIGINS = ['http://localhost:5173']

export default defineEventHandler((event) => {
	const origin = event.node.req.headers.origin
	const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

	setResponseHeaders(event, {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type,Authorization',
		'Access-Control-Allow-Credentials': 'true',
	})

	// Preflight requests expect a bare 204 with just the headers above —
	// no body, and critically, no further routing to the actual API handler.
	if (event.node.req.method === 'OPTIONS') {
		setResponseStatus(event, 204)
		return ''
	}
})
