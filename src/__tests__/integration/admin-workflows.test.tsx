import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ManageGroupsScreen from '@/app/admin/manage-groups';
import ManageUsersScreen from '@/app/admin/manage-users';
import * as adminService from '@/services/admin';
import * as adminServiceWrapper from '@/services/adminServiceWrapper';
import * as permissionService from '@/services/permissions';

// Mock services
jest.mock('@/services/admin');
jest.mock('@/services/adminServiceWrapper');
jest.mock('@/services/permissions');

const mockAdminService = adminService as jest.Mocked<typeof adminService>;
const mockAdminServiceWrapper = adminServiceWrapper as jest.Mocked<
  typeof adminServiceWrapper
>;
const mockPermissionService = permissionService as jest.Mocked<
  typeof permissionService
>;

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => ({}),
}));

// Mock auth store
const mockAuthStore = {
  user: {
    id: 'admin-1',
    email: 'admin@church.com',
    name: 'Church Admin',
    church_id: 'church-1',
    roles: ['church_admin'],
  },
  isAuthenticated: true,
  isLoading: false,
};

jest.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

// Mock permissions hook
jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: jest.fn().mockReturnValue(true),
    canAccessChurchData: jest.fn().mockReturnValue(true),
    canManageGroup: jest.fn().mockReturnValue(true),
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('Admin Workflows Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Church Admin Group Management Workflow', () => {
    const mockGroups = [
      {
        id: 'group-1',
        title: 'Pending Bible Study',
        description: 'Weekly Bible study group',
        status: 'pending',
        church_id: 'church-1',
        member_count: 0,
        creator: { id: 'user-1', name: 'John Doe' },
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'group-2',
        title: 'Active Prayer Group',
        description: 'Weekly prayer meeting',
        status: 'approved',
        church_id: 'church-1',
        member_count: 8,
        creator: { id: 'user-2', name: 'Jane Smith' },
        created_at: '2023-12-01T00:00:00Z',
      },
    ];

    it('should complete full group approval workflow', async () => {
      // Mock initial groups fetch
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: mockGroups,
          error: null,
        }
      );

      // Mock approval action
      mockAdminServiceWrapper.adminServiceWrapper.approveGroup.mockResolvedValue(
        {
          data: { ...mockGroups[0], status: 'approved' },
          error: null,
        }
      );

      renderWithProviders(<ManageGroupsScreen />);

      // Wait for groups to load
      await waitFor(() => {
        expect(screen.getByText('Pending Bible Study')).toBeTruthy();
        expect(screen.getByText('Active Prayer Group')).toBeTruthy();
      });

      // Find and click approve button for pending group
      const approveButton = screen.getByTestId('approve-group-group-1');
      fireEvent.press(approveButton);

      // Verify approval was called
      await waitFor(() => {
        expect(
          mockAdminServiceWrapper.adminServiceWrapper.approveGroup
        ).toHaveBeenCalledWith('group-1', 'admin-1', undefined);
      });

      // Verify success feedback
      await waitFor(() => {
        expect(screen.getByText('Group approved successfully')).toBeTruthy();
      });
    });

    it('should handle group decline workflow with reason', async () => {
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: mockGroups,
          error: null,
        }
      );

      mockAdminServiceWrapper.adminServiceWrapper.declineGroup.mockResolvedValue(
        {
          data: { ...mockGroups[0], status: 'denied' },
          error: null,
        }
      );

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Pending Bible Study')).toBeTruthy();
      });

      // Click decline button
      const declineButton = screen.getByTestId('decline-group-group-1');
      fireEvent.press(declineButton);

      // Should show reason input modal
      await waitFor(() => {
        expect(screen.getByText('Decline Group')).toBeTruthy();
        expect(
          screen.getByPlaceholderText('Reason for declining (optional)')
        ).toBeTruthy();
      });

      // Enter reason and confirm
      const reasonInput = screen.getByPlaceholderText(
        'Reason for declining (optional)'
      );
      fireEvent.changeText(reasonInput, 'Duplicate group already exists');

      const confirmButton = screen.getByText('Decline Group');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(
          mockAdminServiceWrapper.adminServiceWrapper.declineGroup
        ).toHaveBeenCalledWith(
          'group-1',
          'admin-1',
          'Duplicate group already exists'
        );
      });
    });

    it('should handle group closure workflow', async () => {
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: mockGroups,
          error: null,
        }
      );

      mockAdminServiceWrapper.adminServiceWrapper.closeGroup.mockResolvedValue({
        data: { ...mockGroups[1], status: 'closed' },
        error: null,
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Active Prayer Group')).toBeTruthy();
      });

      // Click close button for approved group
      const closeButton = screen.getByTestId('close-group-group-2');
      fireEvent.press(closeButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Close Group')).toBeTruthy();
        expect(
          screen.getByText('Are you sure you want to close this group?')
        ).toBeTruthy();
      });

      const confirmCloseButton = screen.getByText('Close Group');
      fireEvent.press(confirmCloseButton);

      await waitFor(() => {
        expect(
          mockAdminServiceWrapper.adminServiceWrapper.closeGroup
        ).toHaveBeenCalledWith('group-2', 'admin-1', undefined);
      });
    });

    it('should handle batch approval workflow', async () => {
      const pendingGroups = [
        { ...mockGroups[0], id: 'group-1' },
        { ...mockGroups[0], id: 'group-3', title: 'Another Pending Group' },
        { ...mockGroups[0], id: 'group-4', title: 'Third Pending Group' },
      ];

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: pendingGroups,
          error: null,
        }
      );

      mockAdminServiceWrapper.adminServiceWrapper.batchApproveGroups.mockResolvedValue(
        {
          successful: ['group-1', 'group-3'],
          failed: [{ groupId: 'group-4', error: new Error('Approval failed') }],
        }
      );

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Pending Bible Study')).toBeTruthy();
        expect(screen.getByText('Another Pending Group')).toBeTruthy();
      });

      // Select multiple groups
      const checkbox1 = screen.getByTestId('select-group-group-1');
      const checkbox3 = screen.getByTestId('select-group-group-3');
      const checkbox4 = screen.getByTestId('select-group-group-4');

      fireEvent.press(checkbox1);
      fireEvent.press(checkbox3);
      fireEvent.press(checkbox4);

      // Click batch approve
      const batchApproveButton = screen.getByText('Approve Selected');
      fireEvent.press(batchApproveButton);

      await waitFor(() => {
        expect(
          mockAdminServiceWrapper.adminServiceWrapper.batchApproveGroups
        ).toHaveBeenCalledWith(['group-1', 'group-3', 'group-4'], 'admin-1');
      });

      // Should show batch results
      await waitFor(() => {
        expect(screen.getByText('2 groups approved successfully')).toBeTruthy();
        expect(screen.getByText('1 group failed to approve')).toBeTruthy();
      });
    });

    it('should handle error states in group management', async () => {
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: null,
          error: new Error('Failed to load groups'),
        }
      );

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load groups')).toBeTruthy();
        expect(screen.getByText('Retry')).toBeTruthy();
      });

      // Test retry functionality
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: mockGroups,
          error: null,
        }
      );

      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Pending Bible Study')).toBeTruthy();
      });
    });
  });

  describe('Church Admin User Management Workflow', () => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Connected User',
        email: 'connected@church.com',
        church_id: 'church-1',
        group_count: 2,
        is_connected: true,
        last_activity: '2024-01-15T00:00:00Z',
      },
      {
        id: 'user-2',
        name: 'Unconnected User',
        email: 'unconnected@church.com',
        church_id: 'church-1',
        group_count: 0,
        is_connected: false,
        last_activity: '2024-01-10T00:00:00Z',
      },
    ];

    const mockSummary = {
      total_users: 25,
      connected_users: 18,
      unconnected_users: 7,
      active_groups: 5,
      pending_requests: 3,
    };

    it('should display user management dashboard with statistics', async () => {
      mockAdminServiceWrapper.adminServiceWrapper.getChurchUsers.mockResolvedValue(
        {
          data: mockUsers,
          error: null,
        }
      );

      mockAdminServiceWrapper.adminServiceWrapper.getChurchSummary.mockResolvedValue(
        {
          data: mockSummary,
          error: null,
        }
      );

      renderWithProviders(<ManageUsersScreen />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('25')).toBeTruthy(); // Total users
        expect(screen.getByText('18')).toBeTruthy(); // Connected users
        expect(screen.getByText('7')).toBeTruthy(); // Unconnected users
      });

      expect(screen.getByText('Connected User')).toBeTruthy();
      expect(screen.getByText('Unconnected User')).toBeTruthy();
    });

    it('should filter users by connection status', async () => {
      mockAdminServiceWrapper.adminServiceWrapper.getChurchUsers.mockResolvedValue(
        {
          data: mockUsers,
          error: null,
        }
      );

      mockAdminServiceWrapper.adminServiceWrapper.getChurchSummary.mockResolvedValue(
        {
          data: mockSummary,
          error: null,
        }
      );

      renderWithProviders(<ManageUsersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Connected User')).toBeTruthy();
        expect(screen.getByText('Unconnected User')).toBeTruthy();
      });

      // Filter to show only unconnected users
      const filterButton = screen.getByText('All Users');
      fireEvent.press(filterButton);

      const unconnectedFilter = screen.getByText('Unconnected Only');
      fireEvent.press(unconnectedFilter);

      await waitFor(() => {
        expect(screen.queryByText('Connected User')).toBeNull();
        expect(screen.getByText('Unconnected User')).toBeTruthy();
      });
    });

    it('should view user group history', async () => {
      const mockHistory = [
        {
          id: 'mem-1',
          user_id: 'user-1',
          group_id: 'group-1',
          status: 'active',
          role: 'leader',
          joined_at: '2024-01-01T00:00:00Z',
          group: { id: 'group-1', title: 'Bible Study', status: 'approved' },
        },
        {
          id: 'mem-2',
          user_id: 'user-1',
          group_id: 'group-2',
          status: 'inactive',
          role: 'member',
          joined_at: '2023-06-01T00:00:00Z',
          group: { id: 'group-2', title: 'Former Group', status: 'closed' },
        },
      ];

      mockAdminServiceWrapper.adminServiceWrapper.getChurchUsers.mockResolvedValue(
        {
          data: mockUsers,
          error: null,
        }
      );

      mockAdminService.userAdminService.getUserGroupHistory.mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      renderWithProviders(<ManageUsersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Connected User')).toBeTruthy();
      });

      // Click on user to view details
      const userCard = screen.getByTestId('user-card-user-1');
      fireEvent.press(userCard);

      // Should show user details modal with group history
      await waitFor(() => {
        expect(screen.getByText('User Details')).toBeTruthy();
        expect(screen.getByText('Bible Study')).toBeTruthy();
        expect(screen.getByText('Leader')).toBeTruthy();
        expect(screen.getByText('Former Group')).toBeTruthy();
        expect(screen.getByText('Former Member')).toBeTruthy();
      });
    });
  });

  describe('Permission Enforcement Integration', () => {
    it('should redirect non-admin users', async () => {
      // Mock user without admin role
      const nonAdminStore = {
        ...mockAuthStore,
        user: {
          ...mockAuthStore.user,
          roles: ['member'],
        },
      };

      jest
        .mocked(require('@/stores/auth').useAuthStore)
        .mockReturnValue(nonAdminStore);

      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: false,
        reason: 'User does not have church_admin role',
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });

    it('should handle permission errors gracefully', async () => {
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: null,
          error: new Error('Access denied to manage church groups'),
        }
      );

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(
          screen.getByText('Access denied to manage church groups')
        ).toBeTruthy();
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle real-time group status updates', async () => {
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: mockGroups,
          error: null,
        }
      );

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Pending Bible Study')).toBeTruthy();
      });

      // Simulate real-time update (group approved by another admin)
      const updatedGroups = [
        { ...mockGroups[0], status: 'approved' },
        mockGroups[1],
      ];

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: updatedGroups,
          error: null,
        }
      );

      // Trigger refetch (would normally be done by React Query)
      const refreshButton = screen.getByTestId('refresh-groups');
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeTruthy();
      });
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states during data fetching', async () => {
      // Mock delayed response
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: mockGroups,
                  error: null,
                }),
              100
            )
          )
      );

      renderWithProviders(<ManageGroupsScreen />);

      // Should show loading spinner
      expect(screen.getByTestId('loading-spinner')).toBeTruthy();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Pending Bible Study')).toBeTruthy();
      });

      expect(screen.queryByTestId('loading-spinner')).toBeNull();
    });

    it('should handle large datasets with pagination', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        ...mockGroups[0],
        id: `group-${i}`,
        title: `Group ${i}`,
      }));

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: {
            data: largeDataset.slice(0, 20),
            pagination: {
              offset: 0,
              limit: 20,
              total: 50,
              hasMore: true,
            },
          },
          error: null,
        }
      );

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Group 0')).toBeTruthy();
        expect(screen.getByText('Group 19')).toBeTruthy();
      });

      // Should show load more button
      expect(screen.getByText('Load More')).toBeTruthy();

      // Test load more functionality
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue(
        {
          data: {
            data: largeDataset.slice(20, 40),
            pagination: {
              offset: 20,
              limit: 20,
              total: 50,
              hasMore: true,
            },
          },
          error: null,
        }
      );

      const loadMoreButton = screen.getByText('Load More');
      fireEvent.press(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Group 20')).toBeTruthy();
      });
    });
  });
});
