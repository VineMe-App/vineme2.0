/**
 * Notification Formatting and Validation Utilities
 * 
 * This file contains utilities for formatting notification messages,
 * validating notification data, sanitizing content, and validating action URLs.
 */

import type {
  NotificationType,
  NotificationTemplate,
  NotificationTemplateData,
  NotificationTriggerData,
  NotificationValidationSchema,
  NotificationValidationRule,
  NotificationError,
  CreateNotificationInput,
} from '../types/notifications';

// Notification message templates for each type
export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  friend_request_received: {
    type: 'friend_request_received',
    titleTemplate: 'New Friend Request',
    bodyTemplate: '{{fromUserName}} wants to be your friend',
    actionUrl: '/profile/{{fromUserId}}',
    variables: ['fromUserName', 'fromUserId'],
  },
  
  friend_request_accepted: {
    type: 'friend_request_accepted',
    titleTemplate: 'Friend Request Accepted',
    bodyTemplate: '{{acceptedByUserName}} accepted your friend request',
    actionUrl: '/profile/{{acceptedByUserId}}',
    variables: ['acceptedByUserName', 'acceptedByUserId'],
  },
  
  group_request_submitted: {
    type: 'group_request_submitted',
    titleTemplate: 'New Group Request',
    bodyTemplate: '{{creatorName}} has requested to create "{{groupTitle}}"',
    actionUrl: '/admin/groups/{{groupId}}',
    variables: ['creatorName', 'groupTitle', 'groupId'],
  },
  
  group_request_approved: {
    type: 'group_request_approved',
    titleTemplate: 'Group Request Approved',
    bodyTemplate: 'Your group "{{groupTitle}}" has been approved by {{approvedByName}}',
    actionUrl: '/group/{{groupId}}',
    variables: ['groupTitle', 'approvedByName', 'groupId'],
  },
  
  group_request_denied: {
    type: 'group_request_denied',
    titleTemplate: 'Group Request Declined',
    bodyTemplate: 'Your group "{{groupTitle}}" was declined by {{deniedByName}}{{#reason}}. Reason: {{reason}}{{/reason}}',
    actionUrl: '/group/{{groupId}}',
    variables: ['groupTitle', 'deniedByName', 'groupId', 'reason'],
  },
  
  join_request_received: {
    type: 'join_request_received',
    titleTemplate: 'New Join Request',
    bodyTemplate: '{{requesterName}} wants to join "{{groupTitle}}"',
    actionUrl: '/group/{{groupId}}/requests',
    variables: ['requesterName', 'groupTitle', 'groupId'],
  },
  
  join_request_approved: {
    type: 'join_request_approved',
    titleTemplate: 'Join Request Approved',
    bodyTemplate: '{{approvedByName}} approved your request to join "{{groupTitle}}"',
    actionUrl: '/group/{{groupId}}',
    variables: ['approvedByName', 'groupTitle', 'groupId'],
  },
  
  join_request_denied: {
    type: 'join_request_denied',
    titleTemplate: 'Join Request Declined',
    bodyTemplate: '{{deniedByName}} declined your request to join "{{groupTitle}}"',
    actionUrl: '/group/{{groupId}}',
    variables: ['deniedByName', 'groupTitle', 'groupId'],
  },
  
  group_member_added: {
    type: 'group_member_added',
    titleTemplate: 'Welcome to {{groupTitle}}',
    bodyTemplate: 'You have been added to "{{groupTitle}}" by {{addedByName}}',
    actionUrl: '/group/{{groupId}}',
    variables: ['groupTitle', 'addedByName', 'groupId'],
  },
  
  referral_accepted: {
    type: 'referral_accepted',
    titleTemplate: 'Referral Accepted',
    bodyTemplate: '{{referredUserName}} has joined VineMe through your referral',
    actionUrl: '/profile/{{referredUserId}}',
    variables: ['referredUserName', 'referredUserId'],
  },
  
  referral_joined_group: {
    type: 'referral_joined_group',
    titleTemplate: 'Referral Joined Group',
    bodyTemplate: '{{referredUserName}} joined "{{groupTitle}}" through your referral',
    actionUrl: '/group/{{groupId}}',
    variables: ['referredUserName', 'groupTitle', 'groupId'],
  },
  
  event_reminder: {
    type: 'event_reminder',
    titleTemplate: 'Event Reminder',
    bodyTemplate: '"{{eventTitle}}" starts in {{reminderMinutes}} minutes',
    actionUrl: '/event/{{eventId}}',
    variables: ['eventTitle', 'reminderMinutes', 'eventId'],
  },
};

