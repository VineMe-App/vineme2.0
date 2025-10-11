import {
  validateReferralForm,
  validateServerReferralData,
  sanitizeReferralInput,
  createReferralErrorMessage,
  referralRateLimiter,
  ReferralRateLimiter,
} from '../referralValidation';
import { ValidationError } from '../errorHandling';

describe('referralValidation', () => {
  describe('validateReferralForm', () => {
    it('should validate valid referral data', () => {
      const validData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'This is a test referral',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = validateReferralForm(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should require email', () => {
      const invalidData = {
        email: '',
        phone: '+1234567890',
        note: 'Test',
      };

      const result = validateReferralForm(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email address is required');
    });

    it('should validate email format', () => {
      const invalidData = {
        email: 'invalid-email',
        phone: '+1234567890',
        note: 'Test',
      };

      const result = validateReferralForm(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should require phone number', () => {
      const invalidData = {
        email: 'test@example.com',
        phone: '',
        note: 'Test',
      };

      const result = validateReferralForm(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBe('Phone number is required');
    });

    it('should validate phone number format', () => {
      const invalidData = {
        email: 'test@example.com',
        phone: '123',
        note: 'Test',
      };

      const result = validateReferralForm(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBe('Please enter a valid phone number');
    });

    it('should validate phone number length', () => {
      const shortPhone = {
        email: 'test@example.com',
        phone: '123456789',
        note: 'Test',
      };

      const result = validateReferralForm(shortPhone);
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBe(
        'Phone number must be at least 10 digits'
      );
    });

    it('should validate name fields', () => {
      const invalidNames = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Test',
        firstName: 'John123',
        lastName: 'Doe@#$',
      };

      const result = validateReferralForm(invalidNames);
      expect(result.isValid).toBe(false);
      expect(result.errors.firstName).toBe(
        'First name contains invalid characters'
      );
      expect(result.errors.lastName).toBe(
        'Last name contains invalid characters'
      );
    });

    it('should validate note length', () => {
      const longNote = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'a'.repeat(501),
      };

      const result = validateReferralForm(longNote);
      expect(result.isValid).toBe(false);
      expect(result.errors.note).toBe('Note must be 500 characters or less');
    });

    it('should detect spam patterns in note', () => {
      const spamNote = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'CLICK HERE TO WIN MONEY!!! Visit https://spam.com and buy cheap products!!!',
      };

      const result = validateReferralForm(spamNote);
      expect(result.isValid).toBe(false);
      expect(result.errors.note).toContain('suspicious content');
    });

    it('should warn about disposable email domains', () => {
      const disposableEmail = {
        email: 'test@10minutemail.com',
        phone: '+1234567890',
        note: 'Test',
      };

      const result = validateReferralForm(disposableEmail);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.email).toContain('Disposable email addresses');
    });

    it('should handle optional fields correctly', () => {
      const minimalData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: '',
      };

      const result = validateReferralForm(minimalData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('validateServerReferralData', () => {
    it('should validate server-side data with referrer ID', () => {
      const validData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Test',
      };
      const referrerId = '123e4567-e89b-12d3-a456-426614174000';

      const result = validateServerReferralData(validData, referrerId);
      expect(result.isValid).toBe(true);
    });

    it('should require valid referrer ID', () => {
      const validData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Test',
      };

      const result = validateServerReferralData(validData, 'invalid-uuid');
      expect(result.isValid).toBe(false);
      expect(result.errors.referrerId).toBe('Invalid referrer ID format');
    });

    it('should validate group ID format', () => {
      const validData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Test',
      };
      const referrerId = '123e4567-e89b-12d3-a456-426614174000';
      const groupId = 'invalid-uuid';

      const result = validateServerReferralData(validData, referrerId, groupId);
      expect(result.isValid).toBe(false);
      expect(result.errors.groupId).toBe('Invalid group ID format');
    });

    it('should suggest email domain corrections', () => {
      const typoEmail = {
        email: 'test@gmail.co',
        phone: '+1234567890',
        note: 'Test',
      };
      const referrerId = '123e4567-e89b-12d3-a456-426614174000';

      const result = validateServerReferralData(typoEmail, referrerId);
      expect(result.isValid).toBe(true);
      expect(result.warnings?.email).toContain('test@gmail.com');
    });
  });

  describe('sanitizeReferralInput', () => {
    it('should sanitize and trim input data', () => {
      const dirtyData = {
        email: '  TEST@EXAMPLE.COM  ',
        phone: '  +1 234 567 890  ',
        note: '  This is a test note  ',
        firstName: '  John  ',
        lastName: '  Doe  ',
      };

      const sanitized = sanitizeReferralInput(dirtyData);
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.phone).toBe('+1 234 567 890');
      expect(sanitized.note).toBe('This is a test note');
      expect(sanitized.firstName).toBe('John');
      expect(sanitized.lastName).toBe('Doe');
    });

    it('should enforce maximum lengths', () => {
      const longData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'a'.repeat(600),
        firstName: 'a'.repeat(60),
        lastName: 'a'.repeat(60),
      };

      const sanitized = sanitizeReferralInput(longData);
      expect(sanitized.note.length).toBe(500);
      expect(sanitized.firstName?.length).toBe(50);
      expect(sanitized.lastName?.length).toBe(50);
    });
  });

  describe('ReferralRateLimiter', () => {
    let rateLimiter: ReferralRateLimiter;

    beforeEach(() => {
      rateLimiter = new (ReferralRateLimiter as any)();
    });

    it('should allow referrals within limits', () => {
      const userId = 'test-user-1';
      const result = rateLimiter.canMakeReferral(userId);
      expect(result.allowed).toBe(true);
    });

    it('should record referral attempts', () => {
      const userId = 'test-user-2';
      rateLimiter.recordReferral(userId);

      const status = rateLimiter.getRateLimitStatus(userId);
      expect(status.hourlyUsed).toBe(1);
      expect(status.dailyUsed).toBe(1);
      expect(status.weeklyUsed).toBe(1);
    });

    it('should enforce hourly limits', () => {
      const userId = 'test-user-3';

      // Make 5 referrals (hourly limit)
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordReferral(userId);
      }

      const result = rateLimiter.canMakeReferral(userId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Too many referrals in the last hour');
    });

    it('should provide rate limit status', () => {
      const userId = 'test-user-4';

      // Make 3 referrals
      for (let i = 0; i < 3; i++) {
        rateLimiter.recordReferral(userId);
      }

      const status = rateLimiter.getRateLimitStatus(userId);
      expect(status.hourlyUsed).toBe(3);
      expect(status.hourlyLimit).toBe(5);
      expect(status.dailyUsed).toBe(3);
      expect(status.weeklyUsed).toBe(3);
    });

    it('should clear user rate limits', () => {
      const userId = 'test-user-5';

      rateLimiter.recordReferral(userId);
      rateLimiter.clearUserRateLimit(userId);

      const status = rateLimiter.getRateLimitStatus(userId);
      expect(status.hourlyUsed).toBe(0);
    });
  });

  describe('createReferralErrorMessage', () => {
    it('should create validation error messages', () => {
      const validationError = new ValidationError('Invalid email format');
      const result = createReferralErrorMessage(validationError);

      expect(result.title).toBe('Invalid Information');
      expect(result.message).toBe('Invalid email format');
      expect(result.actionable).toBe(true);
      expect(result.retryable).toBe(true);
      expect(result.suggestions).toContain(
        'Please check the highlighted fields and correct any errors'
      );
    });

    it('should create rate limit error messages', () => {
      const rateLimitError = new Error('rate limit exceeded');
      const result = createReferralErrorMessage(rateLimitError);

      expect(result.title).toBe('Too Many Referrals');
      expect(result.retryable).toBe(true);
      expect(result.suggestions).toContain(
        'Please wait before making another referral'
      );
    });

    it('should create duplicate error messages', () => {
      const duplicateError = new Error('This record already exists');
      const result = createReferralErrorMessage(duplicateError);

      expect(result.title).toBe('Already Referred');
      expect(result.retryable).toBe(false);
      expect(result.suggestions).toContain(
        'Check if they already have an account'
      );
    });

    it('should create network error messages', () => {
      const networkError = new Error('Network connection failed');
      const result = createReferralErrorMessage(networkError);

      expect(result.title).toBe('Connection Problem');
      expect(result.retryable).toBe(true);
      expect(result.suggestions).toContain('Check your internet connection');
    });

    it('should create email error messages', () => {
      const emailError = new Error('email failed to send');
      const result = createReferralErrorMessage(emailError);

      expect(result.title).toBe('Email Delivery Issue');
      expect(result.retryable).toBe(true);
      expect(result.suggestions).toContain(
        'The person can still create an account manually'
      );
    });

    it('should create default error messages', () => {
      const unknownError = new Error('Something went wrong');
      const result = createReferralErrorMessage(unknownError);

      expect(result.title).toBe('Referral Failed');
      expect(result.retryable).toBe(true);
      expect(result.suggestions).toContain('Please try again in a few moments');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings correctly', () => {
      const emptyData = {
        email: '',
        phone: '',
        note: '',
        firstName: '',
        lastName: '',
      };

      const result = validateReferralForm(emptyData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email address is required');
      expect(result.errors.phone).toBe('Phone number is required');
    });

    it('should handle whitespace-only strings', () => {
      const whitespaceData = {
        email: '   ',
        phone: '   ',
        note: '   ',
      };

      const result = validateReferralForm(whitespaceData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email address is required');
      expect(result.errors.phone).toBe('Phone number is required');
    });

    it('should handle international phone numbers', () => {
      const internationalPhones = [
        '+44 20 7946 0958', // UK
        '+33 1 42 86 83 26', // France
        '+81 3 3264 1234', // Japan
        '+86 10 8888 8888', // China
      ];

      internationalPhones.forEach((phone) => {
        const data = {
          email: 'test@example.com',
          phone,
          note: 'Test',
        };

        const result = validateReferralForm(data);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle various email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user_name@example-domain.com',
        'test123@sub.example.co.uk',
      ];

      validEmails.forEach((email) => {
        const data = {
          email,
          phone: '+1234567890',
          note: 'Test',
        };

        const result = validateReferralForm(data);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'double@@domain.com',
      ];

      invalidEmails.forEach((email) => {
        const data = {
          email,
          phone: '+1234567890',
          note: 'Test',
        };

        const result = validateReferralForm(data);
        expect(result.isValid).toBe(
          false,
          `Email "${email}" should be invalid`
        );
        expect(result.errors.email).toBe('Please enter a valid email address');
      });
    });
  });
});
