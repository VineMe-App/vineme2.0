import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { joinRequestService } from '../services/joinRequests';
import type {
  GroupJoinRequest,
  GroupJoinRequestWithUser,
  GroupMembership,
} from '../types/database';
import type { CreateJoinRequestData } from '../services/joinRequests';

// Query keys
export const joinRequestKeys = {
  all: ['joinRequests'] as const,
  byGroup: (groupId: string) =>
    [...joinRequestKeys.all, 'byGroup', groupId] as const,
  byUser: (userId: string) =>
    [...joinRequestKeys.all, 'byUser', userId] as const,
  contact: (requestId: string) =>
    [...joinRequestKeys.all, 'contact', requestId] as const,
};

/**
 * Hook to get join requests for a group (for group leaders)
 */
export const useGroupJoinRequests = (
  groupId: string | undefined,
  userId: string | undefined
) => {
  return useQuery({
    queryKey: joinRequestKeys.byGroup(groupId || ''),
    queryFn: async () => {
      if (!groupId || !userId) {
        throw new Error('Group ID and User ID are required');
      }
      const { data, error } = await joinRequestService.getGroupJoinRequests(
        groupId,
        userId
      );
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get join requests for a user
 */
export const useUserJoinRequests = (userId: string | undefined) => {
  return useQuery({
    queryKey: joinRequestKeys.byUser(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const { data, error } =
        await joinRequestService.getUserJoinRequests(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create a join request
 */
export const useCreateJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestData: CreateJoinRequestData) => {
      const { data, error } =
        await joinRequestService.createJoinRequest(requestData);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: joinRequestKeys.byUser(variables.user_id),
      });
      queryClient.invalidateQueries({
        queryKey: joinRequestKeys.byGroup(variables.group_id),
      });

      // Invalidate group data to update pending requests count
      queryClient.invalidateQueries({
        queryKey: ['groups', 'byId', variables.group_id],
      });
    },
    onError: (error) => {
      console.error('Failed to create join request:', error);
    },
  });
};

/**
 * Hook to approve a join request
 */
export const useApproveJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      approverId,
      groupId,
    }: {
      requestId: string;
      approverId: string;
      groupId: string;
    }) => {
      const { data, error } = await joinRequestService.approveJoinRequest(
        requestId,
        approverId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate join requests queries
      queryClient.invalidateQueries({
        queryKey: joinRequestKeys.byGroup(variables.groupId),
      });

      // Invalidate group data to update member count
      queryClient.invalidateQueries({
        queryKey: ['groups', 'byId', variables.groupId],
      });

      // Invalidate group members
      queryClient.invalidateQueries({
        queryKey: ['groups', 'members', variables.groupId],
      });
    },
    onError: (error) => {
      console.error('Failed to approve join request:', error);
    },
  });
};

/**
 * Hook to decline a join request
 */
export const useDeclineJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      declinerId,
      groupId,
    }: {
      requestId: string;
      declinerId: string;
      groupId: string;
    }) => {
      const { data, error } = await joinRequestService.declineJoinRequest(
        requestId,
        declinerId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate join requests queries
      queryClient.invalidateQueries({
        queryKey: joinRequestKeys.byGroup(variables.groupId),
      });

      // Invalidate group data to update pending requests count
      queryClient.invalidateQueries({
        queryKey: ['groups', 'byId', variables.groupId],
      });
    },
    onError: (error) => {
      console.error('Failed to decline join request:', error);
    },
  });
};

/**
 * Hook to cancel a join request (by the requester)
 */
export const useCancelJoinRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      userId,
      groupId,
    }: {
      requestId: string;
      userId: string;
      groupId: string;
    }) => {
      const { data, error } = await joinRequestService.cancelJoinRequest(
        requestId,
        userId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate user's join requests
      queryClient.invalidateQueries({
        queryKey: joinRequestKeys.byUser(variables.userId),
      });

      // Invalidate group join requests
      queryClient.invalidateQueries({
        queryKey: joinRequestKeys.byGroup(variables.groupId),
      });

      // Invalidate group data
      queryClient.invalidateQueries({
        queryKey: ['groups', 'byId', variables.groupId],
      });
    },
    onError: (error) => {
      console.error('Failed to cancel join request:', error);
    },
  });
};

/**
 * Hook to get contact information for approved requests
 */
export const useGetContactInfo = (
  requestId: string | undefined,
  leaderId: string | undefined
) => {
  return useQuery({
    queryKey: joinRequestKeys.contact(requestId || ''),
    queryFn: async () => {
      if (!requestId || !leaderId) {
        throw new Error('Request ID and Leader ID are required');
      }
      const { data, error } = await joinRequestService.getContactInfo(
        requestId,
        leaderId
      );
      if (error) throw error;
      return data;
    },
    enabled: !!requestId && !!leaderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to initiate contact action (call, email, message)
 */
export const useInitiateContactAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      leaderId,
      actionType,
      contactValue,
    }: {
      requestId: string;
      leaderId: string;
      actionType: 'call' | 'email' | 'message';
      contactValue: string;
    }) => {
      const { data, error } = await joinRequestService.initiateContactAction(
        requestId,
        leaderId,
        actionType,
        contactValue
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate contact audit logs
      queryClient.invalidateQueries({
        queryKey: ['contactAudit'],
      });
    },
    onError: (error) => {
      console.error('Failed to initiate contact action:', error);
    },
  });
};
