# Implementation Plan

## Overview

Implement email verification for OmniScan's registration flow using the Resend API. New users must verify their email address before logging in. The feature includes token generation, email delivery, verification endpoints, frontend pages, a grandfather migration for existing users, and a cleanup job for abandoned accounts.

## Tasks

- [x] 1. Setup Resend API Integration
  - Install the `resend` package in `nitro-app/`: `npm install resend`
  - Add environment variables to `nitro-app/.env`: `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`
  - Confirm the package imports without errors
  - _Requirements: REQ-001_

- [x] 2. Update Database Schema
  - Add `email_verified Boolean @default(false)` to the `User` model in `nitro-app/prisma/schema.prisma`
  - Add `verification_token String? @unique`
  - Add `verification_token_expires_at DateTime?`
  - Add `last_verification_sent_at DateTime?` (used for 60-second resend cooldown)
  - Run `bunx prisma migrate dev --name add_email_verification` to apply changes
  - Regenerate the Prisma client with `bunx prisma generate`
  - _Requirements: REQ-001, REQ-003, REQ-005_

- [x] 3. Create Email Service Utility
  - Create `nitro-app/server/utils/email.ts`
  - Implement `generateVerificationToken()` using `crypto.randomBytes(32).toString('base64url')`
  - Implement `sendVerificationEmail(email, name, token)` calling the Resend API with the verification link HTML template
  - Implement `sendWelcomeEmail(email, name)` calling the Resend API with the welcome HTML template
  - Add error handling that returns `{ success: boolean, error?: string }` for both send functions
  - _Requirements: REQ-001, REQ-007_

- [x] 4. Modify Registration Endpoint
  - Update `nitro-app/server/api/auth/register.post.ts`
  - Call `generateVerificationToken()` and set expiry to 24 hours from `Date.now()`
  - Send verification email via `sendVerificationEmail()` **before** creating the user record
  - If the email send fails, do **not** create the account and return HTTP 500 with a user-facing error message
  - Create the user with `email_verified: false`, `verification_token`, and `verification_token_expires_at` set
  - Return a response instructing the user to check their email
  - _Requirements: REQ-001, REQ-003, REQ-008_

- [x] 5. Create Email Verification Endpoint
  - Create `nitro-app/server/api/auth/verify/[token].get.ts`
  - Look up the user by `verification_token`; return HTTP 400 if not found
  - Return HTTP 400 if `email_verified` is already `true`
  - Return HTTP 400 if `verification_token_expires_at` is in the past
  - On success: set `email_verified: true`, clear `verification_token` and `verification_token_expires_at`
  - Trigger `sendWelcomeEmail()` asynchronously (non-blocking — failure must not block the response)
  - Return `{ success: true, redirectUrl: '/onboarding/terms' }`
  - _Requirements: REQ-002, REQ-003, REQ-007_

- [x] 6. Create Resend Verification Endpoint
  - Create `nitro-app/server/api/auth/resend-verification.post.ts`
  - Accept `{ email }` in the request body
  - Return HTTP 400 if the user is already verified
  - Check `last_verification_sent_at`; if fewer than 60 seconds have elapsed, return HTTP 429 with remaining seconds
  - Generate a new token, update `verification_token`, `verification_token_expires_at`, and `last_verification_sent_at`
  - Send the new verification email; return HTTP 500 if it fails
  - Return `{ success: true, message: 'Verification email sent! Please check your inbox.' }` on success
  - _Requirements: REQ-004, REQ-005_

- [x] 7. Modify Login Endpoint
  - Update `nitro-app/server/api/auth/login.post.ts`
  - After validating the password, check `user.email_verified`
  - If `false`, return HTTP 403 with `statusMessage: 'Please verify your email address. Check your inbox for the verification link.'` and `data: { requiresVerification: true }`
  - Verified users continue through the existing JWT issuance flow unchanged
  - _Requirements: REQ-002_

- [x] 8. Create CheckEmailPage.vue
  - Create `pages/auth/check-email.vue`
  - Read the user's email from the route query param (`?email=...`) set by the register page after successful registration
  - Display a "Check Your Email" message with the email address
  - Add a "Resend verification email" button that calls `/api/auth/resend-verification`
  - Implement a 60-second countdown timer that disables the button during cooldown
  - Show success and error feedback messages below the button
  - Add a tips section (check spam, link expires in 24 hours)
  - _Requirements: REQ-004, REQ-005_

