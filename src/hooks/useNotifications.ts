import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';
import {
  registerForPushNotifications,
  unregisterFromPushNotifications,
  handleNotificationResponse,
  getNotificationSettings,
  updateNotificationSettings,
  sendEventReminderNotification,
  cancelNotification,
  getUnreadNotifications,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAdminNotificationCounts,
} from '../services/notifications';
import { useAuthStore } from '../stores/auth';

/**
 * Hook for managing push notifications
 */
export const useNotifications = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null);

  // Load onboarding completion flag
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      .then((v) => setOnboardingCompleted(v === 'true'))
      .catch(() => setOnboardingCompleted(false));
  }, []);

  // Register for notifications when user is authenticated
  useEffect(() => {
    if (user?.id && onboardingCompleted) {
      registerForPushNotifications(user.id);
    }

    return () => {
      if (user?.id) {
        unregisterFromPushNotifications(user.id);
      }
    };
  }, [user?.id, onboardingCompleted]);

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is running
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        // You can handle the notification here if needed
      });

    // Listen for user interactions with notifications
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
        handleNotificationResponse(response, router);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  return {
    registerForPushNotifications: (userId: string) =>
      registerForPushNotifications(userId),
    unregisterFromPushNotifications: (userId: string) =>
      unregisterFromPushNotifications(userId),
  };
};

/**
 * Hook for managing notification settings
 */
export const useNotificationSettings = (userId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notificationSettings', userId],
    queryFn: () => getNotificationSettings(userId!),
    enabled: !!userId,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: {
      friend_requests?: boolean;
      event_reminders?: boolean;
      group_updates?: boolean;
    }) => updateNotificationSettings(userId!, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notificationSettings', userId],
      });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
};

/**
 * Hook for managing event reminders
 */
export const useEventReminders = () => {
  const scheduleReminderMutation = useMutation({
    mutationFn: ({
      eventId,
      eventTitle,
      eventDate,
      reminderMinutes = 60,
    }: {
      eventId: string;
      eventTitle: string;
      eventDate: string;
      reminderMinutes?: number;
    }) =>
      sendEventReminderNotification(
        eventId,
        eventTitle,
        eventDate,
        reminderMinutes
      ),
  });

  const cancelReminderMutation = useMutation({
    mutationFn: (notificationId: string) => cancelNotification(notificationId),
  });

  return {
    scheduleReminder: scheduleReminderMutation.mutate,
    cancelReminder: cancelReminderMutation.mutate,
    isScheduling: scheduleReminderMutation.isPending,
    isCancelling: cancelReminderMutation.isPending,
  };
};

/**
 * Hook for handling notification permissions
 */
export const useNotificationPermissions = () => {
  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  };

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  return {
    checkPermissions,
    requestPermissions,
  };
};

/**
 * Hook for managing admin notifications
 */
export const useAdminNotifications = (userId?: string) => {
  const queryClient = useQueryClient();

  // Get unread notifications
  const {
    data: unreadNotifications,
    isLoading: isLoadingUnread,
    error: unreadError,
  } = useQuery({
    queryKey: ['admin-notifications', 'unread', userId],
    queryFn: () => getUnreadNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Get all notifications
  const {
    data: allNotifications,
    isLoading: isLoadingAll,
    error: allError,
  } = useQuery({
    queryKey: ['admin-notifications', 'all', userId],
    queryFn: () => getUserNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute
  });

  // Get notification counts
  const {
    data: notificationCounts,
    isLoading: isLoadingCounts,
    error: countsError,
  } = useQuery({
    queryKey: ['admin-notifications', 'counts', userId],
    queryFn: () => getAdminNotificationCounts(userId!),
    enabled: !!userId,
    refetchInterval: 15000, // Refetch every 15 seconds for badge updates
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-notifications', userId],
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-notifications', userId],
      });
    },
  });

  // Refresh notifications
  const refreshNotifications = () => {
    queryClient.invalidateQueries({
      queryKey: ['admin-notifications', userId],
    });
  };

  return {
    unreadNotifications: unreadNotifications || [],
    allNotifications: allNotifications || [],
    notificationCounts: notificationCounts || { group_requests: 0, join_requests: 0, total: 0 },
    isLoading: isLoadingUnread || isLoadingAll || isLoadingCounts,
    error: unreadError || allError || countsError,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    refreshNotifications,
    isMarkingAsRead: markAsReadMutation.isPending || markAllAsReadMutation.isPending,
  };
};
