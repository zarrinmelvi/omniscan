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
	},
	{
		path: '/login',
		name: 'login',
		component: () => import('../views/LoginPage.vue'),
	},
	{
		path: '/register',
		name: 'register',
		component: () => import('../views/RegisterPage.vue'),
	},
	{
		// Deliberately top-level, not nested under /tabs/ — the admin portal
		// is a separate login/session entirely (its own token, its own
		// store), not part of the mobile tab-bar shell.
		path: '/admin/login',
		name: 'admin-login',
		component: () => import('../views/admin/AdminLoginPage.vue'),
	},
	{
		path: '/admin',
		component: () => import('../views/admin/AdminLayout.vue'),
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
			},
			{
				path: 'verification',
				name: 'admin-verification',
				component: () => import('../views/admin/VerificationPanel.vue'),
			},
			{
				path: 'productsdata',
				name: 'admin-productsdata',
				component: () => import('../views/admin/AdminManageProductData.vue'),
			},
			{
				path: 'usersprofile',
				name: 'admin-usersprofile',
				component: () => import('../views/admin/AdminManageUserProfile.vue'),
			},
			{
				path: 'settings',
				name: 'admin-settings',
				component: () => import('../views/admin/AdminSettings.vue'),
			},
			{
				path: 'systemlogs',
				name: 'admin-systemlogs',
				component: () => import('../views/admin/AdminSystemLogs.vue'),
			},
		],
	},
	{
		path: '/tabs/',
		component: TabsPage,
		children: [
			{
				path: '',
				redirect: '/tabs/home',
			},
			{
				path: 'home',
				component: () => import('../views/HomePage.vue'),
			},
			{
				path: 'pantry',
				component: () => import('../views/PantryPage.vue'),
			},
			{
				// Nested under /tabs/, not top-level — same reasoning as
				// settings/notifications below: shares the tabs outlet so
				// back-navigation from the detail view works normally and
				// the tab bar state stays consistent.
				path: 'pantry/:id',
				name: 'pantry-item-detail',
				component: () => import('../views/PantryItemDetail.vue'),
			},
			{
				path: 'scan',
				component: () => import('../views/ScanPage.vue'),
			},
			{
				path: 'recipes',
				component: () => import('../views/RecipeSuggestions.vue'),
			},
			{
				path: 'profile',
				component: () => import('../views/ProfilePage.vue'),
			},
			{
				// Nested under /tabs/ (not top-level) so it shares Profile's
				// <ion-router-outlet> instance — the tab bar is hidden via CSS
				// in TabsPage.vue instead. Ionic Vue's nested tabs outlet
				// doesn't reliably restore state when the ROOT outlet swaps to
				// a sibling route and back, so pushed pages that need normal
				// back-navigation have to live inside the tabs outlet, not
				// beside it.
				path: 'settings',
				name: 'settings',
				component: () => import('../views/SettingsPage.vue'),
			},
			{
				path: 'notifications',
				name: 'notifications',
				component: () => import('../views/NotificationsPage.vue'),
			},
		],
	},
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
})

router.beforeEach(async (to, from, next) => {
	if (to.path.startsWith('/tabs')) {
		const authStore = useAuthStore()
		if (!authStore.isAuthenticated) {
			await authStore.checkAuth()
		}
		if (!authStore.isAuthenticated) {
			return next('/login')
		}
	}
	next()
})

export default router