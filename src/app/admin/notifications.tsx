import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { AdminPageLayout } from '@/components/admin/AdminHeader';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAdminNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/auth';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

export default function AdminNotificationsScreen() {
  const { user } = useAuthStore();
  const {
    allNotifications,
    notificationCounts,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    isMarkingAsRead,
  } = useAdminNotifications(user?.id);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification,
      ]}
      onPress={() => markAsRead(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${
        item.read ? 'Read' : 'Unread'
      } notification.`}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.body}</Text>
        <Text style={styles.notificationDate}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      {!item.read && <NotificationBadge count={1} size="small" />}
    </TouchableOpacity>
  );

  if (error) {
    return (
      <AdminPageLayout
        title="Notifications"
        notificationCount={notificationCounts.total}
        onRefresh={refreshNotifications}
      >
        <View style={styles.errorContainer}>
          <ErrorMessage
            message={error.message || 'Failed to load notifications'}
            onRetry={refreshNotifications}
          />
        </View>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title="Notifications"
      notificationCount={notificationCounts.total}
      onRefresh={refreshNotifications}
      isRefreshing={isLoading}
    >
      {isLoading && allNotifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      ) : (
        <FlatList
          data={allNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshNotifications}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          }
        />
      )}

      {allNotifications.length > 0 && (
        <View style={styles.actions}>
          <Button
            title="Mark All as Read"
            onPress={() => markAllAsRead()}
            disabled={notificationCounts.total === 0}
            loading={isMarkingAsRead}
            variant="secondary"
          />
        </View>
      )}
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  unreadNotification: {
    backgroundColor: '#f0f9ff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  notificationBody: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
  },
  notificationDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  actions: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
