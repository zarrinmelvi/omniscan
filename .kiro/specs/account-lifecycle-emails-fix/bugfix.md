# Bugfix Requirements Document

## Introduction

The account lifecycle for inactive users is incomplete and unreliable. A user who has had no activity for 180 days should receive one email warning that the account is about to be archived. If the user does not open the app within the following 7 days, they should receive an email confirming the account has been deleted.

Today the archive email is sent, but no deletion email is sent. The 7-day countdown can be reset by unrelated updates to the user record. Users who log back in during the 7-day window stay archived and are still deleted. The archive email also does not clearly tell the user to log in within 7 days to keep the account. The separate 30-day inactivity warning email is being removed, so the 180-day archive email is the only inactivity email.

Original report (Tagalog/English): "dapat may magemail sa user kapag 180 days na malapit na iarchive acc ng user kapag d pa siya nagonline - then 1 week later pag d nagopen user dapat ung email na tatanggap is deleted na ung acc ng user"

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an archived account is permanently deleted after the 7-day grace period THEN the system deletes the account and its data without sending the user any email

1.2 WHEN an archived user's record is updated for any reason during the grace period (for example by a session heartbeat or a login) THEN the system restarts the 7-day deletion countdown because it is measured from the record's last-modified time rather than from the moment of archival

1.3 WHEN an archived user logs in (email/password or Google) or the app sends a session heartbeat during the 7-day grace period THEN the system refreshes the user's last-active time but leaves the account archived, so the account is still deleted at the end of the grace period

1.4 WHEN an account is archived after 180 days of inactivity THEN the system sends an email that does not clearly tell the user they must log in within 7 days to keep the account

1.5 WHEN the archive process runs more than once for the same inactive account, or the account is re-archived after the user returns and goes idle again without a fresh archival record THEN the system can send the archive email more than once or rely on stale timing data

### Expected Behavior (Correct)

2.1 WHEN an archived account is permanently deleted after the 7-day grace period THEN the system SHALL send the user an "account deleted" email, using the user's email and name captured before the data is removed

2.2 WHEN an account is archived THEN the system SHALL record a stable archival timestamp, and SHALL measure the 7-day deletion countdown from that timestamp so unrelated updates to the user record do not reset it

2.3 WHEN an archived user logs in (email/password or Google) or the app sends a session heartbeat during the 7-day grace period THEN the system SHALL restore the account to active, clear the archival timestamp, and refresh the last-active time so the account is not deleted

2.4 WHEN an account is archived after 180 days of inactivity THEN the system SHALL send exactly one email stating the account is about to be archived/has been archived and that the user must log in within 7 days to keep it. This is the only inactivity email the system sends

2.6 WHEN an active user reaches 30 days of inactivity THEN the system SHALL NOT send a 30-day inactivity warning email (the cron entry and email send are removed; the `inactivity_warning_sent_at` column is kept in the schema)

2.5 WHEN the archive process runs repeatedly THEN the system SHALL send the archive email only once per archival event, and SHALL NOT send a deletion email for an account that was not actually deleted

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an active user has been inactive for fewer than 180 days THEN the system SHALL CONTINUE TO leave the account active and send no archive or deletion email

3.2 (Superseded) The 30-day inactivity warning is no longer preserved; see 2.6. The `inactivity_warning_sent_at` column SHALL CONTINUE TO exist in the schema

3.3 WHEN an archived user has not returned and fewer than 7 days have passed since archival THEN the system SHALL CONTINUE TO keep the account archived and not delete it

3.4 WHEN an account is hard-deleted THEN the system SHALL CONTINUE TO remove the user's activity logs, notifications, dietary profile, pantry items, recipe interactions, flagged scans, scans, and the user record in a single transaction

3.5 WHEN the cleanup cron runs THEN the system SHALL CONTINUE TO soft-delete archived pantry items older than 7 days and SHALL CONTINUE TO require the correct cron authorization secret

3.6 WHEN a non-archived active user logs in or sends a heartbeat THEN the system SHALL CONTINUE TO refresh last-active and clear the inactivity warning stamp as before

3.7 WHEN an admin views the Manage User Profiles list THEN the system SHALL CONTINUE TO show archive-after-180-days and delete-after-187-days statuses (compared case-insensitively) and the existing UI wording for the archive and deletion stages

3.8 WHEN the welcome, password reset, or new-flag notification emails are sent THEN the system SHALL CONTINUE TO behave unchanged, and existing function, field and route names SHALL CONTINUE TO be unchanged
