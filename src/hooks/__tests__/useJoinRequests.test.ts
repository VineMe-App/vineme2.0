import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateJoinRequest,
  useApproveJoinRequest,
  useDeclineJoinRequest,
  useGroupJoinRequests,
  useUserJoinRequests,
} from '../useJoinRequests';
import { joinRequestService } from '../../services/joinRequests';

// Mock the service
jest.mock('../../services/joinRequests');
const mockJoinRequestService = joinRequestService as jest.Mocked<
  typeof joinRequestService
>;

// Test wrapper with QueryClient
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

describe('useJoinRequests hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCreateJoinRequest', () => {
    it('should create join request successfully', async () => {
      const mockJoinRequest = {
        id: 'request-1',
        group_id: 'group-1',
        user_id: 'user-1',
        contact_consent: true,
        message: 'Test message',
        status: 'pending' as const,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockJoinRequestService.createJoinRequest.mockResolvedValue({
        data: mockJoinRequest,
        error: null,
      });

      const { result } = renderHook(() => useCreateJoinRequest(), {
        wrapper: createWrapper(),
      });

      const requestData = {
        group_id: 'group-1',
        user_id: 'user-1',
        contact_consent: true,
        message: 'Test message',
      };

      result.current.mutate(requestData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockJoinRequestService.createJoinRequest).toHaveBeenCalledWith(
        requestData
      );
      expect(result.current.data).toEqual(mockJoinRequest);
    });

    it('should handle create join request error', async () => {
      const error = new Error('User already has a pending request');
      mockJoinRequestService.createJoinRequest.mockResolvedValue({
        data: null,
        error,
      });

      const { result } = renderHook(() => useCreateJoinRequest(), {
        wrapper: createWrapper(),
      });

      const requestData = {
        group_id: 'group-1',
        user_id: 'user-1',
        contact_consent: true,
      };

      result.current.mutate(requestData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useApproveJoinRequest', () => {
    it('should approve join request successfully', async () => {
      const mockMembership = {
        id: 'membership-1',
        group_id: 'group-1',
        user_id: 'user-1',
        role: 'member' as const,
        status: 'active' as const,
        joined_at: '2024-01-01T00:00:00Z',
      };

      mockJoinRequestService.approveJoinRequest.mockResolvedValue({
        data: mockMembership,
        error: null,
      });

      const { result } = renderHook(() => useApproveJoinRequest(), {
        wrapper: createWrapper(),
      });

      const approvalData = {
        requestId: 'request-1',
        approverId: 'leader-1',
        groupId: 'group-1',
      };

      result.current.mutate(approvalData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockJoinRequestService.approveJoinRequest).toHaveBeenCalledWith(
        'request-1',
        'leader-1'
      );
      expect(result.current.data).toEqual(mockMembership);
    });

    it('should handle approve join request error', async () => {
      const error = new Error('Access denied to manage group');
      mockJoinRequestService.approveJoinRequest.mockResolvedValue({
        data: null,
        error,
      });

      const { result } = renderHook(() => useApproveJoinRequest(), {
        wrapper: createWrapper(),
      });

      const approvalData = {
        requestId: 'request-1',
        approverId: 'user-1',
        groupId: 'group-1',
      };

      result.current.mutate(approvalData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeclineJoinRequest', () => {
    it('should decline join request successfully', async () => {
      mockJoinRequestService.declineJoinRequest.mockResolvedValue({
        data: true,
        error: null,
      });

      const { result } = renderHook(() => useDeclineJoinRequest(), {
        wrapper: createWrapper(),
      });

      const declineData = {
        requestId: 'request-1',
        declinerId: 'leader-1',
        groupId: 'group-1',
      };

      result.current.mutate(declineData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockJoinRequestService.declineJoinRequest).toHaveBeenCalledWith(
        'request-1',
        'leader-1'
      );
      expect(result.current.data).toBe(true);
    });
  });

  describe('useGroupJoinRequests', () => {
    it('should fetch group join requests successfully', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          group_id: 'group-1',
          user_id: 'user-1',
          contact_consent: true,
          status: 'pending' as const,
          created_at: '2024-01-01T00:00:00Z',
          user: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            avatar_url: null,
          },
        },
      ];

      mockJoinRequestService.getGroupJoinRequests.mockResolvedValue({
        data: mockRequests,
        error: null,
      });

      const { result } = renderHook(
        () => useGroupJoinRequests('group-1', 'leader-1'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockJoinRequestService.getGroupJoinRequests).toHaveBeenCalledWith(
        'group-1',
        'leader-1'
      );
      expect(result.current.data).toEqual(mockRequests);
    });

    it('should not fetch when groupId or userId is undefined', () => {
      const { result } = renderHook(
        () => useGroupJoinRequests(undefined, 'leader-1'),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(
        mockJoinRequestService.getGroupJoinRequests
      ).not.toHaveBeenCalled();
    });
  });

  describe('useUserJoinRequests', () => {
    it('should fetch user join requests successfully', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          group_id: 'group-1',
          user_id: 'user-1',
          contact_consent: true,
          status: 'pending' as const,
          created_at: '2024-01-01T00:00:00Z',
          group: {
            id: 'group-1',
            title: 'Bible Study Group',
            description: 'Weekly Bible study',
            meeting_day: 'Wednesday',
            meeting_time: '7:00 PM',
          },
        },
      ];

      mockJoinRequestService.getUserJoinRequests.mockResolvedValue({
        data: mockRequests,
        error: null,
      });

      const { result } = renderHook(() => useUserJoinRequests('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockJoinRequestService.getUserJoinRequests).toHaveBeenCalledWith(
        'user-1'
      );
      expect(result.current.data).toEqual(mockRequests);
    });

    it('should not fetch when userId is undefined', () => {
      const { result } = renderHook(() => useUserJoinRequests(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockJoinRequestService.getUserJoinRequests).not.toHaveBeenCalled();
    });
  });
});
