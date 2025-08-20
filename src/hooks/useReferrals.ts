import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralService, CreateReferralData, ReferralResponse } from '../services/referrals';
import type { 
  GroupReferralWithDetails, 
  GeneralReferralWithDetails 
} from '../types/database';
import { useAuthStore } from '../stores/auth';
import { performanceMonitor } from '../utils/performance';
import { useCallback, useMemo } from 'react';

// Query keys for referral operations
export const referralKeys = {
  all: ['referrals'] as const,
  byUser: (userId: string) => [...referralKeys.all, 'byUser', userId] as const,
  byGroup: (groupId: string) => [...referralKeys.all, 'byGroup', groupId] as const,
  forUser: (userId: string) => [...referralKeys.all, 'forUser', userId] as const,
  statistics: (startDate?: string, endDate?: string) => 
    [...referralKeys.all, 'statistics', startDate, endDate] as const,
  counts: (referrerId: string) => [...referralKeys.all, 'counts', referrerId] as const,
} as const;

/**
 * Hook to get referrals made by a specific user
 */
export const useUserReferrals = (userId?: string) => {
  return useQuery({
    queryKey: referralKeys.byUser(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const startTime = Date.now();
      const { data, error } = await referralService.getReferralsByUser(userId);
      const duration = Date.now() - startTime;

      // Record query performance
      performanceMonitor.recordQueryPerformance(
        `user_referrals_${userId}`,
        duration,
        false
      );

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    meta: {
      description: 'Fetch referrals made by user',
    },
  });
};

/**
 * Hook to get referrals for a specific group
 */
export const useGroupReferrals = (groupId?: string) => {
  return useQuery({
    queryKey: referralKeys.byGroup(groupId || ''),
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID is required');
      
      const startTime = Date.now();
      const { data, error } = await referralService.getReferralsForGroup(groupId);
      const duration = Date.now() - startTime;

      // Record query performance
      performanceMonitor.recordQueryPerformance(
        `group_referrals_${groupId}`,
        duration,
        false
      );

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    meta: {
      description: 'Fetch referrals for specific group',
    },
  });
};

/**
 * Hook to get referrals for a specific referred user
 * Useful for tracking how a user was referred
 */
export const useReferralsForUser = (userId?: string) => {
  return useQuery({
    queryKey: referralKeys.forUser(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const startTime = Date.now();
      const { data, error } = await referralService.getReferralsForUser(userId);
      const duration = Date.now() - startTime;

      // Record query performance
      performanceMonitor.recordQueryPerformance(
        `referrals_for_user_${userId}`,
        duration,
        false
      );

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    meta: {
      description: 'Fetch referrals for specific referred user',
    },
  });
};

/**
 * Hook to get referral statistics
 */
export const useReferralStatistics = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: referralKeys.statistics(startDate, endDate),
    queryFn: async () => {
      const startTime = Date.now();
      const { data, error } = await referralService.getReferralStatistics(startDate, endDate);
      const duration = Date.now() - startTime;

      // Record query performance
      performanceMonitor.recordQueryPerformance(
        'referral_statistics',
        duration,
        false
      );

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    meta: {
      description: 'Fetch referral statistics and analytics',
    },
  });
};

/**
 * Hook to get referral counts for a specific referrer
 */
export const useReferralCounts = (referrerId?: string) => {
  return useQuery({
    queryKey: referralKeys.counts(referrerId || ''),
    queryFn: async () => {
      if (!referrerId) throw new Error('Referrer ID is required');
      
      const startTime = Date.now();
      const { data, error } = await referralService.getReferralCountsByReferrer(referrerId);
      const duration = Date.now() - startTime;

      // Record query performance
      performanceMonitor.recordQueryPerformance(
        `referral_counts_${referrerId}`,
        duration,
        false
      );

      if (error) throw error;
      return data;
    },
    enabled: !!referrerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    meta: {
      description: 'Fetch referral counts for specific referrer',
    },
  });
};

