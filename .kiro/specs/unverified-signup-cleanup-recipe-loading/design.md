# Unverified Signup, Cleanup and Recipe Loading Bugfix Design

## Overview

Four defects, one spec. Findings from the code:

- `nitro-app/server/api/auth/register.post.ts` creates the user with `username` set while `email_verified: false`. `User.username` is `String? @unique`, so the unverified row blocks the name in `register.post.ts`, `google/register.post.ts` and `check-username.post.ts`.
- Nothing deletes unverified users. The only account lifecycle is `server/api/cron/cleanup-archived.get.ts`, run by the Vercel cron in `vercel.json` (not the Nitro `scheduledTasks`, which only lists the notification tasks).
- For Google, `google/callback.get.ts` (web redirect flow) and `google/verify.post.ts` (native ID-token flow) both log an existing user in. Neither knows whether the user came from the Login or the Register page. `RegisterPage.vue` uses the same endpoints as Login.
- `RecipeSuggestions.vue` and `HomePage.vue` set `makingId` in `makeRecipe()` but never read it in the template. The modal (`RecipeDetailModal.vue`) closes before the confirm alert, so nothing shows while `/api/recipes/make` runs.

**Schema change: not needed.** `username` is already nullable, so an unverified registration stores `username = null`. The pending username travels inside the verification token, which is already stored in `verification_token` (`String? @unique`, no length limit). No migration is required. (Rejected alternative: an additive nullable `pending_username` column. It is cleaner but needs a manual migration, so it is only the fallback if the signed-token approach is rejected in review.)

## Glossary

- **Bug_Condition (C)**: Any of the four trigger conditions in `isBugCondition` below.
- **Property (P)**: The corrected behavior for each trigger.
- **Preservation**: Verification, registration, Google login, lifecycle cron and recipe-make behavior that must not change.
- **Pending username**: The username a user typed at registration, carried in the signed verification token and only written to `User.username` on verification.
- **Verification token**: Now a signed JWT (`{ t: 'verify', u: <username>, n: <nonce> }`, signed with `JWT_SECRET`, no `exp` claim; expiry stays in `verification_token_expires_at`). Falls back to a plain random token if `JWT_SECRET` is unset, in which case no pending username is carried.
- **UNVERIFIED_ACCOUNT_RETENTION_DAYS**: Named constant, 7.
- **Sign-up intent**: A Google request that originates from the Register page.
- **register.post / verify.post / callback.get**: Files under `nitro-app/server/api/auth/`.

## Bug Details

### Bug Condition

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { kind, ... }
  OUTPUT: boolean

  CASE input.kind OF
    'register':      // defects 1.1, 1.2
      RETURN input.emailUnverified AND userRowStoresUsername(input)
    'cleanup':       // defect 1.3
      RETURN input.user.email_verified = false
             AND input.user.oauth_provider = null
             AND age(input.user.created_at) > UNVERIFIED_ACCOUNT_RETENTION_DAYS days
             AND userStillExists(input.user)
    'disclaimer':    // defect 1.4
      RETURN input.screen IN ['RegisterPage step 1', 'CheckEmailPage', 'verification email']
             AND NOT showsRetentionNotice(input.screen)
    'googleSignup':  // defect 1.5
      RETURN input.intent = 'register'
             AND existsUserWithEmail(input.googleEmail)
             AND (sessionIssued(input) OR redirectedHome(input))
    'makeRecipe':    // defect 1.6
      RETURN input.makeConfirmed AND requestInFlight(input) AND NOT loadingIndicatorShown(input)
  END CASE
