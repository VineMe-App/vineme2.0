import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '../services/groups';
import type { GroupWithDetails, GroupMembership } from '../types/database';
import type { GroupReferralData } from '../services/groups';
import { performanceMonitor } from '../utils/performance';

// Query keys
export const groupKeys = {
  all: ['groups'] as const,
  byChurch: (churchId: string) =>
    [...groupKeys.all, 'byChurch', churchId] as const,
  byId: (groupId: string) => [...groupKeys.all, 'byId', groupId] as const,
  userGroups: (userId: string) =>
    [...groupKeys.all, 'userGroups', userId] as const,
  members: (groupId: string) => [...groupKeys.all, 'members', groupId] as const,
  leaders: (groupId: string) => [...groupKeys.all, 'leaders', groupId] as const,
  friendsInGroup: (groupId: string, userId: string) =>
    [...groupKeys.all, 'friendsInGroup', groupId, userId] as const,
  membership: (groupId: string, userId: string) =>
    [...groupKeys.all, 'membership', groupId, userId] as const,
  search: (query: string, churchId?: string) =>
    [...groupKeys.all, 'search', query, churchId] as const,
};

/**
 * Hook to get groups by church with performance monitoring
 */
export const useGroupsByChurch = (churchId: string | undefined) => {
  return useQuery({
    queryKey: groupKeys.byChurch(churchId || ''),
    queryFn: async () => {
      if (!churchId) throw new Error('Church ID is required');

      const startTime = Date.now();
      const { data, error } = await groupService.getGroupsByChurch(churchId);
      const duration = Date.now() - startTime;

      // Record query performance
      performanceMonitor.recordQueryPerformance(
        `groups_by_church_${churchId}`,
        duration,
        false // This is a fresh fetch, not a cache hit
      );

      if (error) throw error;
      return data;
    },
    enabled: !!churchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    meta: {
      // Add metadata for React Query DevTools
      description: 'Fetch groups by church with performance monitoring',
    },
  });
};

/**
 * Hook to get group by ID
 */