/**
 * Hook to create a general referral (no specific group)
 */
export const useCreateGeneralReferral = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (referralData: Omit<CreateReferralData, 'referrerId'>) => {
      if (!user?.id) throw new Error('User must be authenticated');
      
      const startTime = Date.now();
      const result = await referralService.createGeneralReferral({
        ...referralData,
        referrerId: user.id,
      });
      const duration = Date.now() - startTime;

      // Record mutation performance
      performanceMonitor.recordMetric('general_referral_creation', duration, {
        success: result.success,
        hasNote: !!referralData.note,
      });

      if (!result.success) {
        const error = new Error(result.error || 'Failed to create general referral');
        (error as any).errorDetails = result.errorDetails;
        (error as any).warnings = result.warnings;
        throw error;
      }

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate user referrals to refresh the list
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: referralKeys.byUser(user.id),
        });
      }

      // Record successful referral creation
      performanceMonitor.recordMetric('referral_success', 1, {
        type: 'general',
        hasFirstName: !!variables.firstName,
        hasLastName: !!variables.lastName,
        hasNote: !!variables.note,
      });
    },
    onError: (error, variables) => {
      // Record failed referral creation
      performanceMonitor.recordMetric('referral_error', 1, {
        type: 'general',
        error: error.message,
        hasNote: !!variables.note,
      });
      
      console.error('Failed to create general referral:', error);
    },
  });
};

/**
 * Hook to create a group-specific referral
 */
export const useCreateGroupReferral = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (referralData: Omit<CreateReferralData, 'referrerId'>) => {
      if (!user?.id) throw new Error('User must be authenticated');
      if (!referralData.groupId) throw new Error('Group ID is required for group referrals');
      
      const startTime = Date.now();
      const result = await referralService.createGroupReferral({
        ...referralData,
        referrerId: user.id,
      });
      const duration = Date.now() - startTime;

      // Record mutation performance
      performanceMonitor.recordMetric('group_referral_creation', duration, {
        success: result.success,
        groupId: referralData.groupId,
        hasNote: !!referralData.note,
      });

      if (!result.success) {
        const error = new Error(result.error || 'Failed to create group referral');
        (error as any).errorDetails = result.errorDetails;
        (error as any).warnings = result.warnings;
        throw error;
      }

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate user referrals to refresh the list
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: referralKeys.byUser(user.id),
        });
      }

      // Invalidate group referrals if we have a group ID
      if (variables.groupId) {
        queryClient.invalidateQueries({
          queryKey: referralKeys.byGroup(variables.groupId),
        });
      }

      // Record successful referral creation
      performanceMonitor.recordMetric('referral_success', 1, {
        type: 'group',
        groupId: variables.groupId,
        hasFirstName: !!variables.firstName,
        hasLastName: !!variables.lastName,
        hasNote: !!variables.note,
      });
    },
    onError: (error, variables) => {
      // Record failed referral creation
      performanceMonitor.recordMetric('referral_error', 1, {
        type: 'group',
        groupId: variables.groupId,
        error: error.message,
        hasNote: !!variables.note,
      });
      
      console.error('Failed to create group referral:', error);
    },
  });
};

/**
 * Hook to create any type of referral (routes to appropriate method)
 */