END FUNCTION
```

### Examples

- Register `zarrin_1` / `a@gmail.com`, never verify: today `zarrin_1` is taken. Expected: `check-username` says available and `b@gmail.com` can register `zarrin_1`.
- Both `a@` and `b@` registered `zarrin_1`; `b@` verifies first: `b@` gets `zarrin_1`; when `a@` verifies, their account is verified with `username = null` (no error), editable in Edit Profile.
- User created 8 days ago, unverified, no Google link: deleted by cron. Created 6 days ago: kept. Verified 30 days ago: kept. Google user (`oauth_provider = 'google'`): kept.
- Register page, "Sign up with Google" with an existing Google email: today lands on Home. Expected: stays on `/register`, toast "Account already exist", no token stored.
- Login page, "Sign in with Google" with the same email: still signs in and goes Home.
- Tap "Make Recipe" then Continue in the alert: today nothing visible during the request. Expected: spinner overlay and disabled button until done.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Verification link flow (`verify/[token].get.ts`): verified flag, token cleared, welcome email, fresh JWT.
- Registration order: send email first, then create user and `dietaryProfile` in one transaction; resend and cooldown paths.
- Taken-username rejection for verified accounts.
- `cleanup-archived.get.ts` pantry cleanup, 180-day archive, delete-after-archive and their emails.
- Google sign-in (login intent) for existing users, ARCHIVED restore, and new-user pending-token flow.
- Email-login 403 for unverified accounts.
- Make-recipe request, toast, list updates, alert and allergen warning.

**Scope:** Everything that is not a register submit with a username, an unverified-account age check, the three disclaimer surfaces, a Google sign-up request for an existing email, or the make-recipe in-flight window is unaffected. `dark-mode.css`, `termsContent.ts`, `faqContent.ts` are not edited. Style edits are additive (`ui-preservation-snapshot.json` guards Register/Login).

**Known accepted side effect:** Login by username for an unverified account no longer finds the row (username is null), so it returns the generic 401 instead of the 403 resend hint. Login by email still returns 403.

## Hypothesized Root Cause

1. **Username written at insert**: `register.post.ts` passes `username: normalizedUsername` to `tx.user.create`, and the uniqueness checks cannot distinguish verified from unverified owners.
2. **No lifecycle for unverified rows**: `cleanup-archived.get.ts` only selects `status: 'ARCHIVED'` and `ACTIVE` by `last_active`; unverified users are `ACTIVE` with fresh `last_active`, so they never match.
3. **No intent on Google endpoints**: `callback.get.ts` and `verify.post.ts` treat any existing email as a login. `index.get.ts` only forwards `state` for `mobile`. `google/register.post.ts` returns 400 (not 409) for an existing email.
4. **Unused loading state**: `makingId` is set but never bound in the templates, and the modal closes before the request starts, so the button cannot host the spinner.

## Correctness Properties

Property 1: Bug Condition - Unverified signup, cleanup, disclaimer, Google duplicate signup and recipe loading

_For any_ input where the bug condition holds (isBugCondition returns true), the fixed code SHALL: (a) store `username = null` on unverified registration and write the pending username only on verification, treating pending names as available; (b) select and delete exactly the unverified, non-Google users older than 7 days (never verified, Google-linked or younger accounts); (c) show the 7-day disclaimer text on Register step 1, Check Email and in the verification email; (d) for Google sign-up intent with an existing email, respond 409 `Account already exist` (or redirect with `oauth_error=account_exists`), issue no token, and show the toast on the Register page; (e) show a spinner on the disabled Make Recipe button plus a page loading overlay from confirm until the request settles, reset on error.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Existing auth, lifecycle and recipe behavior

_For any_ input where the bug condition does NOT hold (isBugCondition returns false), the fixed code SHALL produce the same result as the original code, preserving verification, registration/resend rules, taken-username rejection for verified accounts, the existing lifecycle cron, Google login for existing users, new-Google-user registration, email-login 403, and the make-recipe success path.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

All nitro-app imports use explicit relative paths (`nitro.config` has `imports: false`). No renames.

**1. Pending username and token (new `nitro-app/server/lib/verification-token.ts`)**
- `createVerificationToken(username?: string): string` returns the signed JWT described in the Glossary; random base64url fallback when `JWT_SECRET` is missing or no username.
- `readPendingUsername(token: string | null | undefined): string | null` returns `u` from a valid signed `verify` token, else `null`. Never trusts unsigned input.
- `generateVerificationToken` in `email.ts` stays as is (existing tests mock it).

**2. `register.post.ts`**
- Keep format validation. Keep the "taken" check (now only verified owners can hold a username).
- Use `createVerificationToken(normalizedUsername)` and create the user with `username: null`.
- In the existing-unverified branch: check the typed username is not held by a verified user (400 if so), then store a fresh token carrying the username.

**3. `resend-verification.post.ts`**
- Select `verification_token`, read the pending username from it with `readPendingUsername`, and mint the new token with it so the pending name survives resends.

**4. `verify/[token].get.ts`**
- After the expiry check, compute `pending = readPendingUsername(token)`. If `pending` and no row holds it (`findFirst` where `username = pending`), include `username: pending` in the verification update. Catch Prisma `P2002` on that update and retry without `username`. Add `usernameTaken: true` to the response in that case (additive; frontend may ignore it).
- Already-verified path unchanged.

**5. Cleanup (new `nitro-app/server/lib/unverified-cleanup.ts` + new `nitro-app/server/api/cron/cleanup-unverified.get.ts` + `vercel.json`)**
- `export const UNVERIFIED_ACCOUNT_RETENTION_DAYS = 7`.
- Pure `selectUnverifiedAccountsForDeletion(users, now = new Date())` returns users where `email_verified === false`, `oauth_provider == null`, and `created_at < now - 7 days`. Also excludes `deleted_at`-style flags only if present on the input type; it never receives admins (separate table).
- The endpoint uses the same `CRON_SECRET` bearer check as `cleanup-archived.get.ts`, queries candidate users with the same filter in `where` (so the DB does the filtering) and re-applies the pure function, then deletes in one `$transaction` in the same child-first order as `cleanup-archived.get.ts` (`activityLog`, `notification`, `dietaryProfile`, `pantryItem`, `recipeInteraction`, `flaggedScan` via scan ids, `scan`, then `user`). No email is sent (the user never verified).
- `vercel.json` gets one more cron entry `{ "path": "/api/cron/cleanup-unverified", "schedule": "0 8 * * *" }`. Chosen over adding a section to `cleanup-archived.get.ts` so the existing account-lifecycle tests, whose Prisma mocks are shaped around that file, are not disturbed. It uses the same cron mechanism.

**6. Google sign-up intent (nitro-app)**
- New `nitro-app/server/lib/google-intent.ts`: `parseGoogleState(state)` returns `{ mobile: boolean, intent: 'register' | 'login' }` from a state string (`mobile`, `register`, `mobile:register`, empty). `ACCOUNT_EXISTS_MESSAGE = 'Account already exist'`.
- `google/index.get.ts`: forward `state` as today (value now may include `register`).
- `google/callback.get.ts`: when the user exists and intent is `register`, return `sendRedirect(`${FRONTEND}/register?oauth_error=account_exists`)` before any DB update or token. Mobile detection keeps working via `parseGoogleState`. Login behavior unchanged.
- `google/verify.post.ts`: accept optional body `intent: 'register'`. If the user exists, throw `createError({ statusCode: 409, statusMessage: 'Account already exist' })` before linking, avatar import, restore or token creation.
- `google/register.post.ts`: existing-email case becomes `409 Account already exist` (was 400). Existing-Google-ID case also 409.
- Add `FRONTEND_URL`-based register URL helper to `oauth.ts` additively (`OAUTH_FRONTEND_REGISTER`); do not change existing exports.

**7. Frontend: Register and Check Email (omniscan-ui)**
- `RegisterPage.vue` (additive): a `<p class="verify-disclaimer">Verify your email within 7 days or your account will be automatically deleted.</p>` under the email field on step 1 for the password flow (not shown for `isGooglePending`), with scoped styles `.verify-disclaimer` and `html.ion-palette-dark .verify-disclaimer` using `#94a3b8` on navy. Never `:global(html.ion-palette-dark)`.
- `RegisterPage.vue` native handler: send `intent: 'register'` in the `/api/auth/google/verify` body; in the `catch`, if `error.status === 409` (ApiError) show `showToast('Account already exist', 'danger')`, call `authStore.clearPendingGoogleData()`, set `isGooglePending = false`, do not navigate. Web handler: open `${API_BASE_URL}/api/auth/google?state=register` (native Capacitor browser case keeps `mobile:register` if applicable). In `onMounted`, when `route.query.oauth_error === 'account_exists'`, show the same toast and `router.replace({ path: '/register', query: {} })`; this runs before `redirectIfAlreadyAuthenticated`.
- `CheckEmailPage.vue`: add the same disclaimer line in the default "Check Your Email" state (above or inside `.tips-box`, plus one list item) with matching additive styles.
- Do not edit `termsContent.ts`, `faqContent.ts`, or `dark-mode.css`.

