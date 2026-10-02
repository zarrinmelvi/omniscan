import { defineEventHandler, setResponseHeaders, setResponseStatus } from 'h3'

// All origins that are permitted to call this API.
// Add new deployment URLs here when a new frontend project is created.
const ALLOWED_ORIGINS = [
	'http://localhost:5173',            // local Vite dev
	'http://localhost',                 // Android Capacitor default
	'https://localhost',                // Android Capacitor (HTTPS scheme)
	'capacitor://localhost',            // iOS/Android Capacitor scheme
	'https://omniscan.website',         // client portal (custom domain)
	'https://omniscan-ui-eight.vercel.app', // client portal (Vercel URL, kept for safety)
	'https://admin.omniscan.website',   // admin portal (custom domain)
	process.env.CORS_ORIGIN,            // escape hatch via env var
].filter(Boolean) as string[]

export default defineEventHandler((event) => {
	const origin = event.node.req.headers.origin

	// Reflect the request origin if it is in the allow-list; otherwise fall
	// back to the primary client origin so the header is always present.
	const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin)
		? origin
		: ALLOWED_ORIGINS[1]

	setResponseHeaders(event, {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Allow-Credentials': 'true',
	})

	// Preflight requests expect a bare 204 with the headers above.
	if (event.node.req.method === 'OPTIONS') {
		setResponseStatus(event, 204)
		return ''
	}
})
