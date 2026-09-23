# Implementation Plan

- [ ] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Email Normalization & Gmail Validation Bugs
  - **CRITICAL**: Write these tests BEFORE implementing any fix — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: These tests encode the expected behavior — they validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate all three email-related bug conditions
  - **Scoped PBT Approach**: Scope each property to the concrete failing cases for reproducibility
  - Use Vitest + Vue Test Utils to mount `RegisterPage.vue` (unfixed) in isolation
  - **Test 1a — Email Not Lowercased (Bug Condition `isEmailNotLowercased`)**:
    - Set `email.value = 'User@Example.COM'`; trigger `@input` on the email field
    - Assert: `email.value` is still `'User@Example.COM'` (NOT lowercased) — counterexample confirms Bug 1
    - From `isBugCondition_Lowercase`: `X.raw ≠ X.raw.toLowerCase()`
  - **Test 1b — Gmail Dots Not Stripped (Bug Condition `isGmailWithDots`)**:
    - Fill valid form with `email = 'test.user@gmail.com'`, spy on `authStore.register`
    - Submit form; assert `authStore.register` was called with `'test.user@gmail.com'` (dot present)
    - Counterexample confirms no dot-stripping occurs before API submission
    - From `isBugCondition_GmailDots`: domain is `gmail.com` AND `localPart.contains('.')`
  - **Test 1c — Invalid Gmail Structure Accepted (Bug Condition `isGmailWithInvalidStructure`)**:
    - Fill form with `email = 'ab@gmail.com'` (local base `ab`, length 2 — too short for Gmail)
    - Submit form; assert form proceeds to step 2 without a Gmail-specific validation error
    - Counterexample confirms no Gmail structural check exists
    - From `isGmailWithInvalidStructure`: `length(base) < 6`
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ] 2. Write bug condition exploration test for setup persistence
  - **Property 1: Bug Condition** - Onboarding Completion State Never Persisted
  - **CRITICAL**: Write this test BEFORE implementing any fix — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples demonstrating that `localStorage` and `authStore.hasCompletedSetup` are never updated on onboarding completion
  - **Scoped PBT Approach**: Scope property to the concrete failing call sites (`completeSetup` and `skipForNow`)
  - Use Vitest + Vue Test Utils to mount `RegisterPage.vue` (unfixed) in isolation
  - **Test 2a — completeSetup Does Not Persist State (Bug Condition `isSetupCompletedWithoutPersistence`)**:
    - Mock `apiFetch` to resolve and `authStore.checkAuth` to resolve
    - Call `completeSetup()` on unfixed component
    - Assert: `localStorage.getItem('omniscan_setup_complete')` is `null`
    - Counterexample confirms no persistence after completing setup
  - **Test 2b — skipForNow Does Not Persist State**:
    - Call `skipForNow()` on unfixed component
    - Assert: `localStorage.getItem('omniscan_setup_complete')` is `null`
    - Counterexample confirms no persistence after skipping setup
  - **Test 2c — authStore Has No hasCompletedSetup Field**:
    - Import `useAuthStore` and create store instance
    - Assert: `authStore.hasCompletedSetup` is `undefined`
    - Counterexample confirms the reactive field does not exist
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.5, 1.6, 1.7, 2.5, 2.6, 2.7_

