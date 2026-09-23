# Auth & Navigation Workflow Bugfix Design

## Overview

This document formalizes the fix strategy for nine bugs spread across two files: `RegisterPage.vue` (sign-up validation, step 2 button handlers, and back-button logic) and `SettingsPage.vue` (back-navigation transition direction and logout-screen back button).

The bugs fall into two categories:
- **Validation gaps** — missing field-level visual feedback, incomplete email regex, absent name/password identity check, and missing duplicate-email mapping from API error.
- **Navigation/handler defects** — `completeSetup` and `skipForNow` not firing reliably, `handleBack` routing incorrectly on step 1, the `goBackToProfile` function triggering the wrong Ionic animation direction, and the logout confirmation alert having no safe back path.

The fix strategy is **targeted and minimal**: add per-field error refs, update the validation function, remap the API error message, re-examine button bindings, fix the `handleBack` guard, replace `router.push` with `router.back()` for the settings toolbar, and add a safe dismiss path to the logout alert.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs and application states that trigger one of the nine reported defects.
- **Property (P)**: The expected correct outcome for any input where C holds — specific per bug item.
- **Preservation**: All currently working behaviors (valid-input happy paths, settings toggles, forward navigation, other keyboard/mouse interactions) that must remain unchanged by the fix.
- **handleRegister**: The form-submit handler in `RegisterPage.vue` that runs step-1 validation and calls `authStore.register`.
- **handleBack**: The back-button handler in `RegisterPage.vue` responsible for navigating to step 1 or out of the registration flow.
- **completeSetup / skipForNow**: The step-2 action handlers in `RegisterPage.vue` bound to the "Complete Setup" and "Skip for now" buttons.
- **goBackToProfile**: The toolbar back-button handler in `SettingsPage.vue` that should slide the view back toward the Profile page.
- **ion-router-outlet**: The Ionic Vue outlet that manages page history and slide animations; `router.push` creates a *forward* history entry (slide left), while `router.back()` or `router.go(-1)` pops it (slide right).
- **alertController**: The Ionic programmatic alert used to confirm logout; currently has no back/cancel safe path.

---

## Bug Details

### Bug Condition

The bugs manifest under these distinct input conditions. A single compound pseudocode function captures all nine branches:

```
FUNCTION isBugCondition(input)
  INPUT: input — one of { FormSubmitEvent, ButtonClickEvent, NavigationEvent }
  OUTPUT: boolean

  // 1.1 — field-level visual feedback missing
  IF input.type = FormSubmitEvent AND any field fails client validation
    RETURN true

  // 1.2 — duplicate-email error not surfaced explicitly
  IF input.type = FormSubmitEvent AND apiError.message contains 'already'
    RETURN true

  // 1.3 — name == password not blocked
  IF input.type = FormSubmitEvent AND input.password = input.name
    RETURN true

  // 1.4 — TLD-less email accepted
  IF input.type = FormSubmitEvent
     AND input.email matches /^[^\s@]+@[^\s@]+$/  // has @ but no dot-TLD
     AND NOT input.email matches /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    RETURN true

  // 1.5 — "Complete Setup" silently drops
  IF input.type = ButtonClickEvent AND input.target = 'complete-setup-button'
     AND completeSetup handler is not invoked
    RETURN true

  // 1.6 — "Skip for now" silently drops
  IF input.type = ButtonClickEvent AND input.target = 'skip-link-button'
     AND skipForNow handler is not invoked
    RETURN true

  // 1.7 — back on step 1 routes incorrectly
  IF input.type = ButtonClickEvent AND input.target = 'back-button'
     AND step = 1
     AND router.back() is NOT called
    RETURN true

  // 1.8 — settings back slides from wrong direction
  IF input.type = NavigationEvent AND source = 'settings-toolbar-back'
     AND router.push('/tabs/profile') is called instead of router.back()
    RETURN true

  // 1.9 — logout alert back button unsafe
  IF input.type = ButtonClickEvent AND input.target = 'logout-alert-cancel'
     AND no dismiss/cancel path is wired up
    RETURN true

  RETURN false
END FUNCTION
```

### Examples

