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
		'0 8 * * *': ['notifications:check-expiring'],
	},
	routeRules: {
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
