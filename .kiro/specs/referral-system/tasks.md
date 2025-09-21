# Implementation Plan

- [x] 1. Create database schema and types for referral system
  - Create TypeScript interfaces for GroupReferral and GeneralReferral in database types
  - Add referral-related types to the main types export
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. Implement core referral service
  - Create ReferralService class with methods for creating referrals and user accounts
  - Implement createReferral, createGeneralReferral, and createGroupReferral methods
  - Add private helper methods for user account creation and referral record creation
  - Include proper error handling and validation logic
  - _Requirements: 2.2, 2.3, 3.4, 3.5, 3.6, 5.1, 5.2_

- [x] 3. Create reusable referral form modal component
  - Build ReferralFormModal component with form fields for email, phone, and note
  - Implement form validation with real-time feedback
  - Add loading states and error handling for form submission
  - Make component reusable for both general and group referrals
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Add "Connect someone else in" section to home page
  - Create ConnectSomeoneSection component for home page
  - Integrate component into home page layout
  - Implement navigation to referral landing page
  - _Requirements: 1.1, 1.2_

- [x] 5. Create referral landing page with decision flow
  - Build ReferralLandingPage component with decision flow UI
  - Implement navigation logic for general vs group referral paths
  - Add instructional content for group referral process
  - Create route and navigation integration
  - _Requirements: 1.3, 2.1, 3.1_

- [x] 6. Add "Refer a friend" button to group detail page
  - Modify GroupDetail component to include referral button
  - Position button in action section at bottom of page
  - Integrate with referral form modal for group-specific referrals
  - _Requirements: 3.2, 3.3_

- [x] 7. Enhance auth service for referral user creation
  - Extend AuthService with method for creating referred users
  - Implement user account creation with newcomer flag
  - Add email verification trigger for referred users
  - Handle referral-specific user profile creation
  - _Requirements: 2.2, 2.3, 3.4, 3.5, 5.1, 5.2, 5.3, 6.4_

- [x] 8. Create custom hook for referral operations
  - Build useReferrals hook for managing referral state and operations
  - Implement async operations with loading and error states
  - Add success handling and user feedback
  - Integrate with React Query for caching and synchronization
  - _Requirements: 2.2, 2.3, 3.4, 3.5, 3.6_

- [x] 9. Add referral tracking to database operations
  - Implement database operations for referrals table
  - Implement database operations for general_referrals table
  - Add proper foreign key relationships and constraints
  - Include timestamp tracking for referral creation
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 10. Implement email verification flow for referred users
  - Set up email verification trigger when referral user is created
  - Configure verification email template with appropriate messaging
  - Implement verification link handling and account activation
  - Add proper error handling for email service failures
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Add comprehensive error handling and validation
  - Implement client-side validation for all form fields
  - Add server-side validation for referral data
  - Create user-friendly error messages and recovery options
  - Add rate limiting and spam protection for referral submissions
  - _Requirements: 4.4, 4.5_

- [x] 12. Create unit tests for referral components and services
  - Write tests for ReferralService methods and error scenarios
  - Create tests for ReferralFormModal component behavior
  - Add tests for form validation and submission logic
  - Test referral creation flow with mocked dependencies
  - _Requirements: 2.2, 2.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 13. Integrate referral system with existing navigation
  - Update app routing to include referral landing page
  - Ensure proper navigation flow between referral components
  - Add deep linking support for referral-related pages
  - Test navigation integration across the app
  - _Requirements: 1.2, 1.3, 2.1, 3.1_

- [x] 14. Add referral system documentation and final testing
  - Document referral API endpoints and service methods
  - Create user guide for referral feature usage
  - Perform end-to-end testing of complete referral flow
  - Test email verification and account activation process
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_
