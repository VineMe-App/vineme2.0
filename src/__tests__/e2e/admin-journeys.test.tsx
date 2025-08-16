import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/app/_layout';
import * as authService from '@/services/auth';
import * as adminService from '@/services/admin';
import * as adminServiceWrapper from '@/services/adminServiceWrapper';
import * as groupCreationService from '@/services/groupCreation';
import * as joinRequestService from '@/services/joinRequests';
import * as permissionService from '@/services/permissions';

// Mock all services
jest.mock('@/services/auth');
jest.mock('@/services/admin');
jest.mock('@/services/adminServiceWrapper');
jest.mock('@/services/groupCreation');
jest.mock('@/services/joinRequests');
jest.mock('@/services/permissions');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockAdminService = adminService as jest.Mocked<typeof adminService>;
const mockAdminServiceWrapper = adminServiceWrapper as jest.Mocked<typeof adminServiceWrapper>;
const mockGroupCreationService = groupCreationService as jest.Mocked<typeof groupCreationService>;
const mockJoinRequestService = joinRequestService as jest.Mocked<typeof joinRequestService>;
const mockPermissionService = permissionService as jest.Mocked<typeof permissionService>;

// Mock expo-router
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
  Stack: ({ children }: any) => children,
  Tabs: ({ children }: any) => children,
  useLocalSearchParams: () => ({}),
}));

