/**
 * Admin Navigation Utilities
 * Provides centralized navigation helpers for admin features
 */

import { router } from 'expo-router';
import { Alert } from 'react-native';

export interface NavigationOptions {
  replace?: boolean;
  params?: Record<string, any>;
}

export class AdminNavigation {
  /**
   * Navigate to admin dashboard/profile
   */
  static toAdminDashboard(options?: NavigationOptions) {
    const route = '/(tabs)/profile';
    if (options?.replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  }

  /**
   * Navigate to manage groups screen
   */
  static toManageGroups(options?: NavigationOptions) {
    const route = '/admin/manage-groups';
    if (options?.replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  }

  /**
   * Navigate to manage users screen
   */
  static toManageUsers(options?: NavigationOptions) {
    const route = '/admin/manage-users';
    if (options?.replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  }

  /**
   * Navigate to group detail screen
   */
  static toGroupDetail(groupId: string, options?: NavigationOptions) {
    const route = `/group/${groupId}`;
    if (options?.replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  }

  /**
   * Navigate to group creation screen
   */
  static toCreateGroup(options?: NavigationOptions) {
    const route = '/group/create';
    if (options?.replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  }

  /**
   * Navigate to groups list
   */
  static toGroupsList(options?: NavigationOptions) {
    const route = '/(tabs)/groups';
    if (options?.replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  }

  /**
   * Navigate back with optional fallback
   */
  static goBack(fallbackRoute?: string) {
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackRoute) {
      router.replace(fallbackRoute);
    } else {
      router.replace('/(tabs)/profile');
    }
  }

  /**
   * Navigate to admin feature with permission check
   */
  static toAdminFeature(
    feature: 'groups' | 'users',
    userRoles?: string[],
    onUnauthorized?: () => void
  ) {
    const hasAdminRole = userRoles?.includes('church_admin') || false;

    if (!hasAdminRole) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        Alert.alert(
          'Access Denied',
          'You need church admin permissions to access this feature.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    switch (feature) {
      case 'groups':
        this.toManageGroups();
        break;
      case 'users':
        this.toManageUsers();
        break;
    }
  }

  /**
   * Get breadcrumb navigation for current route
   */
  static getBreadcrumbs(
    currentRoute: string
  ): { label: string; route?: string }[] {
    const breadcrumbs: { label: string; route?: string }[] = [];

    if (currentRoute.startsWith('/admin/')) {
      breadcrumbs.push({ label: 'Profile', route: '/(tabs)/profile' });

      if (currentRoute === '/admin/manage-groups') {
        breadcrumbs.push({ label: 'Manage Groups' });
      } else if (currentRoute === '/admin/manage-users') {
        breadcrumbs.push({ label: 'Manage Users' });
      }
    } else if (currentRoute.startsWith('/group/')) {
      breadcrumbs.push({ label: 'Groups', route: '/(tabs)/groups' });

      if (currentRoute === '/group/create') {
        breadcrumbs.push({ label: 'Create Group' });
      } else if (currentRoute.match(/\/group\/[^/]+$/)) {
        breadcrumbs.push({ label: 'Group Details' });
      }
    }

    return breadcrumbs;
  }
}

/**
 * Navigation flow helpers for common admin workflows
 */
export class AdminWorkflows {
  /**
   * Complete group approval workflow
   */
  static async approveGroupWorkflow(
    groupId: string,
    groupName: string,
    onApprove: () => Promise<void>
  ) {
    try {
      await onApprove();

      Alert.alert(
        'Group Approved! ✅',
        `${groupName} has been approved and is now active.`,
        [
          {
            text: 'View Group',
            onPress: () => AdminNavigation.toGroupDetail(groupId),
          },
          {
            text: 'Continue Managing',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Approval Failed',
        'Failed to approve the group. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Complete group creation workflow
   */
  static async createGroupWorkflow(
    onSuccess?: () => void,
    navigateToGroups = true
  ) {
    Alert.alert(
      'Group Request Submitted! 🎉',
      'Your group creation request has been submitted for approval. You will be notified once it has been reviewed.',
      [
        {
          text: 'View My Groups',
          onPress: () => {
            if (navigateToGroups) {
              AdminNavigation.toGroupsList();
            }
            onSuccess?.();
          },
        },
        {
          text: 'OK',
          onPress: onSuccess,
        },
      ]
    );
  }

  /**
   * Handle user joining group workflow
   */
  static async joinGroupWorkflow(
    groupName: string,
    requiresApproval: boolean,
    onJoin: () => Promise<void>
  ) {
    try {
      await onJoin();

      if (requiresApproval) {
        Alert.alert(
          'Join Request Sent! 📨',
          `Your request to join ${groupName} has been sent to the group leaders for approval.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Welcome to the Group! 🎉',
          `You have successfully joined ${groupName}.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Join Failed',
        'Failed to join the group. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }
}
