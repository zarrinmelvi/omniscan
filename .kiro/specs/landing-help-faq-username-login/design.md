# Landing Help FAQ and Username Login Bugfix Design

## Overview

Two gaps are fixed together.

1. **Public FAQ.** The landing page footer has no "Help and Support" entry, and the FAQ only exists as a local `faqs` array inside `SettingsPage.vue` (behind auth). The fix moves the array into one shared module, adds a public `/help` route and view that renders only the FAQ, and adds a footer link on `WelcomePage.vue`.
2. **Username sign-in.** `POST /api/auth/login` only reads `email` and runs `findUnique({ where: { email } })`; `LoginPage.vue` forces `type="email"`. The fix makes the endpoint accept `identifier` (preferred) or legacy `email`, routes by "@" to an email or username lookup, matches usernames case-insensitively (exact case preferred), returns one generic 401 message, and no longer throws on a null password (Google-only accounts).

The approach is additive. No function, route or field is renamed. `dark-mode.css` is not edited. Email-based login keeps the same Prisma call (`findUnique({ where: { email } })`), so the existing account-lifecycle tests keep working with their `{ email, password }` bodies.

## Glossary

- **Bug_Condition (C)**: Input for which the current system fails: a login with a username, a login posted as `{ identifier }`, a password login against a null-password account, and a signed-out visitor trying to reach the FAQ.
- **Property (P)**: The desired behavior for those inputs (see Correctness Properties).
- **Preservation**: Existing behavior that must not change: email login result shape, JWT, session token, ARCHIVED restore, 403 verification block, register, Google flows, admin login, Settings FAQ look and behavior.
- **identifier**: The trimmed login id. It is `body.identifier` if present, otherwise `body.email`.
- **faqContent module**: New `omniscan-ui/src/data/faqContent.ts`, exporting `faqs` and a `FaqItem` type. Single source for Settings and Help.
- **HelpPage**: New `omniscan-ui/src/views/HelpPage.vue`, routed at `/help`.
- **login.post.ts**: `nitro-app/server/api/auth/login.post.ts`, the user login handler.
- **authStore.login**: Method in `omniscan-ui/src/stores/authStore.ts` that posts credentials.
- **AUTH_EXEMPT_ENDPOINTS**: Array in `omniscan-ui/src/utils/api.ts` (not server middleware). It stops the client from attaching a token and from running 401 logout handling for login calls. `/api/auth/login` is already in it and stays. `server/middleware/auth.ts` has no exempt list: it only populates `event.context.user`, so login is public on the server already.

## Bug Details

### Bug Condition

The bug manifests in four situations. (a) The login handler receives a username, or a body with `identifier` and no `email`. (b) The login handler matches a Google-only account (`password` is null) and passes null to `bcrypt.compare`. (c) The login page has a username typed and the account is unverified, so "Resend verification email" uses the typed username. (d) A signed-out visitor wants the FAQ, or the landing footer is viewed.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type LoginRequest | LandingVisit | ResendAction
  OUTPUT: boolean

  IF input is LoginRequest THEN
    id := trim(input.identifier ?? input.email)
    RETURN (input.identifier IS NOT undefined)                      // 1.4
        OR (id NOT contains '@' AND accountExistsByUsername(id))    // 1.3
        OR (accountFor(id) EXISTS AND accountFor(id).password IS null) // 1.5
  IF input is ResendAction THEN
    RETURN input.typedIdentifier NOT contains '@'
           AND accountUnverified(input.typedIdentifier)             // 1.6
  IF input is LandingVisit THEN
    RETURN input.viewsFooter OR input.requestsPath('/help')         // 1.1, 1.2
