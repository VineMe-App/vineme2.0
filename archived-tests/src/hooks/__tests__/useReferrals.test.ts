import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import {
  useReferrals,
  useUserReferrals,
  useGroupReferrals,
  useReferralsForUser,
  useReferralStatistics,
  useReferralCounts,
  useCreateGeneralReferral,
  useCreateGroupReferral,
  useCreateReferral,
  useCreateBatchReferrals,
  useReferralValidation,
  useGroupReferralOperations,
} from '../useReferrals';
import { referralService } from '../../services/referrals';
import { useAuthStore } from '../../stores/auth';
import { performanceMonitor } from '../../utils/performance';

// Mock dependencies
jest.mock('../../services/referrals');
jest.mock('../../stores/auth');
jest.mock('../../utils/performance');

const mockReferralService = referralService as jest.Mocked<
  typeof referralService
>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;
const mockPerformanceMonitor = performanceMonitor as jest.Mocked<
  typeof performanceMonitor
>;

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
};

const mockGroupReferral = {
  id: 'ref-1',
  group_id: 'group-123',
  referrer_id: 'user-123',
  referred_by_user_id: 'user-456',
  note: 'Great person for our group',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  group: {
    id: 'group-123',
    name: 'Test Group',
    description: 'A test group',
  },
  referrer: mockUser,
  referred_user: {
    id: 'user-456',
    email: 'referred@example.com',
    name: 'Referred User',
  },
};

const mockGeneralReferral = {
  id: 'ref-2',
  referrer_id: 'user-123',
  referred_by_user_id: 'user-789',
  note: 'Would be great in our community',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  referrer: mockUser,
  referred_user: {
    id: 'user-789',
    email: 'another@example.com',
    name: 'Another User',
  },
};

