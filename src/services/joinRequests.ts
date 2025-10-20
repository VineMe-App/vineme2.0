import { supabase } from './supabase';
import { permissionService } from './permissions';
import { groupMembershipNotesService } from './groupMembershipNotes';
import {
  triggerJoinRequestApprovedNotification,
  triggerJoinRequestDeniedNotification,
  triggerJoinRequestReceivedNotification,
} from './notifications';
import { getFullName } from '../utils/name';
import type {
  GroupJoinRequest,
  GroupJoinRequestWithUser,
  GroupMembership,
  MembershipJourneyStatus,
} from '../types/database';

export interface GroupServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export interface CreateJoinRequestData {
  group_id: string;
  user_id: string;
  message?: string;
}

export class JoinRequestService {
  /**
   * Create a join request for a group
   */
  async createJoinRequest(
    requestData: CreateJoinRequestData
  ): Promise<GroupServiceResponse<GroupJoinRequest>> {
    try {
      // Check if user already has a membership or pending request
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id, status')
        .eq('group_id', requestData.group_id)
        .eq('user_id', requestData.user_id)
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
              //contact_consent: requestData.contact_consent || false,
            })
            .eq('id', existingMembership.id)
            .select()
            .single();

          data = updateResult.data;
          error = updateResult.error;

