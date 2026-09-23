# OmniScan Email Validation & Setup State Bugfix Design

## Overview

Three interconnected defects exist in the OmniScan Ionic Vue app. This document formalizes each bug condition, defines the expected correct behavior, hypothesizes root causes, and specifies the precise implementation changes required.

**Bug 1 — Email Not Lowercased (RegisterPage.vue):** The `@input` handler only clears field-error state; no handler or watcher ever calls `.toLowerCase()`. Mixed-case input (e.g. `User@Gmail.COM`) is passed verbatim to `authStore.login()` and `authStore.register()`, meaning a second login attempt with the canonical lowercase form would fail or duplicate the account.

**Bug 2 — Gmail Dots Not Stripped & No Gmail-Specific Validation (RegisterPage.vue):** `handleRegister()` passes `email.value` directly to `authStore.register()` and `authStore.login()` with no local-part dot-stripping. Additionally, the existing `EMAIL_RE` (KNOWN_TLDS allowlist) is the only validation applied to all addresses, including Gmail/Googlemail, even though Gmail has its own structural rules (length 6–30, a-z/0-9/. only, no leading/trailing/consecutive dots, `+tag` sub-addresses must be stripped before length/char checks).

**Bug 3 — Onboarding Completion State Never Persisted (RegisterPage.vue + authStore.ts + HomePage.vue):** `completeSetup()` and `skipForNow()` both navigate to `/tabs/home` without recording completion. `authStore` has no `hasCompletedSetup` field. `HomePage.vue` has no `DietarySetupBanner` component reference. As a result, there is no way for the home screen to know whether to show the onboarding prompt, and a re-registered (post-logout) user would never see a clean fresh state.

The fix strategy is:
1. Add an `@input` normalizer on the email field to lowercase in place.
2. Derive a `normalizedEmail` in `handleRegister()` by stripping dots from the local-part; route Gmail/Googlemail through `GMAIL_RE` before the generic check; submit `normalizedEmail` to the API.
3. Add `SETUP_COMPLETE_KEY`, `hasCompletedSetup`, and `setSetupComplete()` to `authStore`.
4. Call `authStore.setSetupComplete()` in both `completeSetup()` and `skipForNow()` before navigation.
5. Create `DietarySetupBanner.vue` as a dismissable card component.
6. Mount it in `HomePage.vue` behind a `v-if="!authStore.hasCompletedSetup"` guard.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs or states that trigger a defect — defined independently for each of the three bugs below.
- **Property (P)**: The desired behavior that the fixed function must exhibit for all inputs in C.
- **Preservation**: All behaviors for inputs outside C that must remain unchanged by the fix.
- **`normalizedEmail`**: The local-part of the email with all dots stripped and the entire string lowercased; used as the value submitted to the API.
- **`localBase`**: The Gmail local-part after stripping any `+tag` sub-address, used for structural validation.
- **`hasCompletedSetup`**: A reactive boolean in `authStore` that tracks whether the user has completed or explicitly skipped the dietary-preferences onboarding step.
- **`SETUP_COMPLETE_KEY`**: The `localStorage` key `'omniscan_setup_complete'` used to persist setup state across sessions and page refreshes.
- **`handleRegister()`**: The form-submit handler in `RegisterPage.vue` that validates the step-1 form and calls `authStore.register()` + `authStore.login()`.
- **`completeSetup()`**: The step-2 handler that saves dietary preferences via `PUT /api/users` and then navigates to `/tabs/home`.
- **`skipForNow()`**: The step-2 skip handler that bypasses preference-saving and navigates directly to `/tabs/home`.
- **`DietarySetupBanner`**: A new dismissable card component rendered at the top of `HomePage.vue`'s content area when `hasCompletedSetup` is `false`.

---

## Bug Details

### Bug Condition 1 — Email Not Lowercased

The bug manifests when a user types any uppercase character into the email field. The `@input` handler bound to the email input only calls `clearFieldError('email')` and never normalizes case. The value reaches both `authStore.register()` and `authStore.login()` exactly as typed.

