# Implementation Plan

> **Implementation status:** All four fixes from the requirements have been applied. Items 1–3
> (post-logout navigation, login back button, completeSetup onboarding) were already correctly
> implemented in the source before this task list was executed. The two remaining gaps at
> execution time were: (a) `KNOWN_TLDS` missing `online` and `store` TLDs in `RegisterPage.vue`,
> and (b) `skipForNow()` not calling `authStore.checkAuth()` before navigating.

---

- [ ] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Bug Condition** - TLD Validation + skipForNow Auth Refresh
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: Tests encode expected behavior — they validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: Scope each property to the concrete failing case(s) for reproducibility
  - **Bug 1 — EMAIL_RE rejects valid `.online` and `.store` TLDs:**
    - Use the old `KNOWN_TLDS` (without `online`/`store`) to construct the old `EMAIL_RE`
    - Assert that `oldEMAIL_RE.test('user@shop.online')` returns `false` (bug: valid TLD rejected)
    - Assert that `oldEMAIL_RE.test('user@brand.store')` returns `false` (bug: valid TLD rejected)
    - Counterexample: `user@shop.online` is a real, ICANN-registered gTLD — being rejected is the bug
    - _Requirements: 1.4_
  - **Bug 2 — skipForNow navigates without refreshing authStore:**
    - Spy on `authStore.checkAuth`; invoke the unfixed `skipForNow()` (which did not call `checkAuth`)
    - Assert that `checkAuth` was NOT called — demonstrates the missing refresh
    - Result: downstream pages may see stale auth state if navigated via Skip
    - Run on UNFIXED code; **EXPECTED OUTCOME**: Tests produce counterexamples (confirms bugs exist)
    - Document counterexamples found to understand each root cause
    - Mark task complete when tests are written, run, and failures are documented
    - _Requirements: 1.6_

- [ ] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Valid email acceptance + completeSetup auth refresh + logout routing
  - **IMPORTANT**: Follow observation-first methodology — run on UNFIXED code to baseline behavior
  - **Observe (valid emails accepted):** `EMAIL_RE.test('user@example.com')` → `true`; `EMAIL_RE.test('user@mail.org')` → `true`; `EMAIL_RE.test('user@uni.edu')` → `true`; `EMAIL_RE.test('user@app.io')` → `true`; `EMAIL_RE.test('user@uni.ph')` → `true`
  - Write property-based test: for all emails with TLDs already in the allowlist, `EMAIL_RE.test(email)` returns `true`
  - **Observe (completeSetup):** `authStore.checkAuth()` is called before `router.replace('/tabs/home')` — this call must be preserved (server state was just written; store must be refreshed)
  - **Observe (logout routing):** `ProfilePage.handleLogout` calls `router.replace('/')` — the `/` target must be preserved
  - **Observe (LoginPage back button):** uses `$router.push('/')` — must never regress to `router.back()`
  - **Observe (api.ts 401):** `handleUnauthorized(false)` pushes to `'/'` and the guard is `!== 'welcome'` — confirm unchanged
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix TLD allowlist and skipForNow auth refresh

  - [x] 3.1 Add `online` and `store` to `KNOWN_TLDS` in `RegisterPage.vue`
    - In `omniscan-ui/src/views/RegisterPage.vue`, extend the `KNOWN_TLDS` string
    - Append `|online|store` to the gTLD segment (second line of the multi-line string)
    - `user@shop.online` → valid ✓; `user@brand.store` → valid ✓; `user@foo.xy` → still invalid ✗
    - _Bug_Condition: `isBugCondition(email)` where TLD is `online` or `store` (real ICANN gTLDs that were absent from the allowlist)_
    - _Expected_Behavior: `EMAIL_RE.test(email)` returns `true` for `*.online` and `*.store` addresses_
    - _Preservation: All other TLDs in the allowlist continue to match; fake TLDs like `.xy` / `.zz` continue to be rejected_
    - _Requirements: 2.4, 3.2_

  - [x] 3.2 Add `authStore.checkAuth()` to `skipForNow` in `RegisterPage.vue`
    - In `omniscan-ui/src/views/RegisterPage.vue`, inside `skipForNow()`
    - Add `await authStore.checkAuth()` before `await router.replace('/tabs/home')`
    - Matches the pattern already used in `completeSetup()` so all onboarding exit paths refresh auth state consistently
    - _Bug_Condition: `isBugCondition()` — `skipForNow` was called; without `checkAuth`, downstream pages could see stale auth state_
    - _Expected_Behavior: `skipForNow` refreshes auth state before navigating, same as `completeSetup`_
    - _Preservation: `completeSetup` flow is unchanged; the `isSavingPrefs` double-tap guard remains in place_
    - _Requirements: 2.6_

  - [ ] 3.3 Verify ProfilePage.vue logout path (already correct — confirm only)
    - Open `omniscan-ui/src/views/ProfilePage.vue`
    - Confirm `handleLogout` calls `authStore.logout()` then `router.replace('/')`
    - Confirm there is no reference to `/login` in the logout handler
    - No code changes expected
    - _Requirements: 2.1_

  - [ ] 3.4 Verify `api.ts` 401 handler (already correct — confirm only)
    - Open `omniscan-ui/src/utils/api.ts`
    - Confirm `handleUnauthorized(false)` pushes to `{ path: '/' }` and the guard is `!== 'welcome'`
    - Confirm there is no reference to `/login` in the non-admin 401 path
    - No code changes expected
    - _Requirements: 2.2_

  - [ ] 3.5 Verify `LoginPage.vue` back button (already correct — confirm only)
    - Open `omniscan-ui/src/views/LoginPage.vue`
    - Confirm the back button uses `@click="$router.push('/')"` (not `router.back()`)
    - No code changes expected
    - _Requirements: 2.3_

  - [ ] 3.6 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - TLD Validation + skipForNow Auth Refresh Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms each fix is correct:
      - Bug 1: `EMAIL_RE.test('user@shop.online')` returns `true`; `EMAIL_RE.test('user@brand.store')` returns `true`
      - Bug 2: `skipForNow()` calls `authStore.checkAuth()` before navigating
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.4, 2.6_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - No regressions in valid email handling, completeSetup, logout, or back-button behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fixes

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite: `cd omniscan-ui && npx vitest --run`
  - Confirm bug condition exploration tests from task 1 now PASS (bugs fixed)
  - Confirm preservation tests from task 2 still PASS (no regressions)
  - Confirm no TypeScript errors: `npx vue-tsc --noEmit`
  - Ask the user if any questions arise or if additional TLDs need to be added to `KNOWN_TLDS`
