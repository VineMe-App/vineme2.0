import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
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
  getUnreadNotificationsWithSettings,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAdminNotificationCounts,
  // Enhanced notification service methods
  getUserNotificationsPaginatedWithSettings,
  getNotificationCountWithSettings,
  deleteNotification,
  deleteMultipleNotifications,
  subscribeToUserNotifications,
  getEnhancedNotificationSettings,
  updateEnhancedNotificationSettings,
} from '../services/notifications';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../services/supabase';
import type {
  Notification,
  NotificationQueryOptions,
  NotificationSettings,
  NotificationSubscription,
} from '../types/notifications';

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
      notificationListener.current?.remove();
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
export const useLegacyNotificationSettings = (userId?: string) => {
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
 * Enhanced hook for managing user notifications with real-time updates
 */
export const useEnhancedNotifications = (userId?: string) => {
  const queryClient = useQueryClient();
  const [realtimeSubscription, setRealtimeSubscription] = useState<
    (() => void) | null
  >(null);

  // Real-time notification subscription management
  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToUserNotifications({
      userId,
      onNotificationReceived: (notification) => {
        // Update notification queries when new notifications arrive
        queryClient.setQueryData(
          ['notifications', 'count', userId, { read: false }],
          (oldCount: number = 0) => oldCount + 1
        );

        // Invalidate notification lists to refresh them
        queryClient.invalidateQueries({
          queryKey: ['notifications', 'list', userId],
        });

        queryClient.invalidateQueries({
          queryKey: ['notifications', 'unread', userId],
        });
      },
    });

    setRealtimeSubscription(() => subscription.unsubscribe);

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, queryClient]);

  // Get unread notification count with live updates
  const {
    data: unreadCount,
    isLoading: isLoadingCount,
    error: countError,
  } = useQuery({
    queryKey: ['notifications', 'count', userId, { read: false }],
    queryFn: () => getNotificationCountWithSettings(userId!, { read: false }),
    enabled: !!userId,
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });

  // Get paginated notifications with infinite query
  const {
    data: notificationsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useInfiniteQuery({
    queryKey: ['notifications', 'list', userId],
    queryFn: ({ pageParam = 0 }) =>
      getUserNotificationsPaginatedWithSettings({
        userId: userId!,
        limit: 20,
        offset: pageParam * 20,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!userId,
  });

  // Get unread notifications
  const {
    data: unreadNotifications,
    isLoading: isLoadingUnread,
    error: unreadError,
  } = useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: () => getUnreadNotificationsWithSettings(userId!),
    enabled: !!userId,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (_, notificationId) => {
      // Update the notification in the cache
      queryClient.setQueryData(
        ['notifications', 'list', userId],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              notifications: page.notifications.map(
                (notification: Notification) =>
                  notification.id === notificationId
                    ? {
                        ...notification,
                        read: true,
                        read_at: new Date().toISOString(),
                      }
                    : notification
              ),
            })),
          };
        }
      );

      // Update unread count
      queryClient.setQueryData(
        ['notifications', 'count', userId, { read: false }],
        (oldCount: number = 0) => Math.max(0, oldCount - 1)
      );

      // Invalidate unread notifications
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread', userId],
      });
    },
  });

  // Mark multiple notifications as read mutation
  const markMultipleAsReadMutation = useMutation({
    mutationFn: (notificationIds: string[]) =>
      markNotificationsAsRead(notificationIds),
    onSuccess: (_, notificationIds) => {
      // Update notifications in cache
      queryClient.setQueryData(
        ['notifications', 'list', userId],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              notifications: page.notifications.map(
                (notification: Notification) =>
                  notificationIds.includes(notification.id)
                    ? {
                        ...notification,
                        read: true,
                        read_at: new Date().toISOString(),
                      }
                    : notification
              ),
            })),
          };
        }
      );

      // Update unread count
      queryClient.setQueryData(
        ['notifications', 'count', userId, { read: false }],
        (oldCount: number = 0) => Math.max(0, oldCount - notificationIds.length)
      );

      // Invalidate unread notifications
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread', userId],
      });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(userId!),
    onSuccess: () => {
      // Update all notifications in cache to read
      queryClient.setQueryData(
        ['notifications', 'list', userId],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              notifications: page.notifications.map(
                (notification: Notification) => ({
                  ...notification,
                  read: true,
                  read_at: new Date().toISOString(),
                })
              ),
            })),
          };
        }
      );

      // Reset unread count to 0
      queryClient.setQueryData(
        ['notifications', 'count', userId, { read: false }],
        0
      );

      // Invalidate unread notifications
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread', userId],
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: (_, notificationId) => {
      // Remove notification from cache
      queryClient.setQueryData(
        ['notifications', 'list', userId],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              notifications: page.notifications.filter(
                (notification: Notification) =>
                  notification.id !== notificationId
              ),
            })),
          };
        }
      );

      // Update unread count if notification was unread
      const wasUnread = unreadNotifications?.some(
        (n) => n.id === notificationId && !n.read
      );
      if (wasUnread) {
        queryClient.setQueryData(
          ['notifications', 'count', userId, { read: false }],
          (oldCount: number = 0) => Math.max(0, oldCount - 1)
        );
      }

      // Invalidate unread notifications
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread', userId],
      });
    },
  });

  // Delete multiple notifications mutation
  const deleteMultipleMutation = useMutation({
    mutationFn: (notificationIds: string[]) =>
      deleteMultipleNotifications(notificationIds),
    onSuccess: (_, notificationIds) => {
      // Remove notifications from cache
      queryClient.setQueryData(
        ['notifications', 'list', userId],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              notifications: page.notifications.filter(
                (notification: Notification) =>
                  !notificationIds.includes(notification.id)
              ),
            })),
          };
        }
      );

      // Update unread count for deleted unread notifications
      const deletedUnreadCount =
        unreadNotifications?.filter(
          (n) => notificationIds.includes(n.id) && !n.read
        ).length || 0;

      if (deletedUnreadCount > 0) {
        queryClient.setQueryData(
          ['notifications', 'count', userId, { read: false }],
          (oldCount: number = 0) => Math.max(0, oldCount - deletedUnreadCount)
        );
      }

      // Invalidate unread notifications
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread', userId],
      });
    },
  });

  // Flatten paginated notifications
  const allNotifications =
    notificationsData?.pages.flatMap((page) => page.notifications) || [];

  // Refresh all notification data
  const refreshNotifications = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['notifications', userId],
    });
  }, [queryClient, userId]);

  return {
    // Data
    notifications: allNotifications,
    unreadNotifications: unreadNotifications || [],
    unreadCount: unreadCount || 0,

    // Loading states
    isLoading: isLoadingNotifications || isLoadingCount,
    isLoadingMore: isFetchingNextPage,
    isLoadingUnread,

    // Pagination
    hasNextPage,
    fetchNextPage,

    // Actions
    markAsRead: markAsReadMutation.mutate,
    markMultipleAsRead: markMultipleAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    deleteMultiple: deleteMultipleMutation.mutate,
    refreshNotifications,

    // Action states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingMultipleAsRead: markMultipleAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
    isDeletingMultiple: deleteMultipleMutation.isPending,

    // Errors
    error: notificationsError || countError || unreadError,

    // Real-time subscription status
    isSubscribed: !!realtimeSubscription,
  };
};

