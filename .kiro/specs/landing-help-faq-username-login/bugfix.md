# Bugfix Requirements Document

## Introduction

Two gaps in the public-facing OmniScan experience are addressed together.

1. The landing page (omniscan.website) has no Help and Support entry. Visitors who are not signed in cannot read the common questions (FAQ), which only exist inside the Settings page of the signed-in app. Only the FAQ is in scope. The Contact support form shown in the mockup is deferred.
2. Sign in accepts only an email address and password. Users who registered with a username cannot sign in with it. Sign in must accept either a username or an email in a single field, so accounts without a username are not locked out. Sign up, Google sign-in and the admin login stay as they are.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a visitor views the landing page footer THEN the system shows no "Help and Support" link, so there is no way to reach the FAQ without signing in.

1.2 WHEN a signed-out visitor wants to read the common questions THEN the system offers no public page for them. The questions and answers exist only inside SettingsPage.vue, behind authentication.

1.3 WHEN a user enters their username in the sign-in field THEN the system rejects it. The field is `type="email"` and labelled "Email Address", and the server runs `findUnique({ where: { email } })`, so the username is never matched.

1.4 WHEN a client posts `{ identifier, password }` to POST /api/auth/login THEN the system responds 400 "Email is required.", because only `email` is read.

1.5 WHEN a user who has signed up through Google (stored `password` is null) tries a password sign-in THEN the system passes a null hash to `bcrypt.compare`. This can throw and surface as a 500 "Failed to log in." instead of the generic invalid-credentials message.

1.6 WHEN a user enters their username and their email is unverified THEN the "Resend verification email" action has no usable email, because it reads the email field, which would now hold a username.

### Expected Behavior (Correct)

2.1 WHEN a visitor views the landing page footer THEN the system SHALL show a "Help and Support" link, in light and dark mode, on mobile and desktop.

2.2 WHEN a visitor clicks "Help and Support" THEN the system SHALL open a public Help and Support view, reachable without signing in and by direct URL. It SHALL show the eyebrow "HELP AND SUPPORT", the title "How can we help?", the subtitle, and a "Common questions" card with collapsible FAQ items.

2.3 WHEN the Help and Support view renders the FAQ THEN the system SHALL use the same questions and answers as the Settings FAQ, taken from one shared source. SettingsPage.vue SHALL import that source, so the two lists cannot drift apart.

2.4 WHEN the Help and Support view is shown THEN the system SHALL NOT render the Contact support form (name, email, topic, message, captcha, Send message), and SHALL omit the "Can't sign in? Contact support below." footer line, since it points to the out-of-scope form. The view SHALL include a way back to the landing page, plus the header Sign up and Sign in actions shown in the mockup.

2.5 WHEN the Help and Support view is shown in dark mode THEN the system SHALL use the app's navy theme (page #0f172a, card #1e293b, border #334155, primary text #f1f5f9, secondary text #94a3b8), not the mockup's green-black palette. Light mode SHALL follow the existing landing page styling.

2.6 WHEN a user enters a username or an email and a password and submits THEN the system SHALL authenticate against the matching account. The field SHALL be labelled "Username or email", use a text input (not `type="email"`), and disable browser email validation, autocapitalize and autocorrect.

2.7 WHEN POST /api/auth/login receives `identifier` THEN the system SHALL treat it as the login id. WHEN it receives only `email` (legacy clients) THEN the system SHALL treat `email` as the identifier, with identical behavior. WHEN both are sent THEN `identifier` SHALL take precedence.

2.8 WHEN the identifier contains "@" THEN the system SHALL look up the account by email. WHEN it contains no "@" THEN the system SHALL look up the account by username. Usernames only allow letters, numbers and underscores, so the two cannot collide. The identifier SHALL be trimmed before lookup.

2.9 WHEN the username lookup is performed THEN the system SHALL match the username case-insensitively. Usernames are stored with their original casing, `username` is unique and nullable in the schema, and sign-up checks uniqueness case-sensitively. A user typing "Juan_Dela" for "juan_dela" SHALL still sign in. WHEN more than one account matches case-insensitively THEN the system SHALL prefer the exact-case match, and otherwise fail with the generic invalid-credentials message.

2.10 WHEN no account matches, the password is wrong, or the matched account has no password (a Google-only account) THEN the system SHALL respond 401 with one generic message, "Invalid username/email or password.". It SHALL NOT reveal whether the username or email exists, SHALL NOT return a 500 for a null password, and SHALL take comparable time for unknown and known accounts.

2.11 WHEN credentials are valid but the email is unverified THEN the system SHALL still respond 403 with `requiresVerification: true` and the account's email in `data.email`. The login page SHALL use that email for "Resend verification email" when the user typed a username. WHEN the user typed an email, the page SHALL use the typed email as before.

2.12 WHEN the login request fails validation THEN the system SHALL respond 400 "Username or email is required." for a missing, non-string or blank identifier, and keep 400 "Password is required." for a missing password.

