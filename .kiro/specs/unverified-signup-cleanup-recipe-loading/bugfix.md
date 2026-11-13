# Bugfix Requirements Document

## Introduction

Four related defects in sign-up and recipe flows:

1. Email/password registration saves the chosen username to the database immediately, before the email is verified. An unverified (possibly abandoned or mistyped) registration therefore reserves the username and blocks everyone else from using it.
2. Unverified accounts are never removed. They stay in the database forever, and the UI never tells the user that an unverified account has a limited lifetime.
3. "Sign up with Google" for a Google email that already has an account signs that user in and sends them to Home instead of telling them the account already exists.
4. Tapping "Make Recipe" gives no visual feedback while the request runs, so users can tap again or think nothing happened.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits the email/password registration form with a username THEN the system saves that username on the new (unverified) user row immediately, before the email is verified.

1.2 WHEN a username is held by an unverified registration THEN the system reports it as taken (username availability check and registration both reject it), so a different person cannot register that username.

1.3 WHEN a user account has stayed unverified for more than 7 days THEN the system keeps the account and its related rows in the database indefinitely.

1.4 WHEN a user is on the Register page (email/account details step) or on the Check Your Email screen THEN the system shows no notice that an unverified account is automatically deleted after 7 days, and the verification email carries no such notice either.

1.5 WHEN a user taps "Sign up with Google" and the Google email already belongs to an existing account THEN the system signs that user in (issues a session token) and redirects them to Home instead of staying on the Register page with an error.

1.6 WHEN a user confirms "Make Recipe" THEN the system shows no loading indicator while the make request is in progress, and the user can trigger the action again.

### Expected Behavior (Correct)

2.1 WHEN a user submits the email/password registration form THEN the system SHALL NOT persist the username on the user row (it SHALL be held as pending only) and SHALL persist it only when the email is verified.

2.2 WHEN a username is only pending on an unverified registration THEN the system SHALL treat it as available (availability check and registration SHALL NOT reject it), so a different person can register and verify that username. IF two pending registrations race and one verifies first THEN the system SHALL give the username to the first to verify and leave the other verified account without a username instead of failing verification.

2.3 WHEN a user account is unverified, is not a Google-linked account, and was created more than 7 days ago (named constant `UNVERIFIED_ACCOUNT_RETENTION_DAYS = 7`) THEN the system SHALL permanently delete that account and its related rows in the scheduled cleanup, safely and without foreign-key errors.

2.4 WHEN a user is on the Register page (email step) or the Check Your Email screen THEN the system SHALL display the disclaimer "Verify your email within 7 days or your account will be automatically deleted.", and the verification email SHALL include a short line saying the same.

2.5 WHEN a user taps "Sign up with Google" and an account with that Google email already exists THEN the system SHALL NOT sign the user in or store any token or session, SHALL respond with HTTP 409 / the web redirect error code `account_exists`, and the Register page SHALL stay in place and show the error toast "Account already exist".

2.6 WHEN a user confirms "Make Recipe" THEN the system SHALL show a loading indicator (spinner on the Make Recipe button, button disabled, and a page-level loading overlay) until the request completes, SHALL ignore repeat taps while it runs, and SHALL clear the loading state on success and on error.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user verifies their email through the verification link THEN the system SHALL CONTINUE TO mark the account verified, clear the token, send the welcome email, and return a fresh session token and user.

3.2 WHEN a user registers with a new, valid email and an unclaimed username THEN the system SHALL CONTINUE TO send the verification email first, create the user and dietary profile in one transaction, and respond with `requiresVerification: true`.

3.3 WHEN a user registers with an email that has an unverified account THEN the system SHALL CONTINUE TO resend a fresh verification email subject to the 60-second cooldown, and WHEN the email belongs to a verified account THEN the system SHALL CONTINUE TO reject it.

3.4 WHEN a username is held by a verified account (email or Google) THEN the system SHALL CONTINUE TO report it as taken in both the availability check and registration.

3.5 WHEN the cleanup runs THEN the system SHALL CONTINUE TO never delete verified accounts, Google-linked accounts, or admins (admins live in a separate table and are never selected), and SHALL CONTINUE TO run the existing pantry cleanup and 180-day archive and delete-after-archive lifecycle unchanged.

3.6 WHEN an existing user taps "Sign in with Google" on the Login page (sign-in intent) THEN the system SHALL CONTINUE TO sign them in and redirect to Home, including restoring ARCHIVED accounts.

3.7 WHEN a new Google user (no existing account) signs up THEN the system SHALL CONTINUE TO receive a pending token, pre-fill the Register form, and create a verified account with their chosen username.

3.8 WHEN the user logs in by email with an unverified account THEN the system SHALL CONTINUE TO respond 403 with the email so the resend flow works.

3.9 WHEN a recipe is made successfully THEN the system SHALL CONTINUE TO show the "Recipe marked as made!" toast, update pantry quantities, move the recipe to the Made list, and open the result view; the confirmation alert and allergen warning behavior SHALL CONTINUE TO be unchanged.

3.10 WHEN the Register and Login pages are rendered THEN the system SHALL CONTINUE TO use their existing layout, styles and dark-mode appearance (changes are additive only).
