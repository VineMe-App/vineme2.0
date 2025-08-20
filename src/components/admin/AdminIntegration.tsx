/**
 * Admin Integration Component
 * Provides centralized admin feature integration and coordination
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../../stores/auth';
import { AdminOnboarding, AdminHelp } from './AdminOnboarding';
import {
  ConfirmationDialog,
  AdminConfirmations,
} from '../ui/ConfirmationDialog';
import { AdminNavigation, AdminWorkflows } from '../../utils/adminNavigation';
import { useAdminNotifications } from '../../hooks/useNotifications';
import { secureStorage } from '../../utils/secureStorage';

interface AdminIntegrationProps {
  children: React.ReactNode;
}

interface AdminState {
  showOnboarding: boolean;
  showHelp: boolean;
  helpContext: 'groups' | 'users' | 'general';
  confirmationDialog: {
    visible: boolean;
    type: 'approve' | 'decline' | 'close' | 'remove' | 'role' | 'delete' | null;
    data: any;
    onConfirm: (() => Promise<void>) | null;
    onCancel: (() => void) | null;
    isLoading: boolean;
  };
}

const ADMIN_ONBOARDING_KEY = 'admin_onboarding_completed';

export const AdminIntegration: React.FC<AdminIntegrationProps> = ({
  children,
}) => {
  const { user, userProfile } = useAuthStore();
  const { refreshNotifications } = useAdminNotifications(user?.id);

  const [adminState, setAdminState] = useState<AdminState>({
    showOnboarding: false,
    showHelp: false,
    helpContext: 'general',
    confirmationDialog: {
      visible: false,
      type: null,
      data: null,
      onConfirm: null,
      onCancel: null,
      isLoading: false,
    },
  });

  const isChurchAdmin = userProfile?.roles?.includes('church_admin') || false;

  // Check if admin onboarding should be shown
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isChurchAdmin) return;

      try {
        const completed = await secureStorage.getItem(ADMIN_ONBOARDING_KEY);
        if (!completed) {
          setAdminState((prev) => ({ ...prev, showOnboarding: true }));
        }
      } catch (error) {
        console.warn('Failed to check admin onboarding status:', error);
      }
    };

    checkOnboarding();
  }, [isChurchAdmin]);

  // Admin action handlers
  const handleOnboardingComplete = async () => {
    try {
      await secureStorage.setItem(ADMIN_ONBOARDING_KEY, 'true');
      setAdminState((prev) => ({ ...prev, showOnboarding: false }));

      Alert.alert(
        'Welcome to Admin Features! 🎉',
        "You're all set to manage your church community. Check the notification badges for pending actions.",
        [{ text: 'Get Started' }]
      );
    } catch (error) {
      console.warn('Failed to save onboarding completion:', error);
      setAdminState((prev) => ({ ...prev, showOnboarding: false }));
    }
  };

  const handleOnboardingSkip = async () => {
    try {
      await secureStorage.setItem(ADMIN_ONBOARDING_KEY, 'true');
      setAdminState((prev) => ({ ...prev, showOnboarding: false }));
    } catch (error) {
      console.warn('Failed to save onboarding skip:', error);
      setAdminState((prev) => ({ ...prev, showOnboarding: false }));
    }
  };

  const showHelp = (context: 'groups' | 'users' | 'general' = 'general') => {
    setAdminState((prev) => ({
      ...prev,
      showHelp: true,
      helpContext: context,
    }));
  };

  const hideHelp = () => {
    setAdminState((prev) => ({ ...prev, showHelp: false }));
  };

  // Confirmation dialog handlers
  const showConfirmation = (
    type: AdminState['confirmationDialog']['type'],
    data: any,
    onConfirm: () => Promise<void>,
    onCancel?: () => void
  ) => {
    setAdminState((prev) => ({
      ...prev,
      confirmationDialog: {
        visible: true,
        type,
        data,
        onConfirm,
        onCancel: onCancel || (() => hideConfirmation()),
        isLoading: false,
      },
    }));
  };

  const hideConfirmation = () => {
    setAdminState((prev) => ({
      ...prev,
      confirmationDialog: {
        visible: false,
        type: null,
        data: null,
        onConfirm: null,
        onCancel: null,
        isLoading: false,
      },
    }));
  };

  const handleConfirmationAction = async () => {
    const { onConfirm } = adminState.confirmationDialog;
    if (!onConfirm) return;

    setAdminState((prev) => ({
      ...prev,
      confirmationDialog: {
        ...prev.confirmationDialog,
        isLoading: true,
      },
    }));

    try {
      await onConfirm();
      hideConfirmation();
      refreshNotifications(); // Refresh notifications after admin actions
    } catch (error) {
      console.error('Admin action failed:', error);
      Alert.alert(
        'Action Failed',
        'The admin action could not be completed. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setAdminState((prev) => ({
        ...prev,
        confirmationDialog: {
          ...prev.confirmationDialog,
          isLoading: false,
        },
      }));
    }
  };

  const renderConfirmationDialog = () => {
    const { visible, type, data, isLoading } = adminState.confirmationDialog;

    if (!visible || !type || !data) return null;

    switch (type) {
      case 'approve':
        return AdminConfirmations.approveGroup(
          data.groupName,
          handleConfirmationAction,
          hideConfirmation,
          isLoading
        );

      case 'decline':
        return AdminConfirmations.declineGroup(
          data.groupName,
          handleConfirmationAction,
          hideConfirmation,
          isLoading
        );

      case 'close':
        return AdminConfirmations.closeGroup(
          data.groupName,
          data.memberCount || 0,
          handleConfirmationAction,
          hideConfirmation,
          isLoading
        );

      case 'remove':
        return AdminConfirmations.removeMember(
          data.memberName,
          data.groupName,
          handleConfirmationAction,
          hideConfirmation,
          isLoading
        );

      case 'role':
        return AdminConfirmations.changeRole(
          data.memberName,
          data.currentRole,
          data.newRole,
          data.groupName,
          handleConfirmationAction,
          hideConfirmation,
          isLoading
        );

      case 'delete':
        return AdminConfirmations.deleteAccount(
          handleConfirmationAction,
          hideConfirmation,
          isLoading
        );

      default:
        return null;
    }
  };

  // Provide admin integration context to children
  const adminIntegrationContext = {
    // Navigation helpers
    navigation: AdminNavigation,
    workflows: AdminWorkflows,

    // UI helpers
    showHelp,
    showConfirmation,

    // State
    isChurchAdmin,

    // Actions
    refreshNotifications,
  };

  return (
    <View style={styles.container}>
      {/* Pass context through React Context if needed */}
      {React.cloneElement(children as React.ReactElement, {
        adminIntegration: adminIntegrationContext,
      })}

      {/* Admin Onboarding */}
      {isChurchAdmin && (
        <AdminOnboarding
          visible={adminState.showOnboarding}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Admin Help */}
      <AdminHelp
        visible={adminState.showHelp}
        onClose={hideHelp}
        context={adminState.helpContext}
      />

      {/* Confirmation Dialogs */}
      {renderConfirmationDialog()}
    </View>
  );
};