2.13 WHEN authStore.login is called THEN the system SHALL send `{ identifier, password }` and keep the method name and return type. This change to the request body is the only change to the call. The authStore SHALL still clear the admin session state before the request.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user signs in with a correct email and password and a verified email THEN the system SHALL CONTINUE TO return `{ token, user: { id, name, email, avatar_base64 }, message: 'Login successful' }` with a JWT carrying `userId`, `email` and `sid`, valid for 7 days.

3.2 WHEN a login succeeds THEN the system SHALL CONTINUE TO write a new `session_token` (so the older session is ended through the single-session SSE logic), set `last_active`, clear `inactivity_warning_sent_at`, and write the `LOGIN` audit event.

3.3 WHEN an ARCHIVED user signs in successfully THEN the system SHALL CONTINUE TO restore them to ACTIVE and clear `archived_at` and `inactivity_warning_sent_at`.

3.4 WHEN an unverified user supplies correct credentials THEN the system SHALL CONTINUE TO block login with 403 and `requiresVerification`. Credentials SHALL still be checked before this, so verification state is not revealed for a wrong password.

3.5 WHEN a user signs up (RegisterPage.vue, /api/auth/register, /api/auth/check-username, Google register) THEN the system SHALL CONTINUE TO behave exactly as before, including username validation and storage.

3.6 WHEN a user chooses "Sign in with Google" THEN the system SHALL CONTINUE TO use the existing Google flows unchanged.

3.7 WHEN an admin signs in at /api/admin/login THEN the system SHALL CONTINUE TO use the separate admin endpoint and store, unaffected by this change. /api/auth/login SHALL remain in the AUTH_EXEMPT_ENDPOINTS list.

3.8 WHEN a user opens "Forgot password?" THEN the system SHALL CONTINUE TO use the email-only forgot-password page and endpoint. The login form does not pre-fill it, and "Remember me" does not persist the identifier (it is only a local ref), so nothing is stored differently.

3.9 WHEN a signed-in user opens Settings > FAQ THEN the system SHALL CONTINUE TO show the same questions and answers, numbered badges, accordion behavior and existing styles (faq-question-label, faq-answer-text), including their dark-mode rules in dark-mode.css, which SHALL NOT be edited.

3.10 WHEN the landing page and existing routes (/, /login, /register, and so on) are used THEN the system SHALL CONTINUE TO work, with no renames of existing functions, routes or fields. The new public help route SHALL NOT require authentication and SHALL NOT trigger redirects for signed-out visitors.

3.11 WHEN the existing checks are run THEN the nitro-app vitest suite (19 files, 171 tests, including the account-lifecycle login tests that post `{ email, password }`) SHALL CONTINUE TO pass, and omniscan-ui vue-tsc SHALL CONTINUE TO report only the 6 known errors in src/utils/appBadge.ts and src/utils/reminderScheduler.ts.

---

## Addendum: Remove the "middle name" option (sign up and edit profile)

The user approved the spec above and asked to "remove the 'middle name' option completely (in sign up & edit profile)". The items below are appended. Items 1.1 to 3.11 above are unchanged. This is a UI-only removal. Code investigation found there is no `middle_name` column in `prisma/schema.prisma`, and no endpoint or test reads or writes one. The User model stores `name`, `first_name` and `last_name` only. Middle name currently exists only as a UI feature that folds the middle part into `first_name` (stored as "First Middle").

### Current Behavior (Defect)

1.7 WHEN a user is on sign-up step 1 (RegisterPage.vue) THEN the system shows a "+ Add middle name (optional)" link. It toggles a "Middle name" input (`maxlength="21"`), and the link text changes to "- Remove middle name".

1.8 WHEN a user submits the email sign-up form THEN the system joins first and middle name with a space (`[firstName, middleName].filter(Boolean).join(' ')`) and sends the result as `first_name` to POST /api/auth/register. The server stores it as `first_name`, so a middle name ends up inside `first_name` and `name`. The form reset also clears `middleName`.

1.9 WHEN a user opens Edit Profile (ProfilePage.vue) THEN the system splits the stored `first_name` on the first space. The first word becomes First Name and the remainder becomes a separate Middle name input. The input is shown through the same "+ Add middle name (optional)" / "- Remove middle name" link, which is pre-opened when a middle part exists.

1.10 WHEN a user saves Edit Profile THEN the system joins first and middle name into `first_name` and builds `name` as first + middle + last. The unsaved-changes check also compares `form.middleName` with `initialForm.middleName`.

### Expected Behavior (Correct)

2.14 WHEN a user is on sign-up step 1 THEN the system SHALL NOT show the "+ Add middle name (optional)" / "- Remove middle name" link or any middle name input. Both the email and Google paths SHALL show only First name and Last name. The `middleName` and `showMiddleName` state and the `.add-middle-link` markup SHALL be removed from RegisterPage.vue.

2.15 WHEN a user submits sign-up (email path) THEN the system SHALL send `first_name` as `firstName.value.trim()` and `last_name` as `lastName.value.trim()`, and SHALL NOT send or build any middle part. The Google sign-up path SHALL stay as is (it already sends the Google first and last name, never a middle name).

