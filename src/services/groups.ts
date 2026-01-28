import { supabase } from './supabase';
import { permissionService } from './permissions';
import { groupMembershipNotesService } from './groupMembershipNotes';
import { triggerJoinRequestReceivedNotification } from './notifications';
import { getFullName } from '../utils/name';
import type {
  GroupWithDetails,
  GroupMembership,
  GroupMembershipWithUser,
} from '../types/database';

const withDisplayName = <
  T extends { first_name?: string | null; last_name?: string | null },
>(
  user: (T & { name?: string | null }) | null | undefined
) =>
  user
    ? {
        ...user,
        name: getFullName(user),
      }
    : user;

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
          church:churches(*),
          
          memberships:group_memberships(
            id,
            user_id,
            role,
            status,
            joined_at,
            journey_status,
            referral_id,
            user:users(id, first_name, last_name, avatar_url)
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
          memberships: group.memberships?.map((m: any) => ({
            ...m,
            user: withDisplayName(m.user),
          })),
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
   * Get all approved groups (church admin or group leader)
   */
  async getAllApprovedGroups(): Promise<
    GroupServiceResponse<GroupWithDetails[]>
  > {
    try {
      // Ensure caller has church admin or group leader privileges
      const adminCheck = await permissionService.isChurchAdmin();
      const leaderCheck = await permissionService.isAnyGroupLeader();
      
      if (!adminCheck.hasPermission && !leaderCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            'Church admin or group leader role required to view all groups'
          ),
        };
      }

      const { data, error } = await supabase
        .from('groups')
        .select(
          `
          *,
          service:services(*),
          church:churches(*),
          
          memberships:group_memberships(
            id,
            user_id,
            role,
            status,
            joined_at,
            journey_status,
            referral_id,
            user:users(id, first_name, last_name, avatar_url)
          )
        `
        )
        .eq('status', 'approved')
        .order('title');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const groupsWithCount =
        data?.map((group) => ({
          ...group,
          memberships: group.memberships?.map((m: any) => ({
            ...m,
            user: withDisplayName(m.user),
          })),
          member_count:
            group.memberships?.filter((m: any) => m.status === 'active')
              .length || 0,
        })) || [];

      return { data: groupsWithCount, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get groups for church admin'),
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
          church:churches(*),
          
          memberships:group_memberships(
            id,
            user_id,
            role,
            status,
            joined_at,
            journey_status,
            referral_id,
            user:users(id, first_name, last_name, avatar_url)
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
        memberships: data.memberships?.map((m: any) => ({
          ...m,
          user: withDisplayName(m.user),
        })),
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
            church:churches(*)
          )
        `
        )
        .eq('user_id', userId)
        .in('status', ['active', 'pending'])
        // Only include memberships where the related group is approved or pending
        .in('group.status', ['approved', 'pending']);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Extract groups from memberships; filter out any null groups due to RLS
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
   * Join a group (deprecated - use joinRequestService.createJoinRequest instead)
   * This method is kept for backward compatibility but now creates a join request
   */
  async joinGroup(
    groupId: string,
    userId: string,
    role: 'member' | 'leader' = 'member'
  ): Promise<GroupServiceResponse<GroupMembership>> {
    try {
      // For backward compatibility, this now creates a join request instead
      // of immediate membership. The request will need to be approved by group leaders.

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      let data: any = null;
      let error: any = null;

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          return {
            data: null,
            error: new Error('User is already a member of this group'),
          };
        }
        if (existingMembership.status === 'pending') {
          return {
            data: null,
            error: new Error(
              'User already has a pending request for this group'
            ),
          };
        }

        // If they were inactive or archived, reuse the existing membership row
        if (
          existingMembership.status === 'inactive' ||
          existingMembership.status === 'archived'
        ) {
          const updateResult = await supabase
            .from('group_memberships')
            .update({
              status: 'pending',
              joined_at: null, // Reset joined_at for pending status (required by constraint)
              journey_status: null, // Reset journey status for new request
              created_at: new Date().toISOString(), // Update timestamp so rejoin request appears at top of list
            })
            .eq('id', existingMembership.id)
            .select()
            .maybeSingle();

          data = updateResult.data;
          error = updateResult.error;
        }
      } else {
        // No existing membership, create new one
        const insertResult = await supabase
          .from('group_memberships')
          .insert({
            group_id: groupId,
            user_id: userId,
            role,
            status: 'pending',
            joined_at: null, // Must be null for pending status (required by constraint)
          })
          .select()
          .maybeSingle();

        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Trigger leader notifications for the join request
      try {
        const [requesterRes, groupRes] = await Promise.all([
          supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', userId)
            .single(),
          supabase.from('groups').select('title').eq('id', groupId).single(),
        ]);

        if (requesterRes.data && groupRes.data) {
          const { data: leaders } = await supabase
            .from('group_memberships')
            .select('user_id')
            .eq('group_id', groupId)
            .eq('role', 'leader')
            .eq('status', 'active');

          const leaderIds = (leaders || []).map((l) => l.user_id);
          if (leaderIds.length > 0) {
            await triggerJoinRequestReceivedNotification({
              groupId,
              groupTitle: groupRes.data.title,
              requesterId: userId,
              requesterName: getFullName(requesterRes.data),
              leaderIds,
            });
          }
        }
      } catch (notifyErr) {
        console.error(
          'Failed to trigger join request notifications:',
          notifyErr
        );
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

      // Get membership record before updating
      const { data: membership, error: fetchError } = await supabase
        .from('group_memberships')
        .select('id, status, role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !membership) {
        return {
          data: null,
          error: new Error('Membership not found'),
        };
      }

      // Check if user is a leader
      if (membership.role === 'leader') {
        // Get all leaders in the group
        const { data: allLeaders, error: leadersError } = await supabase
          .from('group_memberships')
          .select('id, user_id')
          .eq('group_id', groupId)
          .eq('role', 'leader')
          .eq('status', 'active');

        if (leadersError) {
          return {
            data: null,
            error: new Error('Failed to check group leadership'),
          };
        }

        // Prevent the last leader from leaving
        if (
          allLeaders &&
          allLeaders.length === 1 &&
          allLeaders[0].user_id === userId
        ) {
          return {
            data: null,
            error: new Error('Cannot leave group as the last leader. Promote another member to leader first or transfer leadership.'),
          };
        }
      }

      const { error } = await supabase
        .from('group_memberships')
        .update({ status: 'inactive' })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Create note for the member leaving
      if (membership.status === 'active') {
        try {
          await groupMembershipNotesService.createStatusChangeNote(
            {
              membership_id: membership.id,
              group_id: groupId,
              user_id: userId,
              note_type: 'member_left',
              previous_status: 'active',
              new_status: 'inactive',
              note_text: 'Left themselves',
            },
            userId
          );
        } catch (noteError) {
          if (__DEV__)
            console.warn('Failed to create member left note:', noteError);
        }
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
          user:users(id, first_name, last_name, avatar_url, newcomer),
          referral:referrals(id, group_id, church_id, note, referred_by_user_id, created_at)
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('joined_at');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const normalized = (data || []).map((m: any) => ({
        ...m,
        user: withDisplayName(m.user),
      }));

      return { data: normalized, error: null };
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
   * Get all group memberships (including archived and inactive)
   * Only for group leaders
   */
  async getAllGroupMemberships(
    groupId: string,
    userId: string
  ): Promise<GroupServiceResponse<GroupMembershipWithUser[]>> {
    try {
      // Check if user is a leader
      const permissionCheck = await permissionService.canManageGroupMembership(
        groupId,
        userId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to view all memberships'
          ),
        };
      }

      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          *,
          user:users(id, first_name, last_name, avatar_url, newcomer),
          referral:referrals(id, group_id, church_id, note, referred_by_user_id, created_at),
          group_membership_notes(note_type, created_at, note_text)
        `
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const normalized = (data || []).map((m: any) => ({
        ...m,
        user: withDisplayName(m.user),
      }));

      return { data: normalized, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get all group memberships'),
      };
    }
  }

  /**
   * Get user's friends who are in a specific group (active memberships)
   */
  async getFriendsInGroup(
    groupId: string,
    userId: string
  ): Promise<GroupServiceResponse<GroupMembershipWithUser[]>> {
    try {
      // First get the user's friends
      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (friendsError) {
        return { data: null, error: new Error(friendsError.message) };
      }

      const friendIds = (friendships || []).map((f) => f.friend_id);

      if (friendIds.length === 0) {
        return { data: [], error: null };
      }

      // Then get group memberships for those friends
      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          *,
          user:users(id, first_name, last_name, avatar_url, newcomer),
          referral:referrals(id, group_id, church_id, note, referred_by_user_id, created_at)
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'active')
        .in('user_id', friendIds)
        .order('joined_at');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const memberships = (data || [])
        .map((m: any) => ({
          ...m,
          user: withDisplayName(m.user),
        }))
        .filter((m: any) => Boolean(m.user?.id));
      return { data: memberships as any, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get friends in group'),
      };
    }
  }

  /**
   * Get group leaders/admins only (publicly visible)
   */
  async getGroupLeaders(
    groupId: string
  ): Promise<GroupServiceResponse<GroupMembershipWithUser[]>> {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          *,
          user:users(id, first_name, last_name, avatar_url)
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'active')
        .in('role', ['leader'])
        .order('joined_at');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const normalized = (data || []).map((m: any) => ({
        ...m,
        user: withDisplayName(m.user),
      }));

      return { data: normalized, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get group leaders'),
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
        .select('first_name, last_name')
        .eq('id', referralData.referrer_id)
        .single();

      if (referrerError) {
        return { data: null, error: new Error('Referrer not found') };
      }

      // In a real implementation, you would send an email here
      // For now, we'll just log the referral (could be stored in a referrals table)
      console.log('Group referral sent:', {
        group: group.title,
        referrer: getFullName(referrer),
        referee: referralData.referee_email,
        message: referralData.message,
        whatsappLink: group.whatsapp_link,
      });

      // TODO: Implement actual email sending or store referral in database
      // This could involve:
      // 1. Storing the referral in a 'referrals' table
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
          church:churches(*),
          
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
          memberships: group.memberships?.map((m: any) => ({
            ...m,
            user: m.user ? { ...m.user, name: getFullName(m.user) } : m.user,
          })),
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
