import { supabase } from './supabase';
import { permissionService } from './permissions';
import {
  createPaginationParams,
  createPaginatedResponse,
  type PaginationParams,
  type PaginatedResponse,
  ADMIN_PAGINATION_DEFAULTS,
} from '../utils/adminPagination';
import type {
  Group,
  GroupWithDetails,
  User,
  UserWithDetails,
  GroupMembership,
  GroupMembershipWithUser,
} from '../types/database';

export interface AdminServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export interface GroupWithAdminDetails extends GroupWithDetails {
  creator_id?: string;
  creator?: User;
  pending_requests?: GroupJoinRequest[];
  approval_history?: GroupApprovalHistory[];
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  user?: User;
  contact_consent: boolean;
  message?: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
}

export interface GroupApprovalHistory {
  id: string;
  group_id: string;
  admin_id: string;
  admin?: User;
  action: 'approved' | 'declined' | 'closed';
  reason?: string;
  created_at: string;
}

export interface UserWithGroupStatus extends UserWithDetails {
  group_count: number;
  is_connected: boolean;
  last_activity?: string;
  pending_requests?: GroupJoinRequest[];
}

export interface ChurchUserSummary {
  total_users: number;
  connected_users: number;
  unconnected_users: number;
  active_groups: number;
  pending_requests: number;
}

export interface CreateGroupData {
  title: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  location: any;
  service_id: string;
  church_id: string;
  whatsapp_link?: string;
  image_url?: string;
}

export interface UpdateGroupData {
  title?: string;
  description?: string;
  meeting_day?: string;
  meeting_time?: string;
  location?: any;
  whatsapp_link?: string;
  image_url?: string;
}

/**
 * Admin service for managing groups
 */
export class GroupAdminService {
  /**
   * Get all groups for a church with admin details
   */
  async getChurchGroups(
    churchId: string,
    includeAll: boolean = false
  ): Promise<AdminServiceResponse<GroupWithAdminDetails[]>>;

  /**
   * Get paginated groups for a church with admin details
   */
  async getChurchGroups(
    churchId: string,
    includeAll: boolean = false,
    pagination?: PaginationParams
  ): Promise<AdminServiceResponse<PaginatedResponse<GroupWithAdminDetails>>>;

  async getChurchGroups(
    churchId: string,
    includeAll: boolean = false,
    pagination?: PaginationParams
  ): Promise<
    AdminServiceResponse<
      GroupWithAdminDetails[] | PaginatedResponse<GroupWithAdminDetails>
    >
  > {
    try {
      // Check permission to manage church groups
      const permissionCheck = await permissionService.hasPermission(
        'manage_church_groups'
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage church groups'
          ),
        };
      }

