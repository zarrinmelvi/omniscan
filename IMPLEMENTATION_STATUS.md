# Implementation Status: Enhanced Registration with Gender/Birthday and Google Sign-Up Terms Gate

## ✅ Completed Tasks

### Task 1: Update Database Schema and Backend Validation ✅
**Status:** COMPLETE

**Changes Made:**
1. ✅ Added `gender String?` and `birthday DateTime?` fields to User model in `prisma/schema.prisma`
2. ✅ Ran Prisma migration and generate
3. ✅ Updated `server/api/auth/register.post.ts`:
   - Added gender and birthday validation
   - Age validation (must be 16+)
   - Gender enum validation (Male, Female, Other, Prefer not to say)
   - Stores gender and birthday in user creation
4. ✅ Created `server/api/auth/google/register.post.ts`:
   - New endpoint for Google OAuth account creation
   - Same validation as password registration
   - Checks for existing users
   - Creates user with OAuth provider info
   - Generates JWT token for immediate login

**Files Modified:**
- `nitro-app/prisma/schema.prisma`
- `nitro-app/server/api/auth/register.post.ts`
- `nitro-app/server/api/auth/google/register.post.ts` (NEW)

---

### Task 2: Update Google OAuth Flow - Return Temp Token for New Users ✅
**Status:** COMPLETE

**Changes Made:**
1. ✅ Updated `server/api/auth/google/callback.get.ts`:
   - Checks if user exists by email
   - Existing users: Issue JWT and log in (existing behavior)
   - New users: Create temporary JWT token (10-minute expiry) and redirect to `/register?oauth_pending=...`
2. ✅ Created `server/api/auth/google/verify.post.ts`:
   - New endpoint for native mobile Google authentication
   - Installed `google-auth-library` package
   - Verifies ID token with Google OAuth2Client
   - Returns login token for existing users
   - Returns pending token for new users

**Files Modified:**
- `nitro-app/server/api/auth/google/callback.get.ts`
- `nitro-app/server/api/auth/google/verify.post.ts` (NEW)
- `nitro-app/package.json` (added google-auth-library dependency)

---

### Task 3: Update Frontend State Management - Add Pending Google Data ✅
**Status:** COMPLETE

**Changes Made:**
1. ✅ Updated `omniscan-ui/src/stores/authStore.ts`:
   - Added `pendingGoogleData` state field (nullable object with email, firstName, lastName, googleId, username)
   - Added `setPendingGoogleData(data)` action
   - Added `clearPendingGoogleData()` action
   - Added `createGoogleAccount(username, gender, birthday)` action
   - Updated `register()` signature to accept gender and birthday parameters

**Files Modified:**
- `omniscan-ui/src/stores/authStore.ts`

---

### Task 4: Update RegisterPage Step 1 - Add Gender, Birthday, and Google Pre-fill Logic ✅
**Status:** COMPLETE

**Changes Made:**
1. ✅ Added new reactive refs: `gender`, `birthday`, `isGooglePending`
2. ✅ Added to `fieldErrors`: `gender: false`, `birthday: false`
3. ✅ Added computed properties:
   - `maxBirthdayDate`: Calculates date 16 years ago
   - `ageError`: Validates age is 16+
   - `isBirthdayValid`: Checks birthday is filled and valid
4. ✅ Added Gender dropdown (after Confirm Password)
5. ✅ Added Birthday date picker (after Gender)
6. ✅ Added Google OAuth pending handler in `onMounted()`:
   - Decodes `oauth_pending` JWT token
   - Stores data in authStore
   - Pre-fills form fields
   - Generates and validates username
7. ✅ Conditional field display:
   - Email field disabled when `isGooglePending`
   - Password fields wrapped in `v-if="!isGooglePending"`
   - Added Google password message for Google users
8. ✅ Updated Continue button disabled logic to check gender and birthday
9. ✅ Added CSS styling:
   - Custom select dropdown with arrow
   - Date input styling
   - Field error text styling
   - Google password message styling
   - Dark mode support
10. ✅ Added `informationCircleOutline` icon import

**Files Modified:**
- `omniscan-ui/src/views/RegisterPage.vue`

---

### Task 5: Update Terms Modal Flow and Account Creation ✅
**Status:** COMPLETE

**Changes Made:**
1. ✅ Updated `handleRegister()`:
   - Added gender and birthday validation
   - Conditional password validation (skip for Google users)
   - Age validation check
   - Opens Terms modal after validation passes
2. ✅ Updated `acceptTerms()`:
   - Routes to `completeGoogleRegistration()` for Google users
   - Routes to `submitPasswordRegistration()` for password users
3. ✅ Created `completeGoogleRegistration()`:
   - Calls `authStore.createGoogleAccount()` with username, gender, birthday
   - Shows success toast
   - Proceeds to Step 2
4. ✅ Created `submitPasswordRegistration()`:
   - Extracted existing password registration logic
   - Passes gender and birthday to register API
5. ✅ Updated `disagreeTerms()`:
   - Checks if Google pending
   - Calls `handleGoogleSignUpCancellation()` for Google users
6. ✅ Created `handleGoogleSignUpCancellation()`:
   - Signs out from Google (native only)
   - Clears pending data from authStore
   - Clears all form fields
   - Resets `isGooglePending` flag
   - Shows cancellation toast

