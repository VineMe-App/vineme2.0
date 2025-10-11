import { referralService } from '../referrals';
import { supabase } from '../supabase';
import { authService } from '../auth';
import { emailVerificationService } from '../emailVerification';
import { referralRateLimiter } from '../../utils/referralValidation';
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

describe('ReferralService', () => {
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

  describe('createReferral', () => {
    it('should create a general referral when no groupId is provided', async () => {
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

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockAuthService.createReferredUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        note: 'Test referral note',
        referrerId: 'referrer-123',
      });
    });

    it('should create a group referral when groupId is provided', async () => {
      const groupReferralData = { ...mockReferralData, groupId: 'group-123' };

      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock successful email verification
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      // Mock group exists check
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 'group-123' }, error: null }),
        }),
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
      } as any);

      const result = await referralService.createReferral(groupReferralData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('should validate required fields', async () => {
      const invalidData = { ...mockReferralData, email: '' };

      const result = await referralService.createReferral(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should validate email format', async () => {
      const invalidData = { ...mockReferralData, email: 'invalid-email' };

      const result = await referralService.createReferral(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should validate phone format', async () => {
      const invalidData = { ...mockReferralData, phone: '123' };

      const result = await referralService.createReferral(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });
  });

  describe('createGeneralReferral', () => {
    it('should create user account and general referral record', async () => {
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

      const result =
        await referralService.createGeneralReferral(mockReferralData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockInsert).toHaveBeenCalledWith({
        referrer_id: 'referrer-123',
        referred_by_user_id: 'user-123',
        note: 'Test referral note',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should handle auth user creation failure', async () => {
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: null,
        error: 'Auth error',
      });

      const result =
        await referralService.createGeneralReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create user account');
    });

    it('should handle database insertion failure', async () => {
      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock successful email verification
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      // Mock database insertion failure
      const mockInsert = jest.fn().mockResolvedValue({
        error: { message: 'Database error', code: '23505' },
      });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result =
        await referralService.createGeneralReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('This user has already been referred by you');
    });

    it('should continue if email verification fails', async () => {
      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock email verification failure
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result =
        await referralService.createGeneralReferral(mockReferralData);

      // Should still succeed even if email fails
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
    });
  });

  describe('createGroupReferral', () => {
    it('should create user account and group referral record', async () => {
      const groupReferralData = { ...mockReferralData, groupId: 'group-123' };

      // Mock group exists check
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

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
      } as any);

      const result =
        await referralService.createGroupReferral(groupReferralData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockInsert).toHaveBeenCalledWith({
        group_id: 'group-123',
        referrer_id: 'referrer-123',
        referred_by_user_id: 'user-123',
        note: 'Test referral note',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should fail when group does not exist', async () => {
      const groupReferralData = {
        ...mockReferralData,
        groupId: 'nonexistent-group',
      };

      // Mock group not found
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result =
        await referralService.createGroupReferral(groupReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Group not found');
    });

    it('should fail when groupId is missing', async () => {
      const result =
        await referralService.createGroupReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Group ID is required for group referrals');
    });

    it('should handle database constraint violations for group referrals', async () => {
      const groupReferralData = { ...mockReferralData, groupId: 'group-123' };

      // Mock group exists check
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

      // Mock database constraint violation
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
  });

  describe('getReferralsByUser', () => {
    it('should return both group and general referrals for a user', async () => {
      const mockGroupReferrals = [
        {
          id: 'ref-1',
          group_id: 'group-1',
          referrer_id: 'user-1',
          referred_by_user_id: 'user-2',
          note: 'Test note',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockGeneralReferrals = [
        {
          id: 'ref-2',
          referrer_id: 'user-1',
          referred_by_user_id: 'user-3',
          note: 'Another test note',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest
            .fn()
            .mockResolvedValue({ data: mockGroupReferrals, error: null }),
        }),
      });

      // Mock different responses for different table calls
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest
                .fn()
                .mockResolvedValue({ data: mockGroupReferrals, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest
                .fn()
                .mockResolvedValue({ data: mockGeneralReferrals, error: null }),
            }),
          }),
        });

      const result = await referralService.getReferralsByUser('user-1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        groupReferrals: mockGroupReferrals,
        generalReferrals: mockGeneralReferrals,
      });
    });
  });

  describe('getReferralsForGroup', () => {
    it('should return referrals for a specific group', async () => {
      const mockReferrals = [
        {
          id: 'ref-1',
          group_id: 'group-1',
          referrer_id: 'user-1',
          referred_by_user_id: 'user-2',
          note: 'Test note',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest
            .fn()
            .mockResolvedValue({ data: mockReferrals, error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await referralService.getReferralsForGroup('group-1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockReferrals);
    });
  });

  describe('email verification', () => {
    it('should trigger email verification after user creation', async () => {
      // Mock successful auth user creation
      (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      // Mock email verification service
      const { emailVerificationService } = require('../emailVerification');
      emailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      await referralService.createGeneralReferral(mockReferralData);

      expect(
        emailVerificationService.sendVerificationEmail
      ).toHaveBeenCalledWith('test@example.com', true);
    });

    it('should not fail referral creation if email verification fails', async () => {
      // Mock successful auth user creation
      (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      // Mock email verification service failure
      const { emailVerificationService } = require('../emailVerification');
      emailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      const result =
        await referralService.createGeneralReferral(mockReferralData);

      // Should still succeed even if email fails
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
    });
  });

  describe('database operations', () => {
    describe('getReferralStatistics', () => {
      it('should return referral statistics', async () => {
        // Mock count queries for group referrals
        const mockGroupSelect = jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        });

        // Mock count queries for general referrals
        const mockGeneralSelect = jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({ count: 3, error: null }),
          }),
        });

        // Mock data queries for monthly stats
        const mockDataSelect = jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  { created_at: '2023-01-15T00:00:00Z' },
                  { created_at: '2023-02-15T00:00:00Z' },
                ],
                error: null,
              }),
            }),
          }),
        });

        // Mock different responses for different calls
        (supabase.from as jest.Mock)
          .mockReturnValueOnce({ select: mockGroupSelect }) // group count
          .mockReturnValueOnce({ select: mockGeneralSelect }) // general count
          .mockReturnValueOnce({ select: mockDataSelect }) // group monthly data
          .mockReturnValueOnce({ select: mockDataSelect }) // general monthly data
          .mockReturnValueOnce({ select: mockDataSelect }) // group referrers
          .mockReturnValueOnce({ select: mockDataSelect }); // general referrers

        const result = await referralService.getReferralStatistics(
          '2023-01-01',
          '2023-12-31'
        );

        expect(result.error).toBeNull();
        expect(result.data).toHaveProperty('totalReferrals');
        expect(result.data).toHaveProperty('groupReferrals');
        expect(result.data).toHaveProperty('generalReferrals');
        expect(result.data).toHaveProperty('referralsByMonth');
        expect(result.data).toHaveProperty('topReferrers');
      });
    });

    describe('getReferralsForUser', () => {
      it('should return referrals for a specific user', async () => {
        const mockReferral = {
          id: 'ref-1',
          referrer_id: 'user-1',
          referred_by_user_id: 'user-2',
          note: 'Test note',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        };

        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockReferral, error: null }),
          }),
        });

        (supabase.from as jest.Mock).mockReturnValue({
          select: mockSelect,
        });

        const result = await referralService.getReferralsForUser('user-2');

        expect(result.error).toBeNull();
        expect(result.data).toHaveProperty('groupReferral');
        expect(result.data).toHaveProperty('generalReferral');
      });
    });

    describe('createBatchReferrals', () => {
      it('should create multiple referrals in batches', async () => {
        const batchData = [
          { ...mockReferralData, email: 'user1@example.com' },
          { ...mockReferralData, email: 'user2@example.com' },
        ];

        // Mock successful auth user creation
        (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });

        // Mock successful database operations
        const mockInsert = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({
          insert: mockInsert,
        });

        const result = await referralService.createBatchReferrals(batchData);

        expect(result.error).toBeNull();
        expect(result.data?.successful).toBe(2);
        expect(result.data?.failed).toBe(0);
        expect(result.data?.errors).toHaveLength(0);
      });
    });

    describe('updateReferralNote', () => {
      it('should update referral note', async () => {
        const mockUpdate = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        });

        const result = await referralService.updateReferralNote(
          'ref-1',
          'Updated note',
          true
        );

        expect(result.error).toBeNull();
        expect(result.data).toBe(true);
      });
    });

    describe('deleteReferral', () => {
      it('should delete referral record', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        });

        const result = await referralService.deleteReferral('ref-1', true);

        expect(result.error).toBeNull();
        expect(result.data).toBe(true);
      });
    });

    describe('getReferralCountsByReferrer', () => {
      it('should return referral counts for a referrer', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        });

        const result =
          await referralService.getReferralCountsByReferrer('user-1');

        expect(result.error).toBeNull();
        expect(result.data).toHaveProperty('groupReferrals');
        expect(result.data).toHaveProperty('generalReferrals');
        expect(result.data).toHaveProperty('totalReferrals');
      });
    });

    describe('validateDatabaseSchema', () => {
      it('should validate database schema', async () => {
        const mockSelect = jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

        (supabase.from as jest.Mock).mockReturnValue({
          select: mockSelect,
        });

        const result = await referralService.validateDatabaseSchema();

        expect(result.error).toBeNull();
        expect(result.data).toHaveProperty('referralsExists');
        expect(result.data).toHaveProperty('generalReferralsExists');
        expect(result.data).toHaveProperty('indexesExist');
        expect(result.data).toHaveProperty('constraintsValid');
      });
    });

    describe('constraint handling', () => {
      it('should handle unique constraint violations', async () => {
        // Mock successful auth user creation
        (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });

        // Mock successful user insert but failed referral insert due to unique constraint
        const mockInsert = jest
          .fn()
          .mockResolvedValueOnce({ error: null }) // First call for users table
          .mockResolvedValueOnce({
            error: {
              code: '23505',
              message: 'duplicate key value violates unique constraint',
            },
          }); // Second call for referrals table

        (supabase.from as jest.Mock).mockReturnValue({
          insert: mockInsert,
        });

        const result =
          await referralService.createGeneralReferral(mockReferralData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('This user has already been referred by you');
      });

      it('should handle foreign key constraint violations', async () => {
        // Mock successful auth user creation
        (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });

        // Mock successful user insert but failed referral insert due to FK constraint
        const mockInsert = jest
          .fn()
          .mockResolvedValueOnce({ error: null }) // First call for users table
          .mockResolvedValueOnce({
            error: {
              code: '23503',
              message:
                'insert or update on table violates foreign key constraint',
            },
          }); // Second call for referrals table

        (supabase.from as jest.Mock).mockReturnValue({
          insert: mockInsert,
        });

        const result =
          await referralService.createGeneralReferral(mockReferralData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid referrer or user reference');
      });

      it('should handle check constraint violations', async () => {
        // Mock successful auth user creation
        (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });

        // Mock successful user insert but failed referral insert due to check constraint
        const mockInsert = jest
          .fn()
          .mockResolvedValueOnce({ error: null }) // First call for users table
          .mockResolvedValueOnce({
            error: {
              code: '23514',
              message: 'new row violates check constraint',
            },
          }); // Second call for referrals table

        (supabase.from as jest.Mock).mockReturnValue({
          insert: mockInsert,
        });

        const result =
          await referralService.createGeneralReferral(mockReferralData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot refer yourself');
      });
    });
  });

  describe('Error Handling and Validation', () => {
    beforeEach(() => {
      // Clear rate limiter for each test
      (referralRateLimiter as any).clearAllRateLimits();
    });

    it('should handle rate limiting', async () => {
      // Mock rate limiter to return rate limit exceeded
      jest.spyOn(referralRateLimiter, 'canMakeReferral').mockReturnValue({
        allowed: false,
        reason:
          'Too many referrals in the last hour. You can make 5 referrals per hour.',
        retryAfter: 30,
      });

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many referrals');
      expect(result.errorDetails?.type).toBe('rate_limit');
      expect(result.errorDetails?.retryable).toBe(true);
      expect(result.errorDetails?.suggestions).toContain(
        'Try again in 30 minutes'
      );
    });

    it('should handle validation errors', async () => {
      const invalidData: CreateReferralData = {
        ...mockReferralData,
        email: 'invalid-email',
        phone: '123',
      };

      const result = await referralService.createReferral(invalidData);

      expect(result.success).toBe(false);
      expect(result.errorDetails?.type).toBe('validation');
      expect(result.errorDetails?.retryable).toBe(true);
    });

    it('should handle duplicate referrals', async () => {
      // Mock existing user
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-user-123', email: 'test@example.com' },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock existing referral
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-user-123', email: 'test@example.com' },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.errorDetails?.type).toBe('duplicate');
      expect(result.errorDetails?.retryable).toBe(false);
    });

    it('should handle network errors', async () => {
      // Mock network error
      mockAuthService.createReferredUser.mockRejectedValue(
        new Error('Network connection failed')
      );

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.errorDetails?.type).toBe('network');
      expect(result.errorDetails?.retryable).toBe(true);
    });

    it('should handle email service failures gracefully', async () => {
      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock email service failure
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      // Mock successful database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      // Should still succeed even if email fails
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('should sanitize input data', async () => {
      const dirtyData: CreateReferralData = {
        email: '  TEST@EXAMPLE.COM  ',
        phone: '  +1 234 567 890  ',
        note: '  This is a test note  ',
        firstName: '  John  ',
        lastName: '  Doe  ',
        referrerId: 'referrer-123',
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await referralService.createReferral(dirtyData);

      expect(result.success).toBe(true);

      // Verify that createReferredUser was called with sanitized data
      expect(mockAuthService.createReferredUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          phone: '+1 234 567 890',
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });

    it('should provide warnings for suspicious input', async () => {
      const suspiciousData: CreateReferralData = {
        ...mockReferralData,
        email: 'test@10minutemail.com', // Disposable email
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await referralService.createReferral(suspiciousData);

      expect(result.success).toBe(true);
      expect(result.warnings?.email).toContain('Disposable email addresses');
    });

    it('should handle database constraint violations', async () => {
      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock database constraint violation
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        }),
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been referred');
    });

    it('should handle foreign key constraint violations', async () => {
      // Mock successful user creation
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      // Mock foreign key constraint violation
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: {
            code: '23503',
            message:
              'insert or update on table violates foreign key constraint',
          },
        }),
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid referrer or user reference');
    });

    it('should record referral attempts for rate limiting', async () => {
      const recordSpy = jest.spyOn(referralRateLimiter, 'recordReferral');

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await referralService.createReferral(mockReferralData);

      expect(recordSpy).toHaveBeenCalledWith(mockReferralData.referrerId);
    });

    it('should handle invalid UUID formats', async () => {
      const invalidUuidData: CreateReferralData = {
        ...mockReferralData,
        referrerId: 'invalid-uuid',
        groupId: 'also-invalid',
      };

      const result = await referralService.createReferral(invalidUuidData);

      expect(result.success).toBe(false);
      expect(result.errorDetails?.type).toBe('validation');
      expect(result.error).toContain('Invalid referrer ID format');
    });

    it('should suggest email domain corrections', async () => {
      const typoData: CreateReferralData = {
        ...mockReferralData,
        email: 'test@gmail.co', // Common typo
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await referralService.createReferral(typoData);

      expect(result.success).toBe(true);
      expect(result.warnings?.email).toContain('test@gmail.com');
    });

    it('should handle retry logic for transient failures', async () => {
      let attemptCount = 0;

      // Mock transient failure followed by success
      mockAuthService.createReferredUser.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve({ userId: 'user-123', error: null });
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(2); // Should have retried once
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long input strings', async () => {
      const longData: CreateReferralData = {
        ...mockReferralData,
        note: 'a'.repeat(1000), // Exceeds 500 char limit
        firstName: 'a'.repeat(100), // Exceeds 50 char limit
        lastName: 'a'.repeat(100), // Exceeds 50 char limit
      };

      const result = await referralService.createReferral(longData);

      expect(result.success).toBe(false);
      expect(result.errorDetails?.type).toBe('validation');
    });

    it('should handle special characters in names', async () => {
      const specialCharData: CreateReferralData = {
        ...mockReferralData,
        firstName: "O'Connor",
        lastName: 'Smith-Jones',
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await referralService.createReferral(specialCharData);

      expect(result.success).toBe(true);
    });

    it('should handle international characters in names', async () => {
      const internationalData: CreateReferralData = {
        ...mockReferralData,
        firstName: 'José',
        lastName: 'Müller',
      };

      const result = await referralService.createReferral(internationalData);

      expect(result.success).toBe(false);
      expect(result.errorDetails?.type).toBe('validation');
      expect(result.error).toContain('invalid characters');
    });

    it('should handle empty note field correctly', async () => {
      const emptyNoteData: CreateReferralData = {
        ...mockReferralData,
        note: '',
      };

      // Mock successful operations
      mockAuthService.createReferredUser.mockResolvedValue({
        userId: 'user-123',
        error: null,
      });

      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue({
        success: true,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await referralService.createReferral(emptyNoteData);

      expect(result.success).toBe(true);
    });
  });
});
