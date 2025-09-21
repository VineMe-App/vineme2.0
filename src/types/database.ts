// Database schema types based on existing Supabase tables
// These types represent the structure of data in the database

export interface User {
  id: string;
  name: string;
  // Email moved to auth.users; not exposed in public.users
  email?: string;
  phone?: string;
  church_id?: string;
  avatar_url?: string;
  service_id?: string;
  bio?: string;
  roles: string[];
  newcomer?: boolean;
  onboarding_complete?: boolean;
  email_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Church {
  id: string;
  name: string;
  address?: any; // JSONB
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  church_id: string;
  day_of_week: number; // 0-6, Sunday = 0
  start_time: string;
  end_time?: string;
  location?: any; // JSONB
  created_at: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  title: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  location: any; // JSONB
  whatsapp_link?: string;
  image_url?: string;
  service_id: string;
  church_id: string;
  status: 'pending' | 'approved' | 'denied' | 'closed';
  created_at: string;
  updated_at?: string;
}

export type MembershipJourneyStatus = 1 | 2 | 3;

export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'leader' | 'admin';
  joined_at: string | null;
  status: 'active' | 'inactive' | 'pending';
  referral_id?: string | null;
  journey_status?: MembershipJourneyStatus | null;
  contact_consent?: boolean | null;
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  contact_consent?: boolean | null;
  message?: string | null;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  updated_at?: string;
  referral_id?: string | null;
  journey_status?: MembershipJourneyStatus | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  church_id?: string;
  host_id: string;
  category: string;
  start_date: string;
  end_date?: string;
  location: any; // JSONB
  image_url?: string;
  price?: number;
  requires_ticket: boolean;
  is_public: boolean;
  whatsapp_link?: string;
  recurrence_pattern?: any; // JSONB
  created_at: string;
  updated_at?: string;
}

export interface EventCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at?: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  qr_code?: string;
  status: 'active' | 'used' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

// Joined/Extended types for queries with relationships
export interface GroupMembershipWithUser extends GroupMembership {
  user?: User;
  referral?: Referral;
}

export interface GroupJoinRequestWithUser extends GroupJoinRequest {
  user?: User;
  group?: Group;
}

export interface GroupWithDetails extends Group {
  service?: Service;
  church?: Church;
  memberships?: GroupMembershipWithUser[];
  join_requests?: GroupJoinRequestWithUser[];
  member_count?: number;
  pending_requests_count?: number;
}

export interface EventWithDetails extends Event {
  category_info?: EventCategory;
  host?: User;
  church?: Church;
  ticket_count?: number;
}

export interface FriendshipWithUser extends Friendship {
  user?: User;
  friend?: User;
}

export interface UserWithDetails extends User {
  church?: Church;
  service?: Service;
  group_memberships?: GroupMembership[];
  friendships?: Friendship[];
}

// Contact sharing and privacy types
export interface ContactAuditLog {
  id: string;
  user_id: string; // User whose contact was accessed
  accessor_id: string; // User who accessed the contact
  group_id: string; // Group context for the access
  join_request_id?: string; // Related join request if applicable
  access_type: 'view' | 'call' | 'email' | 'message';
  contact_fields: string[]; // Which fields were accessed (email, phone, etc.)
  created_at: string;
}

export interface ContactPrivacySettings {
  user_id: string; // Primary key
  allow_email_sharing: boolean;
  allow_phone_sharing: boolean;
  allow_contact_by_leaders: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ContactAuditLogWithDetails extends ContactAuditLog {
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  accessor?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    title: string;
  };
}

// Referral system types
export interface Referral {
  id: string; // Unique referral UUID
  referred_user_id: string | null;
  referred_by_user_id: string | null;
  group_id: string | null;
  church_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  note?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ReferralWithDetails extends Referral {
  group?: Group | null;
  referrer?: User | null;
  referred_user?: User | null;
}

// Legacy aliases maintained for compatibility while migrating to unified referrals table
export type GroupReferral = Referral;
export type GeneralReferral = Referral;
export type GroupReferralWithDetails = ReferralWithDetails;
export type GeneralReferralWithDetails = ReferralWithDetails;

// Enhanced Notifications System Types - Re-exported from dedicated notifications types file
export type {
  NotificationType,
  Notification,
  NotificationSettings,
  NotificationTriggerData,
  NotificationGroup,
  NotificationSummary,
  NotificationWithDetails,
  CreateNotificationInput,
  BatchCreateNotificationInput,
  NotificationQueryOptions,
  NotificationFilterOptions,
  NotificationAction,
  NotificationInteraction,
  NotificationSubscription,
  NotificationSubscriptionManager,
  NotificationMetrics,
  NotificationAnalytics,
  NotificationError,
  NotificationResult,
  BatchNotificationResult,
  QueuedNotification,
  NotificationQueue,
  PushNotificationPayload,
  PushNotificationToken,
  NotificationTemplate,
  NotificationTemplateData,
  NotificationValidationRule,
  NotificationValidationSchema,
} from './notifications';

// Database response types
export type DatabaseUser = User;
export type DatabaseChurch = Church;
export type DatabaseService = Service;
export type DatabaseGroup = Group;
export type DatabaseEvent = Event;
export type DatabaseFriendship = Friendship;
export type DatabaseTicket = Ticket;
export type DatabaseReferral = Referral;
export type DatabaseNotification = Notification;
export type DatabaseNotificationSettings = NotificationSettings;
