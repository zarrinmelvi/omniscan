# Epic 1 — Single-Session Isolation, Token Lifetime & Route Guards: Bugfix Design

## Overview

Four related session-management defects in the OmniScan frontend (`omniscan-ui`) are addressed together because they share the same root infrastructure: `stores/authStore.ts`, `stores/adminAuthStore.ts`, `utils/api.ts`, and `router/index.ts`.

| # | Bug | Impact |
|---|-----|--------|
| 1 | Admin and consumer sessions can coexist | A logged-in admin can also be a logged-in consumer simultaneously, breaking the mutual-exclusion contract. |
| 2 | Admin token persists in `localStorage` past tab close | Closing a tab does not end the admin session; it silently survives the browser restart. |
| 3 | No redirect for already-authenticated users on auth pages | Authenticated users land on `/login`, `/register`, or `/admin/login` instead of being forwarded to their home route. |
| 4 | Unhandled error in `beforeEach` blocks navigation silently | A network error inside `checkAuth()` causes the route guard to hang — `next()` is never called. |

The fix strategy is minimal and surgical: migrate the admin token to `sessionStorage`, add mutual-exclusion calls in both login actions, expand the global `beforeEach` guard with try/catch and already-authenticated redirects, and add a redirect to the admin `beforeEnter` guard.

---

## Glossary

- **Bug_Condition (C)**: The set of runtime states or inputs that trigger one of the four defects.
- **Property (P)**: The observable behavior the fixed code must produce for every input in C.
- **Preservation**: The existing behaviors — protected routes, logout semantics, token storage for the consumer flow — that must be completely unchanged by the fix.
- **`authStore`**: The Pinia store in `stores/authStore.ts` that manages consumer (end-user) sessions.
- **`adminAuthStore`**: The Pinia store in `stores/adminAuthStore.ts` that manages admin sessions.
- **`apiFetch`**: The central HTTP utility in `utils/api.ts`; selects the token and interprets 401 responses based on the `isAdmin` flag.
- **`TOKEN_KEY`**: `'omniscan_token'` — the `localStorage` key for the consumer token.
- **`ADMIN_TOKEN_KEY`**: `'omniscan_admin_token'` — the storage key for the admin token (migrating from `localStorage` to `sessionStorage`).
- **`ADMIN_KEY`**: `'omniscan_admin'` — the storage key for the cached admin object (migrating in parallel with the token).
- **`beforeEach`**: The global Vue Router navigation guard in `router/index.ts`.
- **`beforeEnter`**: The per-route guard on the `/admin` parent route.
- **`sessionStorage`**: Browser storage that is cleared automatically when the tab/window is closed — the target store for admin credentials after Bug 2 fix.
- **`checkAuth()`**: The async action on `authStore` that validates the consumer token against `/api/auth/me`.
- **`checkAdminAuth()`**: The synchronous action on `adminAuthStore` that restores admin state from storage (no network round-trip).

---

## Bug Details

### Bug Condition

The four defects share a single compound bug condition: the session management layer fails to enforce mutual exclusion between admin and consumer sessions, allows admin state to survive a tab close, omits already-authenticated redirects on public pages, and lacks error handling in the navigation guard.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input — one of:
           LoginAction(role)         // consumer or admin login attempt
         | NavigationEvent(to)       // Vue Router navigation
         | TabCloseEvent             // browser tab/window close after admin login
         | CheckAuthCall             // checkAuth() invoked inside beforeEach
  OUTPUT: boolean

  IF input IS LoginAction(role = CONSUMER)
    AND adminAuthStore.isAuthenticated = true
    RETURN true   // Bug 1a: cross-session not cleared on consumer login

  IF input IS LoginAction(role = ADMIN)
    AND authStore.isAuthenticated = true
    RETURN true   // Bug 1b: cross-session not cleared on admin login

  IF input IS TabCloseEvent
    AND localStorage.getItem('omniscan_admin_token') IS NOT NULL
    RETURN true   // Bug 2: admin token survives tab close

  IF input IS NavigationEvent(to)
    AND to.path IN ['/', '/login', '/register'] AND authStore.isAuthenticated = true
    RETURN true   // Bug 3a: authenticated consumer reaches auth page

  IF input IS NavigationEvent(to)
    AND to.path = '/admin/login' AND adminAuthStore.isAuthenticated = true
    RETURN true   // Bug 3b: authenticated admin reaches admin login page

  IF input IS CheckAuthCall
    AND checkAuth() THROWS (any error)
    RETURN true   // Bug 4: unhandled error hangs navigation guard

  RETURN false
