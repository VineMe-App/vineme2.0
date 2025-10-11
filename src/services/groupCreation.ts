import { supabase } from './supabase';
import { permissionService } from './permissions';
import {
  triggerGroupRequestSubmittedNotification,
  triggerJoinRequestReceivedNotification,
} from './notifications';
import type { Group, GroupMembership } from '../types/database';
import type {
  CreateGroupData,
  UpdateGroupData,
  AdminServiceResponse,
} from './admin';

/**
 * Service for group creation and leader management
 */
export class GroupCreationService {
  /**
   * Create a new group request
   */
  async createGroupRequest(
    groupData: CreateGroupData,
    creatorId: string
  ): Promise<AdminServiceResponse<Group>> {
    try {
      // Ensure we have an authenticated session so RLS sees auth.uid()
      const { data: sessionResult } = await supabase.auth.getSession();
      const effectiveUid = sessionResult?.session?.user?.id;
      if (!effectiveUid || effectiveUid !== creatorId) {
        return {
          data: null,
          error: new Error('You are not authenticated. Please sign in again.'),
        };
      }

      // Check permission to create groups (basic user permission)
      const permissionCheck = await permissionService.canAccessChurchData(
        groupData.church_id
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason ||
              'Access denied to create group in this church'
          ),
        };
      }

      // Validate RLS compliance (must match RLS policies on groups)
      const rlsCheck = await permissionService.validateRLSCompliance(
        'groups',
        'insert',
        {
          church_id: groupData.church_id,
          service_id: groupData.service_id,
        }
      );
      if (!rlsCheck.hasPermission) {
        return {
          data: null,
          error: new Error(rlsCheck.reason || 'RLS policy violation'),
        };
      }

      // Ensure service belongs to the same church (helps avoid RLS checks failing)
      const { data: svc } = await supabase
        .from('services')
        .select('id, church_id')
        .eq('id', groupData.service_id)
        .single();
      if (svc && svc.church_id !== groupData.church_id) {
        return {
          data: null,
          error: new Error('Selected service is not part of the chosen church'),
        };
      }

      // Diagnostic: confirm DB sees auth context
      try {
        const { data: authCtx } = await supabase.rpc('get_auth_context');
        if (__DEV__) {
          console.log('[CreateGroupDebug] get_auth_context:', authCtx);
        }
      } catch {}

      // Normalize meeting_time to 24h HH:MM:SS to avoid type issues
      const normalizeMeetingTime = (value: string): string => {
        const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!ampmMatch) return value;
        let hour = parseInt(ampmMatch[1], 10);
        const minute = ampmMatch[2];
        const meridiem = ampmMatch[3].toUpperCase();
        if (meridiem === 'PM' && hour < 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;
        const hh = String(hour).padStart(2, '0');
        return `${hh}:${minute}:00`;
      };

      // Debug diagnostics to validate auth context and derived values
      try {
        const [userRes, svcRes, jwtRes] = await Promise.all([
          supabase.from('users').select('id, service_id, church_id, roles').eq('id', creatorId).single(),
          supabase.from('services').select('id, church_id').eq('id', groupData.service_id).single(),
          supabase.auth.getSession(),
        ]);
        if (__DEV__) {
          console.log('[CreateGroupDebug] session uid:', jwtRes?.data?.session?.user?.id);
          console.log('[CreateGroupDebug] user row:', userRes.data);
          console.log('[CreateGroupDebug] svc row:', svcRes.data);
          console.log('[CreateGroupDebug] payload:', {
            ...groupData,
            meeting_time: normalizeMeetingTime(groupData.meeting_time),
            created_by: creatorId,
            status: 'pending',
          });
        }
      } catch (e) {
        if (__DEV__) console.warn('[CreateGroupDebug] pre-insert diagnostics failed', e);
      }

