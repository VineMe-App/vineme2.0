# Requirements Document

## Introduction

This specification covers the admin features for the VineMe mobile app, enabling church administrators and group leaders to manage their communities effectively. The feature set includes church admin capabilities for managing groups and users, group leader functionality for managing their groups, and enhanced user capabilities for creating groups and viewing groups on a map. Additionally, events functionality will be temporarily disabled with "coming soon" messaging to allow focus on groups functionality.

## Requirements

### Requirement 1

**User Story:** As a church admin, I want to manage group creation requests, so that I can approve or decline new groups and maintain quality control over church groups.

#### Acceptance Criteria

1. WHEN a church admin views the manage groups screen THEN the system SHALL display all groups for their church with status indicators
2. WHEN displaying groups THEN the system SHALL show pending, approved, denied, and closed groups with different visual states
3. WHEN a church admin selects a pending group THEN the system SHALL provide options to approve or decline the request
4. WHEN a church admin approves a group THEN the system SHALL update the group status to 'approved'
5. WHEN a church admin declines a group THEN the system SHALL update the group status to 'denied'
6. WHEN a church admin views an approved group THEN the system SHALL provide an option to close the group
7. WHEN a church admin closes a group THEN the system SHALL update the group status to 'closed'

### Requirement 2

**User Story:** As a church admin, I want to view group members and manage user engagement, so that I can understand community participation and help unconnected members find groups.

#### Acceptance Criteria

1. WHEN a church admin selects a group THEN the system SHALL display all members of that group with their roles
2. WHEN displaying group members THEN the system SHALL show member names, roles (member/leader), and join dates
3. WHEN a church admin views the manage users screen THEN the system SHALL display all users from their church
4. WHEN displaying users THEN the system SHALL indicate which users are in groups and which are not connected
5. WHEN displaying users THEN the system SHALL show user names, group memberships, and connection status
6. WHEN a church admin views unconnected users THEN the system SHALL provide filtering to show only users not in any groups
7. WHEN a church admin views a user's details THEN the system SHALL show all groups the user belongs to

### Requirement 3

**User Story:** As a group leader, I want to manage my group details and membership, so that I can keep group information current and control who joins.

#### Acceptance Criteria

1. WHEN a group leader views their group THEN the system SHALL provide options to edit group details
2. WHEN a group leader edits group details THEN the system SHALL allow updating title, description, meeting day, meeting time, and location
3. WHEN a group leader views group members THEN the system SHALL display all current members with their roles
4. WHEN a group leader selects a member THEN the system SHALL provide options to promote to leader or remove from group
5. WHEN a group leader promotes a member THEN the system SHALL update the group_membership role to 'leader'
6. WHEN a group leader demotes another leader THEN the system SHALL update the group_membership role to 'member'
7. IF a group leader tries to demote themselves and they are the only leader THEN the system SHALL prevent the action

### Requirement 4

**User Story:** As a group leader, I want to manage join requests and contact potential members, so that I can build my group community and communicate effectively.

#### Acceptance Criteria

1. WHEN a user requests to join a group THEN the system SHALL create a pending group_membership record
2. WHEN a user requests to join THEN the system SHALL ask if they consent to sharing contact details with the leader
3. WHEN a group leader views join requests THEN the system SHALL display pending requests with user information
4. WHEN displaying join requests THEN the system SHALL show user name, request date, and contact consent status
5. WHEN a group leader approves a request THEN the system SHALL update the group_membership status to 'active'
6. WHEN a group leader declines a request THEN the system SHALL delete the group_membership record
7. IF a user consented to contact sharing THEN the system SHALL provide a contact option for the leader

### Requirement 5

**User Story:** As a church member, I want to create a new group, so that I can start a Bible study or fellowship group in my community.

#### Acceptance Criteria

1. WHEN a user wants to create a group THEN the system SHALL provide a group creation form
2. WHEN creating a group THEN the system SHALL require title, description, meeting day, meeting time, and location
3. WHEN a user submits a group creation request THEN the system SHALL create a group record with status 'pending'
4. WHEN a group is created THEN the system SHALL automatically add the creator as a leader in group_memberships
5. WHEN a group creation request is submitted THEN the system SHALL notify church admins of the pending request
6. WHEN a user views their created groups THEN the system SHALL show the approval status
7. IF a group creation request is denied THEN the system SHALL provide feedback to the creator

### Requirement 6

**User Story:** As a church member, I want to view groups on a map and filter them, so that I can find groups that meet my location and schedule preferences.

#### Acceptance Criteria

1. WHEN a user views the groups screen THEN the system SHALL provide toggle options for list view and map view
2. WHEN in map view THEN the system SHALL display groups as pins on an interactive map
3. WHEN a user taps a map pin THEN the system SHALL show group summary information in a popup
4. WHEN a user taps the group popup THEN the system SHALL navigate to the full group details
5. WHEN viewing groups THEN the system SHALL provide filters for meeting day of the week
6. WHEN viewing groups THEN the system SHALL provide filters for group type or category
7. WHEN filters are applied THEN the system SHALL update both list and map views accordingly

### Requirement 7

**User Story:** As a user, I want clear indication that events features are coming soon, so that I understand the current app capabilities and future roadmap.

#### Acceptance Criteria

1. WHEN a user views the tab navigation THEN the system SHALL display a "Coming Soon!" banner over the events tab
2. WHEN a user tries to tap the events tab THEN the system SHALL prevent navigation and show a coming soon message
3. WHEN a user views the home screen THEN the system SHALL hide all events-related content and sections
4. WHEN displaying the home screen THEN the system SHALL focus on groups and profile content only
5. WHEN a user views their profile THEN the system SHALL hide the "Manage Events" button temporarily
6. WHEN events features are ready THEN the system SHALL allow easy removal of coming soon indicators
7. IF a user asks about events THEN the system SHALL provide clear messaging about future availability

### Requirement 8

**User Story:** As a church admin or group leader, I want role-based access to management features, so that I can perform my responsibilities while maintaining appropriate security boundaries.

#### Acceptance Criteria

1. WHEN a user has 'church_admin' role THEN the system SHALL display "Manage Groups" and "Manage Users" buttons in profile
2. WHEN a user has 'leader' role in group_memberships THEN the system SHALL provide group management options for their groups
3. WHEN a user lacks admin roles THEN the system SHALL hide administrative interface elements
4. WHEN checking permissions THEN the system SHALL verify user roles before allowing management actions
5. WHEN a user attempts unauthorized actions THEN the system SHALL display appropriate error messages
6. WHEN displaying management screens THEN the system SHALL only show data the user has permission to access
7. IF user roles change THEN the system SHALL update interface permissions immediately
