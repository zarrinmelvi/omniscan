# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Session Coexistence, Admin Token in localStorage, Missing Redirects & Guard Hang
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all four bugs exist
  - **Scoped PBT Approach**: Scope each property to the concrete failing cases for reproducibility
  - Test cases (all should fail/error on unfixed code):
    1. Seed adminAuthStore with a valid token; call authStore.login() → assert localStorage still contains `omniscan_admin_token` (demonstrates Bug 1a coexistence)
    2. Seed authStore with a valid token; call adminAuthStore.login() → assert localStorage still contains `omniscan_token` (demonstrates Bug 1b coexistence)
    3. Call adminAuthStore.login() → assert localStorage.getItem('omniscan_admin_token') is non-null (demonstrates Bug 2: written to localStorage instead of sessionStorage)
    4. Seed authStore.isAuthenticated = true; simulate navigation to '/login' → assert next() was called without a redirect to '/tabs/home' (demonstrates Bug 3a)
    5. Seed adminAuthStore.isAuthenticated = true; simulate navigation to '/admin/login' → assert next('/admin/dashboard') was NOT called (demonstrates Bug 3b)
    6. Mock authStore.checkAuth() to throw; simulate navigation to '/tabs/home' → assert next is never called (demonstrates Bug 4 hang)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root cause
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Route Guards, Login/Logout, and Token Storage Semantics
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (where none of the 4 bug conditions hold):
    - Unauthenticated consumer → /tabs/home: observe redirect to '/login'
    - Unauthenticated admin → /admin/dashboard: observe redirect to '/admin/login'
    - Consumer login() with no prior admin session: observe token written to localStorage and authStore populated
    - Admin login() with no prior consumer session: observe token written to localStorage (before fix) and adminAuthStore populated
    - authStore.logout(): observe omniscan_token removed, admin storage untouched
    - adminAuthStore.logout(): observe omniscan_admin_token and omniscan_admin removed, consumer storage untouched
    - ADMIN mode + non-admin route: observe redirect to '/admin/login'
    - CLIENT mode + /admin/* route: observe redirect to '/'
    - checkAuth() with no token: observe no network call and unauthenticated state
    - checkAuth() with valid token: observe user restored from /api/auth/me
    - 401 on admin request: observe admin logout only
    - 401 on consumer request: observe consumer logout only
  - Write property-based tests capturing these observed patterns from Preservation Requirements 3.1–3.12
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_

- [ ] 3. Fix Epic 1 — Single-Session Isolation, Token Lifetime & Route Guards

  - [ ] 3.1 Migrate admin token storage from localStorage to sessionStorage
    - In `adminAuthStore.login()`: replace `localStorage.setItem(ADMIN_TOKEN_KEY, ...)` with `sessionStorage.setItem(ADMIN_TOKEN_KEY, ...)`
    - In `adminAuthStore.login()`: replace `localStorage.setItem(ADMIN_KEY, ...)` with `sessionStorage.setItem(ADMIN_KEY, ...)`
    - In `adminAuthStore.logout()`: replace `localStorage.removeItem(ADMIN_TOKEN_KEY)` with `sessionStorage.removeItem(ADMIN_TOKEN_KEY)`
    - In `adminAuthStore.logout()`: replace `localStorage.removeItem(ADMIN_KEY)` with `sessionStorage.removeItem(ADMIN_KEY)`
    - In `adminAuthStore.checkAdminAuth()`: replace both `localStorage.getItem(...)` calls with `sessionStorage.getItem(...)`
    - In `adminAuthStore.checkAdminAuth()` catch block: replace `localStorage.removeItem(...)` calls with `sessionStorage.removeItem(...)`
    - _Bug_Condition: isBugCondition(TabCloseEvent) where localStorage.getItem('omniscan_admin_token') IS NOT NULL_
    - _Expected_Behavior: after tab close and reopen, checkAdminAuth() finds no token and leaves admin unauthenticated_
    - _Preservation: consumer token remains in localStorage; consumer logout semantics unchanged (Req 3.3, 3.5)_
    - _Requirements: 2.3, 3.3, 3.4, 3.5, 3.6_

  - [ ] 3.2 Add mutual exclusion in adminAuthStore.login() — clear consumer session before admin login
    - Before the `apiFetch` call in `adminAuthStore.login()`, dynamically import `useAuthStore` (to avoid circular imports)
    - If `authStore.isAuthenticated` is true, call `authStore.logout()` to clear the consumer session first
    - _Bug_Condition: isBugCondition(LoginAction(role=ADMIN)) where authStore.isAuthenticated = true_
    - _Expected_Behavior: after admin login, only omniscan_admin_token exists in sessionStorage; omniscan_token is removed_
    - _Preservation: when no prior consumer session exists, admin login proceeds unchanged (Req 3.4)_
    - _Requirements: 2.2, 3.4_

  - [ ] 3.3 Add mutual exclusion in authStore.login() — clear admin session before consumer login
    - Before the `apiFetch` call in `authStore.login()`, dynamically import `useAdminAuthStore` (to avoid circular imports)
    - If `adminAuthStore.isAuthenticated` is true, call `adminAuthStore.logout()` to clear the admin session first
    - _Bug_Condition: isBugCondition(LoginAction(role=CONSUMER)) where adminAuthStore.isAuthenticated = true_
    - _Expected_Behavior: after consumer login, only omniscan_token exists in localStorage; omniscan_admin_token is removed_
    - _Preservation: when no prior admin session exists, consumer login proceeds unchanged (Req 3.3)_
    - _Requirements: 2.1, 3.3_

  - [ ] 3.4 Update getToken() in api.ts to read admin token from sessionStorage
    - In `getToken(isAdmin?)`: change the admin branch from `localStorage.getItem(ADMIN_TOKEN_KEY)` to `sessionStorage.getItem(ADMIN_TOKEN_KEY)`
    - Consumer branch continues to use `localStorage.getItem(TOKEN_KEY)` unchanged
    - _Bug_Condition: isBugCondition(TabCloseEvent) — after fix, admin token is in sessionStorage_
    - _Expected_Behavior: getToken(true) reads from sessionStorage; getToken(false) reads from localStorage_
    - _Preservation: consumer token reading semantics and all apiFetch auth header behavior unchanged (Req 3.11, 3.12)_
    - _Requirements: 2.3, 3.11, 3.12_

  - [ ] 3.5 Refactor the global beforeEach guard in router/index.ts
    - Move useAuthStore and useAdminAuthStore instantiation outside the `/tabs` branch — both stores are needed at the top of the guard
    - Wrap `await authStore.checkAuth()` in a try/catch block; on error, set `authStore.user = null` and `authStore.token = null`, then continue as unauthenticated (do NOT return/block)
    - Call `adminAuthStore.checkAdminAuth()` in the global beforeEach (after consumer session restore) — it is currently only called in beforeEnter, missing cases like /admin/login navigation
    - After session restore, add already-authenticated consumer redirect: if `to.path` is in `['/', '/login', '/register']` AND `authStore.isAuthenticated` → return `next('/tabs/home')`
    - After that, add already-authenticated admin redirect: if `to.path === '/admin/login'` AND `adminAuthStore.isAuthenticated` → return `next('/admin/dashboard')`
    - Preserve existing `/tabs/*` protection: if not authenticated → return `next('/login')`
    - Do NOT add redirects for `/check-email`, `/verify/:token`, `/forgot-password`, `/reset-password` (these are flow-specific pages that authenticated users may legitimately visit)
    - Preserve mode restriction block at the top completely unchanged
    - _Bug_Condition: isBugCondition(NavigationEvent) and isBugCondition(CheckAuthCall)_
    - _Expected_Behavior: next() is always called exactly once; authenticated users redirected from auth pages; errors never hang navigation_
    - _Preservation: unauthenticated /tabs/* still redirects to /login; mode restrictions unchanged (Req 3.1, 3.2, 3.7, 3.8, 3.9, 3.10)_
    - _Requirements: 2.4, 2.5, 2.6, 3.1, 3.2, 3.7, 3.8, 3.9, 3.10_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Session Coexistence, Admin Token in sessionStorage, Redirects & Guard Resilience
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied for all four bugs
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms all four bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Route Guards, Login/Logout, and Token Storage Semantics
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions across Req 3.1–3.12)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