- [x] 9. Create VerifyEmailPage.vue
  - Create `pages/auth/verify/[token].vue`
  - On mount, extract the token from the route param and call `GET /api/auth/verify/:token`
  - Show a loading spinner while the request is in flight
  - On success: display a success message and auto-redirect to `/onboarding/terms` after 2 seconds
  - On failure: display the error message from the API
  - For expired/invalid token errors, show a "Request new verification link" button that prompts for email and calls `/api/auth/resend-verification`
  - For "already verified" errors, show a "Go to Login" button
  - _Requirements: REQ-002, REQ-003, REQ-004_

- [x] 10. Update LoginPage.vue
  - Update `pages/auth/login.vue`
  - Detect HTTP 403 responses with `data.requiresVerification === true`
  - Display the error message returned by the API
  - Render a "Resend verification email" button beneath the error; pre-fill the email from the login form
  - Call `/api/auth/resend-verification` on click
  - Enforce the 60-second cooldown with a countdown display
  - Show a success message when resend succeeds
  - _Requirements: REQ-002, REQ-004, REQ-005_

- [x] 11. Create Grandfather Migration Script
  - Create `nitro-app/prisma/grandfather-existing-users.ts`
  - Update all users where `email_verified = false` AND `created_at` is before the feature launch date to `email_verified: true`, `verification_token: null`, `verification_token_expires_at: null`
  - Log the count of updated users to stdout
  - Design the script to be idempotent (safe to run multiple times without side effects)
  - Document the run command (`bunx tsx prisma/grandfather-existing-users.ts`) in the README
  - _Requirements: REQ-009_

- [x] 12. Create Cleanup Endpoint for Unverified Accounts
  - Create `nitro-app/server/api/cron/cleanup-unverified.get.ts`
  - Require a secret authorization header to prevent unauthorized access
  - Delete all users where `email_verified = false` AND `created_at < now() - 7 days`
  - Delete related `DietaryProfile` records first to satisfy foreign key constraints
  - Log the deleted account details (id, email, registeredAt) for audit purposes
  - Return `{ result: 'success', deleted: N }` with the count of removed accounts
  - Document the scheduling approach (Vercel cron or external scheduler) in a comment at the top of the file
  - _Requirements: REQ-006_

- [x] 13. Add email_verified to User Profile API Response
  - Locate the user profile `GET` endpoint and add `email_verified` to the selected fields returned to the client
  - Ensure the frontend can read verification status for conditional UI display (e.g., a verification badge)
  - _Requirements: REQ-002_

- [ ] 14. End-to-End Testing
  - Register with a fake/unreachable email and confirm the registration is blocked (email send failure path)
  - Register with a real email, receive the verification email, and confirm the full verification flow completes
  - Attempt to log in before verifying email and confirm the HTTP 403 block + resend button appears
  - Click the resend button twice within 60 seconds and confirm the cooldown is enforced
  - Manually expire a token in the database and confirm the "link expired" error + resend option appears
  - Complete verification and confirm the welcome email arrives
  - Run the grandfather migration script and confirm existing users can log in without verification
  - Manually set `created_at` to 8 days ago for a test account and run the cleanup endpoint; confirm the account is deleted and verified accounts are untouched
  - _Requirements: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3"] },
    { "id": 2, "tasks": ["4", "5", "6", "7"] },
    { "id": 3, "tasks": ["8", "9", "10", "11", "12", "13"] },
    { "id": 4, "tasks": ["14"] }
  ]
}
```

## Notes

- Tasks 1–7 are backend work and should be completed before the frontend tasks (8–10).
- Task 11 (grandfather migration) must be run **once immediately after deploying** to production to avoid locking out existing users.
- Task 12 (cleanup endpoint) is lower priority and can be scheduled after the MVP is live.
- Task 13 is a small independent change and can be done in parallel with any other task.
- The `last_verification_sent_at` field added in Task 2 is preferred over `updated_at` as a cooldown proxy because `updated_at` changes on every user record write, not just resend events.
- Never commit `nitro-app/.env` — confirm it is listed in `.gitignore` before adding the Resend API key.