const mockReferralsData = {
  groupReferrals: [mockGroupReferral],
  generalReferrals: [mockGeneralReferral],
};

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useReferrals hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      updateProfile: jest.fn(),
    });

    // Mock the new service methods
    mockReferralService.getReferralsForUser = jest.fn();
    mockReferralService.getReferralStatistics = jest.fn();
    mockReferralService.getReferralCountsByReferrer = jest.fn();
    mockReferralService.createBatchReferrals = jest.fn();
  });

  describe('useUserReferrals', () => {
    it('should fetch user referrals successfully', async () => {
      mockReferralService.getReferralsByUser.mockResolvedValue({
        data: mockReferralsData,
        error: null,
      });

      const { result } = renderHook(() => useUserReferrals('user-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockReferralsData);
      expect(result.current.error).toBeNull();
      expect(mockReferralService.getReferralsByUser).toHaveBeenCalledWith(
        'user-123'
      );
      expect(mockPerformanceMonitor.recordQueryPerformance).toHaveBeenCalled();
    });

    it('should handle errors when fetching user referrals', async () => {
      const error = new Error('Failed to fetch referrals');
      mockReferralService.getReferralsByUser.mockResolvedValue({
        data: null,
        error,
      });

      const { result } = renderHook(() => useUserReferrals('user-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('should not fetch when userId is not provided', () => {
      const { result } = renderHook(() => useUserReferrals(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockReferralService.getReferralsByUser).not.toHaveBeenCalled();
    });
  });

  describe('useGroupReferrals', () => {
    it('should fetch group referrals successfully', async () => {
      mockReferralService.getReferralsForGroup.mockResolvedValue({
        data: [mockGroupReferral],
        error: null,
      });

      const { result } = renderHook(() => useGroupReferrals('group-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([mockGroupReferral]);
      expect(result.current.error).toBeNull();
      expect(mockReferralService.getReferralsForGroup).toHaveBeenCalledWith(
        'group-123'
      );
    });

    it('should handle errors when fetching group referrals', async () => {
      const error = new Error('Failed to fetch group referrals');
      mockReferralService.getReferralsForGroup.mockResolvedValue({
        data: null,
        error,
      });

      const { result } = renderHook(() => useGroupReferrals('group-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCreateGeneralReferral', () => {
    it('should create general referral successfully', async () => {
      const mockResponse = { success: true, userId: 'user-456' };
      mockReferralService.createGeneralReferral.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateGeneralReferral(), {
        wrapper: createWrapper(),
      });

      const referralData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Great person',
        firstName: 'John',
        lastName: 'Doe',
      };

      await waitFor(async () => {
        const response = await result.current.mutateAsync(referralData);
        expect(response).toEqual(mockResponse);
      });

      expect(mockReferralService.createGeneralReferral).toHaveBeenCalledWith({
        ...referralData,
        referrerId: 'user-123',
      });
      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith(
        'general_referral_creation',
        expect.any(Number),
        expect.objectContaining({
          success: true,
          hasNote: true,
        })
      );
    });

    it('should handle errors when creating general referral', async () => {
      const mockResponse = { success: false, error: 'Email already exists' };
      mockReferralService.createGeneralReferral.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateGeneralReferral(), {
        wrapper: createWrapper(),
      });

      const referralData = {
        email: 'existing@example.com',
        phone: '+1234567890',
        note: 'Great person',
      };

      await expect(result.current.mutateAsync(referralData)).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        updateProfile: jest.fn(),
      });

      const { result } = renderHook(() => useCreateGeneralReferral(), {
        wrapper: createWrapper(),
      });

      const referralData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Great person',
      };

      await expect(result.current.mutateAsync(referralData)).rejects.toThrow(
        'User must be authenticated'
      );
    });
  });

  describe('useCreateGroupReferral', () => {
    it('should create group referral successfully', async () => {
      const mockResponse = { success: true, userId: 'user-456' };
      mockReferralService.createGroupReferral.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateGroupReferral(), {
        wrapper: createWrapper(),
      });

      const referralData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Great person for this group',
        groupId: 'group-123',
      };

      await waitFor(async () => {
        const response = await result.current.mutateAsync(referralData);
        expect(response).toEqual(mockResponse);
      });

      expect(mockReferralService.createGroupReferral).toHaveBeenCalledWith({
        ...referralData,
        referrerId: 'user-123',
      });
    });

    it('should throw error when groupId is missing', async () => {
      const { result } = renderHook(() => useCreateGroupReferral(), {
        wrapper: createWrapper(),
      });

      const referralData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Great person',
      };

      await expect(result.current.mutateAsync(referralData)).rejects.toThrow(
        'Group ID is required for group referrals'
      );
    });
  });

  describe('useCreateReferral', () => {
    it('should create referral and route to appropriate method', async () => {
      const mockResponse = { success: true, userId: 'user-456' };
      mockReferralService.createReferral.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateReferral(), {
        wrapper: createWrapper(),
      });

      const referralData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Great person',
        groupId: 'group-123',
      };

      await waitFor(async () => {
        const response = await result.current.mutateAsync(referralData);
        expect(response).toEqual(mockResponse);
      });

      expect(mockReferralService.createReferral).toHaveBeenCalledWith({
        ...referralData,
        referrerId: 'user-123',
      });
    });
  });

  describe('useReferrals', () => {
    beforeEach(() => {
      mockReferralService.getReferralsByUser.mockResolvedValue({
        data: mockReferralsData,
        error: null,
      });
      mockReferralService.getReferralCountsByReferrer.mockResolvedValue({
        data: {
          groupReferrals: 1,
          generalReferrals: 1,
          totalReferrals: 2,
        },
        error: null,
      });
    });

    it('should provide comprehensive referral operations', async () => {
      const { result } = renderHook(() => useReferrals(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.referrals).toEqual(mockReferralsData);
      expect(result.current.counts).toEqual({
        groupReferrals: 1,
        generalReferrals: 1,
        totalReferrals: 2,
      });
      expect(result.current.analytics).toBeDefined();
      expect(result.current.getTotalReferrals()).toBe(2);
      expect(result.current.hasReferrals()).toBe(true);
      expect(result.current.getRecentReferrals(1)).toHaveLength(1);
      expect(result.current.getRecentReferrals(1)[0].type).toBe('general'); // Most recent
      expect(result.current.validation).toBeDefined();
    });

    it('should provide helper functions with correct calculations', async () => {
      const { result } = renderHook(() => useReferrals(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test getTotalReferrals
      expect(result.current.getTotalReferrals()).toBe(2);

      // Test getRecentReferrals ordering (most recent first)
      const recent = result.current.getRecentReferrals(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].created_at).toBe('2024-01-02T00:00:00Z'); // More recent
      expect(recent[1].created_at).toBe('2024-01-01T00:00:00Z'); // Less recent

      // Test hasReferrals
      expect(result.current.hasReferrals()).toBe(true);
    });

    it('should handle empty referrals data', async () => {
      mockReferralService.getReferralsByUser.mockResolvedValue({
        data: { groupReferrals: [], generalReferrals: [] },
        error: null,
      });
      mockReferralService.getReferralCountsByReferrer.mockResolvedValue({
        data: {
          groupReferrals: 0,
          generalReferrals: 0,
          totalReferrals: 0,
        },
        error: null,
      });

      const { result } = renderHook(() => useReferrals(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getTotalReferrals()).toBe(0);
      expect(result.current.hasReferrals()).toBe(false);
      expect(result.current.getRecentReferrals()).toHaveLength(0);
    });

    it('should provide feedback methods with success messages', async () => {
      mockReferralService.createGeneralReferral.mockResolvedValue({
        success: true,
        userId: 'user-456',
      });

      const { result } = renderHook(() => useReferrals(), {
        wrapper: createWrapper(),
      });

      const referralData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Great person',
      };

      const response = await result.current.createGeneralReferral(referralData);

      expect(response.success).toBe(true);
      expect(response.message).toContain(
        'General referral created successfully'
      );
    });

    it('should provide feedback methods with error messages', async () => {
      mockReferralService.createGeneralReferral.mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      const { result } = renderHook(() => useReferrals(), {
        wrapper: createWrapper(),
      });

      const referralData = {
        email: 'existing@example.com',
        phone: '+1234567890',
        note: 'Great person',
      };

      const response = await result.current.createGeneralReferral(referralData);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Email already exists');
    });
  });

  describe('useReferralsForUser', () => {
    it('should fetch referrals for a specific referred user', async () => {
      const mockUserReferrals = {
        groupReferral: mockGroupReferral,
        generalReferral: mockGeneralReferral,
      };

      mockReferralService.getReferralsForUser.mockResolvedValue({
        data: mockUserReferrals,
        error: null,
      });

      const { result } = renderHook(() => useReferralsForUser('user-456'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockUserReferrals);
      expect(mockReferralService.getReferralsForUser).toHaveBeenCalledWith(
        'user-456'
      );
    });

    it('should not fetch when userId is not provided', () => {
      const { result } = renderHook(() => useReferralsForUser(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockReferralService.getReferralsForUser).not.toHaveBeenCalled();
    });
  });

  describe('useReferralStatistics', () => {
    it('should fetch referral statistics', async () => {
      const mockStats = {
        totalReferrals: 10,
        groupReferrals: 6,
        generalReferrals: 4,
        referralsByMonth: [{ month: '2024-01', count: 5 }],
        topReferrers: [
          { referrer_id: 'user-123', referrer_name: 'Test User', count: 3 },
        ],
      };

      mockReferralService.getReferralStatistics.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const { result } = renderHook(
        () => useReferralStatistics('2024-01-01', '2024-12-31'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(mockReferralService.getReferralStatistics).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-12-31'
      );
    });
  });

  describe('useReferralCounts', () => {
    it('should fetch referral counts for a referrer', async () => {
      const mockCounts = {
        groupReferrals: 3,
        generalReferrals: 2,
        totalReferrals: 5,
      };

      mockReferralService.getReferralCountsByReferrer.mockResolvedValue({
        data: mockCounts,
        error: null,
      });

      const { result } = renderHook(() => useReferralCounts('user-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCounts);
      expect(
        mockReferralService.getReferralCountsByReferrer
      ).toHaveBeenCalledWith('user-123');
    });
  });

  describe('useCreateBatchReferrals', () => {
    it('should create batch referrals successfully', async () => {
      const mockResponse = { successful: 2, failed: 0, errors: [] };
      mockReferralService.createBatchReferrals.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useCreateBatchReferrals(), {
        wrapper: createWrapper(),
      });

      const referralsData = [
        {
          email: 'test1@example.com',
          phone: '+1234567890',
          note: 'First referral',
        },
        {
          email: 'test2@example.com',
          phone: '+1234567891',
          note: 'Second referral',
        },
      ];

      await waitFor(async () => {
        const response = await result.current.mutateAsync(referralsData);
        expect(response).toEqual(mockResponse);
      });

      expect(mockReferralService.createBatchReferrals).toHaveBeenCalledWith(
        referralsData.map((r) => ({ ...r, referrerId: 'user-123' }))
      );
    });
  });

  describe('useReferralValidation', () => {
    it('should provide validation functions', () => {
      const { result } = renderHook(() => useReferralValidation(), {
        wrapper: createWrapper(),
      });

      // Test email validation
      expect(result.current.validateEmail('test@example.com')).toBeNull();
      expect(result.current.validateEmail('invalid-email')).toBe(
        'Invalid email format'
      );
      expect(result.current.validateEmail('')).toBe('Email is required');

      // Test phone validation
      expect(result.current.validatePhone('+1234567890')).toBeNull();
      expect(result.current.validatePhone('123')).toBe(
        'Invalid phone number format'
      );
      expect(result.current.validatePhone('')).toBe('Phone number is required');

      // Test referral data validation
      const validData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Test note',
      };
      expect(result.current.isValidReferralData(validData)).toBe(true);

      const invalidData = {
        email: 'invalid-email',
        phone: '123',
        note: 'Test note',
      };
      expect(result.current.isValidReferralData(invalidData)).toBe(false);
    });
  });

  describe('useGroupReferralOperations', () => {
    it('should provide group-specific referral operations', async () => {
      mockReferralService.getReferralsForGroup.mockResolvedValue({
        data: [mockGroupReferral],
        error: null,
      });
      mockReferralService.createGroupReferral.mockResolvedValue({
        success: true,
        userId: 'user-456',
      });

      const { result } = renderHook(
        () => useGroupReferralOperations('group-123'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.referrals).toEqual([mockGroupReferral]);

      const referralData = {
        email: 'test@example.com',
        phone: '+1234567890',
        note: 'Great for this group',
      };

      const response = await result.current.createReferral(referralData);

      expect(response.success).toBe(true);
      expect(response.message).toContain('Group referral created successfully');
      expect(mockReferralService.createGroupReferral).toHaveBeenCalledWith({
        ...referralData,
        groupId: 'group-123',
        referrerId: 'user-123',
      });
    });

    it('should handle validation errors', async () => {
      const { result } = renderHook(
        () => useGroupReferralOperations('group-123'),
        {
          wrapper: createWrapper(),
        }
      );

      const invalidReferralData = {
        email: 'invalid-email',
        phone: '123',
        note: 'Great for this group',
      };

      const response = await result.current.createReferral(invalidReferralData);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Please fix the validation errors');
      expect(response.validationErrors).toBeDefined();
    });
  });
});