END FUNCTION
```

### Examples

**Bug 1a — Consumer login does not clear admin session**
- Pre-condition: Admin is logged in (`omniscan_admin_token` in localStorage, `adminAuthStore.isAuthenticated = true`).
- Action: Consumer calls `authStore.login(email, password)`.
- Defective: Both tokens now live in storage simultaneously.
- Expected after fix: `adminAuthStore.logout()` is called first; only `omniscan_token` remains.

**Bug 1b — Admin login does not clear consumer session**
- Pre-condition: Consumer is logged in (`omniscan_token` in localStorage, `authStore.isAuthenticated = true`).
- Action: Admin calls `adminAuthStore.login(username, password)`.
- Defective: Both tokens coexist.
- Expected after fix: `authStore.logout()` is called first; only `omniscan_admin_token` remains.

**Bug 2 — Admin token survives tab close**
- Pre-condition: Admin logs in successfully; token stored in `localStorage`.
- Action: User closes the tab.
- Defective: Reopening the tab auto-restores the admin session.
- Expected after fix: Token is in `sessionStorage`; reopening the tab starts with no admin session.

**Bug 3a — Authenticated consumer hits `/login`**
- Pre-condition: Consumer is authenticated.
- Action: Consumer navigates to `/login`.
- Defective: `WelcomePage` / `LoginPage` renders.
- Expected after fix: Router redirects to `/tabs/home`.

**Bug 3b — Authenticated admin hits `/admin/login`**
- Pre-condition: Admin is authenticated.
- Action: Admin navigates to `/admin/login`.
- Defective: `AdminLoginPage` renders.
- Expected after fix: Router redirects to `/admin/dashboard`.

**Bug 4 — Network error hangs navigation guard**
- Pre-condition: Consumer token is present but the server is unreachable.
- Action: `beforeEach` calls `checkAuth()`, which throws.
- Defective: `next()` is never called; navigation hangs indefinitely.
- Expected after fix: Error is caught, user is treated as unauthenticated, guard calls `next('/login')`.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Unauthenticated consumers navigating to `/tabs/*` MUST continue to be redirected to `/login` (Requirement 3.1).
- Unauthenticated admins navigating to `/admin/*` MUST continue to be redirected to `/admin/login` (Requirement 3.2).
- A successful consumer login MUST continue to store `omniscan_token` in `localStorage` and populate `authStore` (Requirement 3.3).
- A successful admin login MUST continue to store `omniscan_admin_token` / `omniscan_admin` in `sessionStorage` and populate `adminAuthStore` (Requirement 3.4).
- `authStore.logout()` MUST continue to clear only `omniscan_token` and reset consumer store state (Requirement 3.5).
- `adminAuthStore.logout()` MUST continue to clear only `omniscan_admin_token` + `omniscan_admin` and reset admin store state (Requirement 3.6).
- `ADMIN` mode MUST continue to redirect non-admin routes to `/admin/login` (Requirement 3.7).
- `CLIENT` mode MUST continue to block `/admin/*` and redirect to `/` (Requirement 3.8).
- `checkAuth()` with no stored token MUST continue to leave the user unauthenticated without a network call (Requirement 3.9).
- `checkAuth()` with a valid token MUST continue to restore the user from `/api/auth/me` (Requirement 3.10).
- A 401 on an admin request MUST continue to log out the admin session only and redirect to `/admin/login` (Requirement 3.11).
- A 401 on a consumer request MUST continue to log out the consumer session only and redirect to `/` (Requirement 3.12).

**Scope:**

All navigation events, login flows, logout flows, and API calls that do NOT match the bug condition above must be completely unaffected by the fix. Specifically:
- Non-admin (consumer-only) routes and auth flows.
- All `apiFetch` calls where no 401 occurs.
- All logout paths (both consumer and admin).

---

## Hypothesized Root Cause

### Bug 1 — Missing mutual-exclusion in login actions

Both `authStore.login()` and `adminAuthStore.login()` were written in isolation and never call each other's `logout()`. The stores are deliberately separated (different tokens, different stores) but that separation was not extended to the login path where the new session should evict the other.

### Bug 2 — Admin token written to `localStorage` instead of `sessionStorage`

`adminAuthStore.login()` calls `localStorage.setItem(ADMIN_TOKEN_KEY, ...)` and `localStorage.setItem(ADMIN_KEY, ...)`. `localStorage` survives tab close by design; no `beforeunload` handler was added to compensate. The fix is to use `sessionStorage` exclusively for admin credentials — it clears automatically when the tab/window is closed with no extra code required.

`checkAdminAuth()` must also be updated to read from `sessionStorage`, and `getToken(isAdmin)` in `api.ts` must be updated to read from `sessionStorage` for admin tokens.

### Bug 3 — `beforeEach` only guards `/tabs/*`; `beforeEnter` on `/admin` has no already-authenticated branch

The global `beforeEach` guard checks `to.path.startsWith('/tabs')` and exits early otherwise — it never examines whether the user is already logged in when heading to a public auth page. Similarly, the `beforeEnter` guard on `/admin` checks `!isAuthenticated` but has no `else if (isAuthenticated && navigating to /admin/login)` branch.

### Bug 4 — `checkAuth()` call in `beforeEach` is `await`ed but not wrapped in try/catch

`checkAuth()` itself catches `ApiError` internally and re-throws unexpected errors via `console.error`. However, the `beforeEach` guard does not wrap the `await authStore.checkAuth()` call in a try/catch, so any unhandled rejection propagates and leaves the guard without calling `next()`.

---

## Correctness Properties

Property 1: Bug Condition — Cross-Session Eviction on Login

_For any_ login action (consumer or admin) where the opposing session is currently active (`isBugCondition` returns true for the cross-session case), the fixed login action SHALL call the opposing store's `logout()` before persisting the new credentials, such that after login completes exactly one session token exists in storage.

**Validates: Requirements 2.1, 2.2**

---

Property 2: Bug Condition — Admin Token Lifetime

_For any_ tab-close event that occurs after a successful admin login, the fixed system SHALL have stored the admin token and admin object in `sessionStorage` (not `localStorage`), so that no admin credentials are accessible in a freshly opened tab pointing at the same origin.

**Validates: Requirement 2.3**

---

Property 3: Bug Condition — Already-Authenticated Redirect

_For any_ navigation event where an authenticated consumer routes to `'/'`, `'/login'`, or `'/register'`, the fixed `beforeEach` guard SHALL redirect to `'/tabs/home'`; and for any navigation where an authenticated admin routes to `'/admin/login'`, the fixed `beforeEnter` guard SHALL redirect to `'/admin/dashboard'`.

**Validates: Requirements 2.4, 2.5**

---

Property 4: Bug Condition — Route Guard Error Resilience

_For any_ invocation of `checkAuth()` inside `beforeEach` that throws (network error or unexpected exception), the fixed guard SHALL catch the error, treat the user as unauthenticated, and call `next('/login')` — navigation must never be left in a blocked state.

**Validates: Requirement 2.6**

---

Property 5: Preservation — Existing Guard and Auth Semantics

_For any_ input where the bug condition does NOT hold (no cross-session conflict, no tab close, no auth-page navigation while already authenticated, no thrown error), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing route protection, login, logout, token storage, and 401-handling semantics.

**Validates: Requirements 3.1 – 3.12**

---

## Fix Implementation

### Changes Required

#### File: `omniscan-ui/src/stores/adminAuthStore.ts`

**Function: `login()`**

1. **Cross-session eviction**: Import `useAuthStore` dynamically (to avoid circular imports at module load time) and call `authStore.logout()` if `authStore.isAuthenticated` is true, _before_ persisting the new admin credentials.
2. **Migrate storage to `sessionStorage`**: Replace `localStorage.setItem(ADMIN_TOKEN_KEY, ...)` and `localStorage.setItem(ADMIN_KEY, ...)` with `sessionStorage.setItem(...)` equivalents.

**Function: `logout()`**

3. **Migrate storage removal to `sessionStorage`**: Replace `localStorage.removeItem(ADMIN_TOKEN_KEY)` and `localStorage.removeItem(ADMIN_KEY)` with `sessionStorage.removeItem(...)` equivalents.

**Function: `checkAdminAuth()`**

4. **Migrate storage reads to `sessionStorage`**: Replace `localStorage.getItem(ADMIN_TOKEN_KEY)` and `localStorage.getItem(ADMIN_KEY)` with `sessionStorage.getItem(...)` equivalents.

---

#### File: `omniscan-ui/src/stores/authStore.ts`

**Function: `login()`**

5. **Cross-session eviction**: Import `useAdminAuthStore` dynamically and call `adminAuthStore.logout()` if `adminAuthStore.isAuthenticated` is true, _before_ persisting the new consumer token.

No storage migration needed — consumer token intentionally stays in `localStorage` (consumer sessions persist across tab close by design).

---

#### File: `omniscan-ui/src/utils/api.ts`

**Function: `getToken()`**

6. **Read admin token from `sessionStorage`**: Change the `isAdmin` branch from `localStorage.getItem(ADMIN_TOKEN_KEY)` to `sessionStorage.getItem(ADMIN_TOKEN_KEY)`.

---

#### File: `omniscan-ui/src/router/index.ts`

**Global `beforeEach` guard**

7. **Wrap `checkAuth()` in try/catch**: Enclose the `await authStore.checkAuth()` call in a try/catch block. On any thrown error, fall through as unauthenticated (redirect to `/login` if protecting a `/tabs/*` route, or `next()` otherwise).
8. **Already-authenticated consumer redirect**: After the mode-restriction block and before the `/tabs/*` protection check, detect if `to.path` is in `['/', '/login', '/register']` and `authStore.isAuthenticated`; if so, `return next('/tabs/home')`.

**`/admin` parent route `beforeEnter` guard**

9. **Already-authenticated admin redirect**: Add an `else if` branch: if `adminAuthStore.isAuthenticated` and `to.path === '/admin/login'`, `return next('/admin/dashboard')`.

   > Note: `beforeEnter` only fires for routes _under_ `/admin`; the `/admin/login` route is top-level and is _not_ a child of `/admin`, so the already-authenticated check for the admin login page must live in the global `beforeEach` guard rather than `beforeEnter`.

**Revised `beforeEach` guard logic (pseudocode):**

```
FUNCTION beforeEach(to, from, next)
  mode ← VITE_MODE ?? 'CLIENT'

  // 1. Mode restriction (unchanged)
  IF mode = 'ADMIN' AND to.path does not start with '/admin'
    RETURN next('/admin/login')
  IF mode = 'CLIENT' AND to.path starts with '/admin'
    RETURN next('/')

  // 2. Restore and validate consumer session
  authStore ← useAuthStore()
  IF NOT authStore.isAuthenticated
    TRY
      AWAIT authStore.checkAuth()
    CATCH error
      // Bug 4 fix: treat as unauthenticated; do not block navigation
      authStore.user  ← null
      authStore.token ← null

  // 3. Restore admin session (synchronous, no network)
  adminAuthStore ← useAdminAuthStore()
  adminAuthStore.checkAdminAuth()

  // 4. Already-authenticated redirects (Bug 3 fix)
  IF to.path IN ['/', '/login', '/register'] AND authStore.isAuthenticated
    RETURN next('/tabs/home')
  IF to.path = '/admin/login' AND adminAuthStore.isAuthenticated
    RETURN next('/admin/dashboard')

  // 5. Protected route guards (unchanged behavior)
  IF to.path starts with '/tabs' AND NOT authStore.isAuthenticated
    RETURN next('/login')

  next()
END FUNCTION
```

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach:

1. **Exploratory (pre-fix)** — write tests that run against the _current_ unfixed code and confirm the bug is observable, validating the root cause analysis.
2. **Fix + Preservation** — verify that (a) each bug condition now produces the correct behavior, and (b) no existing behavior regressed.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each defect on the unfixed code. Confirm or refute root cause analysis before writing the fix.

**Test Plan**: Write unit tests that set up the pre-condition for each bug, execute the triggering action, and assert the defective outcome is observable.

**Test Cases:**

1. **Cross-session coexistence — consumer login** (will fail on unfixed code)
   - Seed: `adminAuthStore` with a valid token; call `authStore.login()`.
   - Assert: `localStorage.getItem('omniscan_admin_token')` is still non-null after login — demonstrating the defect.

2. **Cross-session coexistence — admin login** (will fail on unfixed code)
   - Seed: `authStore` with a valid token; call `adminAuthStore.login()`.
   - Assert: `localStorage.getItem('omniscan_token')` is still non-null after login — demonstrating the defect.

3. **Admin token in localStorage after login** (will fail on unfixed code)
   - Call `adminAuthStore.login()`; assert `localStorage.getItem('omniscan_admin_token')` is non-null (demonstrating it was written to `localStorage` instead of `sessionStorage`).

4. **No redirect on auth page for authenticated consumer** (will fail on unfixed code)
   - Seed `authStore.isAuthenticated = true`; simulate navigation to `/login`.
   - Assert: `beforeEach` calls `next()` without a redirect argument — demonstrating no redirect.

5. **No redirect on admin login for authenticated admin** (will fail on unfixed code)
   - Seed `adminAuthStore.isAuthenticated = true`; simulate navigation to `/admin/login`.
   - Assert: guard does not call `next('/admin/dashboard')`.

6. **Navigation hang on checkAuth error** (will fail on unfixed code)
   - Mock `authStore.checkAuth()` to throw; simulate navigation to `/tabs/home`.
   - Assert: `next` is never called — demonstrating the hang.

**Expected Counterexamples:**
- After consumer login, both `omniscan_token` and `omniscan_admin_token` are present simultaneously.
- After admin login, both tokens are present simultaneously.
- Admin token written to `localStorage` (confirmed by presence in `localStorage`, absence in `sessionStorage`).
- Guard never calls `next()` when `checkAuth()` throws.

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the correct behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Test Cases (post-fix assertions):**

1. After consumer login with active admin session → `sessionStorage.getItem('omniscan_admin_token')` is null; `localStorage.getItem('omniscan_token')` is set.
2. After admin login with active consumer session → `localStorage.getItem('omniscan_token')` is null; `sessionStorage.getItem('omniscan_admin_token')` is set.
3. After admin login → token is in `sessionStorage`, not `localStorage`.
4. `checkAdminAuth()` after admin login reads from `sessionStorage` and restores admin state.
5. `getToken(true)` returns token from `sessionStorage`.
6. Navigation to `/login` while authenticated → `next` called with `'/tabs/home'`.
7. Navigation to `/admin/login` while admin authenticated → `next` called with `'/admin/dashboard'`.
8. `checkAuth()` throws inside `beforeEach` → `next` is called (not hung); user treated as unauthenticated.

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce exactly the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation because:
- It exercises the full cross-product of auth state × route × mode configurations automatically.
- It catches edge cases (e.g., `checkAuth()` called while already authenticated, logout called twice) that manual tests miss.
- It provides strong guarantees across the entire input domain.

**Test Cases:**

1. **Unauthenticated consumer → `/tabs/*`**: Confirm redirect to `/login` still fires (Req 3.1).
2. **Unauthenticated admin → `/admin/*`**: Confirm redirect to `/admin/login` still fires (Req 3.2).
3. **Consumer `login()` with no active admin session**: Token still written to `localStorage`; store state populated (Req 3.3).
4. **Admin `login()` with no active consumer session**: Token written to `sessionStorage`; store state populated (Req 3.4).
5. **`authStore.logout()`**: Clears only `omniscan_token`; admin storage untouched (Req 3.5).
6. **`adminAuthStore.logout()`**: Clears only `omniscan_admin_token` + `omniscan_admin`; consumer storage untouched (Req 3.6).
7. **`ADMIN` mode + non-admin route**: Redirects to `/admin/login` (Req 3.7).
8. **`CLIENT` mode + `/admin/*` route**: Redirects to `/` (Req 3.8).
9. **`checkAuth()` with no token**: No network call; user stays unauthenticated (Req 3.9).
10. **`checkAuth()` with valid token**: User restored from `/api/auth/me` response (Req 3.10).
11. **401 on admin request**: Admin session cleared only; consumer session untouched (Req 3.11).
12. **401 on consumer request**: Consumer session cleared only; admin session untouched (Req 3.12).

---

### Unit Tests

- `adminAuthStore.login()` calls `authStore.logout()` when `authStore.isAuthenticated` is true, and not otherwise.
- `authStore.login()` calls `adminAuthStore.logout()` when `adminAuthStore.isAuthenticated` is true, and not otherwise.
- `adminAuthStore.login()` writes to `sessionStorage`, not `localStorage`.
- `adminAuthStore.logout()` removes from `sessionStorage`.
- `adminAuthStore.checkAdminAuth()` reads from `sessionStorage`.
- `getToken(isAdmin = true)` reads from `sessionStorage`.
- `getToken(isAdmin = false)` reads from `localStorage` (unchanged).
- `beforeEach` calls `next('/tabs/home')` for authenticated consumer on `'/'`, `'/login'`, `'/register'`.
- `beforeEach` calls `next('/admin/dashboard')` for authenticated admin on `'/admin/login'`.
- `beforeEach` calls `next('/login')` when `checkAuth()` throws and route is `/tabs/*`.
- `beforeEach` calls `next()` (unblocked) when `checkAuth()` throws and route is not `/tabs/*`.

### Property-Based Tests

- For any combination of `(authStore.isAuthenticated, adminAuthStore.isAuthenticated, to.path, mode)`: after running `beforeEach`, `next` is always called exactly once.
- For any admin login followed by a tab-close simulation (clear `sessionStorage`): `checkAdminAuth()` leaves admin as unauthenticated.
- For any consumer login: `localStorage` contains exactly one token (`omniscan_token`) when no prior admin session existed, and zero admin tokens when a prior admin session did exist.
- For any admin login: `sessionStorage` contains exactly one token (`omniscan_admin_token`) when no prior consumer session existed, and zero consumer tokens when a prior consumer session did exist.

### Integration Tests

- Full login flow: consumer login while admin is logged in → verify only consumer token survives in correct storage.
- Full login flow: admin login while consumer is logged in → verify only admin token survives in correct storage.
- Admin session tab-close simulation: log in as admin, clear `sessionStorage` (simulating tab close), reload → verify user lands on `/admin/login` as unauthenticated.
- Authenticated consumer navigates to `/login` → verify redirect to `/tabs/home` occurs.
- Authenticated admin navigates to `/admin/login` → verify redirect to `/admin/dashboard` occurs.
- `checkAuth()` throws during navigation to `/tabs/home` → verify page eventually resolves to `/login` (not a blank hang).
