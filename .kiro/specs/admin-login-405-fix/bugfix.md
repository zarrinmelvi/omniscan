# Bugfix Requirements Document

## Introduction

When navigating to the admin portal (`admin.omniscan.website/admin/login`) and submitting valid credentials, the sign-in request fails with **"Request failed with status 405"**. This happens because `VITE_API_URL` is set to the frontend Vercel deployment URL (`omniscan-ten.vercel.app`) rather than the Nitro backend URL. The frontend deployment has no POST handler for `/api/admin/login`, so Vercel returns `405 Method Not Allowed`. The fix requires `VITE_API_URL` to point to the Nitro backend for both the production admin deployment (via Vercel environment variables) and local admin-mode development (via a dedicated `.env` file).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `VITE_API_URL` is set to the `omniscan-ui` frontend Vercel deployment URL AND a `POST /api/admin/login` request is made THEN the system returns HTTP 405 Method Not Allowed

1.2 WHEN the admin portal frontend is deployed or run locally without a dedicated admin environment configuration THEN the system uses the same `VITE_API_URL` as the client-mode deployment, which points to the frontend rather than the Nitro backend

1.3 WHEN `apiFetch` in `omniscan-ui/src/utils/api.ts` constructs the login request URL using `import.meta.env.VITE_API_URL` THEN the system sends the POST request to the frontend deployment, which has no matching API route handler

### Expected Behavior (Correct)

2.1 WHEN `VITE_API_URL` is correctly set to the Nitro backend Vercel deployment URL AND a `POST /api/admin/login` request is made THEN the system SHALL route the request to the Nitro backend and return a successful authentication response

2.2 WHEN the admin portal is deployed on Vercel THEN the system SHALL use a `VITE_API_URL` environment variable configured in the Vercel project settings that points to the Nitro backend URL, separate from any client-mode configuration

2.3 WHEN the admin portal is run locally in admin mode (`VITE_MODE=ADMIN`) THEN the system SHALL read `VITE_API_URL` from a dedicated local environment file (e.g. `.env.admin`) that points to the Nitro backend URL, not the frontend deployment URL

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the client-mode frontend (`VITE_MODE` is not `ADMIN`) makes API requests THEN the system SHALL CONTINUE TO use its own `VITE_API_URL` configuration without being affected by the admin-mode environment changes

3.2 WHEN valid credentials are submitted through the admin login form and `VITE_API_URL` correctly points to the Nitro backend THEN the system SHALL CONTINUE TO authenticate successfully via the existing `nitro-app/server/api/admin/login.post.ts` handler

3.3 WHEN any existing non-admin API calls are made from `omniscan-ui` THEN the system SHALL CONTINUE TO function correctly regardless of which environment configuration file is active

---

## Bug Condition Pseudocode

**Bug Condition Function:**
```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AdminLoginRequest
  OUTPUT: boolean

  // Bug is triggered when VITE_API_URL resolves to the frontend deployment
  RETURN X.VITE_API_URL = frontend_deployment_url
         AND X.endpoint = "POST /api/admin/login"
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL X WHERE isBugCondition(X) DO
  // After fix: VITE_API_URL points to Nitro backend
  result ← adminLogin'(X)
  ASSERT result.status != 405
         AND result.target = nitro_backend_url
END FOR
```

**Property: Preservation Checking**
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  // Non-admin and correctly-configured admin requests are unaffected
  ASSERT adminLogin(X) = adminLogin'(X)
END FOR
```
