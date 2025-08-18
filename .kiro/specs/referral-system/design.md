# Design Document

## Overview

The referral system enables existing users to connect new people to the VineMe community through two pathways: general referrals and group-specific referrals. The system creates new user accounts with automated email verification, tracks referral relationships, and marks referred users as newcomers for appropriate onboarding.

## Architecture

### Component Architecture

```
Home Screen
├── Connect Someone Else Section
└── Navigation to Referral Landing

Referral Landing Page
├── Decision Flow (Group fits vs No group fits)
├── Navigation to Group Browse
└── Navigation to General Referral Form

Group Detail Page
├── Existing Components
└── Refer a Friend Button (new)

Referral Form Modal
├── Form Fields (email, phone, note)
├── Validation Logic
└── Submission Handler

Services Layer
├── Referral Service (new)
├── Enhanced Auth Service
└── Enhanced User Service
```

### Data Flow

1. User initiates referral from home page or group page
2. Form captures referral details and context
3. Service creates auth.user and public.user records
4. System creates referral tracking record
5. Email verification is triggered automatically
6. Referred user completes account setup via email link

## Components and Interfaces

### New Components

#### ReferralLandingPage

```typescript
interface ReferralLandingPageProps {
  onGeneralReferral: () => void;
  onGroupReferral: () => void;
}
```

- Displays decision flow for referral type
- Provides navigation to appropriate referral path
- Includes instructional content for group referrals

#### ReferralFormModal

```typescript
interface ReferralFormModalProps {
  visible: boolean;
  onClose: () => void;
  groupId?: string; // Optional for group-specific referrals
  onSubmit: (data: ReferralFormData) => Promise<void>;
}

interface ReferralFormData {
  email: string;
  phone: string;
  note: string;
  firstName?: string;
  lastName?: string;
}
```

- Reusable form for both general and group referrals
- Validates email format and required fields
- Handles submission with loading states
- Provides context-aware messaging

#### ConnectSomeoneSection

```typescript
interface ConnectSomeoneSectionProps {
  onPress: () => void;
}
```

- Home page section component
- Prominent call-to-action design
- Consistent with existing UI patterns

### Enhanced Components

#### GroupDetail

- Add "Refer a Friend" button at bottom of action section
- Button appears for all groups regardless of membership status
- Integrates with existing action button layout

### New Services

#### ReferralService

```typescript
interface CreateReferralData {
  email: string;
  phone: string;
  note: string;
  firstName?: string;
  lastName?: string;
  groupId?: string;
  referrerId: string;
}

interface ReferralResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

class ReferralService {
  async createReferral(data: CreateReferralData): Promise<ReferralResponse>;
  async createGeneralReferral(
    data: CreateReferralData
  ): Promise<ReferralResponse>;
  async createGroupReferral(
    data: CreateReferralData
  ): Promise<ReferralResponse>;
  private async createUserAccount(data: CreateReferralData): Promise<string>;
  private async createReferralRecord(
    userId: string,
    data: CreateReferralData
  ): Promise<void>;
}
```

## Data Models

### Database Schema Extensions

#### group_referrals (New Table)

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

#### general_referrals (New Table)

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

#### Enhanced users table

- Existing `newcomer` boolean column will be utilized
- No schema changes needed for users table

### TypeScript Interfaces

#### Database Types Extension

```typescript
export interface GroupReferral {
  id: string;
  group_id: string;
  referrer_id: string;
  referred_user_id: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface GeneralReferral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface GroupReferralWithDetails extends GroupReferral {
  group?: Group;
  referrer?: User;
  referred_user?: User;
}

export interface GeneralReferralWithDetails extends GeneralReferral {
  referrer?: User;
  referred_user?: User;
}
```

## Error Handling

### Validation Errors

- Email format validation with user-friendly messages
- Phone number format validation
- Required field validation with specific field highlighting
- Duplicate email detection with appropriate messaging

### Service Errors

- Database connection failures with retry logic
- Email service failures with fallback notifications
- Permission errors with clear access denied messages
- Network errors with offline handling

### User Experience Errors

- Form submission failures with retry options
- Loading state management during async operations
- Success confirmation with next steps guidance
- Error recovery with form data preservation

## Testing Strategy

### Unit Tests

- ReferralService methods with mocked dependencies
- Form validation logic with edge cases
- Component rendering with various props
- Error handling scenarios with expected outcomes

### Integration Tests

- End-to-end referral flow from form to database
- Email verification trigger and completion
- Database relationship integrity
- Permission and security validation

### User Experience Tests

- Form usability across different screen sizes
- Navigation flow between referral components
- Error state handling and recovery
- Success state confirmation and guidance

## Security Considerations

### Data Protection

- Email and phone number encryption in transit
- Secure storage of referral notes
- PII handling compliance
- Data retention policies for referral records

### Access Control

- Referral creation limited to authenticated users
- Rate limiting on referral submissions
- Validation of referrer permissions
- Protection against spam referrals

### Email Security

- Verification link expiration (24 hours)
- One-time use verification tokens
- Secure email template rendering
- Anti-phishing measures in email content

## Performance Considerations

### Database Optimization

- Indexes on referral table foreign keys
- Efficient queries for referral history
- Batch processing for bulk referral operations
- Connection pooling for high-volume scenarios

### User Interface Performance

- Lazy loading of referral form modal
- Optimistic UI updates for form submissions
- Debounced email validation
- Minimal re-renders during form interactions

### Email Service Integration

- Asynchronous email sending
- Queue management for email delivery
- Retry logic for failed email sends
- Monitoring and alerting for email service health
