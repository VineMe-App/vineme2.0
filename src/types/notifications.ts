/**
 * Enhanced Notifications System Types
 *
 * This file contains comprehensive type definitions for the enhanced notifications system,
 * including trigger data interfaces, notification models, settings, and aggregation types.
 */

// Core notification types
export type NotificationType =
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'group_request_submitted'
  | 'group_request_approved'
  | 'group_request_denied'
  | 'join_request_received'
  | 'join_request_approved'
  | 'join_request_denied'
  | 'group_member_added'
  | 'referral_accepted'
  | 'referral_joined_group'
  | 'event_reminder';

// Enhanced Notification model extending existing structure
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  read_at?: string;
  action_url?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// Notification trigger data interfaces for all trigger types
export interface NotificationTriggerData {
  // Friend request notifications
  friendRequest: {
    fromUserId: string;
    toUserId: string;
    fromUserName: string;
  };

  friendRequestAccepted: {
    acceptedByUserId: string;
    acceptedByUserName: string;
    originalRequesterId: string;
  };

  // Group request notifications
  groupRequestSubmitted: {
    groupId: string;
    groupTitle: string;
    creatorId: string;
    creatorName: string;
    churchId: string;
  };

  groupRequestApproved: {
    groupId: string;
    groupTitle: string;
    leaderId: string;
    approvedByName: string;
  };

  groupRequestDenied: {
    groupId: string;
    groupTitle: string;
    leaderId: string;
    deniedByName: string;
    reason?: string;
  };

  // Join request notifications
  joinRequestReceived: {
    groupId: string;
    groupTitle: string;
    requesterId: string;
    requesterName: string;
    leaderIds: string[];
  };

  joinRequestApproved: {
    groupId: string;
    groupTitle: string;
    requesterId: string;
    approvedByName: string;
  };

  joinRequestDenied: {
    groupId: string;
    groupTitle: string;
    requesterId: string;
    deniedByName: string;
  };

  // Referral notifications
  referralAccepted: {
    referrerId: string;
    referredUserId: string;
    referredUserName: string;
  };

  referralJoinedGroup: {
    referrerId: string;
    referredUserId: string;
    referredUserName: string;
    groupId: string;
    groupTitle: string;
  };

  // Event reminder notifications
  eventReminder: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    userId: string;
    reminderMinutes: number;
  };
}

// User notification settings interface for preferences
export interface NotificationSettings {
  id: string;
  user_id: string;
  friend_requests: boolean;
  friend_request_accepted: boolean;
  group_requests: boolean;
  group_request_responses: boolean;
  join_requests: boolean;
  join_request_responses: boolean;
  referral_updates: boolean;
  event_reminders: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

// Notification aggregation models for grouping and summary
export interface NotificationGroup {
  type: NotificationType;
  count: number;
  latestNotification: Notification;
  notifications: Notification[];
}

export interface NotificationSummary {
  totalUnread: number;
  unreadByType: Record<NotificationType, number>;
  recentNotifications: Notification[];
  groupedNotifications: NotificationGroup[];
}

// Extended notification types with relationships for detailed views
export interface NotificationWithDetails extends Notification {
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  related_user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  related_group?: {
    id: string;
    title: string;
    image_url?: string;
  };
  related_event?: {
    id: string;
    title: string;
    start_date: string;
  };
}

// Input types for creating notifications
export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
  expires_at?: string;
}

export interface BatchCreateNotificationInput {
  notifications: CreateNotificationInput[];
}

// Notification query and filter types
export interface NotificationQueryOptions {
  userId: string;
  limit?: number;
  offset?: number;
  types?: NotificationType[];
  read?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: 'created_at' | 'updated_at' | 'read_at';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationFilterOptions {
  type?: NotificationType;
  read?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  searchTerm?: string;
}

// Notification interaction types
export interface NotificationAction {
  id: string;
  label: string;
  action: 'navigate' | 'approve' | 'deny' | 'dismiss' | 'custom';
  url?: string;
  data?: Record<string, any>;
}

export interface NotificationInteraction {
  notificationId: string;
  action: 'opened' | 'dismissed' | 'action_taken';
  actionData?: Record<string, any>;
  timestamp: string;
}

// Real-time subscription types
export interface NotificationSubscription {
  userId: string;
  callback: (notification: Notification) => void;
  types?: NotificationType[];
  active: boolean;
}

export interface NotificationSubscriptionManager {
  subscribe: (subscription: NotificationSubscription) => () => void;
  unsubscribe: (userId: string) => void;
  unsubscribeAll: () => void;
}

// Notification analytics and metrics types
export interface NotificationMetrics {
  sent: number;
  delivered: number;
  opened: number;
  dismissed: number;
  actionTaken: number;
  byType: Record<
    NotificationType,
    {
      sent: number;
      opened: number;
      dismissed: number;
    }
  >;
}

export interface NotificationAnalytics {
  userId: string;
  period: 'day' | 'week' | 'month';
  metrics: NotificationMetrics;
  trends: {
    openRate: number;
    dismissalRate: number;
    actionRate: number;
  };
}

// Error handling types
export interface NotificationError {
  code: string;
  message: string;
  type: 'validation' | 'permission' | 'network' | 'database' | 'unknown';
  details?: Record<string, any>;
}

export interface NotificationResult<T = Notification> {
  success: boolean;
  data?: T;
  error?: NotificationError;
}

export interface BatchNotificationResult {
  success: boolean;
  results: NotificationResult[];
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  errors: NotificationError[];
}

// Notification queue and offline support types
export interface QueuedNotification extends CreateNotificationInput {
  id: string;
  attempts: number;
  maxAttempts: number;
  nextRetry?: string;
  queuedAt: string;
}

export interface NotificationQueue {
  pending: QueuedNotification[];
  failed: QueuedNotification[];
  processing: QueuedNotification[];
}

// Push notification specific types
export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  category?: string;
  threadId?: string;
}

export interface PushNotificationToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Notification template types for formatting
export interface NotificationTemplate {
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  actionUrl?: string;
  variables: string[];
}

export interface NotificationTemplateData {
  [key: string]: string | number | boolean;
}

// Validation types
export interface NotificationValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: any[];
}

export interface NotificationValidationSchema {
  type: NotificationType;
  rules: NotificationValidationRule[];
}

// Export all types for easy importing
export type {
  // Core types
  NotificationType,
  Notification,
  NotificationTriggerData,
  NotificationSettings,

  // Aggregation types
  NotificationGroup,
  NotificationSummary,
  NotificationWithDetails,

  // Input types
  CreateNotificationInput,
  BatchCreateNotificationInput,

  // Query types
  NotificationQueryOptions,
  NotificationFilterOptions,

  // Interaction types
  NotificationAction,
  NotificationInteraction,

  // Subscription types
  NotificationSubscription,
  NotificationSubscriptionManager,

  // Analytics types
  NotificationMetrics,
  NotificationAnalytics,

  // Error handling types
  NotificationError,
  NotificationResult,
  BatchNotificationResult,

  // Queue types
  QueuedNotification,
  NotificationQueue,

  // Push notification types
  PushNotificationPayload,
  PushNotificationToken,

  // Template types
  NotificationTemplate,
  NotificationTemplateData,

  // Validation types
  NotificationValidationRule,
  NotificationValidationSchema,
};