/**
 * Hook for managing admin notifications (legacy support)
 */
export const useAdminNotifications = (userId?: string) => {
  const queryClient = useQueryClient();

  // Get unread notifications
  const {
    data: unreadNotifications,
    isLoading: isLoadingUnread,
    error: unreadError,
  } = useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: () => getUnreadNotificationsWithSettings(userId!),
    enabled: !!userId,
    refetchInterval: 30000,
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
    notificationCounts: notificationCounts || {
      group_requests: 0,
      join_requests: 0,
      total: 0,
    },
    isLoading: isLoadingUnread || isLoadingAll || isLoadingCounts,
    error: unreadError || allError || countsError,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    refreshNotifications,
    isMarkingAsRead:
      markAsReadMutation.isPending || markAllAsReadMutation.isPending,
  };
};

/**
 * Specialized hook for notification panel logic
 */
export const useNotificationPanel = (userId?: string) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    []
  );
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>(
    'all'
  );

  const {
    notifications,
    unreadNotifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultiple,
    refreshNotifications,
    isMarkingAsRead,
    isMarkingMultipleAsRead,
    isMarkingAllAsRead,
    isDeleting,
    isDeletingMultiple,
    error,
  } = useEnhancedNotifications(userId);

  // Filter notifications based on current filter
  const filteredNotifications = useMemo(() => {
    switch (filterType) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'read':
        return notifications.filter((n) => n.read);
      default:
        return notifications;
    }
  }, [notifications, filterType]);

  // Panel actions
  const openPanel = useCallback(() => setIsVisible(true), []);
  const closePanel = useCallback(() => {
    setIsVisible(false);
    setSelectedNotifications([]);
  }, []);

  // Selection actions
  const toggleNotificationSelection = useCallback((notificationId: string) => {
    setSelectedNotifications((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedNotifications(filteredNotifications.map((n) => n.id));
  }, [filteredNotifications]);

  const clearSelection = useCallback(() => {
    setSelectedNotifications([]);
  }, []);

  // Bulk actions
  const markSelectedAsRead = useCallback(() => {
    if (selectedNotifications.length > 0) {
      markMultipleAsRead(selectedNotifications);
      setSelectedNotifications([]);
    }
  }, [selectedNotifications, markMultipleAsRead]);

  const deleteSelected = useCallback(() => {
    if (selectedNotifications.length > 0) {
      deleteMultiple(selectedNotifications);
      setSelectedNotifications([]);
    }
  }, [selectedNotifications, deleteMultiple]);

  // Filter actions
  const setFilter = useCallback((filter: 'all' | 'unread' | 'read') => {
    setFilterType(filter);
    setSelectedNotifications([]);
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    await refreshNotifications();
  }, [refreshNotifications]);

  // Load more notifications
  const loadMore = useCallback(() => {
    if (hasNextPage && !isLoadingMore) {
      fetchNextPage();
    }
  }, [hasNextPage, isLoadingMore, fetchNextPage]);

  return {
    // Panel state
    isVisible,
    openPanel,
    closePanel,

    // Data
    notifications: filteredNotifications,
    unreadCount,

    // Loading states
    isLoading,
    isLoadingMore,
    hasNextPage,

    // Selection
    selectedNotifications,
    toggleNotificationSelection,
    selectAllVisible,
    clearSelection,
    hasSelection: selectedNotifications.length > 0,

    // Actions
    markAsRead,
    markSelectedAsRead,
    markAllAsRead,
    deleteNotification,
    deleteSelected,
    onRefresh,
    loadMore,

    // Action states
    isMarkingAsRead,
    isMarkingMultipleAsRead,
    isMarkingAllAsRead,
    isDeleting,
    isDeletingMultiple,

    // Filtering
    filterType,
    setFilter,

    // Error
    error,
  };
};

/**
 * Specialized hook for notification badge count management
 */
export const useNotificationBadge = (userId?: string) => {
  const { unreadCount, isLoading, error } = useEnhancedNotifications(userId);

  // Format badge count for display (e.g., 99+ for counts over 99)
  const formattedCount = useMemo(() => {
    if (unreadCount === 0) return '';
    if (unreadCount > 99) return '99+';
    return unreadCount.toString();
  }, [unreadCount]);

  // Determine if badge should be visible
  const shouldShowBadge = unreadCount > 0;

  return {
    count: unreadCount,
    formattedCount,
    shouldShowBadge,
    isLoading,
    error,
  };
};

/**
 * Specialized hook for notification settings management
 */
export const useNotificationSettings = (userId?: string) => {
  const queryClient = useQueryClient();

  // Get enhanced notification settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notification-settings', 'enhanced', userId],
    queryFn: () => getEnhancedNotificationSettings(userId!),
    enabled: !!userId,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (
      newSettings: Partial<
        Omit<
          NotificationSettings,
          'id' | 'user_id' | 'created_at' | 'updated_at'
        >
      >
    ) => updateEnhancedNotificationSettings(userId!, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notification-settings', 'enhanced', userId],
      });
    },
  });

  // Individual setting toggles
  const toggleSetting = useCallback(
    (
      setting: keyof Omit<
        NotificationSettings,
        'id' | 'user_id' | 'created_at' | 'updated_at'
      >
    ) => {
      if (settings) {
        updateSettingsMutation.mutate({
          [setting]: !settings[setting],
        });
      }
    },
    [settings, updateSettingsMutation]
  );

  // Bulk setting updates
  const updateSettings = useCallback(
    (
      newSettings: Partial<
        Omit<
          NotificationSettings,
          'id' | 'user_id' | 'created_at' | 'updated_at'
        >
      >
    ) => {
      updateSettingsMutation.mutate(newSettings);
    },
    [updateSettingsMutation]
  );

  // Enable all notifications
  const enableAll = useCallback(() => {
    updateSettingsMutation.mutate({
      friend_requests: true,
      friend_request_accepted: true,
      group_requests: true,
      group_request_responses: true,
      join_requests: true,
      join_request_responses: true,
      referral_updates: true,
      event_reminders: true,
      push_notifications: true,
    });
  }, [updateSettingsMutation]);

  // Disable all notifications
  const disableAll = useCallback(() => {
    updateSettingsMutation.mutate({
      friend_requests: false,
      friend_request_accepted: false,
      group_requests: false,
      group_request_responses: false,
      join_requests: false,
      join_request_responses: false,
      referral_updates: false,
      event_reminders: false,
      push_notifications: false,
    });
  }, [updateSettingsMutation]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    toggleSetting,
    enableAll,
    disableAll,
    isUpdating: updateSettingsMutation.isPending,
    updateError: updateSettingsMutation.error,
  };
};

