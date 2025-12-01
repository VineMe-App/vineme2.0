import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { AuthLoadingAnimation } from '@/components/auth/AuthLoadingAnimation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { useAuthStore } from '@/stores/auth';
import { useEnhancedNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/services/supabase';
import type { Notification } from '@/types/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  // Hide the navigation header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
    markAsRead,
    deleteNotification,
    refreshNotifications,
    error,
  } = useEnhancedNotifications(user?.id);

  // Extract all user IDs from notifications
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    notifications.forEach((notification: Notification) => {
      const { type, data } = notification;
      if (data) {
        switch (type) {
          case 'friend_request_received':
            if (data.fromUserId) ids.add(data.fromUserId);
            break;
          case 'friend_request_accepted':
            if (data.acceptedByUserId) ids.add(data.acceptedByUserId);
            break;
          case 'group_request_submitted':
            if (data.creatorId) ids.add(data.creatorId);
            break;
          case 'group_request_approved':
          case 'group_request_denied':
            // These don't have user IDs in data
            break;
          case 'join_request_received':
            if (data.requesterId) ids.add(data.requesterId);
            break;
          case 'join_request_approved':
          case 'join_request_denied':
            // These don't have user IDs in data
            break;
          case 'referral_accepted':
          case 'referral_joined_group':
            if (data.referredUserId) ids.add(data.referredUserId);
            break;
        }
      }
    });
    return Array.from(ids);
  }, [notifications]);

  // Batch fetch user avatars
  const { data: userAvatars } = useQuery({
    queryKey: ['user-avatars', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from('users')
        .select('id, avatar_url')
        .in('id', userIds);
      
      if (error) {
        console.error('Error fetching user avatars:', error);
        return {};
      }
      
      const avatarMap: Record<string, string | null> = {};
      data?.forEach((user) => {
        avatarMap[user.id] = user.avatar_url || null;
      });
      return avatarMap;
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
    />
  );

  const listEmpty = (
    <View style={styles.emptyContainer}>
      <EmptyState
        title="No notifications yet"
        message="When you receive notifications, they will show up here."
        icon={null}
      />
    </View>
  );

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
          onPress={() => router.back()}
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
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContent : styles.listContent
          }
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