**Files Modified:**
- `omniscan-ui/src/views/RegisterPage.vue`

---

### Task 6: Update Native Google Sign-In Handler ✅
**Status:** COMPLETE

**Changes Made:**
1. ✅ Updated `handleGoogleSignIn()` native branch:
   - Calls `/api/auth/google/verify` endpoint
   - Handles `requiresRegistration: true` case:
     - Decodes pending token
     - Stores data in authStore
     - Pre-fills form fields
     - Validates username
     - Shows completion toast
   - Handles `requiresRegistration: false` case:
     - Logs in with OAuth token
     - Redirects to /tabs/home

**Files Modified:**
- `omniscan-ui/src/views/RegisterPage.vue`

---

## 🧪 Task 7: Integration Testing and Bug Fixes
**Status:** PENDING - READY FOR TESTING

### Test Scenarios to Execute:

1. **Password Registration (Happy Path)**
   - Fill all fields including gender (select an option) and birthday (16+ years)
   - Click Continue → Terms modal appears
   - Click "I Agree" → Verification email sent
   - Check email and verify account
   - Complete Step 2 (dietary preferences)
   - ✅ Expected: Account created, email verified, logged in

2. **Password Registration (Age < 16)**
   - Enter birthday less than 16 years ago
   - ✅ Expected: Error message "You must be at least 16 years old to register" below birthday field
   - ✅ Expected: Continue button disabled

3. **Password Registration (Missing Gender)**
   - Fill all fields except gender
   - ✅ Expected: Continue button disabled
   - Select gender
   - ✅ Expected: Button enables

4. **Google OAuth Web (New User - Happy Path)**
   - Click "Sign up with Google"
   - Complete Google authentication
   - ✅ Expected: Redirected to /register with pre-filled name/email/username
   - ✅ Expected: Email field disabled
   - ✅ Expected: Password fields hidden with message "Password not required for Google accounts"
   - Fill gender and birthday
   - Click Continue → Terms modal appears
   - Click "I Agree"
   - ✅ Expected: Success toast "Account created successfully!"
   - ✅ Expected: Proceed to Step 2
   - Complete dietary preferences
   - ✅ Expected: Navigate to /tabs/home

5. **Google OAuth Web (Decline Terms)**
   - Follow steps 1-6 from Scenario 4
   - Click "I Disagree" on Terms modal
   - ✅ Expected: Modal closes
   - ✅ Expected: Warning toast "Google sign-up cancelled"
   - ✅ Expected: Form cleared, back to empty Step 1
   - ✅ Expected: Can try registration again

6. **Google OAuth Web (Existing User)**
   - Click "Sign up with Google" using existing account email
   - Complete Google authentication
   - ✅ Expected: Bypasses registration, logs in directly
   - ✅ Expected: Redirects to /tabs/home

7. **Native Google Sign-In (New User)**
   - On mobile device, click "Sign up with Google"
   - Select Google account
   - ✅ Expected: Form pre-fills (same as Scenario 4)
   - Complete registration flow

8. **Native Google Sign-In (Existing User)**
   - On mobile device, click "Sign up with Google"
   - Select Google account with existing email
   - ✅ Expected: Logs in directly to /tabs/home

---

## 📝 Summary of Changes

### Backend Changes:
1. Database schema updated with `gender` and `birthday` fields (nullable)
2. Password registration endpoint validates and stores gender/birthday
3. New Google registration endpoint created for post-Terms account creation
4. Google OAuth callback redirects new users to registration
5. New native verify endpoint for mobile Google Sign-In

### Frontend Changes:
1. RegisterPage Step 1 form includes gender dropdown and birthday date picker
2. Age validation (16+) with inline error messages
3. Google OAuth pending state management in authStore
4. Form pre-fill for Google users (name, email, username)
5. Conditional field display (password hidden for Google users)
6. Terms modal appears on Continue click for both flows
7. Account created only after Terms acceptance
8. Decline Terms clears Google session and form data
9. Native Google Sign-In follows same flow as web

### User Experience:
- All users must provide gender and birthday to register
- Password users: Fill form → Continue → Accept Terms → Email verification → Step 2
- Google users: Authenticate → Pre-fill form → Fill gender/birthday → Continue → Accept Terms → Account created → Step 2
- Declining Terms for Google sign-up clears all data and returns to empty form
- Existing Google users bypass registration and log in directly

---

## 🚀 Next Steps

1. **Test all 8 scenarios** listed in Task 7
2. **Fix any bugs** discovered during testing
3. **Verify database** records are correct (gender and birthday stored)
4. **Test on mobile** devices for native Google Sign-In flow
5. **Check UI/UX** on different screen sizes and browsers
6. **Verify dark mode** styling works correctly

---

## 📄 Files Modified

### Backend:
- `nitro-app/prisma/schema.prisma`
- `nitro-app/server/api/auth/register.post.ts`
- `nitro-app/server/api/auth/google/callback.get.ts`
- `nitro-app/server/api/auth/google/register.post.ts` (NEW)
- `nitro-app/server/api/auth/google/verify.post.ts` (NEW)
- `nitro-app/package.json`

### Frontend:
- `omniscan-ui/src/stores/authStore.ts`
- `omniscan-ui/src/views/RegisterPage.vue`

---

**Implementation Date:** December 2024
**Status:** ✅ COMPLETE - Ready for Testing
