import { supabase } from './supabase';
import { permissionService } from './permissions';
import { getFullName } from '../utils/name';
import type {
  GroupMembershipNote,
  GroupMembershipNoteWithUser,
  GroupMembershipNoteType,
  MembershipJourneyStatus,
} from '../types/database';

export interface GroupServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export interface CreateManualNoteData {
  membership_id: string;
  group_id: string;
  user_id: string;
  note_text: string;
}

export interface CreateStatusChangeNoteData {
  membership_id: string;
  group_id: string;
  user_id: string;
  note_type: 'request_approved' | 'request_archived' | 'member_left';
  previous_status: 'active' | 'inactive' | 'pending' | 'archived';
  new_status: 'active' | 'inactive' | 'pending' | 'archived';
  reason?: string;
  note_text?: string;
}

export interface CreateJourneyChangeNoteData {
  membership_id: string;
  group_id: string;
  user_id: string;
  previous_journey_status: MembershipJourneyStatus | null;
  new_journey_status: MembershipJourneyStatus;
  note_text?: string;
}

export interface CreateRoleChangeNoteData {
  membership_id: string;
  group_id: string;
  user_id: string;
  previous_role: 'member' | 'leader' | 'admin';
  new_role: 'member' | 'leader' | 'admin';
  note_text?: string;
}

