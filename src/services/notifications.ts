import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'friend_request' | 'event_reminder' | 'group_update';
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

    const token = await Notifications.getExpoPushTokenAsync();

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Register device for push notifications
 */
export const registerForPushNotifications = async (userId: string): Promise<void> => {
  try {
    const token = await getPushToken();
    if (!token) return;

    // Store the token in the database
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform'
      });

    if (error) {
      console.error('Error storing push token:', error);
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
};

/**
 * Unregister device from push notifications
 */
export const unregisterFromPushNotifications = async (userId: string): Promise<void> => {
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
export const cancelNotification = async (notificationId: string): Promise<void> => {
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
    const reminderTime = new Date(eventDateTime.getTime() - reminderMinutes * 60 * 1000);

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

    const notificationId = await scheduleLocalNotification(notification, {
      date: reminderTime,
    });

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

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Error fetching notification settings:', error);
      return null;
    }

    return data || {
      friend_requests: true,
      event_reminders: true,
      group_updates: true,
    };
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
    const { error } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

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