**8. Verification email (`nitro-app/server/utils/email.ts`)**
- In `buildVerificationEmailHtml` footer, add: `Verify your email within 7 days or your account will be automatically deleted.` next to the existing "This link expires in 24 hours" line. Other templates untouched.

**9. Recipe loading (omniscan-ui)**
- `RecipeDetailModal.vue`: new optional prop `making?: boolean`. Button gets `:disabled="making"`, shows `<ion-spinner name="crescent" />` instead of the icon/label while `making`, and `@click` ignores while `making`.
- `RecipeSuggestions.vue` and `HomePage.vue`: bind `:making="makingId === selectedRecipe?.id"` on the modal; add `<ion-loading :is-open="makingId !== null" message="Making recipe..." />` (import `IonLoading`); guard the alert confirm handler and `makeRecipe()` with `if (makingId.value !== null) return`. `finally` already resets `makingId`; keep it. Error path keeps the existing error message.

## Testing Strategy

### Validation Approach

Surface counterexamples on unfixed code first, then verify the fix and preservation. Run vitest only from the uppercase drive path, never in parallel with vue-tsc: `cmd /c "cd /d C:\Users\Zarrin\Desktop\Projects\nitro-app && npx.cmd vitest run > out.txt 2>&1"`, read `out.txt`, delete it. Type check: `cmd /c "cd /d C:\Users\Zarrin\Desktop\Projects\omniscan-ui && node node_modules/vue-tsc/bin/vue-tsc.js --noEmit > tsc.txt 2>&1"` (6 known errors: appBadge.ts x2, reminderScheduler.ts x4). Baseline: 29 files / 307 tests passing.

