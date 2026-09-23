# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Sign-Up Validation & Navigation Defects
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: These tests encode the expected behavior — they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: For each deterministic bug, scope the property to the concrete failing case(s)
  - Bug conditions to test:
    - `isBugCondition_1(input)`: `input.name === input.password` → `handleRegister()` proceeds without error (should block with "Name and password cannot be identical")
    - `isBugCondition_2(input)`: `input.email` matches pattern `*@*` but has no valid TLD (e.g. `"user@domain"`) → form submits to server (should be caught client-side)
    - `isBugCondition_3(input)`: any field fails validation → no red border on that specific field (should show `border-color: #ef4444` on the failing input)
    - `isBugCondition_4(input)`: server returns 409 / "email already" message → error shown as generic fallback (should show "This email address already exists.")
    - `isBugCondition_5`: `skipForNow()` called while `isSavingPrefs === true` → navigation still fires (plain `<button>` ignores `disabled` attribute for logic, only visually disables)
    - `isBugCondition_6`: `handleBack()` called while `step === 1` → always routes back (correct for WelcomePage entry but broken when navigating directly to `/register` with no history — results in blank screen)
    - `isBugCondition_7`: `goBackToProfile()` in SettingsPage uses `router.push('/tabs/profile')` → page enters as a forward animation instead of back-swipe animation
    - `isBugCondition_8`: ProfilePage `handleLogout()` calls `router.push('/login')` after clearing auth → if user taps back from LoginPage, browser history restores the authenticated view
  - Run tests on UNFIXED code — expect FAILURE (confirms bugs exist)
  - Document counterexamples found to understand root cause
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Correct Validation & Navigation Paths
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code with non-buggy inputs
  - Observe and record:
    - `¬C_1`: `password !== name` and `password.length >= 8` and passwords match → `handleRegister()` calls API, proceeds to step 2
    - `¬C_2`: `email` has valid TLD (e.g. `"user@domain.com"`) → form proceeds to API call
    - `¬C_3`: all fields pass validation → no red border applied to any input
    - `¬C_4`: server returns non-conflict error → existing error message display still works
    - `¬C_5`: `isSavingPrefs === false` → `skipForNow()` navigates to `/tabs/home` as expected
    - `¬C_6`: `step === 1` and history exists → `handleBack()` calls `router.back()` correctly
    - `¬C_7`: navigating forward Settings → profile settings row click → enters with forward animation
    - `¬C_8`: successful login flow → `router.push('/login')` lands on login, tab bar hidden
  - Write property-based tests asserting these observed behaviors are unchanged after fix
  - Run on UNFIXED code — **EXPECTED OUTCOME**: Tests PASS (confirms baseline to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix: Sign-Up Validation & Navigation Bugs

  - [ ] 3.1 Add per-field validation error state tracking to RegisterPage (step 1)
    - Add `fieldErrors` reactive object: `{ name: false, email: false, password: false, confirmPassword: false }`
    - Bind `:class="{ 'input-error': fieldErrors.X }"` on each `<input>` in step 1
    - Add CSS `.input-error { border-color: #ef4444 !important; }` to the scoped styles
    - Clear `fieldErrors.X` on each field's `@input` event so the red border disappears as soon as the user starts correcting
    - _Bug_Condition: isBugCondition_3 — no visual per-field error signal on validation failure_
    - _Expected_Behavior: failing field gets red border; border clears on next keystroke_
    - _Preservation: passing fields must not receive the error class_
    - _Requirements: 1.3_

  - [ ] 3.2 Enforce name ≠ password validation in `handleRegister()`
    - After the `password.length < 8` guard, add: `if (name.value.trim() === password.value) { fieldErrors.name = true; fieldErrors.password = true; errorMessage.value = 'Name and password cannot be identical.'; return }`
    - _Bug_Condition: isBugCondition_1 — name === password passes through to API_
    - _Expected_Behavior: submission blocked with inline error; both fields highlighted_
    - _Preservation: name !== password paths unaffected_
    - _Requirements: 1.2_

  - [ ] 3.3 Enforce strict email TLD validation in `handleRegister()`
    - Replace browser-only email validation by adding a JS guard before the API call: `const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; if (!emailRe.test(email.value)) { fieldErrors.email = true; errorMessage.value = 'Please enter a valid email address.'; return }`
    - Change the email `<input>` `type` from `"email"` to `"text"` so the browser's own partial-validation (which accepts `user@domain` without TLD) doesn't interfere with the custom check
    - _Bug_Condition: isBugCondition_2 — email missing TLD accepted by browser type=email_
    - _Expected_Behavior: `user@domain` rejected; `user@domain.com` accepted_
    - _Preservation: valid emails still proceed to API_
    - _Requirements: 1.4_

  - [ ] 3.4 Map "email already exists" server error to a specific message
    - In the `catch` block of `handleRegister()`, inspect the `ApiError` status or message: `if (err instanceof ApiError && (err.status === 409 || err.message.toLowerCase().includes('email'))) { fieldErrors.email = true; errorMessage.value = 'This email address already exists.'; } else { errorMessage.value = ...; }`
    - _Bug_Condition: isBugCondition_4 — server conflict shows as generic fallback_
    - _Expected_Behavior: duplicate-email server response surfaced as "This email address already exists." with email field highlighted_
    - _Preservation: other API errors still surface their own message_
    - _Requirements: 1.1_

  - [ ] 3.5 Guard `completeSetup` and `skipForNow` buttons against double-invocation
    - `skipForNow` is a plain `<button>` with `:disabled="isSavingPrefs"` — the `disabled` attribute IS honoured by native `<button>` elements, but add an explicit guard at the top of the function: `if (isSavingPrefs.value) return`
    - `completeSetup` already uses `<ion-button :disabled="...">` which Ionic wires correctly; verify the handler is not called twice by wrapping the top of `completeSetup` with the same guard: `if (isSavingPrefs.value) return`
    - _Bug_Condition: isBugCondition_5 — rapid double-tap on Skip fires navigation twice_
    - _Expected_Behavior: second invocation is a no-op while saving is in flight_
    - _Preservation: single tap still navigates correctly_
    - _Requirements: 1.5_

  - [ ] 3.6 Fix `handleBack()` logic for step 1 with no navigation history
    - Current code: `if (step.value === 2) { step.value = 1; return } router.back()` — shows chevron button unconditionally on step 1; if the user deep-links directly to `/register` (no history), `router.back()` results in a blank screen
    - Fix: replace `router.back()` with `router.replace('/welcome')` (or check `window.history.length <= 1` and use `replace` as fallback): `if (window.history.length <= 1) { router.replace('/'); } else { router.back(); }`
    - _Bug_Condition: isBugCondition_6 — back on step 1 with no history yields blank screen_
    - _Expected_Behavior: user lands on WelcomePage regardless of how they reached /register_
    - _Preservation: normal back-navigation (history present) still works as before_
    - _Requirements: 1.6_

  - [ ] 3.7 Fix Settings back-navigation to use `router.back()` for correct right-to-left animation
    - In `SettingsPage.vue` `goBackToProfile()`, change `router.push('/tabs/profile')` → `router.back()`
    - `router.push` triggers a forward (left-to-right enter) animation; `router.back()` triggers the correct reverse (right-to-left exit) animation matching the entry direction
    - If there is no history (edge case: direct deep-link to `/tabs/settings`), fall back to `router.replace('/tabs/profile')`: `if (window.history.length <= 1) { router.replace('/tabs/profile'); } else { router.back(); }`
    - _Bug_Condition: isBugCondition_7 — back button in Settings animates as forward push_
    - _Expected_Behavior: back button slides Settings page out to the right_
    - _Preservation: all other settings-page behavior (toggles, modals, version info) unchanged_
    - _Requirements: 2.1_

  - [ ] 3.8 Fix ProfilePage logout to use `router.replace` so the back button cannot restore the auth view
    - In `ProfilePage.vue` `handleLogout()`, change `router.push('/login')` → `router.replace('/login')`
    - `router.push` keeps the profile page in the history stack, so tapping the browser/device back button after logout restores the authenticated view without re-authenticating
    - `router.replace` replaces the current entry, ensuring post-logout back-navigation cannot return to a protected page
    - _Bug_Condition: isBugCondition_8 — back after logout restores authenticated view_
    - _Expected_Behavior: post-logout back navigation cannot reach protected pages_
    - _Preservation: logout still clears auth state and lands on /login_
    - _Requirements: 2.2_

  - [ ] 3.9 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Sign-Up Validation & Navigation Defects
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run all property 1 test cases against the fixed code
    - **EXPECTED OUTCOME**: All sub-cases PASS (confirms every bug is fixed)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2_

  - [ ] 3.10 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Correct Validation & Navigation Paths
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all property 2 test cases against the fixed code
    - **EXPECTED OUTCOME**: All tests PASS (no regressions in valid paths)
    - Confirm happy-path registration, navigation, and logout all work correctly

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite (`npm run test -- --run` or equivalent)
  - Manually smoke-test on device/emulator:
    - Step 1 registration with each invalid input → correct field highlighted, correct message
    - Duplicate email → "This email address already exists." + email field red
    - Name equals password → both fields red + error message
    - `user@nodomain` rejected; `user@domain.co` accepted
    - Complete Setup and Skip for Now each navigate to home only once
    - Back on register step 1 from Welcome → returns to Welcome
    - Back on register step 2 → returns to step 1 (already correct, verify not broken)
    - Settings back button → slides right, returns to Profile
    - Logout → lands on Login; back button does not return to Profile
  - Ensure all tests pass; ask the user if questions arise