- **Bug 1.1**: User leaves the Name field empty and taps "Continue" → error banner appears but the Name input has no red border.
- **Bug 1.2**: User registers with an email already in the database → API returns a message like "Email already exists" but the UI shows a generic banner with no field highlight.
- **Bug 1.3**: User enters `Name: alice` and `Password: alice` → form submits successfully, account is created with a trivially guessable password.
- **Bug 1.4**: User types `user@domain` (no `.com`) → native `type="email"` on Chrome accepts this; the custom validator does not additionally check for TLD, so the API call fires.
- **Bug 1.5 / 1.6**: On step 2, tapping "Complete Setup" or "Skip for now" does nothing visible (binding is present in current code but investigation is needed to confirm whether a DOM event propagation issue, `disabled` guard mismatch, or wrapper element intercepts the click).
- **Bug 1.7**: On step 1, tapping the back button calls `router.back()` — but the current `handleBack` guard checks `step.value === 2` to go back to step 1, and otherwise falls through to `router.back()`. The bug is actually that the back button is only shown when `step === 1` in the template (`v-if="step === 1"`), but `handleBack` also handles step 2 (which is never reached from this button). Investigation is needed to confirm the actual navigation failure.
- **Bug 1.8**: From the Settings page, tapping the header back button calls `router.push('/tabs/profile')`, which pushes a new history entry → Ionic treats this as forward navigation and animates left-to-right instead of right-to-left.
- **Bug 1.9**: The logout flow currently calls `authStore.logout()` and `router.push('/login')` directly from `ProfilePage.vue` without a confirmation dialog. The bug report refers to a "logout screen back button" — this means either a confirmation `ion-alert` needs to be implemented with a cancel path, or an existing implementation is missing the dismiss handler.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- A user entering a fully valid email (`user@example.com`), a password of 8+ characters that does not match their name, and matching confirm-password fields SHALL continue to pass validation and reach account creation.
- The minimum password length check (8 characters) SHALL continue to be enforced.
- Matching passwords in "Password" and "Confirm Password" SHALL continue to be accepted.
- Step-2 successful preference save (allergen IDs + halal flag) SHALL continue to navigate to `/tabs/home`.
- Forward navigation from Profile → Settings SHALL continue to use a left-slide (push) animation.
- Settings toggles (camera, notifications, dark mode) and modal open/close (Terms, FAQ, About) SHALL continue to work.
- Back navigation on any page other than the three affected cases SHALL continue to use default Ionic behavior.

**Scope:**
All inputs that do NOT satisfy `isBugCondition` — including valid form submissions, mouse clicks on non-broken buttons, settings toggles, forward navigation, and any non-number keyboard inputs — must be completely unaffected by this fix.

---

## Hypothesized Root Cause

1. **Missing per-field error state (bugs 1.1, 1.2)**: `handleRegister` uses a single `errorMessage` ref. There are no per-field refs (e.g., `nameError`, `emailError`, `passwordError`) and no CSS class binding that would conditionally add `border-color: red` to a specific input. The `.custom-input` only reacts to `:focus`. Fix: add field-scoped error refs and bind `--error` class to inputs.

2. **Duplicate-email error not remapped (bug 1.2)**: The `catch` block in `handleRegister` forwards `err.message` from the `ApiError` directly. If the Nitro API returns a message like `"Email already in use"` or a generic HTTP error body, it will not match the UX requirement of `"email already exists."`. Fix: inspect `err.message` for a known duplicate-email keyword and substitute the canonical message.

3. **No name-equals-password guard (bug 1.3)**: `handleRegister` checks length and confirmation match but not `password === name`. Fix: add this check before the API call.

4. **Weak email TLD validation (bug 1.4)**: The `<input type="email">` browser native validator is inconsistent across platforms. A custom regex check is missing. Fix: add a regex test `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` before submission.

5. **Step-2 button bindings (bugs 1.5, 1.6)**: Current template has `@click="completeSetup"` on `<ion-button>` and `@click="skipForNow"` on `<button>`. These look syntactically correct, but Ionic's `<ion-button>` may intercept the native click if the `disabled` prop is truthy, or a parent wrapper prevents propagation. The `isSavingPrefs` guard on `skipForNow`'s `<button>` uses `:disabled` which is a boolean-attribute binding — valid. Needs live verification; if the issue is a propagation or re-render bug, moving to `@click.prevent` or restructuring may be needed.

