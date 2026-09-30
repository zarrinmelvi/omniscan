# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** — Admin Portal Returns 405 Because `VITE_API_URL` and `VITE_MODE` Are Not Set in the `omniscan-admin` Vercel Project
  - **CRITICAL**: This test MUST FAIL on unfixed configuration — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the configuration when it fails**
  - **GOAL**: Confirm that `POST https://omniscan-ten.vercel.app/api/admin/login` with valid-format credentials returns a non-405 response (proving the Nitro backend route exists), and that the 405 originates specifically from the `omniscan-admin` deployment missing its env vars
  - Bug Condition: `omniscan-admin` Vercel project has no `VITE_API_URL` env var set → the Vite build uses `''` as `API_BASE_URL` → `apiFetch` sends `POST /api/admin/login` to the same `admin.omniscan.website` host → no POST handler → 405
  - Run this curl to confirm the Nitro backend route exists and responds (not 405):
    ```
    curl -X POST https://omniscan-ten.vercel.app/api/admin/login \
      -H 'Content-Type: application/json' \
      -d '{"username":"zarrin","password":"admin1password"}'
    ```
  - Expected: `HTTP 401 Unauthorized` (wrong password) or `HTTP 200` (correct) — either way, NOT 405. This proves the route exists on the Nitro backend.
  - Document the counterexample: `POST admin.omniscan.website/api/admin/login → 405` (no handler on the static frontend host)
  - Mark task complete when test is run and counterexample is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — `omniscan-ui` (client portal) and local dev are completely unaffected
  - Observe: `omniscan-ui/.env.local` already has `VITE_API_URL=https://omniscan-ten.vercel.app` and `VITE_MODE=CLIENT` — client portal works correctly
  - Observe: local Vite dev (no `VITE_API_URL`) proxies `/api/**` to `localhost:3000` as before
  - Observe: `API_BASE_URL` equals `''` when `VITE_API_URL` is undefined (local dev behavior)
  - Run preservation tests on UNFIXED configuration
  - **EXPECTED OUTCOME**: Tests PASS — baseline confirmed
  - Mark task complete when tests are written, run, and passing
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix: Set required environment variables on the `omniscan-admin` Vercel project

  - [ ] 3.1 Fix `MODE=CLIENT` typo in `omniscan-ui/.env.local`
    - The file currently has `MODE=CLIENT` — Vite only exposes vars prefixed with `VITE_` to `import.meta.env`
    - Change `MODE=CLIENT` to `VITE_MODE=CLIENT`
    - This ensures the client-mode deployment gets the correct mode flag
    - _Preservation: VITE_API_URL and VERCEL_OIDC_TOKEN lines are unchanged_
    - _Requirements: 3.1_

  - [ ] 3.2 Add `VITE_API_URL` and `VITE_MODE` to the `omniscan-admin` Vercel project
    - Go to https://vercel.com → team `zarrin-melvi-s-projects` → project `omniscan-admin`
    - Navigate to Settings → Environment Variables
    - Add these two variables for the **Production** environment (and Preview if desired):
      ```
      VITE_API_URL = https://omniscan-ten.vercel.app
      VITE_MODE    = ADMIN
      ```
    - Without `VITE_API_URL`, `API_BASE_URL` is `''` and requests go to the same host (no handler → 405)
    - Without `VITE_MODE=ADMIN`, the router mode guard defaults to CLIENT, blocking all `/admin` routes
    - _Bug_Condition: isBugCondition(X) where VITE_API_URL is unset on omniscan-admin project_
    - _Expected_Behavior: Vite bakes the correct backend URL into the bundle at deploy time_
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.3 Redeploy the `omniscan-admin` Vercel project
    - After adding env vars, trigger a new deployment so Vite rebuilds with the new values
    - In the Vercel dashboard: `omniscan-admin` → Deployments → Redeploy latest
    - Or push a trivial commit to the connected branch to trigger CI
    - _Expected_Behavior: The rebuilt bundle has VITE_API_URL baked in; POST /api/admin/login now routes to omniscan-ten.vercel.app_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.4 Create `omniscan-ui/.env.admin` for local admin-mode development
    - Create a new file at `omniscan-ui/.env.admin` (never commit this file)
    - File contents:
      ```
      VITE_MODE=ADMIN
      VITE_API_URL=https://omniscan-ten.vercel.app
      ```
    - Use with: `npx vite --mode admin` from `omniscan-ui/`
    - Confirm `omniscan-ui/.gitignore` covers `.env*` (already present — no change needed)
    - _Requirements: 2.3_

  - [ ] 3.5 Update architecture comment in `omniscan-ui/src/utils/api.ts`
    - Extend the existing comment above `API_BASE_URL` to document the two-deployment architecture:
      ```typescript
      // Two-deployment architecture:
      //   - omniscan-ui    → static Vue/Ionic SPA, deployed as Vercel project "omniscan-ui"
      //   - omniscan-admin → same SPA built with VITE_MODE=ADMIN, separate Vercel project
      //   - nitro-app      → Nitro/H3 API backend at omniscan-ten.vercel.app
      //
      // In local dev, leave VITE_API_URL unset — Vite's dev-server proxy
      // (vite.config.ts) forwards '/api/**' to http://localhost:3000 (nitro-app).
      //
      // In production / vercel dev, VITE_API_URL must be set to the nitro-app URL
      // (https://omniscan-ten.vercel.app) in EACH Vercel project's env vars.
      // Do NOT leave it unset in the admin project — that makes API_BASE_URL empty
      // and all fetch calls go to the same host, which has no /api/** handlers → 405.
      export const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''
      ```
    - This is a comment-only change — no logic altered
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - Navigate to `admin.omniscan.website/admin/login`
    - Enter credentials and click Sign In
    - **EXPECTED OUTCOME**: Successful login → redirect to admin dashboard (no 405 error)
    - Also re-run the curl from task 1 to confirm Nitro backend still responds correctly
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.7 Verify preservation tests still pass
    - Confirm `omniscan.website` (client portal) still logs in and works normally
    - Confirm local `vite dev` still proxies correctly
    - Confirm `omniscan-ui/.env.admin` is not tracked by git
    - **EXPECTED OUTCOME**: All preservation tests PASS — no regressions

- [ ] 4. Checkpoint — Ensure all tests pass
  - Re-run Property 1 test (admin login succeeds, no 405) — confirm PASS
  - Re-run Property 2 tests (client portal unaffected) — confirm PASS
  - Confirm `omniscan-ui/.env.admin` is not committed to git
  - If any test fails, ask the user before proceeding