END FUNCTION
```

### Examples

- `POST /api/auth/login { email: "juan_dela", password: "pw" }` today: `findUnique({ where: { email: "juan_dela" } })` returns null, so 401 "Invalid email or password.". Expected: signs in as the user with username `juan_dela`.
- `POST /api/auth/login { identifier: "user@gmail.com", password: "pw" }` today: 400 "Email is required.". Expected: same result as `{ email: "user@gmail.com", password: "pw" }`.
- `{ identifier: "Juan_Dela" }` for stored `juan_dela`: expected success. If both `Juan_Dela` and `juan_dela` exist and the user typed `Juan_Dela`, the exact-case account is used. If the typed `JUAN_DELA` matches two accounts and neither exactly, expected 401 generic.
- Google-only account with email `g@gmail.com` and any password: today `bcrypt.compare(password, null)` can throw, giving 500 "Failed to log in.". Expected: 401 "Invalid username/email or password.".
- Unverified user types `juan_dela` with the right password: the server returns 403 with `data.email`. Expected: the page remembers that email and "Resend verification email" posts it.
- Edge: identifier `"   "` or `123` (non-string): 400 "Username or email is required.".
- Landing page footer today: only "OmniScan" and the tagline. Expected: a "Help and Support" link to `/help`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Correct email and password with a verified email returns `{ token, user: { id, name, email, avatar_base64 }, message: 'Login successful' }`, JWT payload `{ userId, email, sid }`, expiry `7d`.
- Successful login still writes a new `session_token`, sets `last_active`, clears `inactivity_warning_sent_at`, restores ARCHIVED users to ACTIVE, and writes the `LOGIN` audit event.
- Unverified user with correct credentials still gets 403 with `requiresVerification: true` and `data.email`. Credentials are checked before this, so a wrong password never reveals verification state.
- `/api/auth/register`, the check-username endpoint, Google sign-in and registration, and `/api/admin/login` are untouched. Usernames stay stored with original casing and validated by `^[a-zA-Z0-9_]{4,15}$`.
- Forgot password stays email-only. "Remember me" still persists nothing.
- Settings FAQ keeps the same questions, order, numbered badges, accordion behavior, markup, class names and styles. `dark-mode.css` keeps its sha256.
- `/`, `/login`, `/register` and all other routes behave as before. `authOnlyPaths` is not changed.

**Scope:**
All inputs that do NOT involve a username identifier, an `identifier` field, a null-password account, or the new help entry point are unaffected. This includes:
- Email logins posted as `{ email, password }`.
- Every route other than the new `/help`.
- The Settings page and all other users of `apiFetch`.

## Hypothesized Root Cause

Confirmed by reading the code (no speculation needed for most items):

1. **Email-only handler**: `login.post.ts` destructures only `{ email, password }`, validates "Email is required.", and uses `findUnique({ where: { email } })`. `username` is `String? @unique` in the Prisma schema, but is never queried at login.
2. **Null password not guarded**: `User.password` is `String?` (OAuth accounts). `bcrypt.compare(password, user.password)` is called without a null check, so the call can throw and the generic catch turns it into a 500.
3. **Email-typed UI**: `LoginPage.vue` binds `type="email"` with label "Email Address", so browsers reject a username before submit. `authStore.login(email, password)` posts `{ email, password }`.
4. **Resend reads the input**: `handleResend` posts `email.value`. With a username in that ref, it would send a username to `/api/auth/resend-verification`.
5. **FAQ trapped in a component**: `faqs` is a local `const` in `SettingsPage.vue`, and `/tabs/settings` is under the auth-guarded `/tabs` prefix. The `.faq-*` light styles are `scoped` to Settings, so they do not reach a new view. The dark styles are global in `dark-mode.css` (`html.ion-palette-dark .faq-accordion-item`, `.faq-accordion-header`, `.faq-question-label`, `.faq-answer-text`, `.faq-accordion-body`, `.faq-badge`) and keyed on class names.
6. **Timing and enumeration**: today an unknown email returns immediately (no bcrypt), so response time differs from a known account. The new generic-message requirement needs equalized work.

## Correctness Properties

Property 1: Bug Condition - Login by username or identifier, and public FAQ

_For any_ login request where the bug condition holds (a username identifier, an `identifier` field, or a Google-only account), the fixed `login.post.ts` SHALL authenticate against the matching account when the password is valid (same response shape as email login), and SHALL respond 401 "Invalid username/email or password." (never 500) when no account matches, the password is wrong, or the account has no password. _For any_ signed-out visitor, the landing footer SHALL show "Help and Support" and `/help` SHALL render the shared FAQ without authentication, without the contact form, and with the navy dark theme.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13**

Property 2: Preservation - Existing login, register, Google, admin and Settings FAQ behavior

_For any_ input where the bug condition does NOT hold (email logins posted as `{ email, password }`, register, Google flows, admin login, Settings FAQ, other routes), the fixed code SHALL produce the same result as the original code, preserving the response shape, JWT claims, session-token write, ARCHIVED restore, 403 verification block, route table and Settings FAQ rendering.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**

## Fix Implementation

### Changes Required

Assuming the root cause analysis above is correct:

**File 1 (new)**: `omniscan-ui/src/data/faqContent.ts`

1. Export `interface FaqItem { q: string; a: string }` and `export const faqs: FaqItem[]` with the 10 entries copied verbatim and in order from `SettingsPage.vue`.

**File 2**: `omniscan-ui/src/views/SettingsPage.vue`

1. Replace the local `const faqs = [...]` with `import { faqs } from '@/data/faqContent'`. The template (`v-for="(faq, index) in faqs"`), classes and `<style scoped>` block are not touched.

**File 3 (new)**: `omniscan-ui/src/views/HelpPage.vue`

1. Structure: `ion-page` > `ion-content` > header (brand, theme toggle, Sign up, Sign in, same markup and classes as `WelcomePage`), a "Back to home" button (`router.push('/')`), eyebrow "HELP AND SUPPORT", `h1` "How can we help?", subtitle, then a "Common questions" card containing `ion-accordion-group` over the shared `faqs`.
2. Reuse the class names `faq-accordion-item`, `faq-accordion-header`, `faq-badge`, `faq-question-label`, `faq-accordion-body`, `faq-answer-text` so the existing global dark rules in `dark-mode.css` apply without edits. Add the matching light rules in HelpPage's own `<style scoped>` (copied from Settings values: white card, `#e5e7eb` border, 14px radius, `#dcfce7`/`#16a34a` badge). Use `ion-accordion`/`ion-item` as in Settings.
3. Dark mode: page and card follow the WelcomePage pattern, written as plain `html.ion-palette-dark .x { ... }` rules with `!important` where Ionic shadow parts require it, using page `#0f172a`, card `#1e293b`, border `#334155`, text `#f1f5f9`, secondary `#94a3b8`. Never use `:global(html.ion-palette-dark) .x`. The `.faq-badge`/`.faq-accordion-*` dark colors come from `dark-mode.css`; only the ones it does not cover (page background via `--background`, header, title, subtitle, card wrapper) are added locally.
4. Omit the contact form and the "Can't sign in? Contact support below." line. Use `useDarkMode()` for the toggle, same as WelcomePage. Set a heading hierarchy (one `h1`, `h2` for the card), `aria-label` on icon buttons, and keep accordion keyboard behavior from Ionic.

**File 4**: `omniscan-ui/src/router/index.ts`

