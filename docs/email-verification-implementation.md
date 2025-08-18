# Email Verification Implementation

This document describes the email verification flow implementation for referred users in the VineMe app.

## Overview

The email verification system ensures that referred users verify their email addresses before they can fully access the app. This implementation satisfies requirements 5.1-5.4 from the referral system specification.

## Components

### 1. EmailVerificationService (`src/services/emailVerification.ts`)

A dedicated service that handles all email verification operations:

- **sendVerificationEmail()**: Sends verification emails with retry logic and user-friendly error messages
- **verifyEmailFromTokens()**: Handles verification when users click email links
- **checkVerificationStatus()**: Checks if a user's email is verified
- **resendVerificationEmail()**: Allows users to request new verification emails

### 2. Auth Service Enhancements (`src/services/auth.ts`)

Enhanced the existing auth service with:

- **handleEmailVerification()**: Processes verification tokens from email links
- **isEmailVerified()**: Checks user verification status
- **updateUserVerificationStatus()**: Updates database with verification status
- **buildEmailVerificationRedirectUrl()**: Creates deep link URLs for email verification

### 3. Email Verification Screen (`src/app/(auth)/verify-email.tsx`)

A dedicated screen that handles the verification process when users click email links:

- Shows loading state during verification
- Displays success message and redirects to onboarding
- Handles verification failures with retry options
- Provides fallback to return to sign-in

### 4. Email Verification Banner (`src/components/auth/EmailVerificationBanner.tsx`)

A banner component that appears for unverified users:

- Shows verification reminder message
- Provides "Resend Email" button
- Automatically hides when email is verified
- Integrated into the main app layout

### 5. Deep Linking Support (`src/utils/deepLinking.ts`)

Enhanced deep linking to support email verification:

- Parses `vineme://auth/verify-email` URLs
- Extracts access and refresh tokens from query parameters
- Routes to verification screen with proper parameters

## Flow

### 1. Referral Creation
1. User creates a referral through the referral form
2. System creates auth user account with `email_confirm: false`
3. System creates public user record with `newcomer: true`
4. EmailVerificationService sends verification email with deep link

### 2. Email Verification
1. Referred user receives email with verification link
2. User clicks link, which opens app via deep link (`vineme://auth/verify-email?access_token=...&refresh_token=...`)
3. App navigates to verification screen
4. Screen extracts tokens and calls `authService.handleEmailVerification()`
5. System sets session and updates user verification status
6. User is redirected to onboarding flow

### 3. Verification Status Tracking
- `email_verified` field added to User database type
- EmailVerificationBanner shows for unverified users
- Users can resend verification emails if needed

## Error Handling

### Email Service Errors
- Rate limiting: User-friendly message about waiting
- Invalid email: Clear validation error
- Network issues: Retry suggestions
- Service unavailable: Temporary unavailability message

### Verification Errors
- Invalid/expired tokens: Option to resend email
- Missing tokens: Clear error about invalid link
- Network failures: Retry mechanisms with exponential backoff

### Graceful Degradation
- Email failures don't block referral creation
- Users can still access app with unverified email (with banner reminder)
- Multiple retry mechanisms available

## Security Considerations

### Token Security
- Verification links expire automatically (handled by Supabase)
- Tokens are one-time use
- Deep link scheme prevents external access

### Data Protection
- Email addresses encrypted in transit
- Secure session storage
- PII handling compliance

## Testing

### Unit Tests
- EmailVerificationService methods (`src/services/__tests__/emailVerification.test.ts`)
- Email verification screen (`src/app/(auth)/__tests__/verify-email.test.tsx`)
- Updated referral service tests to use new email service

### Integration Testing
- End-to-end verification flow
- Deep link handling
- Error scenarios and recovery

## Configuration

### Environment Variables
Uses existing Supabase configuration:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Deep Link Scheme
- App scheme: `vineme://`
- Verification URL: `vineme://auth/verify-email`

### Email Templates
Email templates are configured in Supabase dashboard:
- Signup confirmation template
- Custom redirect URL: `vineme://auth/verify-email`

## Monitoring and Debugging

### Logging
- Email send success/failure logged
- Verification attempts tracked
- Error details captured for debugging

### Error Tracking
- User-friendly error messages
- Detailed error logging for developers
- Retry mechanisms with backoff

## Future Enhancements

### Potential Improvements
1. Custom email templates with referrer information
2. Email verification analytics and metrics
3. Batch email verification for admin operations
4. Email verification reminders after X days
5. Alternative verification methods (SMS, etc.)

### Scalability Considerations
- Email service rate limiting
- Database indexing for verification status
- Caching of verification status
- Queue management for high-volume scenarios