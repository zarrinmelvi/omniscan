# Epic 5 Setup — Name Split & Google OAuth

This document covers the manual steps required after merging Epic 5
(Authentication, Onboarding & Social OAuth).

## 1. Database migration

The Prisma schema (`prisma/schema.prisma`) `User` model gained:

- `first_name String?`
- `last_name String?`
- `username String? @unique`
- `oauth_provider String?`
- `oauth_provider_id String?`
- `password String?` (was `String` — nullable now because OAuth accounts have no local password)
- `@@index([oauth_provider, oauth_provider_id])`

`name` is intentionally **kept** as a required, derived column (`"first last"`),
set automatically on write. It is not dropped.

Run the migration manually (it touches the live DB — not run automatically):

```bash
npx prisma migrate dev --name epic5_name_split_and_oauth
```

The Prisma client has already been regenerated with `prisma generate`.

## 2. Backfill existing users

Existing rows will have `NULL` `first_name` / `last_name` / `username`.
Backfill them once after migrating:

```sql
-- Username from the email local-part
UPDATE "User" SET username = split_part(email, '@', 1) WHERE username IS NULL;

-- Split the existing display name into first/last
UPDATE "User"
SET first_name = split_part(name, ' ', 1),
    last_name  = NULLIF(substr(name, length(split_part(name, ' ', 1)) + 2), '')
WHERE first_name IS NULL;
```

> Note: if two existing users share the same email local-part, the username
> backfill will collide (username is unique). Resolve any duplicates manually
> before/after running the UPDATE.

## 3. Environment variables

Google OAuth stays **dormant** until these are set. When absent,
`GET /api/auth/google` returns 503 and the callback redirects to the failure
URL with `?oauth_error=not_configured`.

| Variable | Purpose | Example |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | Must match the authorized redirect URI in Google Cloud | `https://omniscan-ten.vercel.app/api/auth/google/callback` |
| `OAUTH_FRONTEND_SUCCESS` | Where the browser lands after a successful login (frontend) | `https://<frontend-domain>/tabs/home` |
| `OAUTH_FRONTEND_FAILURE` | Where the browser lands on failure/denial (frontend) | `https://<frontend-domain>/login` |

Defaults (local dev) if unset:

- `GOOGLE_REDIRECT_URI` → `http://localhost:3000/api/auth/google/callback`
- `OAUTH_FRONTEND_SUCCESS` → `http://localhost:5173/tabs/home`
- `OAUTH_FRONTEND_FAILURE` → `http://localhost:5173/login`

`JWT_SECRET` must also be set (reused from the existing password-login flow).

## 4. Google Cloud Console steps

1. Open the Google Cloud Console → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Under **Authorized redirect URIs**, add the exact value of
   `GOOGLE_REDIRECT_URI`, e.g.
   `https://omniscan-ten.vercel.app/api/auth/google/callback`.
   (Add a localhost entry too for local testing:
   `http://localhost:3000/api/auth/google/callback`.)
5. Create, then copy the generated **Client ID** and **Client secret** into
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars (Vercel project settings
   for production; `.env` for local).
6. Configure the OAuth consent screen (scopes: `openid`, `email`, `profile`)
   and add test users if the app is in "Testing" mode.

## 5. OAuth flow summary

- `GET /api/auth/google` → redirects to Google's consent screen.
- `GET /api/auth/google/callback` → exchanges the code, fetches the profile,
  finds-or-creates the user (auto-deriving a unique username from the email
  local-part), links the Google identity to an existing password account if
  the emails match, issues the same JWT shape as the password login, then
  redirects to `OAUTH_FRONTEND_SUCCESS?oauth_token=<jwt>`.
- The SPA router guard consumes `?oauth_token=...`, establishes the consumer
  session via `authStore.loginWithOAuthToken`, and strips the token from the URL.
