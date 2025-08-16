import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Ensure Android notification channel exists
const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  } catch (e) {
    console.warn('[Notifications] Failed to set Android notification channel', e);
  }
};

export interface NotificationData {
  type:
    | 'friend_request'
    | 'event_reminder'
    | 'group_update'
    | 'group_request'
    | 'join_request';
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return false;
  }

  await ensureAndroidNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return false;
  }

  return true;
};

/**
 * Get the device's push notification token
 */
export const getPushToken = async (): Promise<string | null> => {
  try {
    // Skip web unless properly configured with VAPID; prevents runtime error on web
    if (Platform.OS === 'web') {
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // On Android, FCM must be configured or Firebase will not initialize
    const { default: Constants } = await import('expo-constants');
    const googleServicesConfigured = Boolean(
      (Constants as any)?.expoConfig?.android?.googleServicesFile ||
        (Constants as any)?.android?.googleServicesFile
    );

    // Optional env-based override so you can enable only when configured
    const envPushEnabled = process.env.EXPO_PUBLIC_ENABLE_PUSH === 'true';

    if (Platform.OS === 'android' && !googleServicesConfigured && !envPushEnabled) {
      console.warn(
        '[Notifications] Android push not configured (no google-services.json). Skipping token fetch.'
      );
      return null;
    }

    // On development builds, projectId must be provided explicitly
    const projectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const tokenStr = token.data;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, tokenStr);
    } catch {}
    if (__DEV__) console.log('[Notifications] Expo push token:', tokenStr);
    return tokenStr;
  } catch (error) {
    // Common Android case: FCM not initialized. Provide a clearer hint.
    if (Platform.OS === 'android') {
      console.warn(
        'Error getting push token on Android. Ensure FCM is set up: https://docs.expo.dev/push-notifications/fcm-credentials/'
      );
    }
    // Downgrade to warn to reduce noise during development without FCM
    console.warn('Error getting push token:', error);
    return null;
  }
};

/**
 * Register device for push notifications
 */
export const registerForPushNotifications = async (
  userId: string
): Promise<void> => {
  try {
    const token = await getPushToken();
    if (!token) return;

    // Store the token in the database
    const { error } = await supabase.from('user_push_tokens').upsert(
      {
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,platform',
      }
    );

    if (error) {
      console.error('Error storing push token:', error);
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
};

/**
 * Read stored Expo push token if available
 */
export const getStoredPushToken = async (): Promise<string | null> => {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    return v || null;
  } catch {
    return null;
  }
};

/**
 * Unregister device from push notifications
 */
export const unregisterFromPushNotifications = async (
  userId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('platform', Platform.OS);

    if (error) {
      console.error('Error removing push token:', error);
    }
  } catch (error) {
    console.error('Error unregistering from push notifications:', error);
  }
};

/**
 * Schedule a local notification
 */
export const scheduleLocalNotification = async (
  notification: NotificationData,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> => {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: {
        type: notification.type,
        id: notification.id,
        ...notification.data,
      },
    },
    trigger: trigger || null, // null means show immediately
  });

  return notificationId;
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (
  notificationId: string
): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

/**
 * Cancel all notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Handle notification response (when user taps notification)
 */
export const handleNotificationResponse = (
  response: Notifications.NotificationResponse,
  router: any
) => {
  const { type, id } = response.notification.request.content.data;

  switch (type) {
    case 'friend_request':
      router.push('/(tabs)/profile');
      break;
    case 'event_reminder':
      router.push(`/event/${id}`);
      break;
    case 'group_update':
      router.push(`/group/${id}`);
      break;
    case 'group_request':
      // Navigate to admin groups management screen
      router.push('/(tabs)/profile'); // TODO: Update when admin screens are implemented
      break;
    case 'join_request':
      router.push(`/group/${id}`);
      break;
    default:
      router.push('/(tabs)');
  }
};

/**
 * Send a friend request notification
 */
export const sendFriendRequestNotification = async (
  fromUserId: string,
  toUserId: string,
  fromUserName: string
): Promise<void> => {
  try {
    // This would typically be handled by your backend
    // For now, we'll just schedule a local notification if the user is the recipient
    const notification: NotificationData = {
      type: 'friend_request',
      id: fromUserId,
      title: 'New Friend Request',
      body: `${fromUserName} wants to be your friend`,
      data: { fromUserId, toUserId },
    };

    await scheduleLocalNotification(notification);
  } catch (error) {
    console.error('Error sending friend request notification:', error);
  }
};

/**
 * Send an event reminder notification
 */
