import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, Keyboard } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { useAuthStore } from '@/stores/auth';
import { useEnhancedNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/services/supabase';
import type { Notification } from '@/types/notifications';
import { safeGoBack } from '@/utils/navigation';

export default function NotificationsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Hide the navigation header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Calculate tab bar height to position button correctly
  const androidBottomPadding = Math.max(insets.bottom + 4, 12);
  const tabBarHeight = Platform.OS === 'ios' ? 100 : 56 + androidBottomPadding;
  const buttonHeight = 50; // Approximate button height

  // Keyboard listeners to adjust button position
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Position button: above keyboard when open, otherwise above tab bar
  const buttonBottom = keyboardHeight > 0 
    ? keyboardHeight + 8 // 8px spacing above keyboard
    : tabBarHeight - 40; // Closer to bottom of screen (20px above tab bar)

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    error,
  } = useEnhancedNotifications(user?.id);

  // Extract all user IDs from notifications
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    notifications.forEach((notification: Notification) => {
      const { type, data } = notification;
      if (data && typeof data === 'object') {
        switch (type) {
          case 'friend_request_received':
            if (data.fromUserId && typeof data.fromUserId === 'string') {
              ids.add(data.fromUserId);
            }
            break;
          case 'friend_request_accepted':
            if (data.acceptedByUserId && typeof data.acceptedByUserId === 'string') {
              ids.add(data.acceptedByUserId);
            }
            break;
          case 'group_request_submitted':
            if (data.creatorId && typeof data.creatorId === 'string') {
              ids.add(data.creatorId);
            }
            break;
          case 'group_request_approved':
          case 'group_request_denied':
            // For group request approved/denied, show the requester's (current user's) avatar
            // The notification.user_id is the requester
            if (notification.user_id && typeof notification.user_id === 'string') {
              ids.add(notification.user_id);
            }
            break;
          case 'join_request_received':
            if (data.requesterId && typeof data.requesterId === 'string') {
              ids.add(data.requesterId);
            }
            break;
          case 'join_request_approved':
          case 'join_request_denied':
            // These don't have user IDs in data
            break;
          case 'referral_accepted':
          case 'referral_joined_group':
            if (data.referredUserId && typeof data.referredUserId === 'string') {
              ids.add(data.referredUserId);
            }
            break;
        }
      }
    });
    const result = Array.from(ids);
    return result;
  }, [notifications]);

  // Batch fetch user avatars
  const { data: userAvatars } = useQuery<Record<string, { avatar_url: string | null; name?: string }>>({
    queryKey: ['user-avatars', userIds.sort().join(',')], // Sort to ensure stable key
    queryFn: async () => {
      if (userIds.length === 0) return {};
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, avatar_url, first_name, last_name')
          .in('id', userIds);
        
        if (error) {
          console.error('Error fetching user avatars:', error);
          return {};
        }
        
        const avatarMap: Record<string, { avatar_url: string | null; name?: string }> = {};
        data?.forEach((user) => {
          const fullName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`.trim()
            : (user.first_name || user.last_name || undefined);
          avatarMap[user.id] = {
            avatar_url: user.avatar_url && user.avatar_url.trim() ? user.avatar_url : null,
            name: fullName,
          };
        });
        
        return avatarMap;
      } catch (err) {
        console.error('Exception fetching user avatars:', err);
        return {};
      }
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const renderItem = ({ item, index }: any) => (
    <NotificationItem
      notification={item}
      onMarkAsRead={markAsRead}
      onDelete={deleteNotification}
      isLast={index === notifications.length - 1}
      userAvatars={userAvatars || {}}
      currentUserId={user?.id}
    />
  );

  const shouldShowEmptyState = !isLoading && notifications.length === 0;

  const listEmpty = shouldShowEmptyState ? (
    <View style={styles.emptyContainer}>
      <EmptyState
        title="No notifications!"
        message="You're all caught up!"
        icon={null}
      />
    </View>
  ) : null;

  const listFooter = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoading}>
          <LoadingSpinner size="small" />
          <Text variant="caption" color="secondary" style={styles.footerText}>
            Loading more...
          </Text>
        </View>
      );
    }
    if (!hasNextPage && notifications.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text variant="caption" color="tertiary">
            You're all caught up
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, hasNextPage, notifications.length]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(router)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#2C2235" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.bellIconContainer}>
          <Ionicons name="notifications" size={20} color="#FF0083" />
        </View>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <AuthLoadingAnimation />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            shouldShowEmptyState ? styles.emptyContent : styles.listContent,
            { paddingBottom: buttonBottom + buttonHeight + 16 }, // Add padding so content isn't hidden behind button
          ]}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshNotifications}
            />
          }
          onEndReached={() => {
            if (hasNextPage && !isLoadingMore) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Mark all as read button - Always visible at bottom */}
      <View style={[styles.markAllContainer, { bottom: buttonBottom }]}>
        <Button
          title={unreadCount > 0 ? `Mark all as read (${unreadCount})` : 'Mark all as read'}
          variant="secondary"
          onPress={() => markAllAsRead()}
          style={styles.markAllButton}
          disabled={unreadCount === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FEFEFE',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: -0.44,
    lineHeight: 22,
    color: '#2C2235',
    fontFamily: 'Figtree-Bold',
    fontWeight: 'bold',
    flex: 1,
  },
  bellIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllContainer: {
    position: 'absolute',
    left: 26,
    right: 26,
    zIndex: 10,
  },
  markAllButton: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerEnd: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
  },
});