      // Create the group with pending status (service_id will be enforced server-side)
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          ...groupData,
          meeting_time: normalizeMeetingTime(groupData.meeting_time),
          created_by: creatorId,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (groupError) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('[CreateGroupDebug] insert failed', {
            message: groupError.message,
            details: (groupError as any).details,
            hint: (groupError as any).hint,
            code: (groupError as any).code,
          });
        }
        // Provide clearer message for UI but keep full context in console
        const message = groupError.message?.includes('RLS')
          ? 'RLS policy violation for groups.insert'
          : groupError.message;
        return { data: null, error: new Error(message) };
      }

      // Automatically add creator as leader only if they are a church admin.
      // Regular users submit for approval and do not get active leadership until approved.
      let membershipError: any = null;
      try {
        const { data: me } = await supabase
          .from('users')
          .select('roles')
          .eq('id', creatorId)
          .single();
        const isChurchAdmin = Array.isArray(me?.roles) && me.roles.includes('church_admin');
        if (isChurchAdmin) {
          const result = await supabase
            .from('group_memberships')
            .insert({
              group_id: group.id,
              user_id: creatorId,
              role: 'leader',
              status: 'active',
              joined_at: new Date().toISOString(),
            });
          membershipError = result.error;
        }
      } catch {}

      if (membershipError) {
        // If membership creation fails, we should clean up the group
        await supabase.from('groups').delete().eq('id', group.id);
        return {
          data: null,
          error: new Error('Failed to create group leadership'),
        };
      }

      // Get creator name for notification
      const { data: creator } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', creatorId)
        .single();

      // Send enhanced notification to church admins
      if (creator) {
        await triggerGroupRequestSubmittedNotification({
          groupId: group.id,
          groupTitle: group.title,
          creatorId: creatorId,
          creatorName: getFullName(creator),
          churchId: groupData.church_id,
        });
      }

      return { data: group, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to create group request'),
      };
    }
  }

  /**
   * Update group details (for group leaders)
   */
  async updateGroupDetails(
    groupId: string,
    updates: UpdateGroupData,
    userId: string
  ): Promise<AdminServiceResponse<Group>> {
    try {
      // Check if user can manage this group
      const membershipCheck = await permissionService.canManageGroupMembership(
        groupId,
        userId
      );
      if (!membershipCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            membershipCheck.reason || 'Access denied to manage group'
          ),
        };
      }

      // Verify user is a leader of this group
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (membershipError || !membership || membership.role !== 'leader') {
        return {
          data: null,
          error: new Error('Only group leaders can update group details'),
        };
      }

      // Update the group
      const { data, error } = await supabase
        .from('groups')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
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
            : new Error('Failed to update group details'),
      };
    }
  }

  /**
   * Promote a member to leader
   */
  async promoteToLeader(
    groupId: string,
    userId: string,
    promoterId: string
  ): Promise<AdminServiceResponse<GroupMembership>> {
    try {
      // Check if promoter can manage this group
      const membershipCheck = await permissionService.canManageGroupMembership(
        groupId,
        promoterId
      );
      if (!membershipCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            membershipCheck.reason || 'Access denied to manage group membership'
          ),
        };
      }

      // Verify promoter is a leader of this group
      const { data: promoterMembership, error: promoterError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', promoterId)
        .eq('status', 'active')
        .single();

      if (
        promoterError ||
        !promoterMembership ||
        promoterMembership.role !== 'leader'
      ) {
        return {
          data: null,
          error: new Error('Only group leaders can promote members'),
        };
      }

      // Verify target user is a member of this group
      const { data: targetMembership, error: targetError } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (targetError || !targetMembership) {
        return {
          data: null,
          error: new Error('User is not a member of this group'),
        };
      }

      if (targetMembership.role === 'leader') {
        return {
          data: null,
          error: new Error('User is already a leader'),
        };
      }

      // Promote to leader
      const { data, error } = await supabase
        .from('group_memberships')
        .update({
          role: 'leader',
        })
        .eq('id', targetMembership.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Create note for the role change
      try {
        const { groupMembershipNotesService } = await import(
          './groupMembershipNotes'
        );
        await groupMembershipNotesService.createRoleChangeNote(
          {
            membership_id: targetMembership.id,
            group_id: groupId,
            user_id: userId,
            previous_role: targetMembership.role,
            new_role: 'leader',
          },
          promoterId
        );
      } catch (noteError) {
        if (__DEV__)
          console.warn('Failed to create promotion note:', noteError);
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to promote to leader'),
      };
    }
  }

  /**
   * Demote a leader to member
   */
  async demoteFromLeader(
    groupId: string,
    userId: string,
    demoterId: string
  ): Promise<AdminServiceResponse<GroupMembership>> {
    try {
      // Check if demoter can manage this group
      const membershipCheck = await permissionService.canManageGroupMembership(
        groupId,
        demoterId
      );
      if (!membershipCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            membershipCheck.reason || 'Access denied to manage group membership'
          ),
        };
      }

      // Verify demoter is a leader of this group
      const { data: demoterMembership, error: demoterError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', demoterId)
        .eq('status', 'active')
        .single();

      if (
        demoterError ||
        !demoterMembership ||
        demoterMembership.role !== 'leader'
      ) {
        return {
          data: null,
          error: new Error('Only group leaders can demote members'),
        };
      }

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

      // Prevent demoting the last leader
      if (
        allLeaders &&
        allLeaders.length === 1 &&
        allLeaders[0].user_id === userId
      ) {
        return {
          data: null,
          error: new Error('Cannot demote the last leader of the group'),
        };
      }

      // Verify target user is a leader of this group
      const { data: targetMembership, error: targetError } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (targetError || !targetMembership) {
        return {
          data: null,
          error: new Error('User is not a member of this group'),
        };
      }

      if (targetMembership.role !== 'leader') {
        return {
          data: null,
          error: new Error('User is not a leader'),
        };
      }

      // Demote to member
      const { data, error } = await supabase
        .from('group_memberships')
        .update({
          role: 'member',
        })
        .eq('id', targetMembership.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Create note for the role change
      try {
        const { groupMembershipNotesService } = await import(
          './groupMembershipNotes'
        );
        await groupMembershipNotesService.createRoleChangeNote(
          {
            membership_id: targetMembership.id,
            group_id: groupId,
            user_id: userId,
            previous_role: 'leader',
            new_role: 'member',
          },
          demoterId
        );
      } catch (noteError) {
        if (__DEV__)
          console.warn('Failed to create demotion note:', noteError);
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to demote from leader'),
      };
    }
  }

  /**
   * Remove a member from the group
   */
  async removeMember(
    groupId: string,
    userId: string,
    removerId: string
  ): Promise<AdminServiceResponse<boolean>> {
    try {
      // Check if remover can manage this group
      const membershipCheck = await permissionService.canManageGroupMembership(
        groupId,
        removerId
      );
      if (!membershipCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            membershipCheck.reason || 'Access denied to manage group membership'
          ),
        };
      }

      // Verify remover is a leader of this group
      const { data: removerMembership, error: removerError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', removerId)
        .eq('status', 'active')
        .single();

      if (
        removerError ||
        !removerMembership ||
        removerMembership.role !== 'leader'
      ) {
        return {
          data: null,
          error: new Error('Only group leaders can remove members'),
        };
      }

      // If removing a leader, check if they're the last leader
      const { data: targetMembership, error: targetError } = await supabase
        .from('group_memberships')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (targetError || !targetMembership) {
        return {
          data: null,
          error: new Error('User is not a member of this group'),
        };
      }

      if (targetMembership.role === 'leader') {
        // Check if this is the last leader
        const { data: allLeaders, error: leadersError } = await supabase
          .from('group_memberships')
          .select('id')
          .eq('group_id', groupId)
          .eq('role', 'leader')
          .eq('status', 'active');

        if (leadersError) {
          return {
            data: null,
            error: new Error('Failed to check group leadership'),
          };
        }

        if (allLeaders && allLeaders.length === 1) {
          return {
            data: null,
            error: new Error('Cannot remove the last leader of the group'),
          };
        }
      }

      // Get the membership record before updating (need ID for notes)
      const { data: membershipRecord, error: fetchError } = await supabase
        .from('group_memberships')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (fetchError || !membershipRecord) {
        return {
          data: null,
          error: new Error('Membership not found'),
        };
      }

      // Remove the member by setting status to inactive
      const { error } = await supabase
        .from('group_memberships')
        .update({ status: 'inactive' })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Create note for the member removal
      try {
        const { groupMembershipNotesService } = await import(
          './groupMembershipNotes'
        );
        await groupMembershipNotesService.createNote(
          {
            membership_id: membershipRecord.id,
            group_id: groupId,
            user_id: userId,
            note_type: 'member_left',
            previous_status: 'active',
            new_status: 'inactive',
            note_text: 'Removed by group leader',
          },
          removerId
        );
      } catch (noteError) {
        if (__DEV__)
          console.warn('Failed to create member removal note:', noteError);
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to remove member'),
      };
    }
  }

  /**
   * Create a join request (pending membership)
   */
  async createJoinRequest(
    groupId: string,
    userId: string,
    contactConsent: boolean = false,
    message?: string
  ): Promise<AdminServiceResponse<GroupMembership>> {
    try {
      // Check if user can join groups in this church
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('church_id, status')
        .eq('id', groupId)
        .single();

      if (groupError || !group) {
        return { data: null, error: new Error('Group not found') };
      }

      if (group.status !== 'approved') {
        return {
          data: null,
          error: new Error('Group is not accepting new members'),
        };
      }

      const churchAccessCheck = await permissionService.canAccessChurchData(
        group.church_id
      );
      if (!churchAccessCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            churchAccessCheck.reason || 'Access denied to join this group'
          ),
        };
      }

      // Check if user is already a member or has a pending request
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id, status, role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

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
              journey_status: null, // Reset journey status for new request
            })
            .eq('id', existingMembership.id)
            .select()
            .single();

          data = updateResult.data;
          error = updateResult.error;

          // Create note for the status change (rejoin request)
          if (!error && data) {
            try {
              const { groupMembershipNotesService } = await import(
                './groupMembershipNotes'
              );
              
              // Use appropriate note_type based on previous status
              const noteType: 'request_archived' | 'member_left' =
                existingMembership.status === 'inactive'
                  ? 'member_left'
                  : 'request_archived';
              
              await groupMembershipNotesService.createStatusChangeNote(
                {
                  membership_id: existingMembership.id,
                  group_id: groupId,
                  user_id: userId,
                  note_type: noteType,
                  previous_status: existingMembership.status,
                  new_status: 'pending',
                  note_text: 'User requested to rejoin the group',
                },
                userId
              );
            } catch (noteError) {
              if (__DEV__)
                console.warn('Failed to create rejoin note:', noteError);
            }
          }
        }
      } else {
        // No existing membership, create new one
        const insertResult = await supabase
          .from('group_memberships')
          .insert({
            group_id: groupId,
            user_id: userId,
            role: 'member',
            status: 'pending',
          })
          .select()
          .single();

        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Get requester and group info for notification
      const [requesterResult, groupResult] = await Promise.all([
        supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', userId)
          .single(),
        supabase.from('groups').select('title').eq('id', groupId).single(),
      ]);

      // Send enhanced notification to group leaders
      if (requesterResult.data && groupResult.data) {
        // Collect leaderIds for the trigger
        const { data: leaders } = await supabase
          .from('group_memberships')
          .select('user_id')
          .eq('group_id', groupId)
          .eq('role', 'leader')
          .eq('status', 'active');
        const leaderIds = (leaders || []).map((l) => l.user_id);
        await triggerJoinRequestReceivedNotification({
          groupId,
          groupTitle: groupResult.data.title,
          requesterId: userId,
          requesterName: getFullName(requesterResult.data) || 'A member',
          leaderIds,
        });
      }

      // TODO: Store contact consent and message in a separate table
      // For now, we'll just log it
      console.log('Join request created:', {
        membershipId: data.id,
        contactConsent,
        message,
      });

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to create join request'),
      };
    }
  }
}

// Export singleton instance
export const groupCreationService = new GroupCreationService();
