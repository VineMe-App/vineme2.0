import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupCreationService } from '../services/groupCreation';
import { groupKeys } from './useGroups';
import { noteKeys } from './useGroupMembershipNotes';
import type { UpdateGroupData } from '../services/admin';

/**
 * Hook for updating group details
 */
export const useUpdateGroupDetails = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      updates,
      userId,
    }: {
      groupId: string;
      updates: UpdateGroupData;
      userId: string;
    }) => {
      const { data, error } = await groupCreationService.updateGroupDetails(
        groupId,
        updates,
        userId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, { groupId }) => {
      // Invalidate group data to refetch with updated details
      queryClient.invalidateQueries({ queryKey: groupKeys.byId(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
    onError: (error) => {
      console.error('Failed to update group details:', error);
    },
  });
};

/**
 * Hook for promoting a member to leader
 */
export const usePromoteToLeader = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      promoterId,
    }: {
      groupId: string;
      userId: string;
      promoterId: string;
    }) => {
      const { data, error } = await groupCreationService.promoteToLeader(
        groupId,
        userId,
        promoterId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, { groupId }) => {
      // Invalidate group members to refetch with updated roles
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.byId(groupId) });
      // Invalidate notes queries (since we create a role change note)
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
    onError: (error) => {
      console.error('Failed to promote to leader:', error);
    },
  });
};

/**
 * Hook for demoting a leader to member
 */
export const useDemoteFromLeader = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      demoterId,
    }: {
      groupId: string;
      userId: string;
      demoterId: string;
    }) => {
      const { data, error } = await groupCreationService.demoteFromLeader(
        groupId,
        userId,
        demoterId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, { groupId }) => {
      // Invalidate group members to refetch with updated roles
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.byId(groupId) });
      // Invalidate notes queries (since we create a role change note)
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
    onError: (error) => {
      console.error('Failed to demote from leader:', error);
    },
  });
};

/**
 * Hook for removing a member from the group
 */
export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      removerId,
    }: {
      groupId: string;
      userId: string;
      removerId: string;
    }) => {
      const { data, error } = await groupCreationService.removeMember(
        groupId,
        userId,
        removerId
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, { groupId, userId }) => {
      // Invalidate group members to refetch without removed member
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.byId(groupId) });
      // Also invalidate all memberships query (for archive view)
      queryClient.invalidateQueries({
        queryKey: [...groupKeys.members(groupId), 'all'],
      });
      // Invalidate notes queries (since we create a member removal note)
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
    onError: (error) => {
      console.error('Failed to remove member:', error);
    },
  });
};

/**
 * Combined hook for all group leader actions
 */
export const useGroupLeaderActions = () => {
  const updateGroupDetailsMutation = useUpdateGroupDetails();
  const promoteToLeaderMutation = usePromoteToLeader();
  const demoteFromLeaderMutation = useDemoteFromLeader();
  const removeMemberMutation = useRemoveMember();

  return {
    updateGroupDetailsMutation,
    promoteToLeaderMutation,
    demoteFromLeaderMutation,
    removeMemberMutation,
  };
};
