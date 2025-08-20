import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useUpdateGroupDetails,
  usePromoteToLeader,
  useDemoteFromLeader,
  useRemoveMember,
  useGroupLeaderActions,
} from '../useGroupLeaderActions';
import { groupCreationService } from '../../services/groupCreation';

// Mock the group creation service
jest.mock('../../services/groupCreation');

const mockGroupCreationService = groupCreationService as jest.Mocked<
  typeof groupCreationService
>;

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useGroupLeaderActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useUpdateGroupDetails', () => {
    it('successfully updates group details', async () => {
      const mockUpdatedGroup = {
        id: 'group-1',
        title: 'Updated Group',
        description: 'Updated description',
        meeting_day: 'Monday',
        meeting_time: '19:00',
        location: 'New Location',
      };

      mockGroupCreationService.updateGroupDetails.mockResolvedValue({
        data: mockUpdatedGroup,
        error: null,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateGroupDetails(), { wrapper });

      const updateData = {
        groupId: 'group-1',
        updates: {
          title: 'Updated Group',
          description: 'Updated description',
          meeting_day: 'Monday',
          meeting_time: '19:00',
          location: 'New Location',
        },
        userId: 'user-1',
      };

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGroupCreationService.updateGroupDetails).toHaveBeenCalledWith(
        'group-1',
        updateData.updates,
        'user-1'
      );
    });

    it('handles update group details error', async () => {
      mockGroupCreationService.updateGroupDetails.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateGroupDetails(), { wrapper });

      const updateData = {
        groupId: 'group-1',
        updates: { title: 'Updated Group' },
        userId: 'user-1',
      };

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Update failed'));
    });
  });

  describe('usePromoteToLeader', () => {
    it('successfully promotes member to leader', async () => {
      const mockMembership = {
        id: 'membership-1',
        group_id: 'group-1',
        user_id: 'user-2',
        role: 'leader' as const,
        status: 'active' as const,
        joined_at: '2024-01-01T00:00:00Z',
      };

      mockGroupCreationService.promoteToLeader.mockResolvedValue({
        data: mockMembership,
        error: null,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePromoteToLeader(), { wrapper });

      const promoteData = {
        groupId: 'group-1',
        userId: 'user-2',
        promoterId: 'user-1',
      };

      result.current.mutate(promoteData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGroupCreationService.promoteToLeader).toHaveBeenCalledWith(
        'group-1',
        'user-2',
        'user-1'
      );
    });

    it('handles promote to leader error', async () => {
      mockGroupCreationService.promoteToLeader.mockResolvedValue({
        data: null,
        error: new Error('Promotion failed'),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePromoteToLeader(), { wrapper });

      const promoteData = {
        groupId: 'group-1',
        userId: 'user-2',
        promoterId: 'user-1',
      };

      result.current.mutate(promoteData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Promotion failed'));
    });
  });

  describe('useDemoteFromLeader', () => {
    it('successfully demotes leader to member', async () => {
      const mockMembership = {
        id: 'membership-1',
        group_id: 'group-1',
        user_id: 'user-2',
        role: 'member' as const,
        status: 'active' as const,
        joined_at: '2024-01-01T00:00:00Z',
      };

      mockGroupCreationService.demoteFromLeader.mockResolvedValue({
        data: mockMembership,
        error: null,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDemoteFromLeader(), { wrapper });

      const demoteData = {
        groupId: 'group-1',
        userId: 'user-2',
        demoterId: 'user-1',
      };

      result.current.mutate(demoteData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGroupCreationService.demoteFromLeader).toHaveBeenCalledWith(
        'group-1',
        'user-2',
        'user-1'
      );
    });

    it('handles demote from leader error', async () => {
      mockGroupCreationService.demoteFromLeader.mockResolvedValue({
        data: null,
        error: new Error('Demotion failed'),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDemoteFromLeader(), { wrapper });

      const demoteData = {
        groupId: 'group-1',
        userId: 'user-2',
        demoterId: 'user-1',
      };

      result.current.mutate(demoteData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Demotion failed'));
    });
  });

  describe('useRemoveMember', () => {
    it('successfully removes member from group', async () => {
      mockGroupCreationService.removeMember.mockResolvedValue({
        data: true,
        error: null,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRemoveMember(), { wrapper });

      const removeData = {
        groupId: 'group-1',
        userId: 'user-2',
        removerId: 'user-1',
      };

      result.current.mutate(removeData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGroupCreationService.removeMember).toHaveBeenCalledWith(
        'group-1',
        'user-2',
        'user-1'
      );
    });

    it('handles remove member error', async () => {
      mockGroupCreationService.removeMember.mockResolvedValue({
        data: null,
        error: new Error('Removal failed'),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRemoveMember(), { wrapper });

      const removeData = {
        groupId: 'group-1',
        userId: 'user-2',
        removerId: 'user-1',
      };

      result.current.mutate(removeData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Removal failed'));
    });
  });

  describe('useGroupLeaderActions', () => {
    it('returns all group leader action hooks', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useGroupLeaderActions(), { wrapper });

      expect(result.current).toHaveProperty('updateGroupDetailsMutation');
      expect(result.current).toHaveProperty('promoteToLeaderMutation');
      expect(result.current).toHaveProperty('demoteFromLeaderMutation');
      expect(result.current).toHaveProperty('removeMemberMutation');

      // Verify all mutations are functions
      expect(typeof result.current.updateGroupDetailsMutation.mutate).toBe(
        'function'
      );
      expect(typeof result.current.promoteToLeaderMutation.mutate).toBe(
        'function'
      );
      expect(typeof result.current.demoteFromLeaderMutation.mutate).toBe(
        'function'
      );
      expect(typeof result.current.removeMemberMutation.mutate).toBe(
        'function'
      );
    });
  });
});
