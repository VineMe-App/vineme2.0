import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactAuditService } from '../services/contactAudit';
import type {
  ContactAuditLogWithDetails,
  ContactPrivacySettings,
  UpdatePrivacySettingsData,
} from '../types/database';

// Query keys
export const contactAuditKeys = {
  all: ['contactAudit'] as const,
  userLogs: (userId: string) => [...contactAuditKeys.all, 'userLogs', userId] as const,
  groupLogs: (groupId: string) => [...contactAuditKeys.all, 'groupLogs', groupId] as const,
  privacySettings: (userId: string) => [...contactAuditKeys.all, 'privacy', userId] as const,
};

/**
 * Hook to get contact access logs for a user
 */
export const useUserContactLogs = (userId: string, requesterId: string) => {
  return useQuery({
    queryKey: contactAuditKeys.userLogs(userId),
    queryFn: async (): Promise<ContactAuditLogWithDetails[]> => {
      const result = await contactAuditService.getUserContactLogs(userId, requesterId);
      if (result.error) {
        throw result.error;
      }
      return result.data || [];
    },
    enabled: !!userId && !!requesterId,
  });
};

/**
 * Hook to get contact access logs for a group
 */
export const useGroupContactLogs = (groupId: string, requesterId: string) => {
  return useQuery({
    queryKey: contactAuditKeys.groupLogs(groupId),
    queryFn: async (): Promise<ContactAuditLogWithDetails[]> => {
      const result = await contactAuditService.getGroupContactLogs(groupId, requesterId);
      if (result.error) {
        throw result.error;
      }
      return result.data || [];
    },
    enabled: !!groupId && !!requesterId,
  });
};

/**
 * Hook to get user's privacy settings
 */
export const usePrivacySettings = (userId: string) => {
  return useQuery({
    queryKey: contactAuditKeys.privacySettings(userId),
    queryFn: async (): Promise<ContactPrivacySettings> => {
      const result = await contactAuditService.getPrivacySettings(userId);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    enabled: !!userId,
  });
};

/**
 * Hook to update privacy settings
 */
export const useUpdatePrivacySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: UpdatePrivacySettingsData;
    }) => {
      const result = await contactAuditService.updatePrivacySettings(userId, updates);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate and refetch privacy settings
      queryClient.invalidateQueries({
        queryKey: contactAuditKeys.privacySettings(data.user_id),
      });
    },
  });
};

/**
 * Hook to check if contact sharing is allowed
 */
export const useCanShareContact = (
  userId: string,
  contactType: 'email' | 'phone',
  requesterId: string,
  groupId: string
) => {
  return useQuery({
    queryKey: [...contactAuditKeys.all, 'canShare', userId, contactType, requesterId, groupId],
    queryFn: async (): Promise<boolean> => {
      const result = await contactAuditService.canShareContact(
        userId,
        contactType,
        requesterId,
        groupId
      );
      if (result.error) {
        throw result.error;
      }
      return result.data || false;
    },
    enabled: !!userId && !!contactType && !!requesterId && !!groupId,
  });
};