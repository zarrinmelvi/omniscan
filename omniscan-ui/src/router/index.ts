import { createRouter, createWebHistory } from '@ionic/vue-router'
import { RouteRecordRaw } from 'vue-router'
import TabsPage from '../views/TabsPage.vue'
import { useAdminAuthStore } from '@/stores/adminAuthStore'
import { useAuthStore } from '@/stores/authStore'

const routes: Array<RouteRecordRaw> = [
	{
		path: '/',
		name: 'welcome',
		component: () => import('../views/WelcomePage.vue'),
		meta: { title: 'OmniScan' },
	},
	{
		path: '/login',
		name: 'login',
		component: () => import('../views/LoginPage.vue'),
		meta: { title: 'OmniScan' },
	},
	{
		path: '/forgot-password',
		name: 'forgot-password',
		component: () => import('../views/ForgotPasswordPage.vue'),
		meta: { title: 'OmniScan' },
	},
	{
		path: '/reset-password',
		name: 'reset-password',
		component: () => import('../views/ResetPasswordPage.vue'),
		meta: { title: 'OmniScan' },
	},
	{
		path: '/register',
		name: 'register',
		component: () => import('../views/RegisterPage.vue'),
		meta: { title: 'OmniScan' },
	},
	{
		path: '/check-email',
		name: 'check-email',
		component: () => import('../views/CheckEmailPage.vue'),
		meta: { title: 'OmniScan' },
	},
	{
		path: '/verify/:token',
		name: 'verify-email',
		component: () => import('../views/VerifyEmailPage.vue'),
		meta: { title: 'OmniScan' },
	},
	{
		// Deliberately top-level, not nested under /tabs/ — the admin portal
		// is a separate login/session entirely (its own token, its own
		// store), not part of the mobile tab-bar shell.
		path: '/admin/login',
		name: 'admin-login',
		component: () => import('../views/admin/AdminLoginPage.vue'),
		meta: { title: 'OmniScan Admin Portal' },
	},
	{
		path: '/admin',
		component: () => import('../views/admin/AdminLayout.vue'),
		meta: { title: 'OmniScan Admin Portal' },
		// beforeEnter on the parent route fires for navigation into any of
		// its children too (it's part of the matched chain), so this one
		// guard covers the whole admin section — no need to repeat it per
		// child route.
		beforeEnter: (to, from, next) => {
			// Pinia state doesn't survive a page reload on its own, so restore
			// from localStorage before checking — otherwise a direct visit or
			// refresh on /admin would always redirect even with a valid stored
			// session.
			const adminAuthStore = useAdminAuthStore()
			adminAuthStore.checkAdminAuth()

			if (!adminAuthStore.isAuthenticated) {
				next({ path: '/admin/login' })
			} else {
				next()
			}
		},
		children: [
			{
				path: '',
				redirect: '/admin/dashboard',
			},
			{
				path: 'dashboard',
				name: 'admin-dashboard',
				component: () => import('../views/admin/AdminDashboard.vue'),
				meta: { title: 'OmniScan Admin Portal' },
			},
			{
				path: 'verification',
				name: 'admin-verification',
				component: () => import('../views/admin/VerificationPanel.vue'),
				meta: { title: 'OmniScan Admin Portal' },
			},
			{
				path: 'productsdata',
				name: 'admin-productsdata',
				component: () => import('../views/admin/AdminManageProductData.vue'),
				meta: { title: 'OmniScan Admin Portal' },
			},
			{
				path: 'usersprofile',
				name: 'admin-usersprofile',
				component: () => import('../views/admin/AdminManageUserProfile.vue'),
				meta: { title: 'OmniScan Admin Portal' },
			},
			{
				path: 'settings',
				name: 'admin-settings',
				component: () => import('../views/admin/AdminSettings.vue'),
				meta: { title: 'OmniScan Admin Portal' },
			},
			{
				path: 'systemlogs',
				name: 'admin-systemlogs',
				component: () => import('../views/admin/AdminSystemLogs.vue'),
				meta: { title: 'OmniScan Admin Portal' },
			},
		],
	},
	{
		path: '/tabs/',
		component: TabsPage,
		meta: { title: 'OmniScan' },
		children: [
			{
				path: '',
				redirect: '/tabs/home',
			},
			{
				path: 'home',
				component: () => import('../views/HomePage.vue'),
				meta: { title: 'OmniScan' },
			},
			{
				path: 'pantry',
				component: () => import('../views/PantryPage.vue'),
				meta: { title: 'OmniScan' },
			},
			{
				path: 'pantry/:id',
				name: 'pantry-item-detail',
				component: () => import('../views/PantryItemDetail.vue'),
				meta: { title: 'OmniScan' },
			},
			{
				path: 'scan',
				component: () => import('../views/ScanPage.vue'),
				meta: { title: 'OmniScan' },
			},
			{
				path: 'recipes',
				component: () => import('../views/RecipeSuggestions.vue'),
				meta: { title: 'OmniScan' },
			},
			{
				path: 'profile',
				component: () => import('../views/ProfilePage.vue'),
				meta: { title: 'OmniScan' },
			},
			{
				path: 'settings',
				name: 'settings',
				component: () => import('../views/SettingsPage.vue'),
				meta: { title: 'OmniScan' },
			},
			{
				path: 'notifications',
				name: 'notifications',
				component: () => import('../views/NotificationsPage.vue'),
				meta: { title: 'OmniScan' },
			},
		],
	},
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
})

