import { referralService } from '../referrals';
import { supabase } from '../supabase';
import { authService } from '../auth';
import { emailVerificationService } from '../emailVerification';
import type { CreateReferralData } from '../referrals';

// Mock dependencies
jest.mock('../supabase');
jest.mock('../auth');
jest.mock('../emailVerification');
jest.mock('../referralDatabase');

// Mock error handling utilities
jest.mock('../../utils/errorHandling', () => ({
  handleSupabaseError: jest.fn((error: Error) => ({ message: error.message })),
  retryWithBackoff: jest.fn((fn: () => any) => fn()),
}));

// Mock referral validation utilities
jest.mock('../../utils/referralValidation', () => ({
  validateServerReferralData: jest.fn(() => ({ isValid: true, errors: {} })),
  sanitizeReferralInput: jest.fn((data: any) => data),
  referralRateLimiter: {
    canMakeReferral: jest.fn(() => ({ allowed: true })),
    recordReferral: jest.fn(),
    clearAllRateLimits: jest.fn(),
  },
  createReferralErrorMessage: jest.fn((error: Error) => ({
    title: 'Error',
    message: error.message,
    actionable: true,
    retryable: true,
  })),
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockEmailVerificationService = emailVerificationService as jest.Mocked<
  typeof emailVerificationService
>;

describe('ReferralService Edge Cases', () => {
  const mockReferralData: CreateReferralData = {
    email: 'test@example.com',
    phone: '+1234567890',
    note: 'Test referral note',
    firstName: 'John',
    lastName: 'Doe',
    referrerId: 'referrer-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Concurrent Referral Handling', () => {
    it('should handle concurrent referral attempts for same email', async () => {
      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock successful email verification
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      // Create multiple concurrent referrals
      const promises = Array(5)
        .fill(null)
        .map(() => referralService.createReferral(mockReferralData));

      const results = await Promise.all(promises);

      // All should succeed (in real scenario, some might fail due to race conditions)
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle database connection timeouts', async () => {
      // Mock timeout error
      mockAuthService.createReferredUser.mockRejectedValue(
        new Error('Connection timeout')
      );

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.errorDetails?.type).toBe('network');
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large batch referral operations', async () => {
      // Create a large batch of referrals
      const largeBatch = Array(100)
        .fill(null)
        .map((_, index) => ({
          ...mockReferralData,
          email: `user${index}@example.com`,
        }));

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createBatchReferrals(largeBatch);

      expect(result.error).toBeNull();
      expect(result.data?.successful).toBe(100);
      expect(result.data?.failed).toBe(0);
    });

    it('should handle extremely long notes without crashing', async () => {
      const longNoteData = {
        ...mockReferralData,
        note: 'a'.repeat(10000), // Very long note
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(longNoteData);

      expect(result.success).toBe(true);
    });
  });

  describe('Unicode and Special Character Handling', () => {
    it('should handle unicode characters in names and notes', async () => {
      const unicodeData = {
        ...mockReferralData,
        firstName: '张三',
        lastName: 'José',
        note: 'Great person! 🎉 Très bien! Очень хорошо!',
        email: 'test@münchen.de',
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(unicodeData);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in phone numbers', async () => {
      const specialPhoneData = {
        ...mockReferralData,
        phone: '+1 (555) 123-4567 ext. 123',
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(specialPhoneData);

      expect(result.success).toBe(true);
    });
  });

  describe('Database Constraint Edge Cases', () => {
    it('should handle cascading delete scenarios', async () => {
      // Mock group deletion during referral creation
      const groupReferralData = { ...mockReferralData, groupId: 'group-123' };

      // Mock group exists initially
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 'group-123' }, error: null }),
        }),
      });

      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock successful email verification
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      // Mock foreign key constraint violation (group was deleted)
      const mockInsert = jest.fn().mockResolvedValue({
        error: {
          message: 'insert or update on table violates foreign key constraint',
          code: '23503',
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
      } as any);

      const result =
        await referralService.createGroupReferral(groupReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Group not found or has been deleted');
    });

    it('should handle database deadlock scenarios', async () => {
      // Mock deadlock error
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({
        error: {
          message: 'deadlock detected',
          code: '40P01',
        },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(false);
    });
  });

  describe('Email Service Edge Cases', () => {
    it('should handle email service rate limiting', async () => {
      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock email service rate limiting
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded for email service',
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      // Should still succeed even if email fails
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('should handle email service complete outage', async () => {
      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock email service throwing exception
      mockEmailVerificationService.sendVerificationEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      // Should still succeed even if email throws
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
    });
  });

  describe('Data Integrity Edge Cases', () => {
    it('should handle partial failures in batch operations', async () => {
      const batchData = [
        { ...mockReferralData, email: 'success1@example.com' },
        { ...mockReferralData, email: 'fail@example.com' },
        { ...mockReferralData, email: 'success2@example.com' },
      ];

      // Mock mixed success/failure responses
      mockAuthService.createReferredUser
        .mockResolvedValueOnce({ userId: 'user-1', error: null })
        .mockResolvedValueOnce({ userId: null, error: 'Email already exists' })
        .mockResolvedValueOnce({ userId: 'user-3', error: null });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createBatchReferrals(batchData);

      expect(result.error).toBeNull();
      expect(result.data?.successful).toBe(2);
      expect(result.data?.failed).toBe(1);
      expect(result.data?.errors).toHaveLength(1);
    });

    it('should handle orphaned user records', async () => {
      // Mock successful user creation but failed referral record creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      // Mock database failure after user creation
      const mockInsert = jest.fn().mockResolvedValue({
        error: { message: 'Database connection lost', code: '08006' },
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(false);
      // In a real scenario, this would leave an orphaned user record
      // The service should ideally have cleanup mechanisms
    });
  });

  describe('Performance Monitoring Edge Cases', () => {
    it('should handle slow database responses', async () => {
      // Mock slow response
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ userId: 'user-123', error: null }), 5000);
      });

      mockAuthService.createReferredUser.mockReturnValue(slowPromise as any);

      // Start the operation
      const startTime = Date.now();
      const resultPromise = referralService.createReferral(mockReferralData);

      // The operation should eventually complete
      // In a real test, you might want to set a timeout
      const result = await resultPromise;
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(4000);
      expect(result.success).toBe(true);
    }, 10000); // 10 second timeout for this test

    it('should handle memory pressure scenarios', async () => {
      // Create a scenario that might cause memory pressure
      const largeDataSet = Array(1000)
        .fill(null)
        .map((_, index) => ({
          ...mockReferralData,
          email: `user${index}@example.com`,
          note: 'a'.repeat(1000), // Large notes
        }));

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createBatchReferrals(largeDataSet);

      expect(result.error).toBeNull();
      expect(result.data?.successful).toBe(1000);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle SQL injection attempts in notes', async () => {
      const maliciousData = {
        ...mockReferralData,
        note: "'; DROP TABLE users; --",
      };

      // Mock successful operations (the service should sanitize input)
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(maliciousData);

      expect(result.success).toBe(true);
      // The malicious content should be safely handled
    });

    it('should handle XSS attempts in form data', async () => {
      const xssData = {
        ...mockReferralData,
        firstName: '<script>alert("xss")</script>',
        lastName: '<img src="x" onerror="alert(1)">',
        note: '<iframe src="javascript:alert(1)"></iframe>',
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await referralService.createReferral(xssData);

      expect(result.success).toBe(true);
      // XSS content should be safely handled
    });
  });
});