export const useCreateReferral = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (referralData: Omit<CreateReferralData, 'referrerId'>) => {
      if (!user?.id) throw new Error('User must be authenticated');
      
      const startTime = Date.now();
      const result = await referralService.createReferral({
        ...referralData,
        referrerId: user.id,
      });
      const duration = Date.now() - startTime;

      // Record mutation performance
      performanceMonitor.recordMetric('referral_creation', duration, {
        success: result.success,
        type: referralData.groupId ? 'group' : 'general',
        groupId: referralData.groupId,
        hasNote: !!referralData.note,
      });

      if (!result.success) {
        const error = new Error(result.error || 'Failed to create referral');
        (error as any).errorDetails = result.errorDetails;
        (error as any).warnings = result.warnings;
        throw error;
      }

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate user referrals to refresh the list
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: referralKeys.byUser(user.id),
        });
      }

      // Invalidate group referrals if we have a group ID
      if (variables.groupId) {
        queryClient.invalidateQueries({
          queryKey: referralKeys.byGroup(variables.groupId),
        });
      }

      // Record successful referral creation
      performanceMonitor.recordMetric('referral_success', 1, {
        type: variables.groupId ? 'group' : 'general',
        groupId: variables.groupId,
        hasFirstName: !!variables.firstName,
        hasLastName: !!variables.lastName,
        hasNote: !!variables.note,
      });
    },
    onError: (error, variables) => {
      // Record failed referral creation
      performanceMonitor.recordMetric('referral_error', 1, {
        type: variables.groupId ? 'group' : 'general',
        groupId: variables.groupId,
        error: error.message,
        hasNote: !!variables.note,
      });
      
      console.error('Failed to create referral:', error);
    },
  });
};

/**
 * Hook to create batch referrals (for admin/bulk operations)
 */
export const useCreateBatchReferrals = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (referrals: Omit<CreateReferralData, 'referrerId'>[]) => {
      if (!user?.id) throw new Error('User must be authenticated');
      
      const referralsWithReferrer = referrals.map(referral => ({
        ...referral,
        referrerId: user.id,
      }));

      const startTime = Date.now();
      const { data, error } = await referralService.createBatchReferrals(referralsWithReferrer);
      const duration = Date.now() - startTime;

      // Record batch operation performance
      performanceMonitor.recordMetric('batch_referral_creation', duration, {
        totalReferrals: referrals.length,
        successful: data?.successful || 0,
        failed: data?.failed || 0,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate user referrals to refresh the list
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: referralKeys.byUser(user.id),
        });
      }

      // Invalidate statistics
      queryClient.invalidateQueries({
        queryKey: referralKeys.statistics(),
      });

      // Record successful batch operation
      performanceMonitor.recordMetric('batch_referral_success', 1, {
        successful: data?.successful || 0,
        failed: data?.failed || 0,
      });
    },
    onError: (error) => {
      // Record failed batch operation
      performanceMonitor.recordMetric('batch_referral_error', 1, {
        error: error.message,
      });
      
      console.error('Failed to create batch referrals:', error);
    },
  });
};

/**
 * Validation helpers for referral data
 */
export const useReferralValidation = () => {
  const validateEmail = useCallback((email: string): string | null => {
    if (!email || !email.trim()) {
      return 'Email is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    
    return null;
  }, []);

  const validatePhone = useCallback((phone: string): string | null => {
    if (!phone || !phone.trim()) {
      return 'Phone number is required';
    }
    
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return 'Invalid phone number format';
    }
    
    return null;
  }, []);

  const validateReferralData = useCallback((data: Omit<CreateReferralData, 'referrerId'>): Record<string, string> => {
    const errors: Record<string, string> = {};

    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;

    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.phone = phoneError;

    if (data.groupId && !data.groupId.trim()) {
      errors.groupId = 'Group ID is required for group referrals';
    }

    return errors;
  }, [validateEmail, validatePhone]);

  const isValidReferralData = useCallback((data: Omit<CreateReferralData, 'referrerId'>): boolean => {
    const errors = validateReferralData(data);
    return Object.keys(errors).length === 0;
  }, [validateReferralData]);

  return {
    validateEmail,
    validatePhone,
    validateReferralData,
    isValidReferralData,
  };
};

/**
 * Comprehensive hook that provides all referral operations
 */