          // Create note for the status change (rejoin request)
          if (!error && data) {
            try {
              // Use appropriate note_type based on previous status
              const noteType: 'request_archived' | 'member_left' =
                existingMembership.status === 'inactive'
                  ? 'member_left'
                  : 'request_archived';

              await groupMembershipNotesService.createStatusChangeNote(
                {
                  membership_id: existingMembership.id,
                  group_id: requestData.group_id,
                  user_id: requestData.user_id,
                  note_type: noteType,
                  previous_status: existingMembership.status,
                  new_status: 'pending',
                  note_text: 'User requested to rejoin the group',
                },
                requestData.user_id
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
            group_id: requestData.group_id,
            user_id: requestData.user_id,
            role: 'member',
            status: 'pending',
            //contact_consent: requestData.contact_consent || false,
          })
          .select()
          .single();

        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Fire notifications to active leaders of this group
      try {
        // Fetch requester name and group title
        const [requesterRes, groupRes] = await Promise.all([
          supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', requestData.user_id)
            .single(),
          supabase
            .from('groups')
            .select('title')
            .eq('id', requestData.group_id)
            .single(),
        ]);

        if (requesterRes.data && groupRes.data) {
          const requesterName = getFullName(requesterRes.data) || 'A member';
          const { data: leaders } = await supabase
            .from('group_memberships')
            .select('user_id')
            .eq('group_id', requestData.group_id)
            .eq('role', 'leader')
            .eq('status', 'active');

          const leaderIds = (leaders || []).map((l) => l.user_id);

          if (leaderIds.length > 0) {
            await triggerJoinRequestReceivedNotification({
              groupId: requestData.group_id,
              groupTitle: groupRes.data.title,
              requesterId: requestData.user_id,
              requesterName,
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
          error instanceof Error
            ? error
            : new Error('Failed to create join request'),
      };
    }
  }

  /**
   * Get join requests for a group (for group leaders)
   */
  async getGroupJoinRequests(
    groupId: string,
    userId: string
  ): Promise<GroupServiceResponse<GroupJoinRequestWithUser[]>> {
    try {
      // Check if user is a leader of this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        groupId,
        userId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage group'
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
          referral_id,
          journey_status,
          joined_at,
          created_at,
          user:users(id, first_name, last_name, avatar_url, newcomer),
          referral:referrals(id, group_id, church_id, note, referred_by_user_id, created_at),
          group:groups(id, title)
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false, nullsFirst: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const normalizedRequests = (data || []).map((item) => ({
        ...item,
        user: item.user
          ? { ...item.user, name: getFullName(item.user) }
          : item.user,
      })) as GroupJoinRequestWithUser[];

      return { data: normalizedRequests, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get join requests'),
      };
    }
  }

  /**
   * Get join requests for a user
   */
  async getUserJoinRequests(
    userId: string
  ): Promise<GroupServiceResponse<GroupJoinRequestWithUser[]>> {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(
          `
          id,
          group_id,
          user_id,
          status,
          referral_id,
          journey_status,
          joined_at,
          created_at,
          group:groups(
            id,
            title,
            description,
            meeting_day,
            meeting_time,
            image_url,
            location,
            status,
            service:services(id, name),
            church:churches(id, name)
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false, nullsFirst: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const requests = (data || []) as GroupJoinRequestWithUser[];

      const groupIds = (requests || [])
        .map((request) => request.group?.id)
        .filter((id): id is string => Boolean(id));

      let leadersByGroup: Record<string, any[]> = {};
      if (groupIds.length > 0) {
        const { data: leaderRows } = await supabase
          .from('group_memberships')
          .select(
            `
            group_id,
            role,
            status,
            user:users(id, first_name, last_name)
          `
          )
          .in('group_id', groupIds)
          .in('role', ['leader', 'admin'])
          .eq('status', 'active');

        if (leaderRows) {
          leadersByGroup = leaderRows.reduce<Record<string, any[]>>(
            (acc, row) => {
              if (!row.user || !row.group_id) return acc;
              const name = row.user.first_name?.trim()
                ? row.user.first_name.trim()
                : getFullName(row.user) || 'Group leader';
              const leaderWithName = {
                ...row.user,
                name,
              };
              acc[row.group_id] = acc[row.group_id]
                ? [...acc[row.group_id], leaderWithName]
                : [leaderWithName];
              return acc;
            },
            {}
          );
        }
      }

      const enriched = (requests || []).map((request) => {
        const leaders = leadersByGroup[request.group_id] || [];
        return {
          ...request,
          group_leaders: leaders,
        };
      });

      return { data: enriched, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get user join requests'),
      };
    }
  }

  /**
   * Approve a join request
   */
  async approveJoinRequest(
    requestId: string,
    approverId: string
  ): Promise<GroupServiceResponse<GroupMembership>> {
    try {
      // Find pending membership by id (treat requestId as membership id)
      const { data: membershipRecord, error: requestError } = await supabase
        .from('group_memberships')
        .select('id, group_id, user_id, status, journey_status')
        .eq('id', requestId)
        .eq('status', 'pending')
        .single();

      if (requestError || !membershipRecord) {
        return {
          data: null,
          error: new Error('Pending membership not found or already processed'),
        };
      }

      // Check if approver is a leader of this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        membershipRecord.group_id,
        approverId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage group'
          ),
        };
      }

      // Start a transaction to approve request and create membership
      const updatePayload: Record<string, any> = {
        status: 'active',
        joined_at: new Date().toISOString(),
      };

      if (
        !membershipRecord.journey_status ||
        membershipRecord.journey_status < 3
      ) {
        updatePayload.journey_status = 3;
      }

      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .update(updatePayload)
        .eq('id', requestId)
        .select()
        .single();

      if (membershipError) {
        return { data: null, error: new Error(membershipError.message) };
      }

      // Nothing else to update; membership is the source of truth
      const updateError = null;

      if (updateError) {
        // If updating the request fails, we should rollback the membership
        await supabase
          .from('group_memberships')
          .delete()
          .eq('id', membership.id);

        return { data: null, error: new Error(updateError.message) };
      }

      // Create note for the approval
      try {
        await groupMembershipNotesService.createStatusChangeNote(
          {
            membership_id: requestId,
            group_id: membershipRecord.group_id,
            user_id: membershipRecord.user_id,
            note_type: 'request_approved',
            previous_status: 'pending',
            new_status: 'active',
          },
          approverId
        );
      } catch (noteError) {
        if (__DEV__) console.warn('Failed to create approval note:', noteError);
      }

      // Notify requester of approval
      try {
        const [groupRes, userRes] = await Promise.all([
          supabase
            .from('groups')
            .select('id, title')
            .eq('id', membershipRecord.group_id)
            .single(),
          supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', membershipRecord.user_id)
            .single(),
        ]);

        // Get approver name
        let approvedByName: string | undefined;
        const { data: approver } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', approverId)
          .single();
        approvedByName = getFullName(approver) || undefined;

        if (groupRes.data && userRes.data && approvedByName) {
          await triggerJoinRequestApprovedNotification({
            groupId: groupRes.data.id,
            groupTitle: groupRes.data.title,
            requesterId: userRes.data.id,
            approvedByName,
          });
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to trigger approval notification', e);
      }

      return { data: membership, error: null };
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
   * Update the journey status for a membership (pending or active)
   */
  async updateJourneyStatus(
    membershipId: string,
    leaderId: string,
    journeyStatus: MembershipJourneyStatus | null
  ): Promise<GroupServiceResponse<GroupMembership>> {
    try {
      const { data: membershipRecord, error: fetchError } = await supabase
        .from('group_memberships')
        .select('id, group_id, journey_status, status')
        .eq('id', membershipId)
        .single();

      if (fetchError || !membershipRecord) {
        return {
          data: null,
          error: new Error('Membership not found'),
        };
      }

      const permissionCheck = await permissionService.canManageGroupMembership(
        membershipRecord.group_id,
        leaderId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to update member'
          ),
        };
      }

      const { data, error } = await supabase
        .from('group_memberships')
        .update({ journey_status: journeyStatus })
        .eq('id', membershipId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Create note for the journey status change
      if (journeyStatus !== null) {
        try {
          await groupMembershipNotesService.createJourneyChangeNote(
            {
              membership_id: membershipId,
              group_id: membershipRecord.group_id,
              user_id: membershipRecord.user_id || data.user_id,
              previous_journey_status: membershipRecord.journey_status,
              new_journey_status: journeyStatus,
            },
            leaderId
          );
        } catch (noteError) {
          if (__DEV__)
            console.warn('Failed to create journey status note:', noteError);
        }
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to update member status'),
      };
    }
  }

  /**
   * Archive a join request
   */
  async archiveJoinRequest(
    requestId: string,
    declinerId: string,
    reason?: string,
    notes?: string
  ): Promise<GroupServiceResponse<boolean>> {
    try {
      // Get the pending membership record
      const { data: membershipRecord, error: requestError } = await supabase
        .from('group_memberships')
        .select('id, group_id, user_id, status')
        .eq('id', requestId)
        .eq('status', 'pending')
        .single();

      if (requestError || !membershipRecord) {
        return {
          data: null,
          error: new Error('Pending membership not found or already processed'),
        };
      }

      // Check if decliner is a leader of this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        membershipRecord.group_id,
        declinerId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage group'
          ),
        };
      }

      // Update the membership status to archived
      const { error: updateError } = await supabase
        .from('group_memberships')
        .update({ status: 'archived' })
        .eq('id', requestId);

      if (updateError) {
        return { data: null, error: new Error(updateError.message) };
      }

      // Create note for the archiving
      try {
        await groupMembershipNotesService.createStatusChangeNote(
          {
            membership_id: requestId,
            group_id: membershipRecord.group_id,
            user_id: membershipRecord.user_id,
            note_type: 'request_archived',
            previous_status: 'pending',
            new_status: 'archived',
            reason: reason,
            note_text: notes,
          },
          declinerId
        );
      } catch (noteError) {
        if (__DEV__) console.warn('Failed to create archived note:', noteError);
      }

      // Notify requester of denial
      try {
        const [groupRes, userRes, declinerRes] = await Promise.all([
          supabase
            .from('groups')
            .select('id, title')
            .eq('id', membershipRecord.group_id)
            .single(),
          supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', membershipRecord.user_id)
            .single(),
          supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', declinerId)
            .single(),
        ]);
        const deniedByName = getFullName(declinerRes?.data) || 'A group leader';
        if (groupRes.data && userRes.data) {
          await triggerJoinRequestDeniedNotification({
            groupId: groupRes.data.id,
            groupTitle: groupRes.data.title,
            requesterId: userRes.data.id,
            deniedByName,
          });
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to trigger denial notification', e);
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to archive join request'),
      };
    }
  }

  /**
   * Decline a join request (deprecated - use archiveJoinRequest instead)
   * This method is kept for backward compatibility
   */
  async declineJoinRequest(
    requestId: string,
    declinerId: string
  ): Promise<GroupServiceResponse<boolean>> {
    return this.archiveJoinRequest(requestId, declinerId);
  }

  /**
   * Cancel a join request (by the requester)
   */
  async cancelJoinRequest(
    requestId: string,
    userId: string
  ): Promise<GroupServiceResponse<boolean>> {
    try {
      // Verify the request belongs to the user
      const { data: membershipRecord, error: requestError } = await supabase
        .from('group_memberships')
        .select('id, user_id, status')
        .eq('id', requestId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (requestError || !membershipRecord) {
        return {
          data: null,
          error: new Error(
            'Pending membership not found or cannot be cancelled'
          ),
        };
      }

      // Delete the join request
      const { error: deleteError } = await supabase
        .from('group_memberships')
        .delete()
        .eq('id', requestId);

      if (deleteError) {
        return { data: null, error: new Error(deleteError.message) };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to cancel join request'),
      };
    }
  }

  /**
   * Get contact information for group newcomers (for group leaders)
   */
  async getContactInfo(
    requestId: string,
    leaderId: string
  ): Promise<
    GroupServiceResponse<{ name: string; email?: string; phone?: string }>
  > {
    try {
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('id, group_id, user_id, status')
        .eq('id', requestId)
        .single();

      if (membershipError || !membership) {
        return {
          data: null,
          error: new Error('Membership not found'),
        };
      }

      const permissionCheck = await permissionService.canManageGroupMembership(
        membership.group_id,
        leaderId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason ||
              'Access denied to view contact information'
          ),
        };
      }

      if (!membership.user_id) {
        return {
          data: null,
          error: new Error('User information not available'),
        };
      }

      // Allow leaders to view contact info for pending or active members only
      if (membership.status !== 'active' && membership.status !== 'pending') {
        return {
          data: null,
          error: new Error(
            'Contact information is only available for pending or active group members'
          ),
        };
      }

      const { data: contact, error: contactError } = await supabase.rpc(
        'get_user_contact_admin',
        {
          target_user_id: membership.user_id,
        }
      );

      if (contactError) {
        return {
          data: null,
          error: new Error(contactError.message || 'Unable to fetch contact'),
        };
      }

      const contactInfo: { name: string; email?: string; phone?: string } = {
        name: contact?.name || '',
      };

      // Contact details are always accessible to group leaders
      if (contact?.email) {
        contactInfo.email = contact.email;
      }

      if (contact?.phone) {
        contactInfo.phone = contact.phone;
      }

      return {
        data: contactInfo,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get contact information'),
      };
    }
  }

  /**
   * Initiate contact action (call, email, message) and log it
   */
  async initiateContactAction(
    requestId: string,
    leaderId: string,
    actionType: 'call' | 'email' | 'message',
    contactValue: string
  ): Promise<GroupServiceResponse<boolean>> {
    try {
      // Fetch membership record with status
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select(
          `
          id,
          group_id,
          user_id,
          status,
          user:users(id, first_name, last_name)
        `
        )
        .eq('id', requestId)
        .single();

      if (membershipError || !membership) {
        return {
          data: null,
          error: new Error('Membership not found or contact not allowed'),
        };
      }

      // Check if requester is a leader of this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        membership.group_id,
        leaderId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error('Access denied to contact user'),
        };
      }

      if (!membership.user) {
        return {
          data: null,
          error: new Error('User information not available'),
        };
      }

      // Allow leaders to contact pending or active members
      if (membership.status !== 'active' && membership.status !== 'pending') {
        return {
          data: null,
          error: new Error(
            'Contact actions are only available for pending or active group members'
          ),
        };
      }

      // Contact actions are always allowed for group leaders
      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to initiate contact action'),
      };
    }
  }
}

// Export singleton instance
export const joinRequestService = new JoinRequestService();
