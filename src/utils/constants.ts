// App constants and configuration

export const APP_CONFIG = {
  name: 'VineMe',
  version: '1.0.0',
  description: 'Connect with your church community',
} as const;

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MEETING_NIGHTS = [
  { label: 'Sunday', value: 'sunday' },
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
] as const;

export const USER_ROLES = {
  MEMBER: 'member',
  LEADER: 'leader',
  ADMIN: 'admin',
  CHURCH_ADMIN: 'church_admin',
  SUPERADMIN: 'superadmin',
} as const;

export const GROUP_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
  CLOSED: 'closed',
} as const;

export const FRIENDSHIP_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  BLOCKED: 'blocked',
} as const;

export const MEMBERSHIP_ROLES = {
  MEMBER: 'member',
  LEADER: 'leader',
  ADMIN: 'admin',
} as const;

export const TICKET_STATUS = {
  ACTIVE: 'active',
  USED: 'used',
  CANCELLED: 'cancelled',
} as const;

export const COMMON_INTERESTS = [
  'Bible Study',
  'Prayer',
  'Worship',
  'Community Service',
  'Youth Ministry',
  "Women's Ministry",
  "Men's Ministry",
  'Music Ministry',
  "Children's Ministry",
  'Missions',
  'Fellowship',
  'Discipleship',
] as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR:
    'Network connection error. Please check your internet connection.',
  AUTHENTICATION_FAILED:
    'Authentication failed. Please check your credentials.',
  PERMISSION_DENIED: "You don't have permission to perform this action.",
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

export const LOADING_MESSAGES = {
  SIGNING_IN: 'Signing you in...',
  SIGNING_UP: 'Creating your account...',
  LOADING_GROUPS: 'Loading groups...',
  LOADING_EVENTS: 'Loading events...',
  UPDATING_PROFILE: 'Updating your profile...',
  JOINING_GROUP: 'Joining group...',
  SENDING_REQUEST: 'Sending friend request...',
} as const;

export const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  USER_PREFERENCES: 'user_preferences',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_DATA: 'onboarding_data',
  SERVICE_CHANGE_USED_PREFIX: 'service_change_used_',
  PUSH_TOKEN: 'expo_push_token',
} as const;
