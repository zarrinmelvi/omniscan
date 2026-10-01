# Requirements Document: Email Verification

## Introduction

This document specifies the requirements for implementing email verification in OmniScan. The feature ensures that users registering with email/password prove ownership of their email address by clicking a verification link sent via email, preventing fake accounts and improving security.

## Glossary

- **Verified_User**: A user whose email address has been confirmed through the verification process
- **Unverified_User**: A user who has registered but has not yet clicked their verification link
- **Verification_Token**: A unique, cryptographically secure token embedded in verification links
- **Verification_Link**: The URL containing the verification token sent via email
- **Email_Service**: Resend API used to send transactional emails
- **Grace_Period**: The 24-hour window during which a verification link remains valid
- **Cleanup_Period**: The 7-day window after which unverified accounts are automatically deleted
- **Resend_Cooldown**: The 60-second waiting period between resend requests
- **Grandfathered_User**: Existing users automatically marked as verified during migration

## Requirements

### Requirement 1: Email Verification During Registration

**User Story:** As a new user, I want to verify my email address during registration, so that the system knows I own the email I provided.

#### Acceptance Criteria

1. WHEN a user submits the registration form with valid data, THE system SHALL attempt to send a verification email before creating the account
2. WHEN the verification email sends successfully, THE system SHALL create the user account with email_verified = false
3. WHEN the verification email fails to send, THE system SHALL NOT create the account and SHALL display an error message
4. WHEN a user account is created, THE system SHALL generate a unique verification_token and store it with an expiration timestamp 24 hours in the future
5. THE verification email SHALL include a verification link containing the verification_token

### Requirement 2: Verification Link Functionality

**User Story:** As a new user, I want to click the verification link in my email, so that I can activate my account.

#### Acceptance Criteria

1. WHEN a user clicks a verification link, THE system SHALL validate the verification_token from the URL
2. WHEN the verification_token is valid and not expired, THE system SHALL set email_verified = true for that user
3. WHEN the verification_token is expired, THE system SHALL display an error message with a "Resend verification email" option
4. WHEN the verification_token is invalid or already used, THE system SHALL display an appropriate error message
5. WHEN verification succeeds, THE system SHALL redirect the user to complete Terms & Conditions acceptance

### Requirement 3: Login Restriction for Unverified Users

**User Story:** As the system, I want to prevent unverified users from logging in, so that only users who own their email address can access the application.

#### Acceptance Criteria

1. WHEN an unverified user attempts to log in, THE system SHALL reject the login attempt
2. WHEN login is rejected due to unverified email, THE system SHALL display the message: "Please verify your email address. Check your inbox for the verification link."
3. WHEN an unverified user is blocked from logging in, THE system SHALL display a "Resend verification email" button
4. WHEN a verified user logs in, THE system SHALL proceed with normal authentication flow

### Requirement 4: Resend Verification Email

**User Story:** As a user who didn't receive or lost my verification email, I want to request a new one, so that I can complete my registration.

#### Acceptance Criteria

1. THE system SHALL display a "Resend verification email" button on the post-registration "Check your email" page
2. THE system SHALL display a "Resend verification email" button on the login page error message for unverified users
3. WHEN a user clicks "Resend verification email", THE system SHALL enforce a 60-second cooldown since the last send attempt
4. WHEN the cooldown period has not elapsed, THE system SHALL display: "Please wait X seconds before requesting another email."
5. WHEN the cooldown period has elapsed, THE system SHALL generate a new verification_token, invalidate the old token, and send a new verification email
6. WHEN resend succeeds, THE system SHALL display: "Verification email sent! Please check your inbox."

### Requirement 5: Verification Link Expiration

**User Story:** As the system, I want verification links to expire after 24 hours, so that old links cannot be used to compromise accounts.

#### Acceptance Criteria

1. WHEN a verification_token is generated, THE system SHALL set verification_token_expires_at to 24 hours from the current time
2. WHEN a user clicks a verification link, THE system SHALL check if the current time is before verification_token_expires_at
3. WHEN the verification link has expired, THE system SHALL display: "This verification link has expired. Please request a new one."
4. WHEN the verification link has expired, THE system SHALL provide a "Resend verification email" button
5. WHEN a new verification email is sent, THE system SHALL invalidate any previous unexpired tokens for that user

### Requirement 6: Welcome Email After Verification

**User Story:** As a newly verified user, I want to receive a welcome email with quick start tips, so that I know my account is active and how to use OmniScan.

#### Acceptance Criteria

1. WHEN a user successfully verifies their email, THE system SHALL send a welcome email to the verified address
2. THE welcome email SHALL include quick start tips about using OmniScan features
3. THE welcome email SHALL NOT include call-to-action buttons or links back to the application
4. THE welcome email SHALL be informational only, as the user continues onboarding in the browser after verification
5. WHEN the welcome email fails to send, THE system SHALL log the error but SHALL NOT block the verification process

### Requirement 7: Unverified Account Cleanup