export const useGroup = (groupId: string | undefined) => {
  return useQuery({
    queryKey: groupKeys.byId(groupId || ''),
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID is required');
      const { data, error } = await groupService.getGroupById(groupId);
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to get user's groups
 */
export const useUserGroups = (userId: string | undefined) => {
  return useQuery({
    queryKey: groupKeys.userGroups(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const { data, error } = await groupService.getUserGroups(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get group members
 */
export const useGroupMembers = (groupId: string | undefined) => {
  return useQuery({
    queryKey: groupKeys.members(groupId || ''),
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID is required');
      const { data, error } = await groupService.getGroupMembers(groupId);
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

/**
 * Hook to get group leaders/admins (public)
 */
export const useGroupLeaders = (groupId: string | undefined) => {
  return useQuery({
    queryKey: groupKeys.leaders(groupId || ''),
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID is required');
      const { data, error } = await groupService.getGroupLeaders(groupId);
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
    staleTime: 3 * 60 * 1000,
  });
};

/**
 * Hook to get current user's friends who are in the group
 */
export const useFriendsInGroup = (
  groupId: string | undefined,
  userId: string | undefined
) => {
  return useQuery({
    queryKey: groupKeys.friendsInGroup(groupId || '', userId || ''),
    queryFn: async () => {
      if (!groupId || !userId) throw new Error('Group ID and User ID are required');
      const { data, error } = await groupService.getFriendsInGroup(groupId, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook to check group membership
 */
export const useGroupMembership = (
  groupId: string | undefined,
  userId: string | undefined
) => {
  return useQuery({
    queryKey: groupKeys.membership(groupId || '', userId || ''),
    queryFn: async () => {
      if (!groupId || !userId)
        throw new Error('Group ID and User ID are required');
      const { data, error } = await groupService.isGroupMember(groupId, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to search groups
 */
export const useSearchGroups = (
  query: string,
  churchId?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: groupKeys.search(query, churchId),
    queryFn: async () => {
      const { data, error } = await groupService.searchGroups(query, churchId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to join a group with optimistic updates
 */
export const useJoinGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      role = 'member',
    }: {
      groupId: string;
      userId: string;
      role?: 'member' | 'leader';
    }) => {
      const { data, error } = await groupService.joinGroup(
        groupId,
        userId,
        role
      );
      if (error) throw error;
      return data;
    },
    // Optimistic update
    onMutate: async ({ groupId, userId, role = 'member' }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: groupKeys.membership(groupId, userId),
      });
      await queryClient.cancelQueries({
        queryKey: groupKeys.userGroups(userId),
      });

      // Snapshot previous values
      const previousMembership = queryClient.getQueryData(
        groupKeys.membership(groupId, userId)
      );
      const previousUserGroups = queryClient.getQueryData(
        groupKeys.userGroups(userId)
      );

      // Optimistically update membership
      queryClient.setQueryData(groupKeys.membership(groupId, userId), {
        isMember: true,
        membership: {
          id: `temp-${Date.now()}`,
          group_id: groupId,
          user_id: userId,
          role,
          joined_at: new Date().toISOString(),
        },
      });

      // Optimistically add to user groups if we have that data
      if (previousUserGroups) {
        const group = queryClient.getQueryData(
          groupKeys.byId(groupId)
        ) as GroupWithDetails;
        if (group) {
          queryClient.setQueryData(groupKeys.userGroups(userId), [
            ...(previousUserGroups as GroupWithDetails[]),
            group,
          ]);
        }
      }

      return { previousMembership, previousUserGroups };
    },
    onSuccess: (data, { groupId, userId }) => {
      // Update with real data
      queryClient.setQueryData(groupKeys.membership(groupId, userId), {
        isMember: true,
        membership: data,
      });

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: groupKeys.byId(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.userGroups(userId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) });
    },
    onError: (error, { groupId, userId }, context) => {
      // Revert optimistic updates
      if (context?.previousMembership) {
        queryClient.setQueryData(
          groupKeys.membership(groupId, userId),
          context.previousMembership
        );
      }
      if (context?.previousUserGroups) {
        queryClient.setQueryData(
          groupKeys.userGroups(userId),
          context.previousUserGroups
        );
      }
      console.error('Failed to join group:', error);
    },
  });
};

/**
 * Hook to leave a group with optimistic updates
 */
export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { data, error } = await groupService.leaveGroup(groupId, userId);
      if (error) throw error;
      return data;
    },
    // Optimistic update
    onMutate: async ({ groupId, userId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: groupKeys.membership(groupId, userId),
      });
      await queryClient.cancelQueries({
        queryKey: groupKeys.userGroups(userId),
      });

      // Snapshot previous values
      const previousMembership = queryClient.getQueryData(
        groupKeys.membership(groupId, userId)
      );
      const previousUserGroups = queryClient.getQueryData(
        groupKeys.userGroups(userId)
      );

      // Optimistically update membership
      queryClient.setQueryData(groupKeys.membership(groupId, userId), {
        isMember: false,
        membership: undefined,
      });

      // Optimistically remove from user groups if we have that data
      if (previousUserGroups) {
        queryClient.setQueryData(
          groupKeys.userGroups(userId),
          (previousUserGroups as GroupWithDetails[]).filter(
            (group) => group.id !== groupId
          )
        );
      }

      return { previousMembership, previousUserGroups };
    },
    onSuccess: (data, { groupId, userId }) => {
      // Update with real data
      queryClient.setQueryData(groupKeys.membership(groupId, userId), {
        isMember: false,
        membership: undefined,
      });

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: groupKeys.byId(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.userGroups(userId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) });
    },
    onError: (error, { groupId, userId }, context) => {
      // Revert optimistic updates
      if (context?.previousMembership) {
        queryClient.setQueryData(
          groupKeys.membership(groupId, userId),
          context.previousMembership
        );
      }
      if (context?.previousUserGroups) {
        queryClient.setQueryData(
          groupKeys.userGroups(userId),
          context.previousUserGroups
        );
      }
      console.error('Failed to leave group:', error);
    },
  });
};

/**
 * Hook to send group referral
 */
export const useSendGroupReferral = () => {
  return useMutation({
    mutationFn: async (referralData: GroupReferralData) => {
      const { data, error } =
        await groupService.sendGroupReferral(referralData);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Could show success message or update UI
      console.log('Group referral sent successfully');
    },
    onError: (error) => {
      console.error('Failed to send group referral:', error);
    },
  });
};
