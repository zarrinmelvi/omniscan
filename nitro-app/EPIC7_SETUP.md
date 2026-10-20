# Epic 7 — Automated Inactivity Warning

A 30-day inactivity warning that gives users an **early heads-up** before the
existing 180-day archive lifecycle kicks in. The warning is purely informational:
the account **stays ACTIVE**, and nothing is deleted or archived by this feature.

## Migration

Run from `nitro-app/`:

```bash
npx prisma migrate dev --name epic7_inactivity_warning
```

This adds a single **additive, nullable** column to the `User` model:

```prisma
inactivity_warning_sent_at DateTime?
```

- Safe against existing rows — the column defaults to `NULL`.
- No backfill needed. A `NULL` value simply means "never warned yet", which is
  the correct starting state for every existing user.

## New cron job

A new endpoint `/api/cron/inactivity-warning` runs **daily at 08:00 UTC
(`0 8 * * *`)**, registered in `vercel.json`. It is guarded by the `CRON_SECRET`
environment variable (Bearer token), matching the other cron endpoints. It
delegates to the Nitro task `notifications:inactivity-warning`.

The task finds ACTIVE users inactive for 30+ days that have **not** already been
warned in the current quiet cycle, sends them a warning email + in-app
notification, and stamps `inactivity_warning_sent_at` so the warning is not
re-sent on subsequent daily runs. The flag is reset to `NULL` on login (both
password and Google OAuth), so a user who signs in and later goes quiet again
will be warned afresh.

## Account lifecycle summary

| Inactivity | Action | Account status |
|------------|--------|----------------|
| 30 days | Warning email + in-app notification (Epic 7, **new**) | Stays **ACTIVE** |
| 180 days | Archived + archive warning email (existing) | → **ARCHIVED** |
| +7 days after archive | Permanently deleted (existing) | **DELETED** |

The existing 180-day archive and +7-day deletion flow in
`server/api/cron/cleanup-archived.get.ts` is **unchanged**.