/**
 * Specialized hook for handling notification navigation
 */
export const useNotificationNavigation = () => {
  const router = useRouter();
  const { user } = useAuthStore();

  // Handle notification press/tap
  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read if not already read
      if (!notification.read) {
        markNotificationAsRead(notification.id);
      }

      // Navigate based on notification type and action URL
      if (notification.action_url) {
        router.push(notification.action_url);
        return;
      }

      // Fallback navigation based on notification type
      switch (notification.type) {
        case 'friend_request_received':
          router.push(`/profile/${notification.data.fromUserId}`);
          break;
        case 'friend_request_accepted':
          router.push(`/profile/${notification.data.acceptedByUserId}`);
          break;
        case 'group_request_submitted':
        case 'group_request_approved':
        case 'group_request_denied':
          router.push(`/group/${notification.data.groupId}`);
          break;
        case 'join_request_received':
          router.push(`/group/${notification.data.groupId}/requests`);
          break;
        case 'join_request_approved':
        case 'join_request_denied':
        case 'group_member_added':
          router.push(`/group/${notification.data.groupId}`);
          break;
        case 'referral_accepted':
          router.push(`/profile/${notification.data.referredUserId}`);
          break;
        case 'referral_joined_group':
          router.push(`/group/${notification.data.groupId}`);
          break;
        case 'event_reminder':
          router.push(`/event/${notification.data.eventId}`);
          break;
        default:
          // Default to home screen
          router.push('/(tabs)');
      }
    },
    [router]
  );

  // Validate navigation permissions
  const validateNavigationPermissions = useCallback(
    (notification: Notification): boolean => {
      if (!user) return false;

      // Basic validation - user should only navigate to their own notifications
      if (notification.user_id !== user.id) return false;

      // Additional validation based on notification type
      switch (notification.type) {
        case 'group_request_submitted':
          // Only church admins should see these
          return user.roles?.includes('church_admin') || false;
        case 'join_request_received':
          // Only group leaders should see these
          // This would need additional group membership validation
          return true; // Simplified for now
        default:
          return true;
      }
    },
    [user]
  );

  // Get navigation target without navigating
  const getNavigationTarget = useCallback(
    (notification: Notification): string => {
      if (notification.action_url) {
        return notification.action_url;
      }

      // Fallback navigation based on notification type
      switch (notification.type) {
        case 'friend_request_received':
          return `/profile/${notification.data.fromUserId}`;
        case 'friend_request_accepted':
          return `/profile/${notification.data.acceptedByUserId}`;
        case 'group_request_submitted':
        case 'group_request_approved':
        case 'group_request_denied':
          return `/group/${notification.data.groupId}`;
        case 'join_request_received':
          return `/group/${notification.data.groupId}/requests`;
        case 'join_request_approved':
        case 'join_request_denied':
        case 'group_member_added':
          return `/group/${notification.data.groupId}`;
        case 'referral_accepted':
          return `/profile/${notification.data.referredUserId}`;
        case 'referral_joined_group':
          return `/group/${notification.data.groupId}`;
        case 'event_reminder':
          return `/event/${notification.data.eventId}`;
        default:
          return '/(tabs)';
      }
    },
    []
  );

  return {
    handleNotificationPress,
    validateNavigationPermissions,
    getNavigationTarget,
  };
};
