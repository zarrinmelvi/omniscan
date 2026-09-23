# Bugfix Requirements Document

## Introduction

Three distinct defects exist in the OmniScan Ionic Vue app:

1. **Email Normalization & Gmail Validation (RegisterPage.vue):** Email input is never lowercased, dots are never stripped from the local-part before sending to the API, and Gmail/Googlemail addresses receive no domain-specific structural validation. This lets duplicate Gmail accounts slip through (e.g. `test.user@gmail.com` and `testuser@gmail.com` resolve to the same mailbox), allows mixed-case addresses that won't match on re-login, and permits structurally invalid Gmail local-parts that Gmail itself would reject.

2. **Onboarding Completion State (RegisterPage.vue + authStore.ts + HomePage.vue):** When a user completes dietary-preferences setup or skips it, the app navigates to the home tab but never records that setup is done. Consequently, `authStore.hasCompletedSetup` does not exist, nothing persists the completion in `localStorage`, and `HomePage.vue` has no way to conditionally show or hide a "complete your dietary preferences" banner — so the banner would appear on every visit even after the user has already finished onboarding.

3. **Missing DietarySetupBanner Component:** There is no `DietarySetupBanner.vue` component, so `HomePage.vue` cannot surface the dietary-preferences prompt to users who skipped or haven't yet completed setup.

The post-logout navigation (redirect to `'/'`) and Login page back button (`router.push('/')`) are already correctly implemented and are preserved as-is.

---

## Bug Analysis

### Current Behavior (Defect)

**Email Normalization & Gmail Validation**

1.1 WHEN a user types an email address into the registration form THEN the system does not convert the input to lowercase, allowing mixed-case values (e.g. `User@Gmail.COM`) to reach the API.

1.2 WHEN a user submits a Gmail or Googlemail address whose local-part contains dots (e.g. `test.user@gmail.com`) THEN the system sends the dotted form to the API without stripping dots, so the backend treats it as a distinct address from `testuser@gmail.com`.

1.3 WHEN a user submits a Gmail or Googlemail address THEN the system applies only the generic KNOWN_TLDS regex and does not enforce Gmail-specific local-part rules (length 6–30, allowed characters a-z/0-9/., no leading/trailing/consecutive dots, no underscores or hyphens).

1.4 WHEN a Gmail local-part has a `+` sub-address tag (e.g. `user+tag@gmail.com`) THEN the system does not strip the `+tag` before applying the Gmail structural rules, so the sub-address is incorrectly counted as part of the validated local-part.

**Onboarding Completion State**

1.5 WHEN "Complete Setup" succeeds THEN the system navigates to `/tabs/home` without writing `'true'` to `localStorage` key `omniscan_setup_complete` and without updating any reactive store flag, so the completion is not persisted across page loads.

1.6 WHEN "Skip for now" is tapped THEN the system navigates to `/tabs/home` without writing `'true'` to `localStorage` key `omniscan_setup_complete` and without updating any reactive store flag.

1.7 WHEN the app starts or a page loads THEN `authStore.hasCompletedSetup` does not exist as a reactive field, so no component can reactively observe or respond to the setup completion state.

1.8 WHEN a user lands on `HomePage.vue` after skipping or not completing dietary-preferences setup THEN the system shows no prompt or banner about completing setup, because neither `DietarySetupBanner.vue` nor any conditional rendering tied to setup state exists in `HomePage.vue`.

1.9 WHEN `authStore.hasCompletedSetup` transitions from `false` to `true` THEN the dietary-preferences banner in `HomePage.vue` does not disappear (the component does not exist, so there is nothing to react to the state change).

---

### Expected Behavior (Correct)

**Email Normalization & Gmail Validation**

2.1 WHEN a user types into the email field THEN the system SHALL automatically convert every character to lowercase on each keystroke (via `@input` handler or `v-model` watcher), so the displayed and stored value is always lowercase.

2.2 WHEN a user submits the registration form THEN the system SHALL strip all dots from the local-part of the email address (everything before `@`) before sending the value to the API, so `test.user@gmail.com` and `testuser@gmail.com` are treated as the same address by the backend.

2.3 WHEN the email domain is `gmail.com` or `googlemail.com` (case-insensitively, after lowercasing) THEN the system SHALL apply Gmail-specific validation before the generic TLD check:
  - Strip any `+tag` sub-address from the local-part (everything after the first `+` before `@`).
  - After stripping the `+tag`, the local-part SHALL be 6–30 characters long.
  - The local-part SHALL contain only lowercase letters (a–z), digits (0–9), and periods (`.`).
  - The local-part SHALL NOT begin with a dot, end with a dot, or contain consecutive dots.
  - The local-part SHALL NOT contain underscores (`_`), hyphens (`-`), or any character outside the allowed set.
  - If any of these rules are violated, the system SHALL display a validation error and SHALL NOT submit the form.

2.4 WHEN the email domain is NOT `gmail.com` or `googlemail.com` THEN the system SHALL continue to apply only the existing `KNOWN_TLDS` allowlist regex, unchanged.

**Onboarding Completion State**

2.5 WHEN "Complete Setup" succeeds THEN the system SHALL synchronously write `'true'` to `localStorage` key `omniscan_setup_complete` before navigating, and SHALL call `authStore.setSetupComplete()` to set `hasCompletedSetup` to `true`.

2.6 WHEN "Skip for now" is tapped THEN the system SHALL synchronously write `'true'` to `localStorage` key `omniscan_setup_complete` before navigating, and SHALL call `authStore.setSetupComplete()` to set `hasCompletedSetup` to `true`.

2.7 WHEN the auth store is created THEN the system SHALL initialize `hasCompletedSetup` from `localStorage` (reading `omniscan_setup_complete === 'true'`), so the correct state is available immediately on app start and after page refresh.