export class GroupMembershipNotesService {
  /**
   * Create a manual note for a group member/request
   */
  async createManualNote(
    noteData: CreateManualNoteData,
    leaderId: string
  ): Promise<GroupServiceResponse<GroupMembershipNote>> {
    try {
      // Check if leader has permission to manage this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        noteData.group_id,
        leaderId
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
        .from('group_membership_notes')
        .insert({
          membership_id: noteData.membership_id,
          group_id: noteData.group_id,
          user_id: noteData.user_id,
          created_by_user_id: leaderId,
          note_type: 'manual',
          note_text: noteData.note_text,
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
            : new Error('Failed to create manual note'),
      };
    }
  }

  /**
   * Create a status change note (auto-generated when status changes)
   */
  async createStatusChangeNote(
    noteData: CreateStatusChangeNoteData,
    leaderId: string
  ): Promise<GroupServiceResponse<GroupMembershipNote>> {
    try {
      // Check if leader has permission to manage this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        noteData.group_id,
        leaderId
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
        .from('group_membership_notes')
        .insert({
          membership_id: noteData.membership_id,
          group_id: noteData.group_id,
          user_id: noteData.user_id,
          created_by_user_id: leaderId,
          note_type: noteData.note_type,
          previous_status: noteData.previous_status,
          new_status: noteData.new_status,
          reason: noteData.reason || null,
          note_text: noteData.note_text || null,
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
            : new Error('Failed to create status change note'),
      };
    }
  }

  /**
   * Create a journey status change note
   */
  async createJourneyChangeNote(
    noteData: CreateJourneyChangeNoteData,
    leaderId: string
  ): Promise<GroupServiceResponse<GroupMembershipNote>> {
    try {
      // Check if leader has permission to manage this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        noteData.group_id,
        leaderId
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
        .from('group_membership_notes')
        .insert({
          membership_id: noteData.membership_id,
          group_id: noteData.group_id,
          user_id: noteData.user_id,
          created_by_user_id: leaderId,
          note_type: 'journey_status_change',
          previous_journey_status: noteData.previous_journey_status,
          new_journey_status: noteData.new_journey_status,
          note_text: noteData.note_text || null,
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
            : new Error('Failed to create journey change note'),
      };
    }
  }

  /**
   * Create a role change note
   */
  async createRoleChangeNote(
    noteData: CreateRoleChangeNoteData,
    leaderId: string
  ): Promise<GroupServiceResponse<GroupMembershipNote>> {
    try {
      // Check if leader has permission to manage this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        noteData.group_id,
        leaderId
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
        .from('group_membership_notes')
        .insert({
          membership_id: noteData.membership_id,
          group_id: noteData.group_id,
          user_id: noteData.user_id,
          created_by_user_id: leaderId,
          note_type: 'role_change',
          previous_role: noteData.previous_role,
          new_role: noteData.new_role,
          note_text: noteData.note_text || null,
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
            : new Error('Failed to create role change note'),
      };
    }
  }

  /**
   * Get all notes for a specific membership
   */
  async getMembershipNotes(
    membershipId: string,
    leaderId: string
  ): Promise<GroupServiceResponse<GroupMembershipNoteWithUser[]>> {
    try {
      // First get the membership to check group access
      const { data: membership, error: membershipError } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('id', membershipId)
        .single();

      if (membershipError || !membership) {
        return {
          data: null,
          error: new Error('Membership not found'),
        };
      }

      // Check if leader has permission to view notes for this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        membership.group_id,
        leaderId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to view notes'
          ),
        };
      }

      const { data, error } = await supabase
        .from('group_membership_notes')
        .select(
          `
          *,
          created_by:users!created_by_user_id(id, first_name, last_name, avatar_url),
          user:users!user_id(id, first_name, last_name, avatar_url)
        `
        )
        .eq('membership_id', membershipId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Normalize names
      const notesWithNames = (data || []).map((note: any) => ({
        ...note,
        created_by: note.created_by
          ? { ...note.created_by, name: getFullName(note.created_by) }
          : note.created_by,
        user: note.user
          ? { ...note.user, name: getFullName(note.user) }
          : note.user,
      })) as GroupMembershipNoteWithUser[];

      return { data: notesWithNames, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get membership notes'),
      };
    }
  }

  /**
   * Get all notes for a specific group
   */
  async getGroupNotes(
    groupId: string,
    leaderId: string
  ): Promise<GroupServiceResponse<GroupMembershipNoteWithUser[]>> {
    try {
      // Check if leader has permission to view notes for this group
      const permissionCheck = await permissionService.canManageGroupMembership(
        groupId,
        leaderId
      );
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to view notes'
          ),
        };
      }

      const { data, error } = await supabase
        .from('group_membership_notes')
        .select(
          `
          *,
          created_by:users!created_by_user_id(id, first_name, last_name, avatar_url),
          user:users!user_id(id, first_name, last_name, avatar_url)
        `
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Normalize names
      const notesWithNames = (data || []).map((note: any) => ({
        ...note,
        created_by: note.created_by
          ? { ...note.created_by, name: getFullName(note.created_by) }
          : note.created_by,
        user: note.user
          ? { ...note.user, name: getFullName(note.user) }
          : note.user,
      })) as GroupMembershipNoteWithUser[];

      return { data: notesWithNames, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to get group notes'),
      };
    }
  }

  /**
   * Delete a manual note (only allowed by the creator or group admin)
   */
  async deleteNote(
    noteId: string,
    userId: string
  ): Promise<GroupServiceResponse<boolean>> {
    try {
      // Get the note to check permissions
      const { data: note, error: noteError } = await supabase
        .from('group_membership_notes')
        .select('id, group_id, created_by_user_id, note_type')
        .eq('id', noteId)
        .single();

      if (noteError || !note) {
        return {
          data: null,
          error: new Error('Note not found'),
        };
      }

      // Only manual notes can be deleted
      if (note.note_type !== 'manual') {
        return {
          data: null,
          error: new Error('Only manual notes can be deleted'),
        };
      }

      // Check if user is the creator or a group admin
      const isCreator = note.created_by_user_id === userId;
      const permissionCheck = await permissionService.canManageGroupMembership(
        note.group_id,
        userId
      );

      if (!isCreator && !permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error('Access denied to delete note'),
        };
      }

      const { error: deleteError } = await supabase
        .from('group_membership_notes')
        .delete()
        .eq('id', noteId);

      if (deleteError) {
        return { data: null, error: new Error(deleteError.message) };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to delete note'),
      };
    }
  }
}

// Export singleton instance
export const groupMembershipNotesService = new GroupMembershipNotesService();