6. **handleBack guard on step 1 (bug 1.7)**: The back button is conditionally rendered only on step 1 (`v-if="step === 1"`). The `handleBack` function first checks `if (step.value === 2)` and steps back to 1; otherwise calls `router.back()`. Because the button only appears on step 1, the `step === 2` branch is dead code and the `router.back()` path is always taken — which is actually correct. The bug may instead be that `router.back()` after a fresh tab navigation has no history entry, or the welcome/login route isn't in the stack. Fix: use `router.replace` to a known safe route as a fallback when history is empty.

7. **Wrong direction animation (bug 1.8)**: `goBackToProfile()` calls `router.push('/tabs/profile')`. A `push` adds a forward entry to the router history; Ionic's `IonRouterOutlet` detects direction via history delta — a push always animates forward (slide left). Fix: replace `router.push('/tabs/profile')` with `router.back()` so Ionic detects a backward navigation and applies the correct right-to-left exit / left-to-right enter animation.

8. **Logout screen no safe back path (bug 1.9)**: `handleLogout` in `ProfilePage.vue` immediately calls `authStore.logout()` and redirects. There is no confirmation dialog, so there is no "back" in the traditional sense. The bug requirement states a confirmation screen with a safe back button. Fix: wrap logout in an `ion-alert` (via `alertController`) with a "Cancel" button that dismisses the alert, and a "Log Out" confirm button that executes the logout sequence.

---

## Correctness Properties

Property 1: Bug Condition — Validation Feedback and Error Mapping

_For any_ form submission where the bug condition holds (isBugCondition returns true for items 1.1–1.4), the fixed `handleRegister` function SHALL: apply a red border outline to each failing input field, display a specific inline error message for the failing condition, and SHALL NOT proceed to the API call until all validation passes.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Bug Condition — Button Handler Invocation

_For any_ button click where the bug condition holds (isBugCondition returns true for items 1.5–1.6), the fixed event bindings SHALL correctly invoke `completeSetup` or `skipForNow` respectively, causing the expected navigation or preference-save side-effect.

**Validates: Requirements 2.5, 2.6**

Property 3: Bug Condition — Back Navigation Routing

_For any_ back-button interaction where the bug condition holds (isBugCondition returns true for items 1.7–1.9), the fixed navigation calls SHALL direct the user to the correct previous screen with the correct animation direction and without crashing.

**Validates: Requirements 2.7, 2.8, 2.9**

Property 4: Preservation — Valid Input Happy Paths

_For any_ input where the bug condition does NOT hold (isBugCondition returns false) — specifically valid form data, normal settings interactions, and forward navigation — the fixed code SHALL produce the same result as the original code, preserving all existing functionality unchanged.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

---

## Fix Implementation

### Changes Required

**File**: `src/views/RegisterPage.vue`

**Changes**:

1. **Add per-field error refs** (fixes 1.1, 1.2):
   ```typescript
   const nameError = ref<string | null>(null)
   const emailError = ref<string | null>(null)
   const passwordError = ref<string | null>(null)
   const confirmPasswordError = ref<string | null>(null)
   ```
   Clear all field errors at the start of `handleRegister`. Set the appropriate field error ref instead of (or in addition to) `errorMessage` for each validation failure.

2. **Add red-border CSS class binding** (fixes 1.1, 1.2):
   In the template, add `:class="{ 'custom-input--error': !!nameError }"` (and equivalent for each field) on each `.custom-input` element. Add the CSS rule:
   ```css
   .custom-input--error {
     border-color: #dc2626;
   }
   ```

3. **Add TLD email validation** (fix 1.4):
   In `handleRegister`, before the API call:
   ```typescript
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
   if (!emailRegex.test(email.value)) {
     emailError.value = 'Please enter a valid email address (e.g. user@example.com).'
     return
   }
   ```

4. **Add name-equals-password guard** (fix 1.3):
   In `handleRegister`, after the length check:
   ```typescript
   if (password.value === name.value.trim()) {
     passwordError.value = 'Password cannot be the same as your name.'
     return
   }
   ```