2.8 WHEN `authStore.hasCompletedSetup` is `false` and the user is on `HomePage.vue` THEN the system SHALL render the `DietarySetupBanner` component as a visible overlay or banner.

2.9 WHEN `authStore.hasCompletedSetup` becomes `true` (reactively) THEN the system SHALL immediately unmount/hide the `DietarySetupBanner` without requiring a browser refresh.

2.10 WHEN the `DietarySetupBanner` is rendered THEN the system SHALL display a prompt instructing the user to complete their dietary preferences setup, a "Set Up Now" button that navigates to the dietary-preferences step (e.g. `/register` at step 2 or the relevant route), and a "Skip" button that calls `authStore.setSetupComplete()` to hide the banner.

---

### Unchanged Behavior (Regression Prevention)

**Post-Logout Navigation & Login Back Button**

3.1 WHEN a user logs out via `ProfilePage.vue` THEN the system SHALL CONTINUE TO redirect to `'/'` (welcome screen) using `router.replace('/')`.

3.2 WHEN the Login page back button is tapped THEN the system SHALL CONTINUE TO navigate to `'/'` using `router.push('/')`.

3.3 WHEN a 401 response is received and the current route name is not `'welcome'` THEN the system SHALL CONTINUE TO push `{ path: '/' }` via the `api.ts` interceptor.

**Email Validation — Non-Gmail Domains**

3.4 WHEN a valid non-Gmail email is submitted (e.g. `user@example.com`, `admin@company.org`) THEN the system SHALL CONTINUE TO accept it, provided the TLD matches the existing `KNOWN_TLDS` allowlist.

3.5 WHEN an email with an unrecognised TLD is submitted (e.g. `user@example.xy`) THEN the system SHALL CONTINUE TO reject it with a validation error before submitting.

**Existing Registration & Auth Flow**

3.6 WHEN a valid, unique email and matching passwords are submitted on step 1 THEN the system SHALL CONTINUE TO call `authStore.register()` then `authStore.login()` and advance to step 2 (dietary preferences).

3.7 WHEN a duplicate email is submitted THEN the system SHALL CONTINUE TO display "This email address already exists." with the email field highlighted in red.

3.8 WHEN passwords do not match THEN the system SHALL CONTINUE TO display a mismatch error without submitting.

3.9 WHEN "Complete Setup" is tapped and the API call succeeds THEN the system SHALL CONTINUE TO call `authStore.checkAuth()` before navigating to `/tabs/home`.

3.10 WHEN "Skip for now" is tapped THEN the system SHALL CONTINUE TO call `authStore.checkAuth()` before navigating to `/tabs/home`.

3.11 WHEN `authStore.hasCompletedSetup` is `true` THEN the system SHALL CONTINUE TO show the `HomePage.vue` dashboard without any setup banner visible.

---

## Bug Condition Pseudocode

### Bug Condition Functions

```pascal
FUNCTION isEmailNotLowercased(X)
  INPUT: X of type EmailInput { raw: string }
  OUTPUT: boolean
  RETURN X.raw ≠ X.raw.toLowerCase()
END FUNCTION

FUNCTION isGmailWithDots(X)
  INPUT: X of type EmailInput { localPart: string, domain: string }
  OUTPUT: boolean
  RETURN (X.domain = 'gmail.com' OR X.domain = 'googlemail.com')
    AND X.localPart.contains('.')
END FUNCTION

FUNCTION isGmailWithInvalidStructure(X)
  INPUT: X of type EmailInput { localPart: string, domain: string }
  OUTPUT: boolean
  // Strip +tag before checking
  LET base ← localPart up to first '+' (or full localPart if no '+')
  RETURN (X.domain = 'gmail.com' OR X.domain = 'googlemail.com')
    AND (
      length(base) < 6
      OR length(base) > 30
      OR base matches /[^a-z0-9.]/
      OR base starts with '.'
      OR base ends with '.'
      OR base contains '..'
    )
END FUNCTION

FUNCTION isSetupCompletedWithoutPersistence(X)
  INPUT: X of type OnboardingEvent { action: 'complete' | 'skip' }
  OUTPUT: boolean
  RETURN X.action IN ['complete', 'skip']
    AND localStorage.getItem('omniscan_setup_complete') ≠ 'true'
END FUNCTION
```

### Property Specifications

```pascal
// Property: Fix Checking — Email Lowercasing
FOR ALL X WHERE isEmailNotLowercased(X) DO
  result ← emailField'(X)
  ASSERT result.displayedValue = X.raw.toLowerCase()
END FOR

// Property: Fix Checking — Gmail Dot Stripping
FOR ALL X WHERE isGmailWithDots(X) DO
  result ← submitPayload'(X)
  ASSERT result.email.localPart does NOT contain '.'
END FOR

// Property: Fix Checking — Gmail Structural Validation
FOR ALL X WHERE isGmailWithInvalidStructure(X) DO
  result ← handleRegister'(X)
  ASSERT result = ValidationError AND formNotSubmitted
END FOR

// Property: Fix Checking — Setup Completion Persistence
FOR ALL X WHERE isSetupCompletedWithoutPersistence(X) DO
  result ← completeOrSkip'(X)
  ASSERT localStorage.getItem('omniscan_setup_complete') = 'true'
    AND authStore.hasCompletedSetup = true
END FOR
```

### Preservation Goal

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isEmailNotLowercased(X)
             AND NOT isGmailWithDots(X)
             AND NOT isGmailWithInvalidStructure(X) DO
  ASSERT F(X) = F'(X)  // non-Gmail validation, form flow, and navigation unchanged
END FOR
```