// Validation schemas for each notification type
export const NOTIFICATION_VALIDATION_SCHEMAS: Record<NotificationType, NotificationValidationSchema> = {
  friend_request_received: {
    type: 'friend_request_received',
    rules: [
      { field: 'fromUserId', required: true, type: 'string', minLength: 1 },
      { field: 'toUserId', required: true, type: 'string', minLength: 1 },
      { field: 'fromUserName', required: true, type: 'string', minLength: 1, maxLength: 100 },
    ],
  },
  
  friend_request_accepted: {
    type: 'friend_request_accepted',
    rules: [
      { field: 'acceptedByUserId', required: true, type: 'string', minLength: 1 },
      { field: 'acceptedByUserName', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'originalRequesterId', required: true, type: 'string', minLength: 1 },
    ],
  },
  
  group_request_submitted: {
    type: 'group_request_submitted',
    rules: [
      { field: 'groupId', required: true, type: 'string', minLength: 1 },
      { field: 'groupTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'creatorId', required: true, type: 'string', minLength: 1 },
      { field: 'creatorName', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'churchId', required: true, type: 'string', minLength: 1 },
    ],
  },
  
  group_request_approved: {
    type: 'group_request_approved',
    rules: [
      { field: 'groupId', required: true, type: 'string', minLength: 1 },
      { field: 'groupTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'leaderId', required: true, type: 'string', minLength: 1 },
      { field: 'approvedByName', required: true, type: 'string', minLength: 1, maxLength: 100 },
    ],
  },
  
  group_request_denied: {
    type: 'group_request_denied',
    rules: [
      { field: 'groupId', required: true, type: 'string', minLength: 1 },
      { field: 'groupTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'leaderId', required: true, type: 'string', minLength: 1 },
      { field: 'deniedByName', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'reason', required: false, type: 'string', maxLength: 500 },
    ],
  },
  
  join_request_received: {
    type: 'join_request_received',
    rules: [
      { field: 'groupId', required: true, type: 'string', minLength: 1 },
      { field: 'groupTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'requesterId', required: true, type: 'string', minLength: 1 },
      { field: 'requesterName', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'leaderIds', required: true, type: 'array', minLength: 1 },
    ],
  },
  
  join_request_approved: {
    type: 'join_request_approved',
    rules: [
      { field: 'groupId', required: true, type: 'string', minLength: 1 },
      { field: 'groupTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'requesterId', required: true, type: 'string', minLength: 1 },
      { field: 'approvedByName', required: true, type: 'string', minLength: 1, maxLength: 100 },
    ],
  },
  
  join_request_denied: {
    type: 'join_request_denied',
    rules: [
      { field: 'groupId', required: true, type: 'string', minLength: 1 },
      { field: 'groupTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'requesterId', required: true, type: 'string', minLength: 1 },
      { field: 'deniedByName', required: true, type: 'string', minLength: 1, maxLength: 100 },
    ],
  },
  
  group_member_added: {
    type: 'group_member_added',
    rules: [
      { field: 'groupId', required: true, type: 'string', minLength: 1 },
      { field: 'groupTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'addedByName', required: true, type: 'string', minLength: 1, maxLength: 100 },
    ],
  },
  
  referral_accepted: {
    type: 'referral_accepted',
    rules: [
      { field: 'referrerId', required: true, type: 'string', minLength: 1 },
      { field: 'referredUserId', required: true, type: 'string', minLength: 1 },
      { field: 'referredUserName', required: true, type: 'string', minLength: 1, maxLength: 100 },
    ],
  },
  
  referral_joined_group: {
    type: 'referral_joined_group',
    rules: [
      { field: 'referrerId', required: true, type: 'string', minLength: 1 },
      { field: 'referredUserId', required: true, type: 'string', minLength: 1 },
      { field: 'referredUserName', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'groupId', required: true, type: 'string', minLength: 1 },
      { field: 'groupTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
    ],
  },
  
  event_reminder: {
    type: 'event_reminder',
    rules: [
      { field: 'eventId', required: true, type: 'string', minLength: 1 },
      { field: 'eventTitle', required: true, type: 'string', minLength: 1, maxLength: 200 },
      { field: 'eventDate', required: true, type: 'string', minLength: 1 },
      { field: 'userId', required: true, type: 'string', minLength: 1 },
      { field: 'reminderMinutes', required: true, type: 'number' },
    ],
  },
};

// Whitelisted action URL patterns for security
const ALLOWED_ACTION_URL_PATTERNS = [
  /^\/profile\/[a-zA-Z0-9-_]+$/,
  /^\/group\/[a-zA-Z0-9-_]+$/,
  /^\/group\/[a-zA-Z0-9-_]+\/requests$/,
  /^\/event\/[a-zA-Z0-9-_]+$/,
  /^\/admin\/groups\/[a-zA-Z0-9-_]+$/,
  /^\/admin\/groups$/,
  /^\/referrals$/,
  /^\/\(tabs\)$/,
  /^\/\(tabs\)\/profile$/,
  /^\/\(tabs\)\/groups$/,
  /^\/\(tabs\)\/events$/,
];

/**
 * Format notification message using template and data
 */
export function formatNotificationMessage(
  template: string,
  data: NotificationTemplateData
): string {
  let formatted = template;
  
  // Replace simple variables {{variable}}
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    formatted = formatted.replace(regex, String(value));
  });
  
  // Handle conditional sections {{#variable}}...{{/variable}}
  formatted = formatted.replace(/{{#(\w+)}}(.*?){{\/\1}}/g, (match, variable, content) => {
    return data[variable] ? content : '';
  });
  
  // Clean up any remaining template variables
  formatted = formatted.replace(/{{[^}]+}}/g, '');
  
  return formatted.trim();
}

/**
 * Generate notification content from trigger data
 */
export function generateNotificationContent(
  type: NotificationType,
  triggerData: any
): { title: string; body: string; actionUrl?: string } {
  const template = NOTIFICATION_TEMPLATES[type];
  
  if (!template) {
    throw new Error(`No template found for notification type: ${type}`);
  }
  
  const templateData = triggerData as NotificationTemplateData;
  
  const title = formatNotificationMessage(template.titleTemplate, templateData);
  const body = formatNotificationMessage(template.bodyTemplate, templateData);
  const actionUrl = template.actionUrl 
    ? formatNotificationMessage(template.actionUrl, templateData)
    : undefined;
  
  return { title, body, actionUrl };
}

/**
 * Sanitize notification content to prevent XSS and other security issues
 */
export function sanitizeNotificationContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>/g, '');
  
  // Remove script-like content
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Limit length
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 497) + '...';
  }
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validate notification data against schema
 */
export function validateNotificationData(
  type: NotificationType,
  data: any
): { isValid: boolean; errors: NotificationError[] } {
  const schema = NOTIFICATION_VALIDATION_SCHEMAS[type];
  const errors: NotificationError[] = [];
  
  if (!schema) {
    errors.push({
      code: 'INVALID_TYPE',
      message: `Unknown notification type: ${type}`,
      type: 'validation',
    });
    return { isValid: false, errors };
  }
  
  for (const rule of schema.rules) {
    const value = data[rule.field];
    
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        code: 'REQUIRED_FIELD_MISSING',
        message: `Required field '${rule.field}' is missing`,
        type: 'validation',
        details: { field: rule.field },
      });
      continue;
    }
    
    // Skip validation if field is not required and not provided
    if (!rule.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type validation
    if (rule.type && value !== undefined && value !== null) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push({
          code: 'INVALID_TYPE',
          message: `Field '${rule.field}' must be of type ${rule.type}, got ${actualType}`,
          type: 'validation',
          details: { field: rule.field, expectedType: rule.type, actualType },
        });
        continue;
      }
    }
    
    // String length validation
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          code: 'MIN_LENGTH_VIOLATION',
          message: `Field '${rule.field}' must be at least ${rule.minLength} characters long`,
          type: 'validation',
          details: { field: rule.field, minLength: rule.minLength, actualLength: value.length },
        });
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          code: 'MAX_LENGTH_VIOLATION',
          message: `Field '${rule.field}' must be no more than ${rule.maxLength} characters long`,
          type: 'validation',
          details: { field: rule.field, maxLength: rule.maxLength, actualLength: value.length },
        });
      }
    }
    
    // Array length validation
    if (rule.type === 'array' && Array.isArray(value)) {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          code: 'MIN_LENGTH_VIOLATION',
          message: `Field '${rule.field}' must have at least ${rule.minLength} items`,
          type: 'validation',
          details: { field: rule.field, minLength: rule.minLength, actualLength: value.length },
        });
      }
    }
    
    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push({
        code: 'PATTERN_MISMATCH',
        message: `Field '${rule.field}' does not match required pattern`,
        type: 'validation',
        details: { field: rule.field, pattern: rule.pattern.toString() },
      });
    }
    
    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      errors.push({
        code: 'INVALID_VALUE',
        message: `Field '${rule.field}' must be one of: ${rule.allowedValues.join(', ')}`,
        type: 'validation',
        details: { field: rule.field, allowedValues: rule.allowedValues, actualValue: value },
      });
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validate action URL against whitelist
 */
