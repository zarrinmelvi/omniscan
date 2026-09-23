# Bugfix Requirements Document

## Introduction

Four bugs were reported affecting navigation safety, email validation, and onboarding completion
state in the OmniScan Ionic Vue app (`omniscan-ui/src`).

After auditing the source, two bugs were **already correctly implemented** in the codebase and
required no changes. Two bugs were **confirmed present** and have been fixed.

| # | Description | Status |
|---|-------------|--------|
| 1 | Post-logout navigation → `/login` instead of `/` | ✅ Already correct in `ProfilePage.vue` and `api.ts` |
| 2 | Login back button uses `router.back()` (blank-screen risk) | ✅ Already correct in `LoginPage.vue` |
| 3 | `EMAIL_RE` missing `.online` and `.store` TLDs | 🔧 Fixed in `RegisterPage.vue` |
| 4 | `skipForNow()` navigates without refreshing `authStore` | 🔧 Fixed in `RegisterPage.vue` |

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user enters a valid email address ending in `.online` (e.g. `user@shop.online`) during registration THEN the system rejects it as an invalid email address because `online` was absent from the `KNOWN_TLDS` allowlist

1.2 WHEN the user enters a valid email address ending in `.store` (e.g. `user@brand.store`) during registration THEN the system rejects it as an invalid email address because `store` was absent from the `KNOWN_TLDS` allowlist

1.3 WHEN the user taps "Skip for now" on the onboarding step 2 THEN the system navigates to `/tabs/home` without calling `authStore.checkAuth()`, leaving downstream pages with potentially stale auth state until a manual browser refresh

---

### Expected Behavior (Correct)

2.1 WHEN the user taps "Log Out" in ProfilePage THEN the system SHALL clear the auth session and navigate to the root landing page `/` using `router.replace('/')` *(already implemented)*

2.2 WHEN a 401 Unauthorized response is received on a non-admin API call THEN the system SHALL clear the auth session and redirect to `/` *(already implemented — guard uses `!== 'welcome'`)*

2.3 WHEN the user taps the back button on the Login screen THEN the system SHALL navigate safely to `/` using `router.push('/')` *(already implemented)*

2.4 WHEN the user enters an email address ending in `.online` or `.store` THEN the system SHALL accept it as valid — these are ICANN-registered generic TLDs and must be part of the recognised allowlist

2.5 WHEN the user enters an email address with an unrecognised fake TLD (e.g. `.xy`, `.zz`) THEN the system SHALL continue to reject it as invalid

2.6 WHEN the user taps "Skip for now" on the onboarding step 2 THEN the system SHALL call `authStore.checkAuth()` to synchronously refresh auth state before navigating to `/tabs/home`, matching the same pattern used by "Complete Setup"

2.7 WHEN the user taps "Complete Setup" and preferences save successfully THEN the system SHALL call `authStore.checkAuth()` then navigate to `/tabs/home` *(already implemented in `completeSetup()`)*

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user enters a correctly formatted email address with any TLD already in the `KNOWN_TLDS` allowlist THEN the system SHALL CONTINUE TO accept it as valid

3.2 WHEN the user enters a fake TLD not in the allowlist (e.g. `.xy`, `.zz`, `.lol`) THEN the system SHALL CONTINUE TO reject it

3.3 WHEN a 401 Unauthorized response is received on an admin API call THEN the system SHALL CONTINUE TO log out the admin session and redirect to `/admin/login`

3.4 WHEN the user taps "Log Out" from the admin panel THEN the system SHALL CONTINUE TO redirect to `/admin/login`

3.5 WHEN the user successfully logs in via LoginPage THEN the system SHALL CONTINUE TO navigate to `/tabs/home`

3.6 WHEN the back button is tapped on step 2 of the registration flow THEN the system SHALL CONTINUE TO navigate back to step 1 without losing entered data

3.7 WHEN the back button is tapped on step 1 of the registration flow AND history exists THEN the system SHALL CONTINUE TO navigate to the previous route

3.8 WHEN "Complete Setup" is tapped but the preferences API call fails THEN the system SHALL CONTINUE TO display the error message and remain on the setup screen

---

## Bug Condition Specifications

### Bug 3 — Missing `.online` / `.store` TLDs

**isBugCondition(email):**
```
email.endsWith('.online') OR email.endsWith('.store')
AND email matches format localPart@domain.TLD
```

**expectedBehavior(result):**
```
EMAIL_RE.test(email) === true
```

**Affected file:** `omniscan-ui/src/views/RegisterPage.vue`
**Change:** Added `|online|store` to the `KNOWN_TLDS` constant (second line of the multi-line string).

---

### Bug 4 — skipForNow missing authStore refresh

**isBugCondition():**
```
user taps "Skip for now" (skipForNow() invoked)
AND authStore.checkAuth() is not called before router.replace('/tabs/home')
```

**expectedBehavior(result):**
```
authStore.checkAuth() resolves successfully
AND router.replace('/tabs/home') is called after
```

**Affected file:** `omniscan-ui/src/views/RegisterPage.vue`
**Change:** Added `await authStore.checkAuth()` inside `skipForNow()` before `await router.replace('/tabs/home')`.
