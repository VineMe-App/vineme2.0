/**
 * Confirmation Dialog Component
 * Provides consistent confirmation dialogs for destructive operations
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  ActivityIndicator,
} from 'react-native';
import { Button } from './Button';
import { Card } from './Card';

export interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning';
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  icon?: React.ReactNode;
  details?: string[];
  showCheckbox?: boolean;
  checkboxLabel?: string;
  checkboxRequired?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  checkboxChecked?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
  icon,
  details,
  showCheckbox = false,
  checkboxLabel,
  checkboxRequired = false,
  onCheckboxChange,
  checkboxChecked = false,
}) => {
  const handleConfirm = async () => {
    if (checkboxRequired && !checkboxChecked) {
      return;
    }
    await onConfirm();
  };

  const getIconForVariant = () => {
    if (icon) return icon;
    
    switch (confirmVariant) {
      case 'danger':
        return <Text style={styles.dangerIcon}>⚠️</Text>;
      case 'warning':
        return <Text style={styles.warningIcon}>⚡</Text>;
      default:
        return <Text style={styles.defaultIcon}>❓</Text>;
    }
  };

  const canConfirm = !isLoading && (!checkboxRequired || checkboxChecked);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isLoading ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <Card style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              {getIconForVariant()}
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          {details && details.length > 0 && (
            <View style={styles.detailsContainer}>
              {details.map((detail, index) => (
                <Text key={index} style={styles.detailItem}>
                  • {detail}
                </Text>
              ))}
            </View>
          )}

          {showCheckbox && checkboxLabel && (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => onCheckboxChange?.(!checkboxChecked)}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, checkboxChecked && styles.checkboxChecked]}>
                {checkboxChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>{checkboxLabel}</Text>
            </TouchableOpacity>
          )}

          {isDestructive && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ This action cannot be undone
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button
              title={cancelText}
              onPress={onCancel}
              variant="secondary"
              style={styles.button}
              disabled={isLoading}
            />
            <Button
              title={confirmText}
              onPress={handleConfirm}
              variant={confirmVariant}
              style={styles.button}
              disabled={!canConfirm}
              loading={isLoading}
            />
          </View>
        </Card>
      </View>
    </RNModal>
  );
};

/**
 * Pre-configured confirmation dialogs for common admin actions
 */
export class AdminConfirmations {
  /**
   * Confirm group approval
   */
  static approveGroup(
    groupName: string,
    onConfirm: () => Promise<void>,
    onCancel: () => void,
    isLoading = false
  ) {
    return (
      <ConfirmationDialog
        visible={true}
        title="Approve Group"
        message={`Are you sure you want to approve "${groupName}"?`}
        details={[
          'The group will become active and visible to all church members',
          'Group members will be able to join and participate',
          'The group leader will be notified of the approval',
        ]}
        confirmText="Approve"
        confirmVariant="primary"
        onConfirm={onConfirm}
        onCancel={onCancel}
        isLoading={isLoading}
        icon={<Text style={{ fontSize: 24 }}>✅</Text>}
      />
    );
  }

  /**
   * Confirm group decline
   */
  static declineGroup(
    groupName: string,
    onConfirm: () => Promise<void>,
    onCancel: () => void,
    isLoading = false
  ) {
    return (
      <ConfirmationDialog
        visible={true}
        title="Decline Group"
        message={`Are you sure you want to decline "${groupName}"?`}
        details={[
          'The group request will be rejected',
          'The group creator will be notified',
          'The group will not be created',
        ]}
        confirmText="Decline"
        confirmVariant="danger"
        isDestructive={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isLoading={isLoading}
        icon={<Text style={{ fontSize: 24 }}>❌</Text>}
      />
    );
  }

  /**
   * Confirm group closure
   */
  static closeGroup(
    groupName: string,
    memberCount: number,
    onConfirm: () => Promise<void>,
    onCancel: () => void,
    isLoading = false
  ) {
    return (
      <ConfirmationDialog
        visible={true}
        title="Close Group"
        message={`Are you sure you want to close "${groupName}"?`}
        details={[
          `This will affect ${memberCount} group members`,
          'The group will become inactive and hidden',
          'Members will no longer be able to participate',
          'Group data will be preserved but not accessible',
        ]}
        confirmText="Close Group"
        confirmVariant="danger"
        isDestructive={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isLoading={isLoading}
        icon={<Text style={{ fontSize: 24 }}>🔒</Text>}
        showCheckbox={true}
        checkboxLabel="I understand this will affect all group members"
        checkboxRequired={true}
      />
    );
  }

  /**
   * Confirm member removal
   */
  static removeMember(
    memberName: string,
    groupName: string,
    onConfirm: () => Promise<void>,
    onCancel: () => void,
    isLoading = false
  ) {
    return (
      <ConfirmationDialog
        visible={true}
        title="Remove Member"
        message={`Remove ${memberName} from "${groupName}"?`}
        details={[
          'The member will lose access to group activities',
          'They can request to rejoin later if desired',
          'The member will be notified of their removal',
        ]}
        confirmText="Remove"
        confirmVariant="danger"
        isDestructive={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isLoading={isLoading}
        icon={<Text style={{ fontSize: 24 }}>👤</Text>}
      />
    );
  }

  /**
   * Confirm role change (promote/demote)
   */
  static changeRole(
    memberName: string,
    currentRole: string,
    newRole: string,
    groupName: string,
    onConfirm: () => Promise<void>,
    onCancel: () => void,
    isLoading = false
  ) {
    const isPromotion = newRole === 'leader';
    
    return (
      <ConfirmationDialog
        visible={true}
        title={isPromotion ? 'Promote to Leader' : 'Demote from Leader'}
        message={`Change ${memberName}'s role from ${currentRole} to ${newRole} in "${groupName}"?`}
        details={
          isPromotion
            ? [
                'The member will gain group management permissions',
                'They can approve join requests and manage members',
                'They will be notified of their new role',
              ]
            : [
                'The member will lose group management permissions',
                'They will become a regular group member',
                'They will be notified of the role change',
              ]
        }
        confirmText={isPromotion ? 'Promote' : 'Demote'}
        confirmVariant={isPromotion ? 'primary' : 'warning'}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isLoading={isLoading}
        icon={<Text style={{ fontSize: 24 }}>{isPromotion ? '⬆️' : '⬇️'}</Text>}
      />
    );
  }

  /**
   * Confirm delete account
   */
  static deleteAccount(
    onConfirm: () => Promise<void>,
    onCancel: () => void,
    isLoading = false
  ) {
    return (
      <ConfirmationDialog
        visible={true}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account?"
        details={[
          'All your personal data will be permanently deleted',
          'You will be removed from all groups',
          'Your friendships and connections will be lost',
          'This action cannot be undone',
        ]}
        confirmText="Delete Account"
        confirmVariant="danger"
        isDestructive={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isLoading={isLoading}
        icon={<Text style={{ fontSize: 24 }}>🗑️</Text>}
        showCheckbox={true}
        checkboxLabel="I understand this will permanently delete all my data"
        checkboxRequired={true}
      />
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 12,
  },
  defaultIcon: {
    fontSize: 32,
  },
  dangerIcon: {
    fontSize: 32,
  },
  warningIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});