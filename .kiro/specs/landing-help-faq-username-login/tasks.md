# Implementation Plan

## Executor Notes (read first)

- The shell is flaky. Run nitro-app tests with:
  `cmd /c "cd /d C:\Users\Zarrin\Desktop\Projects\nitro-app && npx.cmd vitest run > out.txt 2>&1"`
  then read `out.txt`, then delete it.
- Vitest fails to load every file when started from a lowercase drive letter (c:\...). Always cd to C:\Users\... (uppercase C:) as in the commands above; do not rely on the tool's cwd parameter. Never run vitest in parallel with vue-tsc.
- Type-check omniscan-ui with:
  `cmd /c "cd /d C:\Users\Zarrin\Desktop\Projects\omniscan-ui && node node_modules/vue-tsc/bin/vue-tsc.js --noEmit > tsc.txt 2>&1"`
  Only the 6 known errors in `src/utils/appBadge.ts` and `src/utils/reminderScheduler.ts` are acceptable. Delete `tsc.txt` afterwards.
- Current nitro-app baseline: 19 files / 171 tests passing (new tests add to this).
- Never use `:global(html.ion-palette-dark)` in scoped styles. Write plain `html.ion-palette-dark .x { ... }` rules.
- Do not edit `dark-mode.css`.
- No renames of existing functions, routes, fields or parameters.
- `ui-preservation` snapshot covers LoginPage dark rules and auth light rules. Keep LoginPage style edits additive only (no edits or removals of existing rules). The only permitted snapshot change is deleting the single `.add-middle-link` line in `lightRules["views/RegisterPage.vue"]` of `nitro-app/server/tests/fixtures/ui-preservation-snapshot.json` (task 3.10), by hand, as a one-line removal. Never regenerate, reformat or re-sort the snapshot, and change no other line.
- No schema migration is needed.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Username/Identifier Login and Null-Password Account
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope to the concrete failing cases from isBugCondition: username identifier, `identifier` field, null-password account
  - Create `nitro-app/server/tests/login-identifier.bug.test.ts` using the mocking pattern from `account-lifecycle.bug.test.ts` (mock `../lib/prisma`, `bcrypt`, `jsonwebtoken`, `h3` helpers). Define its own prisma mock; do not rely on the `match` helper supporting `{ equals, mode }`
  - Case A: body `{ identifier: 'juan_dela', password: 'pw' }` with stored user, expect 200 `{ token, user, message }` (unfixed: 400 "Email is required.")
  - Case B: body `{ email: 'juan_dela', password: 'pw' }`, expect 200 (unfixed: 401)
  - Case C: stored user with `password: null`, `bcrypt.compare` mocked to throw on null hash, expect 401 "Invalid username/email or password." (unfixed: 500 "Failed to log in.")
  - Case D (source check): `LoginPage.vue` identifier input is `type="text"` with label "Username or email" (unfixed: `type="email"`)
  - Middle-name cases (addendum, **Property 3: Bug Condition** - No middle name option; first name sent and shown whole): create `nitro-app/server/tests/middle-name-removal.bug.test.ts`, which reads the two views as text like `ui-preservation.test.ts`
    - Case E (register markup): `RegisterPage.vue` contains no `add-middle-link`, `showMiddleName` or `middleName` (unfixed: all present)
    - Case F (register submit): the first argument of the `authStore.register(` call is exactly `firstName.value.trim()` (unfixed: it joins first and middle with `.filter(Boolean).join(' ')`)
    - Case G (profile markup and state): `ProfilePage.vue` contains no `add-middle-link`, `showMiddleName` or `middleName` (unfixed: all present)
    - Case H (profile open): the `startEditing` body has no `.split(` on the first name and assigns `form.firstName` from `user.value.first_name || user.value.name` (unfixed: splits, e.g. `firstParts.slice(1).join(' ')`)
    - Case I (profile save): the PUT body has `first_name: form.firstName.trim()` (unfixed: joins first and middle)
    - Case J (edge, long folded name): nothing in `startEditing` or the save body uses `slice(`, `substring(` or `substr(` on `firstName`. This one passes before and after; it guards 2.17
    - Also add fast-check properties with a local helper that mirrors the one-line assignments: for random strings (letters and spaces, length 0 to 40) as stored `first_name`, the open assignment returns the trimmed string unchanged; for random first/last pairs the save body has `first_name = trim(first)`, `last_name = trim(last)` and `name` equal to the non-empty trimmed parts joined by one space
  - Run on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bug exists). Cases E to I fail; Case J passes
  - Document counterexamples found (e.g., "identifier request returns 400 Email is required."; "null password returns 500"; `[firstName.value.trim(), middleName.value.trim()].filter(Boolean).join(' ')` in RegisterPage.vue; `firstParts.slice(1).join(' ')` in ProfilePage.vue)
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 2.6, 2.7, 2.8, 2.10, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Email Login, Settings FAQ and Unchanged Surfaces
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: `{ email, password }` verified login returns `{ token, user: { id, name, email, avatar_base64 }, message: 'Login successful' }`, JWT payload `{ userId, email, sid }` with expiry `7d`
  - Observe: success writes new `session_token`, sets `last_active`, clears `inactivity_warning_sent_at`, writes `LOGIN` audit event; ARCHIVED user is restored to ACTIVE with `archived_at` cleared
  - Observe: correct password + unverified email gives 403 with `requiresVerification: true` and `data.email`; wrong password + unverified gives 401 (status only, message text intentionally changes later)
  - Create `nitro-app/server/tests/login-identifier.preservation.test.ts` with fast-check properties over random valid emails, statuses (ACTIVE/ARCHIVED) and verification states, asserting the observed shape and writes
  - Add source-level checks: `SettingsPage.vue` keeps `faq-accordion-item` markup and its `<style>` block unchanged; snapshot the original 10-entry `faqs` array (questions, answers, order) in the test for later deep-equal against the shared module; `dark-mode.css` sha256 test still passes; `authOnlyPaths` unchanged
  - Property 4 checks (addendum, **Property 4: Preservation** - Names, validation, Google prefill, admin list and unsaved-changes detection): create `nitro-app/server/tests/middle-name-removal.preservation.test.ts`. Observe on UNFIXED code first, then assert
    - Single-word names: for random single-word `first_name`/`last_name` (fast-check), the old `startEditing` split gives the same First and Last as the new assignment, and the old save join gives the same `first_name` and `name` as the new one (empty middle). Model both old and new expressions locally in the test
    - Validation intact: `RegisterPage.vue` keeps `maxlength="16"` on First name, `maxlength="25"` on Last name, `fieldErrors.firstName`/`fieldErrors.lastName` and the `!firstName.value.trim()` / `!lastName.value.trim()` checks; `ProfilePage.vue` keeps `maxlength="16"` on First Name and `maxlength="25"` on Last Name
    - Google prefill: `RegisterPage.vue` still assigns `firstName.value = payload.firstName`, `pending.firstName` and the matching last-name lines
    - Admin list untouched: `AdminManageUserProfile.vue`, `register.post.ts`, `google/register.post.ts`, `users/index.put.ts` and `prisma/schema.prisma` have no diff (`git diff --stat`)
    - Unsaved-changes detection: the `hasUnsavedChanges` source compares `firstName`, `lastName`, `username`, `gender`, `birthday`, `halalPref`, `customPreferences`, `avatarBase64` and the typed-password flag; a local model reports changed iff a tracked field differs (random edits), and no change for an untouched form. The `middleName` comparison is the only one allowed to disappear (checked after the fix)
    - Stored names unchanged: `name`, `first_name`, `last_name` returned and displayed as before outside the Edit Profile form (no edits to Profile view, Settings or greeting code)
    - Style rules: in `ProfilePage.vue` the `.input-label` entry in the nested dark block and `.name-row` remain; no `:global(html.ion-palette-dark) .` selector is introduced; every other `lightRules` snapshot entry for `views/RegisterPage.vue` still exists in the source
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17_