2.16 WHEN a user opens Edit Profile THEN the system SHALL show only First Name and Last Name, with no middle name link or input. The `middleName` fields (in `form` and `initialForm`), `showMiddleName`, and its resets after save and on discard SHALL be removed from ProfilePage.vue.

2.17 WHEN Edit Profile is opened for a user whose stored `first_name` contains more than one word (for example "Juan Santos", saved earlier with a middle name) THEN the system SHALL show the entire stored `first_name` in the First Name field and the stored `last_name` in the Last Name field. It SHALL NOT split on spaces. Nothing is lost, and the user can edit the value freely. When `first_name` is empty, the system SHALL fall back to the stored `name`, as it does today. The First Name input SHALL keep `maxlength="16"` for typing, and a longer pre-filled value SHALL NOT be truncated on open or on save unless the user edits it.

2.18 WHEN a user saves Edit Profile THEN the system SHALL send `first_name` as `form.firstName.trim()` and `last_name` as `form.lastName.trim()`, and `name` as first + last joined by one space. It SHALL NOT silently drop or rewrite a multi-word first name the user did not change. PUT /api/users keeps recomputing `name` from `first_name` and `last_name`, so a saved `name` and the stored `first_name`/`last_name` stay consistent.

2.19 WHEN the user edits First Name or Last Name in Edit Profile THEN the unsaved-changes detection SHALL keep working: it compares `firstName`, `lastName`, `username`, and the other tracked fields, with the `middleName` comparison removed. An untouched form SHALL report no changes, and any edited field SHALL report changes.

2.20 WHEN the middle-name UI styles are no longer used THEN the system SHALL remove the `.add-middle-link` rule from RegisterPage.vue and ProfilePage.vue (including its dark-mode rule in ProfilePage.vue). The `ui-preservation` snapshot (`nitro-app/server/tests/fixtures/ui-preservation-snapshot.json`) SHALL be updated deliberately for this one RegisterPage.vue light rule only (the line `.add-middle-link { ... }`) and nothing else in the snapshot SHALL change. dark-mode.css SHALL NOT be edited (it has no middle-name rule).

2.21 WHEN the database and API are considered THEN the system SHALL NOT drop any column, run any migration, or delete or rewrite stored data. There is no `middle_name` column to stop writing to. The API endpoints (POST /api/auth/register, POST /api/auth/google/register, PUT /api/users) already accept only `first_name` and `last_name` and SHALL stay unchanged for backward compatibility.

### Unchanged Behavior (Regression Prevention)

3.12 WHEN a user fills in First name and Last name on sign-up THEN the system SHALL CONTINUE TO validate them as before (both required, First name `maxlength="16"`, Last name unchanged) with the same error highlighting, and the server SHALL CONTINUE TO require both and build `name` as "first last".

3.13 WHEN a user signs up or edits a profile THEN the system SHALL CONTINUE TO handle username (including availability check), gender, birthday, email, password rules, the Terms and Conditions flow, and step 2 preferences exactly as before.

3.14 WHEN a user starts Google sign-up THEN the system SHALL CONTINUE TO prefill First name and Last name from the Google profile, with the email locked as before.

3.15 WHEN an admin views the user list THEN the system SHALL CONTINUE TO display names in the admin portal as before. AdminManageUserProfile.vue and the admin endpoints SHALL NOT be changed.

3.16 WHEN a user's stored `name`, `first_name` or `last_name` already exist THEN the system SHALL CONTINUE TO return and display them unchanged everywhere outside the Edit Profile form (Profile view, Settings, greetings). No stored data is rewritten by this change.

3.17 WHEN the existing checks are run THEN the nitro-app vitest suite (19 files, 171 tests) SHALL CONTINUE TO pass, including `ui-preservation.test.ts` against the deliberately updated snapshot (2.20). omniscan-ui vue-tsc SHALL CONTINUE TO report only the 6 known errors in src/utils/appBadge.ts and src/utils/reminderScheduler.ts. No test currently covers middle name (searched `nitro-app/server/tests`; the only match is the snapshot line).

### Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ProfileOrSignupScreen
  OUTPUT: boolean

  RETURN X.screen IN {SignUpStep1, EditProfile}
         AND X.showsMiddleNameLinkOrInput = true
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← render'(X)
  ASSERT result.hasNoMiddleNameLinkOrInput
     AND result.requestBody.first_name = firstNameField.trim()   // no middle part joined
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

Counterexample: opening Edit Profile for a user with `first_name = "Juan Santos"` and `last_name = "Cruz"` shows First Name "Juan" and a Middle name "Santos". After the fix it SHALL show First Name "Juan Santos" and Last Name "Cruz" with no middle field.

### Open Points for the User

- No `middle_name` column exists, so there is nothing to stop writing to and no migration is needed. If you expected a database column, please say so.
- Existing users with a stored middle part will see it inside their First Name field (rule 2.17) instead of being hidden or split. They can remove it by editing. Say so if you prefer a different rule, for example moving the middle part into the Last Name.
- A pre-filled First Name longer than 16 characters is kept as is (not truncated) until the user edits it.
