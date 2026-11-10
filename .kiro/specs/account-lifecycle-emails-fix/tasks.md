# Implementation Plan

Test notes: the project uses `vitest` (`npm test` runs `vitest run`, single execution). `fast-check` is not installed. Add it as a pinned devDependency (exact version) for the property-based tests. Tests use a mocked Prisma client and a mocked `server/utils/email.ts`.

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Account lifecycle emails and restore
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope each property to the concrete failing cases from isBugCondition (DELETE_RUN, USER_RETURN, ARCHIVE_RUN) to keep results reproducible
  - Add `fast-check` as a pinned devDependency if not present. Create the test file(s) under `nitro-app` using vitest with mocked Prisma and mocked email module
  - DELETE_RUN: ARCHIVED user with `archived_at` older than 7 days; invoke `server/api/cron/cleanup-archived.get.ts`; assert the user is deleted and `sendAccountDeletedEmail` is called once with the pre-deletion email and name, after `$transaction` resolves
  - Countdown stability: ARCHIVED user with old `archived_at` but recent `updated_at`; assert it is still deleted (unfixed code filters on `updated_at`)
  - USER_RETURN: ARCHIVED user within the grace period; invoke `login.post.ts`, `google/callback.get.ts`, `google/verify.post.ts` and the `session-stream.ts` heartbeat; assert status becomes ACTIVE, `archived_at` null, `inactivity_warning_sent_at` null, `last_active` refreshed
  - ARCHIVE_RUN: ACTIVE user inactive 180+ days; assert status ARCHIVED, `archived_at = now`, one archive email whose body tells the user to log in within 7 days. Run the archive step twice and assert only one email is sent
  - Edge case: force `$transaction` to throw; assert no deletion email is sent
  - Run tests on UNFIXED code with `npx vitest run`
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g. "no email call on deletion", "deletion keyed on `updated_at`", "no `status` write in re-entry paths", "archive email lacks 7-day login wording")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unaffected lifecycle behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code for inputs where isBugCondition is false: ACTIVE users under 180 days inactive, ARCHIVED users under 7 days since archival with no return, ACTIVE login/heartbeat, 30-day warning task, hard-delete transaction contents, pantry soft-delete, cron auth
  - Write property-based tests (fast-check) over random user states (status, `last_active`, `archived_at`, `inactivity_warning_sent_at`), including boundaries at exactly 180 and 7 days:
    - ACTIVE users under 180 days stay ACTIVE with no archive or deletion email
    - No 30-day inactivity warning email is sent (check that `/api/cron/inactivity-warning` is absent from `vercel.json` and `sendInactivityWarningEmail` is not sent); this check is expected to FAIL on unfixed code and pass after 3.10, so keep it in a separate test from the baseline-passing preservation tests
    - ARCHIVED users under 7 days since archival are neither deleted nor emailed
    - Hard delete removes activity logs, notifications, dietary profile, pantry items, recipe interactions, flagged scans, scans and the user in one transaction
    - Archived pantry items older than 7 days are soft-deleted; request without the correct `CRON_SECRET` is rejected
    - ACTIVE login and heartbeat still refresh `last_active`, clear `inactivity_warning_sent_at` and make no status change
    - Admin Manage User Profiles statuses (180/187 days, case-insensitive) and welcome, password reset and new-flag emails are unchanged
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. Fix for account lifecycle emails (deletion email, stable archival timestamp, restore on return, archive wording)

  - [x] 3.1 Add `archived_at` to the schema and write the migration
    - Add `archived_at DateTime?` to `User` in `nitro-app/prisma/schema.prisma`, next to `inactivity_warning_sent_at`
    - Check the table name (`@@map`) against existing migrations before writing SQL
    - Create `nitro-app/prisma/migrations/<timestamp>_add_user_archived_at/migration.sql`:
      `ALTER TABLE "User" ADD COLUMN "archived_at" TIMESTAMP(3);` then `UPDATE "User" SET "archived_at" = NOW() WHERE "status" = 'ARCHIVED' AND "archived_at" IS NULL;`
    - Backfill with `NOW()` so legacy ARCHIVED users get a full 7-day grace period and a deletion email
    - **Do NOT run the migration.** The user applies it manually with `prisma migrate deploy`. Remind the user to also run `prisma generate` afterwards so the client has `archived_at`
    - _Bug_Condition: isBugCondition(input) where input.kind = DELETE_RUN and user.status = 'ARCHIVED'_
    - _Expected_Behavior: archived_at is the stable archival timestamp (2.2)_
    - _Preservation: existing columns and migrations unchanged_
    - _Requirements: 2.2_

  - [x] 3.2 Add `sendAccountDeletedEmail` and reword the archive email
    - In `nitro-app/server/utils/email.ts`, add `buildAccountDeletedEmailHtml(name)` and `sendAccountDeletedEmail(email, name)` using the same Resend pattern and `EmailResult` return as `sendAccountArchivedEmail`, with a sign-up link
    - Update the subject and body of `sendAccountArchivedEmail` / `buildAccountArchivedEmailHtml` to say the account is about to be removed and that logging in within 7 days keeps it. Keep the signature unchanged
    - Leave the 30-day inactivity warning, welcome, password reset and new-flag emails untouched
    - Add unit tests: deletion email success and Resend-error paths; archive email body contains the 7-day login instruction
    - _Bug_Condition: isBugCondition(input) where input.kind = ARCHIVE_RUN or DELETE_RUN_
    - _Expected_Behavior: expectedBehavior(result) from design (deletion email sent; archive email mentions 7-day login)_
    - _Preservation: other emails and existing function names unchanged_
    - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.8_

  - [x] 3.3 Update `cleanup-archived.get.ts`
    - Archive step: for each candidate run `updateMany({ where: { id, status: 'ACTIVE' }, data: { status: 'ARCHIVED', archived_at: now } })`; send the archive email only when `count === 1`
    - Delete step: select `id, name, email` where `status = 'ARCHIVED'` and `archived_at < now - 7 days` (null `archived_at` never matches). Capture `{ email, name }` in memory before the transaction
    - After `$transaction` resolves, call `sendAccountDeletedEmail` for each captured user, each in its own try/catch so one failure does not affect the response or other sends. If the transaction throws, send no email
    - Keep the transaction contents, pantry soft-delete and `CRON_SECRET` check unchanged
    - _Bug_Condition: isBugCondition(input) where input.kind IN {ARCHIVE_RUN, DELETE_RUN}_
    - _Expected_Behavior: expectedBehavior(result) from design (one deletion email after commit; one archive email per archival event)_
    - _Preservation: Preservation Requirements from design (3.1, 3.3, 3.4, 3.5)_
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.4, 2.5, 3.1, 3.3, 3.4, 3.5_

  - [x] 3.4 Restore ARCHIVED users on email/password login
    - In `nitro-app/server/api/auth/login.post.ts`, add conditional `updateMany({ where: { id, status: 'ARCHIVED' }, data: { status: 'ACTIVE', archived_at: null, inactivity_warning_sent_at: null, last_active: now } })` alongside the existing `last_active` refresh
    - Confirm an ARCHIVED user can reach this update (no earlier non-ACTIVE rejection). If a gate blocks them, make the minimal adjustment and flag it to the user
    - _Bug_Condition: isBugCondition(input) where input.kind = USER_RETURN and user.status = 'ARCHIVED'_
    - _Expected_Behavior: status ACTIVE, archived_at null, warning stamp null, last_active refreshed (2.3)_
    - _Preservation: ACTIVE login still refreshes last_active and clears the warning stamp (3.6)_
    - _Requirements: 1.3, 2.3, 3.6_

  - [x] 3.5 Restore ARCHIVED users in Google callback
    - Apply the same conditional restore in `nitro-app/server/api/auth/google/callback.get.ts`
    - Verify the path is reachable for ARCHIVED users and flag any gate
    - _Bug_Condition: isBugCondition(input) where input.kind = USER_RETURN and user.status = 'ARCHIVED'_
    - _Expected_Behavior: expectedBehavior(result) from design_
    - _Preservation: ACTIVE Google sign-in behavior unchanged (3.6)_
    - _Requirements: 1.3, 2.3, 3.6_

  - [x] 3.6 Restore ARCHIVED users in Google verify
    - Apply the same conditional restore in `nitro-app/server/api/auth/google/verify.post.ts`
    - Verify the path is reachable for ARCHIVED users and flag any gate
    - _Bug_Condition: isBugCondition(input) where input.kind = USER_RETURN and user.status = 'ARCHIVED'_
    - _Expected_Behavior: expectedBehavior(result) from design_
    - _Preservation: ACTIVE Google verify behavior unchanged (3.6)_
    - _Requirements: 1.3, 2.3, 3.6_

  - [x] 3.7 Restore ARCHIVED users on session-stream heartbeat
    - In `nitro-app/server/lib/session-stream.ts`, add the conditional restore, keeping the `where: { id, session_token }` guard so a token mismatch restores nothing
    - Retain the existing `.catch` error handling
    - Add unit tests for restore per path, including heartbeat session-token mismatch
    - _Bug_Condition: isBugCondition(input) where input.kind = USER_RETURN and user.status = 'ARCHIVED'_
    - _Expected_Behavior: expectedBehavior(result) from design_
    - _Preservation: ACTIVE heartbeat still refreshes last_active and clears warning stamp (3.6)_
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 3.6_

  - [x] 3.10 Remove the 30-day inactivity warning
    - Remove the `/api/cron/inactivity-warning` entry from `nitro-app/vercel.json` and stop `sendInactivityWarningEmail` from being sent
    - Grep first; remove the cron route and/or `nitro-app/server/tasks/notifications/inactivity-warning.ts` and its email helper only if nothing else references them. No renames of other things
    - Keep the `inactivity_warning_sent_at` column in the schema (no schema removal)
    - _Expected_Behavior: no 30-day inactivity email is sent (2.6)_
    - _Preservation: archive email, other emails and names unchanged (3.8)_
    - _Requirements: 2.4, 2.6, 3.8_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Account lifecycle emails and restore
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - Note: the migration is applied manually by the user, so this run relies on the mocked Prisma client and does not need the database column
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Unaffected lifecycle behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npx vitest run` and any type check/build step the project provides
  - Remind the user to run `prisma migrate deploy` and `prisma generate` before deploying
  - Ensure all tests pass, ask the user if questions arise.
