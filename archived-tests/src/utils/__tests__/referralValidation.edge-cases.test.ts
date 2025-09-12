import {
  validateReferralForm,
  validateServerReferralData,
  sanitizeReferralInput,
  createReferralErrorMessage,
  referralRateLimiter,
} from '../referralValidation';
import { ValidationError } from '../errorHandling';

describe('Referral Validation Edge Cases', () => {
  describe('validateReferralForm Edge Cases', () => {
    it('should handle null and undefined values gracefully', () => {
      const nullData = {
        email: null as any,
        phone: undefined as any,
        note: null as any,
      };

      const result = validateReferralForm(nullData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email address is required');
      expect(result.errors.phone).toBe('Phone number is required');
    });

    it('should handle extremely long email addresses', () => {
      const longEmailData = {
        email: 'a'.repeat(300) + '@example.com',
        phone: '+1234567890',
        note: 'Test',
      };

      const result = validateReferralForm(longEmailData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain('too long');
    });

    it('should handle international domain names', () => {
      const internationalEmails = [
        'test@münchen.de',
        'user@москва.рф',
        'contact@東京.jp',
        'info@café.fr',
      ];

      internationalEmails.forEach(email => {
        const data = {
          email,
          phone: '+1234567890',
          note: 'Test',
        };

        const result = validateReferralForm(data);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle edge case phone number formats', () => {
      const edgeCasePhones = [
        '+1-800-555-0199',
        '1.800.555.0199',
        '1 800 555 0199',
        '(800) 555-0199',
        '+44 20 7946 0958',
        '+33-1-42-86-83-26',
        '+81-3-3264-1234',
      ];

      edgeCasePhones.forEach(phone => {
        const data = {
          email: 'test@example.com',
          phone,
          note: 'Test',
        };

        const result = validateReferralForm(data);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject obviously invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        '000-000-0000',
        '111-111-1111',
        '999-999-9999',
        'not-a-phone',
        '+1-000-000-0000',
      ];

      invalidPhones.forEach(phone => {
        const data = {
          email: 'test@example.com',
          phone,
          note: 'Test',
        };

        const result = validateReferralForm(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.phone).toBeDefined();
      });
    });

    it('should handle unicode characters in names', () => {
      const unicodeNames = [
        { firstName: '张三', lastName: '李四' },
        { firstName: 'José', lastName: 'García' },
        { firstName: 'Müller', lastName: 'Østerberg' },
        { firstName: 'Владимир', lastName: 'Путин' },
        { firstName: 'محمد', lastName: 'علي' },
      ];

      unicodeNames.forEach(({ firstName, lastName }) => {
        const data = {
          email: 'test@example.com',
          phone: '+1234567890',
          note: 'Test',
          firstName,
          lastName,
        };

        const result = validateReferralForm(data);
        expect(result.isValid).toBe(true);
      });
    });

    it('should detect and warn about suspicious patterns', () => {
      const suspiciousNotes = [
        'CLICK HERE TO WIN $1000000!!!',
        'Visit http://suspicious-site.com for FREE MONEY',
        'Buy cheap viagra online now!!!',
        'URGENT: Your account will be closed unless you click here',
        'Congratulations! You have won the lottery!',
      ];

      suspiciousNotes.forEach(note => {
        const data = {
          email: 'test@example.com',
          phone: '+1234567890',
          note,
        };

        const result = validateReferralForm(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.note).toContain('suspicious content');
      });
    });

    it('should handle mixed language content', () => {
      const mixedLanguageNote = 'This person is great! 这个人很棒！ Esta persona es genial! Cette personne est formidable!';
      
      const data = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: mixedLanguageNote,
      };

      const result = validateReferralForm(data);
      expect(result.isValid).toBe(true);
    });

    it('should handle emoji and special characters', () => {
      const emojiData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Great person! 🎉 Very excited to refer them! 👍 ⭐⭐⭐⭐⭐',
        firstName: 'John 😊',
        lastName: 'Doe ✨',
      };

      const result = validateReferralForm(emojiData);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateServerReferralData Edge Cases', () => {
    it('should handle malformed UUID formats', () => {
      const malformedUUIDs = [
        'not-a-uuid',
        '123-456-789',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-426614174000x', // too long
      ];

      malformedUUIDs.forEach(uuid => {
        const data = {
          email: 'test@example.com',
          phone: '+1234567890',
          note: 'Test',
        };

        const result = validateServerReferralData(data, uuid);
        expect(result.isValid).toBe(false);
        expect(result.errors.referrerId).toBe('Invalid referrer ID format');
      });
    });

    it('should suggest email corrections for common typos', () => {
      const typoEmails = [
        { input: 'test@gmail.co', suggestion: 'gmail.com' },
        { input: 'user@yahoo.co', suggestion: 'yahoo.com' },
        { input: 'contact@hotmail.co', suggestion: 'hotmail.com' },
        { input: 'info@outlook.co', suggestion: 'outlook.com' },
      ];

      typoEmails.forEach(({ input, suggestion }) => {
        const data = {
          email: input,
          phone: '+1234567890',
          note: 'Test',
        };
        const referrerId = '123e4567-e89b-12d3-a456-426614174000';

        const result = validateServerReferralData(data, referrerId);
        expect(result.isValid).toBe(true);
        expect(result.warnings?.email).toContain(suggestion);
      });
    });

    it('should handle edge case group ID formats', () => {
      const edgeCaseGroupIds = [
        '', // empty string
        ' ', // whitespace
        'group-123', // non-UUID format
        null as any,
        undefined as any,
      ];

      edgeCaseGroupIds.forEach(groupId => {
        const data = {
          email: 'test@example.com',
          phone: '+1234567890',
          note: 'Test',
        };
        const referrerId = '123e4567-e89b-12d3-a456-426614174000';

        const result = validateServerReferralData(data, referrerId, groupId);
        
        if (groupId && groupId.trim()) {
          expect(result.isValid).toBe(false);
          expect(result.errors.groupId).toBe('Invalid group ID format');
        } else {
          expect(result.isValid).toBe(true);
        }
      });
    });
  });

  describe('sanitizeReferralInput Edge Cases', () => {
    it('should handle null and undefined values', () => {
      const dirtyData = {
        email: null as any,
        phone: undefined as any,
        note: null as any,
        firstName: undefined as any,
        lastName: null as any,
      };

      const sanitized = sanitizeReferralInput(dirtyData);
      expect(sanitized.email).toBe('');
      expect(sanitized.phone).toBe('');
      expect(sanitized.note).toBe('');
      expect(sanitized.firstName).toBeUndefined();
      expect(sanitized.lastName).toBeUndefined();
    });

    it('should preserve unicode characters while trimming', () => {
      const unicodeData = {
        email: '  张三@example.com  ',
        phone: '  +1234567890  ',
        note: '  这是一个很好的人！  ',
        firstName: '  José  ',
        lastName: '  García  ',
      };

      const sanitized = sanitizeReferralInput(unicodeData);
      expect(sanitized.email).toBe('张三@example.com');
      expect(sanitized.note).toBe('这是一个很好的人！');
      expect(sanitized.firstName).toBe('José');
      expect(sanitized.lastName).toBe('García');
    });

    it('should handle extremely long inputs', () => {
      const longData = {
        email: 'a'.repeat(1000) + '@example.com',
        phone: '+1234567890' + '0'.repeat(1000),
        note: 'a'.repeat(10000),
        firstName: 'a'.repeat(1000),
        lastName: 'b'.repeat(1000),
      };

      const sanitized = sanitizeReferralInput(longData);
      expect(sanitized.email.length).toBeLessThanOrEqual(254); // RFC 5321 limit
      expect(sanitized.phone.length).toBeLessThanOrEqual(20);
      expect(sanitized.note.length).toBeLessThanOrEqual(500);
      expect(sanitized.firstName?.length).toBeLessThanOrEqual(50);
      expect(sanitized.lastName?.length).toBeLessThanOrEqual(50);
    });

    it('should remove dangerous HTML/script content', () => {
      const dangerousData = {
        email: '<script>alert("xss")</script>@example.com',
        phone: '+1234567890<script>',
        note: '<iframe src="javascript:alert(1)"></iframe>Great person!',
        firstName: '<img src="x" onerror="alert(1)">John',
        lastName: '</script><script>alert("xss")</script>Doe',
      };

      const sanitized = sanitizeReferralInput(dangerousData);
      expect(sanitized.email).not.toContain('<script>');
      expect(sanitized.phone).not.toContain('<script>');
      expect(sanitized.note).not.toContain('<iframe>');
      expect(sanitized.firstName).not.toContain('<img');
      expect(sanitized.lastName).not.toContain('<script>');
    });

    it('should normalize phone number formats', () => {
      const phoneVariations = [
        '(555) 123-4567',
        '555.123.4567',
        '555 123 4567',
        '+1-555-123-4567',
        '1 555 123 4567',
      ];

      phoneVariations.forEach(phone => {
        const data = {
          email: 'test@example.com',
          phone,
          note: 'Test',
        };

        const sanitized = sanitizeReferralInput(data);
        // Should normalize to a consistent format
        expect(sanitized.phone).toMatch(/^\+?[\d\s\-\(\)\.]+$/);
      });
    });
  });

  describe('Rate Limiter Edge Cases', () => {
    beforeEach(() => {
      referralRateLimiter.clearAllRateLimits();
    });

    it('should handle rapid successive calls', () => {
      const userId = 'rapid-user';
      
      // Make rapid successive calls
      for (let i = 0; i < 10; i++) {
        referralRateLimiter.recordReferral(userId);
      }

      const result = referralRateLimiter.canMakeReferral(userId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Too many referrals');
    });

    it('should handle concurrent rate limit checks', () => {
      const userId = 'concurrent-user';
      
      // Simulate concurrent checks
      const results = Array(5).fill(null).map(() => 
        referralRateLimiter.canMakeReferral(userId)
      );

      // All should return the same result
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.allowed).toBe(firstResult.allowed);
      });
    });

    it('should handle time boundary edge cases', () => {
      const userId = 'time-boundary-user';
      
      // Record referrals at the edge of time boundaries
      referralRateLimiter.recordReferral(userId);
      
      // Check status immediately
      const status = referralRateLimiter.getRateLimitStatus(userId);
      expect(status.hourlyUsed).toBe(1);
      expect(status.dailyUsed).toBe(1);
      expect(status.weeklyUsed).toBe(1);
    });

    it('should handle invalid user IDs gracefully', () => {
      const invalidUserIds = [
        '',
        null as any,
        undefined as any,
        'a'.repeat(1000),
        '<script>alert("xss")</script>',
      ];

      invalidUserIds.forEach(userId => {
        expect(() => {
          referralRateLimiter.canMakeReferral(userId);
        }).not.toThrow();
      });
    });
  });

  describe('Error Message Creation Edge Cases', () => {
    it('should handle unknown error types', () => {
      const unknownError = new Error('Something completely unexpected happened');
      const result = createReferralErrorMessage(unknownError);
      
      expect(result.title).toBe('Referral Failed');
      expect(result.retryable).toBe(true);
      expect(result.suggestions).toContain('Please try again in a few moments');
    });

    it('should handle errors with no message', () => {
      const emptyError = new Error('');
      const result = createReferralErrorMessage(emptyError);
      
      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should handle validation errors with specific field information', () => {
      const validationError = new ValidationError('Invalid email format', 'email');
      const result = createReferralErrorMessage(validationError);
      
      expect(result.title).toBe('Invalid Information');
      expect(result.actionable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('should provide contextual suggestions based on error type', () => {
      const errorTypes = [
        { error: new Error('rate limit exceeded'), expectedSuggestion: 'wait before making' },
        { error: new Error('already exists'), expectedSuggestion: 'already have an account' },
        { error: new Error('network connection failed'), expectedSuggestion: 'internet connection' },
        { error: new Error('email failed to send'), expectedSuggestion: 'create an account manually' },
      ];

      errorTypes.forEach(({ error, expectedSuggestion }) => {
        const result = createReferralErrorMessage(error);
        expect(result.suggestions.some(s => s.toLowerCase().includes(expectedSuggestion))).toBe(true);
      });
    });

    it('should handle circular reference errors', () => {
      const circularError: any = new Error('Circular reference error');
      circularError.circular = circularError;
      
      expect(() => {
        createReferralErrorMessage(circularError);
      }).not.toThrow();
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle validation of large datasets efficiently', () => {
      const startTime = Date.now();
      
      // Validate 1000 referrals
      for (let i = 0; i < 1000; i++) {
        const data = {
          email: `user${i}@example.com`,
          phone: `+123456789${i % 10}`,
          note: `Test referral ${i}`,
        };
        
        validateReferralForm(data);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should handle memory-intensive validation scenarios', () => {
      const largeNote = 'a'.repeat(100000); // 100KB note
      
      const data = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: largeNote,
      };
      
      expect(() => {
        validateReferralForm(data);
      }).not.toThrow();
    });
  });
});