export const useReferrals = (userId?: string) => {
  const { user } = useAuthStore();
  const effectiveUserId = userId || user?.id;

  // Get user's referrals
  const userReferralsQuery = useUserReferrals(effectiveUserId);
  
  // Get referral counts for current user
  const referralCountsQuery = useReferralCounts(effectiveUserId);

  // Mutation hooks
  const createGeneralReferral = useCreateGeneralReferral();
  const createGroupReferral = useCreateGroupReferral();
  const createReferral = useCreateReferral();
  const createBatchReferrals = useCreateBatchReferrals();

  // Validation helpers
  const validation = useReferralValidation();

  // Helper functions
  const getTotalReferrals = useCallback(() => {
    const data = userReferralsQuery.data;
    if (!data) return 0;
    return (data.groupReferrals?.length || 0) + (data.generalReferrals?.length || 0);
  }, [userReferralsQuery.data]);

  const getRecentReferrals = useCallback((limit: number = 5) => {
    const data = userReferralsQuery.data;
    if (!data) return [];

    const allReferrals = [
      ...(data.groupReferrals || []).map(r => ({ ...r, type: 'group' as const })),
      ...(data.generalReferrals || []).map(r => ({ ...r, type: 'general' as const })),
    ];

    return allReferrals
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }, [userReferralsQuery.data]);

  const hasReferrals = useCallback(() => {
    return getTotalReferrals() > 0;
  }, [getTotalReferrals]);

  // Enhanced analytics
  const referralAnalytics = useMemo(() => {
    const data = userReferralsQuery.data;
    const counts = referralCountsQuery.data;
    
    if (!data || !counts) return null;

    return {
      totalReferrals: counts.totalReferrals,
      groupReferrals: counts.groupReferrals,
      generalReferrals: counts.generalReferrals,
      recentActivity: getRecentReferrals(10),
      hasActivity: hasReferrals(),
    };
  }, [userReferralsQuery.data, referralCountsQuery.data, getRecentReferrals, hasReferrals]);

  // Success handlers with user feedback and validation
  const createGeneralReferralWithFeedback = useCallback(
    async (data: Omit<CreateReferralData, 'referrerId'>) => {
      // Validate data first
      const validationErrors = validation.validateReferralData(data);
      if (Object.keys(validationErrors).length > 0) {
        return {
          success: false,
          message: 'Please fix the validation errors',
          validationErrors,
        };
      }

      try {
        const result = await createGeneralReferral.mutateAsync(data);
        return {
          success: true,
          message: 'General referral created successfully! They will receive an email to set up their account.',
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create referral',
          error,
        };
      }
    },
    [createGeneralReferral, validation]
  );

  const createGroupReferralWithFeedback = useCallback(
    async (data: Omit<CreateReferralData, 'referrerId'>) => {
      // Validate data first
      const validationErrors = validation.validateReferralData(data);
      if (Object.keys(validationErrors).length > 0) {
        return {
          success: false,
          message: 'Please fix the validation errors',
          validationErrors,
        };
      }

      try {
        const result = await createGroupReferral.mutateAsync(data);
        return {
          success: true,
          message: 'Group referral created successfully! They will receive an email to set up their account.',
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create group referral',
          error,
        };
      }
    },
    [createGroupReferral, validation]
  );

  const createReferralWithFeedback = useCallback(
    async (data: Omit<CreateReferralData, 'referrerId'>) => {
      // Validate data first
      const validationErrors = validation.validateReferralData(data);
      if (Object.keys(validationErrors).length > 0) {
        return {
          success: false,
          message: 'Please fix the validation errors',
          validationErrors,
        };
      }

      try {
        const result = await createReferral.mutateAsync(data);
        const referralType = data.groupId ? 'group' : 'general';
        return {
          success: true,
          message: `${referralType === 'group' ? 'Group' : 'General'} referral created successfully! They will receive an email to set up their account.`,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create referral',
          error,
        };
      }
    },
    [createReferral, validation]
  );

  const createBatchReferralsWithFeedback = useCallback(
    async (referrals: Omit<CreateReferralData, 'referrerId'>[]) => {
      // Validate all referrals first
      const allValidationErrors: Array<{ index: number; errors: Record<string, string> }> = [];
      
      referrals.forEach((referral, index) => {
        const validationErrors = validation.validateReferralData(referral);
        if (Object.keys(validationErrors).length > 0) {
          allValidationErrors.push({ index, errors: validationErrors });
        }
      });

      if (allValidationErrors.length > 0) {
        return {
          success: false,
          message: 'Some referrals have validation errors',
          validationErrors: allValidationErrors,
        };
      }

      try {
        const result = await createBatchReferrals.mutateAsync(referrals);
        return {
          success: true,
          message: `Batch referral completed! ${result?.successful || 0} successful, ${result?.failed || 0} failed.`,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create batch referrals',
          error,
        };
      }
    },
    [createBatchReferrals, validation]
  );

  return {
    // Query data
    referrals: userReferralsQuery.data,
    isLoading: userReferralsQuery.isLoading || referralCountsQuery.isLoading,
    error: userReferralsQuery.error || referralCountsQuery.error,
    isRefetching: userReferralsQuery.isRefetching || referralCountsQuery.isRefetching,
    
    // Analytics data
    analytics: referralAnalytics,
    counts: referralCountsQuery.data,
    
    // Mutation states
    isCreatingGeneral: createGeneralReferral.isPending,
    isCreatingGroup: createGroupReferral.isPending,
    isCreating: createReferral.isPending,
    isCreatingBatch: createBatchReferrals.isPending,
    
    // Mutation errors
    generalReferralError: createGeneralReferral.error,
    groupReferralError: createGroupReferral.error,
    referralError: createReferral.error,
    batchReferralError: createBatchReferrals.error,
    
    // Actions with validation and feedback
    createGeneralReferral: createGeneralReferralWithFeedback,
    createGroupReferral: createGroupReferralWithFeedback,
    createReferral: createReferralWithFeedback,
    createBatchReferrals: createBatchReferralsWithFeedback,
    
    // Raw mutations (for advanced usage)
    createGeneralReferralMutation: createGeneralReferral,
    createGroupReferralMutation: createGroupReferral,
    createReferralMutation: createReferral,
    createBatchReferralsMutation: createBatchReferrals,
    
    // Validation helpers
    validation,
    
    // Helper functions
    getTotalReferrals,
    getRecentReferrals,
    hasReferrals,
    
    // Refetch functions
    refetch: userReferralsQuery.refetch,
    refetchCounts: referralCountsQuery.refetch,
  };
};

