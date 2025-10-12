import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/provider/useTheme';
import { Text } from '@/components/ui/Text';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { useEnhancedNotifications } from '@/hooks/useNotifications';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    refreshNotifications,
    error,
  } = useEnhancedNotifications(user?.id);

  const renderItem = ({ item, index }: any) => (
    <NotificationItem
      notification={item}
      onMarkAsRead={markAsRead}
      onDelete={deleteNotification}
      isLast={index === notifications.length - 1}
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
          <LoadingSpinner size="small" color={theme.colors.primary[500]} />
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
  }, [isLoadingMore, hasNextPage, notifications.length, theme.colors]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <Stack.Screen options={{ title: 'Notifications' }} />

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={theme.colors.primary[500]} />
        </View>
      ) : (
        <>
          {unreadCount > 0 && (
            <View style={styles.actions}>
              <Button
                title={`Mark all as read (${unreadCount})`}
                variant="secondary"
                onPress={() => markAllAsRead()}
              />
            </View>
          )}

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyContent : undefined
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
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
