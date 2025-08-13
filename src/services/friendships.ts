import { supabase } from './supabase';
import { permissionService } from './permissions';
import type { DatabaseFriendship, User } from '../types/database';

export interface FriendshipWithUser extends DatabaseFriendship {
  friend?: Partial<User>;
  user?: Partial<User>;
}

export interface FriendshipServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

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
      const rlsCheck = await permissionService.validateRLSCompliance('friendships', 'insert', { user_id: userId });
      if (!rlsCheck.hasPermission) {
        return { data: null, error: new Error(rlsCheck.reason || 'RLS policy violation') };
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

  /**
   * Block a user
   */
  async blockUser(
    userId: string,
    friendId: string
  ): Promise<FriendshipServiceResponse<DatabaseFriendship>> {
    try {
      // First, check if there's an existing friendship
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        )
        .single();

      if (existing) {
        // Update existing friendship to blocked
        const { data, error } = await supabase
          .from('friendships')
          .update({
            status: 'blocked',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
      } else {
        // Create new blocked friendship
        const { data, error } = await supabase
          .from('friendships')
          .insert({
            user_id: userId,
            friend_id: friendId,
            status: 'blocked',
          })
          .select()
          .single();

        if (error) {
          return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
      }
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to block user'),
      };
    }
  }

  /**
   * Remove/unfriend a user
   */
  async removeFriend(
    userId: string,
    friendId: string
  ): Promise<FriendshipServiceResponse<boolean>> {
    try {
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
          friend:users!friendships_friend_id_fkey(id, name, email, avatar_url, church_id),
          user:users!friendships_user_id_fkey(id, name, email, avatar_url, church_id)
        `
        )
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Transform data to always show the other user as 'friend'
      const transformedData = (data || []).map((friendship) => {
        if (friendship.user_id === userId) {
          return friendship;
        } else {
          // Swap user and friend for consistent display
          return {
            ...friendship,
            friend: friendship.user,
            user: friendship.friend,
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
          friend:users!friendships_friend_id_fkey(id, name, email, avatar_url, church_id)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
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
          user:users!friendships_user_id_fkey(id, name, email, avatar_url, church_id)
        `
        )
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
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
  ): Promise<FriendshipServiceResponse<FriendshipStatus | null>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('status')
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        )
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found"
        return { data: null, error: new Error(error.message) };
      }

      return { data: data?.status || null, error: null };
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
          friend:users!friendships_friend_id_fkey(id, name, email, avatar_url, church_id),
          user:users!friendships_user_id_fkey(id, name, email, avatar_url, church_id)
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
      const transformedData = (data || []).map((friendship) => {
        if (friendship.user_id === userId) {
          return friendship;
        } else {
          // Swap user and friend for consistent display
          return {
            ...friendship,
            friend: friendship.user,
            user: friendship.friend,
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
