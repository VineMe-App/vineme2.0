import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  friendshipService,
  type FriendshipWithUser,
  type FriendshipStatus,
} from '../services/friendships';
import { useAuth } from './useAuth';

// Query keys
export const friendshipKeys = {
  all: ['friendships'] as const,
  friends: (userId: string) =>
    [...friendshipKeys.all, 'friends', userId] as const,
  sentRequests: (userId: string) =>
    [...friendshipKeys.all, 'sent', userId] as const,
  receivedRequests: (userId: string) =>
    [...friendshipKeys.all, 'received', userId] as const,
  status: (userId: string, friendId: string) =>
    [...friendshipKeys.all, 'status', userId, friendId] as const,
  byStatus: (userId: string, status?: FriendshipStatus) =>
    [...friendshipKeys.all, 'byStatus', userId, status] as const,
};

/**
 * Hook to get user's friends (accepted friendships)
 */
export function useFriends(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: friendshipKeys.friends(targetUserId || ''),
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required');
      const result = await friendshipService.getFriends(targetUserId);
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!targetUserId,
  });
}

/**
 * Hook to get sent friend requests
 */
export function useSentFriendRequests(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: friendshipKeys.sentRequests(targetUserId || ''),
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required');
      const result =
        await friendshipService.getSentFriendRequests(targetUserId);
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!targetUserId,
  });
}

/**
 * Hook to get received friend requests
 */
export function useReceivedFriendRequests(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: friendshipKeys.receivedRequests(targetUserId || ''),
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required');
      const result =
        await friendshipService.getReceivedFriendRequests(targetUserId);
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!targetUserId,
  });
}

/**
 * Hook to get friendship status between two users
 */
export function useFriendshipStatus(friendId: string, userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: friendshipKeys.status(targetUserId || '', friendId),
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required');
      const result = await friendshipService.getFriendshipStatus(
        targetUserId,
        friendId
      );
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!targetUserId && !!friendId,
  });
}

/**
 * Hook to get friendships by status
 */
export function useFriendshipsByStatus(
  status?: FriendshipStatus,
  userId?: string
) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: friendshipKeys.byStatus(targetUserId || '', status),
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required');
      const result = await friendshipService.getFriendshipsByStatus(
        targetUserId,
        status
      );
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!targetUserId,
  });
}

/**
 * Hook to send friend request
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('User must be authenticated');
      const result = await friendshipService.sendFriendRequest(
        user.id,
        friendId
      );
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate sent requests and friendship status queries
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.sentRequests(user.id),
        });
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      }
    },
  });
}

/**
 * Hook to accept friend request
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!user?.id) throw new Error('User must be authenticated');
      const result = await friendshipService.acceptFriendRequest(
        friendshipId,
        user.id
      );
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate all friendship-related queries
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.friends(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.receivedRequests(user.id),
        });
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      }
    },
  });
}

/**
 * Hook to reject friend request
 */
export function useRejectFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!user?.id) throw new Error('User must be authenticated');
      const result = await friendshipService.rejectFriendRequest(
        friendshipId,
        user.id
      );
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate received requests and related queries
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.receivedRequests(user.id),
        });
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      }
    },
  });
}

/**
 * Hook to block user
 */
export function useBlockUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('User must be authenticated');
      const result = await friendshipService.blockUser(user.id, friendId);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate all friendship-related queries
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      }
    },
  });
}

/**
 * Hook to remove/unfriend user
 */
export function useRemoveFriend() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('User must be authenticated');
      const result = await friendshipService.removeFriend(user.id, friendId);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate all friendship-related queries
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.friends(user.id),
        });
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      }
    },
  });
}

/**
 * Combined hook for all friendship data
 */
export function useFriendshipData(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const friends = useFriends(targetUserId);
  const sentRequests = useSentFriendRequests(targetUserId);
  const receivedRequests = useReceivedFriendRequests(targetUserId);

  return {
    friends,
    sentRequests,
    receivedRequests,
    isLoading:
      friends.isLoading || sentRequests.isLoading || receivedRequests.isLoading,
    error: friends.error || sentRequests.error || receivedRequests.error,
  };
}
