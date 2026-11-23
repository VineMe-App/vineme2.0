# Requirements Document

## Introduction

VineMe is a cross-platform mobile application designed to help church members connect better with their community, specifically focusing on facilitating participation in Bible study groups. The app leverages an existing Supabase database with a comprehensive schema covering users, churches, services, groups, events, friendships, and ticketing systems. The primary goal is to create a clean, minimal, production-ready scaffold that connects to the existing database and provides essential functionality for church community engagement.

## Requirements

### Requirement 1

**User Story:** As a new user, I want to create an account and complete an onboarding process, so that I can join my church community and find relevant Bible study groups.

#### Acceptance Criteria

1. WHEN a user opens the app for the first time THEN the system SHALL present authentication options (sign-in/sign-up)
2. WHEN a user chooses to sign up THEN the system SHALL require email and password using Supabase Auth
3. WHEN a user successfully signs up THEN the system SHALL redirect to an onboarding flow
4. WHEN a user completes onboarding THEN the system SHALL save their name and church_id to the users table
5. WHEN a user selects interests and preferred meeting night THEN the system SHALL store this data client-side for future use
6. IF a user already has an account THEN the system SHALL allow sign-in with email and password
7. WHEN authentication is successful THEN the system SHALL navigate to the main app interface

### Requirement 2

**User Story:** As a church member, I want to browse and join Bible study groups, so that I can participate in community fellowship and spiritual growth.

#### Acceptance Criteria

1. WHEN a user navigates to the Groups tab THEN the system SHALL display a list of available groups from their church
2. WHEN displaying groups THEN the system SHALL show title, description, meeting day, meeting time, and location
3. WHEN a user selects a group THEN the system SHALL show detailed information including WhatsApp link if available
4. WHEN a user wants to join a group THEN the system SHALL create a group_membership record with role 'member'
5. WHEN querying groups THEN the system SHALL join with services and churches tables for complete information
6. IF a user is already a member THEN the system SHALL show their membership status
7. WHEN a group has leaders THEN the system SHALL display leader information from group_memberships

### Requirement 3

**User Story:** As a church member, I want to view and register for church events, so that I can participate in community activities and special programs.

#### Acceptance Criteria

1. WHEN a user navigates to the Events tab THEN the system SHALL display upcoming events from their church
2. WHEN displaying events THEN the system SHALL show title, description, date, time, location, and image if available
3. WHEN displaying events THEN the system SHALL join with categories, churches, and host user information
4. IF an event is recurring THEN the system SHALL display recurrence pattern information
5. WHEN an event has a WhatsApp link THEN the system SHALL provide access to the group chat
6. WHEN a user views event details THEN the system SHALL show complete event information including host details
7. IF an event has pricing information THEN the system SHALL display the price for reference

### Requirement 4

**User Story:** As a church member, I want to connect with other members through friendships, so that I can build meaningful relationships within my church community.

#### Acceptance Criteria

1. WHEN a user wants to add a friend THEN the system SHALL create a friendship record with status 'pending'
2. WHEN a user receives a friend request THEN the system SHALL display the request for acceptance or rejection
3. WHEN a user accepts a friend request THEN the system SHALL update the friendship status to 'accepted'
4. WHEN a user rejects a friend request THEN the system SHALL update the friendship status to 'rejected'
5. WHEN displaying friends THEN the system SHALL show only friendships with status 'accepted'
6. WHEN a user views their profile THEN the system SHALL display their friend connections
7. IF a user tries to send duplicate friend requests THEN the system SHALL prevent the action

### Requirement 5

**User Story:** As a church member, I want to view and manage my profile information, so that I can keep my church community information current and connect with the right groups.

#### Acceptance Criteria

1. WHEN a user navigates to the Profile tab THEN the system SHALL display their current profile information
2. WHEN displaying profile THEN the system SHALL show name, email, church, service, and avatar if available
3. WHEN a user wants to update their profile THEN the system SHALL allow editing of name and avatar_url
4. WHEN a user updates their profile THEN the system SHALL save changes to the users table
5. WHEN displaying profile THEN the system SHALL show the user's current group memberships
6. WHEN displaying profile THEN the system SHALL show the user's role within the church system
7. IF a user has church_admin or superadmin roles THEN the system SHALL display appropriate administrative options

### Requirement 6

**User Story:** As a developer, I want a clean, maintainable codebase with proper architecture, so that the app can be easily extended and maintained.

#### Acceptance Criteria

1. WHEN implementing data access THEN the system SHALL use a services layer in src/services/ for all Supabase calls
2. WHEN managing server state THEN the system SHALL use React Query for caching and synchronization
3. WHEN managing UI state THEN the system SHALL use Zustand for local state management
4. WHEN structuring the app THEN the system SHALL use Expo Router for navigation with tab-based layout
5. WHEN writing code THEN the system SHALL follow ESLint and Prettier configurations
6. WHEN importing modules THEN the system SHALL support absolute imports for better organization
7. WHEN configuring the app THEN the system SHALL use EXPO*PUBLIC*\* environment variables in app.config.ts
8. WHEN querying related data THEN the system SHALL always join related tables (groups → service → church)
9. WHEN implementing screens THEN the system SHALL never include direct database queries in screen components

### Requirement 7

**User Story:** As a church administrator, I want appropriate permissions and access controls, so that I can manage church data while protecting user privacy.

#### Acceptance Criteria

1. WHEN implementing data access THEN the system SHALL respect Row Level Security (RLS) policies
2. WHEN a user accesses their own data THEN the system SHALL allow select and update operations
3. WHEN a user manages group memberships THEN the system SHALL allow self-insertion and leader management
4. WHEN a user manages friendships THEN the system SHALL only allow insertion with self as user_id
5. WHEN church admins manage events THEN the system SHALL allow full CRUD operations for their church
6. WHEN displaying sensitive data THEN the system SHALL only show data the user has permission to access
7. IF a user lacks proper permissions THEN the system SHALL gracefully handle access denial