export const sendEventReminderNotification = async (
  eventId: string,
  eventTitle: string,
  eventDate: string,
  reminderMinutes: number = 60
): Promise<string | null> => {
  try {
    const eventDateTime = new Date(eventDate);
    const reminderTime = new Date(
      eventDateTime.getTime() - reminderMinutes * 60 * 1000
    );

    // Don't schedule if the reminder time is in the past
    if (reminderTime <= new Date()) {
      return null;
    }

    const notification: NotificationData = {
      type: 'event_reminder',
      id: eventId,
      title: 'Event Reminder',
      body: `${eventTitle} starts in ${reminderMinutes} minutes`,
      data: { eventId, eventTitle },
    };

    const notificationId = await scheduleLocalNotification(
      notification,
      // Cast to satisfy varying NotificationTriggerInput types across SDKs
      reminderTime as unknown as Notifications.NotificationTriggerInput
    );

    return notificationId;
  } catch (error) {
    console.error('Error scheduling event reminder:', error);
    return null;
  }
};

/**
 * Get notification settings for a user
 */
export const getNotificationSettings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Not found error
      console.error('Error fetching notification settings:', error);
      return null;
    }

    return (
      data || {
        friend_requests: true,
        event_reminders: true,
        group_updates: true,
      }
    );
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return null;
  }
};

/**
 * Update notification settings for a user
 */
export const updateNotificationSettings = async (
  userId: string,
  settings: {
    friend_requests?: boolean;
    event_reminders?: boolean;
    group_updates?: boolean;
  }
) => {
  try {
    const { error } = await supabase.from('user_notification_settings').upsert(
      {
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return false;
  }
};

/**
 * Send group creation request notification to church admins
 */
export const sendGroupRequestNotification = async (
  churchId: string,
  groupTitle: string,
  creatorName: string,
  groupId?: string
): Promise<void> => {
  try {
    // Get all church admins
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('church_id', churchId)
      .eq('role', 'church_admin');

    if (error) {
      console.error('Error fetching church admins:', error);
      return;
    }

    if (!admins || admins.length === 0) {
      console.warn('No church admins found for notification');
      return;
    }

    // Create notification record in database for each admin
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      type: 'group_request' as const,
      title: 'New Group Request',
      body: `${creatorName} has requested to create "${groupTitle}"`,
      data: { 
        churchId, 
        groupTitle, 
        creatorName,
        groupId: groupId || churchId,
        action_url: '/admin/manage-groups'
      },
      read: false,
      created_at: new Date().toISOString(),
    }));

    // Store notifications in database
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error storing notifications:', insertError);
    }

    // Send push notifications to each admin
    const notification: NotificationData = {
      type: 'group_request',
      id: groupId || churchId,
      title: 'New Group Request',
      body: `${creatorName} has requested to create "${groupTitle}"`,
      data: { churchId, groupTitle, creatorName, groupId },
    };

    // Schedule local notification for immediate display
    await scheduleLocalNotification(notification);

    console.log('Group request notifications sent to', admins.length, 'admins');
  } catch (error) {
    console.error('Error sending group request notification:', error);
  }
};

/**
 * Send join request notification to group leaders
 */
export const sendJoinRequestNotification = async (
  groupId: string,
  groupTitle: string,
  requesterName: string,
  requesterId?: string
): Promise<void> => {
  try {
    // Get all group leaders
    const { data: leaders, error } = await supabase
      .from('group_memberships')
      .select(
        `
        user_id,
        user:users(id, name)
      `
      )
      .eq('group_id', groupId)
      .eq('role', 'leader')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching group leaders:', error);
      return;
    }

    if (!leaders || leaders.length === 0) {
      console.warn('No group leaders found for notification');
      return;
    }

    // Create notification record in database for each leader
    const notifications = leaders.map(leader => ({
      user_id: leader.user_id,
      type: 'join_request' as const,
      title: 'New Join Request',
      body: `${requesterName} wants to join "${groupTitle}"`,
      data: { 
        groupId, 
        groupTitle, 
        requesterName,
        requesterId,
        action_url: `/group/${groupId}`
      },
      read: false,
      created_at: new Date().toISOString(),
    }));

    // Store notifications in database
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error storing notifications:', insertError);
    }

    // Send push notification to each leader
    const notification: NotificationData = {
      type: 'join_request',
      id: groupId,
      title: 'New Join Request',
      body: `${requesterName} wants to join "${groupTitle}"`,
      data: { groupId, groupTitle, requesterName, requesterId },
    };

    // Schedule local notification for immediate display
    await scheduleLocalNotification(notification);

    console.log('Join request notifications sent to', leaders.length, 'leaders');
  } catch (error) {
    console.error('Error sending join request notification:', error);
  }
};
