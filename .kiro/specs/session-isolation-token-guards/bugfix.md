# Bugfix Requirements Document

## Introduction

This document covers four related session management and routing defects in the OmniScan frontend (omniscan-ui). Together they form Epic 1: Single-Session Isolation, Token Lifetime & Route Guards.

The bugs allow admin and consumer sessions to coexist simultaneously, admin tokens to persist indefinitely past tab close, authenticated users to re-enter auth pages without redirection, and expired tokens to silently break the route guard with an unhandled network error.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Session Coexistence (Mutual Exclusion Missing)**

1.1 WHEN a user logs in as a consumer while an admin session is already active THEN the system keeps both `omniscan_token` and `omniscan_admin_token` alive simultaneously in localStorage

1.2 WHEN a user logs in as an admin while a consumer session is already active THEN the system keeps both tokens alive simultaneously and the consumer session is never invalidated

**Bug 2 — Admin Token Persists After Tab/Window Close**

1.3 WHEN an admin closes the browser tab or window after logging in THEN the system retains `omniscan_admin_token` and `omniscan_admin` in localStorage so the session is still active when the tab is reopened

**Bug 3 — No Redirect for Already-Authenticated Users on Auth Pages**

1.4 WHEN an authenticated consumer navigates to `/login`, `/register`, or `/` THEN the system renders the auth page without redirecting them to the application

1.5 WHEN an authenticated admin navigates to `/admin/login` THEN the system renders the admin login page without redirecting them to the dashboard

**Bug 4 — Silent Crash on Expired Token in Route Guard**

1.6 WHEN `checkAuth()` is called inside the global `beforeEach` guard and a network error is thrown THEN the system does not catch the error, causing the guard to neither call `next()` nor redirect, which blocks navigation silently

---

### Expected Behavior (Correct)

**Bug 1 — Session Coexistence**

2.1 WHEN a user logs in as a consumer while an admin session is already active THEN the system SHALL clear the admin token and admin object from storage and reset the admin auth store before completing the consumer login

2.2 WHEN a user logs in as an admin while a consumer session is already active THEN the system SHALL clear the consumer token from storage and reset the consumer auth store before completing the admin login

**Bug 2 — Admin Token Lifetime**

2.3 WHEN an admin closes the browser tab or window after logging in THEN the system SHALL have stored `omniscan_admin_token` and `omniscan_admin` in `sessionStorage` so they are cleared automatically and no session persists

**Bug 3 — Redirect for Authenticated Users**

2.4 WHEN an authenticated consumer navigates to `/login`, `/register`, or `/` THEN the system SHALL redirect them to `/tabs/home`

2.5 WHEN an authenticated admin navigates to `/admin/login` THEN the system SHALL redirect them to `/admin/dashboard`

**Bug 4 — Route Guard Error Handling**

2.6 WHEN `checkAuth()` throws a network or unexpected error inside the global `beforeEach` guard THEN the system SHALL catch the error, treat the user as unauthenticated, and redirect to `/login` rather than leaving navigation in a blocked state

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a consumer who is not authenticated navigates to any `/tabs/*` route THEN the system SHALL CONTINUE TO redirect them to `/login`

3.2 WHEN an admin who is not authenticated navigates to any `/admin/*` route THEN the system SHALL CONTINUE TO redirect them to `/admin/login`

3.3 WHEN a consumer logs in successfully THEN the system SHALL CONTINUE TO store the consumer token and set the consumer auth store state correctly

3.4 WHEN an admin logs in successfully THEN the system SHALL CONTINUE TO store the admin token and admin object and set the admin auth store state correctly

3.5 WHEN a consumer calls `logout()` THEN the system SHALL CONTINUE TO clear the consumer token and reset consumer auth store state without affecting any other stored data

3.6 WHEN an admin calls `logout()` THEN the system SHALL CONTINUE TO clear the admin token and admin object from storage and reset the admin auth store state

3.7 WHEN an admin is in `ADMIN` mode and navigates to a non-admin route THEN the system SHALL CONTINUE TO redirect them to `/admin/login`

3.8 WHEN a user is in `CLIENT` mode and navigates to an `/admin/*` route THEN the system SHALL CONTINUE TO redirect them to `/`

3.9 WHEN `checkAuth()` is called and no token exists in storage THEN the system SHALL CONTINUE TO leave the user as unauthenticated without making a network request

3.10 WHEN `checkAuth()` is called and the stored token is valid THEN the system SHALL CONTINUE TO restore the user object from the `/api/auth/me` response and mark the session as authenticated

3.11 WHEN `apiFetch` receives a 401 response on an admin request THEN the system SHALL CONTINUE TO log out the admin session only and redirect to `/admin/login` without touching the consumer session

3.12 WHEN `apiFetch` receives a 401 response on a consumer request THEN the system SHALL CONTINUE TO log out the consumer session only and redirect to `/` without touching the admin session
