import { defineNitroConfig } from 'nitropack/config'

console.log('[DEBUG BUILD-TIME] process.env.CORS_ORIGIN =', JSON.stringify(process.env.CORS_ORIGIN))

// https://nitro.build/config
export default defineNitroConfig({
	preset: 'vercel',
	compatibilityDate: 'latest',
	srcDir: 'server',
	imports: false,
	experimental: {
		tasks: true,
	},
	scheduledTasks: {
		'0 8 * * *': ['notifications:check-expiring', 'notifications:daily-summary'],
	},
	routeRules: {
		'/api/**': {
			// CORS headers are handled dynamically by server/middleware/cors.ts
			// so the correct origin is reflected for each caller (client portal,
			// admin portal, or local dev).  Do NOT add a static
			// access-control-allow-origin header here — a static value would
			// override the middleware for any origin not matching it.
			cors: true,
		},
	},
})
