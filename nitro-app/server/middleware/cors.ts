import { defineEventHandler, setResponseHeaders, setResponseStatus } from 'h3'

// All origins that are permitted to call this API.
const ALLOWED_ORIGINS = [
	'http://localhost:5173',            // local Vite dev
	'http://localhost',                 // Android Capacitor default
	'https://localhost',                // Android Capacitor (HTTPS scheme)
	'capacitor://localhost',            // iOS/Android Capacitor scheme
	'https://omniscan.website',         // client portal (custom domain)
	'https://omniscan-ui-eight.vercel.app', // client portal (Vercel URL)
	'https://omniscan-ten.vercel.app',  // nitro backend domain
	'https://admin.omniscan.website',   // admin portal
	process.env.CORS_ORIGIN,            
].filter(Boolean) as string[]

export default defineEventHandler((event) => {
	const origin = event.node.req.headers.origin

	// Reflect the request origin if it is in the allow-list; otherwise fall
	// back to primary client origin (omniscan.website).
	const primaryClientOrigin = 'https://omniscan.website'
	const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin)
		? origin
		: primaryClientOrigin

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

	return
})