- [ ] 3. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Gmail Validation & Existing Auth Flow Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run unfixed code with non-buggy inputs first
  - Observe and record behavior of unfixed code for all inputs where no bug condition holds
  - Use Vitest + `fast-check` for property-based testing (generates broad input space for stronger guarantees)
  - **Test 3a — Non-Gmail Valid Email Preserved**:
    - Observe: `user@example.com` passes validation and reaches `authStore.register` on unfixed code
    - Write PBT: for all valid non-Gmail emails matching `EMAIL_RE`, fixed code accepts them with lowercasing only (no dot-stripping)
    - Non-bug condition: `NOT isGmailWithDots(X)` (domain is not `gmail.com` or `googlemail.com`)
    - Verify test PASSES on UNFIXED code
  - **Test 3b — Non-Gmail Invalid Email Preserved**:
    - Observe: `user@example.xy` is rejected with existing validation error on unfixed code
    - Write PBT: for all emails with unrecognised TLDs on non-Gmail domains, fixed code rejects them with the same error message
    - Verify test PASSES on UNFIXED code
  - **Test 3c — Password Validation Preserved**:
    - Observe: mismatched passwords, passwords too short, and name=password cases are all rejected on unfixed code
    - Write PBT: for valid lowercased email inputs, all password validation rules produce identical outcomes before and after fix
    - Verify test PASSES on UNFIXED code
  - **Test 3d — Duplicate Email Error Preserved**:
    - Observe: when `authStore.register` throws a 409/email-conflict error, "This email address already exists." is shown with email field highlighted
    - Write unit test asserting this behavior is unchanged after the fix
    - Verify test PASSES on UNFIXED code
  - **Test 3e — hasCompletedSetup=true Hides Banner**:
    - Observe: (post-fix baseline) when `authStore.hasCompletedSetup` is `true`, `DietarySetupBanner` is NOT rendered in `HomePage.vue`
    - Write unit test asserting banner is absent when setup is already complete
    - Verify this test describes the expected post-fix preserved behavior
  - Run all tests on UNFIXED code (3a–3d should PASS; 3e will require the store extension)
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

- [ ] 4. Extend authStore with setup completion state

  - [ ] 4.1 Add SETUP_COMPLETE_KEY constant and extend AuthState interface
    - Add `const SETUP_COMPLETE_KEY = 'omniscan_setup_complete'` at module level alongside `TOKEN_KEY`
    - Extend `AuthState` interface: add `hasCompletedSetup: boolean`
    - Initialize in `state()` factory: `hasCompletedSetup: localStorage.getItem(SETUP_COMPLETE_KEY) === 'true'`
    - Ensures value is available synchronously on first render and after page refresh
    - _Bug_Condition: `isSetupCompletedWithoutPersistence` — `authStore.hasCompletedSetup` does not exist_
    - _Expected_Behavior: `authStore.hasCompletedSetup` initializes from localStorage on store creation_
    - _Preservation: All existing `AuthState` fields (`user`, `token`) and their initialization are unchanged_
    - _Requirements: 2.7, 3.6_

  - [ ] 4.2 Add setSetupComplete() action
    - Add action to `authStore`: sets `this.hasCompletedSetup = true` and `localStorage.setItem(SETUP_COMPLETE_KEY, 'true')`
    - _Bug_Condition: `isSetupCompletedWithoutPersistence` — no action exists to persist completion_
    - _Expected_Behavior: calling `setSetupComplete()` makes `hasCompletedSetup` true and writes to localStorage_
    - _Requirements: 2.5, 2.6, 2.7_

  - [ ] 4.3 Update logout() to clear setup state
    - In `logout()`, add `this.hasCompletedSetup = false` and `localStorage.removeItem(SETUP_COMPLETE_KEY)`
    - Ensures a re-registered user after logout starts from a fresh onboarding state
    - _Preservation: Existing logout behavior (clearing `user`, `token`, removing `TOKEN_KEY`) is unchanged_
    - _Requirements: 3.1, 3.6_