1. Add a route `{ path: '/help', name: 'help', component: () => import('../views/HelpPage.vue'), meta: { title: 'OmniScan' } }` next to the other public routes. No `beforeEnter`.
2. The global `beforeEach` needs no change: `/help` is not in `authOnlyPaths` (so signed-in users are not bounced) and does not start with `/tabs` (so signed-out users are not redirected). In `ADMIN` mode `/help` redirects to `/admin/login`, like every non-admin path, which is intended. Vercel's rewrite `/((?!api/).*)` to `/index.html` already covers direct URL access.

**File 5**: `omniscan-ui/src/views/WelcomePage.vue`

1. In the `<footer>`, add `<a href="/help" class="footer-link" @click.prevent="router.push('/help')">Help and Support</a>` (a real anchor for accessibility and crawlers). Keep the existing brand and tagline spans; wrap or arrange so the existing `justify-content: space-between` and the mobile column layout still look correct.
2. Add light rules `.footer-link { ... }` and a plain dark rule `html.ion-palette-dark .footer-link { ... }` with the same style as existing `html.ion-palette-dark footer` rules, additive only. Include a visible focus style.

**File 6**: `nitro-app/server/api/auth/login.post.ts`

1. Parse `const { identifier, email, password } = body as {...}`. Compute `raw = identifier ?? email` (identifier wins when both are sent; if `identifier` is present but not a string, treat as invalid rather than falling back). If `raw` is not a string or `raw.trim()` is empty, throw 400 "Username or email is required.". Keep 400 "Password is required." after it.
2. Resolve the user with the same `select` as today:
   - Contains "@": `prisma.user.findUnique({ where: { email: id }, select })` (unchanged call, so existing test mocks still match).
   - Else: `prisma.user.findMany({ where: { username: { equals: id, mode: 'insensitive' } }, select, take: 5 })`. Pick the row whose `username === id`; if none and exactly one row, take it; if two or more with no exact match, treat as no match. Postgres is the datasource, so `mode: 'insensitive'` is supported. Use `take: 5` so an exact-case row is still returned when several case variants exist (no `orderBy` dependence).
3. Password check: `const hash = user?.password ?? DUMMY_HASH`, run `await bcrypt.compare(password, hash)` for every request, and accept only when `user && user.password && isValid`. `DUMMY_HASH` is a module-level bcrypt hash (cost matching the registration cost) of a throwaway string. This removes the null-password throw and evens out timing for unknown accounts.
4. Every failure before the verification check throws 401 "Invalid username/email or password.".
5. Everything after the password check (403 verification with `data.email: user.email`, session token, JWT, `last_active` update, ARCHIVED restore, audit log, response body) is unchanged.
6. Write the audit summary and JWT from `user.email` as before.

**File 7**: `omniscan-ui/src/stores/authStore.ts`

1. Keep `async login(email: string, password: string): Promise<LoginResponse>` name and signature types (parameter name may stay `email`; callers pass positionally) and change only the body: `body: { identifier: email, password }`. The admin-session clearing above it is untouched. To make intent clear without renaming, add a short comment; do not rename the parameter.

**File 8**: `omniscan-ui/src/views/LoginPage.vue`