// Mock auth store
let mockUser: any = null;
const mockAuthStore = {
  get user() {
    return mockUser;
  },
  get isAuthenticated() {
    return !!mockUser;
  },
  isLoading: false,
  setUser: jest.fn((user) => {
    mockUser = user;
  }),
  setLoading: jest.fn(),
  clearUser: jest.fn(() => {
    mockUser = null;
  }),
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

describe('Admin User Journeys E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
  });

  describe('Church Admin Complete Journey', () => {
    const churchAdmin = {
      id: 'admin-1',
      email: 'admin@church.com',
      name: 'Church Admin',
      church_id: 'church-1',
      roles: ['church_admin'],
    };

    const mockGroups = [
      {
        id: 'group-1',
        title: 'New Bible Study',
        description: 'Weekly Bible study for young adults',
        status: 'pending',
        church_id: 'church-1',
        member_count: 0,
        creator: { id: 'user-1', name: 'John Doe' },
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'group-2',
        title: 'Prayer Group',
        description: 'Weekly prayer meeting',
        status: 'approved',
        church_id: 'church-1',
        member_count: 8,
        creator: { id: 'user-2', name: 'Jane Smith' },
        created_at: '2023-12-01T00:00:00Z',
      },
    ];

    const mockUsers = [
      {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@church.com',
        church_id: 'church-1',
        group_count: 1,
        is_connected: true,
        last_activity: '2024-01-15T00:00:00Z',
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@church.com',
        church_id: 'church-1',
        group_count: 0,
        is_connected: false,
        last_activity: '2024-01-10T00:00:00Z',
      },
    ];

    it('should complete full church admin journey: sign in -> manage groups -> manage users', async () => {
      // Mock authentication
      mockAuthService.signIn.mockResolvedValue({
        data: { user: churchAdmin, session: { access_token: 'token' } },
        error: null,
      });

      // Mock permission checks
      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });

      mockPermissionService.permissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock admin service responses
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: mockGroups,
        error: null,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchUsers.mockResolvedValue({
        data: mockUsers,
        error: null,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchSummary.mockResolvedValue({
        data: {
          total_users: 25,
          connected_users: 18,
          unconnected_users: 7,
          active_groups: 5,
          pending_requests: 3,
        },
        error: null,
      });

      mockAdminServiceWrapper.adminServiceWrapper.approveGroup.mockResolvedValue({
        data: { ...mockGroups[0], status: 'approved' },
        error: null,
      });

      // Start the journey
      renderWithProviders(<App />);

      // Step 1: Sign in as church admin
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeTruthy();
      });

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'admin@church.com');
      fireEvent.changeText(passwordInput, 'adminpassword');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockAuthService.signIn).toHaveBeenCalledWith(
          'admin@church.com',
          'adminpassword'
        );
      });

      // Step 2: Navigate to Profile and access admin features
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeTruthy();
      });

      const profileTab = screen.getByText('Profile');
      fireEvent.press(profileTab);

      await waitFor(() => {
        expect(screen.getByText('Manage Groups')).toBeTruthy();
        expect(screen.getByText('Manage Users')).toBeTruthy();
      });

      // Step 3: Manage Groups
      const manageGroupsButton = screen.getByText('Manage Groups');
      fireEvent.press(manageGroupsButton);

      await waitFor(() => {
        expect(screen.getByText('New Bible Study')).toBeTruthy();
        expect(screen.getByText('Prayer Group')).toBeTruthy();
        expect(screen.getByText('Pending')).toBeTruthy();
        expect(screen.getByText('Approved')).toBeTruthy();
      });

      // Step 4: Approve pending group
      const approveButton = screen.getByTestId('approve-group-group-1');
      fireEvent.press(approveButton);

      await waitFor(() => {
        expect(mockAdminServiceWrapper.adminServiceWrapper.approveGroup).toHaveBeenCalledWith(
          'group-1',
          'admin-1',
          undefined
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Group approved successfully')).toBeTruthy();
      });

      // Step 5: Navigate to User Management
      const backButton = screen.getByTestId('back-button');
      fireEvent.press(backButton);

      await waitFor(() => {
        expect(screen.getByText('Manage Users')).toBeTruthy();
      });

      const manageUsersButton = screen.getByText('Manage Users');
      fireEvent.press(manageUsersButton);

      // Step 6: View user management dashboard
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
        expect(screen.getByText('Jane Smith')).toBeTruthy();
        expect(screen.getByText('25')).toBeTruthy(); // Total users
        expect(screen.getByText('18')).toBeTruthy(); // Connected users
        expect(screen.getByText('7')).toBeTruthy(); // Unconnected users
      });

      // Verify all service calls were made
      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
      expect(mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups).toHaveBeenCalled();
      expect(mockAdminServiceWrapper.adminServiceWrapper.getChurchUsers).toHaveBeenCalled();
      expect(mockAdminServiceWrapper.adminServiceWrapper.getChurchSummary).toHaveBeenCalled();
      expect(mockAdminServiceWrapper.adminServiceWrapper.approveGroup).toHaveBeenCalled();
    });

    it('should handle admin permission errors gracefully', async () => {
      // Mock user without admin permissions
      const regularUser = {
        id: 'user-1',
        email: 'user@church.com',
        name: 'Regular User',
        church_id: 'church-1',
        roles: ['member'],
      };

      mockAuthService.signIn.mockResolvedValue({
        data: { user: regularUser, session: { access_token: 'token' } },
        error: null,
      });

      mockPermissionService.permissionService.hasPermission.mockResolvedValue({
        hasPermission: false,
        reason: 'User does not have church_admin role',
      });

      renderWithProviders(<App />);

      // Sign in as regular user
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeTruthy();
      });

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'user@church.com');
      fireEvent.changeText(passwordInput, 'password');
      fireEvent.press(signInButton);

      // Navigate to profile
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeTruthy();
      });

      const profileTab = screen.getByText('Profile');
      fireEvent.press(profileTab);

      // Admin buttons should not be visible
      await waitFor(() => {
        expect(screen.queryByText('Manage Groups')).toBeNull();
        expect(screen.queryByText('Manage Users')).toBeNull();
      });
    });
  });

  describe('Group Leader Journey', () => {
    const groupLeader = {
      id: 'leader-1',
      email: 'leader@church.com',
      name: 'Group Leader',
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
      meeting_day: 'Wednesday',
      meeting_time: '19:00',
      location: { address: '123 Church St' },
    };

    const mockJoinRequests = [
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
          email: 'john@church.com',
          avatar_url: null,
        },
      },
    ];

    it('should complete group leader journey: sign in -> manage group -> handle join requests', async () => {
      mockAuthService.signIn.mockResolvedValue({
        data: { user: groupLeader, session: { access_token: 'token' } },
        error: null,
      });

      // Mock group leader permissions
      mockPermissionService.permissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
      });

      // Mock service responses
      mockJoinRequestService.joinRequestService.getGroupJoinRequests.mockResolvedValue({
        data: mockJoinRequests,
        error: null,
      });

      mockJoinRequestService.joinRequestService.approveJoinRequest.mockResolvedValue({
        data: {
          id: 'membership-1',
          group_id: 'group-1',
          user_id: 'user-1',
          role: 'member' as const,
          status: 'active' as const,
          joined_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      mockGroupCreationService.groupCreationService.updateGroupDetails.mockResolvedValue({
        data: { ...mockGroup, description: 'Updated description' },
        error: null,
      });

      renderWithProviders(<App />);

      // Step 1: Sign in as group leader
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeTruthy();
      });

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'leader@church.com');
      fireEvent.changeText(passwordInput, 'leaderpassword');
      fireEvent.press(signInButton);

      // Step 2: Navigate to Groups and find their group
      await waitFor(() => {
        expect(screen.getByText('Groups')).toBeTruthy();
      });

      const groupsTab = screen.getByText('Groups');
      fireEvent.press(groupsTab);

      // Mock groups service to return the leader's group
      jest.mocked(require('@/services/groups').getGroupsByChurch).mockResolvedValue({
        data: [mockGroup],
        error: null,
      });

      await waitFor(() => {
        expect(screen.getByText('Bible Study Group')).toBeTruthy();
      });

      // Step 3: Navigate to group detail
      const groupCard = screen.getByTestId('group-card-group-1');
      fireEvent.press(groupCard);

      await waitFor(() => {
        expect(screen.getByText('Group Leader Panel')).toBeTruthy();
        expect(screen.getByText('Edit Group')).toBeTruthy();
        expect(screen.getByText('Join Requests')).toBeTruthy();
      });

      // Step 4: Handle join requests
      const joinRequestsButton = screen.getByText('Join Requests');
      fireEvent.press(joinRequestsButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
        expect(screen.getByText('Pending Request')).toBeTruthy();
      });

      // Approve join request
      const approveRequestButton = screen.getByTestId('approve-request-request-1');
      fireEvent.press(approveRequestButton);

      await waitFor(() => {
        expect(mockJoinRequestService.joinRequestService.approveJoinRequest).toHaveBeenCalledWith(
          'request-1',
          'leader-1'
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Join request approved')).toBeTruthy();
      });

      // Step 5: Edit group details
      const backToGroupButton = screen.getByTestId('back-to-group');
      fireEvent.press(backToGroupButton);

      const editGroupButton = screen.getByText('Edit Group');
      fireEvent.press(editGroupButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Group Details')).toBeTruthy();
      });

      const descriptionInput = screen.getByDisplayValue('Weekly Bible study');
      fireEvent.changeText(descriptionInput, 'Updated description');

      const saveButton = screen.getByText('Save Changes');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockGroupCreationService.groupCreationService.updateGroupDetails).toHaveBeenCalledWith(
          'group-1',
          expect.objectContaining({
            description: 'Updated description',
          }),
          'leader-1'
        );
      });

      // Verify all service calls
      expect(mockJoinRequestService.joinRequestService.getGroupJoinRequests).toHaveBeenCalled();
      expect(mockJoinRequestService.joinRequestService.approveJoinRequest).toHaveBeenCalled();
      expect(mockGroupCreationService.groupCreationService.updateGroupDetails).toHaveBeenCalled();
    });

    it('should handle group leader permission errors', async () => {
      mockAuthService.signIn.mockResolvedValue({
        data: { user: groupLeader, session: { access_token: 'token' } },
        error: null,
      });

      // Mock permission denied
      mockPermissionService.permissionService.canManageGroup.mockResolvedValue({
        hasPermission: false,
        reason: 'User is not a leader of this group',
      });

      mockJoinRequestService.joinRequestService.getGroupJoinRequests.mockResolvedValue({
        data: null,
        error: new Error('User is not a leader of this group'),
      });

      renderWithProviders(<App />);

      // Sign in and navigate to group
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeTruthy();
      });

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'leader@church.com');
      fireEvent.changeText(passwordInput, 'password');
      fireEvent.press(signInButton);

      // Navigate to groups
      await waitFor(() => {
        expect(screen.getByText('Groups')).toBeTruthy();
      });

      const groupsTab = screen.getByText('Groups');
      fireEvent.press(groupsTab);

      // Try to access group management features
      await waitFor(() => {
        expect(screen.queryByText('Group Leader Panel')).toBeNull();
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle network failures and retry mechanisms', async () => {
      const churchAdmin = {
        id: 'admin-1',
        email: 'admin@church.com',
        name: 'Church Admin',
        church_id: 'church-1',
        roles: ['church_admin'],
      };

      mockAuthService.signIn.mockResolvedValue({
        data: { user: churchAdmin, session: { access_token: 'token' } },
        error: null,
      });

      // Mock network failure followed by success
      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValue({
          data: [],
          error: null,
        });

      renderWithProviders(<App />);

      // Sign in and navigate to admin
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeTruthy();
      });

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'admin@church.com');
      fireEvent.changeText(passwordInput, 'password');
      fireEvent.press(signInButton);

      // Navigate to manage groups
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeTruthy();
      });

      const profileTab = screen.getByText('Profile');
      fireEvent.press(profileTab);

      const manageGroupsButton = screen.getByText('Manage Groups');
      fireEvent.press(manageGroupsButton);

      // Should show network error
      await waitFor(() => {
        expect(screen.getByText('Network request failed')).toBeTruthy();
        expect(screen.getByText('Retry')).toBeTruthy();
      });

      // Retry should work
      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(screen.queryByText('Network request failed')).toBeNull();
      });
    });

    it('should handle concurrent admin actions gracefully', async () => {
      const churchAdmin = {
        id: 'admin-1',
        email: 'admin@church.com',
        name: 'Church Admin',
        church_id: 'church-1',
        roles: ['church_admin'],
      };

      const mockGroups = [
        {
          id: 'group-1',
          title: 'Pending Group',
          status: 'pending',
          church_id: 'church-1',
        },
      ];

      mockAuthService.signIn.mockResolvedValue({
        data: { user: churchAdmin, session: { access_token: 'token' } },
        error: null,
      });

      mockAdminServiceWrapper.adminServiceWrapper.getChurchGroups.mockResolvedValue({
        data: mockGroups,
        error: null,
      });

      // Mock concurrent approval conflict
      mockAdminServiceWrapper.adminServiceWrapper.approveGroup.mockResolvedValue({
        data: null,
        error: new Error('Group is not pending approval'),
      });

      renderWithProviders(<App />);

      // Navigate to admin and try to approve group
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeTruthy();
      });

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'admin@church.com');
      fireEvent.changeText(passwordInput, 'password');
      fireEvent.press(signInButton);

      // Navigate to manage groups
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeTruthy();
      });

      const profileTab = screen.getByText('Profile');
      fireEvent.press(profileTab);

      const manageGroupsButton = screen.getByText('Manage Groups');
      fireEvent.press(manageGroupsButton);

      await waitFor(() => {
        expect(screen.getByText('Pending Group')).toBeTruthy();
      });

      // Try to approve group (will fail due to concurrent action)
      const approveButton = screen.getByTestId('approve-group-group-1');
      fireEvent.press(approveButton);

      await waitFor(() => {
        expect(screen.getByText('Group is not pending approval')).toBeTruthy();
      });
    });
  });
});