      // Verify user can access this church's data
      const churchAccessCheck =
        await permissionService.canAccessChurchData(churchId);
      if (!churchAccessCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            churchAccessCheck.reason || 'Access denied to church data'
          ),
        };
      }

      let query = supabase
        .from('groups')
        .select(
          `
          *,
          service:services(*),
          church:churches(*),
          creator:users!groups_created_by_fkey(id, name, avatar_url),
          memberships:group_memberships(
            id,
            user_id,
            role,
            status,
            joined_at,
            user:users(id, name, avatar_url)
          )
        `,
          { count: pagination ? 'exact' : undefined }
        )
        .eq('church_id', churchId)
        .order('created_at', { ascending: false });

      if (!includeAll) {
        query = query.in('status', ['pending', 'approved']);
      }

      // Apply pagination if provided
      if (pagination) {
        query = query.range(
          pagination.offset,
          pagination.offset + pagination.limit - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Add member count and format data
      const groupsWithDetails =
        data?.map((group) => ({
          ...group,
          member_count:
            group.memberships?.filter((m: any) => m.status === 'active')
              .length || 0,
        })) || [];

      // Return paginated response if pagination was requested
      if (pagination && count !== null) {
        const paginatedResponse = createPaginatedResponse(
          groupsWithDetails,
          count,
          pagination
        );
        return { data: paginatedResponse, error: null };
      }

      return { data: groupsWithDetails, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get church groups'),
      };
    }
  }

  /**
   * Approve a pending group
   */
  async approveGroup(
    groupId: string,
    adminId: string,
    reason?: string
  ): Promise<AdminServiceResponse<Group>> {
    try {
      // Check permission to manage church groups
      const permissionCheck = await permissionService.hasPermission(
        'manage_church_groups'
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage church groups'
          ),
        };
      }

      // Verify the group exists and is pending
      const { data: existingGroup, error: fetchError } = await supabase
        .from('groups')
        .select('id, status, church_id')
        .eq('id', groupId)
        .single();

      if (fetchError || !existingGroup) {
        return { data: null, error: new Error('Group not found') };
      }

      if (existingGroup.status !== 'pending') {
        return {
          data: null,
          error: new Error('Group is not pending approval'),
        };
      }

      // Verify admin can access this church's data
      const churchAccessCheck = await permissionService.canAccessChurchData(
        existingGroup.church_id
      );
      if (!churchAccessCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            churchAccessCheck.reason || 'Access denied to church data'
          ),
        };
      }

      // Update group status to approved
      const { data, error } = await supabase
        .from('groups')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Log the approval action
      await this.logGroupAction(groupId, adminId, 'approved', reason);

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to approve group'),
      };
    }
  }

  /**
   * Decline a pending group
   */
  async declineGroup(
    groupId: string,
    adminId: string,
    reason?: string
  ): Promise<AdminServiceResponse<Group>> {
    try {
      // Check permission to manage church groups
      const permissionCheck = await permissionService.hasPermission(
        'manage_church_groups'
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage church groups'
          ),
        };
      }

      // Verify the group exists and is pending
      const { data: existingGroup, error: fetchError } = await supabase
        .from('groups')
        .select('id, status, church_id')
        .eq('id', groupId)
        .single();

      if (fetchError || !existingGroup) {
        return { data: null, error: new Error('Group not found') };
      }

      if (existingGroup.status !== 'pending') {
        return {
          data: null,
          error: new Error('Group is not pending approval'),
        };
      }

      // Verify admin can access this church's data
      const churchAccessCheck = await permissionService.canAccessChurchData(
        existingGroup.church_id
      );
      if (!churchAccessCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            churchAccessCheck.reason || 'Access denied to church data'
          ),
        };
      }

      // Update group status to denied
      const { data, error } = await supabase
        .from('groups')
        .update({
          status: 'denied',
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Log the decline action
      await this.logGroupAction(groupId, adminId, 'declined', reason);

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to decline group'),
      };
    }
  }

  /**
   * Close an approved group
   */
  async closeGroup(
    groupId: string,
    adminId: string,
    reason?: string
  ): Promise<AdminServiceResponse<Group>> {
    try {
      // Check permission to manage church groups
      const permissionCheck = await permissionService.hasPermission(
        'manage_church_groups'
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage church groups'
          ),
        };
      }

      // Verify the group exists and is approved
      const { data: existingGroup, error: fetchError } = await supabase
        .from('groups')
        .select('id, status, church_id')
        .eq('id', groupId)
        .single();

      if (fetchError || !existingGroup) {
        return { data: null, error: new Error('Group not found') };
      }

      if (existingGroup.status !== 'approved') {
        return {
          data: null,
          error: new Error('Only approved groups can be closed'),
        };
      }

      // Verify admin can access this church's data
      const churchAccessCheck = await permissionService.canAccessChurchData(
        existingGroup.church_id
      );
      if (!churchAccessCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            churchAccessCheck.reason || 'Access denied to church data'
          ),
        };
      }

      // Update group status to closed
      const { data, error } = await supabase
        .from('groups')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Log the close action
      await this.logGroupAction(groupId, adminId, 'closed', reason);

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to close group'),
      };
    }
  }

  /**
   * Get join requests for a group
   */
  async getGroupRequests(
    groupId: string
  ): Promise<AdminServiceResponse<GroupJoinRequest[]>> {
    try {
      // Check if user can manage this group's membership
      const membershipCheck =
        await permissionService.canManageGroupMembership(groupId);
      if (!membershipCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            membershipCheck.reason || 'Access denied to manage group membership'
          ),
        };
      }

      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          id,
          group_id,
          user_id,
          status,
          joined_at,
          user:users(id, name, avatar_url)
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Transform to match GroupJoinRequest interface
      const requests: GroupJoinRequest[] =
        data?.map((item) => ({
          id: item.id,
          group_id: item.group_id,
          user_id: item.user_id,
          user: item.user,
          contact_consent: true, // Default for now, can be enhanced later
          status: 'pending',
          created_at: item.joined_at,
        })) || [];

      return { data: requests, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get group requests'),
      };
    }
  }

  /**
   * Approve a join request
   */
  async approveJoinRequest(
    requestId: string
  ): Promise<AdminServiceResponse<boolean>> {
    try {
      // Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('group_memberships')
        .select('group_id, user_id, status')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return { data: null, error: new Error('Join request not found') };
      }

      if (request.status !== 'pending') {
        return { data: null, error: new Error('Request is not pending') };
      }

      // Check if user can manage this group's membership
      const membershipCheck = await permissionService.canManageGroupMembership(
        request.group_id
      );
      if (!membershipCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            membershipCheck.reason || 'Access denied to manage group membership'
          ),
        };
      }

      // Update the membership status to active
      const { error } = await supabase
        .from('group_memberships')
        .update({
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .eq('id', requestId);

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
            : new Error('Failed to approve join request'),
      };
    }
  }

  /**
   * Decline a join request
   */
  async declineJoinRequest(
    requestId: string
  ): Promise<AdminServiceResponse<boolean>> {
    try {
      // Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('group_memberships')
        .select('group_id, user_id, status')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return { data: null, error: new Error('Join request not found') };
      }

      if (request.status !== 'pending') {
        return { data: null, error: new Error('Request is not pending') };
      }

      // Check if user can manage this group's membership
      const membershipCheck = await permissionService.canManageGroupMembership(
        request.group_id
      );
      if (!membershipCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            membershipCheck.reason || 'Access denied to manage group membership'
          ),
        };
      }

      // Delete the membership record
      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('id', requestId);

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
            : new Error('Failed to decline join request'),
      };
    }
  }

  /**
   * Log group admin actions for audit trail
   */
  private async logGroupAction(
    groupId: string,
    adminId: string,
    action: 'approved' | 'declined' | 'closed',
    reason?: string
  ): Promise<void> {
    try {
      // This would typically go to a group_approval_history table
      // For now, we'll just log to console in development
      console.log('Group admin action:', {
        groupId,
        adminId,
        action,
        reason,
        timestamp: new Date().toISOString(),
      });

      // TODO: Implement actual audit logging to database
      // await supabase.from('group_approval_history').insert({
      //   group_id: groupId,
      //   admin_id: adminId,
      //   action,
      //   reason,
      //   created_at: new Date().toISOString(),
      // });
    } catch (error) {
      // Don't fail the main operation if logging fails
      console.error('Failed to log group action:', error);
    }
  }
}

