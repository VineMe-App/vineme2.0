import { supabase } from './supabase';
import { permissionService } from './permissions';
import type { DatabaseUser, UserWithDetails } from '../types/database';
import { getFullName } from '../utils/name';

// Conditionally import FileSystem - not available in Expo Go
// Using try-catch to gracefully handle when the module isn't available
let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system');
} catch (error) {
  // FileSystem not available (likely Expo Go) - will be handled at runtime
  console.log(
    '[UserService] expo-file-system not available - some features will be disabled'
  );
}

export interface UpdateUserProfileData {
  first_name?: string;
  last_name?: string;
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
            friend:users!friendships_friend_id_fkey(id, first_name, last_name, avatar_url)
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
   * Delete user account and all related data
   * Uses RPC function to properly cascade deletion across all tables
   */
  async deleteAccount(userId: string): Promise<UserServiceResponse<boolean>> {
    try {
      // Verify the user is deleting their own account
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id || session.session.user.id !== userId) {
        return {
          data: null,
          error: new Error('You can only delete your own account'),
        };
      }

      // Call the RPC function to delete all user data
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_my_account');
      
      if (rpcError) {
        // Check if error is due to being sole leader
        if (rpcError.message?.includes('SOLE_LEADER:')) {
          // Extract the message after the prefix
          const message = rpcError.message.replace('SOLE_LEADER: ', '');
          return { 
            data: null, 
            error: new Error(message)
          };
        }
        return { data: null, error: new Error(rpcError.message) };
      }
      
      // Check if the RPC call was successful
      if (rpcData && rpcData.success) {
        return { data: true, error: null };
      } else {
        return { data: null, error: new Error('Account deletion failed') };
      }
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

      const payload: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .update(payload)
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
    fileUri: string
  ): Promise<UserServiceResponse<string>> {
    try {
      // Check if FileSystem is available (not in Expo Go)
      if (!FileSystem) {
        console.warn(
          '[uploadAvatar] FileSystem not available - running in Expo Go'
        );
        return {
          data: null,
          error: new Error(
            'Avatar upload requires a development build. This feature is not available in Expo Go.'
          ),
        };
      }

      console.log('[uploadAvatar] Starting upload for user:', userId);
      console.log('[uploadAvatar] File URI:', fileUri);

      // Get file info and verify it exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
      if (!fileInfo.exists) {
        console.error('[uploadAvatar] File does not exist');
        return {
          data: null,
          error: new Error('Selected image could not be accessed'),
        };
      }

      console.log('[uploadAvatar] File exists, size:', fileInfo.size);

      // Determine file extension
      const fileExt = this.inferFileExtension(fileUri, 'jpg');
      const contentType = this.inferContentType(fileExt);
      const fileName = `avatar.${fileExt}`;

      console.log(
        '[uploadAvatar] File extension:',
        fileExt,
        'Content-Type:',
        contentType
      );

      // Path must be {userId}/filename for RLS policy to work
      const filePath = `${userId}/${fileName}`;

      // Delete all existing avatar files for this user to prevent duplicates
      // This handles cases where user uploads different file types (jpg, png, etc.)
      console.log('[uploadAvatar] Checking for existing avatars to delete');
      const { data: existingFiles } = await supabase.storage
        .from('profile-images')
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(
          (file) => `${userId}/${file.name}`
        );
        console.log('[uploadAvatar] Deleting existing files:', filesToDelete);
        const { error: deleteError } = await supabase.storage
          .from('profile-images')
          .remove(filesToDelete);

        if (deleteError) {
          console.warn('[uploadAvatar] Error deleting old files:', deleteError);
          // Continue anyway - this is not critical
        } else {
          console.log('[uploadAvatar] Successfully deleted old avatar files');
        }
      }

      // Read file as base64 and convert to Uint8Array for upload
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileBytes = this.base64ToUint8Array(base64);

      console.log(
        '[uploadAvatar] File read successfully, size:',
        fileBytes.length,
        'bytes'
      );
      console.log('[uploadAvatar] Uploading to path:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, fileBytes, {
          contentType,
          upsert: false, // No need for upsert since we deleted old files
        });