- [ ] 5. Fix email normalization and Gmail validation in RegisterPage.vue

  - [ ] 5.1 Add GMAIL_RE constant and normalizeEmail() function
    - Add `const GMAIL_RE = /^[a-z0-9]+(\.[a-z0-9]+)*$/` below existing `EMAIL_RE`
    - Add `function normalizeEmail(): void { email.value = email.value.toLowerCase() }`
    - _Bug_Condition: `isEmailNotLowercased` — `@input` handler never calls `.toLowerCase()`_
    - _Expected_Behavior: on every keystroke, `email.value` is always fully lowercase_
    - _Requirements: 2.1_

  - [ ] 5.2 Update email input @input binding to call normalizeEmail
    - Change the email `<input>` binding to: `@input="normalizeEmail(); clearFieldError('email')"`
    - Combines both handlers so normalization and error-clearing both fire on every input event
    - _Bug_Condition: `isEmailNotLowercased` — no lowercase normalization applied on input_
    - _Expected_Behavior: displayed and stored `email.value` is always lowercase_
    - _Requirements: 2.1_

  - [ ] 5.3 Update handleRegister() with Gmail-specific validation and dot-stripping
    - Extract `localRaw` and `domain` from the lowercased `email.value` using `lastIndexOf('@')`
    - Derive `normalizedEmail` by stripping all dots from `localRaw`: `localRaw.replace(/\./g, '') + '@' + domain`
    - Add Gmail branch (`domain === 'gmail.com' || domain === 'googlemail.com'`):
      - Strip `+tag`: `const localBase = localRaw.split('+')[0]`
      - Validate length: reject if `localBase.length < 6 || localBase.length > 30` with Gmail-specific error message
      - Validate chars: reject if `!GMAIL_RE.test(localBase)` with Gmail-specific error message
    - Non-Gmail branch: apply existing `EMAIL_RE.test(lowercased)` check unchanged
    - Pass `normalizedEmail` (not `email.value`) to both `authStore.register()` and `authStore.login()`
    - _Bug_Condition: `isGmailWithDots` — dots not stripped; `isGmailWithInvalidStructure` — no Gmail rules applied_
    - _Expected_Behavior: Gmail addresses submitted without dots; invalid Gmail structures rejected before API call_
    - _Preservation: Non-Gmail addresses validated by `EMAIL_RE` only; `+tag` counted in structural checks correctly_
    - _Requirements: 2.2, 2.3, 2.4, 3.4, 3.5, 3.6, 3.7_

  - [ ] 5.4 Update completeSetup() to call authStore.setSetupComplete() before checkAuth
    - Add `authStore.setSetupComplete()` call before `await authStore.checkAuth()` in `completeSetup()`
    - _Bug_Condition: `isSetupCompletedWithoutPersistence` — completeSetup navigates without persisting state_
    - _Expected_Behavior: localStorage has `omniscan_setup_complete = 'true'` before navigation_
    - _Preservation: `apiFetch PUT /api/users` call, `authStore.checkAuth()`, and `router.replace('/tabs/home')` are all unchanged_
    - _Requirements: 2.5, 3.9_

  - [ ] 5.5 Update skipForNow() to call authStore.setSetupComplete() before checkAuth
    - Add `authStore.setSetupComplete()` call before `await authStore.checkAuth()` in `skipForNow()`
    - _Bug_Condition: `isSetupCompletedWithoutPersistence` — skipForNow navigates without persisting state_
    - _Expected_Behavior: localStorage has `omniscan_setup_complete = 'true'` before navigation_
    - _Preservation: `authStore.checkAuth()` and `router.replace('/tabs/home')` calls are unchanged_
    - _Requirements: 2.6, 3.10_

- [ ] 6. Create DietarySetupBanner.vue component

  - [ ] 6.1 Create the component file with template, script, and styles
    - Create `omniscan-ui/src/components/DietarySetupBanner.vue` as a new file
    - Template: white rounded card (`border-radius: 16px`, `box-shadow`, `margin-bottom: 16px`) — NOT a full-page overlay
    - Include `ion-icon` with `nutritionOutline` icon (accent green `#05c450`)
    - Heading: `"Complete Your Setup"`, subtitle: `"Tell us your dietary preferences so we can personalise your experience."`
    - "Set Up Now" button: calls `authStore.setSetupComplete()` then `router.push('/tabs/profile')`
    - "Skip" button: calls `authStore.setSetupComplete()` only (reactive update hides banner via parent `v-if`)
    - Import `useAuthStore` from `@/stores/authStore` and `useRouter` from `vue-router`
    - Import `IonIcon`, `IonButton` from `@ionic/vue` and `nutritionOutline` from `ionicons/icons`
    - _Bug_Condition: `DietarySetupBanner.vue` does not exist — HomePage.vue cannot surface onboarding prompt_
    - _Expected_Behavior: component renders when `hasCompletedSetup` is false; "Skip" dismisses it reactively_
    - _Requirements: 2.8, 2.9, 2.10_

