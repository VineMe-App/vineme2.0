/**
 * Tests for notification formatting and validation utilities
 */

import {
  formatNotificationMessage,
  generateNotificationContent,
  sanitizeNotificationContent,
  validateNotificationData,
  validateActionUrl,
  validateNotificationInput,
  createFormattedNotification,
  NOTIFICATION_TEMPLATES,
} from '../notificationFormatting';
import type {
  NotificationTriggerData,
  CreateNotificationInput,
} from '../../types/notifications';

describe('Notification Formatting', () => {
  describe('formatNotificationMessage', () => {
    it('should replace simple variables', () => {
      const template = 'Hello {{name}}, you have {{count}} messages';
      const data = { name: 'John', count: 5 };
      const result = formatNotificationMessage(template, data);
      expect(result).toBe('Hello John, you have 5 messages');
    });

    it('should handle conditional sections', () => {
      const template =
        'Hello {{name}}{{#reason}}. Reason: {{reason}}{{/reason}}';

      const withReason = formatNotificationMessage(template, {
        name: 'John',
        reason: 'Test',
      });
      expect(withReason).toBe('Hello John. Reason: Test');

      const withoutReason = formatNotificationMessage(template, {
        name: 'John',
      });
      expect(withoutReason).toBe('Hello John');
    });

    it('should clean up unused template variables', () => {
      const template = 'Hello {{name}}, {{unused}} variable';
      const data = { name: 'John' };
      const result = formatNotificationMessage(template, data);
      expect(result).toBe('Hello John,  variable');
    });
  });

  describe('generateNotificationContent', () => {
    it('should generate friend request notification content', () => {
      const triggerData = {
        fromUserId: 'user123',
        toUserId: 'user456',
        fromUserName: 'John Doe',
      };

      const result = generateNotificationContent(
        'friend_request_received',
        triggerData
      );

      expect(result.title).toBe('New Friend Request');
      expect(result.body).toBe('John Doe wants to be your friend');
      expect(result.actionUrl).toBe('/profile/user123');
    });

    it('should generate group request notification content', () => {
      const triggerData = {
        groupId: 'group123',
        groupTitle: 'Bible Study',
        creatorId: 'user123',
        creatorName: 'John Doe',
        churchId: 'church123',
      };

      const result = generateNotificationContent(
        'group_request_submitted',
        triggerData
      );

      expect(result.title).toBe('New Group Request');
      expect(result.body).toBe(
        'John Doe has requested to create "Bible Study"'
      );
      expect(result.actionUrl).toBe('/admin/groups/group123');
    });

    it('should handle group request denied with reason', () => {
      const triggerData = {
        groupId: 'group123',
        groupTitle: 'Bible Study',
        leaderId: 'user123',
        deniedByName: 'Admin',
        reason: 'Duplicate group',
      };

      const result = generateNotificationContent(
        'group_request_denied',
        triggerData
      );

      expect(result.title).toBe('Group Request Declined');
      expect(result.body).toBe(
        'Your group "Bible Study" was declined by Admin. Reason: Duplicate group'
      );
    });
  });

  describe('sanitizeNotificationContent', () => {
    it('should remove HTML tags', () => {
      const content = 'Hello <script>alert("xss")</script> world';
      const result = sanitizeNotificationContent(content);
      expect(result).toBe('Hello alert("xss") world');
    });

    it('should remove javascript: protocols', () => {
      const content = 'Click javascript:alert("xss") here';
      const result = sanitizeNotificationContent(content);
      expect(result).toBe('Click alert("xss") here');
    });

    it('should limit content length', () => {
      const content = 'a'.repeat(600);
      const result = sanitizeNotificationContent(content);
      expect(result.length).toBe(500);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle empty or invalid input', () => {
      expect(sanitizeNotificationContent('')).toBe('');
      expect(sanitizeNotificationContent(null as any)).toBe('');
      expect(sanitizeNotificationContent(undefined as any)).toBe('');
    });
  });

  describe('validateNotificationData', () => {
    it('should validate friend request data successfully', () => {
      const data = {
        fromUserId: 'user123',
        toUserId: 'user456',
        fromUserName: 'John Doe',
      };

      const result = validateNotificationData('friend_request_received', data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const data = {
        fromUserId: 'user123',
        // Missing toUserId and fromUserName
      };

      const result = validateNotificationData('friend_request_received', data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe('REQUIRED_FIELD_MISSING');
    });

    it('should fail validation for invalid field types', () => {
      const data = {
        fromUserId: 123, // Should be string
        toUserId: 'user456',
        fromUserName: 'John Doe',
      };

      const result = validateNotificationData('friend_request_received', data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should fail validation for string length violations', () => {
      const data = {
        fromUserId: 'user123',
        toUserId: 'user456',
        fromUserName: 'a'.repeat(150), // Too long
      };

      const result = validateNotificationData('friend_request_received', data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MAX_LENGTH_VIOLATION');
    });
  });

  describe('validateActionUrl', () => {
    it('should allow valid URLs', () => {
      const validUrls = [
        '/profile/user123',
        '/group/group456',
        '/group/group456/requests',
        '/event/event789',
        '/admin/groups/group123',
        '/(tabs)/profile',
      ];

      validUrls.forEach((url) => {
        const result = validateActionUrl(url);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'https://external-site.com',
        '/invalid/path',
        'javascript:alert("xss")',
        '/profile/../admin',
      ];

      invalidUrls.forEach((url) => {
        const result = validateActionUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('INVALID_ACTION_URL');
      });
    });

    it('should allow empty URLs', () => {
      const result = validateActionUrl('');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateNotificationInput', () => {
    it('should validate complete notification input successfully', () => {
      const input: CreateNotificationInput = {
        user_id: 'user123',
        type: 'friend_request_received',
        title: 'New Friend Request',
        body: 'John wants to be your friend',
        data: {
          fromUserId: 'user456',
          toUserId: 'user123',
          fromUserName: 'John',
        },
        action_url: '/profile/user456',
      };

      const result = validateNotificationInput(input);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const input = {
        type: 'friend_request_received',
        // Missing user_id, title, body
      } as CreateNotificationInput;

      const result = validateNotificationInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should sanitize content during validation', () => {
      const input: CreateNotificationInput = {
        user_id: 'user123',
        type: 'friend_request_received',
        title: 'New <script>alert("xss")</script> Request',
        body: 'John <b>wants</b> to be your friend',
      };

      validateNotificationInput(input);

      expect(input.title).toBe('New alert("xss") Request');
      expect(input.body).toBe('John wants to be your friend');
    });
  });

  describe('createFormattedNotification', () => {
    it('should create formatted notification from trigger data', () => {
      const triggerData = {
        fromUserId: 'user123',
        toUserId: 'user456',
        fromUserName: 'John Doe',
      };

      const result = createFormattedNotification(
        'user456',
        'friend_request_received',
        triggerData
      );

      expect(result.user_id).toBe('user456');
      expect(result.type).toBe('friend_request_received');
      expect(result.title).toBe('New Friend Request');
      expect(result.body).toBe('John Doe wants to be your friend');
      expect(result.action_url).toBe('/profile/user123');
      expect(result.data).toEqual(triggerData);
    });

    it('should throw error for invalid trigger data', () => {
      const invalidTriggerData = {
        fromUserId: 'user123',
        // Missing required fields
      };

      expect(() => {
        createFormattedNotification(
          'user456',
          'friend_request_received',
          invalidTriggerData as any
        );
      }).toThrow('Invalid trigger data');
    });
  });

  describe('NOTIFICATION_TEMPLATES', () => {
    it('should have templates for all notification types', () => {
      const expectedTypes = [
        'friend_request_received',
        'friend_request_accepted',
        'group_request_submitted',
        'group_request_approved',
        'group_request_denied',
        'join_request_received',
        'join_request_approved',
        'join_request_denied',
        'group_member_added',
        'referral_accepted',
        'referral_joined_group',
        'event_reminder',
      ];

      expectedTypes.forEach((type) => {
        expect(
          NOTIFICATION_TEMPLATES[type as keyof typeof NOTIFICATION_TEMPLATES]
        ).toBeDefined();
      });
    });

    it('should have valid template structure', () => {
      Object.values(NOTIFICATION_TEMPLATES).forEach((template) => {
        expect(template.type).toBeDefined();
        expect(template.titleTemplate).toBeDefined();
        expect(template.bodyTemplate).toBeDefined();
        expect(Array.isArray(template.variables)).toBe(true);
      });
    });
  });
});