**User Story:** As the system, I want to automatically delete accounts that remain unverified for 7 days, so that the database doesn't accumulate abandoned registrations.

#### Acceptance Criteria

1. THE system SHALL implement a scheduled job that runs daily to identify unverified accounts
2. WHEN an account has email_verified = false AND created_at is more than 7 days ago, THE system SHALL delete that account
3. THE system SHALL log all deleted accounts for audit purposes
4. THE cleanup process SHALL NOT delete verified accounts regardless of age
5. THE cleanup process SHALL NOT send any notification emails before deletion

### Requirement 8: Migration Strategy for Existing Users

**User Story:** As an existing user, I want my account to continue working after email verification is implemented, so that I don't get locked out.

#### Acceptance Criteria

1. WHEN the email verification feature is deployed, THE system SHALL run a one-time migration script
2. THE migration script SHALL set email_verified = true for all existing user accounts
3. THE migration script SHALL set verification_token = NULL and verification_token_expires_at = NULL for existing accounts
4. THE migration script SHALL add a created_at timestamp to existing accounts using their last_active or current timestamp
5. AFTER migration, existing users SHALL be able to log in without any verification requirement

### Requirement 9: Email Service Integration

**User Story:** As the system, I want to reliably send verification and welcome emails using Resend API, so that users receive timely notifications.

#### Acceptance Criteria

1. THE system SHALL use the Resend API to send all verification and welcome emails
2. THE system SHALL configure the Resend API key via environment variable RESEND_API_KEY
3. THE verification email SHALL have the subject line: "Verify your OmniScan account"
4. THE welcome email SHALL have the subject line: "Welcome to OmniScan!"
5. WHEN Resend API returns an error, THE system SHALL log the full error details for debugging
6. WHEN Resend API is unreachable, THE system SHALL fail gracefully and inform the user to try again later

### Requirement 10: Verification Email Content

**User Story:** As a new user, I want to receive a clear verification email with easy-to-follow instructions, so that I understand what to do next.

#### Acceptance Criteria

1. THE verification email SHALL address the user by their registered name
2. THE verification email SHALL clearly state: "Please verify your email address to activate your OmniScan account."
3. THE verification email SHALL include a prominent verification link
4. THE verification email SHALL state that the link expires in 24 hours
5. THE verification email SHALL include a note: "If you didn't create an account, you can safely ignore this email."
6. THE verification email SHALL be sent from a recognizable sender name and address (e.g., "OmniScan <noreply@omniscan.app>")

### Requirement 11: Database Schema Changes

**User Story:** As the system, I want to track email verification status and tokens in the database, so that I can enforce verification requirements.

#### Acceptance Criteria

1. THE User table SHALL include an email_verified column of type boolean with default value false
2. THE User table SHALL include a verification_token column of type string, nullable
3. THE User table SHALL include a verification_token_expires_at column of type timestamp, nullable
4. THE User table SHALL include a created_at column of type timestamp with default value of current timestamp
5. THE system SHALL create a database index on the verification_token column for efficient lookups

### Requirement 12: Rate Limiting for Resend Requests

**User Story:** As the system, I want to prevent abuse of the resend verification email feature, so that malicious users cannot spam email addresses.

#### Acceptance Criteria

1. THE system SHALL track the timestamp of the last verification email sent for each user
2. WHEN a resend request is made, THE system SHALL check if 60 seconds have elapsed since the last send
3. WHEN the 60-second cooldown has not elapsed, THE system SHALL reject the resend request
4. WHEN the 60-second cooldown has elapsed, THE system SHALL allow the resend and update the last-sent timestamp
5. THE cooldown timer SHALL display on the UI, counting down from 60 seconds to 0

### Requirement 13: Post-Verification Onboarding Flow

**User Story:** As a newly verified user, I want to complete my account setup after verification, so that I can start using OmniScan.

#### Acceptance Criteria

1. WHEN verification succeeds, THE system SHALL redirect the user to the Terms & Conditions acceptance screen
2. WHEN the user accepts Terms & Conditions, THE system SHALL redirect to Step 2: Dietary Preferences
3. WHEN the user completes Dietary Preferences, THE system SHALL redirect to the home page
4. WHEN the user skips Dietary Preferences, THE system SHALL still redirect to the home page
5. THE onboarding flow after verification SHALL be identical to the current post-registration flow

### Requirement 14: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I know what to do next.

#### Acceptance Criteria

1. WHEN email sending fails during registration, THE system SHALL display: "Unable to send verification email. Please check your email address and try again."
2. WHEN a verification token is invalid, THE system SHALL display: "This verification link is invalid. Please request a new one."
3. WHEN a verification token is expired, THE system SHALL display: "This verification link has expired. Please request a new one."
4. WHEN a verification token is already used, THE system SHALL display: "This email address is already verified. You can log in now."
5. WHEN an unverified user tries to log in, THE system SHALL display: "Please verify your email address. Check your inbox for the verification link."
6. THE system SHALL log all verification errors with sufficient detail for debugging
