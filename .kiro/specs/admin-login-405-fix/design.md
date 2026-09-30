# Admin Login 405 Fix — Bugfix Design

## Overview

The admin portal login fails with HTTP 405 because `VITE_API_URL` is set to the
`omniscan-ui` frontend Vercel deployment (`omniscan-ten.vercel.app`) rather than the
Nitro backend deployment. When `apiFetch` in `omniscan-ui/src/utils/api.ts` prepends
this URL to `POST /api/admin/login`, the request lands on the static frontend host,
which has no POST handler for that route — so Vercel returns `405 Method Not Allowed`.

The fix is configuration-only: update `VITE_API_URL` in three places to the Nitro
backend URL, add a dedicated `.env.admin` file for local admin-mode development, and
document the two-deployment architecture in `api.ts`.

---

## Glossary

- **Bug_Condition (C)**: `VITE_API_URL` resolves to the frontend deployment URL AND the
  request method is POST (or any non-GET method that the static frontend cannot handle).
- **Property (P)**: For any request where the bug condition holds, after the fix the
  request SHALL be routed to the Nitro backend and receive a non-405 response.
- **Preservation**: All client-mode API calls and other admin behaviour that is not
  affected by `VITE_API_URL` pointing to the wrong host must continue to work exactly
  as before.
- **`apiFetch`**: The central fetch wrapper in `omniscan-ui/src/utils/api.ts`. Constructs
  every API request URL as `${API_BASE_URL}${endpoint}`, where `API_BASE_URL` reads
  from `import.meta.env.VITE_API_URL`.
- **`API_BASE_URL`**: The runtime value of `VITE_API_URL` after stripping a trailing
  slash. Empty string in local dev (Vite proxy handles routing); the full backend
  hostname in production.
- **Nitro backend URL**: The Vercel deployment URL of `nitro-app`. Not stored on disk
  in this clone — must be retrieved from the Vercel dashboard (project name: `nitro-app`,
  owner: `zarrin-melvi-s-projects`). Referenced as `<NITRO_BACKEND_URL>` below.
- **Frontend URL**: `https://omniscan-ten.vercel.app` — the current (wrong) value of
  `VITE_API_URL`. Serves only the compiled Vue/Ionic SPA; no `/api/**` handlers exist.

---

## Bug Details

### Bug Condition

The bug manifests whenever `VITE_API_URL` is set to the frontend deployment URL AND a
non-idempotent (e.g. POST) request is made to an `/api/**` route. The frontend Vercel
deployment has no POST handler for `/api/admin/login`, so it returns 405.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type EnvironmentConfig
  OUTPUT: boolean

  RETURN X.VITE_API_URL = FRONTEND_DEPLOYMENT_URL
         AND X.request.method IN ['POST', 'PUT', 'PATCH', 'DELETE']
         AND X.request.path STARTS_WITH '/api/'
END FUNCTION
```

### Examples

- **Admin login (triggers 405)**: `VITE_API_URL = "https://omniscan-ten.vercel.app"`,
  `POST /api/admin/login` → frontend host receives request → returns 405.
- **Regular user login (triggers 405)**: Same misconfiguration, `POST /api/auth/login`
  → same outcome.
- **GET request (may silently succeed or 404)**: `GET /api/products` against the
  frontend host returns 404 (no API handler) — different symptom, same root cause.
- **Correct configuration (no bug)**: `VITE_API_URL = "<NITRO_BACKEND_URL>"`,
  `POST /api/admin/login` → Nitro backend receives request → returns 200 with token.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse/touch interactions in the client-mode (non-admin) UI must continue to work
  exactly as before — no change to the client deployment's `VITE_API_URL`.
- The Vite dev-server proxy (`/api → http://localhost:3000`) must continue to work for
  local development — `VITE_API_URL` remains unset (empty) in that context.
- All existing `nitro-app` backend routes (`/api/auth/login`, `/api/admin/login`,
  product/recipe/pantry endpoints) must continue to respond correctly — no backend
  code changes are required.
- The existing `apiFetch` logic in `api.ts` (auth-exempt check, token injection,
  admin/user session branching, 401 redirect) must remain entirely unchanged.

**Scope:**
All requests that do NOT originate from a context where `VITE_API_URL` points to the
wrong host are completely unaffected. This includes:

- Any local dev session (Vite proxy in effect, `VITE_API_URL` is empty).
- Any client-mode Vercel deployment that already has a correct `VITE_API_URL`.
- Backend (Nitro) request handling — zero changes there.

---

## Hypothesized Root Cause

