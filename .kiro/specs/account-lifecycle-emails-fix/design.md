# Account Lifecycle Emails Fix Bugfix Design

## Overview

Inactive users are archived after 180 days and hard-deleted 7 days later by `nitro-app/server/api/cron/cleanup-archived.get.ts`. Today the lifecycle has five defects: no deletion email, a deletion countdown driven by `updated_at` (which any write resets), no restore of ARCHIVED users on login or heartbeat, archive email wording that doesn't say "log in within 7 days", and no guard against sending the archive email more than once.

The fix:
- Add a nullable `archived_at` column on `User` as the stable archival timestamp, and base the 7-day deletion on it.
- Restore ARCHIVED users to ACTIVE (clearing `archived_at` and `inactivity_warning_sent_at`) in the four re-entry paths.
- Add `sendAccountDeletedEmail`, sent only after the hard-delete transaction commits, using emails captured beforehand.
- Reword the archive email and send it exactly once per archival event.
- Remove the 30-day inactivity warning (cron entry and email send). The `inactivity_warning_sent_at` column stays. The 180-day archive email is the only inactivity email. All other existing names stay unchanged.

## Glossary

- **Bug_Condition (C)**: An account lifecycle event (archive, delete, or return of an archived user) that is handled incorrectly by the current code
- **Property (P)**: The desired behavior for those events: one correct email per event, stable timing, restore on return
- **Preservation**: 30-day warning, cleanup of pantry items, cron auth, delete transaction contents, admin list statuses, other emails
- **cleanup-archived.get.ts**: Daily cron handler (`server/api/cron/cleanup-archived.get.ts`) that archives and deletes users
- **archived_at**: New nullable `DateTime?` on `User`; set when status becomes ARCHIVED, null otherwise
- **inactivity_warning_sent_at**: Existing stamp for the 30-day warning (`server/tasks/notifications/inactivity-warning.ts`)
- **session-stream heartbeat**: The `last_active` update in `server/lib/session-stream.ts`
- **Grace period**: 7 days between `archived_at` and hard deletion

## Bug Details

### Bug Condition

The bug manifests in three situations: (a) an ARCHIVED user is hard-deleted, (b) an ARCHIVED user logs in (password or Google) or sends a heartbeat, (c) a user is archived. In (a) no email is sent and the 7-day cutoff uses `updated_at`; in (b) only `last_active` and `inactivity_warning_sent_at` are touched, so status stays ARCHIVED and `updated_at` is bumped; in (c) the email text lacks the 7-day instruction and nothing prevents a repeat send.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type LifecycleEvent
         (kind IN {ARCHIVE_RUN, DELETE_RUN, USER_RETURN}, user, now)
  OUTPUT: boolean

  RETURN (input.kind = DELETE_RUN
            AND input.user.status = 'ARCHIVED'
            AND daysBetween(archivalTime(input.user), input.now) >= 7)
      OR (input.kind = USER_RETURN
            AND input.user.status = 'ARCHIVED'
            AND daysBetween(archivalTime(input.user), input.now) < 7)
      OR (input.kind = ARCHIVE_RUN
            AND input.user.status = 'ACTIVE'
            AND daysBetween(input.user.last_active, input.now) >= 180)
