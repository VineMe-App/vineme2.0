import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Text } from '../ui/Text';
import { useNotificationSettings, useNotificationPermissions } from '../../hooks/useNotifications';
import { registerForPushNotifications, unregisterFromPushNotifications } from '../../services/notifications';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const { settings, isLoading, error, updateSettings, isUpdating } = useNotificationSettings(userId);
  const { checkPermissions, requestPermissions } = useNotificationPermissions();

  const [localState, setLocalState] = useState({
    friend_requests: true,
    friend_request_accepted: true,
    group_requests: true,
    group_request_responses: true,
    join_requests: true,
    join_request_responses: true,
    referral_updates: true,
    event_reminders: true,
    push_notifications: true,
    email_notifications: false,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    checkPermissions().then((granted) => {
      if (mounted) setPushGranted(granted);
    });
    return () => {
      mounted = false;
    };
  }, [checkPermissions]);

  useEffect(() => {
    if (settings) {
      setLocalState({
        friend_requests: !!settings.friend_requests,
        friend_request_accepted: !!settings.friend_request_accepted,
        group_requests: !!settings.group_requests,
        group_request_responses: !!settings.group_request_responses,
        join_requests: !!settings.join_requests,
        join_request_responses: !!settings.join_request_responses,
        referral_updates: !!settings.referral_updates,
        event_reminders: !!settings.event_reminders,
        push_notifications: !!settings.push_notifications,
        email_notifications: !!settings.email_notifications,
      });
      setHasChanges(false);
    }
  }, [settings]);

  const toggle = (key: keyof typeof localState) => {
    setLocalState((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Handle push registration/unregistration if changed
      if (settings && localState.push_notifications !== settings.push_notifications) {
        if (localState.push_notifications) {
          // Enabling push
          const granted = await checkPermissions();
          if (!granted) {
            const req = await requestPermissions();
            if (!req) {
              Alert.alert(
                'Permission Required',
                'Push notifications permission was not granted. You can enable it later in system settings.'
              );
            }
          }
          await registerForPushNotifications(userId);
          setPushGranted(true);
        } else {
          // Disabling push
          await unregisterFromPushNotifications(userId);
        }
      }

      await updateSettings({ ...localState });

      Alert.alert('Saved', 'Your notification settings have been updated.', [
        { text: 'OK', onPress: onClose },
      ]);
      setHasChanges(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Close without saving?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Close', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  if (isLoading && !settings) {
    return (
      <Modal isVisible={visible} onClose={handleClose} title="Notification Settings">
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading notification settings...</Text>
        </View>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal isVisible={visible} onClose={handleClose} title="Notification Settings">
        <ErrorMessage message="Failed to load notification settings" onRetry={() => {}} />
      </Modal>
    );
  }

  return (
    <Modal isVisible={visible} onClose={handleClose} title="Notification Settings">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.push_notifications}
              onPress={() => toggle('push_notifications')}
              label={`Enable push notifications${Platform.OS === 'android' ? ' (requires Google Play services)' : ''}`}
            />
            <Text style={styles.settingDescription}>
              Receive notifications even when the app is closed.
            </Text>
            {pushGranted === false && localState.push_notifications && (
              <Button
                title="Grant Permission"
                onPress={async () => {
                  const granted = await requestPermissions();
                  setPushGranted(granted);
                  if (!granted) {
                    Alert.alert('Permission not granted', 'Please enable notifications in system settings.');
                  }
                }}
                variant="secondary"
                size="small"
                style={{ marginTop: 8 }}
              />
            )}
          </View>
        </Card>

        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Friend Requests</Text>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.friend_requests}
              onPress={() => toggle('friend_requests')}
              label="Friend request received"
            />
          </View>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.friend_request_accepted}
              onPress={() => toggle('friend_request_accepted')}
              label="Friend request accepted"
            />
          </View>
        </Card>

        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Groups</Text>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.group_requests}
              onPress={() => toggle('group_requests')}
              label="New group request (admins)"
            />
          </View>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.group_request_responses}
              onPress={() => toggle('group_request_responses')}
              label="Group request responses"
            />
          </View>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.join_requests}
              onPress={() => toggle('join_requests')}
              label="Join request received (leaders)"
            />
          </View>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.join_request_responses}
              onPress={() => toggle('join_request_responses')}
              label="My join request responses"
            />
          </View>
        </Card>

        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Referrals & Events</Text>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.referral_updates}
              onPress={() => toggle('referral_updates')}
              label="Referral updates"
            />
          </View>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.event_reminders}
              onPress={() => toggle('event_reminders')}
              label="Event reminders"
            />
          </View>
        </Card>

        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Email Notifications</Text>
          <View style={styles.settingItem}>
            <Checkbox
              checked={localState.email_notifications}
              onPress={() => toggle('email_notifications')}
              label="Receive notifications via email"
            />
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title="Cancel"
            onPress={handleClose}
            variant="secondary"
            disabled={isUpdating}
            style={styles.cancelButton}
          />
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={isUpdating}
            disabled={!hasChanges || isUpdating}
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
  settingsCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginLeft: 32,
    lineHeight: 16,
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
