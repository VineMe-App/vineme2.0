# Referral System API Documentation

## Overview

The referral system provides functionality for existing users to refer new people to the VineMe community through two pathways: general referrals and group-specific referrals.

## Service Methods

### ReferralService

#### `createReferral(data: CreateReferralData): Promise<ReferralResponse>`

Creates a referral based on the provided data. Automatically determines whether to create a general or group referral based on the presence of `groupId`.

**Parameters:**
- `data: CreateReferralData` - The referral data including email, phone, note, and optional group ID

**Returns:**
- `Promise<ReferralResponse>` - Success status and user ID or error message

**Example:**
```typescript
const referralService = new ReferralService();
const result = await referralService.createReferral({
  email: 'john@example.com',
  phone: '+1234567890',
  note: 'Great person for our community',
  referrerId: 'user-123',
  groupId: 'group-456' // Optional
});
```

#### `createGeneralReferral(data: CreateReferralData): Promise<ReferralResponse>`

Creates a general referral when no specific group is targeted.

**Parameters:**
- `data: CreateReferralData` - The referral data without group ID

**Returns:**
- `Promise<ReferralResponse>` - Success status and user ID or error message

#### `createGroupReferral(data: CreateReferralData): Promise<ReferralResponse>`

Creates a group-specific referral.

**Parameters:**
- `data: CreateReferralData` - The referral data including group ID

**Returns:**
- `Promise<ReferralResponse>` - Success status and user ID or error message

### AuthService Extensions

#### `createReferredUser(userData: CreateReferredUserData): Promise<string>`

Creates a new user account for a referred person with automatic email verification.

**Parameters:**
- `userData: CreateReferredUserData` - User data including email, phone, and names

**Returns:**
- `Promise<string>` - The created user ID

### EmailVerificationService

#### `sendVerificationEmail(userId: string, email: string): Promise<void>`

Sends a verification email to a newly referred user.

**Parameters:**
- `userId: string` - The user ID
- `email: string` - The email address to send verification to

**Returns:**
- `Promise<void>` - Resolves when email is sent

## Data Types

### CreateReferralData

```typescript
interface CreateReferralData {
  email: string;           // Required: Referred person's email
  phone: string;           // Required: Referred person's phone
  note: string;            // Required: Context note from referrer
  firstName?: string;      // Optional: Referred person's first name
  lastName?: string;       // Optional: Referred person's last name
  groupId?: string;        // Optional: Target group ID for group referrals
  referrerId: string;      // Required: ID of the referring user
}
```

### ReferralResponse

```typescript
interface ReferralResponse {
  success: boolean;        // Whether the operation succeeded
  userId?: string;         // Created user ID on success
  error?: string;          // Error message on failure
}
```

### CreateReferredUserData

```typescript
interface CreateReferredUserData {
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
}
```

## Database Schema

### group_referrals Table

Stores group-specific referral records.

```sql
CREATE TABLE group_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### general_referrals Table

Stores general referral records.

```sql
CREATE TABLE general_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Error Handling

### Common Errors

- **ValidationError**: Invalid email format or missing required fields
- **DuplicateEmailError**: Email already exists in the system
- **DatabaseError**: Database operation failures
- **EmailServiceError**: Email verification sending failures

### Error Response Format

```typescript
{
  success: false,
  error: "Descriptive error message"
}
```

## Security Considerations

- All referral operations require authenticated users
- Email and phone data is validated and sanitized
- Rate limiting prevents spam referrals
- Verification emails expire after 24 hours
- PII is handled according to privacy policies

## Performance Notes

- Referral creation is optimized with database transactions
- Email sending is asynchronous to avoid blocking UI
- Validation is performed client-side and server-side
- Database indexes optimize referral queries