END FUNCTION
```

### Examples

- User archived 8 days ago, not returned: cron deletes the account and sends nothing. Expected: deletion email to the captured address.
- User archived 6 days ago, then an unrelated update bumps `updated_at`: deletion is pushed out. Expected: deletion exactly 7 days after `archived_at`.
- User archived 3 days ago logs in with email/password: stays ARCHIVED, deleted on day 7. Expected: status ACTIVE, `archived_at` null, not deleted.
- Same for Google callback, Google verify, and a heartbeat.
- User inactive 181 days: archive email says archived but not "log in within 7 days". Expected: clear instruction, sent once.
- Cron retried or two runs overlap: two archive emails could go out. Expected: one.
- Edge: delete transaction fails and rolls back. Expected: no deletion email.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Active users inactive under 180 days stay active with no archive/deletion email
- The 30-day inactivity warning is REMOVED, not preserved: no email is sent and the `/api/cron/inactivity-warning` cron entry is dropped. The `inactivity_warning_sent_at` column stays in the schema
- ARCHIVED users under 7 days since archival and not returned stay archived
- Hard delete removes the same child records in a single transaction
- Pantry soft-delete (archived items older than 7 days) and `CRON_SECRET` check
- ACTIVE users logging in or sending heartbeats still refresh `last_active` and clear `inactivity_warning_sent_at`
- Admin Manage User Profiles statuses (180/187 days, case-insensitive) and wording
- Welcome, password reset and new-flag emails; no renames of existing functions, fields or routes

**Scope:**
Everything outside archive, delete and archived-user-return handling is unaffected.

## Hypothesized Root Cause

1. **Missing deletion email**: the delete step in `cleanup-archived.get.ts` selects only `id, email` and never calls an email sender; `sendAccountDeletedEmail` doesn't exist in `server/utils/email.ts`.
2. **Wrong timing source**: step 3 filters on `updated_at`, which Prisma refreshes on any `User` write (login, heartbeat, archive itself). No archival timestamp exists in `prisma/schema.prisma`.
3. **No restore on return**: `login.post.ts`, `google/callback.get.ts`, `google/verify.post.ts` and `session-stream.ts` update `last_active` and `inactivity_warning_sent_at` but never touch `status`.
4. **Archive email wording**: `buildAccountArchivedEmailHtml` / subject don't state the 7-day login requirement.
5. **Non-idempotent archive**: step 2 does an unconditional `update` followed by an email send, with no check that the transition actually happened in this run.

## Correctness Properties

Property 1: Bug Condition - Account lifecycle emails and restore

_For any_ lifecycle event where the bug condition holds (isBugCondition returns true), the fixed code SHALL: on DELETE_RUN, send one account-deleted email (using email and name captured before deletion, after the transaction commits) and delete the user; on USER_RETURN, set status to ACTIVE, clear `archived_at` and `inactivity_warning_sent_at`, and refresh `last_active` so the user is not deleted; on ARCHIVE_RUN, set status ARCHIVED with `archived_at = now` and send exactly one archive email telling the user to log in within 7 days.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Unaffected lifecycle behavior

_For any_ input where the bug condition does NOT hold (isBugCondition returns false), the fixed code SHALL produce the same result as the original code, preserving active-user login/heartbeat updates, retention of archived users under 7 days, the hard-delete transaction contents, pantry cleanup, cron authorization, admin list statuses and other emails.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `nitro-app/prisma/schema.prisma` and a new `prisma/migrations/<timestamp>_add_user_archived_at/migration.sql`

1. **Schema**: add `archived_at DateTime?` to `User` next to `inactivity_warning_sent_at`.
2. **Migration SQL**: add the column, then backfill existing ARCHIVED users. The user applies it manually with `prisma migrate deploy`; I will not run it.
   ```sql
   ALTER TABLE "User" ADD COLUMN "archived_at" TIMESTAMP(3);
   UPDATE "User" SET "archived_at" = NOW() WHERE "status" = 'ARCHIVED' AND "archived_at" IS NULL;
   ```
   Backfill uses `NOW()` so legacy ARCHIVED users get a full 7-day grace period and a deletion email rather than being deleted on the next run. Table name will be checked against existing migrations (`@@map`) before writing. The Prisma client must be regenerated after the migration.

**File**: `nitro-app/server/utils/email.ts`

3. **New `sendAccountDeletedEmail(email, name)`**: same Resend pattern and `EmailResult` return as `sendAccountArchivedEmail`, with a new `buildAccountDeletedEmailHtml(name)` and a sign-up link.
4. **Archive email wording**: update subject and body of the existing `sendAccountArchivedEmail` / `buildAccountArchivedEmailHtml` to say the account is about to be removed and that logging in within 7 days keeps it. Signature unchanged.

**File**: `nitro-app/server/api/cron/cleanup-archived.get.ts`

5. **Archive step**: for each candidate, run `updateMany({ where: { id, status: 'ACTIVE' }, data: { status: 'ARCHIVED', archived_at: now } })`. Send the archive email only when `count === 1`. This makes the email once per archival event, including overlapping runs.
6. **Delete step**: select `id, name, email` where `status = 'ARCHIVED'` and `archived_at < now - 7 days` (null `archived_at` is never matched). Capture `{ email, name }` in memory before the transaction.
7. **Post-commit email**: after `$transaction` resolves, call `sendAccountDeletedEmail` for each captured user, each wrapped in try/catch so an email failure doesn't affect the response or other sends. If the transaction throws, no email is sent. Transaction contents are unchanged.

**Files**: `nitro-app/vercel.json`, `server/tasks/notifications/inactivity-warning.ts`

9. **Remove the 30-day warning**: delete the `/api/cron/inactivity-warning` entry from `vercel.json` and stop `sendInactivityWarningEmail` from being sent. Remove the cron route, task and email helper only if grep shows nothing else references them. Keep the `inactivity_warning_sent_at` column.

**Files**: `server/api/auth/login.post.ts`, `server/api/auth/google/callback.get.ts`, `server/api/auth/google/verify.post.ts`, `server/lib/session-stream.ts`

8. **Restore on return**: in each, restore ARCHIVED users to ACTIVE, clearing `archived_at` and `inactivity_warning_sent_at`, alongside the existing `last_active` refresh. Because ACTIVE users must be unaffected, restore is done with a conditional `updateMany({ where: { id, status: 'ARCHIVED' }, data: { status: 'ACTIVE', archived_at: null, inactivity_warning_sent_at: null, last_active: now } })` before or alongside the existing update. For the heartbeat, the existing `where: { id, session_token }` guard is kept in the conditional restore. Existing error handling (`.catch`) is retained.

I will check each path to confirm an ARCHIVED user can actually reach the update (for example, that login does not reject non-ACTIVE statuses earlier). If one does, that gate is the minimal thing to adjust, and I'll flag it.

## Testing Strategy

### Validation Approach

First surface counterexamples on unfixed code, then verify the fix and preservation. Tests use a mocked Prisma client and a mocked email module.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples before the fix and confirm or refute the root cause analysis.

**Test Plan**: Invoke the cron handler and the four re-entry paths with mocked Prisma/email, and assert the expected calls. Run on UNFIXED code.

**Test Cases**:
1. **Deletion email**: ARCHIVED user past 7 days; assert a deletion email is sent (will fail on unfixed code)
2. **Countdown stability**: ARCHIVED user with old `archived_at` but recent `updated_at`; assert it is deleted (will fail; unfixed code uses `updated_at`)
3. **Restore on login/Google callback/Google verify/heartbeat**: ARCHIVED user within grace; assert status ACTIVE and `archived_at` null (will fail)
4. **Archive once**: run the archive step twice for the same user; assert one email (may fail on unfixed code)
5. **Transaction failure**: force `$transaction` to throw; assert no deletion email (edge case)

**Expected Counterexamples**:
- No email call on deletion; deletion keyed on `updated_at`; no `status` write in re-entry paths
- Possible causes: those listed in Hypothesized Root Cause

### Fix Checking

**Goal**: For all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := lifecycle_fixed(input)
  ASSERT expectedBehavior(result)
END FOR
```

