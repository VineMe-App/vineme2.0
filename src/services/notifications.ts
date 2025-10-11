import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import type {
  NotificationType,
  Notification,
  NotificationSettings,
  NotificationTriggerData,
} from '../types/database';
import { getFullName } from '../utils/name';

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
    console.warn(
      '[Notifications] Failed to set Android notification channel',
      e
    );
  }
};

export interface NotificationData {
  type:
    | NotificationType
    | 'friend_request'
    | 'event_reminder'
    | 'group_update'
    | 'group_request'
    | 'join_request'; // Legacy types for backward compatibility
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Server-side push delivery via Supabase Edge Function
// Invokes the `push-notify` function with recipient and payload.
const sendPushToUser = async (
  userId: string,
  payload: { title: string; body: string; data?: Record<string, any> }
) => {
  try {
    // Skip on web or if Functions unavailable
    const fn = (supabase as any)?.functions?.invoke;
    if (!fn) return;
    const { data, error } = await supabase.functions.invoke('push-notify', {
      body: { userId, ...payload },
    });
    if (__DEV__) {
      console.log('[Push] invoke result:', { data, error });
    }
  } catch (e) {
    if (__DEV__) console.warn('[Notifications] push-notify failed', e);
  }
};

// Enhanced notification creation input
export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
  expires_at?: string;
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

    if (
      Platform.OS === 'android' &&
      !googleServicesConfigured &&
      !envPushEnabled
    ) {
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

    // Ensure a users row exists before attempting to upsert FK-dependent token
    const { data: userRow, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userCheckError) {
      console.warn(
        '[Notifications] Skipping push token save: user check failed',
        userCheckError
      );
      return;
    }
    if (!userRow) {
      if (__DEV__)
        console.warn(
          '[Notifications] Skipping push token save: no users row yet'
        );
      return;
    }

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
  const { actionUrl } = response.notification.request.content.data;

  // this logic is handled when the notification is created
  // the actionUrl holds this data. we just need to route to it
  /* switch (type) {
    case 'friend_request_accepted':
    case 'friend_request_received':
      console.log(actionUrl, type);
      router.replace(actionUrl);
      break;
    case 'event_reminder':
      router.replace(`/event/${id}`);
      break;
    case 'group_update':
      router.replace(`/group/${id}`);
      break;
    case 'group_request':
      // Navigate to admin groups management screen
      router.replace('/(tabs)/profile'); // TODO: Update when admin screens are implemented
      break;
    case 'join_request':
      router.replace(`/group/${id}`);
      break;
    default:
      console.log('notification type: ', type);
      router.replace('/(tabs)');
  } */
  if (actionUrl) {
    router.replace(actionUrl);
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
 * Get unread notifications for a user
 */
export const getUnreadNotifications = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return [];
  }
};

export const getUnreadNotificationsWithSettings = async (userId: string) => {
  try {
    const types = await getAllowedNotificationTypesForUser(userId);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .in('type', types)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return [];
  }
};

/**
 * Get all notifications for a user
 */
export const getUserNotifications = async (
  userId: string,
  limit: number = 50
) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Get notification count by type for admin dashboard
 */
export const getAdminNotificationCounts = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching admin notification counts:', error);
      return { group_requests: 0, join_requests: 0, total: 0 };
    }

    const counts = data?.reduce(
      (acc, notification) => {
        if (notification.type === 'group_request') {
          acc.group_requests++;
        } else if (notification.type === 'join_request') {
          acc.join_requests++;
        }
        acc.total++;
        return acc;
      },
      { group_requests: 0, join_requests: 0, total: 0 }
    ) || { group_requests: 0, join_requests: 0, total: 0 };

    return counts;
  } catch (error) {
    console.error('Error getting admin notification counts:', error);
    return { group_requests: 0, join_requests: 0, total: 0 };
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
      .select('id, name, roles')
      .eq('church_id', churchId)
      .contains('roles', ['church_admin']);

    if (error) {
      console.error('Error fetching church admins:', error);
      return;
    }

    if (!admins || admins.length === 0) {
      console.warn('No church admins found for notification');
      return;
    }

    // Create notification record in database for each admin
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: 'group_request' as const,
      title: 'New Group Request',
      body: `${creatorName} has requested to create "${groupTitle}"`,
      data: {
        churchId,
        groupTitle,
        creatorName,
        groupId: groupId || churchId,
        action_url: '/admin/manage-groups',
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
        user:users(id, first_name, last_name)
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
    const notifications = leaders.map((leader) => ({
      user_id: leader.user_id,
      type: 'join_request_received' as const,
      title: 'New Join Request',
      body: `${requesterName} wants to join "${groupTitle}"`,
      data: {
        groupId,
        groupTitle,
        requesterName,
        requesterId,
      },
      action_url: `/group/${groupId}`,
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

    console.log(
      'Join request notifications sent to',
      leaders.length,
      'leaders'
    );
  } catch (error) {
    console.error('Error sending join request notification:', error);
  }
};

/**
 * Enhanced notification service methods
 */

// Enhanced notification trigger methods

/**
 * Trigger friend request notification
 */
export const triggerFriendRequestNotification = async (
  data: NotificationTriggerData['friendRequest']
): Promise<void> => {
  try {
    // Check if recipient has friend request notifications enabled
    const settings = await getEnhancedNotificationSettings(data.toUserId);
    if (settings && !settings.friend_requests) {
      return; // User has disabled friend request notifications
    }

    const notification = await createNotification({
      user_id: data.toUserId,
      type: 'friend_request_received',
      title: 'New Friend Request',
      body: `${data.fromUserName} wants to be your friend`,
      data: {
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
      },
      action_url: `/user/${data.fromUserId}`,
    });

    if (notification) {
      // Only schedule a local notification on this device if the
      // current authenticated user is the recipient of the notification.
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user?.id === data.toUserId) {
          await scheduleLocalNotification({
            type: 'friend_request_received',
            id: notification.id,
            title: notification.title,
            body: notification.body,
            data: notification.data,
          });
        }
      } catch {}

      // Remote push to recipient device(s)
      await sendPushToUser(data.toUserId, {
        title: 'New Friend Request',
        body: `${data.fromUserName} wants to be your friend`,
        data: {
          type: 'friend_request_received',
          id: notification.id,
          ...notification.data,
        },
      });
    }
  } catch (error) {
    console.error('Error triggering friend request notification:', error);
  }
};

/**
 * Trigger friend request accepted notification
 */
export const triggerFriendRequestAcceptedNotification = async (
  data: NotificationTriggerData['friendRequestAccepted']
): Promise<void> => {
  try {
    // Check if user has friend request accepted notifications enabled
    const settings = await getEnhancedNotificationSettings(
      data.originalRequesterId
    );
    if (settings && !settings.friend_request_accepted) {
      return; // User has disabled friend request accepted notifications
    }

    const notification = await createNotification({
      user_id: data.originalRequesterId,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted',
      body: `${data.acceptedByUserName} accepted your friend request`,
      data: {
        acceptedByUserId: data.acceptedByUserId,
        acceptedByUserName: data.acceptedByUserName,
      },
      action_url: `/user/${data.acceptedByUserId}`,
    });

    if (notification) {
      // Only schedule locally if the current user is the original requester
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user?.id === data.originalRequesterId) {
          await scheduleLocalNotification({
            type: 'friend_request_accepted',
            id: notification.id,
            title: notification.title,
            body: notification.body,
            data: notification.data,
          });
        }
      } catch {}

      // Remote push to original requester device(s)
      await sendPushToUser(data.originalRequesterId, {
        title: 'Friend Request Accepted',
        body: `${data.acceptedByUserName} accepted your friend request`,
        data: {
          type: 'friend_request_accepted',
          id: notification.id,
          ...notification.data,
        },
      });
    }
  } catch (error) {
    console.error(
      'Error triggering friend request accepted notification:',
      error
    );
  }
};