**Formal Specification:**
```
FUNCTION isBugCondition_Lowercase(X)
  INPUT: X of type { rawEmail: string }
  OUTPUT: boolean

  RETURN X.rawEmail ≠ X.rawEmail.toLowerCase()
END FUNCTION
```

**Examples:**
- `User@Gmail.COM` → stored and sent as-is; re-login with `user@gmail.com` would fail or create a duplicate.
- `JOHN.DOE@EXAMPLE.COM` → backend receives uppercase; case-sensitive lookup would miss the account.
- `user@example.com` → already lowercase; no bug triggered.

---

### Bug Condition 2 — Gmail Dots Not Stripped and No Gmail-Specific Validation

The bug manifests when a user submits a Gmail or Googlemail address. The function does not strip dots from the local-part before the API call (so `test.user@gmail.com` and `testuser@gmail.com` are treated as distinct accounts), and it does not apply Gmail's structural validation rules (so structurally invalid local-parts are accepted).

**Formal Specification — Dot Stripping:**
```
FUNCTION isBugCondition_GmailDots(X)
  INPUT: X of type { localPart: string, domain: string }
  OUTPUT: boolean

  RETURN (X.domain = 'gmail.com' OR X.domain = 'googlemail.com')
    AND X.localPart.includes('.')
END FUNCTION
```

**Formal Specification — Invalid Gmail Structure:**
```
FUNCTION isBugCondition_GmailStructure(X)
  INPUT: X of type { localPart: string, domain: string }
  OUTPUT: boolean

  LET base ← X.localPart.split('+')[0]   // strip +tag
  RETURN (X.domain = 'gmail.com' OR X.domain = 'googlemail.com')
    AND (
      length(base) < 6
      OR length(base) > 30
      OR base matches /[^a-z0-9.]/
      OR base startsWith '.'
      OR base endsWith '.'
      OR base contains '..'
    )
END FUNCTION
```

**Examples:**
- `test.user@gmail.com` → sent as `test.user@gmail.com`; backend treats it as different from `testuser@gmail.com` (same Gmail inbox).
- `user+tag@gmail.com` with local base `user` (length 4) → passes KNOWN_TLDS check but should fail Gmail length rule.
- `a.b@gmail.com` → local base `ab` (length 2) → too short for Gmail; should be rejected.
- `user__name@gmail.com` → underscore is invalid for Gmail; should be rejected.
- `user@example.com` → not Gmail; no Gmail validation applies; unchanged behavior.

---

### Bug Condition 3 — Onboarding Completion State Never Persisted

The bug manifests at two call sites. After a successful `completeSetup()` save and after `skipForNow()`, the app navigates to `/tabs/home` without recording that setup is done. `authStore` has no `hasCompletedSetup` field or `setSetupComplete()` action. On every subsequent visit to `HomePage.vue` — including after a browser refresh or after a new login cycle — there is no reactive flag to consult.

**Formal Specification:**
```
FUNCTION isBugCondition_SetupNotPersisted(X)
  INPUT: X of type OnboardingEvent { action: 'complete' | 'skip' }
  OUTPUT: boolean

  RETURN X.action IN ['complete', 'skip']
    AND localStorage.getItem('omniscan_setup_complete') ≠ 'true'
    AND authStore.hasCompletedSetup does not exist
END FUNCTION
```

**Examples:**
- User taps "Complete Setup" → `completeSetup()` runs → navigates to home; `localStorage` has no `omniscan_setup_complete` key; `hasCompletedSetup` is undefined → banner condition cannot be evaluated.
- User taps "Skip for now" → `skipForNow()` runs → navigates to home; same missing state.
- User logs out and logs back in → `checkAuth()` runs; no `hasCompletedSetup` initialization exists → banner state is unknown; fresh user re-registration still shows no banner.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Post-logout navigation: `logout()` in `ProfilePage.vue` continues to call `router.replace('/')`.
- Login back button: `router.push('/')` behavior is unchanged.
- 401 interceptor: `api.ts` continues to push `{ path: '/' }` on unauthorized responses.
- Non-Gmail email validation: addresses with domains other than `gmail.com` / `googlemail.com` continue to be validated only by `EMAIL_RE` (KNOWN_TLDS allowlist).
- Duplicate-email error: a 409 or email-related API error still surfaces "This email address already exists." with the email field highlighted.
- Password mismatch: existing mismatch check is unchanged.
- `completeSetup()` still calls `await authStore.checkAuth()` before `router.replace('/tabs/home')`.
- `skipForNow()` still calls `await authStore.checkAuth()` before `router.replace('/tabs/home')`.
- When `hasCompletedSetup` is `true`, `HomePage.vue` shows no banner.

