# Authentication Implementation

This document describes the phone-first authentication system implemented for VineMe, following the specified requirements.

## Overview

The authentication system prioritizes phone number sign-up while supporting email as a fallback. Users always have a single Supabase `auth.users.id` regardless of their sign-in method.

## Architecture

### Core Components

1. **AuthService** (`src/services/auth.ts`) - Core authentication logic
2. **AuthStore** (`src/stores/auth.ts`) - Zustand store for auth state management
3. **AuthProvider** (`src/providers/AuthProvider.tsx`) - React context provider
4. **Auth Screens** - UI components for different auth flows
5. **OtpVerificationModal** - Reusable OTP verification component

### Key Principles

- **Single User Identity**: One `auth.users.id` per person, regardless of sign-in method
- **Phone First**: Phone sign-up is the preferred method
- **No Duplicate Users**: Use `shouldCreateUser: false` in login flows
- **Normalized Phone Storage**: Store phone in both `auth.users.phone` and `public.users.phone`
- **User-Friendly Errors**: Clear messaging for "user not found" scenarios

## Authentication Flows

### 1. Sign-Up with Phone (Preferred)

**Flow**: `PhoneSignUpScreen` → OTP Verification → Email Linking → Onboarding

```typescript
// 1. Send OTP to phone
await authService.signUpWithPhone(phone); // shouldCreateUser: true

// 2. Verify OTP
await authService.verifyOtp(phone, code, 'sms');

// 3. Link email (required)
await authService.linkEmail(email);

// 4. Complete onboarding
```

**Implementation Details**:
- Uses `supabase.auth.signInWithOtp()` with `shouldCreateUser: true`
- Phone must be in E.164 format (e.g., `+14155551234`)
- 4-digit OTP code expected
- Email linking is mandatory after phone verification
- Phone is stored in both auth and public users tables

### 2. Sign-In with Phone

**Flow**: `PhoneSignInScreen` → OTP Verification → Main App

```typescript
// 1. Send OTP to phone
await authService.signInWithPhone(phone); // shouldCreateUser: false

// 2. Verify OTP
await authService.verifyOtp(phone, code, 'sms');
```

**Error Handling**:
- If user not found: "This phone isn't linked yet. Please log in with your email, then link your phone in Profile → Security."

### 3. Sign-In with Email (Fallback)

**Flow**: `EmailLoginScreen` → Magic Link → Email Verification → Main App

```typescript
// 1. Send magic link to email
await authService.signInWithEmail(email); // shouldCreateUser: false, emailRedirectTo: 'vineme://auth/verify-email'

// 2. User clicks magic link in email
// 3. Deep link opens app and handles verification automatically
```

**Error Handling**:
- If user not found: "This email isn't linked yet. Please sign up with your phone first."

### 4. Profile Security (Credential Management)

**Location**: `src/app/(tabs)/profile/security.tsx`

**Features**:
- Link/Update phone number (SMS OTP verification)
- Link/Update email address (Magic link verification)
- Updates both auth and public user records

## Phone Number Handling

### Normalization

Phone numbers are normalized to E.164 format:

```typescript
private normalizePhone(input: string): string | null {
  if (!input) return null;
  
  // Remove all non-digit characters except +
  const cleaned = input.replace(/[^\d+]/g, '');
  
  // Must start with + and have at least 10 digits
  if (!cleaned.startsWith('+') || cleaned.length < 11) {
    return null;
  }
  
  return cleaned;
}
```

### Storage

- **Auth Table**: `auth.users.phone` (managed by Supabase)
- **Public Table**: `public.users.phone` (managed by app, unique constraint)

## Verification Methods

### SMS OTP Verification
- **Code Length**: 4-digit codes
- **Process**: User receives SMS → enters code → verification

```typescript
await authService.verifyOtp(phone, code);
```

### Email Magic Link Verification
- **Process**: User receives email → clicks link → automatic verification
- **Deep Link**: `vineme://auth/verify-email` with tokens
- **Handled by**: `src/app/(auth)/verify-email.tsx`

