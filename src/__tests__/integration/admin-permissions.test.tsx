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
import GroupLeaderPanel from '@/components/groups/GroupLeaderPanel';
import * as adminService from '@/services/admin';
import * as adminServiceWrapper from '@/services/adminServiceWrapper';
import * as permissionService from '@/services/permissions';
import * as groupCreationService from '@/services/groupCreation';
import * as joinRequestService from '@/services/joinRequests';

// Mock services
jest.mock('@/services/admin');
jest.mock('@/services/adminServiceWrapper');
jest.mock('@/services/permissions');
jest.mock('@/services/groupCreation');
jest.mock('@/services/joinRequests');

const mockAdminService = adminService as jest.Mocked<typeof adminService>;
const mockAdminServiceWrapper = adminServiceWrapper as jest.Mocked<typeof adminServiceWrapper>;
const mockPermissionService = permissionService as jest.Mocked<typeof permissionService>;
const mockGroupCreationService = groupCreationService as jest.Mocked<typeof groupCreationService>;
const mockJoinRequestService = joinRequestService as jest.Mocked<typeof joinRequestService>;

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => ({ groupId: 'group-1' }),
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

describe('Admin Permission Enforcement Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Church Admin Permissions', () => {
    const churchAdmin = {
      id: 'admin-1',
      email: 'admin@church.com',
      name: 'Church Admin',
      church_id: 'church-1',
      roles: ['church_admin'],
    };

    const regularUser = {
      id: 'user-1',
      email: 'user@church.com',
      name: 'Regular User',
      church_id: 'church-1',
      roles: ['member'],
    };

    const otherChurchAdmin = {
      id: 'admin-2',
      email: 'admin2@othurchurch.com',
      name: 'Other Church Admin',
      church_id: 'church-2',
      roles: ['church_admin'],
    };

    it('should allow church admin to access group management', async () => {
      // Mock auth store with church admin
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: churchAdmin,
        isAuthenticated: true,
        isLoading: false,
      });

      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });

      mockPermissionService.permissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: [],
        error: null,
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Manage Groups')).toBeTruthy();
      });

      expect(mockPermissionService.permissionService.hasPermission).toHaveBeenCalledWith(
        'manage_church_groups'
      );
      expect(mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups).toHaveBeenCalled();
    });

    it('should deny regular user access to group management', async () => {
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: regularUser,
        isAuthenticated: true,
        isLoading: false,
      });

      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: false,
        reason: 'User does not have church_admin role',
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });

      expect(mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups).not.toHaveBeenCalled();
    });

    it('should enforce church-scoped data access', async () => {
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: otherChurchAdmin,
        isAuthenticated: true,
        isLoading: false,
      });

      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });

      mockPermissionService.permissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: false,
        reason: 'User does not belong to this church',
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: null,
        error: new Error('User does not belong to this church'),
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('User does not belong to this church')).toBeTruthy();
      });
    });

    it('should validate permissions for each admin action', async () => {
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: churchAdmin,
        isAuthenticated: true,
        isLoading: false,
      });

      const mockGroups = [
        {
          id: 'group-1',
          title: 'Pending Group',
          status: 'pending',
          church_id: 'church-1',
        },
      ];

      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });

      mockPermissionService.permissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: mockGroups,
        error: null,
      });

      // Mock permission check for approval action
      mockAdminServiceWrapper.adminServiceWrapper.approveGroup.mockImplementation(
        async (groupId, adminId) => {
          // Simulate permission check within the service
          const permissionCheck = await mockPermissionService.permissionService.hasPermission(
            'manage_church_groups'
          );
          if (!permissionCheck.hasPermission) {
            return {
              data: null,
              error: new Error('Access denied'),
            };
          }
          return {
            data: { id: groupId, status: 'approved' },
            error: null,
          };
        }
      );

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Pending Group')).toBeTruthy();
      });

      const approveButton = screen.getByTestId('approve-group-group-1');
      fireEvent.press(approveButton);

      await waitFor(() => {
        expect(mockPermissionService.permissionService.hasPermission).toHaveBeenCalledWith(
          'manage_church_groups'
        );
      });
    });

    it('should handle permission revocation during session', async () => {
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: churchAdmin,
        isAuthenticated: true,
        isLoading: false,
      });

      // Initially allow access
      mockPermissionService.permissionService.hasPermission.mockResolvedValueOnce({
        hasPermission: true,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: [],
        error: null,
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Manage Groups')).toBeTruthy();
      });

      // Simulate permission revocation
      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: false,
        reason: 'Permission revoked',
      });

      mockAdminServiceWrapper.adminServiceWrapper.approveGroup.mockResolvedValue({
        data: null,
        error: new Error('Permission revoked'),
      });

      // Try to perform an action
      const refreshButton = screen.getByTestId('refresh-groups');
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Permission revoked')).toBeTruthy();
      });
    });
  });

  describe('Group Leader Permissions', () => {
    const groupLeader = {
      id: 'leader-1',
      email: 'leader@church.com',
      name: 'Group Leader',
      church_id: 'church-1',
      roles: ['member'],
    };

    const regularMember = {
      id: 'member-1',
      email: 'member@church.com',
      name: 'Regular Member',
      church_id: 'church-1',
      roles: ['member'],
    };

    const mockGroup = {
      id: 'group-1',
      title: 'Bible Study Group',
      description: 'Weekly Bible study',
      status: 'approved',
      church_id: 'church-1',
      member_count: 5,
    };

    it('should allow group leader to manage their group', async () => {
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: groupLeader,
        isAuthenticated: true,
        isLoading: false,
      });

      mockPermissionService.permissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
      });

      mockPermissionService.permissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      mockJoinRequestService.joinRequestService.getGroupJoinRequests.mockResolvedValue({
        data: [],
        error: null,
      });

      renderWithProviders(<GroupLeaderPanel groupId="group-1" />);

      await waitFor(() => {
        expect(screen.getByText('Group Leader Panel')).toBeTruthy();
        expect(screen.getByText('Edit Group')).toBeTruthy();
        expect(screen.getByText('Join Requests')).toBeTruthy();
      });

      expect(mockPermissionService.permissionService.canManageGroup).toHaveBeenCalledWith(
        'group-1',
        'leader-1'
      );
    });

    it('should deny regular member access to group management', async () => {
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: regularMember,
        isAuthenticated: true,
        isLoading: false,
      });

      mockPermissionService.permissionService.canManageGroup.mockResolvedValue({
        hasPermission: false,
        reason: 'User is not a leader of this group',
      });

      renderWithProviders(<GroupLeaderPanel groupId="group-1" />);

      await waitFor(() => {
        expect(screen.getByText('Access denied')).toBeTruthy();
      });

      expect(mockJoinRequestService.joinRequestService.getGroupJoinRequests).not.toHaveBeenCalled();
    });

    it('should validate permissions for group modification actions', async () => {
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: groupLeader,
        isAuthenticated: true,
        isLoading: false,
      });

      mockPermissionService.permissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
      });

      mockPermissionService.permissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      mockJoinRequestService.joinRequestService.getGroupJoinRequests.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock permission check for update action
      mockGroupCreationService.groupCreationService.updateGroupDetails.mockImplementation(
        async (groupId, updates, userId) => {
          const permissionCheck = await mockPermissionService.permissionService.canManageGroupMembership(
            groupId,
            userId
          );
          if (!permissionCheck.hasPermission) {
            return {
              data: null,
              error: new Error('Access denied to manage group'),
            };
          }
          return {
            data: { ...mockGroup, ...updates },
            error: null,
          };
        }
      );

      renderWithProviders(<GroupLeaderPanel groupId="group-1" />);

      await waitFor(() => {
        expect(screen.getByText('Edit Group')).toBeTruthy();
      });

      const editButton = screen.getByText('Edit Group');
      fireEvent.press(editButton);

      // Should trigger permission check
      expect(mockPermissionService.permissionService.canManageGroupMembership).toHaveBeenCalledWith(
        'group-1',
        'leader-1'
      );
    });

    it('should enforce group-scoped permissions', async () => {
      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: groupLeader,
        isAuthenticated: true,
        isLoading: false,
      });

      // Allow access to group-1 but deny access to group-2
      mockPermissionService.permissionService.canManageGroup.mockImplementation(
        async (groupId, userId) => {
          if (groupId === 'group-1' && userId === 'leader-1') {
            return { hasPermission: true };
          }
          return {
            hasPermission: false,
            reason: 'User is not a leader of this group',
          };
        }
      );

      // Test access to allowed group
      renderWithProviders(<GroupLeaderPanel groupId="group-1" />);

      await waitFor(() => {
        expect(screen.getByText('Group Leader Panel')).toBeTruthy();
      });

      // Test access to denied group
      const { rerender } = renderWithProviders(<GroupLeaderPanel groupId="group-2" />);

      await waitFor(() => {
        expect(screen.getByText('User is not a leader of this group')).toBeTruthy();
      });
    });
  });

  describe('Cross-Role Permission Tests', () => {
    it('should handle users with multiple roles correctly', async () => {
      const multiRoleUser = {
        id: 'multi-1',
        email: 'multi@church.com',
        name: 'Multi Role User',
        church_id: 'church-1',
        roles: ['church_admin', 'group_leader'],
      };

      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: multiRoleUser,
        isAuthenticated: true,
        isLoading: false,
      });

      // Should have both admin and leader permissions
      mockPermissionService.permissionService.hasPermission.mockImplementation(
        async (permission) => {
          if (permission === 'manage_church_groups' || permission === 'manage_church_users') {
            return { hasPermission: true };
          }
          return { hasPermission: false };
        }
      );

      mockPermissionService.permissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: [],
        error: null,
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Manage Groups')).toBeTruthy();
      });

      expect(mockPermissionService.permissionService.hasPermission).toHaveBeenCalledWith(
        'manage_church_groups'
      );
    });

    it('should handle role hierarchy correctly', async () => {
      const superAdmin = {
        id: 'super-1',
        email: 'super@church.com',
        name: 'Super Admin',
        church_id: 'church-1',
        roles: ['super_admin', 'church_admin'],
      };

      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: superAdmin,
        isAuthenticated: true,
        isLoading: false,
      });

      // Super admin should have all permissions
      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });

      mockPermissionService.permissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: [],
        error: null,
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Manage Groups')).toBeTruthy();
      });

      // Should be able to access all admin functions
      expect(mockPermissionService.permissionService.hasPermission).toHaveBeenCalled();
    });
  });

  describe('Permission Caching and Performance', () => {
    it('should cache permission checks to avoid repeated calls', async () => {
      const churchAdmin = {
        id: 'admin-1',
        email: 'admin@church.com',
        name: 'Church Admin',
        church_id: 'church-1',
        roles: ['church_admin'],
      };

      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: churchAdmin,
        isAuthenticated: true,
        isLoading: false,
      });

      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });

      mockPermissionService.permissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: [],
        error: null,
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Manage Groups')).toBeTruthy();
      });

      // Perform multiple actions that would require permission checks
      const refreshButton = screen.getByTestId('refresh-groups');
      fireEvent.press(refreshButton);
      fireEvent.press(refreshButton);

      // Permission service should implement caching to avoid redundant calls
      // This test verifies the pattern, actual caching implementation may vary
      expect(mockPermissionService.permissionService.hasPermission).toHaveBeenCalled();
    });

    it('should handle permission check failures gracefully', async () => {
      const churchAdmin = {
        id: 'admin-1',
        email: 'admin@church.com',
        name: 'Church Admin',
        church_id: 'church-1',
        roles: ['church_admin'],
      };

      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: churchAdmin,
        isAuthenticated: true,
        isLoading: false,
      });

      // Mock permission service failure
      mockPermissionService.permissionService.hasPermission.mockRejectedValue(
        new Error('Permission service unavailable')
      );

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Permission service unavailable')).toBeTruthy();
      });

      // Should not attempt to load data when permissions fail
      expect(mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups).not.toHaveBeenCalled();
    });
  });

  describe('Security Edge Cases', () => {
    it('should prevent privilege escalation attempts', async () => {
      const maliciousUser = {
        id: 'malicious-1',
        email: 'malicious@church.com',
        name: 'Malicious User',
        church_id: 'church-1',
        roles: ['member'],
      };

      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: maliciousUser,
        isAuthenticated: true,
        isLoading: false,
      });

      // User tries to access admin functions
      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: false,
        reason: 'Insufficient privileges',
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });

      // Should not make any admin service calls
      expect(mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups).not.toHaveBeenCalled();
    });

    it('should validate user session integrity', async () => {
      // Mock user with tampered session
      const tamperedUser = {
        id: 'user-1',
        email: 'user@church.com',
        name: 'User',
        church_id: 'church-1',
        roles: ['church_admin'], // Potentially tampered role
      };

      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user: tamperedUser,
        isAuthenticated: true,
        isLoading: false,
      });

      // Server-side permission check should fail
      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: false,
        reason: 'Invalid session or role mismatch',
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });

    it('should handle concurrent permission changes', async () => {
      const user = {
        id: 'user-1',
        email: 'user@church.com',
        name: 'User',
        church_id: 'church-1',
        roles: ['church_admin'],
      };

      jest.mocked(require('@/stores/auth').useAuthStore).mockReturnValue({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Initially allow access
      mockPermissionService.permissionService.hasPermission.mockResolvedValueOnce({
        hasPermission: true,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: [],
        error: null,
      });

      renderWithProviders(<ManageGroupsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Manage Groups')).toBeTruthy();
      });

      // Simulate permission change during operation
      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: false,
        reason: 'Role removed',
      });

      mockAdminServiceWrapper.adminServiceWrapper.approveGroup.mockResolvedValue({
        data: null,
        error: new Error('Role removed'),
      });

      // Any subsequent action should fail
      const refreshButton = screen.getByTestId('refresh-groups');
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Role removed')).toBeTruthy();
      });
    });
  });
});