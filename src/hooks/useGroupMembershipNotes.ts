import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupMembershipNotesService } from '../services/groupMembershipNotes';
import type {
  CreateManualNoteData,
  CreateStatusChangeNoteData,
  CreateJourneyChangeNoteData,
  CreateRoleChangeNoteData,
} from '../services/groupMembershipNotes';

// Query keys
export const noteKeys = {
  all: ['group_membership_notes'] as const,
  membership: (membershipId: string) =>
    [...noteKeys.all, 'membership', membershipId] as const,
  group: (groupId: string) => [...noteKeys.all, 'group', groupId] as const,
};

/**
 * Get notes for a specific membership
 */
export function useMembershipNotes(membershipId: string | undefined, leaderId: string | undefined) {
  return useQuery({
    queryKey: noteKeys.membership(membershipId || ''),
    queryFn: async () => {
      if (!membershipId || !leaderId) {
        throw new Error('Membership ID and leader ID are required');
      }
      const { data, error } = await groupMembershipNotesService.getMembershipNotes(
        membershipId,
        leaderId
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!membershipId && !!leaderId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get notes for a group
 */
export function useGroupNotes(groupId: string | undefined, leaderId: string | undefined) {
  return useQuery({
    queryKey: noteKeys.group(groupId || ''),
    queryFn: async () => {
      if (!groupId || !leaderId) {
        throw new Error('Group ID and leader ID are required');
      }
      const { data, error } = await groupMembershipNotesService.getGroupNotes(
        groupId,
        leaderId
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!groupId && !!leaderId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Create a manual note
 */
export function useCreateManualNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteData,
      leaderId,
    }: {
      noteData: CreateManualNoteData;
      leaderId: string;
    }) => {
      const { data, error } = await groupMembershipNotesService.createManualNote(
        noteData,
        leaderId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate membership notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.membership(variables.noteData.membership_id),
      });
      // Invalidate group notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.group(variables.noteData.group_id),
      });
    },
  });
}

/**
 * Create a status change note
 */
export function useCreateStatusChangeNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteData,
      leaderId,
    }: {
      noteData: CreateStatusChangeNoteData;
      leaderId: string;
    }) => {
      const { data, error } = await groupMembershipNotesService.createStatusChangeNote(
        noteData,
        leaderId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate membership notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.membership(variables.noteData.membership_id),
      });
      // Invalidate group notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.group(variables.noteData.group_id),
      });
    },
  });
}

/**
 * Create a journey change note
 */
export function useCreateJourneyChangeNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteData,
      leaderId,
    }: {
      noteData: CreateJourneyChangeNoteData;
      leaderId: string;
    }) => {
      const { data, error } = await groupMembershipNotesService.createJourneyChangeNote(
        noteData,
        leaderId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate membership notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.membership(variables.noteData.membership_id),
      });
      // Invalidate group notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.group(variables.noteData.group_id),
      });
    },
  });
}

/**
 * Create a role change note
 */
export function useCreateRoleChangeNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteData,
      leaderId,
    }: {
      noteData: CreateRoleChangeNoteData;
      leaderId: string;
    }) => {
      const { data, error } = await groupMembershipNotesService.createRoleChangeNote(
        noteData,
        leaderId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate membership notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.membership(variables.noteData.membership_id),
      });
      // Invalidate group notes
      queryClient.invalidateQueries({
        queryKey: noteKeys.group(variables.noteData.group_id),
      });
    },
  });
}

/**
 * Delete a note
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      userId,
    }: {
      noteId: string;
      userId: string;
    }) => {
      const { data, error } = await groupMembershipNotesService.deleteNote(
        noteId,
        userId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all notes queries
      queryClient.invalidateQueries({
        queryKey: noteKeys.all,
      });
    },
  });
}

