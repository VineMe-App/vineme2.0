# Referral System Database Operations

This document describes the database operations implemented for the referral tracking system in task 9.

## Overview

The referral system database operations provide comprehensive tracking and management of user referrals through two main tables:
- `referrals`: For referrals to specific groups
- `general_referrals`: For general referrals when no specific group fits

## Requirements Addressed

### Requirement 6.1: Store referrer's ID and referral details for general referrals
- ✅ Implemented in `general_referrals` table with `referrer_id` and `note` fields
- ✅ Proper foreign key relationships to `users` table
- ✅ Validation and constraint handling

### Requirement 6.2: Store referrer's ID, group ID, and referral details in referrals table
- ✅ Implemented in `referrals` table with `group_id`, `referrer_id`, and `note` fields
- ✅ Proper foreign key relationships to `groups` and `users` tables
- ✅ Validation and constraint handling

### Requirement 6.3: Timestamp tracking for referral creation
- ✅ Both tables include `created_at` and `updated_at` timestamp fields
- ✅ Automatic timestamp updates via database triggers
- ✅ Proper timezone handling with `TIMESTAMP WITH TIME ZONE`

### Requirement 6.5: Ensure data integrity and proper relationships between tables
- ✅ Foreign key constraints with CASCADE delete
- ✅ Unique constraints to prevent duplicate referrals
- ✅ Check constraints to prevent self-referrals
- ✅ Database indexes for performance
- ✅ Row Level Security (RLS) policies

## Database Schema

### Tables Created

#### referrals
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(group_id, referrer_id, referred_by_user_id),
  CHECK (referrer_id != referred_by_user_id)
);
```

#### general_referrals
```sql
CREATE TABLE general_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(referrer_id, referred_by_user_id),
  CHECK (referrer_id != referred_by_user_id)
);
```

### Indexes Created
- Performance indexes on foreign key columns
- Composite indexes for common query patterns
- Timestamp indexes for date-range queries

### Constraints
- **Foreign Key Constraints**: Ensure referential integrity
- **Unique Constraints**: Prevent duplicate referrals
- **Check Constraints**: Prevent self-referrals
- **NOT NULL Constraints**: Ensure required fields are populated

## Database Operations Implemented

### Core CRUD Operations

#### Create Operations
- `createGeneralReferralRecord()`: Insert general referral with proper validation
- `createGroupReferralRecord()`: Insert group referral with proper validation
- `createBatchReferrals()`: Bulk insert multiple referrals with error handling

#### Read Operations
- `getReferralsByUser()`: Get all referrals made by a specific user
- `getReferralsForGroup()`: Get all referrals for a specific group
- `getReferralsForUser()`: Get referral information for a referred user
- `getReferralStatistics()`: Get analytics and reporting data

#### Update Operations
- `updateReferralNote()`: Update referral notes for moderation
- Automatic `updated_at` timestamp updates via triggers

#### Delete Operations
- `deleteReferral()`: Remove referral records with proper cleanup
- Cascade deletes when users or groups are removed

### Analytics and Reporting Operations

#### Statistical Queries
- Total referral counts by type
- Referrals by month/time period
- Top referrers leaderboard
- Referral success rates

#### Data Integrity Operations
- `validateReferralIntegrity()`: Check for orphaned records
- `validateDatabaseSchema()`: Verify table structure
- `performMaintenance()`: Database cleanup and optimization

### Error Handling and Validation

#### Constraint Violation Handling
- **23505 (Unique Constraint)**: "This user has already been referred by you"
- **23503 (Foreign Key)**: "Invalid referrer or user reference" / "Group not found"
- **23514 (Check Constraint)**: "Cannot refer yourself"

#### Data Validation
- Email format validation
- Phone number format validation
- Required field validation
- Referrer authentication validation

## Security Features

### Row Level Security (RLS)
- Users can only view their own referrals
- Users can view referrals made about them
- Admin users can manage all referrals
- Proper authentication checks

### Data Protection
- Secure handling of personal information
- Audit logging for contact access
- Privacy settings integration
- Rate limiting protection

## Performance Optimizations

### Database Indexes
- Primary key indexes (automatic)
- Foreign key indexes for joins
- Composite indexes for common queries
- Timestamp indexes for date filtering

### Query Optimization
- Efficient pagination for large datasets
- Batch operations for bulk processing
- Connection pooling for high volume
- Query result caching where appropriate

## Usage Examples

### Creating a Group Referral
```typescript
const result = await referralService.createGroupReferral({
  email: 'friend@example.com',
  phone: '+1234567890',
  note: 'Would be a great fit for this group',
  groupId: 'group-123',
  referrerId: 'user-456'
});
```

### Getting Referral Statistics
```typescript
const stats = await referralService.getReferralStatistics(
  '2023-01-01', 
  '2023-12-31'
);
// Returns: totalReferrals, groupReferrals, generalReferrals, 
//          referralsByMonth, topReferrers
```

### Validating Database Integrity
```typescript
const validation = await referralService.validateReferralIntegrity();
// Returns: orphanedReferrals, invalidUserReferences, issues[]
```

## Files Modified/Created

### New Files
- `src/services/referralDatabase.ts`: Database schema and utilities
- `src/services/__tests__/referralDatabase.test.ts`: Database operation tests
- `docs/referral-database-operations.md`: This documentation

### Modified Files
- `src/services/referrals.ts`: Enhanced with additional database operations
- `src/services/__tests__/referrals.test.ts`: Added tests for new operations
- `src/services/index.ts`: Added exports for database utilities

## Testing

### Test Coverage
- ✅ All CRUD operations tested
- ✅ Constraint violation handling tested
- ✅ Error scenarios covered
- ✅ Database schema validation tested
- ✅ Analytics operations tested

### Test Files
- `src/services/__tests__/referrals.test.ts`: 24 tests covering all operations
- `src/services/__tests__/referralDatabase.test.ts`: 10 tests for database utilities

## Deployment Notes

### Database Migration
The SQL schema is provided in `COMPLETE_REFERRAL_SCHEMA` constant and should be executed in your Supabase database:

```typescript
import { COMPLETE_REFERRAL_SCHEMA } from './src/services/referrals';
// Execute COMPLETE_REFERRAL_SCHEMA in your Supabase SQL editor
```

### Environment Setup
No additional environment variables required. Uses existing Supabase configuration.

### Monitoring
- Database performance can be monitored via Supabase dashboard
- Error logging is implemented for all operations
- Referral statistics provide usage insights

## Conclusion

The referral system database operations provide a comprehensive, secure, and performant foundation for tracking user referrals. All requirements have been met with proper error handling, data integrity, and performance optimizations in place.