router.beforeEach(async (to, from, next) => {
	// ── OAuth callback landing ─────────────────────────────────────────────
	if (to.query.oauth_token && typeof to.query.oauth_token === 'string') {
		const authStore = useAuthStore()
		await authStore.loginWithOAuthToken(to.query.oauth_token)
		const cleanQuery = { ...to.query }
		delete cleanQuery.oauth_token
		return next({ path: to.path, query: cleanQuery, replace: true })
	}
	// ─────────────────────────────────────────────────────────────────────

	// ── Mode restriction ──────────────────────────────────────────────────
	const mode = (import.meta.env.VITE_MODE ?? 'CLIENT') as 'ADMIN' | 'CLIENT'

	if (mode === 'ADMIN' && !to.path.startsWith('/admin')) {
		return next('/admin/login')
	}
	if (mode === 'CLIENT' && to.path.startsWith('/admin')) {
		return next('/')
	}
	// ─────────────────────────────────────────────────────────────────────

	// ── Restore consumer session ──────────────────────────────────────────
	const authStore = useAuthStore()
	if (!authStore.isAuthenticated) {
		try {
			await authStore.checkAuth()
		} catch {
			authStore.user = null
			authStore.token = null
		}
	}
	// ─────────────────────────────────────────────────────────────────────

	// ── Restore admin session ─────────────────────────────────────────────
	const adminAuthStore = useAdminAuthStore()
	adminAuthStore.checkAdminAuth()
	// ─────────────────────────────────────────────────────────────────────

	// ── Already-authenticated redirects ───────────────────────────────────
	const authOnlyPaths = ['/', '/login', '/register']
	const isSetupStep = to.path === '/register' && to.query.step === '2'
	if (authOnlyPaths.includes(to.path) && authStore.isAuthenticated && !isSetupStep) {
		return next('/tabs/home')
	}
	if (to.path === '/admin/login' && adminAuthStore.isAuthenticated) {
		return next('/admin/dashboard')
	}
	// ─────────────────────────────────────────────────────────────────────

	// ── Protected consumer routes ─────────────────────────────────────────
	if (to.path.startsWith('/tabs') && !authStore.isAuthenticated) {
		return next('/login')
	}
	// ─────────────────────────────────────────────────────────────────────

	// ── Set Dynamic Document Title ─────────────────────────────────────────
	// Checks if the route has a meta.title, otherwise auto-detects /admin path
	const routeTitle = (to.meta?.title as string) || (to.path.startsWith('/admin') ? 'OmniScan Admin Portal' : 'OmniScan')
	document.title = routeTitle
	// ─────────────────────────────────────────────────────────────────────

	next()
})

export default router