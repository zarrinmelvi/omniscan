import { defineNitroConfig } from 'nitropack/config'

// https://nitro.build/config
export default defineNitroConfig({
	compatibilityDate: 'latest',
	srcDir: 'server',
	imports: false,
	experimental: {
		tasks: true,
	},
	scheduledTasks: {
		// Runs once daily at 8am server time. Checks all users' pantry items
		// for anything nearing expiration/best-before and creates Notification
		// rows for Figure 31's notification feed.
		'0 8 * * *': ['notifications:check-expiring'],
	},
	routeRules: {
		// Fixes the CORS error on /api/recipes/suggest (and would've hit every
		// other /api route eventually) — Vite dev server (port 5173) and Nitro
		// (port 3000) are different origins, so the browser blocks the request
		// without these headers. `cors: true` turns on h3's CORS handling
		// (including answering OPTIONS preflight requests), and the explicit
		// headers below narrow it from "allow everything" to just the frontend
		// origin — worth keeping explicit rather than '*' since scan/allergen
		// routes carry a real Authorization token.
		// NOTE: CORS_ORIGIN only needs setting for non-default deployments —
		// update/replace this once there's a real production frontend origin
		// (and again for the Capacitor mobile build in Section 9's Phase 6).
		'/api/**': {
			cors: true,
			headers: {
				'access-control-allow-origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
				'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
				'access-control-allow-headers': 'Content-Type,Authorization',
			},
		},
	},
})