export function validateActionUrl(url: string): { isValid: boolean; error?: NotificationError } {
  if (!url || typeof url !== 'string') {
    return { isValid: true }; // Empty URLs are allowed
  }
  
  // Check against whitelisted patterns
  const isAllowed = ALLOWED_ACTION_URL_PATTERNS.some(pattern => pattern.test(url));
  
  if (!isAllowed) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_ACTION_URL',
        message: `Action URL '${url}' is not allowed`,
        type: 'validation',
        details: { url },
      },
    };
  }
  
  return { isValid: true };
}

/**
 * Validate complete notification input
 */
export function validateNotificationInput(
  input: CreateNotificationInput
): { isValid: boolean; errors: NotificationError[] } {
  const errors: NotificationError[] = [];
  
  // Validate basic structure
  if (!input.user_id || typeof input.user_id !== 'string') {
    errors.push({
      code: 'INVALID_USER_ID',
      message: 'user_id is required and must be a string',
      type: 'validation',
    });
  }
  
  if (!input.type || typeof input.type !== 'string') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'type is required and must be a string',
      type: 'validation',
    });
  }
  
  if (!input.title || typeof input.title !== 'string') {
    errors.push({
      code: 'INVALID_TITLE',
      message: 'title is required and must be a string',
      type: 'validation',
    });
  }
  
  if (!input.body || typeof input.body !== 'string') {
    errors.push({
      code: 'INVALID_BODY',
      message: 'body is required and must be a string',
      type: 'validation',
    });
  }
  
  // Sanitize content
  if (input.title) {
    input.title = sanitizeNotificationContent(input.title);
  }
  
  if (input.body) {
    input.body = sanitizeNotificationContent(input.body);
  }
  
  // Validate action URL if provided
  if (input.action_url) {
    const urlValidation = validateActionUrl(input.action_url);
    if (!urlValidation.isValid && urlValidation.error) {
      errors.push(urlValidation.error);
    }
  }
  
  // Validate data if provided
  if (input.data && input.type) {
    const dataValidation = validateNotificationData(input.type as NotificationType, input.data);
    errors.push(...dataValidation.errors);
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Create formatted notification from trigger data
 */
export function createFormattedNotification(
  userId: string,
  type: NotificationType,
  triggerData: any
): CreateNotificationInput {
  // Validate trigger data
  const validation = validateNotificationData(type, triggerData);
  if (!validation.isValid) {
    throw new Error(`Invalid trigger data: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  // Generate content from template
  const content = generateNotificationContent(type, triggerData);
  
  // Create notification input
  const notification: CreateNotificationInput = {
    user_id: userId,
    type: type,
    title: sanitizeNotificationContent(content.title),
    body: sanitizeNotificationContent(content.body),
    data: triggerData as Record<string, any>,
    action_url: content.actionUrl,
  };
  
  // Final validation
  const inputValidation = validateNotificationInput(notification);
  if (!inputValidation.isValid) {
    throw new Error(`Invalid notification input: ${inputValidation.errors.map(e => e.message).join(', ')}`);
  }
  
  return notification;
}

// Export utility functions (renamed exports to avoid React 19 conflicts)
export {
  NOTIFICATION_TEMPLATES as NotificationTemplates,
  NOTIFICATION_VALIDATION_SCHEMAS as NotificationValidationSchemas,
  formatNotificationMessage,
  generateNotificationContent,
  sanitizeNotificationContent,
  validateNotificationData,
  validateActionUrl,
  validateNotificationInput,
  createFormattedNotification,
};