**Scope:**
All inputs that do NOT satisfy any of the three bug conditions above must behave identically before and after the fix. This includes:
- Mouse and keyboard interactions unrelated to the email field or onboarding step.
- All non-Gmail email addresses with valid KNOWN_TLDS.
- The full step-1 → step-2 registration flow for users who have already completed setup.

---

## Hypothesized Root Cause

### Bug 1 — No Lowercase Normalization

1. **Missing `@input` side-effect**: The email `<input>` in `RegisterPage.vue` binds `v-model="email"` and has `@input="clearFieldError('email')"`. The `clearFieldError` function only mutates `fieldErrors.email = false`. No secondary handler or `watch()` on `email` applies `.toLowerCase()`. Since Vue's `v-model` on a text input sets `email.value` to whatever the user typed, uppercase characters are preserved verbatim.

### Bug 2 — Gmail Dots Not Stripped / No Gmail Validation

2. **No pre-submission email transformation**: `handleRegister()` passes `email.value` directly to both `authStore.register()` and `authStore.login()`. There is no derivation step that strips dots from the local-part before the API call.

3. **Single shared regex for all domains**: `EMAIL_RE` is built from `KNOWN_TLDS` and does not branch on the domain. Gmail's additional constraints (character set, length, dot rules) are never checked.

4. **`+tag` sub-addresses not considered**: Gmail treats `user+tag@gmail.com` as an alias for `user@gmail.com`. The local-part must be evaluated on `user` (base before `+`), not `user+tag`, for structural checks.

### Bug 3 — Setup State Not Persisted

5. **`authStore` never extended for setup state**: The store's `AuthState` interface only has `user` and `token`. There is no `hasCompletedSetup` field, no initializer that reads `localStorage`, and no `setSetupComplete()` action.

6. **`completeSetup()` and `skipForNow()` lack the persistence call**: Neither function calls any store action before navigating; the only side-effects are the `PUT /api/users` request (in `completeSetup`) and `authStore.checkAuth()`.

7. **`DietarySetupBanner.vue` does not exist**: `HomePage.vue` has no import or usage of such a component. Even if `hasCompletedSetup` existed on the store, the template has no conditional block that reads it.

8. **`logout()` does not clear setup state**: After logout, if a different user registers, the stale `localStorage` value would falsely indicate setup is already complete for the new account.

---

## Correctness Properties

Property 1: Bug Condition — Email Display Is Always Lowercase

_For any_ keyboard input event on the email field where the typed character causes `email.value` to contain any uppercase letter (i.e. `isBugCondition_Lowercase` returns true), the fixed `normalizeEmail` handler SHALL update `email.value` to `email.value.toLowerCase()` on the same tick, so the displayed and stored ref value is always fully lowercase.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Gmail Local-Part Submitted Without Dots

_For any_ form submission where the email domain is `gmail.com` or `googlemail.com` and the local-part contains one or more dots (i.e. `isBugCondition_GmailDots` returns true), the fixed `handleRegister()` SHALL derive `normalizedEmail` by removing all dots from the local-part before passing it to `authStore.register()` and `authStore.login()`, so `test.user@gmail.com` and `testuser@gmail.com` resolve to the same API submission.

**Validates: Requirements 2.2**

Property 3: Bug Condition — Invalid Gmail Structure Blocked

_For any_ form submission where the email domain is `gmail.com` or `googlemail.com` and the local-part (after stripping any `+tag`) violates Gmail structural rules (i.e. `isBugCondition_GmailStructure` returns true), the fixed `handleRegister()` SHALL set `fieldErrors.email = true`, set `errorMessage` to a descriptive Gmail-specific validation message, and SHALL NOT call `authStore.register()`.

