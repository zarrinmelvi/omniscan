import { defineEventHandler, setResponseHeaders, setResponseStatus } from 'h3'

const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://omniscan-ui-eight.vercel.app', process.env.CORS_ORIGIN].filter(Boolean) as string[]

export default defineEventHandler((event) => {
	const origin = event.node.req.headers.origin
	const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1]

	setResponseHeaders(event, {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Allow-Credentials': 'true',
	})

	// Preflight requests expect a bare 204 with headers above
	if (event.node.req.method === 'OPTIONS') {
		setResponseStatus(event, 204)
		return ''
	}
})