/**
 * Admin service for managing users
 */
export class UserAdminService {
  /**
   * Get all users from a church with group status
   */
  async getChurchUsers(
    churchId: string
  ): Promise<AdminServiceResponse<UserWithGroupStatus[]>>;

  /**
   * Get paginated users from a church with group status
   */
  async getChurchUsers(
    churchId: string,
    pagination?: PaginationParams,
    filter?: 'all' | 'connected' | 'unconnected'
  ): Promise<AdminServiceResponse<PaginatedResponse<UserWithGroupStatus>>>;

  async getChurchUsers(
    churchId: string,
    pagination?: PaginationParams,
    filter?: 'all' | 'connected' | 'unconnected'
  ): Promise<
    AdminServiceResponse<
      UserWithGroupStatus[] | PaginatedResponse<UserWithGroupStatus>
    >
  > {
    try {
      // Check permission to manage church users
      const permissionCheck = await permissionService.hasPermission(
        'manage_church_users'
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage church users'
          ),
        };
      }

      // Verify user can access this church's data
      const churchAccessCheck =
        await permissionService.canAccessChurchData(churchId);
      if (!churchAccessCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            churchAccessCheck.reason || 'Access denied to church data'
          ),
        };
      }

      let query = supabase
        .from('users')
        .select(
          `
          *,
          church:churches(*),
          service:services(*),
          group_memberships:group_memberships(
            id,
            group_id,
            role,
            status,
            joined_at,
            group:groups(id, title, status)
          )
        `,
          { count: pagination ? 'exact' : undefined }
        )
        .eq('church_id', churchId)
        .order('name');

      // Apply pagination if provided
      if (pagination) {
        query = query.range(
          pagination.offset,
          pagination.offset + pagination.limit - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Transform to include group status
      let usersWithStatus: UserWithGroupStatus[] =
        data?.map((user) => {
          const activeGroups =
            user.group_memberships?.filter(
              (m: any) =>
                m.status === 'active' && m.group?.status === 'approved'
            ) || [];

          return {
            ...user,
            group_count: activeGroups.length,
            is_connected: activeGroups.length > 0,
            last_activity: user.updated_at,
          };
        }) || [];

      // Apply filter if specified
      if (filter && filter !== 'all') {
        usersWithStatus = usersWithStatus.filter((user) =>
          filter === 'connected' ? user.is_connected : !user.is_connected
        );
      }

      // Return paginated response if pagination was requested
      if (pagination && count !== null) {
        const paginatedResponse = createPaginatedResponse(
          usersWithStatus,
          count,
          pagination
        );
        return { data: paginatedResponse, error: null };
      }

      return { data: usersWithStatus, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get church users'),
      };
    }
  }

  /**
   * Get users who are not connected to any groups
   */
  async getUnconnectedUsers(
    churchId: string
  ): Promise<AdminServiceResponse<UserWithGroupStatus[]>> {
    try {
      // Check permission to manage church users
      const permissionCheck = await permissionService.hasPermission(
        'manage_church_users'
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage church users'
          ),
        };
      }

      // Get all users first
      const allUsersResult = await this.getChurchUsers(churchId);
      if (allUsersResult.error || !allUsersResult.data) {
        return allUsersResult;
      }

      // Filter to only unconnected users
      const unconnectedUsers = allUsersResult.data.filter(
        (user) => !user.is_connected
      );

      return { data: unconnectedUsers, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get unconnected users'),
      };
    }
  }

  /**
   * Get a user's group membership history
   */
  async getUserGroupHistory(
    userId: string
  ): Promise<AdminServiceResponse<GroupMembership[]>> {
    try {
      // Check if current user can access this user's data
      const resourceCheck = await permissionService.canModifyResource(
        'user',
        userId
      );
      if (!resourceCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            resourceCheck.reason || 'Access denied to user data'
          ),
        };
      }

      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          *,
          group:groups(id, title, status, church_id)
        `
        )
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

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
            : new Error('Failed to get user group history'),
      };
    }
  }

  /**
   * Get church summary statistics
   */
  async getChurchSummary(
    churchId: string
  ): Promise<AdminServiceResponse<ChurchUserSummary>> {
    try {
      // Check permission to manage church users
      const permissionCheck = await permissionService.hasPermission(
        'manage_church_users'
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage church users'
          ),
        };
      }

      // Get all users
      const usersResult = await this.getChurchUsers(churchId);
      if (usersResult.error || !usersResult.data) {
        return { data: null, error: usersResult.error };
      }

      const users = usersResult.data;
      const connectedUsers = users.filter((user) => user.is_connected);

      // Get active groups count
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('church_id', churchId)
        .eq('status', 'approved');

      if (groupsError) {
        return { data: null, error: new Error(groupsError.message) };
      }

      // Get pending requests count
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('status', 'pending')
        .in('group_id', groups?.map((g) => g.id) || []);

      if (requestsError) {
        return { data: null, error: new Error(requestsError.message) };
      }

      const summary: ChurchUserSummary = {
        total_users: users.length,
        connected_users: connectedUsers.length,
        unconnected_users: users.length - connectedUsers.length,
        active_groups: groups?.length || 0,
        pending_requests: pendingRequests?.length || 0,
      };

      return { data: summary, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get church summary'),
      };
    }
  }
}

// Export singleton instances
export const groupAdminService = new GroupAdminService();
export const userAdminService = new UserAdminService();
