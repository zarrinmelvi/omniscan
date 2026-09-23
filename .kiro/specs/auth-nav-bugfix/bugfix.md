# Bugfix Requirements Document

## Introduction

This document captures the bugs affecting the authentication (sign-up) and navigation workflows in the OmniScan mobile application. The issues span two areas:

1. **Sign-Up Validation** (`RegisterPage.vue`): Input fields lack visual error feedback (red borders), the duplicate-email error message is missing, there is no enforcement that the display name cannot equal the password, email validation only checks for the `@` symbol without verifying a valid top-level domain, and the "Complete Setup" / "Skip for now" buttons on step 2 as well as the back-button navigation logic are broken.

2. **Settings & Back Transition** (`SettingsPage.vue`): The back animation slides in from the wrong direction (left instead of right) when stepping back, and the logout screen's back button does not safely return to the previous view.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits the sign-up form with an invalid or empty field THEN the system shows a generic error message banner but does NOT highlight the specific field with a red border outline.

1.2 WHEN a user attempts to register with an email address that already exists in the system THEN the system displays a generic API error message instead of the explicit message "email already exists."

1.3 WHEN a user enters a password that is identical to their display name THEN the system allows the submission to proceed without raising a validation error.

1.4 WHEN a user enters an email address that contains an `@` symbol but lacks a valid top-level domain (e.g. `user@domain` without `.com`) THEN the system accepts the email format as valid and proceeds to the API call.

1.5 WHEN a user is on step 2 of registration and clicks "Complete Setup" THEN the button does not reliably trigger the `completeSetup` handler (e.g., due to a missing or incorrect event binding).

1.6 WHEN a user is on step 2 of registration and clicks "Skip for now" THEN the button does not reliably trigger the `skipForNow` handler.

1.7 WHEN a user is on step 1 of registration and clicks the back button THEN the navigation logic does not correctly route the user back to the previous screen (Welcome or Login page).

1.8 WHEN a user navigates back from the Settings page THEN the page transition animates sliding in from the left instead of the right, which is the wrong direction for a back navigation gesture.

1.9 WHEN a user is on the logout confirmation screen and clicks the back button THEN the back button does not safely return the user to the previous view and may crash or navigate to an unexpected route.

---

### Expected Behavior (Correct)

2.1 WHEN a user submits the sign-up form and a field fails validation THEN the system SHALL apply a red border outline to that specific input field in addition to showing the error message.

2.2 WHEN the API returns a duplicate-email error during registration THEN the system SHALL display the explicit inline message "email already exists." and SHALL apply a red border outline to the email input field.

2.3 WHEN a user enters a password that is identical to their display name THEN the system SHALL reject the submission and display the error message "Password cannot be the same as your name."

2.4 WHEN a user enters an email address THEN the system SHALL validate that it contains a valid top-level domain (i.e., matches a pattern such as `something@domain.tld` where `tld` is at least 2 characters) and SHALL display an inline error message if validation fails.

2.5 WHEN a user is on step 2 of registration and clicks "Complete Setup" THEN the system SHALL invoke the `completeSetup` function, save dietary preferences, and navigate the user to `/tabs/home`.

2.6 WHEN a user is on step 2 of registration and clicks "Skip for now" THEN the system SHALL invoke the `skipForNow` function and navigate the user to `/tabs/home` without saving preferences.

2.7 WHEN a user is on step 1 of registration and clicks the back button THEN the system SHALL navigate back to the previous screen (Welcome or Login page) using `router.back()`.

2.8 WHEN a user navigates back from the Settings page THEN the system SHALL animate the transition sliding in from the right, consistent with the standard back-navigation direction.

2.9 WHEN a user is on the logout confirmation screen and clicks the back button THEN the system SHALL safely return the user to the previous view (Profile page) without crashing or navigating to an unintended route.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user enters a valid email (e.g. `user@example.com`) and a password that differs from their name THEN the system SHALL CONTINUE TO accept the form and proceed to account creation.

3.2 WHEN a user enters a valid email and a password of 8 or more characters THEN the system SHALL CONTINUE TO enforce the minimum password length check as before.

3.3 WHEN a user enters matching passwords in the "Password" and "Confirm Password" fields THEN the system SHALL CONTINUE TO accept the match and allow progression.

3.4 WHEN a user on step 2 selects dietary preferences and clicks "Complete Setup" successfully THEN the system SHALL CONTINUE TO save the selected allergen IDs and Halal preference to the user profile.

3.5 WHEN a user navigates from the Profile page to the Settings page THEN the system SHALL CONTINUE TO perform a forward-direction slide animation into the Settings page.

3.6 WHEN a user is on the Settings page and performs normal settings changes (toggles, modals) THEN the system SHALL CONTINUE TO save preferences to `localStorage` and function as before.

3.7 WHEN the back button is clicked on any page that is NOT step 1 of registration and NOT the Settings/logout screens THEN the system SHALL CONTINUE TO use the default Ionic/Vue Router back navigation behavior unchanged.