- [x] 3. Fix for landing Help FAQ, username/email sign-in and middle name removal

  - [x] 3.1 Create shared FAQ module and import it in Settings
    - Create `omniscan-ui/src/data/faqContent.ts` exporting `interface FaqItem { q: string; a: string }` and `export const faqs: FaqItem[]` with the 10 entries copied verbatim and in order from `SettingsPage.vue`
    - In `SettingsPage.vue`, replace the local `const faqs = [...]` with `import { faqs } from '@/data/faqContent'`
    - Do not touch the template, class names or `<style scoped>` block
    - _Bug_Condition: isBugCondition(input) where input is LandingVisit (1.2)_
    - _Expected_Behavior: expectedBehavior(result) from design (single FAQ source)_
    - _Preservation: Settings FAQ questions, order, markup and styles unchanged (3.9)_
    - _Requirements: 1.2, 2.3, 3.9_

  - [x] 3.2 Create HelpPage.vue and the /help route
    - Create `omniscan-ui/src/views/HelpPage.vue`: header (brand, theme toggle via `useDarkMode()`, Sign up, Sign in, same markup and classes as WelcomePage), "Back to home" button (`router.push('/')`), eyebrow "HELP AND SUPPORT", one `h1` "How can we help?", subtitle, and a "Common questions" card (`h2`) with `ion-accordion-group` over shared `faqs`
    - Reuse classes `faq-accordion-item`, `faq-accordion-header`, `faq-badge`, `faq-question-label`, `faq-accordion-body`, `faq-answer-text` so global dark rules apply; add matching light rules in HelpPage `<style scoped>` (white card, `#e5e7eb` border, 14px radius, `#dcfce7`/`#16a34a` badge)
    - Dark mode with plain `html.ion-palette-dark .x { ... }` rules (`!important` where Ionic shadow parts need it): page `#0f172a`, card `#1e293b`, border `#334155`, primary text `#f1f5f9`, secondary `#94a3b8`. Never use `:global(html.ion-palette-dark)`. Do not edit `dark-mode.css`
    - Omit the contact form (no textarea, "Send message") and the "Can't sign in? Contact support below." line
    - Add `aria-label` on icon buttons
    - In `omniscan-ui/src/router/index.ts` add `{ path: '/help', name: 'help', component: () => import('../views/HelpPage.vue'), meta: { title: 'OmniScan' } }` next to the other public routes, with no `beforeEnter`. Do not change `authOnlyPaths` or `beforeEach`
    - _Bug_Condition: isBugCondition(input) where input.requestsPath('/help') (1.2)_
    - _Expected_Behavior: expectedBehavior(result) from design (public FAQ view, navy dark theme, no contact form)_
    - _Preservation: existing routes and redirects unchanged (3.10)_
    - _Requirements: 1.2, 2.2, 2.3, 2.4, 2.5, 3.10_

  - [x] 3.3 Add "Help and Support" footer link to WelcomePage
    - In the `<footer>` of `WelcomePage.vue` add `<a href="/help" class="footer-link" @click.prevent="router.push('/help')">Help and Support</a>`; keep existing brand and tagline spans
    - Keep `justify-content: space-between` and the mobile column layout looking correct
    - Add additive `.footer-link` light rules (with visible focus style) and a plain `html.ion-palette-dark .footer-link { ... }` rule matching existing dark footer styling
    - _Bug_Condition: isBugCondition(input) where input.viewsFooter (1.1)_
    - _Expected_Behavior: expectedBehavior(result) from design (link visible light/dark, mobile/desktop)_
    - _Preservation: existing landing page content and routes unchanged (3.10)_
    - _Requirements: 1.1, 2.1, 3.10_

  - [x] 3.4 Update login.post.ts for identifier/username lookup, dummy hash and generic 401
    - In `nitro-app/server/api/auth/login.post.ts` read `{ identifier, email, password }`. `raw = identifier ?? email` (identifier wins; a present non-string identifier is invalid, no fallback). If `raw` is not a string or trims to empty, throw 400 "Username or email is required."; keep 400 "Password is required." after it
    - Resolve user with the existing `select`: if id contains "@", `prisma.user.findUnique({ where: { email: id }, select })` (unchanged call); otherwise `prisma.user.findMany({ where: { username: { equals: id, mode: 'insensitive' } }, select, take: 5 })`, pick `username === id` exact match, else the single row, else (2+ non-exact) no match
    - Add module-level `DUMMY_HASH` (bcrypt hash, cost matching registration, of a throwaway string). Always run `await bcrypt.compare(password, user?.password ?? DUMMY_HASH)`; accept only when `user && user.password && isValid`
    - All failures before the verification check throw 401 "Invalid username/email or password."
    - Leave everything after the password check unchanged (403 verification with `data.email`, `session_token`, JWT `{ userId, email, sid }` 7d, `last_active`, ARCHIVED restore, `LOGIN` audit, response body)
    - Keep `/api/auth/login` in `AUTH_EXEMPT_ENDPOINTS`; do not touch `/api/admin/login`, register, check-username or Google flows
    - _Bug_Condition: isBugCondition(input) where input is LoginRequest (1.3, 1.4, 1.5)_
    - _Expected_Behavior: expectedBehavior(result) from design (200 shape, 403 with data.email, or generic 401)_
    - _Preservation: email login shape, JWT, session writes, ARCHIVED restore, 403 order, register/Google/admin unchanged (3.1-3.7)_
    - _Requirements: 1.3, 1.4, 1.5, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.5 Update authStore.login request body
    - In `omniscan-ui/src/stores/authStore.ts` keep `async login(email: string, password: string): Promise<LoginResponse>` (no rename) and change only the body to `{ identifier: email, password }`, with a short comment explaining the parameter now carries a username or email
    - Leave the admin-session clearing before the request untouched
    - _Bug_Condition: isBugCondition(input) where input.identifier IS NOT undefined (1.4)_
    - _Expected_Behavior: expectedBehavior(result) from design (2.13)_
    - _Preservation: method name, return type and admin-state clearing unchanged_
    - _Requirements: 1.4, 2.13, 3.7_

  - [x] 3.6 Update LoginPage field and resend via 403 data.email
    - In `LoginPage.vue` set label "Username or email"; input `type="text"`, placeholder "Username or email", `autocomplete="username"`, `autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"`, no `inputmode="email"`; add `novalidate` to the `<form>`. Keep `v-model="email"` and `.custom-input`
    - Add `const verificationEmail = ref<string | null>(null)`; reset it in `handleLogin`; on a 403 `ApiError` read the email from the error data (confirm the actual property on `ApiError` in `omniscan-ui/src/utils/api.ts` first) and store it
    - `handleResend` uses `verificationEmail.value ?? (email.value.includes('@') ? email.value.trim() : '')` and returns early if empty, replacing the old `!email.value` guard
    - Styles: additive only. Do not edit or remove any existing rule (ui-preservation snapshot)
    - Leave Forgot password (email-only) and "Remember me" behavior unchanged
    - _Bug_Condition: isBugCondition(input) where input is ResendAction with a username (1.3, 1.6)_
    - _Expected_Behavior: expectedBehavior(result) from design (2.6, 2.11)_
    - _Preservation: LoginPage dark rules and auth light rules in snapshot unchanged; forgot password and remember me unchanged (3.8)_
    - _Requirements: 1.3, 1.6, 2.6, 2.11, 3.8_

  - [x] 3.7 Add unit and source-level tests for the fix
    - Server unit tests in `nitro-app/server/tests`: `identifier` preferred over `email`; legacy `email` only; trimming; "@" routing (email uses `findUnique`, username uses `findMany` with `mode: 'insensitive'`); case rules (`Juan_Dela` matches `juan_dela`, exact-case preferred, two non-exact matches give 401); validation 400s; unknown/wrong/null password all give 401 with `bcrypt.compare` called once; 403 carries `data.email` for a username login
    - fast-check properties: case permutations of a stored username sign in the same account; "@" strings only hit the email lookup and others only the username lookup; random/malformed bodies never produce 500
    - Source-level UI checks: `faqContent.ts` exports 10 items deep-equal to the snapshot from task 2; `SettingsPage.vue` imports it and has no `const faqs`; `HelpPage.vue` imports it, has no `<textarea`, "Send message" or "Contact support below", and no `:global(html.ion-palette-dark)`; router has `/help` with no `beforeEnter`; `WelcomePage.vue` footer contains "Help and Support"; `LoginPage.vue` input is `type="text"` with label "Username or email"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13_

  - [x] 3.8 Remove middle name from RegisterPage.vue (File 10)
    - Template (step 1): delete the `<button type="button" class="add-middle-link" ...>` element and the `<div v-if="showMiddleName" class="form-group">` Middle name block. Keep `.name-row` with First name and Last name. The Google path shares this markup, so it loses the link too
    - Script: delete `const middleName = ref('')` and `const showMiddleName = ref(false)`
    - `handleRegister`: replace `[firstName.value.trim(), middleName.value.trim()].filter(Boolean).join(' ')` with `firstName.value.trim()` in the `authStore.register(...)` call; other arguments unchanged. Do not touch `authStore.register`
    - Delete `middleName.value = ''` from the post-success form clean-up
    - Style: delete only the single `.add-middle-link { ... }` line in `<style scoped>`; keep neighbouring `.name-row` formatting
    - Do not touch Google prefill (`firstName.value = payload.firstName`, `pending.firstName`)
    - Confirm with a search that no `middleName|showMiddleName|add-middle-link` remains in the file
    - Land together with task 3.10 (the `ui-preservation` light-rule check fails for this view until the snapshot line is removed)
    - _Bug_Condition: isBugConditionMiddleName(input) where input is the sign-up step 1 view or submit (1.7, 1.8)_
    - _Expected_Behavior: expectedMiddleName(result) from design (no link/input; first_name = firstName.value.trim())_
    - _Preservation: First/Last name validation and maxlength, Google prefill, username, gender, birthday, email, password, Terms, step 2 unchanged (3.12, 3.13, 3.14)_
    - _Requirements: 1.7, 1.8, 2.14, 2.15, 2.20, 3.12, 3.13, 3.14_

  - [x] 3.9 Remove middle name from ProfilePage.vue with no-split open rule and trimmed save (File 11)
    - Template: delete the `add-middle-link` button in the First Name `form-group` and the `<div v-if="showMiddleName" class="form-group">` Middle name block. Keep First Name `maxlength="16"`, the `.name-row` grid and the Last Name group
    - State: delete `const showMiddleName = ref(false)`, `middleName: ''` in `form` and `middleName: ''` in `initialForm`
    - `startEditing` (no-split open rule): replace the split with
      `form.firstName = (user.value.first_name || user.value.name || '').trim()` and `form.lastName = (user.value.last_name || '').trim()`. Do not split on spaces, slice or truncate. Delete `form.middleName = ...`, `showMiddleName.value = ...` and `initialForm.middleName = form.middleName`; keep `initialForm.firstName = form.firstName`. Fix the stale comment above it (older accounts may hold "First Middle" in `first_name`; it is kept whole)
    - `hasUnsavedChanges`: delete only the `form.middleName !== initialForm.middleName ||` line
    - Save body (trimmed save): `first_name: form.firstName.trim()`, keep `last_name: form.lastName.trim()`, and `name: [form.firstName, form.lastName].map((s) => s.trim()).filter(Boolean).join(' ')`. No other body field changes
    - Resets: delete `showMiddleName.value = false` after save and in the discard path of the leave guard; keep `resetPasswordFields()` and `isEditing.value = false`
    - Styles: delete the `.add-middle-link { ... }` light line and the `.add-middle-link { color: #94a3b8; }` entry inside the existing nested dark block. Keep the `.input-label` entry, so the block is not removed or rewritten. Write no `:global(html.ion-palette-dark) .x` selector
    - Confirm with a search that no `middleName|showMiddleName|add-middle-link` remains in the file; the avatar initial (`form.firstName || form.lastName`) is unaffected
    - _Bug_Condition: isBugConditionMiddleName(input) where input is the Edit Profile view, open or save (1.9, 1.10)_
    - _Expected_Behavior: expectedMiddleName(result) from design (whole first_name shown, trimmed save, unsaved-changes detection intact)_
    - _Preservation: Last Name, validation maxlength, stored names, admin views and API endpoints unchanged (3.12, 3.13, 3.15, 3.16)_
    - _Requirements: 1.9, 1.10, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 3.12, 3.13, 3.15, 3.16_

  - [x] 3.10 Deliberate one-line update of ui-preservation-snapshot.json (File 12)
    - In `nitro-app/server/tests/fixtures/ui-preservation-snapshot.json`, inside `lightRules["views/RegisterPage.vue"]`, delete exactly this one line (line ~379):
      `   ".add-middle-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #05c450; font-size: 0.82rem; font-weight: 600; cursor: pointer; padding: 0; margin: 4px 0 14px; }",`
    - Do NOT regenerate the file. Do not reformat, re-sort or touch any other line. Keep the 1-space indentation of array entries and the existing line endings (LF/CRLF as found). The neighbouring `.name-row` and `.pass-criteria-grid` entries keep their trailing commas, so the JSON stays valid
    - Verify with `git diff` on this file that exactly one line is deleted and no lines are added (`darkModeCssSha256`, `darkRules` and every other `lightRules` entry byte-identical); `darkRules["views/RegisterPage.vue"]` has no `.add-middle-link` entry and `views/ProfilePage.vue` is not in the snapshot, so nothing else changes
    - Run `ui-preservation.test.ts` and confirm it passes together with tasks 3.8 and 3.9
    - _Bug_Condition: isBugConditionMiddleName(input) where input is the `.add-middle-link` light rule (2.20)_
    - _Expected_Behavior: expectedMiddleName(result) from design (snapshot matches the source after the removal)_
    - _Preservation: dark-mode.css sha256, darkRules and all other snapshot entries unchanged (3.17)_
    - _Requirements: 2.20, 3.17_

  - [x] 3.11 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Username/Identifier Login, Null-Password Account and No Middle Name Option
    - **IMPORTANT**: Re-run the SAME tests from task 1 (`login-identifier.bug.test.ts` and `middle-name-removal.bug.test.ts`) - do NOT write new tests
    - The tests from task 1 encode the expected behavior; when they pass, the expected behavior is satisfied (including Cases E to J for the middle name)
    - Run with the flaky-shell command from the Executor Notes (rerun once sequentially if "Vitest failed to find the runner")
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21_

  - [x] 3.12 Verify preservation tests still pass
    - **Property 2: Preservation** - Email Login, Settings FAQ and Unchanged Surfaces
    - **Property 4: Preservation** - Names, validation, Google prefill, admin list and unsaved-changes detection
    - **IMPORTANT**: Re-run the SAME tests from task 2 (`login-identifier.preservation.test.ts` and `middle-name-removal.preservation.test.ts`) - do NOT write new tests
    - Run the preservation tests plus the existing `account-lifecycle.*` and `ui-preservation` tests (the latter against the updated snapshot)
    - Run `vue-tsc` per the Executor Notes (never in parallel with vitest); only the 6 known errors are acceptable, so no dangling `middleName`/`showMiddleName` references may remain
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full nitro-app vitest suite (baseline 19 files / 171 tests plus the new tests) and confirm all pass; delete `out.txt`
  - Run `vue-tsc` for omniscan-ui and confirm only the 6 known errors in `src/utils/appBadge.ts` and `src/utils/reminderScheduler.ts`; delete `tsc.txt`
  - Confirm `dark-mode.css` is unmodified and no `:global(html.ion-palette-dark)` was added
  - Manual pass (cannot be automated): landing footer link in light/dark, desktop/mobile; `/help` by direct URL while signed out; navy dark theme; accordion open/close; Settings FAQ visually unchanged; Back to home, Sign up and Sign in on `/help`; username and email sign in; unverified username resend; sign up (email and Google paths) shows only First name and Last name, light and dark; Edit Profile shows a multi-word first name (e.g. "Juan Santos") whole in First Name; saving works (untouched and edited); the unsaved-changes prompt still works (no prompt on Cancel with no change, prompt after an edit); `.name-row` layout looks right without the link
  - Confirm `git diff` for `ui-preservation-snapshot.json` shows exactly one deleted line and no added lines, and that `AdminManageUserProfile.vue`, the register/google-register/users endpoints and `prisma/schema.prisma` have no diff
  - Ensure all tests pass, ask the user if questions arise.
