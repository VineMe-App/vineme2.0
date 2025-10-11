import { supabase } from './supabase';
import { permissionService } from './permissions';
import type {
  ContactAuditLog,
  ContactAuditLogWithDetails,
  ContactPrivacySettings,
} from '../types/database';
import { getFullName } from '../utils/name';

export interface ContactAuditServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export interface LogContactAccessData {
  user_id: string; // User whose contact was accessed
  accessor_id: string; // User who accessed the contact
  group_id: string; // Group context for the access
  join_request_id?: string; // Related join request if applicable
  access_type: 'view' | 'call' | 'email' | 'message';
  contact_fields: string[]; // Which fields were accessed (email, phone, etc.)
}

export interface UpdatePrivacySettingsData {
  allow_email_sharing?: boolean;
  allow_phone_sharing?: boolean;
  allow_contact_by_leaders?: boolean;
}

export class ContactAuditService {
  /**
   * Log contact information access
   */
  async logContactAccess(
    accessData: LogContactAccessData
  ): Promise<ContactAuditServiceResponse<ContactAuditLog>> {
    try {
      // Verify the accessor has permission to access the contact in this group context
      const permissionCheck = await permissionService.canManageGroupMembership(
        accessData.group_id,
        accessData.accessor_id
      );

      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error('Access denied to contact information'),
        };
      }

      const { data, error } = await supabase
        .from('contact_audit_logs')
        .insert({
          user_id: accessData.user_id,
          accessor_id: accessData.accessor_id,
          group_id: accessData.group_id,
          join_request_id: accessData.join_request_id,
          access_type: accessData.access_type,
          contact_fields: accessData.contact_fields,
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
            : new Error('Failed to log contact access'),
      };
    }
  }

  /**
   * Get contact access logs for a user
   */
  async getUserContactLogs(
    userId: string,
    requesterId: string
  ): Promise<ContactAuditServiceResponse<ContactAuditLogWithDetails[]>> {
    try {
      // Only allow users to see their own logs or admins to see any logs
      if (userId !== requesterId) {
        const { data: requester } = await supabase
          .from('users')
          .select('roles')
          .eq('id', requesterId)
          .single();

        if (!requester?.roles?.includes('church_admin')) {
          return {
            data: null,
            error: new Error('Access denied to contact logs'),
          };
        }
      }

      const { data, error } = await supabase
        .from('contact_audit_logs')
        .select(
          `
          *,
          user:users!contact_audit_logs_user_id_fkey(id, first_name, last_name),
          accessor:users!contact_audit_logs_accessor_id_fkey(id, first_name, last_name),
          group:groups(id, title)
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const withNames = (data || []).map((log) => ({
        ...log,
        user: log.user
          ? { ...log.user, name: getFullName(log.user) }
          : log.user,
        accessor: log.accessor
          ? { ...log.accessor, name: getFullName(log.accessor) }
          : log.accessor,
      }));

      return { data: withNames, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get contact logs'),
      };
    }
  }

  /**
   * Get contact access logs for a group (for group leaders)
   */
  async getGroupContactLogs(
    groupId: string,
    requesterId: string
  ): Promise<ContactAuditServiceResponse<ContactAuditLogWithDetails[]>> {
    try {
      // Verify the requester is a leader of this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        groupId,
        requesterId
      );

      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error('Access denied to group contact logs'),
        };
      }

      const { data, error } = await supabase
        .from('contact_audit_logs')
        .select(
          `
          *,
          user:users!contact_audit_logs_user_id_fkey(id, first_name, last_name),
          accessor:users!contact_audit_logs_accessor_id_fkey(id, first_name, last_name),
          group:groups(id, title)
        `
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const withNames = (data || []).map((log) => ({
        ...log,
        user: log.user
          ? { ...log.user, name: getFullName(log.user) }
          : log.user,
        accessor: log.accessor
          ? { ...log.accessor, name: getFullName(log.accessor) }
          : log.accessor,
      }));

      return { data: withNames, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get group contact logs'),
      };
    }
  }

  /**
   * Get user's privacy settings, creating them if they don't exist
   */
  async getPrivacySettings(
    userId: string
  ): Promise<ContactAuditServiceResponse<ContactPrivacySettings>> {
    try {
      const { data, error } = await supabase
        .from('contact_privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error
        return { data: null, error: new Error(error.message) };
      }

      // If no settings exist, create them with default values
      if (!data) {
        const { data: newSettings, error: createError } = await supabase
          .from('contact_privacy_settings')
          .insert({
            user_id: userId,
            allow_email_sharing: true,
            allow_phone_sharing: true,
            allow_contact_by_leaders: true,
          })
          .select()
          .single();

        if (createError) {
          return { data: null, error: new Error(createError.message) };
        }

        return { data: newSettings, error: null };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get privacy settings'),
      };
    }
  }

  /**
   * Ensure privacy settings exist for a user (create if missing)
   */
  async ensurePrivacySettings(
    userId: string
  ): Promise<ContactAuditServiceResponse<ContactPrivacySettings>> {
    try {
      // First try to get existing settings
      const existingResult = await this.getPrivacySettings(userId);

      // If we got settings back, return them
      if (existingResult.data) {
        return existingResult;
      }

      // If there was an error getting settings, return it
      if (existingResult.error) {
        return existingResult;
      }

      // This shouldn't happen, but just in case
      return {
        data: null,
        error: new Error('Failed to ensure privacy settings'),
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to ensure privacy settings'),
      };
    }
  }

  /**
   * Update user's privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    updates: UpdatePrivacySettingsData
  ): Promise<ContactAuditServiceResponse<ContactPrivacySettings>> {
    try {
      // Use upsert to either update existing or create new settings
      const { data, error } = await supabase
        .from('contact_privacy_settings')
        .upsert(
          {
            user_id: userId,
            allow_email_sharing: updates.allow_email_sharing ?? true,
            allow_phone_sharing: updates.allow_phone_sharing ?? true,
            allow_contact_by_leaders: updates.allow_contact_by_leaders ?? true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false,
          }
        )
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
            : new Error('Failed to update privacy settings'),
      };
    }
  }

  /**
   * Check if contact sharing is allowed based on privacy settings
   */
  async canShareContact(
    userId: string,
    contactType: 'email' | 'phone',
    requesterId: string,
    groupId: string
  ): Promise<ContactAuditServiceResponse<boolean>> {
    try {
      // Get user's privacy settings
      const privacyResult = await this.getPrivacySettings(userId);
      if (privacyResult.error) {
        return { data: false, error: privacyResult.error };
      }

      const settings = privacyResult.data;
      if (!settings) {
        return { data: false, error: new Error('Privacy settings not found') };
      }

      // Check if contact sharing is allowed by leaders
      if (!settings.allow_contact_by_leaders) {
        return { data: false, error: null };
      }

      // Check specific contact type permissions
      if (contactType === 'email' && !settings.allow_email_sharing) {
        return { data: false, error: null };
      }

      if (contactType === 'phone' && !settings.allow_phone_sharing) {
        return { data: false, error: null };
      }

      // Verify the requester is a leader of the group
      const permissionCheck = await permissionService.canManageGroupMembership(
        groupId,
        requesterId
      );

      if (!permissionCheck.hasPermission) {
        return { data: false, error: new Error('Access denied') };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to check contact sharing permission'),
      };
    }
  }
}

// Export singleton instance
export const contactAuditService = new ContactAuditService();