5. **Remap duplicate-email API error** (fix 1.2):
   In the `catch` block of `handleRegister`:
   ```typescript
   } catch (err) {
     if (err instanceof ApiError) {
       const msg = err.message.toLowerCase()
       if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate') || msg.includes('taken')) {
         emailError.value = 'email already exists.'
         return
       }
       errorMessage.value = err.message
     } else {
       errorMessage.value = 'Registration failed. Please try again.'
     }
   }
   ```

6. **Fix back-button routing on step 1** (fix 1.7):
   Replace the `handleBack` body with a fallback to a known safe route when the history stack is empty:
   ```typescript
   function handleBack(): void {
     if (step.value === 2) {
       step.value = 1
       return
     }
     if (window.history.length > 1) {
       router.back()
     } else {
       router.replace('/')
     }
   }
   ```

7. **Verify and fix step-2 button bindings** (fixes 1.5, 1.6):
   Confirm `<ion-button @click="completeSetup">` and `<button @click="skipForNow">` are correctly wired. If event propagation issues are found during testing, move handlers to use `@click.stop` or restructure to native `<button>` elements for both actions. Ensure `isSavingPrefs` guard does not inadvertently block the initial click.

---

**File**: `src/views/SettingsPage.vue`

**Changes**:

8. **Fix back animation direction** (fix 1.8):
   Replace:
   ```typescript
   function goBackToProfile() {
     router.push('/tabs/profile')
   }
   ```
   With:
   ```typescript
   function goBackToProfile() {
     router.back()
   }
   ```
   This lets Ionic detect a backward navigation delta and apply the correct right-to-left animation (the "back" slide direction).

---

**File**: `src/views/ProfilePage.vue`

**Changes**:

9. **Add logout confirmation alert with safe back path** (fix 1.9):
   Import `alertController` from `@ionic/vue`. Replace the direct `handleLogout` function with a two-step flow:
   ```typescript
   async function handleLogout(): Promise<void> {
     const alert = await alertController.create({
       header: 'Log Out',
       message: 'Are you sure you want to log out?',
       buttons: [
         {
           text: 'Cancel',
           role: 'cancel', // safe dismiss — no navigation
         },
         {
           text: 'Log Out',
           role: 'destructive',
           handler: () => {
             authStore.logout()
             router.replace('/login')
           },
         },
       ],
     })
     await alert.present()
   }
   ```
   The "Cancel" button acts as the "back" for the logout screen — it dismisses the alert and returns the user to the Profile view safely. Using `router.replace` instead of `router.push` prevents the `/login` route from being added to forward history after logout.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: first run exploratory tests on the **unfixed** code to surface counterexamples and confirm root cause analysis, then run fix-checking and preservation tests on the **fixed** code.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE the fix. Confirm or refute the root cause hypotheses. If a hypothesis is wrong, re-analyze before implementing.

**Test Plan**: Write tests that drive each bug-triggering input path against the unfixed component state and assert the *currently broken* behavior occurs as expected. Run these on the original code.

**Test Cases**:
1. **Field border on invalid submit** (bug 1.1): Submit form with empty Name field → assert `.custom-input--error` class is absent on the name input (will fail on unfixed code confirming the bug).
2. **Duplicate email message** (bug 1.2): Mock API to return `{ message: 'Email already exists' }` error → assert `emailError` ref is NOT `'email already exists.'` (will fail on unfixed code).
3. **Name == password accepted** (bug 1.3): Enter `name = 'alice'`, `password = 'alice'` → assert form does NOT call `authStore.register` (will fail on unfixed code — form proceeds).
4. **TLD-less email accepted** (bug 1.4): Enter `email = 'user@domain'` → assert `emailError` is NOT null (will fail on unfixed code).
5. **Step-2 buttons** (bugs 1.5, 1.6): Mount step 2, click "Complete Setup" → assert `completeSetup` was called (may fail depending on binding state).
6. **Settings back animation** (bug 1.8): Inspect `goBackToProfile` call → assert `router.push` is called (confirms the directional bug).
7. **Logout back path** (bug 1.9): Click "Log Out" → assert no `alertController` dialog is shown (confirms missing confirmation screen).

