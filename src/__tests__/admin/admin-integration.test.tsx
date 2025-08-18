/**
 * Admin Integration Tests
 * Tests the complete admin feature integration and polish
 */

import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AdminIntegration,
  useAdminIntegration,
} from '../../components/admin/AdminIntegration';
import { AdminNavigation, AdminWorkflows } from '../../utils/adminNavigation';
import { CrossPlatformTesting } from '../../utils/crossPlatformTesting';
import { AdminConfirmations } from '../../components/ui/ConfirmationDialog';
import { useAuthStore } from '../../stores/auth';

// Mock dependencies
jest.mock('../../stores/auth');
jest.mock('../../utils/secureStorage');
jest.mock('../../hooks/useNotifications');
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;

describe('Admin Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-1', email: 'admin@test.com' },
      userProfile: {
        id: 'user-1',
        name: 'Test Admin',
        email: 'admin@test.com',
        roles: ['church_admin'],
        church_id: 'church-1',
      },
      signOut: jest.fn(),
    } as any);

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('AdminNavigation', () => {
    it('should navigate to admin features correctly', () => {
      const { router } = require('expo-router');

      AdminNavigation.toManageGroups();
      expect(router.push).toHaveBeenCalledWith('/admin/manage-groups');

      AdminNavigation.toManageUsers();
      expect(router.push).toHaveBeenCalledWith('/admin/manage-users');

      AdminNavigation.toGroupDetail('group-1');
      expect(router.push).toHaveBeenCalledWith('/group/group-1');
    });

    it('should handle navigation with permission checks', () => {
      const mockAlert = jest.spyOn(Alert, 'alert');

      // Test with admin role
      AdminNavigation.toAdminFeature('groups', ['church_admin']);
      expect(mockAlert).not.toHaveBeenCalled();

      // Test without admin role
      AdminNavigation.toAdminFeature('groups', ['member']);
      expect(mockAlert).toHaveBeenCalledWith(
        'Access Denied',
        'You need church admin permissions to access this feature.',
        [{ text: 'OK' }]
      );
    });

    it('should generate correct breadcrumbs', () => {
      const breadcrumbs = AdminNavigation.getBreadcrumbs(
        '/admin/manage-groups'
      );
      expect(breadcrumbs).toEqual([
        { label: 'Profile', route: '/(tabs)/profile' },
        { label: 'Manage Groups' },
      ]);
    });
  });

  describe('AdminWorkflows', () => {
    it('should handle group approval workflow', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const mockOnApprove = jest.fn().mockResolvedValue(undefined);

      await AdminWorkflows.approveGroupWorkflow(
        'group-1',
        'Test Group',
        mockOnApprove
      );

      expect(mockOnApprove).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith(
        'Group Approved! ✅',
        'Test Group has been approved and is now active.',
        expect.any(Array)
      );
    });

    it('should handle group creation workflow', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const mockOnSuccess = jest.fn();

      await AdminWorkflows.createGroupWorkflow(mockOnSuccess, true);

      expect(mockAlert).toHaveBeenCalledWith(
        'Group Request Submitted! 🎉',
        'Your group creation request has been submitted for approval. You will be notified once it has been reviewed.',
        expect.any(Array)
      );
    });
  });

  describe('AdminConfirmations', () => {
    it('should render group approval confirmation', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      const ConfirmationComponent = () =>
        AdminConfirmations.approveGroup(
          'Test Group',
          mockOnConfirm,
          mockOnCancel
        );

      render(<ConfirmationComponent />);

      expect(screen.getByText('Approve Group')).toBeTruthy();
      expect(
        screen.getByText(/Are you sure you want to approve "Test Group"/)
      ).toBeTruthy();
    });

    it('should render group decline confirmation with destructive warning', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      const ConfirmationComponent = () =>
        AdminConfirmations.declineGroup(
          'Test Group',
          mockOnConfirm,
          mockOnCancel
        );

      render(<ConfirmationComponent />);

      expect(screen.getByText('Decline Group')).toBeTruthy();
      expect(screen.getByText('⚠️ This action cannot be undone')).toBeTruthy();
    });

    it('should render group closure confirmation with checkbox', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      const ConfirmationComponent = () =>
        AdminConfirmations.closeGroup(
          'Test Group',
          5,
          mockOnConfirm,
          mockOnCancel
        );

      render(<ConfirmationComponent />);

      expect(screen.getByText('Close Group')).toBeTruthy();
      expect(screen.getByText(/This will affect 5 group members/)).toBeTruthy();
      expect(
        screen.getByText('I understand this will affect all group members')
      ).toBeTruthy();
    });
  });

  describe('useAdminIntegration Hook', () => {
    const TestComponent = () => {
      const { isChurchAdmin, navigation, workflows } = useAdminIntegration();

      return (
        <>
          <text testID="admin-status">
            {isChurchAdmin ? 'Admin' : 'Not Admin'}
          </text>
          <button
            testID="navigate-groups"
            onPress={() => navigation.toManageGroups()}
          >
            Manage Groups
          </button>
        </>
      );
    };

    it('should provide admin integration features', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );

      expect(screen.getByTestId('admin-status')).toHaveTextContent('Admin');

      fireEvent.press(screen.getByTestId('navigate-groups'));
      const { router } = require('expo-router');
      expect(router.push).toHaveBeenCalledWith('/admin/manage-groups');
    });
  });

  describe('Cross-Platform Testing', () => {
    it('should detect platform information correctly', () => {
      const platformInfo = CrossPlatformTesting.getPlatformInfo();

      expect(platformInfo).toHaveProperty('os');
      expect(platformInfo).toHaveProperty('version');
      expect(platformInfo).toHaveProperty('screenSize');
      expect(platformInfo).toHaveProperty('pixelDensity');
      expect(platformInfo).toHaveProperty('supportsHaptics');
    });

    it('should run navigation tests', async () => {
      const results = await CrossPlatformTesting.testAdminNavigation();

      expect(results).toHaveProperty('success');
      expect(results).toHaveProperty('errors');
      expect(results).toHaveProperty('platformSpecificIssues');
      expect(Array.isArray(results.errors)).toBe(true);
    });

    it('should run confirmation dialog tests', async () => {
      const results = await CrossPlatformTesting.testConfirmationDialogs();

      expect(results).toHaveProperty('success');
      expect(results).toHaveProperty('errors');
      expect(results).toHaveProperty('recommendations');
    });

    it('should run comprehensive tests', async () => {
      const results = await CrossPlatformTesting.runComprehensiveTests();

      expect(results).toHaveProperty('platformInfo');
      expect(results).toHaveProperty('navigation');
      expect(results).toHaveProperty('dialogs');
      expect(results).toHaveProperty('data');
      expect(results).toHaveProperty('accessibility');
      expect(results).toHaveProperty('overallSuccess');
    });

    it('should generate test report', async () => {
      const results = await CrossPlatformTesting.runComprehensiveTests();
      const report = CrossPlatformTesting.generateTestReport(results);

      expect(report).toContain('Cross-Platform Admin Features Test Report');
      expect(report).toContain('Platform:');
      expect(report).toContain('Navigation Tests');
      expect(report).toContain('Confirmation Dialog Tests');
    });
  });

  describe('AdminIntegration Component', () => {
    const TestChild = ({ adminIntegration }: any) => {
      return (
        <div>
          <button
            testID="show-help"
            onPress={() => adminIntegration?.showHelp('groups')}
          >
            Show Help
          </button>
          <text testID="admin-status">
            {adminIntegration?.isChurchAdmin ? 'Admin' : 'Not Admin'}
          </text>
        </div>
      );
    };

    it('should provide admin integration context to children', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AdminIntegration>
            <TestChild />
          </AdminIntegration>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('admin-status')).toHaveTextContent('Admin');
    });

    it('should show onboarding for new admin users', async () => {
      const mockSecureStorage = require('../../utils/secureStorage');
      mockSecureStorage.secureStorage.getItem.mockResolvedValue(null);

      render(
        <QueryClientProvider client={queryClient}>
          <AdminIntegration>
            <TestChild />
          </AdminIntegration>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Features Guide')).toBeTruthy();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle navigation errors gracefully', () => {
      const { router } = require('expo-router');
      router.push.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      expect(() => {
        AdminNavigation.toManageGroups();
      }).not.toThrow();
    });

    it('should provide fallback navigation when back is not available', () => {
      const { router } = require('expo-router');
      router.canGoBack.mockReturnValue(false);

      AdminNavigation.goBack();
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/profile');
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide proper accessibility labels for admin actions', () => {
      const mockOnConfirm = jest.fn();
      const mockOnCancel = jest.fn();

      const ConfirmationComponent = () =>
        AdminConfirmations.approveGroup(
          'Test Group',
          mockOnConfirm,
          mockOnCancel
        );

      render(<ConfirmationComponent />);

      // Check for accessibility properties
      const confirmButton = screen.getByText('Approve');
      expect(confirmButton).toBeTruthy();
    });

    it('should run accessibility tests', async () => {
      const results = await CrossPlatformTesting.testAccessibility();

      expect(results).toHaveProperty('success');
      expect(results).toHaveProperty('errors');
      expect(results).toHaveProperty('improvements');
      expect(results.improvements).toContain(
        'Verify color contrast ratios meet WCAG guidelines'
      );
    });
  });
});
