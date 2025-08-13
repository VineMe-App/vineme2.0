import { supabase } from './supabase';
import { permissionService } from './permissions';
import type { DatabaseUser, UserWithDetails } from '../types/database';

export interface UpdateUserProfileData {
  name?: string;
  avatar_url?: string | null;
  church_id?: string;
  service_id?: string;
}

export interface UserServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export class UserService {
  /**
   * Get user profile by ID with related data
   */
  async getUserProfile(
    userId: string
  ): Promise<UserServiceResponse<UserWithDetails>> {
    try {
      // Explicitly disambiguate friendships relation alias to avoid ambiguous embedding
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          *,
          church:churches(*),
          service:services(*),
          group_memberships:group_memberships(
            *,
            group:groups(
              *,
              service:services(*),
              church:churches!groups_church_id_fkey(id, name)
            )
          ),
          friendships:friendships!friendships_user_id_fkey(
            id, user_id, friend_id, status, created_at, updated_at,
            friend:users!friendships_friend_id_fkey(id, name, avatar_url)
          )
        `
        )
        .eq('id', userId)
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
            : new Error('Failed to get user profile'),
      };
    }
  }

  /**
   * Delete user account (soft delete recommended). This implementation
   * removes the row from 'users' and signs out; ensure RLS and cascades as needed.
   */
  async deleteAccount(userId: string): Promise<UserServiceResponse<boolean>> {
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) {
        return { data: null, error: new Error(error.message) };
      }
      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to delete account'),
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: UpdateUserProfileData
  ): Promise<UserServiceResponse<DatabaseUser>> {
    try {
      // Check permission to modify user resource
      const permissionCheck = await permissionService.canModifyResource(
        'user',
        userId,
        userId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to modify user profile'
          ),
        };
      }

      // Validate RLS compliance
      const rlsCheck = await permissionService.validateRLSCompliance(
        'users',
        'update',
        { id: userId }
      );
      if (!rlsCheck.hasPermission) {
        return {
          data: null,
          error: new Error(rlsCheck.reason || 'RLS policy violation'),
        };
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
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
            : new Error('Failed to update user profile'),
      };
    }
  }

  /**
   * Upload avatar image to Supabase storage
   */
  async uploadAvatar(
    userId: string,
    file: File | Blob
  ): Promise<UserServiceResponse<string>> {
    try {
      const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file);

      if (uploadError) {
        return { data: null, error: new Error(uploadError.message) };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('user-avatars').getPublicUrl(filePath);

      return { data: publicUrl, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to upload avatar'),
      };
    }
  }

  /**
   * Delete avatar from storage
   */
  async deleteAvatar(avatarUrl: string): Promise<UserServiceResponse<boolean>> {
    try {
      // Extract file path from URL
      const urlParts = avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `avatars/${fileName}`;

      const { error } = await supabase.storage
        .from('user-avatars')
        .remove([filePath]);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to delete avatar'),
      };
    }
  }

  /**
   * Get user's group memberships
   */
  async getUserGroupMemberships(
    userId: string
  ): Promise<UserServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          *,
          group:groups(
            *,
            service:services(*),
            church:churches(*)
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'active');

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
            : new Error('Failed to get group memberships'),
      };
    }
  }

  /**
   * Get user's friendships
   */
  async getUserFriendships(
    userId: string
  ): Promise<UserServiceResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(
          `
          *,
          friend:users!friendships_friend_id_fkey(id, name, avatar_url, email)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'accepted');

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
            : new Error('Failed to get friendships'),
      };
    }
  }

  /**
   * Search users by name or email
   */
  async searchUsers(
    query: string,
    limit: number = 10
  ): Promise<UserServiceResponse<Partial<DatabaseUser>[]>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, church_id')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to search users'),
      };
    }
  }
}

// Export singleton instance
export const userService = new UserService();
