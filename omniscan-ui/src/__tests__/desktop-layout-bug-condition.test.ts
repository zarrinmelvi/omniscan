/**
 * Bug Condition Exploration Tests — Consumer Desktop Layout Overhaul
 *
 * PURPOSE: Surface all seven defects on the UNFIXED code.
 * This test suite is EXPECTED TO FAIL. Every failure proves a specific bug exists.
 * DO NOT fix the code or modify these assertions when they fail.
 *
 * Defects covered:
 *   1.1 — DesktopNav missing brand header (.nav-brand)
 *   1.2 — AppHeader missing breadcrumb (.app-header__breadcrumb) on desktop
 *   1.3 — AppHeader uses private isDark ref, bypasses useDarkMode singleton
 *   1.4 — NotificationsPage renders Ionic toolbar (.notif-toolbar) on desktop
 *   1.5 — DesktopNav missing user footer / logout button (.nav-footer__logout)
 *   1.6 — DesktopNav sidebar width is 260px instead of 180px
 *   1.7 — dark-mode.css uses var(--dm-header-bg) instead of #0d1117 for .desktop-nav
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Stubs — keep Ionic web components out of JSDOM
// ---------------------------------------------------------------------------
config.global.stubs = {
  'ion-page': { template: '<div><slot /></div>' },
  'ion-header': { template: '<div><slot /></div>' },
  'ion-toolbar': { template: '<div><slot /></div>' },
  'ion-title': { template: '<div><slot /></div>' },
  'ion-buttons': { template: '<div><slot /></div>' },
  'ion-button': { template: '<button><slot /></button>' },
  'ion-content': { template: '<div><slot /></div>' },
  'ion-icon': { template: '<span />' },
  'ion-spinner': { template: '<span />' },
  'ion-toggle': { template: '<input type="checkbox" />' },
  'ion-back-button': { template: '<button />' },
  'router-link': { template: '<a><slot /></a>', props: ['to'] },
}

// ---------------------------------------------------------------------------
// Minimal router — enough for useRoute() calls inside AppHeader
// ---------------------------------------------------------------------------
function makeRouter(initialPath = '/tabs/pantry') {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/tabs/home', component: { template: '<div />' } },
      { path: '/tabs/pantry', component: { template: '<div />' } },
      { path: '/tabs/scan', component: { template: '<div />' } },
      { path: '/tabs/recipes', component: { template: '<div />' } },
      { path: '/tabs/profile', component: { template: '<div />' } },
      { path: '/tabs/settings', component: { template: '<div />' } },
      { path: '/tabs/notifications', component: { template: '<div />' } },
    ],
  })
  router.push(initialPath)
  return router
}

// ---------------------------------------------------------------------------
// Mock useBreakpoint to control isDesktop value
// ---------------------------------------------------------------------------
vi.mock('@/utils/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => ({
    breakpoint: { value: 'desktop' },
    width: { value: 1440 },
    isMobile: { value: false },
    isTablet: { value: false },
    isDesktop: { value: true },
  })),
}))

// ---------------------------------------------------------------------------
// Mock apiFetch so network calls don't run in tests
// ---------------------------------------------------------------------------
vi.mock('@/utils/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ success: true, unread_count: 0, notifications: [] }),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
}))

// ---------------------------------------------------------------------------
// Import components AFTER vi.mock() calls
// ---------------------------------------------------------------------------
import DesktopNav from '@/components/DesktopNav.vue'
import AppHeader from '@/components/AppHeader.vue'
import NotificationsPage from '@/views/NotificationsPage.vue'
import { useDarkMode } from '@/composables/useDarkMode'

// ---------------------------------------------------------------------------
// Helper: Pinia instance per test
// ---------------------------------------------------------------------------
function makePinia() {
  return createPinia()
}

// ---------------------------------------------------------------------------
// Describe block
// ---------------------------------------------------------------------------
describe('Bug Condition Exploration Tests — Desktop Layout Defects (EXPECTED TO FAIL ON UNFIXED CODE)', () => {

  afterEach(() => {
    // Reset the useDarkMode singleton ref back to false between tests
    const { isDark, set } = useDarkMode()
    set(false)
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Defect 1.1 — Brand header absent in DesktopNav
  // -------------------------------------------------------------------------
  it('1.1: DesktopNav renders a brand header section (.nav-brand)', () => {
    const wrapper = mount(DesktopNav, {
      global: { plugins: [makePinia()] },
    })
    // EXPECTED TO FAIL — .nav-brand does not exist in the unfixed component
    expect(wrapper.find('.nav-brand').exists()).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Defect 1.5 — User footer / logout button absent in DesktopNav
  // -------------------------------------------------------------------------
  it('1.5: DesktopNav renders a logout button (.nav-footer__logout) when user props are provided', () => {
    const wrapper = mount(DesktopNav, {
      props: {
        userName: 'Alice',
        userEmail: 'a@b.com',
        userAvatarBase64: null,
      },
      global: { plugins: [makePinia()] },
    })
    // EXPECTED TO FAIL — .nav-footer__logout does not exist in the unfixed component
    expect(wrapper.find('.nav-footer__logout').exists()).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Defect 1.6 — Sidebar width is 260px instead of 180px
  // -------------------------------------------------------------------------
  it('1.6: DesktopNav scoped CSS sets .desktop-nav width to 180px (not 260px)', () => {
    // Read the source file directly and parse the scoped width value.
    // This is the most reliable approach for checking static CSS in a .vue SFC.
    const srcPath = resolve(__dirname, '../components/DesktopNav.vue')
    const source = readFileSync(srcPath, 'utf-8')

    // Extract the width value from `.desktop-nav { ... width: Xpx ... }`
    const widthMatch = source.match(/\.desktop-nav\s*\{[^}]*width\s*:\s*([^;]+);/s)
    const widthValue = widthMatch ? widthMatch[1].trim() : null

    // EXPECTED TO FAIL — currently reads "260px"
    expect(widthValue).toBe('180px')
  })

  // -------------------------------------------------------------------------
  // Defect 1.2 — AppHeader has no breadcrumb on desktop
  // -------------------------------------------------------------------------
  it('1.2: AppHeader renders a breadcrumb element (.app-header__breadcrumb) when isDesktop is true', async () => {
    const router = makeRouter('/tabs/pantry')
    await router.isReady()

    const wrapper = mount(AppHeader, {
      global: {
        plugins: [makePinia(), router],
      },
    })

    // EXPECTED TO FAIL — .app-header__breadcrumb does not exist in the unfixed component
    expect(wrapper.find('.app-header__breadcrumb').exists()).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Defect 1.3 — AppHeader uses private isDark ref, bypasses useDarkMode singleton
  // -------------------------------------------------------------------------
  it('1.3: Calling toggleDarkMode in AppHeader flips the useDarkMode singleton isDark ref', async () => {
    const router = makeRouter('/tabs/home')
    await router.isReady()

    const { isDark } = useDarkMode()
    const initialValue = isDark.value

    const wrapper = mount(AppHeader, {
      global: {
        plugins: [makePinia(), router],
      },
    })

    // Trigger the dark-mode toggle button
    const themeBtn = wrapper.find('.app-header__theme')
    await themeBtn.trigger('click')

    // EXPECTED TO FAIL — AppHeader manages a private ref so the singleton stays unchanged
    expect(isDark.value).toBe(!initialValue)
  })

  // -------------------------------------------------------------------------
  // Defect 1.4 — NotificationsPage still renders Ionic toolbar on desktop
  // -------------------------------------------------------------------------
  it('1.4: NotificationsPage does NOT render .notif-toolbar when isDesktop is true', async () => {
    const router = makeRouter('/tabs/notifications')
    await router.isReady()

    const wrapper = mount(NotificationsPage, {
      global: {
        plugins: [makePinia(), router],
      },
    })

    // EXPECTED TO FAIL — .notif-toolbar is always rendered (no v-if="!isDesktop" guard)
    expect(wrapper.find('.notif-toolbar').exists()).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Defect 1.7 — dark-mode.css uses var(--dm-header-bg) instead of #0d1117
  // -------------------------------------------------------------------------
  it('1.7: dark-mode.css sets html.ion-palette-dark .desktop-nav background to #0d1117', () => {
    const cssPath = resolve(__dirname, '../theme/dark-mode.css')
    const css = readFileSync(cssPath, 'utf-8')

    // Find the rule block for `html.ion-palette-dark .desktop-nav { ... }`
    // and extract the background value.
    const ruleMatch = css.match(
      /html\.ion-palette-dark\s+\.desktop-nav\s*\{([^}]+)\}/s
    )
    const ruleBlock = ruleMatch ? ruleMatch[1] : ''

    // Extract background value
    const bgMatch = ruleBlock.match(/background\s*:\s*([^;!]+)(?:\s*!important)?;/)
    const bgValue = bgMatch ? bgMatch[1].trim() : null

    // EXPECTED TO FAIL — currently reads "var(--dm-header-bg)"
    expect(bgValue).toBe('#0d1117')
  })
})