where `expectedBehavior` is:
```
FUNCTION expectedBehavior(result)
  RETURN (DELETE_RUN  => userDeleted AND deletedEmailSentOnce AND emailSentAfterCommit)
     AND (USER_RETURN => status = 'ACTIVE' AND archived_at = null
                         AND inactivity_warning_sent_at = null AND last_active refreshed)
     AND (ARCHIVE_RUN => status = 'ARCHIVED' AND archived_at = now AND archiveEmailSentOnce
                         AND emailMentions7DayLogin)
END FUNCTION
```

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, the fixed code matches the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT lifecycle_original(input) = lifecycle_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended because it generates many user states (status, `last_active`, `archived_at`, `inactivity_warning_sent_at`) and catches boundary cases (exactly 180 days, exactly 7 days) that hand-written cases miss.

**Test Plan**: Observe unfixed behavior for non-buggy inputs, then capture it in property tests.

**Test Cases**:
1. **30-day warning removed**: no 30-day inactivity email (`sendInactivityWarningEmail`) is sent for random ACTIVE users, and `vercel.json` has no `/api/cron/inactivity-warning` entry
2. **Active login/heartbeat**: ACTIVE users still get `last_active` refreshed and warning stamp cleared, with no status change
3. **Retention**: ARCHIVED users under 7 days are neither deleted nor emailed
4. **Delete transaction and pantry cleanup**: same deletes and soft-deletes; 401 without the correct secret

### Unit Tests

- `sendAccountDeletedEmail` success and Resend-error paths; archive email body contains the 7-day instruction
- Cron archive step: `count === 0` sends no email
- Cron delete step: null `archived_at` not selected; email uses pre-deletion data; email failure doesn't break the run
- Restore logic per path, including heartbeat session-token mismatch

### Property-Based Tests

- Random user states: archive/delete selection matches the 180-day and 7-day rules based on `archived_at`
- Random sequences of cron runs and returns: at most one archive email per archival event; deletion emails equal deleted users
- Random ACTIVE-user logins/heartbeats: results identical before and after the fix

### Integration Tests

- Full lifecycle: inactive 180 days → archive email → no return → 7 days → deletion email and removal
- Return path: archive → login (each of the four paths) → next cron run does not delete
- Re-archive: restored user goes idle again and gets a fresh `archived_at` and a new archive email
- Migration: backfilled ARCHIVED users receive the grace period and then a deletion email
