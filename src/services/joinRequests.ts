import { supabase } from './supabase';
import { permissionService } from './permissions';
import type {
  GroupJoinRequest,
  GroupJoinRequestWithUser,
  GroupMembership,
} from '../types/database';

export interface GroupServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export interface CreateJoinRequestData {
  group_id: string;
  user_id: string;
  contact_consent: boolean;
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
            error: new Error('User already has a pending request for this group'),
          };
        }
      }

      // Check for existing join request
      const { data: existingRequest } = await supabase
        .from('group_join_requests')
        .select('id, status')
        .eq('group_id', requestData.group_id)
        .eq('user_id', requestData.user_id)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        return {
          data: null,
          error: new Error('User already has a pending join request for this group'),
        };
      }

      // Create the join request
      const { data, error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: requestData.group_id,
          user_id: requestData.user_id,
          contact_consent: requestData.contact_consent,
          message: requestData.message,
          status: 'pending',
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
          error instanceof Error ? error : new Error('Failed to create join request'),
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
      const permissionCheck = await permissionService.canManageGroup(groupId, userId);
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to manage group'
          ),
        };
      }

      const { data, error } = await supabase
        .from('group_join_requests')
        .select(
          `
          *,
          user:users(id, name, avatar_url, email),
          group:groups(id, title)
        `
        )
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

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
        .from('group_join_requests')
        .select(
          `
          *,
          group:groups(id, title, description, meeting_day, meeting_time)
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

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
      // Get the join request details
      const { data: joinRequest, error: requestError } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('id', requestId)
        .eq('status', 'pending')
        .single();

      if (requestError || !joinRequest) {
        return {
          data: null,
          error: new Error('Join request not found or already processed'),
        };
      }

      // Check if approver is a leader of this group
      const permissionCheck = await permissionService.canManageGroup(
        joinRequest.group_id,
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
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: joinRequest.group_id,
          user_id: joinRequest.user_id,
          role: 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (membershipError) {
        return { data: null, error: new Error(membershipError.message) };
      }

      // Update the join request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        // If updating the request fails, we should rollback the membership
        await supabase
          .from('group_memberships')
          .delete()
          .eq('id', membership.id);
        
        return { data: null, error: new Error(updateError.message) };
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
   * Decline a join request
   */
  async declineJoinRequest(
    requestId: string,
    declinerId: string
  ): Promise<GroupServiceResponse<boolean>> {
    try {
      // Get the join request details
      const { data: joinRequest, error: requestError } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('id', requestId)
        .eq('status', 'pending')
        .single();

      if (requestError || !joinRequest) {
        return {
          data: null,
          error: new Error('Join request not found or already processed'),
        };
      }

      // Check if decliner is a leader of this group
      const permissionCheck = await permissionService.canManageGroup(
        joinRequest.group_id,
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

      // Update the join request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        return { data: null, error: new Error(updateError.message) };
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
      const { data: joinRequest, error: requestError } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (requestError || !joinRequest) {
        return {
          data: null,
          error: new Error('Join request not found or cannot be cancelled'),
        };
      }

      // Delete the join request
      const { error: deleteError } = await supabase
        .from('group_join_requests')
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
   * Get contact information for approved join requests (for group leaders)
   */
  async getContactInfo(
    requestId: string,
    leaderId: string
  ): Promise<GroupServiceResponse<{ name: string; email: string; phone?: string }>> {
    try {
      // Get the join request with user details
      const { data: joinRequest, error: requestError } = await supabase
        .from('group_join_requests')
        .select(
          `
          *,
          user:users(id, name, email, phone),
          group:groups(id)
        `
        )
        .eq('id', requestId)
        .eq('status', 'approved')
        .eq('contact_consent', true)
        .single();

      if (requestError || !joinRequest) {
        return {
          data: null,
          error: new Error('Join request not found or contact not consented'),
        };
      }

      // Check if requester is a leader of this group
      const permissionCheck = await permissionService.canManageGroup(
        joinRequest.group_id,
        leaderId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to view contact information'
          ),
        };
      }

      if (!joinRequest.user) {
        return {
          data: null,
          error: new Error('User information not available'),
        };
      }

      return {
        data: {
          name: joinRequest.user.name,
          email: joinRequest.user.email,
          phone: joinRequest.user.phone,
        },
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
}

// Export singleton instance
export const joinRequestService = new JoinRequestService();