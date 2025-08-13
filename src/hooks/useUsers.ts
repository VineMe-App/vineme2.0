import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/users';
import type { UpdateUserProfileData } from '../services/users';
import type { UserWithDetails, DatabaseUser } from '../types/database';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  profile: (userId: string) => [...userKeys.all, 'profile', userId] as const,
  groupMemberships: (userId: string) =>
    [...userKeys.all, 'groupMemberships', userId] as const,
  friendships: (userId: string) =>
    [...userKeys.all, 'friendships', userId] as const,
  search: (query: string) => [...userKeys.all, 'search', query] as const,
};

/**
 * Hook to get user profile with related data
 */
export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: userKeys.profile(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const { data, error } = await userService.getUserProfile(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to get user's group memberships
 */
export const useUserGroupMemberships = (userId: string | undefined) => {
  return useQuery({
    queryKey: userKeys.groupMemberships(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const { data, error } = await userService.getUserGroupMemberships(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get user's friendships
 */
export const useUserFriendships = (userId: string | undefined) => {
  return useQuery({
    queryKey: userKeys.friendships(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const { data, error } = await userService.getUserFriendships(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to search users
 */
export const useSearchUsers = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: userKeys.search(query),
    queryFn: async () => {
      const { data, error } = await userService.searchUsers(query);
      if (error) throw error;
      return data;
    },
    enabled: enabled && query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to update user profile
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: UpdateUserProfileData;
    }) => {
      const { data, error } = await userService.updateUserProfile(
        userId,
        updates
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, { userId }) => {
      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });

      // Update the cache with new data
      queryClient.setQueryData(
        userKeys.profile(userId),
        (oldData: UserWithDetails | undefined) => {
          if (!oldData || !data) return oldData;
          return { ...oldData, ...data };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to update user profile:', error);
    },
  });
};

/**
 * Hook to upload avatar
 */
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      file,
    }: {
      userId: string;
      file: File | Blob;
    }) => {
      const { data: avatarUrl, error } = await userService.uploadAvatar(
        userId,
        file
      );
      if (error) throw error;

      // Update user profile with new avatar URL
      const { data: updatedProfile, error: updateError } =
        await userService.updateUserProfile(userId, {
          avatar_url: avatarUrl,
        });
      if (updateError) throw updateError;

      return { avatarUrl, updatedProfile };
    },
    onSuccess: ({ updatedProfile }, { userId }) => {
      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });

      // Update the cache with new data
      if (updatedProfile) {
        queryClient.setQueryData(
          userKeys.profile(userId),
          (oldData: UserWithDetails | undefined) => {
            if (!oldData) return oldData;
            return { ...oldData, ...updatedProfile };
          }
        );
      }
    },
    onError: (error) => {
      console.error('Failed to upload avatar:', error);
    },
  });
};

/**
 * Hook to delete avatar
 */
export const useDeleteAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      avatarUrl,
    }: {
      userId: string;
      avatarUrl: string;
    }) => {
      // Delete from storage
      const { error: deleteError } = await userService.deleteAvatar(avatarUrl);
      if (deleteError) throw deleteError;

      // Update user profile to remove avatar URL
      const { data: updatedProfile, error: updateError } =
        await userService.updateUserProfile(userId, {
          avatar_url: null,
        });
      if (updateError) throw updateError;

      return updatedProfile;
    },
    onSuccess: (updatedProfile, { userId }) => {
      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });

      // Update the cache with new data
      if (updatedProfile) {
        queryClient.setQueryData(
          userKeys.profile(userId),
          (oldData: UserWithDetails | undefined) => {
            if (!oldData) return oldData;
            return { ...oldData, ...updatedProfile };
          }
        );
      }
    },
    onError: (error) => {
      console.error('Failed to delete avatar:', error);
    },
  });
};

/**
 * Hook to delete account
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await userService.deleteAccount(userId);
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      // Clear cached user data on delete attempts
      queryClient.clear();
    },
  });
};