1. **Wrong URL in `.env.local`** (workspace root): `VITE_API_URL` was set to
   `https://omniscan-ten.vercel.app` — the `omniscan-ui` frontend project — instead of
   the Nitro backend URL. The `vercel dev` CLI injects this into the Vite build, so
   all `apiFetch` calls in that session hit the frontend host.

2. **Wrong URL in Vercel project environment variable**: The `omniscan-ui` Vercel
   project (`prj_ASEdEb6zDhpdfIu72mD0XPheySYm`) likely has the same incorrect value
   persisted as a Production/Preview environment variable, causing the deployed admin
   portal to also send requests to the frontend host.

3. **No dedicated admin-mode env file**: There is no `.env.admin` (or equivalent) for
   running `VITE_MODE=ADMIN` locally. Developers rely on `.env.local`, which is shared
   with client-mode and can silently carry the wrong URL.

4. **Architecture not documented at the call site**: The comment in `api.ts` explains
   the Vite proxy behaviour for local dev but does not explicitly state that
   `VITE_API_URL` must point to the **Nitro backend** (not the frontend) for deployed
   environments, making the misconfiguration easy to repeat.

---

## Correctness Properties

Property 1: Bug Condition — API Requests Route to Nitro Backend

_For any_ environment configuration where `isBugCondition` returns true (i.e.
`VITE_API_URL` currently equals the frontend deployment URL), after the fix is applied
`VITE_API_URL` SHALL equal the Nitro backend deployment URL, and a `POST
/api/admin/login` request with valid credentials SHALL receive a 200 response
containing a JWT token — not a 405 response.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Client-Mode and Local Dev Unaffected

_For any_ request where `isBugCondition` returns false (i.e. the request does not
originate from a context where `VITE_API_URL` points to the frontend host), the
fixed configuration SHALL produce exactly the same routing and response behaviour
as before the fix, preserving all existing client-mode API calls, local Vite-proxy
dev flows, and backend handler behaviour.

**Validates: Requirements 3.1, 3.2, 3.3**

---

## Fix Implementation

### Changes Required

All changes are configuration and documentation only — no application logic is modified.

**File 1: `c:\Users\Zarrin\Desktop\Projects\.env.local`** (workspace root)

- Update `VITE_API_URL` from `"https://omniscan-ten.vercel.app"` to
  `"<NITRO_BACKEND_URL>"`.
- The Nitro backend URL must be retrieved from the Vercel dashboard: project name
  `nitro-app`, team `zarrin-melvi-s-projects`. It follows the pattern
  `https://nitro-app-<hash>.vercel.app` or a custom alias set on that project.

**File 2: Vercel project environment variable** (out-of-band, via Vercel dashboard or
CLI)

- Project: `omniscan-ui` (`prj_ASEdEb6zDhpdfIu72mD0XPheySYm`)
- Variable: `VITE_API_URL`
- Environments: Production, Preview (and Development if desired)
- Change value from `"https://omniscan-ten.vercel.app"` to `"<NITRO_BACKEND_URL>"`.
- Command (Vercel CLI):
  ```
  vercel env add VITE_API_URL production
  # enter <NITRO_BACKEND_URL> when prompted
  ```

**File 3: `omniscan-ui/.env.admin`** (new file, never committed)

```
VITE_MODE=ADMIN
VITE_API_URL=<NITRO_BACKEND_URL>
```

Used by running `vite --mode admin` or `vercel dev --env .env.admin` for local
admin-mode testing.

**File 4: `omniscan-ui/.gitignore`**

- Confirm `.env*` is already present in `.gitignore` (it is — line `.env*`).
- No change needed.

**File 5: `omniscan-ui/src/utils/api.ts`** (comment addition only)

Extend the existing comment above `API_BASE_URL` to explicitly state that
`VITE_API_URL` must point to the **Nitro backend** deployment URL (not the frontend),
and reference the two-deployment architecture:

```typescript
// Two-deployment architecture:
//   - omniscan-ui  → static Vue/Ionic SPA (this project)
//   - nitro-app    → Nitro/H3 API backend (separate Vercel project)
//
// In local dev, leave VITE_API_URL unset — Vite's dev-server proxy
// (vite.config.ts) forwards '/api/**' to http://localhost:3000 (nitro-app).
//
// In production / vercel dev, set VITE_API_URL to the nitro-app Vercel
// deployment URL (e.g. https://nitro-app-<hash>.vercel.app).
// Do NOT set it to the omniscan-ui frontend URL — that host has no API
// handlers and will return 405 for any POST/PUT/PATCH/DELETE request.
export const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate the bug with the current (wrong) `VITE_API_URL`, then verify the fix
produces correct routing and preserves all unaffected behaviour.

### Exploratory Bug Condition Checking

**Goal**: Demonstrate the 405 failure on the unfixed configuration to confirm the root
cause before making any changes.

**Test Plan**: Send a `POST /api/admin/login` request directly to the current
`VITE_API_URL` host and observe the response. This confirms whether the frontend host
is the cause of the 405.

**Test Cases**:
1. **Direct POST to frontend host** (will return 405 on unfixed config):
   ```
   curl -X POST https://omniscan-ten.vercel.app/api/admin/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"test"}'
   ```
   Expected counterexample: `HTTP 405 Method Not Allowed`.

2. **Direct POST to Nitro backend** (should return 401 for bad creds, confirming route exists):
   ```
   curl -X POST <NITRO_BACKEND_URL>/api/admin/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"test"}'
   ```
   Expected: `HTTP 401 Unauthorized` (route exists, credentials wrong).

3. **Browser admin portal login** with DevTools Network tab open — observe the request
   URL and the 405 response before the fix.

**Expected Counterexamples**:
- `POST https://omniscan-ten.vercel.app/api/admin/login` → 405 (frontend has no
  handler).
- Possible causes confirmed: `VITE_API_URL` set to frontend URL, not backend URL.

### Fix Checking

**Goal**: Verify that after updating `VITE_API_URL`, all requests where the bug
condition held now route correctly to the Nitro backend.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  // After fix: VITE_API_URL = <NITRO_BACKEND_URL>
  result := apiFetch_fixed(X.request)
  ASSERT result.status != 405
         AND result.target_host = NITRO_BACKEND_URL
END FOR
```

**Manual verification steps**:
1. Update `.env.local` with the correct Nitro backend URL.
2. Run `vercel dev` (or `vite --mode admin`).
3. Navigate to `/admin/login` and submit valid credentials.
4. Assert: successful login, JWT token stored, redirect to admin dashboard.

### Preservation Checking

**Goal**: Verify that client-mode API calls and local Vite-proxy dev flows are
completely unaffected by the fix.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT apiFetch_original(X.request) = apiFetch_fixed(X.request)
END FOR
```

**Testing Approach**: Property-based testing is appropriate for preservation checking
because:
- It exercises a wide range of endpoint/method combinations automatically.
- It confirms that only `VITE_API_URL` value changes and nothing in `apiFetch` logic
  itself was altered.
- It catches any unintended side-effects of the comment addition in `api.ts`.

**Test Cases**:
1. **Local Vite proxy preservation**: Run `vite dev` (no `VITE_API_URL` set); confirm
   all `/api/**` calls proxy to `localhost:3000` as before.
2. **Client-mode Vercel deployment**: Confirm the client deployment's `VITE_API_URL`
   (if separately configured) is untouched and requests continue to route correctly.
3. **Admin token / user token isolation**: Confirm `isAdmin` branching in `apiFetch`
   still reads from the correct localStorage key — no change to this logic.
4. **`.gitignore` coverage**: Confirm `.env.admin` is not tracked by git
   (`git status` shows it as untracked/ignored).

### Unit Tests

- Test that `API_BASE_URL` equals empty string when `VITE_API_URL` is undefined
  (existing local-dev behaviour preserved).
- Test that `API_BASE_URL` strips a trailing slash from a provided `VITE_API_URL`
  (existing behaviour preserved).
- Test that a mocked `fetch` called via `apiFetch` receives the full URL
  `${VITE_API_URL}/api/admin/login` when `VITE_API_URL` is set.

### Property-Based Tests

- Generate random `VITE_API_URL` values (with/without trailing slash) and assert
  `API_BASE_URL` never ends with `/`.
- Generate random valid endpoint strings and assert the constructed URL always equals
  `API_BASE_URL + endpoint` with no double slashes.
- Generate random non-POST interactions (GETs with various endpoints) and assert none
  are affected by the `VITE_API_URL` value change.

### Integration Tests

- End-to-end admin login flow: set `VITE_API_URL` to Nitro backend URL, submit
  credentials, assert JWT returned and stored under `omniscan_admin_token`.
- End-to-end client login flow: assert client login is unaffected (uses same
  `apiFetch` path, same URL construction, different endpoint).
- Regression test: assert that pointing `VITE_API_URL` back to the frontend URL causes
  a 405 (documents the bug condition for future reference).