1. Template: label "Username or email"; input `type="text"`, placeholder "Username or email", `autocomplete="username"`, `autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"`, no `inputmode="email"`, so the plain text keyboard is used. Add `novalidate` to the `<form>`. Keep the `v-model="email"` ref (no rename) and the `.custom-input` class.
2. Add `const verificationEmail = ref<string | null>(null)`. In `handleLogin`, reset it; on a 403 `ApiError`, read `err.data?.email` (verify the actual field name on `ApiError` in `utils/api.ts` when implementing, since the 403 body is H3's `{ data: { email } }`) and store it.
3. `handleResend` uses `verificationEmail.value ?? (email.value.includes('@') ? email.value.trim() : '')`. If nothing usable exists, it returns early as before. The guard `!email.value` is replaced by this resolved value.
4. Styles: no existing rule is edited or removed. No new style is required; if one is needed, add it as a new rule only. Light rules for all auth pages and the LoginPage dark rules are snapshotted in `fixtures/ui-preservation-snapshot.json`, so additions are allowed but edits are not.

**File 9 (tests)**: see Testing Strategy. The snapshot file is not regenerated; this design needs no deliberate update.

### Existing tests checked

- `account-lifecycle.bug.test.ts` and `account-lifecycle.preservation.test.ts` post `{ email: 'user@gmail.com', password: 'pw' }`. They mock `bcrypt.compare` as `async () => true` and `findUnique` filtering on `where`. The email path keeps `findUnique({ where: { email } })`, so they pass unchanged.
- No test asserts "Invalid email or password." or "Email is required." (searched `nitro-app/server/tests` and `omniscan-ui/src`). No existing test needs to be edited; only the intentional message change affects behavior and nothing asserts it.
- `ui-preservation.test.ts`: `LoginPage.vue` dark rules must equal the snapshot, and every original light rule in `LoginPage.vue`, `RegisterPage.vue` and others must still exist. The plan changes LoginPage template and script only. `WelcomePage.vue`, `SettingsPage.vue` and `HelpPage.vue` are not in the snapshot, but `SettingsPage.vue` styles stay untouched anyway.
- The mock prisma in these tests has `user.findMany` that filters with a `match` helper. New username tests should define their own mock rather than rely on `match` supporting `{ equals, mode }`.

## Testing Strategy

### Validation Approach

First surface counterexamples on the unfixed code, then verify the fix and preservation. Server tests are vitest (`nitro-app/server/tests`, run with `npx vitest run`). UI checks are source-level, like `ui-preservation.test.ts`, plus `vue-tsc`.

### Exploratory Bug Condition Checking

**Goal**: Show the bug before the fix and confirm the root causes.

**Test Plan**: Add `nitro-app/server/tests/login-identifier.bug.test.ts`, using the same mocking pattern as `account-lifecycle.bug.test.ts` (mock `../lib/prisma`, `bcrypt`, `jsonwebtoken`, `h3` helpers). Run on UNFIXED code.

**Test Cases**:
1. **Username login**: body `{ identifier: 'juan_dela', password: 'pw' }` with a stored user (will fail on unfixed code with 400 "Email is required.").
2. **Legacy email field with username**: body `{ email: 'juan_dela', password: 'pw' }` (will fail: 401).
3. **Null password**: stored user with `password: null`, `bcrypt.compare` mocked to throw on null (will fail: 500 instead of 401).
4. **Source check for LoginPage**: file text contains `type="email"` on the identifier input (will fail after fix, passes before; used as the exploration marker).

**Expected Counterexamples**:
- 400 "Email is required." for `identifier` requests.
- 500 "Failed to log in." for a null-password account.
- Possible causes: email-only destructuring, `findUnique({ where: { email } })`, missing null guard.

### Fix Checking

**Goal**: For all inputs where the bug condition holds, the fixed code gives the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := login_fixed(input)
  ASSERT expectedBehavior(result)
END FOR

FUNCTION expectedBehavior(result)
  RETURN (credentialsValid AND verified AND result.status = 200 AND result.shape = {token, user, message})
      OR (credentialsValid AND NOT verified AND result.status = 403 AND result.data.requiresVerification AND result.data.email = account.email)
      OR (NOT credentialsValid AND result.status = 401 AND result.message = 'Invalid username/email or password.')
END FUNCTION
```

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, fixed and original behave the same.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT login_original(input) = login_fixed(input)    // email path, same shape, same writes
END FOR
```

**Testing Approach**: Property-based testing (fast-check, already used in the account-lifecycle tests) for preservation, because it covers many email, state and status combinations automatically.

**Test Plan**: Observe on UNFIXED code, then assert after the fix: email login success shape and JWT payload, `session_token`/`last_active` writes, ARCHIVED restore, 403 with correct password, 401 for wrong password (status only, since the message intentionally changes).

**Test Cases**:
1. **Email login preservation**: for random valid emails and statuses (ACTIVE/ARCHIVED), response shape and DB writes match the original.
2. **Verification block order**: wrong password plus unverified email returns 401 (not 403); correct password plus unverified returns 403.
3. **Settings FAQ preservation**: `SettingsPage.vue` template still contains the `faq-accordion-item` markup, its `<style>` block is byte-identical, and `faqs` imported from the shared module deep-equals the 10 original entries (snapshot the original array in the test).
4. **dark-mode.css**: existing sha256 test continues to pass.

### Unit Tests

- `login.post.ts`: `identifier` preferred over `email`; legacy `email` only; both sent; trimming; "@" routing (email path calls `findUnique`, username path calls `findMany` with `mode: 'insensitive'`).
- Case rules: `Juan_Dela` matches `juan_dela`; exact-case chosen over a case variant; two non-exact matches give 401.
- Validation: blank, whitespace, number and missing identifier give 400 "Username or email is required."; missing password gives 400 "Password is required.".
- Generic failures: unknown id, wrong password, null password all give 401 "Invalid username/email or password." with `bcrypt.compare` called once in each case (timing parity).
- 403 body carries `data.email` for a username login.
- Source-level UI checks: `faqContent.ts` exports 10 items; `SettingsPage.vue` imports it and no longer defines `const faqs`; `HelpPage.vue` imports it, contains no `<textarea`/"Send message"/"Contact support below", and has no `:global(html.ion-palette-dark)`; router has the `/help` route with no `beforeEnter`; `WelcomePage.vue` footer contains "Help and Support"; `LoginPage.vue` input is `type="text"` with label "Username or email".

### Property-Based Tests

- For random identifiers matching `^[a-zA-Z0-9_]{4,15}$` and random case permutations of a stored username, the fixed handler signs in the same account.
- For random strings containing "@", the handler only ever calls the email lookup; for strings without it, only the username lookup.
- For random bodies (missing, non-string, whitespace identifiers), the handler returns only 400, 401, 403 or 200, never 500.
- Generated email-login scenarios give identical output between the original handler (kept as a test-local copy) and the fixed one, apart from the 401 message text.

### Integration Tests

- Full flow: register-like seed user, then sign in once by username and once by email; both return a token for the same `user.id`, and the second login invalidates the first `sid`.
- Unverified user signs in by username: 403 with `data.email`, and the page's resend call posts that email (checked with a component-level or source-level test of `handleResend`).
- Manual UI pass (cannot be automated here): landing footer link in light and dark, desktop and mobile; `/help` by direct URL signed out; `/help` navy dark theme; accordion open/close; Settings FAQ visually unchanged; Back to home, Sign up and Sign in buttons on `/help`.
- Final checks: nitro-app vitest (19 existing files, 171 tests plus new ones) and `vue-tsc` reporting only the 6 known errors in `src/utils/appBadge.ts` and `src/utils/reminderScheduler.ts`.

## Risks and Open Points

- **Username enumeration**: the generic message and the dummy-hash comparison reduce, but do not eliminate, timing differences (the `findMany` vs `findUnique` query costs differ slightly). This is acceptable given the stated requirement of "comparable time".
- **Case-insensitive lookup performance**: `mode: 'insensitive'` compiles to `ILIKE`/`lower()`, which cannot use the unique btree index on `username`. At the current table size this is fine; if it grows, add a `lower(username)` index in a later migration (not part of this fix).
- **`ApiError` data field**: the exact property that exposes the 403 `data.email` must be confirmed in `omniscan-ui/src/utils/api.ts` during implementation; the design assumes the parsed body is available on the error.
- **Dark rules for HelpPage**: the page background and header need local plain `html.ion-palette-dark` rules because `dark-mode.css` cannot be edited. They are verified visually in the manual pass.

---

# ADDENDUM: Remove the Middle Name Option (Sign Up and Edit Profile)

> This addendum is an addition. Everything above (help FAQ, username login, Properties 1 and 2, Files 1 to 9) is unchanged and not renumbered. This part covers requirements 1.7 to 1.10, 2.14 to 2.21 and 3.12 to 3.17 of `bugfix.md`.

## Addendum Overview

Middle name exists only as a UI feature. There is no `middle_name` column in `prisma/schema.prisma`, and no endpoint or test reads or writes one. The User model stores `name`, `first_name` and `last_name`. Today the UI folds the middle part into `first_name` ("First Middle"), and Edit Profile splits it back on the first space.

The fix removes the middle name link, input, state and styles from `RegisterPage.vue` and `ProfilePage.vue`. Sign up sends the trimmed First name field. Edit Profile shows the whole stored `first_name` in First Name (no split) and sends it back trimmed. There is no migration, no data rewrite, and no API change.

**Decision on the open point**: an existing multi-word `first_name` (for example "Juan Santos") is shown whole in First Name (rule 2.17). It is not moved to Last Name, not truncated, and not rewritten unless the user edits and saves it.

**Conflict check with the existing plan**: the existing plan (Files 1 to 9 above) edits `LoginPage.vue`, `authStore.ts`, `WelcomePage.vue`, `SettingsPage.vue`, `HelpPage.vue`, `faqContent.ts`, `router/index.ts` and `login.post.ts`. It does not edit `RegisterPage.vue` or `ProfilePage.vue`. File 9 says the snapshot needs no update for that plan; the snapshot is updated here only for the one `RegisterPage.vue` line. The two plans touch disjoint files, so there is no conflict. `authStore.register` is not touched by either plan (its signature stays `register(firstName, lastName, username, email, password, gender, birthday)`).

## Addendum Glossary

- **Middle name UI**: In `RegisterPage.vue`, the `middleName` ref, `showMiddleName` ref, the `.add-middle-link` button, and the `v-if="showMiddleName"` input. In `ProfilePage.vue`, `form.middleName`, `initialForm.middleName`, `showMiddleName`, the same link/input markup, and the split in `startEditing`.
- **Folded name**: A stored `first_name` that contains a middle part separated by a space, for example "Juan Santos".
- **startEditing**: Function in `ProfilePage.vue` that fills `form` and `initialForm` when Edit Profile opens.
- **hasUnsavedChanges**: Computed in `ProfilePage.vue` that compares `form` with `initialForm`.
- **ui-preservation snapshot**: `nitro-app/server/tests/fixtures/ui-preservation-snapshot.json`, checked by `ui-preservation.test.ts`.

## Addendum Bug Details

### Extended Bug Condition

The bug (as a defect to remove) shows whenever the sign-up step 1 screen or the Edit Profile form offers a middle name, or builds or splits `first_name` around one.

**Formal Specification (addendum, extends `isBugCondition` above; the earlier definition is not changed):**
```
FUNCTION isBugConditionMiddleName(X)
  INPUT: X of type SignUpStep1 | EditProfileForm | EditProfileOpen | SignUpSubmit | EditProfileSave
  OUTPUT: boolean

  IF X.screen IN {SignUpStep1, EditProfile} THEN
    RETURN X.showsMiddleNameLinkOrInput = true                              // 1.7, 1.9
  IF X is SignUpSubmit THEN
    RETURN X.requestBody.first_name = join(firstName, middleName)           // 1.8
           AND trim(middleName) IS NOT empty
  IF X is EditProfileOpen THEN
    RETURN wordCount(stored.first_name) > 1                                 // 1.9, split on space
  IF X is EditProfileSave THEN
    RETURN X.requestBody.first_name = join(firstName, middleName)           // 1.10
END FUNCTION
```

The combined condition for the whole spec is `isBugCondition(X) OR isBugConditionMiddleName(X)`. Each is evaluated on its own input types, so they never overlap.

### Examples

- Sign-up step 1 today: a "+ Add middle name (optional)" link under the name row. Clicking it shows a "Middle name" input (`maxlength="21"`). Expected: no link, no input.
- Sign-up submit today with First "Juan", Middle "Santos": `authStore.register("Juan Santos", "Cruz", ...)`. Expected: the Middle field does not exist; `register(firstName.value.trim(), lastName.value.trim(), ...)`.
- Edit Profile open today with stored `first_name = "Juan Santos"`, `last_name = "Cruz"`: First Name "Juan", Middle "Santos" (link pre-opened). Expected: First Name "Juan Santos", Last Name "Cruz", no middle field.
- Edit Profile save today: `first_name = "Juan Santos"` (joined), `name = "Juan Santos Cruz"`. Expected after the fix: `first_name = form.firstName.trim()`, `last_name = form.lastName.trim()`, `name = "<first> <last>"`.
- Edge: stored `first_name = "Maria Cristina Santos"` (20 chars, over `maxlength="16"`). Expected: shown whole and not truncated on open or save while untouched. Browsers do not apply `maxlength` to values set from script, and the server has no length check on `first_name` (`users/index.put.ts` only checks it is a string and trims).
- Edge: `first_name` empty, `name = "Juan Cruz"`: First Name falls back to `name` as today (rule 2.17), unsplit.
- Edge: Google sign up. Prefill sets First and Last from Google. It already never sent a middle part. Expected: unchanged.

## Addendum Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- First name and Last name validation on sign up: both required, First `maxlength="16"`, Last `maxlength="25"`, same `input-error` highlighting, same `fieldErrors` flow (3.12).
- Server `POST /api/auth/register` still requires both names and builds `name` as "first last". `PUT /api/users` still recomputes `name` from `first_name` and `last_name`.
- Username (with availability check), gender, birthday, email, password rules, Terms flow and step 2 preferences, on both pages (3.13).
- Google sign-up prefill of First and Last names, with the email locked (3.14).
- Admin user list and `AdminManageUserProfile.vue` (3.15). No admin file or endpoint is touched.
- Stored `name`, `first_name`, `last_name` returned and displayed unchanged everywhere outside the Edit Profile form: Profile view, Settings, greetings (3.16).
- Unsaved-changes detection for every other tracked field (3.17 and 2.19).
- `authStore.register` and `ApiError` handling, the `.name-row` grid rules, `.form-group`, `.input-label`, and every other style rule.

**Scope:**
All inputs that do NOT involve the middle name UI, the join of first and middle name, or the split of `first_name` are unaffected. This includes:
- The Last Name field and every non-name field.
- Google sign up and Google sign in.
- Login (the earlier part of this spec) and the admin portal.
- Reading names in any view other than the Edit Profile form.

## Addendum Hypothesized Root Cause

Confirmed by reading the code:

1. **Middle name is a UI-only feature in two views.**
   - `RegisterPage.vue`: `middleName` ref (line ~685), `showMiddleName` ref (~696), the `.add-middle-link` button and the conditional input in step 1 (lines ~74 to 80), the join in `handleRegister` (`[firstName.value.trim(), middleName.value.trim()].filter(Boolean).join(' ')`, ~1075), the reset `middleName.value = ''` in the success clean-up (~1131), and a light rule `.add-middle-link { ... }` (~1490).
   - `ProfilePage.vue`: `showMiddleName` (~494), `form.middleName` and `initialForm.middleName` (~648, ~661), the comparison in `hasUnsavedChanges` (~676), the split in `startEditing` (~712 to 718, plus `initialForm.middleName = form.middleName` ~732), the link and input in the template (~145 to 157), the join in the save body (`first_name` ~863 and `name` ~865), resets after save (~880) and on discard (~946), the light rule (~1513) and the nested dark rule inside `:global(html.ion-palette-dark) :global(body.dark) { ... }` (~1538).
2. **Folding into `first_name` forces a split on read.** Because the server has no middle column, the only way to show a middle part again is to split `first_name` on a space. That is the logic that must go, and the whole stored string must then be shown as First Name.
3. **Snapshot coupling.** `ui-preservation.test.ts` requires every original light rule in `views/RegisterPage.vue` to still exist. The `.add-middle-link` rule is one of them (snapshot line 379), so deleting it from the view without updating the snapshot fails the test. `ProfilePage.vue` is not in the snapshot (searched), so its rules can be removed freely.
4. **No other consumers.** Per `bugfix.md`, no test and no endpoint references middle name; the only match under `nitro-app/server/tests` is the snapshot line.

## Addendum Correctness Properties

These properties are added to the two above. Properties 1 and 2 are unchanged.

Property 3: Bug Condition - No middle name option; first name sent and shown whole

_For any_ input where the middle name bug condition holds (`isBugConditionMiddleName` returns true), the fixed `RegisterPage.vue` and `ProfilePage.vue` SHALL show no middle name link or input on sign-up step 1 or in Edit Profile; SHALL send sign-up `first_name` as `firstName.value.trim()` and `last_name` as `lastName.value.trim()`; SHALL send Edit Profile `first_name` as `form.firstName.trim()`, `last_name` as `form.lastName.trim()` and `name` as first and last joined by one space; and SHALL, when Edit Profile opens for a stored multi-word `first_name`, show that whole value in First Name and the stored `last_name` in Last Name without splitting or truncating it (falling back to `name` only when `first_name` is empty).

**Validates: Requirements 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21**

Property 4: Preservation - Names, validation, Google prefill, admin list and unsaved-changes detection

_For any_ input where the middle name bug condition does NOT hold (Last Name handling, validation of First and Last name, username, gender, birthday, email, password, Terms, step 2, Google prefill, admin list, and reading names outside the Edit Profile form), the fixed code SHALL produce the same result as the original code, preserving: stored `name`, `first_name` and `last_name` returned and displayed unchanged; the same required-field validation and `maxlength` values; Google prefill with locked email; the admin user list; and unsaved-changes detection, which SHALL report no change for an untouched form and a change for any edited tracked field (`firstName`, `lastName`, `username`, `gender`, `birthday`, `halalPref`, `customPreferences`, `avatarBase64`, or a typed password).

**Validates: Requirements 3.12, 3.13, 3.14, 3.15, 3.16, 3.17**

## Addendum Fix Implementation

### Changes Required

All edits are deletions or one-line simplifications. No function, route or API field is renamed. `dark-mode.css` is not edited. No `:global(html.ion-palette-dark) .x` selector is written; the one existing nested dark block in `ProfilePage.vue` only loses one entry.

**File 10**: `omniscan-ui/src/views/RegisterPage.vue`

1. **Template (step 1)**: delete the `<button type="button" class="add-middle-link" ...>` element (lines ~74 to 77) and the `<div v-if="showMiddleName" class="form-group">` block with the Middle name input (~77 to 80). The `.name-row` with First name and Last name stays as is. The Google path shares the same step 1 markup, so it loses the link as well (2.14).
2. **Script, state**: delete `const middleName = ref('')` and `const showMiddleName = ref(false)`.
3. **Script, submit**: in `handleRegister`, replace `[firstName.value.trim(), middleName.value.trim()].filter(Boolean).join(' ')` with `firstName.value.trim()` in the `authStore.register(...)` call (2.15). The other arguments are unchanged.
4. **Script, reset**: delete `middleName.value = ''` from the form clean-up after success. No other reset references it (verified with a search for `middleName|showMiddleName`).
5. **Style**: delete the single line `.add-middle-link { ... }` from `<style scoped>`. The neighbouring `.name-row` line is kept, with its existing formatting.
6. Google prefill (`firstName.value = payload.firstName`, `pending.firstName`) is not touched.

**File 11**: `omniscan-ui/src/views/ProfilePage.vue`

1. **Template**: delete the `add-middle-link` button inside the First Name `form-group` (~145 to 148) and the `<div v-if="showMiddleName" class="form-group">` block with the Middle name input (~154 to 157). The First Name input keeps `maxlength="16"` (2.17). The `.name-row` grid and Last Name group stay.
2. **State**: delete `const showMiddleName = ref(false)`, `middleName: ''` from `form`, and `middleName: ''` from `initialForm`.
3. **`startEditing`**: replace the split with
   ```
   // Show the stored first_name whole. Older accounts may hold "First Middle" here; it is kept, not split.
   form.firstName = (user.value.first_name || user.value.name || '').trim()
   form.lastName = (user.value.last_name || '').trim()
   ```
   Delete `form.middleName = ...`, `showMiddleName.value = ...` and `initialForm.middleName = form.middleName`. `initialForm.firstName = form.firstName` stays, so an untouched form reports no changes (2.19). The `name` fallback when `first_name` is empty is kept (2.17). Fix the stale comment above it.
4. **`hasUnsavedChanges`**: delete the `form.middleName !== initialForm.middleName ||` line only.
5. **Save body**: change to `first_name: form.firstName.trim()`, keep `last_name: form.lastName.trim()`, and set `name: [form.firstName, form.lastName].map((s) => s.trim()).filter(Boolean).join(' ')` (2.18). The server recomputes `name` anyway, so both stay consistent. No other body field changes.
6. **Resets**: delete `showMiddleName.value = false` after save and in the discard path of the leave guard. `resetPasswordFields()` and `isEditing.value = false` stay.
7. **Styles**: delete the `.add-middle-link { ... }` light line and the `.add-middle-link { color: #94a3b8; }` entry inside the existing `:global(html.ion-palette-dark) :global(body.dark) { ... }` block (2.20). The `.input-label` entry in that block stays, so the block is not removed or rewritten.
8. The avatar initial (`form.firstName || form.lastName`) is unaffected.

**File 12**: `nitro-app/server/tests/fixtures/ui-preservation-snapshot.json` (deliberate update)

1. In `lightRules["views/RegisterPage.vue"]`, delete exactly one line (line 379 at time of reading):
   `   ".add-middle-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #05c450; font-size: 0.82rem; font-weight: 600; cursor: pointer; padding: 0; margin: 4px 0 14px; }",`
   Neighbouring lines (`.name-row ...` before and `.pass-criteria-grid ...` after) both end with a comma and stay, so the JSON remains valid with no trailing comma issue.
2. Keep the file's formatting: 1-space indentation for the array entries (as in the file today), LF/CRLF line endings as found, no reformat, no re-sort, no regeneration of the snapshot. Do the edit as a single-line removal and confirm with `git diff` that exactly one line is deleted and nothing else changed (the `darkModeCssSha256` value, `darkRules` and every other `lightRules` entry stay byte-identical).
3. `darkRules["views/RegisterPage.vue"]` has no `.add-middle-link` entry (the search found only the light line), so nothing else changes. `views/ProfilePage.vue` is absent from the snapshot, so no change there.

**File 13 (tests)**: see Addendum Testing Strategy.

### Existing tests checked

- `ui-preservation.test.ts`: the light-rule check fails for `views/RegisterPage.vue` until File 12 is applied, which is why the snapshot edit and the view edit must land together. The dark-rule check and the `dark-mode.css` sha256 check are unaffected.
- No test references `middleName`, `first_name` joins or `showMiddleName` (3.17). The account-lifecycle and login tests do not render these views.
- Server endpoints and Prisma schema: untouched, so server tests are unaffected.

## Addendum Testing Strategy

### Exploratory Bug Condition Checking

**Goal**: Show the middle name UI and the join/split on the unfixed code.

**Test Plan**: Add `nitro-app/server/tests/middle-name-removal.bug.test.ts`, which reads the two views as text, like `ui-preservation.test.ts`. Run it on UNFIXED code.

**Test Cases**:
1. **Register markup**: `RegisterPage.vue` contains no `add-middle-link`, `showMiddleName` or `middleName` (will fail on unfixed code).
2. **Register submit**: the `authStore.register(` call's first argument is exactly `firstName.value.trim()` (will fail: it joins the middle name).
3. **Profile markup and state**: `ProfilePage.vue` contains no `add-middle-link`, `showMiddleName` or `middleName` (will fail).
4. **Profile open**: the `startEditing` body has no `.split(` on the first name and assigns `form.firstName` from `user.value.first_name || user.value.name` (will fail: it splits).
5. **Profile save**: the PUT body has `first_name: form.firstName.trim()` (will fail: it joins).
6. **Edge, long folded name**: nothing in `startEditing` or the save body slices or truncates the value, for example no `slice(`, `substring(` or `substr(` on `firstName` (passes before and after; guards 2.17).

**Expected Counterexamples**:
- The text `[firstName.value.trim(), middleName.value.trim()].filter(Boolean).join(' ')` in `RegisterPage.vue`, and `firstParts.slice(1).join(' ')` in `ProfilePage.vue`.
- Possible causes: middle part folded into `first_name` on write and split back on read.

### Fix Checking

**Goal**: For all inputs where the middle name bug condition holds, the fixed code gives the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugConditionMiddleName(X) DO
  result := fixed(X)
  ASSERT expectedMiddleName(result)
END FOR

FUNCTION expectedMiddleName(result)
  RETURN result.hasNoMiddleNameLinkOrInput
     AND (result.signUpFirstName = trim(firstNameField))
     AND (result.profileFirstName = trim(firstNameField))
     AND (result.openedFirstName = stored.first_name || stored.name)   // whole, no split, no truncation
     AND (result.openedLastName = stored.last_name)
END FUNCTION
```

For the open and save logic, extract nothing new into production code. In the test, evaluate the same expressions with a small local helper that mirrors the one-line assignments, and pair it with the source-level checks above.

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, fixed and original behave the same.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugConditionMiddleName(X) DO
  ASSERT original(X) = fixed(X)
END FOR
```

**Testing Approach**: Property-based testing (fast-check, already used in the account-lifecycle tests) for the name expressions, and source-level checks for markup, because those cover many name strings automatically.

**Test Plan**: Observe on UNFIXED code, then assert after the fix.

**Test Cases**:
1. **Single-word names**: for random single-word `first_name` and `last_name`, the old `startEditing` split gives the same First and Last as the new assignment, and the old save join gives the same `first_name` and `name` as the new one (empty middle).
2. **Unsaved-changes detection**: the `hasUnsavedChanges` source still compares `firstName`, `lastName`, `username`, `gender`, `birthday`, `halalPref`, `customPreferences`, `avatarBase64` and `passwordTyped`, and no longer `middleName`. For random field edits, a model of the computed reports changed iff a tracked field differs.
3. **Validation intact**: `RegisterPage.vue` still has `maxlength="16"` on First name and `maxlength="25"` on Last name, `fieldErrors.firstName`/`lastName`, and the `!firstName.value.trim()` / `!lastName.value.trim()` checks. `ProfilePage.vue` still has `maxlength="16"` on First Name and `maxlength="25"` on Last Name.
4. **Google prefill**: `RegisterPage.vue` still assigns `firstName.value = payload.firstName`, `pending.firstName` and the matching last-name lines.
5. **Admin and API untouched**: `AdminManageUserProfile.vue`, `register.post.ts`, `google/register.post.ts`, `users/index.put.ts` and `prisma/schema.prisma` are not in the diff (check with `git diff --stat`).
6. **Snapshot diff**: `git diff` of `ui-preservation-snapshot.json` shows exactly one deleted line (`.add-middle-link` in `views/RegisterPage.vue` lightRules) and no added lines. `ui-preservation.test.ts` passes with the updated snapshot, and `dark-mode.css` keeps its sha256.
7. **Style rules**: in `RegisterPage.vue` every remaining snapshot light rule still exists; in `ProfilePage.vue` the `.input-label` entry inside the nested dark block and `.name-row` remain, and no `:global(html.ion-palette-dark) .` selector is introduced.

### Unit Tests

- Source checks listed under Exploratory and Preservation.
- Name expression helper: `trim`, empty `first_name` falling back to `name`, multi-word `first_name` kept whole, 20-character `first_name` not truncated, whitespace-only parts yielding an empty string.
- Save `name` builder: "First Last" joined by one space, and no leading or trailing space when one part is empty.

### Property-Based Tests

- For random strings (letters and spaces, length 0 to 40) as stored `first_name`, the open assignment returns the trimmed string unchanged (no split, no truncation).
- For random `first_name`/`last_name` pairs, the save body satisfies `first_name = trim(first)`, `last_name = trim(last)`, `name = join(nonEmpty(trim(first), trim(last)))`.
- For random single-word names, old and new code agree (preservation).

### Integration Tests

- Manual UI pass (cannot be automated here): sign-up step 1 in light and dark, email and Google paths, shows only First and Last name; submit succeeds and the account shows "First Last". Edit Profile for an account with a folded name ("Juan Santos") shows it whole in First Name; save without editing keeps the stored value; editing and saving works; Cancel with no change does not prompt, Cancel after an edit prompts; layout of the `.name-row` looks right now that the link is gone.
- Final checks: nitro-app `npx vitest run` (19 existing files, 171 tests, plus the new ones) with the updated snapshot; `vue-tsc` reports only the 6 known errors in `src/utils/appBadge.ts` and `src/utils/reminderScheduler.ts` (removing the refs must leave no dangling references).

## Addendum Risks and Open Points

- **Folded names stay visible.** Existing users with a stored middle part see it inside First Name (rule 2.17). It is not hidden, moved or migrated. Switching to another rule later (for example moving the middle part into Last Name) would be a separate change.
- **Longer than 16 characters.** A pre-filled First Name over `maxlength="16"` is kept. When the user edits it, the browser blocks typing more characters while the value is over the limit, but allows deleting. The server has no length check on `first_name`, so saving an untouched long value succeeds.
- **Snapshot edit is deliberate.** It must be a one-line deletion in the same change as the `RegisterPage.vue` edit; otherwise `ui-preservation.test.ts` fails for `views/RegisterPage.vue`. Regenerating the snapshot would hide accidental style loss, so it is not done.
- **No database change.** No column, migration or data rewrite is involved (2.21). If a `middle_name` column is expected somewhere, that is a different change.
