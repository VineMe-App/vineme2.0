import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  friendshipService,
  type FriendshipWithUser,
  type FriendshipStatus,
  type FriendshipStatusDetails,
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

  return useQuery<FriendshipStatusDetails | null>({
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
 * Hook to send friend request with optimistic updates
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
    // Optimistic update
    onMutate: async (friendId: string) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: friendshipKeys.sentRequests(user.id),
      });
      await queryClient.cancelQueries({
        queryKey: friendshipKeys.status(user.id, friendId),
      });

      // Snapshot previous values
      const previousSentRequests = queryClient.getQueryData(
        friendshipKeys.sentRequests(user.id)
      );
      const previousStatus = queryClient.getQueryData(
        friendshipKeys.status(user.id, friendId)
      );

      // Optimistically add to sent requests
      const optimisticRequest: FriendshipWithUser = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        friend: {
          id: friendId,
          name: 'Loading...',
          email: '',
          avatar_url: null,
        },
      };

      if (previousSentRequests) {
        queryClient.setQueryData(friendshipKeys.sentRequests(user.id), [
          ...(previousSentRequests as FriendshipWithUser[]),
          optimisticRequest,
        ]);
      }

      // Update status
      queryClient.setQueryData(friendshipKeys.status(user.id, friendId), {
        status: 'pending',
        friendship: optimisticRequest,
      });

      return { previousSentRequests, previousStatus };
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate to get fresh data
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.sentRequests(user.id),
        });
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      }
    },
    onError: (error, friendId, context) => {
      if (!user?.id) return;

      // Revert optimistic updates
      if (context?.previousSentRequests) {
        queryClient.setQueryData(
          friendshipKeys.sentRequests(user.id),
          context.previousSentRequests
        );
      }
      if (context?.previousStatus) {
        queryClient.setQueryData(
          friendshipKeys.status(user.id, friendId),
          context.previousStatus
        );
      }
    },
  });
}

/**
 * Hook to accept friend request with optimistic updates
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
    // Optimistic update
    onMutate: async (friendshipId: string) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: friendshipKeys.friends(user.id),
      });
      await queryClient.cancelQueries({
        queryKey: friendshipKeys.receivedRequests(user.id),
      });

      // Snapshot previous values
      const previousFriends = queryClient.getQueryData(
        friendshipKeys.friends(user.id)
      );
      const previousReceivedRequests = queryClient.getQueryData(
        friendshipKeys.receivedRequests(user.id)
      );

      // Find the request being accepted
      const receivedRequests =
        (previousReceivedRequests as FriendshipWithUser[]) || [];
      const acceptedRequest = receivedRequests.find(
        (req) => req.id === friendshipId
      );

      if (acceptedRequest) {
        // Move from received requests to friends
        const updatedFriendship = {
          ...acceptedRequest,
          status: 'accepted' as const,
        };

        queryClient.setQueryData(friendshipKeys.friends(user.id), [
          ...((previousFriends as FriendshipWithUser[]) || []),
          updatedFriendship,
        ]);

        queryClient.setQueryData(
          friendshipKeys.receivedRequests(user.id),
          receivedRequests.filter((req) => req.id !== friendshipId)
        );
      }

      return { previousFriends, previousReceivedRequests };
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate to get fresh data
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.friends(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.receivedRequests(user.id),
        });
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
      }
    },
    onError: (error, friendshipId, context) => {
      if (!user?.id) return;

      // Revert optimistic updates
      if (context?.previousFriends) {
        queryClient.setQueryData(
          friendshipKeys.friends(user.id),
          context.previousFriends
        );
      }
      if (context?.previousReceivedRequests) {
        queryClient.setQueryData(
          friendshipKeys.receivedRequests(user.id),
          context.previousReceivedRequests
        );
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

// Block user hook removed per product decision

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
 * Hook to accept a previously rejected incoming friend request
 */
export function useAcceptRejectedFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (senderId: string) => {
      if (!user?.id) throw new Error('User must be authenticated');
      const result = await friendshipService.acceptRejectedFriendRequest(
        user.id,
        senderId
      );
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_data, senderId) => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
        queryClient.invalidateQueries({ queryKey: friendshipKeys.friends(user.id) });
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.status(user.id, senderId),
        });
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.receivedRequests(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: friendshipKeys.sentRequests(user.id),
        });
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