      if (uploadError) {
        console.error('[uploadAvatar] Upload error:', uploadError);
        return { data: null, error: new Error(uploadError.message) };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('profile-images').getPublicUrl(filePath);

      console.log('[uploadAvatar] Upload successful, URL:', publicUrl);
      return { data: publicUrl, error: null };
    } catch (error) {
      console.error('[uploadAvatar] Unexpected error:', error);
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to upload avatar'),
      };
    }
  }

  private inferFileExtension(uri: string, fallback: string = 'jpg'): string {
    const cleaned = uri.split('?')[0];
    const parts = cleaned.split('.');
    if (parts.length > 1) {
      return parts.pop() || fallback;
    }
    return fallback;
  }

  private inferContentType(ext: string): string {
    switch (ext.toLowerCase()) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'heic':
      case 'heif':
        return 'image/heic';
      case 'jpeg':
      case 'jpg':
      default:
        return 'image/jpeg';
    }
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const BASE64_CHARS =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const sanitized = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    const paddingMatch = sanitized.match(/=+$/);
    const paddingLength = paddingMatch ? paddingMatch[0].length : 0;
    const byteLength = Math.floor((sanitized.length * 3) / 4) - paddingLength;
    const bytes = new Uint8Array(byteLength);

    let byteIndex = 0;
    for (let i = 0; i < sanitized.length; i += 4) {
      const enc1 = BASE64_CHARS.indexOf(sanitized[i]);
      const enc2 = BASE64_CHARS.indexOf(sanitized[i + 1]);
      const enc3 = BASE64_CHARS.indexOf(sanitized[i + 2]);
      const enc4 = BASE64_CHARS.indexOf(sanitized[i + 3]);

      const chunk =
        (enc1 << 18) | (enc2 << 12) | ((enc3 & 63) << 6) | (enc4 & 63);

      if (byteIndex < byteLength) {
        bytes[byteIndex++] = (chunk >> 16) & 0xff;
      }
      if (enc3 !== 64 && byteIndex < byteLength) {
        bytes[byteIndex++] = (chunk >> 8) & 0xff;
      }
      if (enc4 !== 64 && byteIndex < byteLength) {
        bytes[byteIndex++] = chunk & 0xff;
      }
    }

    return bytes;
  }

  /**
   * Delete avatar from storage
   */
  async deleteAvatar(avatarUrl: string): Promise<UserServiceResponse<boolean>> {
    try {
      // Extract file path from URL
      // URL format: https://.../storage/v1/object/public/profile-images/{userId}/avatar.jpg
      const urlParts = avatarUrl.split(
        '/storage/v1/object/public/profile-images/'
      );
      if (urlParts.length < 2) {
        return { data: null, error: new Error('Invalid avatar URL format') };
      }
      const filePathWithQuery = urlParts[1];
      const filePath = filePathWithQuery.split('?')[0];

      if (!filePath) {
        return { data: null, error: new Error('Invalid avatar URL format') };
      }

      const { error } = await supabase.storage
        .from('profile-images')
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
        // Only show active memberships in "My Groups"
        .eq('status', 'active')
        // Ensure related group is visible/valid and not closed
        .in('group.status', ['approved', 'pending']);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Filter any rows where group is null due to RLS
      const safe = (data || []).filter((m: any) => !!m.group);
      return { data: safe, error: null };
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
          friend:users!friendships_friend_id_fkey(id, first_name, last_name, avatar_url)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const friendshipsWithNames = (data || []).map((friendship) => ({
        ...friendship,
        friend: friendship.friend
          ? { ...friendship.friend, name: getFullName(friendship.friend) }
          : friendship.friend,
      }));

      return { data: friendshipsWithNames, error: null };
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
   * Search users by name (email removed from public.users)
   */
  async searchUsers(
    query: string,
    limit: number = 10
  ): Promise<UserServiceResponse<Partial<DatabaseUser>[]>> {
    try {
      const sanitizedQuery = query.trim().replace(/[,%]/g, '');
      if (!sanitizedQuery) {
        return { data: [], error: null };
      }
      const pattern = `%${sanitizedQuery}%`;
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url, church_id')
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(limit);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const results = (data || []).map((user) => ({
        ...user,
        name: getFullName(user),
      }));

      return { data: results, error: null };
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
