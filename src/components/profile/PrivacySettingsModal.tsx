import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import {
  usePrivacySettings,
  useUpdatePrivacySettings,
  useUserContactLogs,
} from '../../hooks/useContactAudit';

interface PrivacySettingsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const [allowEmailSharing, setAllowEmailSharing] = useState(true);
  const [allowPhoneSharing, setAllowPhoneSharing] = useState(true);
  const [allowContactByLeaders, setAllowContactByLeaders] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    data: privacySettings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = usePrivacySettings(userId);

  const { data: contactLogs, isLoading: isLoadingLogs } = useUserContactLogs(
    userId,
    userId
  );

  const updatePrivacyMutation = useUpdatePrivacySettings();

  // Update local state when privacy settings are loaded
  useEffect(() => {
    if (privacySettings) {
      setAllowEmailSharing(privacySettings.allow_email_sharing);
      setAllowPhoneSharing(privacySettings.allow_phone_sharing);
      setAllowContactByLeaders(privacySettings.allow_contact_by_leaders);
      setHasChanges(false);
    }
  }, [privacySettings]);

  const handleSettingChange = (
    setting: 'email' | 'phone' | 'leaders',
    value: boolean
  ) => {
    setHasChanges(true);

    switch (setting) {
      case 'email':
        setAllowEmailSharing(value);
        break;
      case 'phone':
        setAllowPhoneSharing(value);
        break;
      case 'leaders':
        setAllowContactByLeaders(value);
        // If disabling leader contact, also disable specific contact types
        if (!value) {
          setAllowEmailSharing(false);
          setAllowPhoneSharing(false);
        }
        break;
    }
  };

  const handleSave = async () => {
    try {
      await updatePrivacyMutation.mutateAsync({
        userId,
        updates: {
          allow_email_sharing: allowEmailSharing,
          allow_phone_sharing: allowPhoneSharing,
          allow_contact_by_leaders: allowContactByLeaders,
        },
      });

      Alert.alert(
        'Settings Updated',
        'Your privacy settings have been updated successfully.',
        [{ text: 'OK', onPress: onClose }]
      );

      setHasChanges(false);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to update privacy settings'
      );
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Close', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoadingSettings) {
    return (
      <Modal visible={visible} onClose={handleClose} title="Privacy Settings">
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
        </View>
      </Modal>
    );
  }

  if (settingsError) {
    return (
      <Modal visible={visible} onClose={handleClose} title="Privacy Settings">
        <ErrorMessage
          message="Failed to load privacy settings"
          onRetry={() => window.location.reload()}
        />
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Contact Privacy Settings"
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Control how your contact information is shared with group leaders when
          you join groups.
        </Text>

        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Contact Sharing Preferences</Text>

          <View style={styles.settingItem}>
            <Checkbox
              checked={allowContactByLeaders}
              onPress={() =>
                handleSettingChange('leaders', !allowContactByLeaders)
              }
              label="Allow group leaders to contact me"
            />
            <Text style={styles.settingDescription}>
              When enabled, group leaders can access your contact information
              when you join their groups.
            </Text>
          </View>

          {allowContactByLeaders && (
            <>
              <View style={styles.settingItem}>
                <Checkbox
                  checked={allowEmailSharing}
                  onPress={() =>
                    handleSettingChange('email', !allowEmailSharing)
                  }
                  label="Share email address"
                />
                <Text style={styles.settingDescription}>
                  Allow group leaders to see and contact you via email.
                </Text>
              </View>

              <View style={styles.settingItem}>
                <Checkbox
                  checked={allowPhoneSharing}
                  onPress={() =>
                    handleSettingChange('phone', !allowPhoneSharing)
                  }
                  label="Share phone number"
                />
                <Text style={styles.settingDescription}>
                  Allow group leaders to see and call your phone number.
                </Text>
              </View>
            </>
          )}
        </Card>

        {contactLogs && contactLogs.length > 0 && (
          <Card style={styles.logsCard}>
            <Text style={styles.sectionTitle}>Recent Contact Access</Text>
            <Text style={styles.logsDescription}>
              Here's when group leaders have accessed your contact information:
            </Text>

            {isLoadingLogs ? (
              <LoadingSpinner size="small" />
            ) : (
              <View style={styles.logsList}>
                {contactLogs.slice(0, 5).map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logAccessor}>
                        {log.accessor?.name || 'Unknown'}
                      </Text>
                      <Text style={styles.logDate}>
                        {formatDate(log.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.logDetails}>
                      {log.access_type === 'view'
                        ? 'Viewed'
                        : log.access_type === 'call'
                          ? 'Called'
                          : log.access_type === 'email'
                            ? 'Emailed'
                            : 'Messaged'}{' '}
                      your {log.contact_fields.join(' and ')} in{' '}
                      {log.group?.title || 'Unknown Group'}
                    </Text>
                  </View>
                ))}

                {contactLogs.length > 5 && (
                  <Text style={styles.moreLogsText}>
                    And {contactLogs.length - 5} more access
                    {contactLogs.length - 5 === 1 ? '' : 'es'}...
                  </Text>
                )}
              </View>
            )}
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            title="Cancel"
            onPress={handleClose}
            variant="secondary"
            disabled={updatePrivacyMutation.isPending}
            style={styles.cancelButton}
          />
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={updatePrivacyMutation.isPending}
            disabled={!hasChanges || updatePrivacyMutation.isPending}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 600,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 24,
  },
  settingsCard: {
    marginBottom: 24,
  },
  logsCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginLeft: 32,
    lineHeight: 16,
  },
  logsDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  logsList: {
    gap: 12,
  },
  logItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logAccessor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  logDate: {
    fontSize: 12,
    color: '#666',
  },
  logDetails: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },
  moreLogsText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
