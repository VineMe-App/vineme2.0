# Requirements Document

## Introduction

The referral system allows existing users to connect and refer new people to groups within the VineMe app. The system provides two pathways: general referrals when no specific group fits, and direct group referrals. Both pathways create new user accounts with automated email verification to complete the onboarding process.

## Requirements

### Requirement 1

**User Story:** As a user, I want to access a referral feature from the home page, so that I can easily connect someone else to the community.

#### Acceptance Criteria

1. WHEN a user views the home page THEN the system SHALL display a "Connect someone else in" button and section
2. WHEN a user taps the "Connect someone else in" button THEN the system SHALL navigate to a referral landing page
3. WHEN a user views the referral landing page THEN the system SHALL display the question "Do you want to connect/refer someone else to a group?"

### Requirement 2

**User Story:** As a user, I want to refer someone when no specific group fits their needs, so that they can be connected to the community and potentially matched to a new group.

#### Acceptance Criteria

1. WHEN a user indicates no group fits on the referral landing page THEN the system SHALL display a referral form
2. WHEN a user completes the general referral form THEN the system SHALL create a new auth.user record
3. WHEN a new auth.user is created via general referral THEN the system SHALL create a corresponding public.user record with newcomer=true
4. WHEN the referral form is submitted THEN the system SHALL trigger an automated verification email to the referred person
5. WHEN the referral is processed THEN the system SHALL store the referrer's note for clergy or group leader review

### Requirement 3

**User Story:** As a user, I want to refer someone to a specific group, so that they can be directly connected to a group that fits their needs.

#### Acceptance Criteria

1. WHEN a user indicates a group fits on the referral landing page THEN the system SHALL instruct them to find the group and use the "Refer a friend" button
2. WHEN a user views any group page THEN the system SHALL display a "Refer a friend" button at the bottom
3. WHEN a user taps "Refer a friend" on a group page THEN the system SHALL display the referral form
4. WHEN a user completes the group referral form THEN the system SHALL create a new auth.user record
5. WHEN a new auth.user is created via group referral THEN the system SHALL create a corresponding public.user record with newcomer=true
6. WHEN a group referral is submitted THEN the system SHALL create a record in the referrals table
7. WHEN the group referral is processed THEN the system SHALL trigger an automated verification email to the referred person

### Requirement 4

**User Story:** As a user, I want to provide context about why I'm referring someone, so that clergy or group leaders can better understand the referral.

#### Acceptance Criteria

1. WHEN a user fills out any referral form THEN the system SHALL require the referred person's email address
2. WHEN a user fills out any referral form THEN the system SHALL require the referred person's phone number
3. WHEN a user fills out any referral form THEN the system SHALL provide a note field for context
4. WHEN a user submits a referral form THEN the system SHALL validate all required fields before processing
5. WHEN a referral note is provided THEN the system SHALL store it for review by appropriate personnel

### Requirement 5

**User Story:** As a referred person, I want to receive an automated email with account setup instructions, so that I can easily join the VineMe community.

#### Acceptance Criteria

1. WHEN a referral is processed THEN the system SHALL send a verification email to the referred person's email address
2. WHEN the verification email is sent THEN the system SHALL include a "verify email" link for account activation
3. WHEN a referred person clicks the verification link THEN the system SHALL allow them to complete their VineMe account setup
4. WHEN the verification process is complete THEN the system SHALL update the user's status appropriately

### Requirement 6

**User Story:** As a system administrator, I want referral data to be properly tracked, so that I can monitor the referral system's effectiveness and manage newcomers.

#### Acceptance Criteria

1. WHEN a general referral is created THEN the system SHALL store the referrer's ID and referral details
2. WHEN a group referral is created THEN the system SHALL store the referrer's ID, group ID, and referral details in the referrals table
3. WHEN any referral is created THEN the system SHALL timestamp the referral for tracking purposes
4. WHEN a referred user is created THEN the system SHALL mark them as newcomer=true in the public.user table
5. WHEN referral data is stored THEN the system SHALL ensure data integrity and proper relationships between tables