/**
 * Trigger group request submitted notification (to church admins)
 */
export const triggerGroupRequestSubmittedNotification = async (
  data: NotificationTriggerData['groupRequestSubmitted']
): Promise<void> => {
  try {
    // Get all church admins
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('church_id', data.churchId)
      .contains('roles', ['church_admin']);

    if (error) {
      console.error('Error fetching church admins:', error);
      return;
    }

    if (!admins || admins.length === 0) {
      console.warn('No church admins found for group request notification');
      return;
    }

    // Create notifications for each admin
    const notifications = await Promise.all(
      admins.map(async (admin) => {
        // Check if admin has group request notifications enabled
        const settings = await getEnhancedNotificationSettings(admin.id);
        if (settings && !settings.group_requests) {
          return null; // Admin has disabled group request notifications
        }

        return createNotification({
          user_id: admin.id,
          type: 'group_request_submitted',
          title: 'New Group Request',
          body: `${data.creatorName} has requested to create "${data.groupTitle}"`,
          data: {
            groupId: data.groupId,
            groupTitle: data.groupTitle,
            creatorId: data.creatorId,
            creatorName: data.creatorName,
            churchId: data.churchId,
          },
          action_url: `/admin/groups/${data.groupId}`,
        });
      })
    );

    // Schedule local notifications for admins with notifications enabled
    const validNotifications = notifications.filter((n) => n !== null);
    for (const notification of validNotifications) {
      if (notification) {
        await scheduleLocalNotification({
          type: 'group_request_submitted',
          id: notification.id,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
      }
    }

    console.log(
      `Group request notifications sent to ${validNotifications.length} admins`
    );
  } catch (error) {
    console.error(
      'Error triggering group request submitted notification:',
      error
    );
  }
};

/**
 * Trigger group request approved notification
 */
export const triggerGroupRequestApprovedNotification = async (
  data: NotificationTriggerData['groupRequestApproved']
): Promise<void> => {
  try {
    // Check if leader has group request response notifications enabled
    const settings = await getEnhancedNotificationSettings(data.leaderId);
    if (settings && !settings.group_request_responses) {
      return; // User has disabled group request response notifications
    }

    const notification = await createNotification({
      user_id: data.leaderId,
      type: 'group_request_approved',
      title: 'Group Request Approved',
      body: `Your group "${data.groupTitle}" has been approved by ${data.approvedByName}`,
      data: {
        groupId: data.groupId,
        groupTitle: data.groupTitle,
        approvedByName: data.approvedByName,
      },
      action_url: `/group/${data.groupId}`,
    });

    if (notification) {
      // Schedule local notification for immediate display
      await scheduleLocalNotification({
        type: 'group_request_approved',
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
    }
  } catch (error) {
    console.error(
      'Error triggering group request approved notification:',
      error
    );
  }
};

/**
 * Trigger group request denied notification
 */
export const triggerGroupRequestDeniedNotification = async (
  data: NotificationTriggerData['groupRequestDenied']
): Promise<void> => {
  try {
    // Check if leader has group request response notifications enabled
    const settings = await getEnhancedNotificationSettings(data.leaderId);
    if (settings && !settings.group_request_responses) {
      return; // User has disabled group request response notifications
    }

    const bodyText = data.reason
      ? `Your group "${data.groupTitle}" was declined by ${data.deniedByName}. Reason: ${data.reason}`
      : `Your group "${data.groupTitle}" was declined by ${data.deniedByName}`;

    const notification = await createNotification({
      user_id: data.leaderId,
      type: 'group_request_denied',
      title: 'Group Request Declined',
      body: bodyText,
      data: {
        groupId: data.groupId,
        groupTitle: data.groupTitle,
        deniedByName: data.deniedByName,
        reason: data.reason,
      },
      action_url: `/group/${data.groupId}`,
    });

    if (notification) {
      // Schedule local notification for immediate display
      await scheduleLocalNotification({
        type: 'group_request_denied',
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
    }
  } catch (error) {
    console.error('Error triggering group request denied notification:', error);
  }
};

/**
 * Trigger join request received notification (to group leaders)
 */
export const triggerJoinRequestReceivedNotification = async (
  data: NotificationTriggerData['joinRequestReceived']
): Promise<void> => {
  try {
    // Create notifications for each leader
    const notifications = await Promise.all(
      data.leaderIds.map(async (leaderId) => {
        // Check if leader has join request notifications enabled
        const settings = await getEnhancedNotificationSettings(leaderId);
        if (settings && !settings.join_requests) {
          return null; // Leader has disabled join request notifications
        }

        return createNotification({
          user_id: leaderId,
          type: 'join_request_received',
          title: 'New Join Request',
          body: `${data.requesterName} wants to join "${data.groupTitle}"`,
          data: {
            groupId: data.groupId,
            groupTitle: data.groupTitle,
            requesterId: data.requesterId,
            requesterName: data.requesterName,
          },
          action_url: `/group/${data.groupId}/requests`,
        });
      })
    );

    // Schedule local notifications and send remote push for leaders with notifications enabled
    const validNotifications = notifications.filter((n) => n !== null);
    for (const notification of validNotifications) {
      if (!notification) continue;
      // Local (only shows if current device belongs to leader)
      await scheduleLocalNotification({
        type: 'join_request_received',
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
      // Remote push
      await sendPushToUser(notification.user_id, {
        title: notification.title,
        body: notification.body,
        data: {
          type: 'join_request_received',
          id: notification.id,
          ...notification.data,
        },
      });
    }

    console.log(
      `Join request notifications sent to ${validNotifications.length} leaders`
    );
  } catch (error) {
    console.error(
      'Error triggering join request received notification:',
      error
    );
  }
};

/**
 * Trigger join request approved notification
 */
export const triggerJoinRequestApprovedNotification = async (
  data: NotificationTriggerData['joinRequestApproved']
): Promise<void> => {
  try {
    // Check if requester has join request response notifications enabled
    const settings = await getEnhancedNotificationSettings(data.requesterId);
    if (settings && !settings.join_request_responses) {
      return; // User has disabled join request response notifications
    }

    const notification = await createNotification({
      user_id: data.requesterId,
      type: 'join_request_approved',
      title: 'Join Request Approved',
      body: `${data.approvedByName} approved your request to join "${data.groupTitle}"`,
      data: {
        groupId: data.groupId,
        groupTitle: data.groupTitle,
        approvedByName: data.approvedByName,
      },
      action_url: `/group/${data.groupId}`,
    });

    if (notification) {
      // Local for requester if on this device
      await scheduleLocalNotification({
        type: 'join_request_approved',
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
      // Remote push to requester
      await sendPushToUser(data.requesterId, {
        title: notification.title,
        body: notification.body,
        data: {
          type: 'join_request_approved',
          id: notification.id,
          ...notification.data,
        },
      });
    }
  } catch (error) {
    console.error(
      'Error triggering join request approved notification:',
      error
    );
  }
};

/**
 * Trigger join request denied notification
 */
export const triggerJoinRequestDeniedNotification = async (
  data: NotificationTriggerData['joinRequestDenied']
): Promise<void> => {
  try {
    // Check if requester has join request response notifications enabled
    const settings = await getEnhancedNotificationSettings(data.requesterId);
    if (settings && !settings.join_request_responses) {
      return; // User has disabled join request response notifications
    }

    const notification = await createNotification({
      user_id: data.requesterId,
      type: 'join_request_denied',
      title: 'Join Request Declined',
      body: `${data.deniedByName} declined your request to join "${data.groupTitle}"`,
      data: {
        groupId: data.groupId,
        groupTitle: data.groupTitle,
        deniedByName: data.deniedByName,
      },
      action_url: `/group/${data.groupId}`,
    });

    if (notification) {
      // Local for requester if on this device
      await scheduleLocalNotification({
        type: 'join_request_denied',
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
      // Remote push to requester
      await sendPushToUser(data.requesterId, {
        title: notification.title,
        body: notification.body,
        data: {
          type: 'join_request_denied',
          id: notification.id,
          ...notification.data,
        },
      });
    }
  } catch (error) {
    console.error('Error triggering join request denied notification:', error);
  }
};

/**
 * Trigger referral accepted notification
 */
export const triggerReferralAcceptedNotification = async (
  data: NotificationTriggerData['referralAccepted']
): Promise<void> => {
  try {
    // Check if referrer has referral notifications enabled
    const settings = await getEnhancedNotificationSettings(data.referrerId);
    if (settings && !settings.referral_updates) {
      return; // User has disabled referral notifications
    }

    const notification = await createNotification({
      user_id: data.referrerId,
      type: 'referral_accepted',
      title: 'Referral Accepted',
      body: `${data.referredUserName} joined VineMe through your referral!`,
      data: {
        referredUserId: data.referredUserId,
        referredUserName: data.referredUserName,
      },
      action_url: `/profile/${data.referredUserId}`,
    });

    if (notification) {
      // Schedule local notification for immediate display
      await scheduleLocalNotification({
        type: 'referral_accepted',
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
    }
  } catch (error) {
    console.error('Error triggering referral accepted notification:', error);
  }
};

/**
 * Trigger referral joined group notification
 */
export const triggerReferralJoinedGroupNotification = async (
  data: NotificationTriggerData['referralJoinedGroup']
): Promise<void> => {
  try {
    // Check if referrer has referral notifications enabled
    const settings = await getEnhancedNotificationSettings(data.referrerId);
    if (settings && !settings.referral_updates) {
      return; // User has disabled referral notifications
    }

    const notification = await createNotification({
      user_id: data.referrerId,
      type: 'referral_joined_group',
      title: 'Referral Joined Group',
      body: `${data.referredUserName} joined "${data.groupTitle}" through your referral!`,
      data: {
        referredUserId: data.referredUserId,
        referredUserName: data.referredUserName,
        groupId: data.groupId,
        groupTitle: data.groupTitle,
      },
      action_url: `/group/${data.groupId}`,
    });

    if (notification) {
      // Schedule local notification for immediate display
      await scheduleLocalNotification({
        type: 'referral_joined_group',
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });
    }
  } catch (error) {
    console.error(
      'Error triggering referral joined group notification:',
      error
    );
  }
};

/**
 * Enhanced notification service methods for hooks
 */

/**
 * Create a single notification
 */
export const createNotification = async (
  input: CreateNotificationInput
): Promise<Notification | null> => {
  try {
    const { data, error } = await supabase.rpc('app_create_notification', {
      p_user_id: input.user_id,
      p_type: input.type,
      p_title: input.title,
      p_body: input.body,
      p_data: input.data || {},
      p_action_url: input.action_url || null,
      p_expires_at: input.expires_at || null,
    });

    if (error) {
      console.error('Error creating notification (RPC):', error);
      return null;
    }

    return data as unknown as Notification;
  } catch (error) {
    console.error('Error creating notification (RPC):', error);
    return null;
  }
};

/**
 * Create multiple notifications in batch
 */
export const createNotifications = async (
  notifications: CreateNotificationInput[]
): Promise<Notification[]> => {
  try {
    const results: Notification[] = [];
    for (const n of notifications) {
      const created = await createNotification(n);
      if (created) results.push(created);
    }
    return results;
  } catch (error) {
    console.error('Error creating notifications (batch RPC):', error);
    return [];
  }
};

/**
 * Get user notifications with pagination
 */
export const getUserNotificationsPaginated = async (
  options: NotificationQueryOptions
): Promise<{
  notifications: Notification[];
  hasMore: boolean;
  total: number;
}> => {
  try {
    const {
      userId,
      limit = 20,
      offset = 0,
      types,
      read,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (types && types.length > 0) {
      query = query.in('type', types);
    }

    if (read !== undefined) {
      query = query.eq('read', read);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching paginated notifications:', error);
      return { notifications: [], hasMore: false, total: 0 };
    }

    const notifications = data || [];
    const total = count || 0;
    const hasMore = offset + limit < total;

    return { notifications, hasMore, total };
  } catch (error) {
    console.error('Error fetching paginated notifications:', error);
    return { notifications: [], hasMore: false, total: 0 };
  }
};

/**
 * Map notification settings to allowed notification types
 */
export const getAllowedNotificationTypesForUser = async (
  userId: string
): Promise<NotificationType[]> => {
  const settings = await getEnhancedNotificationSettings(userId);
  const allowed: NotificationType[] = [];
  if (!settings) {
    // Default: allow all known types when settings missing
    return [
      'friend_request_received',
      'friend_request_accepted',
      'group_request_submitted',
      'group_request_approved',
      'group_request_denied',
      'join_request_received',
      'join_request_approved',
      'join_request_denied',
      'referral_accepted',
      'referral_joined_group',
      'event_reminder',
    ];
  }

  if (settings.friend_requests) allowed.push('friend_request_received');
  if (settings.friend_request_accepted) allowed.push('friend_request_accepted');
  if (settings.group_requests) allowed.push('group_request_submitted');
  if (settings.group_request_responses) {
    allowed.push('group_request_approved', 'group_request_denied');
  }
  if (settings.join_requests) allowed.push('join_request_received');
  if (settings.join_request_responses) {
    allowed.push('join_request_approved', 'join_request_denied');
  }
  if (settings.referral_updates) {
    allowed.push('referral_accepted', 'referral_joined_group');
  }
  if (settings.event_reminders) allowed.push('event_reminder');
  return allowed;
};

/**
 * Settings-aware notifications pagination
 */
export const getUserNotificationsPaginatedWithSettings = async (
  options: NotificationQueryOptions
): Promise<{
  notifications: Notification[];
  hasMore: boolean;
  total: number;
}> => {
  const types = await getAllowedNotificationTypesForUser(options.userId);
  return getUserNotificationsPaginated({ ...options, types });
};

/**
 * Settings-aware notification count
 */
export const getNotificationCountWithSettings = async (
  userId: string,
  options?: { read?: boolean }
): Promise<number> => {
  const types = await getAllowedNotificationTypesForUser(userId);
  return getNotificationCount(userId, { types, read: options?.read });
};

/**
 * Get notification count for a user
 */
export const getNotificationCount = async (
  userId: string,
  options?: { types?: NotificationType[]; read?: boolean }
): Promise<number> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (options?.types && options.types.length > 0) {
      query = query.in('type', options.types);
    }

    if (options?.read !== undefined) {
      query = query.eq('read', options.read);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting notification count:', error);
    return 0;
  }
};

/**
 * Mark multiple notifications as read
 */
export const markNotificationsAsRead = async (
  notificationIds: string[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', notificationIds);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return false;
  }
};

/**
 * Delete a single notification
 */
export const deleteNotification = async (
  notificationId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

/**
 * Delete multiple notifications
 */
export const deleteMultipleNotifications = async (
  notificationIds: string[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds);

    if (error) {
      console.error('Error deleting notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return false;
  }
};

/**
 * Subscribe to real-time notification updates for a user
 */
// Legacy simple subscriber removed; use enhanced subscriber below.

/**
 * Get enhanced notification settings for a user
 */
export const getEnhancedNotificationSettings = async (
  userId: string
): Promise<NotificationSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Not found error
      console.error('Error fetching enhanced notification settings:', error);
      return null;
    }

    // Return default settings if none exist
    return (
      data || {
        id: '',
        user_id: userId,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('Error getting enhanced notification settings:', error);
    return null;
  }
};

/**
 * Update enhanced notification settings for a user
 */
export const updateEnhancedNotificationSettings = async (
  userId: string,
  settings: Partial<
    Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >
): Promise<boolean> => {
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
      console.error('Error updating enhanced notification settings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating enhanced notification settings:', error);
    return false;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (
  userId: string
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// (duplicate implementations of enhanced settings removed below — see the earlier
// definitions at getEnhancedNotificationSettings/updateEnhancedNotificationSettings.)

/**
 * Enhanced Real-time Notification Subscriptions
 */

export interface NotificationSubscriptionOptions {
  userId: string;
  onNotificationReceived?: (notification: Notification) => void;
  onNotificationUpdated?: (notification: Notification) => void;
  onNotificationDeleted?: (notificationId: string) => void;
  onConnectionStateChange?: (
    state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'
  ) => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface NotificationSubscription {
  unsubscribe: () => void;
  reconnect: () => Promise<void>;
  getConnectionState: () => string;
  isConnected: () => boolean;
}

/**
 * Subscribe to real-time notifications with enhanced features
 */
export const subscribeToUserNotifications = (
  options: NotificationSubscriptionOptions
): NotificationSubscription => {
  const {
    userId,
    onNotificationReceived,
    onNotificationUpdated,
    onNotificationDeleted,
    onConnectionStateChange,
    onError,
    autoReconnect = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 5,
  } = options;

  let subscription: any = null;
  let reconnectAttempts = 0;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let isManuallyDisconnected = false;

  const createSubscription = () => {
    try {
      subscription = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            try {
              onNotificationReceived?.(payload.new as Notification);
            } catch (error) {
              console.error('Error in notification received callback:', error);
              onError?.(error as Error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            try {
              onNotificationUpdated?.(payload.new as Notification);
            } catch (error) {
              console.error('Error in notification updated callback:', error);
              onError?.(error as Error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            try {
              onNotificationDeleted?.(payload.old?.id);
            } catch (error) {
              console.error('Error in notification deleted callback:', error);
              onError?.(error as Error);
            }
          }
        )
        .subscribe((status) => {
          onConnectionStateChange?.(status);

          if (status === 'SUBSCRIBED') {
            reconnectAttempts = 0; // Reset on successful connection
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
              reconnectTimer = null;
            }
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            if (
              autoReconnect &&
              !isManuallyDisconnected &&
              reconnectAttempts < maxReconnectAttempts
            ) {
              scheduleReconnect();
            }
          }
        });

      return subscription;
    } catch (error) {
      console.error('Error creating notification subscription:', error);
      onError?.(error as Error);
      return null;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer || isManuallyDisconnected) return;

    reconnectAttempts++;
    const delay =
      reconnectDelay * Math.pow(2, Math.min(reconnectAttempts - 1, 4)); // Exponential backoff

    console.log(
      `Scheduling notification subscription reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`
    );

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!isManuallyDisconnected) {
        reconnect();
      }
    }, delay);
  };

  const reconnect = async (): Promise<void> => {
    try {
      if (subscription) {
        await supabase.removeChannel(subscription);
      }
      subscription = createSubscription();
    } catch (error) {
      console.error('Error reconnecting notification subscription:', error);
      onError?.(error as Error);

      if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
        scheduleReconnect();
      }
    }
  };

  const unsubscribe = () => {
    isManuallyDisconnected = true;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (subscription) {
      supabase.removeChannel(subscription);
      subscription = null;
    }
  };

  const getConnectionState = (): string => {
    return subscription?.state || 'CLOSED';
  };

  const isConnected = (): boolean => {
    return subscription?.state === 'SUBSCRIBED';
  };

  // Create initial subscription
  subscription = createSubscription();

  return {
    unsubscribe,
    reconnect,
    getConnectionState,
    isConnected,
  };
};

/**
 * Subscribe to notification count changes for a user
 */
export const subscribeToNotificationCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  let currentCount = 0;

  const updateCount = async () => {
    try {
      const count = await getUnreadNotificationCount(userId);
      if (count !== currentCount) {
        currentCount = count;
        callback(count);
      }
    } catch (error) {
      console.error('Error updating notification count:', error);
    }
  };

  // Initial count
  updateCount();

  // Subscribe to changes
  const subscription = subscribeToUserNotifications({
    userId,
    onNotificationReceived: () => updateCount(),
    onNotificationUpdated: () => updateCount(),
    onNotificationDeleted: () => updateCount(),
    onError: (error) =>
      console.error('Notification count subscription error:', error),
  });

  return () => {
    subscription.unsubscribe();
  };
};

/**
 * Subscription manager for handling multiple notification subscriptions
 */
export class NotificationSubscriptionManager {
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private countSubscriptions: Map<string, () => void> = new Map();

  /**
   * Subscribe to notifications for a user
   */
  subscribe(
    userId: string,
    options: Omit<NotificationSubscriptionOptions, 'userId'>
  ): string {
    const subscriptionId = `notifications_${userId}_${Date.now()}`;

    const subscription = subscribeToUserNotifications({
      userId,
      ...options,
    });

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  /**
   * Subscribe to notification count for a user
   */
  subscribeToCount(userId: string, callback: (count: number) => void): string {
    const subscriptionId = `count_${userId}_${Date.now()}`;

    const unsubscribe = subscribeToNotificationCount(userId, callback);
    this.countSubscriptions.set(subscriptionId, unsubscribe);

    return subscriptionId;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
      return true;
    }

    const countSubscription = this.countSubscriptions.get(subscriptionId);
    if (countSubscription) {
      countSubscription();
      this.countSubscriptions.delete(subscriptionId);
      return true;
    }

    return false;
  }

  /**
   * Unsubscribe from all subscriptions for a user
   */
  unsubscribeUser(userId: string): number {
    let unsubscribed = 0;

    // Unsubscribe notification subscriptions
    Array.from(this.subscriptions.entries()).forEach(([id, subscription]) => {
      if (id.includes(`_${userId}_`)) {
        subscription.unsubscribe();
        this.subscriptions.delete(id);
        unsubscribed++;
      }
    });

    // Unsubscribe count subscriptions
    Array.from(this.countSubscriptions.entries()).forEach(
      ([id, unsubscribe]) => {
        if (id.includes(`_${userId}_`)) {
          unsubscribe();
          this.countSubscriptions.delete(id);
          unsubscribed++;
        }
      }
    );

    return unsubscribed;
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): number {
    let unsubscribed = 0;

    // Unsubscribe all notification subscriptions
    Array.from(this.subscriptions.values()).forEach((subscription) => {
      subscription.unsubscribe();
      unsubscribed++;
    });
    this.subscriptions.clear();

    // Unsubscribe all count subscriptions
    Array.from(this.countSubscriptions.values()).forEach((unsubscribe) => {
      unsubscribe();
      unsubscribed++;
    });
    this.countSubscriptions.clear();

    return unsubscribed;
  }

  /**
   * Get connection status for all subscriptions
   */
  getConnectionStatus(): Record<string, string> {
    const status: Record<string, string> = {};

    Array.from(this.subscriptions.entries()).forEach(([id, subscription]) => {
      status[id] = subscription.getConnectionState();
    });

    return status;
  }

  /**
   * Reconnect all subscriptions
   */
  async reconnectAll(): Promise<void> {
    const reconnectPromises = Array.from(this.subscriptions.values()).map(
      (subscription) => subscription.reconnect()
    );

    await Promise.allSettled(reconnectPromises);
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): {
    notifications: number;
    counts: number;
    total: number;
  } {
    return {
      notifications: this.subscriptions.size,
      counts: this.countSubscriptions.size,
      total: this.subscriptions.size + this.countSubscriptions.size,
    };
  }
}

// Global subscription manager instance
export const notificationSubscriptionManager =
  new NotificationSubscriptionManager();

/**
 * Cleanup function for component unmount
 */
export const cleanupNotificationSubscriptions = (userId?: string): number => {
  if (userId) {
    return notificationSubscriptionManager.unsubscribeUser(userId);
  } else {
    return notificationSubscriptionManager.unsubscribeAll();
  }
};

/**
 * Clean up expired notifications
 */
export const cleanupExpiredNotifications = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    return 0;
  }
};

/**
 * Enhanced CRUD Operations for Notifications
 */

/**
 * Create multiple notifications in batch with error handling
 */
export const createNotificationsBatch = async (
  inputs: CreateNotificationInput[]
): Promise<{ success: Notification[]; failed: CreateNotificationInput[] }> => {
  const success: Notification[] = [];
  const failed: CreateNotificationInput[] = [];

  try {
    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);

      const notifications = batch.map((input) => ({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data || {},
        action_url: input.action_url,
        expires_at: input.expires_at,
        read: false,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        console.error('Error creating notification batch:', error);
        failed.push(...batch);
      } else {
        success.push(...(data || []));
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('Error in batch notification creation:', error);
    return { success, failed: inputs };
  }
};

/**
 * Mark multiple notifications as read with retry logic
 */
export const markNotificationsAsReadBatch = async (
  notificationIds: string[],
  maxRetries: number = 3
): Promise<{ success: string[]; failed: string[] }> => {
  const success: string[] = [];
  const failed: string[] = [];

  try {
    // Process in batches to avoid query size limits
    const batchSize = 100;
    for (let i = 0; i < notificationIds.length; i += batchSize) {
      const batch = notificationIds.slice(i, i + batchSize);
      let retries = 0;
      let batchSuccess = false;

      while (retries < maxRetries && !batchSuccess) {
        try {
          const { error } = await supabase
            .from('notifications')
            .update({
              read: true,
              read_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .in('id', batch);

          if (error) {
            throw error;
          }

          success.push(...batch);
          batchSuccess = true;
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            console.error(
              `Failed to mark notifications as read after ${maxRetries} retries:`,
              error
            );
            failed.push(...batch);
          } else {
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retries) * 1000)
            );
          }
        }
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('Error in batch mark as read operation:', error);
    return { success, failed: notificationIds };
  }
};

/**
 * Delete multiple notifications with soft delete option
 */
export const deleteNotificationsBatch = async (
  notificationIds: string[],
  softDelete: boolean = false
): Promise<{ success: string[]; failed: string[] }> => {
  const success: string[] = [];
  const failed: string[] = [];

  try {
    // Process in batches to avoid query size limits
    const batchSize = 100;
    for (let i = 0; i < notificationIds.length; i += batchSize) {
      const batch = notificationIds.slice(i, i + batchSize);

      try {
        if (softDelete) {
          // Soft delete by setting expires_at to current time
          const { error } = await supabase
            .from('notifications')
            .update({
              expires_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .in('id', batch);

          if (error) {
            throw error;
          }
        } else {
          // Hard delete
          const { error } = await supabase
            .from('notifications')
            .delete()
            .in('id', batch);

          if (error) {
            throw error;
          }
        }

        success.push(...batch);
      } catch (error) {
        console.error('Error deleting notification batch:', error);
        failed.push(...batch);
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('Error in batch delete operation:', error);
    return { success, failed: notificationIds };
  }
};

/**
 * Advanced notification query with filtering and pagination
 */
export interface NotificationQueryOptions {
  userId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  types?: NotificationType[];
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  sortBy?: 'created_at' | 'updated_at' | 'read_at';
  sortOrder?: 'asc' | 'desc';
}

export const queryNotifications = async (
  options: NotificationQueryOptions
): Promise<{
  notifications: Notification[];
  totalCount: number;
  hasMore: boolean;
}> => {
  try {
    const {
      userId,
      limit = 20,
      offset = 0,
      unreadOnly = false,
      types,
      startDate,
      endDate,
      searchTerm,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (unreadOnly) {
      query = query.eq('read', false);
    }

    if (types && types.length > 0) {
      query = query.in('type', types);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (searchTerm) {
      query = query.or(
        `title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%`
      );
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error querying notifications:', error);
      return { notifications: [], totalCount: 0, hasMore: false };
    }

    const totalCount = count || 0;
    const hasMore = offset + limit < totalCount;

    return {
      notifications: data || [],
      totalCount,
      hasMore,
    };
  } catch (error) {
    console.error('Error in notification query:', error);
    return { notifications: [], totalCount: 0, hasMore: false };
  }
};

/**
 * Get notification statistics for a user
 */
export interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  countsByType: Record<NotificationType, number>;
  recentActivity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export const getNotificationStats = async (
  userId: string
): Promise<NotificationStats> => {
  try {
    // Get all notifications for the user
    const { data: allNotifications, error } = await supabase
      .from('notifications')
      .select('type, read, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching notification stats:', error);
      return {
        totalNotifications: 0,
        unreadCount: 0,
        readCount: 0,
        countsByType: {} as Record<NotificationType, number>,
        recentActivity: { today: 0, thisWeek: 0, thisMonth: 0 },
      };
    }

    const notifications = allNotifications || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate statistics
    const stats: NotificationStats = {
      totalNotifications: notifications.length,
      unreadCount: notifications.filter((n) => !n.read).length,
      readCount: notifications.filter((n) => n.read).length,
      countsByType: {} as Record<NotificationType, number>,
      recentActivity: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      },
    };

    // Count by type and recent activity
    notifications.forEach((notification) => {
      // Count by type
      stats.countsByType[notification.type] =
        (stats.countsByType[notification.type] || 0) + 1;

      // Count recent activity
      const createdAt = new Date(notification.created_at);
      if (createdAt >= today) {
        stats.recentActivity.today++;
      }
      if (createdAt >= thisWeek) {
        stats.recentActivity.thisWeek++;
      }
      if (createdAt >= thisMonth) {
        stats.recentActivity.thisMonth++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error calculating notification stats:', error);
    return {
      totalNotifications: 0,
      unreadCount: 0,
      readCount: 0,
      countsByType: {} as Record<NotificationType, number>,
      recentActivity: { today: 0, thisWeek: 0, thisMonth: 0 },
    };
  }
};

/**
 * Archive old notifications (move to archive table or mark as archived)
 */
export const archiveOldNotifications = async (
  userId: string,
  olderThanDays: number = 30
): Promise<{ archived: number; errors: number }> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // For now, we'll use soft delete by setting expires_at
    // In a production system, you might move to an archive table
    const { data, error } = await supabase
      .from('notifications')
      .update({
        expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString())
      .eq('read', true) // Only archive read notifications
      .select('id');

    if (error) {
      console.error('Error archiving old notifications:', error);
      return { archived: 0, errors: 1 };
    }

    return { archived: data?.length || 0, errors: 0 };
  } catch (error) {
    console.error('Error in archive operation:', error);
    return { archived: 0, errors: 1 };
  }
};