**Validates: Requirements 2.3**

Property 4: Bug Condition — Setup Completion Is Persisted

_For any_ onboarding event where the user taps "Complete Setup" or "Skip for now" (i.e. `isBugCondition_SetupNotPersisted` returns true before the fix), the fixed `completeSetup()` and `skipForNow()` SHALL call `authStore.setSetupComplete()` before `await authStore.checkAuth()`, causing `localStorage.getItem('omniscan_setup_complete')` to equal `'true'` and `authStore.hasCompletedSetup` to be `true` by the time navigation to `/tabs/home` occurs.

**Validates: Requirements 2.5, 2.6, 2.7**

Property 5: Bug Condition — DietarySetupBanner Visible When Setup Incomplete

_For any_ render of `HomePage.vue` where `authStore.hasCompletedSetup` is `false`, the fixed template SHALL mount and display `DietarySetupBanner`. When `authStore.hasCompletedSetup` reactively becomes `true` (either from the banner's own "Skip" button or from a prior navigation event), the fixed template SHALL immediately unmount the banner without a page refresh.

**Validates: Requirements 2.8, 2.9, 2.10**

Property 6: Preservation — Non-Gmail Email Validation Unchanged

_For any_ form submission where the email domain is NOT `gmail.com` or `googlemail.com`, the fixed `handleRegister()` SHALL produce exactly the same validation outcome as the original function: accept addresses that match `EMAIL_RE`, reject those that do not, and pass the lowercased address (which for non-Gmail is the only normalization applied) to the API.

**Validates: Requirements 3.4, 3.5**

Property 7: Preservation — Existing Auth Flow Unchanged

_For any_ input to `handleRegister()`, `completeSetup()`, `skipForNow()`, or `authStore.logout()` that does not satisfy any of the four bug conditions above, the fixed code SHALL produce the same observable behavior (form errors, navigation, API calls, store state) as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**

---

## Fix Implementation

### File 1: `omniscan-ui/src/stores/authStore.ts`

**Changes Required:**

1. **Add `SETUP_COMPLETE_KEY` constant** (module-level, alongside `TOKEN_KEY`):
   ```typescript
   const SETUP_COMPLETE_KEY = 'omniscan_setup_complete'
   ```

2. **Extend `AuthState` interface** to include the new field:
   ```typescript
   interface AuthState {
     user: AuthUser | null
     token: string | null
     hasCompletedSetup: boolean
   }
   ```

3. **Initialize `hasCompletedSetup` from `localStorage`** in the `state()` factory:
   ```typescript
   state: (): AuthState => ({
     user: null,
     token: null,
     hasCompletedSetup: localStorage.getItem(SETUP_COMPLETE_KEY) === 'true',
   }),
   ```
   This ensures the correct value is available synchronously on first render and after page refresh.

4. **Add `setSetupComplete()` action**:
   ```typescript
   setSetupComplete(): void {
     this.hasCompletedSetup = true
     localStorage.setItem(SETUP_COMPLETE_KEY, 'true')
   },
   ```

5. **Update `logout()` to clear setup state**, so a re-registered user starts from a fresh onboarding state:
   ```typescript
   logout(): void {
     this.user = null
     this.token = null
     this.hasCompletedSetup = false
     localStorage.removeItem(TOKEN_KEY)
     localStorage.removeItem(SETUP_COMPLETE_KEY)
   },
   ```

---

### File 2: `omniscan-ui/src/views/RegisterPage.vue`

**Changes Required (Script Section):**

1. **Add `GMAIL_RE` constant** below the existing `EMAIL_RE` declaration. The regex validates the Gmail local-part after `+tag` stripping and dot-stripping for dot-stripping check purposes (structural chars only):
   ```typescript
   const GMAIL_RE = /^[a-z0-9]+(\.[a-z0-9]+)*$/
   // Covers: only a-z, 0-9, and dots; no leading/trailing/consecutive dots
   // Length (6–30) is checked separately with .length
   ```

2. **Add `normalizeEmail()` handler** that lowercases on every keystroke:
   ```typescript
   function normalizeEmail(): void {
     email.value = email.value.toLowerCase()
   }
   ```

3. **Update `handleRegister()`** — derive `normalizedEmail` and add Gmail branch:
   ```typescript
   async function handleRegister(): Promise<void> {
     errorMessage.value = null
     fieldErrors.name = false
     fieldErrors.email = false
     fieldErrors.password = false
     fieldErrors.confirmPassword = false

     // After lowercasing, derive normalized form for API submission
     const lowercased = email.value  // already lowercase from normalizeEmail()
     const atIndex = lowercased.lastIndexOf('@')
     const localRaw = lowercased.slice(0, atIndex)
     const domain = lowercased.slice(atIndex + 1)

     // Strip dots from local-part to produce the canonical API value
     const localNoDots = localRaw.replace(/\./g, '')
     const normalizedEmail = `${localNoDots}@${domain}`

     // Gmail-specific structural validation
     const isGmail = domain === 'gmail.com' || domain === 'googlemail.com'
     if (isGmail) {
       // Strip +tag sub-address before structural checks
       const localBase = localRaw.split('+')[0]
       if (localBase.length < 6 || localBase.length > 30) {
         fieldErrors.email = true
         errorMessage.value = 'Gmail addresses must be 6–30 characters (excluding any +tag).'
         return
       }
       if (!GMAIL_RE.test(localBase)) {
         fieldErrors.email = true
         errorMessage.value = 'Gmail addresses may only contain letters (a–z), numbers, and periods — no underscores, hyphens, or consecutive dots.'
         return
       }
     } else {
       // Generic TLD validation for non-Gmail addresses
       if (!EMAIL_RE.test(lowercased)) {
         fieldErrors.email = true
         errorMessage.value = 'Please enter a valid email address (e.g. user@example.com).'
         return
       }
     }

     // Remaining existing validations (password length, name≠password, mismatch)
     // ... unchanged ...

     isSubmitting.value = true
     try {
       await authStore.register(name.value.trim(), normalizedEmail, password.value)
       await authStore.login(normalizedEmail, password.value)
       step.value = 2
       fetchAllergenCatalog()
     } catch (err) {
       // ... unchanged error handling ...
     } finally {
       isSubmitting.value = false
     }
   }
   ```

   Key points:
   - `localRaw` is extracted **before** dot-stripping so Gmail structural checks (`GMAIL_RE`, length) run on the real local-part (minus `+tag`).
   - `normalizedEmail` (dots stripped) is what's sent to both `register()` and `login()`.
   - Non-Gmail addresses skip the Gmail branch and go straight to `EMAIL_RE` on the lowercased (but dot-intact) value — their dots are semantically meaningful.
   - The generic `EMAIL_RE` check is skipped for Gmail (Gmail is validated by its own rules which are stricter in character set but looser in TLD knowledge).

4. **Update `completeSetup()`** — call `authStore.setSetupComplete()` before `checkAuth`:
   ```typescript
   async function completeSetup(): Promise<void> {
     if (isSavingPrefs.value) return
     isSavingPrefs.value = true
     prefsError.value = ''
     try {
       await apiFetch('/api/users', {
         method: 'PUT',
         body: { halal_pref: halalSelected.value, allergen_ids: selectedAllergenIds.value },
       })
       authStore.setSetupComplete()          // ← NEW: persist before navigation
       await authStore.checkAuth()
       await router.replace('/tabs/home')
     } catch (err) {
       prefsError.value = err instanceof ApiError ? err.message : 'Failed to save your preferences.'
     } finally {
       isSavingPrefs.value = false
     }
   }
   ```

5. **Update `skipForNow()`** — call `authStore.setSetupComplete()` before `checkAuth`:
   ```typescript
   async function skipForNow(): Promise<void> {
     if (isSavingPrefs.value) return
     authStore.setSetupComplete()            // ← NEW: persist before navigation
     await authStore.checkAuth()
     await router.replace('/tabs/home')
   }
   ```

**Changes Required (Template Section):**

6. **Add `@input="normalizeEmail"` to the email `<input>`**, alongside the existing `@input="clearFieldError('email')"`. Since Vue supports only one `@input` binding per element, combine them into a single inline handler or replace `clearFieldError` with a wrapper:
   ```html
   <input
     v-model="email"
     type="text"
     placeholder="your@email.com"
     required
     class="custom-input"
     :class="{ 'input-error': fieldErrors.email }"
     @input="normalizeEmail(); clearFieldError('email')" />
   ```
   Alternatively, fold the `clearFieldError` call into `normalizeEmail()` itself to keep the template clean.

---

### File 3: `omniscan-ui/src/components/DietarySetupBanner.vue` (new file)

**Component Specification:**

- **Props**: none (reads `authStore` directly).
- **Emits**: none (calls `authStore.setSetupComplete()` internally for "Skip"; emits nothing for "Set Up Now" since it uses `router.push`).
- **Display condition**: This component is only ever mounted when `authStore.hasCompletedSetup === false` (the parent applies `v-if`); the component itself does not need an internal visibility guard.
- **Layout**: A horizontally-spanning card positioned at the top of the home content scroll area. Not a full-page overlay. Uses `ion-card` or a plain `<div>` styled as a rounded card.
- **Content**:
  - Left: `nutrition` or `leaf` Ionicon (from `ionicons/icons`).
  - Center: heading `"Complete Your Setup"`, subtitle `"Tell us your dietary preferences so we can personalise your experience."`.
  - Right or below: two buttons — `"Set Up Now"` (navigates to `/tabs/profile` — the profile page where dietary preferences can be updated for already-registered users) and `"Skip"` (calls `authStore.setSetupComplete()`).
- **Style**: white background, `border-radius: 16px`, subtle `box-shadow`, `margin-bottom: 16px`, accent-green icon and primary button color `#05c450`, dismiss button in muted grey.

**Implementation skeleton:**
```vue
<template>
  <div class="setup-banner">
    <div class="setup-banner__icon-wrap">
      <ion-icon :icon="nutritionOutline" class="setup-banner__icon" />
    </div>
    <div class="setup-banner__body">
      <p class="setup-banner__heading">Complete Your Setup</p>
      <p class="setup-banner__sub">Tell us your dietary preferences so we can personalise your experience.</p>
    </div>
    <div class="setup-banner__actions">
      <ion-button size="small" class="setup-banner__cta" @click="goToProfile">Set Up Now</ion-button>
      <button type="button" class="setup-banner__skip" @click="dismiss">Skip</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon, IonButton } from '@ionic/vue'
import { nutritionOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

function goToProfile(): void {
  authStore.setSetupComplete()
  router.push('/tabs/profile')
}

function dismiss(): void {
  authStore.setSetupComplete()
}
</script>
```

> **Routing note:** Because the user is already fully registered at this point, navigating back to `/register` would restart the full registration flow. The `"Set Up Now"` button instead navigates to `/tabs/profile`, where the user can update dietary preferences. If the profile page does not yet have a dietary-preferences section, that is a separate feature; for now, navigating to profile and dismissing the banner is the minimal correct behavior.

---

### File 4: `omniscan-ui/src/views/HomePage.vue`

**Changes Required:**

1. **Import `DietarySetupBanner`** and `useAuthStore` in the `<script setup>` block:
   ```typescript
   import DietarySetupBanner from '@/components/DietarySetupBanner.vue'
   import { useAuthStore } from '@/stores/authStore'

   const authStore = useAuthStore()
   ```

2. **Add the banner to the template**, as the first child of `.home-wrap`, before the greeting row. Using `v-if` (not `v-show`) to fully unmount when dismissed:
   ```html
   <div class="home-wrap">
     <DietarySetupBanner v-if="!authStore.hasCompletedSetup" />

     <!-- Greeting header (unchanged) -->
     <div class="greeting-row">
       ...
     </div>
     ...
   </div>
   ```
   Placing it inside `ion-content` / `.home-wrap` ensures it scrolls naturally with the page content rather than being a fixed overlay.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach aligned with the bug condition methodology:

1. **Exploratory / Bug Condition Checking** — write tests against the **unfixed** code first to surface counterexamples and confirm the root cause analysis. If counterexamples don't appear as expected, re-examine the root cause before fixing.
2. **Fix + Preservation Checking** — after implementing the fix, run the same tests (now against fixed code) to verify bugs are resolved, then run preservation tests to verify no regressions.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples on **unfixed** code before implementing the fix. Confirm or refute each root cause hypothesis.

**Test Plan**: Use Vitest + Vue Test Utils to mount `RegisterPage.vue` (unfixed) in isolation and simulate user input events and form submissions.

**Test Cases:**

1. **Uppercase Email Not Lowercased** (confirms Bug 1):
   - Set `email.value = 'User@Example.COM'`; trigger `@input` on the email field.
   - Assert: `email.value` is still `'User@Example.COM'` (i.e., NOT lowercased) — this counterexample confirms the bug.

2. **Gmail Dots Not Stripped Before API Call** (confirms Bug 2a):
   - Fill valid form with `email = 'test.user@gmail.com'`, matching passwords.
   - Spy on `authStore.register`.
   - Submit form.
   - Assert: `authStore.register` was called with `'test.user@gmail.com'` (dot present) — counterexample confirms no stripping occurs.

3. **Invalid Gmail Structure Accepted** (confirms Bug 2b):
   - Fill form with `email = 'ab@gmail.com'` (local base `ab`, length 2, too short for Gmail).
   - Submit form.
   - Assert: form proceeds to step 2 without showing a Gmail-specific error — counterexample confirms no Gmail structural check.

4. **Setup State Not Written After completeSetup** (confirms Bug 3a):
   - Call `completeSetup()` on unfixed component (mock `apiFetch` to resolve and `authStore.checkAuth` to resolve).
   - Assert: `localStorage.getItem('omniscan_setup_complete')` is `null` — counterexample confirms no persistence.

5. **Setup State Not Written After skipForNow** (confirms Bug 3b):
   - Call `skipForNow()` on unfixed component.
   - Assert: `localStorage.getItem('omniscan_setup_complete')` is `null`.

**Expected Counterexamples:**
- Tests 1–3: demonstrate that no normalization/validation is applied to email on unfixed code.
- Tests 4–5: demonstrate that `localStorage` is never written during onboarding completion on unfixed code.

---

### Fix Checking

**Goal**: Verify that for all inputs where any bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode — Email Normalization:**
```
FOR ALL X WHERE isBugCondition_Lowercase(X) DO
  trigger @input on email field with X.rawEmail
  ASSERT email.ref.value = X.rawEmail.toLowerCase()
END FOR
```

**Pseudocode — Gmail Dot Stripping:**
```
FOR ALL X WHERE isBugCondition_GmailDots(X) DO
  result := handleRegister_fixed(X)
  ASSERT authStore.register was called with normalizedEmail
         WHERE normalizedEmail.localPart contains no '.'
END FOR
```

**Pseudocode — Gmail Structure Validation:**
```
FOR ALL X WHERE isBugCondition_GmailStructure(X) DO
  result := handleRegister_fixed(X)
  ASSERT result shows validation error AND authStore.register was NOT called
END FOR
```

**Pseudocode — Setup Persistence:**
```
FOR ALL X WHERE isBugCondition_SetupNotPersisted(X) DO
  result := completeOrSkip_fixed(X)
  ASSERT localStorage.getItem('omniscan_setup_complete') = 'true'
    AND authStore.hasCompletedSetup = true
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition_Lowercase(X)
             AND NOT isBugCondition_GmailDots(X)
             AND NOT isBugCondition_GmailStructure(X)
             AND NOT isBugCondition_SetupNotPersisted(X) DO
  ASSERT fixedFunction(X) = originalFunction(X)
END FOR
```

**Testing Approach**: Property-based testing (PBT) is recommended for preservation checking because it generates a large space of inputs automatically and catches edge cases that manual unit tests miss. PBT libraries such as `fast-check` work well in a Vitest environment.

**Test Cases:**

1. **Non-Gmail Valid Email Preserved**: Generate random valid non-Gmail addresses (matching `EMAIL_RE`); assert they pass `handleRegister_fixed()` validation and are submitted with lowercasing only (no dot-stripping).
2. **Non-Gmail Invalid Email Preserved**: Generate random strings that fail `EMAIL_RE` but don't match Gmail domains; assert they are rejected with the existing error message, unchanged.
3. **Password Validation Preserved**: With a valid lowercased email, generate random password pairs; assert mismatch detection, length check, and name=password check all work identically.
4. **Mouse-Click Behavior Preserved**: Verify that existing UI interactions (pref-card toggles, back button, show-password toggle) produce identical behavior.
5. **`hasCompletedSetup = true` Suppresses Banner**: Render `HomePage.vue` with `authStore.hasCompletedSetup = true`; assert `DietarySetupBanner` is not present in the DOM.
6. **`logout()` Resets Setup State**: After `setSetupComplete()`, call `logout()`; assert `hasCompletedSetup` is `false` and `localStorage.getItem(SETUP_COMPLETE_KEY)` is `null`.

---

### Unit Tests

- Email field `@input`: assert `email.value` is lowercased after each keystroke that introduces uppercase characters.
- `normalizeEmail()`: assert pure lowercase output for a range of mixed-case inputs.
- Gmail structural validation: test each invalid condition independently (too short, too long, underscore, hyphen, leading dot, trailing dot, consecutive dots, `+tag` affecting base length).
- Gmail valid address: assert no validation error and dot-stripped submission for structurally correct Gmail addresses.
- `authStore.setSetupComplete()`: assert `hasCompletedSetup` becomes `true` and `localStorage` is written.
- `authStore.logout()`: assert `hasCompletedSetup` becomes `false` and `localStorage` key is removed.
- `authStore` initialization: when `localStorage` has `omniscan_setup_complete = 'true'`, assert `hasCompletedSetup` initializes as `true`.
- `completeSetup()` and `skipForNow()`: assert `setSetupComplete()` is called before `checkAuth()` (use spies to verify call order).
- `DietarySetupBanner` "Skip" button: assert `authStore.setSetupComplete()` is called on click.
- `DietarySetupBanner` "Set Up Now" button: assert `authStore.setSetupComplete()` is called and `router.push('/tabs/profile')` is invoked.

---

### Property-Based Tests

- **Property 1 PBT** (Fix Checking — Lowercase): Generate arbitrary strings containing uppercase characters; assert that after `normalizeEmail()`, `email.value` matches `input.toLowerCase()`.
- **Property 2 PBT** (Fix Checking — Dot Stripping): Generate Gmail addresses with random dot placements in the local-part (valid structure); assert `normalizedEmail` submitted to API has no dots in local-part.
- **Property 3 PBT** (Fix Checking — Gmail Structure): Generate structurally invalid Gmail local-parts using `fast-check` shrinking arbitraries; assert all are rejected without calling `authStore.register()`.
- **Property 6 PBT** (Preservation — Non-Gmail): Generate random valid non-Gmail email strings from `EMAIL_RE`-compliant patterns; assert they are accepted and submitted unchanged (except lowercasing).
- **Property 7 PBT** (Preservation — Auth Flow): Generate random valid form inputs for non-buggy paths; assert form behavior (navigation, error display, API calls) matches the original implementation's observable outputs.

---

### Integration Tests

- Full registration flow (step 1 → step 2 → complete setup): verify `localStorage` contains `omniscan_setup_complete = 'true'` after completing, and `HomePage.vue` renders without the banner on the next load.
- Full registration flow (step 1 → step 2 → skip): same persistence verification.
- `DietarySetupBanner` reactive dismiss: render `HomePage.vue` with `hasCompletedSetup = false`; tap "Skip" on the banner; assert banner unmounts without page navigation.
- Logout and re-login: verify `hasCompletedSetup` resets to `false` on logout, and the banner appears again on the new session's `HomePage.vue`.
- Gmail address round-trip: register with `test.user@gmail.com` → assert API receives `testuser@gmail.com`; log in with `test.user@gmail.com` → same normalization applied → login succeeds.
