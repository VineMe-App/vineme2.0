import { supabase } from './supabase';
import { permissionService } from './permissions';
import type { DatabaseFriendship, User } from '../types/database';
import {
  triggerFriendRequestNotification,
  triggerFriendRequestAcceptedNotification,
} from './notifications';
import { getFullName } from '../utils/name';

export interface FriendshipWithUser extends DatabaseFriendship {
  friend?: Partial<User>;
  user?: Partial<User>;
}

export interface FriendshipServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export type FriendshipDirection = 'incoming' | 'outgoing';

export interface FriendshipStatusDetails {
  status: FriendshipStatus;
  direction: FriendshipDirection;
  friendshipId: string;
  userId: string;
  friendId: string;
}

const withDisplayName = <T extends Partial<User> | null | undefined>(
  user: T
) =>
  user
    ? {
        ...user,
        name: getFullName(user),
      }
    : user;

export class FriendshipService {
  /**
   * Send a friend request
   */
  async sendFriendRequest(
    userId: string,
    friendId: string
  ): Promise<FriendshipServiceResponse<DatabaseFriendship>> {
    try {
      // Validate RLS compliance for friendship creation
      const rlsCheck = await permissionService.validateRLSCompliance(
        'friendships',
        'insert',
        { user_id: userId }
      );
      if (!rlsCheck.hasPermission) {
        return {
          data: null,
          error: new Error(rlsCheck.reason || 'RLS policy violation'),
        };
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        )
        .single();

      if (existing) {
        return {
          data: null,
          error: new Error('Friendship request already exists'),
        };
      }

      const { data, error } = await supabase
        .from('friendships')
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }
      // Fire enhanced notification to recipient
      try {
        const { data: fromUser } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        const fromUserName = getFullName(fromUser) || 'A friend';
        if (fromUserName) {
          await triggerFriendRequestNotification({
            fromUserId: userId,
            toUserId: friendId,
            fromUserName,
          });
        }
      } catch (e) {
        if (__DEV__) console.warn('Friend request notification failed', e);
      }
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to send friend request'),
      };
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(
    friendshipId: string,
    userId: string
  ): Promise<FriendshipServiceResponse<DatabaseFriendship>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', friendshipId)
        .eq('friend_id', userId) // Only the recipient can accept
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }
      // Notify the original requester that their request was accepted
      try {
        // data.user_id is the requester; userId is the accepter
        const { data: acceptor } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        const acceptorName = getFullName(acceptor) || 'A friend';
        if (acceptorName) {
          await triggerFriendRequestAcceptedNotification({
            originalRequesterId: data.user_id,
            acceptedByUserId: userId,
            acceptedByUserName: acceptorName,
          });
        }
      } catch (e) {
        if (__DEV__)
          console.warn('Friend request accepted notification failed', e);
      }
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to accept friend request'),
      };
    }
  }

  /**
   * Accept a previously rejected incoming friend request
   * recipientId: the current user (was friend_id)
   * senderId: the original requester (was user_id)
   */
  async acceptRejectedFriendRequest(
    recipientId: string,
    senderId: string
  ): Promise<FriendshipServiceResponse<DatabaseFriendship>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', senderId)
        .eq('friend_id', recipientId)
        .eq('status', 'rejected')
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to accept rejected request'),
      };
    }
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(
    friendshipId: string,
    userId: string
  ): Promise<FriendshipServiceResponse<DatabaseFriendship>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', friendshipId)
        .eq('friend_id', userId) // Only the recipient can reject
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to reject friend request'),
      };
    }
  }

  // blockUser removed per product decision

  /**
   * Remove/unfriend a user: delete any existing friendship row in either direction
   */
  async removeFriend(
    userId: string,
    friendId: string
  ): Promise<FriendshipServiceResponse<boolean>> {
    try {
      // Delete rows in both possible directions
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        );

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to remove friend'),
      };
    }
  }

  /**
   * Get user's friends (accepted friendships)
   */
  async getFriends(
    userId: string
  ): Promise<FriendshipServiceResponse<FriendshipWithUser[]>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(
          `
          *,
          friend:users!friendships_friend_id_fkey(id, first_name, last_name, avatar_url, church_id),
          user:users!friendships_user_id_fkey(id, first_name, last_name, avatar_url, church_id)
        `
        )
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Transform data to always show the other user as 'friend'
      // Filter out friendships where either user has been deleted (null)
      const transformedData = (data || [])
        .filter((friendship) => {
          // Filter out friendships where the friend or user is null (deleted)
          if (friendship.user_id === userId) {
            return friendship.friend !== null;
          } else {
            return friendship.user !== null;
          }
        })
        .map((friendship) => {
          const normalized = {
            ...friendship,
            friend: withDisplayName(friendship.friend),
            user: withDisplayName(friendship.user),
          } as FriendshipWithUser;
          if (friendship.user_id === userId) {
            return normalized;
          } else {
            // Swap user and friend for consistent display
            return {
              ...normalized,
              friend: normalized.user,
              user: normalized.friend,
            };
          }
        });

      return { data: transformedData, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to get friends'),
      };
    }
  }

  /**
   * Get pending friend requests sent by user
   */
  async getSentFriendRequests(
    userId: string
  ): Promise<FriendshipServiceResponse<FriendshipWithUser[]>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(
          `
          *,
          friend:users!friendships_friend_id_fkey(id, first_name, last_name, avatar_url, church_id)
        `
        )
        .eq('user_id', userId)
        .in('status', ['pending', 'rejected']);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Filter out friendships where the friend has been deleted (null)
      const normalized = (data || [])
        .filter((friendship) => friendship.friend !== null)
        .map((friendship) => ({
          ...friendship,
          friend: withDisplayName(friendship.friend),
        }));

      return { data: normalized, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get sent friend requests'),
      };
    }
  }

  /**
   * Get pending friend requests received by user
   */
  async getReceivedFriendRequests(
    userId: string
  ): Promise<FriendshipServiceResponse<FriendshipWithUser[]>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(
          `
          *,
          user:users!friendships_user_id_fkey(id, first_name, last_name, avatar_url, church_id)
        `
        )
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Filter out friendships where the user has been deleted (null)
      const normalized = (data || [])
        .filter((friendship) => friendship.user !== null)
        .map((friendship) => ({
          ...friendship,
          user: withDisplayName(friendship.user),
        }));

      return { data: normalized, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get received friend requests'),
      };
    }
  }

  /**
   * Get friendship status between two users
   */
  async getFriendshipStatus(
    userId: string,
    friendId: string
  ): Promise<FriendshipServiceResponse<FriendshipStatusDetails | null>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        )
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found"
        return { data: null, error: new Error(error.message) };
      }

      if (!data) {
        return { data: null, error: null };
      }

      const direction: FriendshipDirection = data.user_id === userId ? 'outgoing' : 'incoming';

      return {
        data: {
          status: data.status as FriendshipStatus,
          direction,
          friendshipId: data.id,
          userId: data.user_id,
          friendId: data.friend_id,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get friendship status'),
      };
    }
  }

  /**
   * Get all friendships with filtering by status
   */
  async getFriendshipsByStatus(
    userId: string,
    status?: FriendshipStatus
  ): Promise<FriendshipServiceResponse<FriendshipWithUser[]>> {
    try {
      let query = supabase
        .from('friendships')
        .select(
          `
          *,
          friend:users!friendships_friend_id_fkey(id, first_name, last_name, avatar_url, church_id),
          user:users!friendships_user_id_fkey(id, first_name, last_name, avatar_url, church_id)
        `
        )
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Transform data to always show the other user as 'friend'
      // Filter out friendships where either user has been deleted (null)
      const transformedData = (data || [])
        .filter((friendship) => {
          // Filter out friendships where the friend or user is null (deleted)
          if (friendship.user_id === userId) {
            return friendship.friend !== null;
          } else {
            return friendship.user !== null;
          }
        })
        .map((friendship) => {
          const normalized = {
            ...friendship,
            friend: withDisplayName(friendship.friend),
            user: withDisplayName(friendship.user),
          } as FriendshipWithUser;
          if (friendship.user_id === userId) {
            return normalized;
          } else {
            // Swap user and friend for consistent display
            return {
              ...normalized,
              friend: normalized.user,
              user: normalized.friend,
            };
          }
        });

      return { data: transformedData, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get friendships by status'),
      };
    }
  }
}

// Export singleton instance
export const friendshipService = new FriendshipService();
