# Implementation Plan

Reminder: write the exploration tests (task 1) and preservation tests (task 2) BEFORE implementing the fix, and run them on the UNFIXED code first. Run vitest and vue-tsc one at a time, never in parallel (commands are in design.md, Testing Strategy).

Parallelism: tasks 3.1 through 3.6 touch disjoint files. After tasks 1 and 2, groups A (3.1 then 3.2), B (3.3), C (3.4), D (3.5), E (3.6) can run in parallel. 3.1 must land before 3.2 and 3.3 use its modules. Tasks 3.7 and 3.8 are sequential at the end. Tests for the three backend areas and the frontend areas are in separate files so task 1 and 2 sub-parts can also be split.

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Unverified signup, cleanup, disclaimer, Google duplicate signup, recipe loading
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: They encode the expected behavior and will validate the fix when they pass after implementation
  - **Scoped PBT Approach**: deterministic bugs, so scope to concrete cases; use fast-check only for the selection predicate
  - Files (all in `nitro-app/server/tests/`, follow the mock style of `password-max-length.test.ts` and `account-lifecycle.bug.test.ts`):
    - `unverified-signup.bug.test.ts`: register with username `zarrin_1` and assert the created user row has `username === null` and that a second registration of `zarrin_1` with another email is accepted while the first is unverified (isBugCondition 'register')
    - `unverified-cleanup.bug.test.ts`: import `selectUnverifiedAccountsForDeletion` and `UNVERIFIED_ACCOUNT_RETENTION_DAYS` from `../lib/unverified-cleanup`; assert only `email_verified=false`, `oauth_provider=null`, older than 7 days users are selected (isBugCondition 'cleanup')
    - `google-duplicate-signup.bug.test.ts`: call `google/verify.post` with `{ idToken, intent: 'register' }` for an existing email (mock `google-auth-library`) and assert 409 `Account already exist` and no session token written; same for `google/register.post` existing email (isBugCondition 'googleSignup')
    - `signup-disclaimer-recipe-loading.source.test.ts`: read `omniscan-ui/src/views/RegisterPage.vue`, `CheckEmailPage.vue`, `nitro-app/server/utils/email.ts` and assert the exact text "Verify your email within 7 days or your account will be automatically deleted."; read `RecipeSuggestions.vue`, `HomePage.vue`, `RecipeDetailModal.vue` and assert an `ion-loading` bound to `makingId` and a `making` prop with `ion-spinner` on the make button
  - Run on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found (e.g. "created row has username 'zarrin_1'", "module unverified-cleanup not found", "verify.post returned token for existing email")
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing auth, lifecycle and recipe behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code and record: verification link marks verified, returns token and sends welcome email; register with new email sends email first then creates user + dietary profile and returns `requiresVerification: true`; unverified re-register obeys the 60 s cooldown; verified email re-register is rejected; a username held by a verified user is rejected by `check-username` and `register`; `google/verify.post` without `intent` logs in an existing user (token, ARCHIVED restore) and returns `requiresRegistration` for a new one; `google/callback.get` without register state redirects with `oauth_token`; email login of unverified account returns 403 with email; `cleanup-archived.get` behavior; `RecipeSuggestions.vue` still has the "Recipe marked as made!" toast and the confirm alert text
  - Write property-based tests (fast-check) in `nitro-app/server/tests/unverified-signup.preservation.test.ts` capturing those observed outputs for non-bug-condition inputs (verified or Google or young users are never selected may be added once the module exists, so write that assertion in task 3.3 and keep it out of this baseline)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 3. Fix for unverified signup, 7-day cleanup, Google duplicate signup and recipe loading

  - [ ] 3.1 (Group A, first) Add pending-username token helpers
    - Create `nitro-app/server/lib/verification-token.ts` with `createVerificationToken(username?)` and `readPendingUsername(token)` (signed JWT with `JWT_SECRET`, nonce, no `exp`; random base64url fallback when no secret or no username)
    - Leave `generateVerificationToken` in `utils/email.ts` untouched
    - Add `verification-token.test.ts` (round trip, tamper, fallback, uniqueness; fast-check round trip for valid usernames)
    - No schema change
    - _Bug_Condition: isBugCondition(input) where input.kind = 'register'_
    - _Expected_Behavior: pending username only in token, row username null_
    - _Preservation: generateVerificationToken and existing email tests unchanged_
    - _Requirements: 2.1, 2.2, 3.2_

  - [ ] 3.2 (Group A, after 3.1) Stop saving username before verification
    - `server/api/auth/register.post.ts`: create user with `username: null`, token via `createVerificationToken(normalizedUsername)`; in the existing-unverified branch reject if a verified user holds the typed username, then store a fresh token carrying it
    - `server/api/auth/resend-verification.post.ts`: select `verification_token`, carry the pending username into the new token
    - `server/api/auth/verify/[token].get.ts`: on verification set `username` from `readPendingUsername(token)` if free; on conflict or `P2002` verify without it and return `usernameTaken: true`
    - Add `unverified-signup.unit.test.ts` for: username null on create, two pending registrations can share a name, first to verify wins and the second still verifies with null, verified owner still rejects, resend keeps the pending name
    - `check-username.post.ts` needs no code change (it only sees stored usernames); cover it with a test
    - _Bug_Condition: isBugCondition(input) where input.kind = 'register'_
    - _Expected_Behavior: expectedBehavior(result) from design, Property 1(a)_
    - _Preservation: verification flow, register order, cooldown, verified-owner rejection_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.8_

  - [ ] 3.3 (Group B, after 3.1 only if it reuses nothing; otherwise independent) Delete unverified accounts after 7 days
    - Create `nitro-app/server/lib/unverified-cleanup.ts` exporting `UNVERIFIED_ACCOUNT_RETENTION_DAYS = 7` and pure `selectUnverifiedAccountsForDeletion(users, now)` (unverified, `oauth_provider` null, `created_at` strictly older than 7 days)
    - Create `nitro-app/server/api/cron/cleanup-unverified.get.ts` (same `CRON_SECRET` check as `cleanup-archived.get.ts`; DB `where` filter plus the pure function; one `$transaction` deleting children first in the same order, then users; no email)
    - Add the cron entry `/api/cron/cleanup-unverified` (`0 8 * * *`) to `nitro-app/vercel.json`
    - Use explicit relative imports; do not modify `cleanup-archived.get.ts`
    - Add `unverified-cleanup.test.ts`: boundary at 7 days, fast-check predicate equality, verified/Google/young never selected, endpoint deletes only selected ids, 401 without secret when `CRON_SECRET` is set, `vercel.json` lists the path
    - _Bug_Condition: isBugCondition(input) where input.kind = 'cleanup'_
    - _Expected_Behavior: expectedBehavior(result) from design, Property 1(b)_
    - _Preservation: existing lifecycle cron and tests untouched_
    - _Requirements: 2.3, 3.5_

  - [ ] 3.4 (Group C) Google sign-up intent and 409
    - Create `nitro-app/server/lib/google-intent.ts` (`parseGoogleState`, `ACCOUNT_EXISTS_MESSAGE`); add `OAUTH_FRONTEND_REGISTER` to `lib/oauth.ts` additively
    - `google/callback.get.ts`: existing user plus register intent redirects to `/register?oauth_error=account_exists` before any update or token; login path unchanged
    - `google/verify.post.ts`: body `intent: 'register'` and existing user throws 409 `Account already exist` before any update or token
    - `google/register.post.ts`: existing email or Google ID returns 409 `Account already exist`
    - Adjust any existing test that asserted the old 400 for these two cases
    - Add `google-duplicate-signup.test.ts` (409 path for verify and register, redirect for callback, no `session_token` write, login intent unchanged)
    - _Bug_Condition: isBugCondition(input) where input.kind = 'googleSignup'_
    - _Expected_Behavior: expectedBehavior(result) from design, Property 1(d)_
    - _Preservation: Google login for existing users, ARCHIVED restore, new-user pending flow_
    - _Requirements: 2.5, 3.6, 3.7_

  - [ ] 3.5 (Group D) Register page disclaimer, Google toast, Check Email disclaimer
    - `omniscan-ui/src/views/RegisterPage.vue`: add the disclaimer paragraph under the email field (password flow only), send `intent: 'register'` on native Google verify, handle ApiError 409 and `?oauth_error=account_exists` with `showToast('Account already exist', 'danger')`, clear pending Google data, store no token, stay on `/register`; web button opens `${API_BASE_URL}/api/auth/google?state=register`
    - `omniscan-ui/src/views/CheckEmailPage.vue`: add the disclaimer in the default state
    - Styles additive only; dark variants written as `html.ion-palette-dark .verify-disclaimer` inside scoped styles (never `:global(html.ion-palette-dark)`); navy tokens page `#0f172a`, card `#1e293b`, border `#334155`, text `#f1f5f9`, secondary `#94a3b8`; do not edit `dark-mode.css`, `termsContent.ts`, `faqContent.ts`; keep `ui-preservation-snapshot.json` passing
    - Add source tests for the exact disclaimer text, `intent: 'register'`, `Account already exist`, `oauth_error`
    - _Bug_Condition: isBugCondition(input) where input.kind IN ['disclaimer', 'googleSignup']_
    - _Expected_Behavior: expectedBehavior(result) from design, Property 1(c), 1(d)_
    - _Preservation: Register/Login layout and styles, Login Google flow_
    - _Requirements: 2.4, 2.5, 3.6, 3.10_

  - [ ] 3.6 (Group E) Make Recipe loading indicator
    - `omniscan-ui/src/components/RecipeDetailModal.vue`: add `making?: boolean` prop; disable the make button, show `ion-spinner` and ignore clicks while `making`
    - `omniscan-ui/src/views/RecipeSuggestions.vue` and `omniscan-ui/src/views/HomePage.vue`: pass `:making`, add `<ion-loading :is-open="makingId !== null" message="Making recipe..." />`, guard the confirm handler and `makeRecipe()` against re-entry; keep the `finally` reset
    - Add source tests for the prop, spinner, `ion-loading` binding and the guard
    - _Bug_Condition: isBugCondition(input) where input.kind = 'makeRecipe'_
    - _Expected_Behavior: expectedBehavior(result) from design, Property 1(e)_
    - _Preservation: success toast, list updates, alert text, allergen warning_
    - _Requirements: 2.6, 3.9_

  - [ ] 3.7 Verification email line (after 3.2; edits `nitro-app/server/utils/email.ts` only)
    - Add "Verify your email within 7 days or your account will be automatically deleted." to the verification email footer; leave other templates unchanged
    - Source test asserts the text appears only in the verification template
    - _Bug_Condition: isBugCondition(input) where input.kind = 'disclaimer'_
    - _Expected_Behavior: Property 1(c)_
    - _Requirements: 2.4_

  - [ ] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Unverified signup, cleanup, disclaimer, Google duplicate signup, recipe loading
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing auth, lifecycle and recipe behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Then run the full vitest suite (baseline 29 files / 307 tests, plus the new tests) and vue-tsc (only the 6 known errors allowed), one after the other
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Reminder: no schema migration was added; if the signed-token approach is rejected, the fallback is one additive nullable `User.pending_username` column that the user applies manually.