The service automatically:
1. Validates code length (SMS only)
2. Calls appropriate Supabase verification method
3. Stores session securely
4. Returns user object on success

## UI Components

### Screen Hierarchy

```
/(auth)/
├── welcome.tsx          # Entry point with sign-up/sign-in options
├── phone-signup.tsx     # Phone sign-up flow
├── phone-login.tsx      # Phone sign-in flow
├── email-login.tsx      # Email sign-in flow
└── onboarding.tsx       # Post-auth profile setup

/(tabs)/profile/
└── security.tsx         # Credential management
```

### Reusable Components

- **OtpVerificationModal**: Modal for OTP entry with resend functionality
- **CountryCodePicker**: Phone country code selection
- **OtpInput**: Styled OTP code input

## Error Handling

### User-Friendly Messages

| Scenario | Message |
|----------|---------|
| Phone not found | "This phone isn't linked yet. Please log in with your email, then link your phone in Profile → Security." |
| Email not found | "This email isn't linked yet. Please sign up with your phone first." |
| Invalid phone format | "Invalid phone number format. Please use +countrycode format." |
| Invalid OTP | "Enter the 4-digit code" |

### Technical Error Handling

- All auth methods return `{ success: boolean; error?: string }` format
- Supabase errors are caught and transformed to user-friendly messages
- Network errors are handled with retry logic where appropriate

## Security Considerations

### Session Management

- Sessions stored securely using `expo-secure-store`
- Automatic token refresh handled by Supabase client
- Session cleared on sign-out

### Verification Security

- **SMS OTP**: Codes generated and validated by Supabase
- **Email Magic Links**: Secure tokens generated by Supabase
- No client-side code generation or validation
- Rate limiting handled by Supabase
- Deep link verification with secure token exchange

### Data Integrity

- Phone numbers normalized before storage
- Unique constraints on phone in public users table
- Proper cleanup on account deletion

## Testing

### Test Coverage

- Unit tests for all auth service methods
- Integration tests for complete flows
- Error scenario testing
- Phone normalization testing

### Test Files

- `src/__tests__/auth/phone-auth-flows.test.ts` - Core auth flow testing
- Component tests for each auth screen
- E2E tests for complete user journeys

## Configuration

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Configuration

1. **Auth Settings**:
   - Enable phone authentication
   - Configure SMS provider
   - Set SMS OTP code length to 4 digits
   - Configure email redirect URL: `vineme://auth/verify-email`

2. **Database Schema**:
   ```sql
   -- Ensure phone column exists in public.users
   ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
   
   -- Add index for performance
   CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
   ```

3. **RLS Policies**:
   - Ensure users can read/update their own records
   - Proper policies for phone field access

## Migration Guide

### From Password-Based Auth

1. Existing users can link phone numbers via Profile → Security
2. Password sign-in remains available but not promoted
3. Gradual migration encouraged through UI prompts

### Database Updates

```sql
-- Add phone column if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- Update existing users to sync phone from auth.users
UPDATE public.users 
SET phone = auth.users.phone 
FROM auth.users 
WHERE public.users.id = auth.users.id 
AND auth.users.phone IS NOT NULL 
AND public.users.phone IS NULL;
```

## Troubleshooting

### Common Issues

1. **Phone not linking**: Check E.164 format and Supabase phone auth settings
2. **OTP not received**: Verify SMS provider configuration and phone number validity
3. **Duplicate users**: Ensure `shouldCreateUser: false` in sign-in flows
4. **Session issues**: Check secure storage implementation and token refresh

### Debug Tools

- Auth state logging in development mode
- Supabase dashboard for user management
- Network request logging for OTP flows

## Future Enhancements

1. **Social Auth**: Add Google/Apple sign-in with phone linking requirement
2. **Multi-Factor Auth**: Optional second factor for enhanced security
3. **Phone Verification**: Additional verification steps for sensitive operations
4. **Account Recovery**: Phone-based account recovery flows