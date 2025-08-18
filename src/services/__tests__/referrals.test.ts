import { referralService } from '../referrals';
import { supabase } from '../supabase';
import type { CreateReferralData } from '../referrals';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
      resend: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: { id: 'group-1' }, error: null })),
          order: jest.fn(() => ({ data: [], error: null })),
        })),
        order: jest.fn(() => ({ data: [], error: null })),
      })),
    })),
  },
}));

// Mock error handling utilities
jest.mock('../../utils/errorHandling', () => ({
  handleSupabaseError: jest.fn((error) => ({ message: error.message })),
  retryWithBackoff: jest.fn((fn) => fn()),
}));

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

      const result = await referralService.createReferral(mockReferralData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: expect.any(String),
        email_confirm: false,
        user_metadata: {
          name: 'John Doe',
          phone: '+1234567890',
          referred: true,
          referrer_id: 'referrer-123',
        },
      });
    });

    it('should create a group referral when groupId is provided', async () => {
      const groupReferralData = { ...mockReferralData, groupId: 'group-123' };

      // Mock successful auth user creation
      (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 'group-123' }, error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
      });

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

      const result =
        await referralService.createGeneralReferral(mockReferralData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockInsert).toHaveBeenCalledTimes(2); // Once for users, once for general_referrals
    });

    it('should handle auth user creation failure', async () => {
      (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result =
        await referralService.createGeneralReferral(mockReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create user account');
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

      // Mock successful auth user creation
      (supabase.auth.admin.createUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
      });

      const result =
        await referralService.createGroupReferral(groupReferralData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
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

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

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
  });

  describe('getReferralsByUser', () => {
    it('should return both group and general referrals for a user', async () => {
      const mockGroupReferrals = [
        {
          id: 'ref-1',
          group_id: 'group-1',
          referrer_id: 'user-1',
          referred_user_id: 'user-2',
          note: 'Test note',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockGeneralReferrals = [
        {
          id: 'ref-2',
          referrer_id: 'user-1',
          referred_user_id: 'user-3',
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
          referred_user_id: 'user-2',
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

      // Mock email resend
      (supabase.auth.resend as jest.Mock).mockResolvedValue({ error: null });

      await referralService.createGeneralReferral(mockReferralData);

      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
      });
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

      // Mock email resend failure
      (supabase.auth.resend as jest.Mock).mockResolvedValue({
        error: { message: 'Email service unavailable' },
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
                error: null 
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

        const result = await referralService.getReferralStatistics('2023-01-01', '2023-12-31');

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
          referred_user_id: 'user-2',
          note: 'Test note',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        };

        const mockSelect = jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockReferral, error: null }),
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

        const result = await referralService.updateReferralNote('ref-1', 'Updated note', true);

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

        const result = await referralService.getReferralCountsByReferrer('user-1');

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
        expect(result.data).toHaveProperty('groupReferralsExists');
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
        const mockInsert = jest.fn()
          .mockResolvedValueOnce({ error: null }) // First call for users table
          .mockResolvedValueOnce({ 
            error: { code: '23505', message: 'duplicate key value violates unique constraint' } 
          }); // Second call for referrals table

        (supabase.from as jest.Mock).mockReturnValue({
          insert: mockInsert,
        });

        const result = await referralService.createGeneralReferral(mockReferralData);

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
        const mockInsert = jest.fn()
          .mockResolvedValueOnce({ error: null }) // First call for users table
          .mockResolvedValueOnce({ 
            error: { code: '23503', message: 'insert or update on table violates foreign key constraint' } 
          }); // Second call for referrals table

        (supabase.from as jest.Mock).mockReturnValue({
          insert: mockInsert,
        });

        const result = await referralService.createGeneralReferral(mockReferralData);

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
        const mockInsert = jest.fn()
          .mockResolvedValueOnce({ error: null }) // First call for users table
          .mockResolvedValueOnce({ 
            error: { code: '23514', message: 'new row violates check constraint' } 
          }); // Second call for referrals table

        (supabase.from as jest.Mock).mockReturnValue({
          insert: mockInsert,
        });

        const result = await referralService.createGeneralReferral(mockReferralData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot refer yourself');
      });
    });
  });
});