**Expected Counterexamples**:
- No `.custom-input--error` class applied to any input field on validation failure.
- No "email already exists." message even when API returns a duplicate-email error.
- `authStore.register` is called when `name === password`.
- `emailRegex` is not tested; `user@domain` proceeds to API.
- Possible `goBackToProfile` push direction confirmed as forward.

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior defined in Properties 1–3.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Specific assertions:**
- Empty name field → `nameError` is set AND `.custom-input--error` class is on the name input.
- `password === name` → `passwordError` is `'Password cannot be the same as your name.'` AND API not called.
- TLD-less email → `emailError` is set AND API not called.
- API duplicate-email error → `emailError` is `'email already exists.'` AND email input has red border.
- "Complete Setup" click → `completeSetup` invoked → `router.replace('/tabs/home')` called on success.
- "Skip for now" click → `skipForNow` invoked → `router.replace('/tabs/home')` called immediately.
- Back button on step 1 → `router.back()` called (or `router.replace('/')` as fallback).
- Settings `goBackToProfile` → `router.back()` called (not `router.push`).
- Logout click → `alertController.create` called → Cancel button dismisses without navigation.

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases across the full valid input space automatically, catching edge cases that manual tests would miss.

**Test Cases**:
1. **Valid registration flow**: Enter `name = 'Alice'`, `email = 'alice@example.com'`, `password = 'securePass1'`, `confirmPassword = 'securePass1'` → assert `authStore.register` called, then `authStore.login`, then `step = 2`.
2. **Password length enforcement preserved**: Enter 7-character password → assert existing "Password must be at least 8 characters." error still fires.
3. **Confirm-password mismatch preserved**: Mismatched passwords → assert "Passwords do not match." error still fires.
4. **Step-2 preference save preserved**: Select allergens + halal, click "Complete Setup" → assert PUT `/api/users` called with `{ halal_pref, allergen_ids }` and `router.replace('/tabs/home')` navigates.
5. **Forward Profile → Settings animation preserved**: Verify `router.push('/tabs/settings')` from ProfilePage still creates a forward navigation entry.
6. **Settings toggles and modals preserved**: Toggle camera, notifications, dark mode → `localStorage` updated. Open/close Terms, FAQ, About modals → state vars toggle correctly.
7. **Other back navigations unaffected**: Pages other than RegisterPage step 1, SettingsPage toolbar, and ProfilePage logout continue to use default Ionic back behavior.

---

### Unit Tests

- Test `handleRegister` with each validation failure case individually (empty name, short password, mismatched passwords, name == password, TLD-less email).
- Test error ref values and class bindings for each failing field.
- Test API error remapping: mock `ApiError` with `'already exists'` message → assert `emailError` equals `'email already exists.'`.
- Test `handleBack` with empty history vs. non-empty history stack.
- Test `goBackToProfile` calls `router.back()` not `router.push`.
- Test `handleLogout` presents `alertController` and that the "Cancel" role does not invoke logout.

### Property-Based Tests

- Generate random strings for `(name, email, password)` where `password !== name` and `email` matches the valid TLD regex → assert `handleRegister` proceeds past client validation (no early return).
- Generate random strings where `password === name` → assert `handleRegister` always returns early with `passwordError` set.
- Generate TLD-less email strings (`*@*` without a dot segment) → assert `emailError` is always set.
- Generate valid vs. invalid API error messages → assert only messages containing known duplicate-email keywords map to `'email already exists.'`.
- Generate random settings toggle sequences → assert `localStorage` values always reflect the last toggle state.

### Integration Tests

- Full step-1 → step-2 → complete setup flow with mocked API → user lands on `/tabs/home`.
- Full step-1 → step-2 → skip for now flow → user lands on `/tabs/home`.
- Register with duplicate email via mocked API → red border on email field, "email already exists." message displayed.
- Settings page: tap back → verify Ionic history delta is -1 (backward navigation), not +1 (forward).
- ProfilePage: tap "Log Out" → alert appears → tap "Cancel" → alert dismissed, still on Profile page → tap "Log Out" again → tap "Log Out" confirm → redirected to `/login`.
