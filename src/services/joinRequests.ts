import { supabase } from './supabase';
import { permissionService } from './permissions';
import { contactAuditService } from './contactAudit';
import {
  triggerJoinRequestApprovedNotification,
  triggerJoinRequestDeniedNotification,
  triggerJoinRequestReceivedNotification,
} from './notifications';
import { getFullName } from '../utils/name';
import type {
  ContactPrivacySettings,
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
  contact_consent?: boolean;
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
      }

      // No separate join requests table. Create/ensure a pending membership instead
      const { data, error } = await supabase
        .from('group_memberships')
        .insert({
          group_id: requestData.group_id,
          user_id: requestData.user_id,
          role: 'member',
          status: 'pending',
          // joined_at is set when request is approved
        })
        .select()
        .single();

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
        .order('joined_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const normalizedRequests = (data || []).map((item) => ({
        ...item,
        user: item.user
          ? { ...item.user, name: getFullName(item.user) }
          : item.user,
      })) as GroupJoinRequestWithUser[];

      const requestsWithConsent =
        await this.attachContactConsent(normalizedRequests);

      return { data: requestsWithConsent, error: null };
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
          group:groups(id, title, description, meeting_day, meeting_time)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const requestsWithConsent = await this.attachContactConsent(
        (data || []) as GroupJoinRequestWithUser[]
      );

      return { data: requestsWithConsent, error: null };
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
   * Decline a join request
   */
  async declineJoinRequest(
    requestId: string,
    declinerId: string
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

      // Update the join request status (delete pending membership)
      const { error: updateError } = await supabase
        .from('group_memberships')
        .delete()
        .eq('id', requestId);

      if (updateError) {
        return { data: null, error: new Error(updateError.message) };
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
            : new Error('Failed to decline join request'),
      };
    }
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

      const contactFields: string[] = [];

      if (contact?.email) {
        const emailAllowed = await contactAuditService.canShareContact(
          membership.user_id,
          'email',
          leaderId,
          membership.group_id
        );

        if (emailAllowed.error) {
          return { data: null, error: emailAllowed.error };
        }

        if (emailAllowed.data === true) {
          contactInfo.email = contact.email;
          contactFields.push('email');
        }
      }

      if (contact?.phone) {
        const phoneAllowed = await contactAuditService.canShareContact(
          membership.user_id,
          'phone',
          leaderId,
          membership.group_id
        );

        if (phoneAllowed.error) {
          return { data: null, error: phoneAllowed.error };
        }

        if (phoneAllowed.data === true) {
          contactInfo.phone = contact.phone;
          contactFields.push('phone');
        }
      }

      if (contactFields.length > 0) {
        await contactAuditService.logContactAccess({
          user_id: membership.user_id,
          accessor_id: leaderId,
          group_id: membership.group_id,
          join_request_id: requestId,
          access_type: 'view',
          contact_fields: contactFields,
        });
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

      // Check global privacy settings for the specific contact type
      const contactType = actionType === 'call' ? 'phone' : 'email';
      const canContact = await contactAuditService.canShareContact(
        membership.user.id,
        contactType,
        leaderId,
        membership.group_id
      );

      if (!canContact.data) {
        return {
          data: null,
          error: new Error(
            `Contact via ${actionType} not allowed by user privacy settings`
          ),
        };
      }

      // Log the contact action
      await contactAuditService.logContactAccess({
        user_id: membership.user.id,
        accessor_id: leaderId,
        group_id: membership.group_id,
        join_request_id: requestId,
        access_type: actionType,
        contact_fields: [contactType],
      });

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

  private async attachContactConsent<
    T extends { user_id: string; contact_consent?: boolean | null },
  >(records: T[]): Promise<T[]> {
    if (!records || records.length === 0) {
      return records;
    }

    const userIds = Array.from(
      new Set(records.map((record) => record.user_id).filter(Boolean))
    );

    if (userIds.length === 0) {
      return records;
    }

    type PrivacySettingRecord = Pick<
      ContactPrivacySettings,
      'user_id' | 'allow_contact_by_leaders'
    >;

    let privacySettings: PrivacySettingRecord[] = [];

    const { data, error } = await supabase
      .from('contact_privacy_settings')
      .select('user_id, allow_contact_by_leaders')
      .in('user_id', userIds);

    if (error) {
      console.error(
        'Failed to fetch contact privacy settings for join requests:',
        error
      );

      return records.map(
        (record) =>
          ({
            ...record,
            contact_consent: false,
          }) as T
      );
    }

    if (data) {
      privacySettings = data as PrivacySettingRecord[];
    }

    const privacyMap = new Map<string, boolean>(
      privacySettings.map((setting) => [
        setting.user_id,
        setting.allow_contact_by_leaders === true,
      ])
    );

    return records.map((record) => {
      const consent = privacyMap.get(record.user_id);

      return {
        ...record,
        contact_consent: consent ?? true,
      } as T;
    });
  }
}

// Export singleton instance
export const joinRequestService = new JoinRequestService();