### Exploratory Bug Condition Checking

**Goal**: Show each defect before the fix.

**Test Plan**: Tests live in `nitro-app/server/tests/`. Handler tests use the repo's existing `vi.mock` + in-memory Prisma style (see `password-max-length.test.ts`, `account-lifecycle.bug.test.ts`). Source-level tests read `omniscan-ui/src/...` through `resolve(__dirname, '../../../omniscan-ui/src/...')` as in `login-identifier.bug.test.ts`.

**Test Cases**:
1. **Username reserved**: register with username X, assert created row has `username === null` (fails on unfixed code).
2. **Cleanup selection**: import `selectUnverifiedAccountsForDeletion` (module missing on unfixed code, so fails) and assert only unverified, non-Google, older than 7 days are returned.
3. **Google duplicate**: call `google/verify.post` with `intent: 'register'` for an existing email; assert 409 and no `session_token` update (fails: returns a token).
4. **Disclaimer text**: source contains the exact sentence in `RegisterPage.vue`, `CheckEmailPage.vue`, `email.ts` (fails).
5. **Make loading**: source of `RecipeSuggestions.vue`, `HomePage.vue` has `ion-loading` bound to `makingId` and modal has `making` prop with spinner (fails).

**Expected Counterexamples**: row saved with username; no module/endpoint for unverified cleanup; token issued for duplicate Google signup; missing text; `makingId` unused in templates.

### Fix Checking

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixed(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT original(input) = fixed(input)
END FOR
```

**Testing Approach**: Property-based (fast-check, already used in the repo) for selection and token logic; the existing 307 tests act as the regression baseline.

**Test Cases**:
1. **Verified/Google/young users never selected** (property over random users and ages).
2. **Verified username still taken**: `check-username` and register reject a username held by a verified user.
3. **Google login intent**: existing user without `intent` still gets a token (verify.post and callback).
4. **New Google user**: still gets `requiresRegistration` and pending token.
5. **Verification flow**: link verifies, returns token, welcome email, same as before.
6. **Existing lifecycle tests** (`account-lifecycle.*`) untouched and green.

### Unit Tests

- `verification-token`: round-trip username, tampered token gives null, no-secret fallback gives null, token uniqueness.
- `selectUnverifiedAccountsForDeletion`: boundary at exactly 7 days (not deleted), 7 days + 1 ms (deleted), null `oauth_provider` only.
- `parseGoogleState`: `''`, `mobile`, `register`, `mobile:register`, unknown strings.
- Verify handler: pending username applied; taken pending username leaves null and still verifies (`P2002` retry).
- Register handler: username null on create; existing-unverified branch carries new username; verified owner rejects.

### Property-Based Tests

- For random users (verified flag, provider, age 0-30 days), selection equals the spec predicate exactly.
- For random usernames in the valid charset, `readPendingUsername(createVerificationToken(u)) === u`.
- For random Google states, `intent` is `register` iff the state contains `register`.

### Integration Tests

- Cleanup endpoint with an in-memory Prisma mock: deletes children then users only for selected ids; honors `CRON_SECRET`; sends no email.
- `google/callback.get` with a mocked Google fetch and `state=register` for an existing email redirects to `/register?oauth_error=account_exists` with no `oauth_token`.
- Source-level: Register page contains the disclaimer, the 409 toast text `Account already exist`, `intent: 'register'`; Check Email contains the disclaimer; `vercel.json` lists `/api/cron/cleanup-unverified`; RecipeDetailModal has the `making` prop and spinner; both recipe pages bind `ion-loading` to `makingId`.