- [ ] 7. Update HomePage.vue to mount DietarySetupBanner conditionally

  - [ ] 7.1 Import DietarySetupBanner and useAuthStore in HomePage.vue
    - Add `import DietarySetupBanner from '@/components/DietarySetupBanner.vue'`
    - Add `import { useAuthStore } from '@/stores/authStore'`
    - Add `const authStore = useAuthStore()` in `<script setup>`
    - _Requirements: 2.8_

  - [ ] 7.2 Add banner to template with v-if guard
    - Add `<DietarySetupBanner v-if="!authStore.hasCompletedSetup" />` as the first child of `.home-wrap`
    - Use `v-if` (not `v-show`) to fully unmount the component when dismissed
    - Placed inside `ion-content` / `.home-wrap` so it scrolls naturally with page content
    - _Bug_Condition: `HomePage.vue` has no conditional block tied to setup state_
    - _Expected_Behavior: banner visible when `hasCompletedSetup` is false; reactively unmounts when it becomes true_
    - _Preservation: Greeting row, existing content structure, and all other template elements are unchanged_
    - _Requirements: 2.8, 2.9, 3.11_

- [ ] 8. Verify bug condition exploration tests now pass
  - **Property 1: Expected Behavior** - Email Normalization, Gmail Validation & Setup Persistence
  - **IMPORTANT**: Re-run the SAME tests from tasks 1 and 2 — do NOT write new tests
  - The tests from tasks 1 and 2 encode the expected behavior; passing now confirms fixes are correct

  - [ ] 8.1 Verify email normalization and Gmail validation exploration tests pass (from task 1)
    - Re-run tests 1a, 1b, 1c against fixed code
    - Test 1a: `email.value` should now be `'user@example.com'` after normalizeEmail runs — PASSES
    - Test 1b: `authStore.register` should be called with `'testuser@gmail.com'` (dots stripped) — PASSES
    - Test 1c: form should show Gmail validation error and not advance to step 2 — PASSES
    - **EXPECTED OUTCOME**: All tests PASS (confirms email bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 8.2 Verify setup persistence exploration tests pass (from task 2)
    - Re-run tests 2a, 2b, 2c against fixed code
    - Test 2a: `localStorage.getItem('omniscan_setup_complete')` should be `'true'` after `completeSetup()` — PASSES
    - Test 2b: `localStorage.getItem('omniscan_setup_complete')` should be `'true'` after `skipForNow()` — PASSES
    - Test 2c: `authStore.hasCompletedSetup` should be `false` (initialized, not undefined) — PASSES
    - **EXPECTED OUTCOME**: All tests PASS (confirms setup persistence bug is fixed)
    - _Requirements: 2.5, 2.6, 2.7_

- [ ] 9. Verify preservation tests still pass
  - **Property 2: Preservation** - Non-Gmail Validation & Existing Auth Flow Unchanged
  - **IMPORTANT**: Re-run the SAME tests from task 3 — do NOT write new tests
  - Re-run tests 3a through 3e against fixed code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
  - Confirm non-Gmail email validation, password checks, duplicate-email error, post-logout navigation, and banner-hidden-when-complete behaviors are all unchanged
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

- [ ] 10. Checkpoint — Ensure all tests pass
  - Run the full Vitest suite for the affected files
  - Confirm zero failures across all exploration tests (tasks 1 and 2), preservation tests (task 3), and any existing tests that exercise `authStore`, `RegisterPage.vue`, and `HomePage.vue`
  - Verify `DietarySetupBanner` mounts correctly in a browser/emulator when `hasCompletedSetup` is `false` and unmounts reactively when "Skip" is tapped
  - Verify `localStorage` is cleared correctly after `logout()` so a fresh registration sees the banner again
  - Ask the user if questions arise