/**
 * Hook for accessing admin integration features
 */
export const useAdminIntegration = () => {
  const { userProfile } = useAuthStore();
  const isChurchAdmin = userProfile?.roles?.includes('church_admin') || false;

  return {
    isChurchAdmin,
    navigation: AdminNavigation,
    workflows: AdminWorkflows,

    // Helper to show confirmation dialogs
    confirmAction: (
      type: 'approve' | 'decline' | 'close' | 'remove' | 'role' | 'delete',
      data: any,
      onConfirm: () => Promise<void>
    ) => {
      // This would need to be connected to the AdminIntegration context
      // For now, we'll use Alert as fallback
      Alert.alert(
        'Confirm Action',
        'Are you sure you want to perform this action?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: onConfirm },
        ]
      );
    },
  };
};

/**
 * Admin Integration Provider Context
 */
export const AdminIntegrationContext = React.createContext<{
  navigation: typeof AdminNavigation;
  workflows: typeof AdminWorkflows;
  showHelp: (context?: 'groups' | 'users' | 'general') => void;
  showConfirmation: (
    type: 'approve' | 'decline' | 'close' | 'remove' | 'role' | 'delete',
    data: any,
    onConfirm: () => Promise<void>,
    onCancel?: () => void
  ) => void;
  isChurchAdmin: boolean;
  refreshNotifications: () => void;
} | null>(null);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
