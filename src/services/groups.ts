import { supabase } from './supabase';
import { permissionService } from './permissions';
import type {
  Group,
  GroupWithDetails,
  GroupMembership,
  GroupMembershipWithUser,
} from '../types/database';

export interface GroupServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export interface CreateGroupMembershipData {
  group_id: string;
  user_id: string;
  role?: 'member' | 'leader' | 'admin';
}

export interface GroupReferralData {
  group_id: string;
  referrer_id: string;
  referee_email: string;
  message?: string;
}

export class GroupService {
  /**
   * Get groups by church ID with related data
   */
  async getGroupsByChurch(
    churchId: string
  ): Promise<GroupServiceResponse<GroupWithDetails[]>> {
    try {
      // Check permission to access church data
      const permissionCheck =
        await permissionService.canAccessChurchData(churchId);
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to church data'
          ),
        };
      }

      // Validate RLS compliance
      const rlsCheck = await permissionService.validateRLSCompliance(
        'groups',
        'select',
        { church_id: [churchId] }
      );
      if (!rlsCheck.hasPermission) {
        return {
          data: null,
          error: new Error(rlsCheck.reason || 'RLS policy violation'),
        };
      }

      const { data, error } = await supabase
        .from('groups')
        .select(
          `
          *,
          service:services(*),
          
          memberships:group_memberships(
            id,
            user_id,
            role,
            status,
            joined_at,
            user:users(id, name, avatar_url)
          )
        `
        )
        .eq('church_id', churchId)
        .eq('status', 'approved')
        .order('title');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Add member count to each group
      const groupsWithCount =
        data?.map((group) => ({
          ...group,
          member_count:
            group.memberships?.filter((m: any) => m.status === 'active')
              .length || 0,
        })) || [];

      return { data: groupsWithCount, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to get groups'),
      };
    }
  }

  /**
   * Get group by ID with detailed information
   */
  async getGroupById(
    groupId: string
  ): Promise<GroupServiceResponse<GroupWithDetails>> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(
          `
          *,
          service:services(*),
          
          memberships:group_memberships(
            id,
            user_id,
            role,
            status,
            joined_at,
            user:users(id, name, avatar_url, email)
          )
        `
        )
        .eq('id', groupId)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Add member count
      const groupWithCount = {
        ...data,
        member_count:
          data.memberships?.filter((m: any) => m.status === 'active').length ||
          0,
      };

      return { data: groupWithCount, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to get group'),
      };
    }
  }

  /**
   * Get groups that a user is a member of
   */
  async getUserGroups(
    userId: string
  ): Promise<GroupServiceResponse<GroupWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          *,
          group:groups(
            *,
            service:services(*),
            
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Extract groups from memberships
      const groups =
        data?.map((membership) => membership.group).filter(Boolean) || [];

      return { data: groups, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get user groups'),
      };
    }
  }

  /**
   * Join a group
   */
  async joinGroup(
    groupId: string,
    userId: string,
    role: 'member' | 'leader' = 'member'
  ): Promise<GroupServiceResponse<GroupMembership>> {
    try {
      // Check permission to manage group membership
      const permissionCheck = await permissionService.canManageGroupMembership(
        groupId,
        userId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage group membership'
          ),
        };
      }

      // Validate RLS compliance for group membership insertion
      const rlsCheck = await permissionService.validateRLSCompliance(
        'group_memberships',
        'insert',
        { user_id: userId }
      );
      if (!rlsCheck.hasPermission) {
        return {
          data: null,
          error: new Error(rlsCheck.reason || 'RLS policy violation'),
        };
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          return {
            data: null,
            error: new Error('User is already a member of this group'),
          };
        }

        // Reactivate existing membership
        const { data, error } = await supabase
          .from('group_memberships')
          .update({
            status: 'active',
            joined_at: new Date().toISOString(),
          })
          .eq('id', existingMembership.id)
          .select()
          .single();

        if (error) {
          return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
      }

      // Create new membership
      const { data, error } = await supabase
        .from('group_memberships')
        .insert({
          group_id: groupId,
          user_id: userId,
          role,
          status: 'active',
          joined_at: new Date().toISOString(),
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
          error instanceof Error ? error : new Error('Failed to join group'),
      };
    }
  }

  /**
   * Leave a group
   */
  async leaveGroup(
    groupId: string,
    userId: string
  ): Promise<GroupServiceResponse<boolean>> {
    try {
      // Check permission to manage group membership
      const permissionCheck = await permissionService.canManageGroupMembership(
        groupId,
        userId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage group membership'
          ),
        };
      }

      const { error } = await supabase
        .from('group_memberships')
        .update({ status: 'inactive' })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to leave group'),
      };
    }
  }

  /**
   * Check if user is a member of a group
   */
  async isGroupMember(
    groupId: string,
    userId: string
  ): Promise<
    GroupServiceResponse<{ isMember: boolean; membership?: GroupMembership }>
  > {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: {
          isMember: !!data,
          membership: data || undefined,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to check group membership'),
      };
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(
    groupId: string
  ): Promise<GroupServiceResponse<GroupMembershipWithUser[]>> {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          *,
          user:users(id, name, avatar_url, email)
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('joined_at');

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
            : new Error('Failed to get group members'),
      };
    }
  }

  /**
   * Send group referral to non-member
   */
  async sendGroupReferral(
    referralData: GroupReferralData
  ): Promise<GroupServiceResponse<boolean>> {
    try {
      // First, get group details for the referral
      const { data: group, error: groupError } = await this.getGroupById(
        referralData.group_id
      );
      if (groupError || !group) {
        return {
          data: null,
          error: groupError || new Error('Group not found'),
        };
      }

      // Get referrer details
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', referralData.referrer_id)
        .single();

      if (referrerError) {
        return { data: null, error: new Error('Referrer not found') };
      }

      // In a real implementation, you would send an email here
      // For now, we'll just log the referral (could be stored in a referrals table)
      console.log('Group referral sent:', {
        group: group.title,
        referrer: referrer.name,
        referee: referralData.referee_email,
        message: referralData.message,
        whatsappLink: group.whatsapp_link,
      });

      // TODO: Implement actual email sending or store referral in database
      // This could involve:
      // 1. Storing the referral in a 'group_referrals' table
      // 2. Sending an email with group details and invitation link
      // 3. Creating a temporary invitation token

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to send group referral'),
      };
    }
  }

  /**
   * Search groups by title or description
   */
  async searchGroups(
    query: string,
    churchId?: string,
    limit: number = 20
  ): Promise<GroupServiceResponse<GroupWithDetails[]>> {
    try {
      let queryBuilder = supabase
        .from('groups')
        .select(
          `
          *,
          service:services(*),
          
          memberships:group_memberships(
            id,
            user_id,
            role,
            status
          )
        `
        )
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('status', 'approved')
        .limit(limit);

      if (churchId) {
        queryBuilder = queryBuilder.eq('church_id', churchId);
      }

      const { data, error } = await queryBuilder.order('title');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Add member count to each group
      const groupsWithCount =
        data?.map((group) => ({
          ...group,
          member_count:
            group.memberships?.filter((m: any) => m.status === 'active')
              .length || 0,
        })) || [];

      return { data: groupsWithCount, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to search groups'),
      };
    }
  }
}

// Export singleton instance
export const groupService = new GroupService();