/**
 * Hook specifically for group referral operations
 */
export const useGroupReferralOperations = (groupId: string) => {
  const groupReferralsQuery = useGroupReferrals(groupId);
  const createGroupReferral = useCreateGroupReferral();
  const validation = useReferralValidation();

  const createReferralForGroup = useCallback(
    async (data: Omit<CreateReferralData, 'referrerId' | 'groupId'>) => {
      // Validate data first
      const validationErrors = validation.validateReferralData({ ...data, groupId });
      if (Object.keys(validationErrors).length > 0) {
        return {
          success: false,
          message: 'Please fix the validation errors',
          validationErrors,
        };
      }

      try {
        const result = await createGroupReferral.mutateAsync({
          ...data,
          groupId,
        });
        return {
          success: true,
          message: 'Group referral created successfully! They will receive an email to set up their account.',
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create group referral',
          error,
        };
      }
    },
    [createGroupReferral, groupId, validation]
  );

  return {
    // Query data
    referrals: groupReferralsQuery.data,
    isLoading: groupReferralsQuery.isLoading,
    error: groupReferralsQuery.error,
    isRefetching: groupReferralsQuery.isRefetching,
    
    // Mutation state
    isCreating: createGroupReferral.isPending,
    createError: createGroupReferral.error,
    
    // Actions
    createReferral: createReferralForGroup,
    
    // Raw mutation (for advanced usage)
    createReferralMutation: createGroupReferral,
    
    // Validation helpers
    validation,
    
    // Refetch function
    refetch: groupReferralsQuery.refetch,
  };
};