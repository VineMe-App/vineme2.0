import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/provider/useTheme';
import { Modal } from './Modal';
import { Text } from './Text';
import { Input } from './Input';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';
import { useNotificationPanel } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import type { Notification, NotificationType } from '@/types/notifications';

interface NotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  testID?: string;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  visible,
  onClose,
  userId,
  testID = 'notifications-panel',
}) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    notifications: allNotifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasNextPage,
    onRefresh,
    loadMore,
    markAllAsRead,
    markAsRead,
    deleteNotification,
    isMarkingAllAsRead,
    filterType,
    setFilter,
    error,
  } = useNotificationPanel(userId);

  // Filter and search notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = allNotifications;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (notification) =>
          notification.title.toLowerCase().includes(query) ||
          notification.body.toLowerCase().includes(query) ||
          notification.type.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allNotifications, searchQuery]);

  // Group notifications if needed
  const groupedNotifications = React.useMemo(() => {
    if (groupBy === 'none') {
      return [
        { key: 'all', title: null, notifications: filteredNotifications },
      ];
    }

    if (groupBy === 'type') {
      const groups = filteredNotifications.reduce(
        (acc, notification) => {
          const type = notification.type;
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(notification);
          return acc;
        },
        {} as Record<NotificationType, Notification[]>
      );

      return Object.entries(groups).map(([type, notifications]) => ({
        key: type,
        title: formatNotificationType(type),
        notifications: notifications.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }));
    }

    if (groupBy === 'date') {
      const groups = filteredNotifications.reduce(
        (acc, notification) => {
          const date = new Date(notification.created_at);
          const dateKey = getDateGroupKey(date);
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(notification);
          return acc;
        },
        {} as Record<string, Notification[]>
      );

      return Object.entries(groups)
        .sort(([a], [b]) => getDateGroupSortOrder(a) - getDateGroupSortOrder(b))
        .map(([dateKey, notifications]) => ({
          key: dateKey,
          title: dateKey,
          notifications: notifications.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          ),
        }));
    }

    return [{ key: 'all', title: null, notifications: filteredNotifications }];
  }, [filteredNotifications, groupBy]);

  const notifications = filteredNotifications;

  // Helper functions for grouping
  const formatNotificationType = (type: string): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getDateGroupKey = (date: Date): string => {
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return 'This Week';
    if (diffInDays < 30) return 'This Month';
    return 'Older';
  };

  const getDateGroupSortOrder = (dateKey: string): number => {
    const order = {
      Today: 0,
      Yesterday: 1,
      'This Week': 2,
      'This Month': 3,
      Older: 4,
    };
    return order[dateKey as keyof typeof order] ?? 5;
  };

  // Local state for UI interactions
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'date'>('none');

  // Handle scroll to load more notifications
  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 20;

      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom
      ) {
        if (hasNextPage && !isLoadingMore) {
          loadMore();
        }
      }
    },
    [hasNextPage, isLoadingMore, loadMore]
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  }, [unreadCount, markAllAsRead]);

  // Render panel header
  const renderHeader = () => (
    <View
      style={[
        styles.header,
        { borderBottomColor: theme.colors.border.primary },
      ]}
    >
      <View style={styles.headerLeft}>
        <Text variant="h6" weight="semiBold" style={styles.headerTitle}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <View
            style={[
              styles.unreadBadge,
              { backgroundColor: theme.colors.primary[500] },
            ]}
          >
            <Text
              variant="caption"
              weight="bold"
              style={[
                styles.unreadBadgeText,
                { color: theme.colors.text.inverse },
              ]}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: showSearch
                ? theme.colors.primary[100]
                : 'transparent',
            },
          ]}
          onPress={() => setShowSearch(!showSearch)}
          accessibilityRole="button"
          accessibilityLabel="Toggle notification search"
          accessibilityHint="Shows or hides notification search"
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={
              showSearch
                ? theme.colors.primary[600]
                : theme.colors.text.secondary
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: showFilters
                ? theme.colors.primary[100]
                : 'transparent',
            },
          ]}
          onPress={() => setShowFilters(!showFilters)}
          accessibilityRole="button"
          accessibilityLabel="Toggle notification filters"
          accessibilityHint="Shows or hides notification filter options"
        >
          <Ionicons
            name="filter-outline"
            size={20}
            color={
              showFilters
                ? theme.colors.primary[600]
                : theme.colors.text.secondary
            }
          />
        </TouchableOpacity>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={[
              styles.markAllButton,
              { backgroundColor: theme.colors.primary[50] },
            ]}
            onPress={handleMarkAllAsRead}
            disabled={isMarkingAllAsRead}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            accessibilityHint="Marks all unread notifications as read"
          >
            <Text
              variant="caption"
              weight="medium"
              style={[
                styles.markAllButtonText,
                { color: theme.colors.primary[600] },
              ]}
            >
              {isMarkingAllAsRead ? 'Marking...' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close notifications panel"
          accessibilityHint="Closes the notifications panel"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="close"
            size={24}
            color={theme.colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render filter controls
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View
        style={[
          styles.filtersContainer,
          {
            backgroundColor: theme.colors.background.secondary,
            borderBottomColor: theme.colors.border.primary,
          },
        ]}
      >
        <Text
          variant="caption"
          weight="medium"
          style={[styles.filtersLabel, { color: theme.colors.text.secondary }]}
        >
          Filter by:
        </Text>
        <View style={styles.filterButtons}>
          {(['all', 'unread', 'read'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filterType === filter
                      ? theme.colors.primary[500]
                      : theme.colors.background.primary,
                  borderColor:
                    filterType === filter
                      ? theme.colors.primary[500]
                      : theme.colors.border.primary,
                },
              ]}
              onPress={() => setFilter(filter)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${filter} notifications`}
              accessibilityState={{ selected: filterType === filter }}
            >
              <Text
                variant="caption"
                weight="medium"
                style={[
                  styles.filterChipText,
                  {
                    color:
                      filterType === filter
                        ? theme.colors.text.inverse
                        : theme.colors.text.primary,
                  },
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    const getEmptyStateContent = () => {
      switch (filterType) {
        case 'unread':
          return {
            title: 'No unread notifications',
            message:
              'All caught up! You have no unread notifications at the moment.',
            icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
          };
        case 'read':
          return {
            title: 'No read notifications',
            message: "You haven't read any notifications yet.",
            icon: 'eye-outline' as keyof typeof Ionicons.glyphMap,
          };
        default:
          return {
            title: 'No notifications yet',
            message:
              "When you receive notifications, they'll appear here. Stay connected with your community!",
            icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
          };
      }
    };

    const { title, message, icon } = getEmptyStateContent();

    return (
      <View style={styles.emptyStateContainer}>
        <EmptyState
          title={title}
          message={message}
          icon={
            <Ionicons
              name={icon}
              size={64}
              color={theme.colors.text.tertiary}
            />
          }
          testID="notifications-empty-state"
        />
      </View>
    );
  };

  // Render loading state
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <LoadingSpinner
        size="large"
        color={theme.colors.primary[500]}
        accessibilityLabel="Loading notifications"
      />
      <Text variant="body" color="secondary" style={styles.loadingText}>
        Loading notifications...
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={theme.colors.error[500]}
        style={styles.errorIcon}
      />
      <Text variant="h6" weight="medium" style={styles.errorTitle}>
        Unable to load notifications
      </Text>
      <Text variant="body" color="secondary" style={styles.errorMessage}>
        Please check your connection and try again.
      </Text>
      <TouchableOpacity
        style={[
          styles.retryButton,
          { backgroundColor: theme.colors.primary[500] },
        ]}
        onPress={onRefresh}
        accessibilityRole="button"
        accessibilityLabel="Retry loading notifications"
      >
        <Text
          variant="body"
          weight="medium"
          style={[styles.retryButtonText, { color: theme.colors.text.inverse }]}
        >
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render notification list
  const renderNotificationList = () => (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollViewContent,
        notifications.length === 0 && styles.scrollViewContentEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={isLoading && notifications.length > 0}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary[500]}
          colors={[theme.colors.primary[500]]}
          title="Pull to refresh"
          titleColor={theme.colors.text.secondary}
        />
      }
      accessibilityRole="list"
      accessibilityLabel={`Notifications list with ${notifications.length} notification${notifications.length === 1 ? '' : 's'}. ${filterType !== 'all' ? `Filtered by ${filterType}.` : ''}`}
    >
      {notifications.length > 0 && (
        <View style={styles.notificationsList}>
          {notifications.map((notification, index) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              isLast={index === notifications.length - 1 && !hasNextPage}
              testID={`notification-item-${notification.id}`}
            />
          ))}
        </View>
      )}

      {/* Load more indicator */}
      {hasNextPage && (
        <View style={styles.loadMoreContainer}>
          {isLoadingMore ? (
            <>
              <LoadingSpinner
                size="small"
                color={theme.colors.primary[500]}
                accessibilityLabel="Loading more notifications"
              />
              <Text
                variant="caption"
                color="secondary"
                style={styles.loadMoreText}
              >
                Loading more...
              </Text>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.loadMoreButton,
                { borderColor: theme.colors.border.primary },
              ]}
              onPress={loadMore}
              accessibilityRole="button"
              accessibilityLabel="Load more notifications"
              accessibilityHint="Loads additional notifications"
            >
              <Text variant="body" color="primary" weight="medium">
                Load More
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* End of list indicator */}
      {notifications.length > 0 && !hasNextPage && (
        <View style={styles.endOfListContainer}>
          <Text variant="caption" color="tertiary" style={styles.endOfListText}>
            You're all caught up!
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // Render panel content
  const renderContent = () => {
    if (error) {
      return renderErrorState();
    }

    if (isLoading && notifications.length === 0) {
      return renderLoadingState();
    }

    if (notifications.length === 0) {
      return renderEmptyState();
    }

    return renderNotificationList();
  };

  return (
    <Modal
      isVisible={visible}
      onClose={onClose}
      variant="bottom-sheet"
      size="large"
      showCloseButton={false}
      closeOnOverlayPress={true}
      closeOnBackPress={true}
      scrollable={false}
      testID={testID}
      contentStyle={styles.modalContent}
    >
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderFilters()}
        <View style={styles.content}>{renderContent()}</View>
      </SafeAreaView>
    </Modal>
  );
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContent: {
    maxHeight: screenHeight * 0.8,
    minHeight: screenHeight * 0.5,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllButtonText: {
    fontSize: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  scrollViewContentEmpty: {
    justifyContent: 'center',
  },
  notificationsList: {
    // Container for notifications
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 12,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filtersLabel: {
    marginBottom: 8,
    fontSize: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  endOfListContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
