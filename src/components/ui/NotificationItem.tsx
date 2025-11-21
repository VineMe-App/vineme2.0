import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/provider/useTheme';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { useNotificationNavigation } from '@/hooks/useNotifications';
import type { Notification } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  isLast?: boolean;
  testID?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;
const ACTION_WIDTH = 80;
// Distance the content moves when swiped (negative = left, positive = right)
const SWIPE_DISTANCE = ACTION_WIDTH; // Change this value to adjust how far content moves

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  isLast = false,
  testID = 'notification-item',
}) => {
  const { theme } = useTheme();
  const { handleNotificationPress } = useNotificationNavigation();

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const actionOpacity = useRef(new Animated.Value(0)).current;

  // Get notification metadata
  const isUnread = !notification.read;
  const timestamp = formatTimestamp(notification.created_at);
  const { icon, iconColor, avatarData } = getNotificationMetadata(
    notification,
    theme
  );

  // Handle notification press
  const handlePress = useCallback(() => {
    // Mark as read if unread
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate to notification target
    handleNotificationPress(notification);
  }, [notification, isUnread, onMarkAsRead, handleNotificationPress]);

  // Handle swipe gestures
  const handleGestureEvent = useCallback(
    (event: any) => {
      const { translationX } = event.nativeEvent;

      // Only allow left swipe (negative translation)
      if (translationX <= 0) {
        const clampedTranslation = Math.max(translationX, -SWIPE_DISTANCE);
        translateX.setValue(clampedTranslation);

        // Show actions when swiped enough
        const opacity = Math.min(
          Math.abs(clampedTranslation) / ACTION_WIDTH,
          1
        );
        actionOpacity.setValue(opacity);
      }
    },
    [translateX, actionOpacity]
  );

  const handleGestureStateChange = useCallback(
    (event: any) => {
      const { state, translationX } = event.nativeEvent;

      if (state === State.END) {
        const shouldShowActions = Math.abs(translationX) > SWIPE_THRESHOLD;

        Animated.parallel([
          Animated.spring(translateX, {
            toValue: shouldShowActions ? -SWIPE_DISTANCE : 0,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(actionOpacity, {
            toValue: shouldShowActions ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    },
    [translateX, actionOpacity]
  );

  // Handle mark as read action
  const handleMarkAsRead = useCallback(() => {
    if (onMarkAsRead && isUnread) {
      onMarkAsRead(notification.id);
    }

    // Reset swipe position
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
      }),
      Animated.timing(actionOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [notification.id, onMarkAsRead, isUnread, translateX, actionOpacity]);

  // Handle delete action
  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(notification.id);
    }
  }, [notification.id, onDelete]);

  // Render swipe actions
  const renderSwipeActions = () => (
    <View style={styles.swipeActions}>
      {isUnread && (
        <TouchableOpacity
          style={[
            styles.swipeAction,
            { backgroundColor: theme.colors.primary[500] },
          ]}
          onPress={handleMarkAsRead}
          accessibilityRole="button"
          accessibilityLabel="Mark as read"
          accessibilityHint="Marks this notification as read"
        >
          <Ionicons
            name="checkmark"
            size={20}
            color={theme.colors.text.inverse}
          />
          <Text
            variant="caption"
            weight="medium"
            style={[
              styles.swipeActionText,
              { color: theme.colors.text.inverse },
            ]}
          >
            Read
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.swipeAction,
          { backgroundColor: theme.colors.error[500] },
        ]}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete notification"
        accessibilityHint="Deletes this notification"
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={theme.colors.text.inverse}
        />
        <Text
          variant="caption"
          weight="medium"
          style={[styles.swipeActionText, { color: theme.colors.text.inverse }]}
        >
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[styles.container, isLast && styles.containerLast]}
      testID={testID}
    >
      {/* Swipe actions background */}
      <Animated.View
        style={[styles.swipeActionsContainer, { opacity: actionOpacity }]}
      >
        {renderSwipeActions()}
      </Animated.View>

      {/* Main notification content */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleGestureStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View
          style={[
            styles.content,
            {
              backgroundColor: isUnread
                ? theme.colors.primary[50]
                : theme.colors.background.primary,
              borderBottomColor: theme.colors.border.primary,
              transform: [{ translateX }],
            },
            isLast && styles.contentLast,
          ]}
        >
          <TouchableOpacity
            style={styles.touchableContent}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={`Notification: ${notification.title}. ${notification.body}`}
            accessibilityHint="Double tap to open notification"
            accessibilityState={{ selected: isUnread }}
          >
            {/* Unread indicator */}
            {isUnread && (
              <View
                style={[
                  styles.unreadIndicator,
                  { backgroundColor: theme.colors.primary[500] },
                ]}
              />
            )}

            {/* Avatar or icon */}
            <View style={styles.avatarContainer}>
              {avatarData ? (
                <Avatar
                  size={40}
                  imageUrl={avatarData.imageUrl}
                  name={avatarData.name}
                />
              ) : (
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: iconColor + '20' }, // 20% opacity
                  ]}
                >
                  <Ionicons name={icon} size={20} color={iconColor} />
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.textContent}>
              <View style={styles.titleRow}>
                <Text
                  variant="body"
                  weight={isUnread ? 'semiBold' : 'medium'}
                  style={[styles.title, { color: theme.colors.text.primary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {notification.title}
                </Text>

                <Text
                  variant="caption"
                  style={[
                    styles.timestamp,
                    { color: theme.colors.text.tertiary },
                  ]}
                >
                  {timestamp}
                </Text>
              </View>

              <Text
                variant="body"
                style={[
                  styles.body,
                  {
                    color: isUnread
                      ? theme.colors.text.primary
                      : theme.colors.text.secondary,
                  },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {notification.body}
              </Text>

              {/* Notification type badge */}
              <View style={styles.metadataRow}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: theme.colors.neutral[100] },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={[
                      styles.typeBadgeText,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    {formatNotificationType(notification.type)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Chevron indicator */}
            <View style={styles.chevronContainer}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.text.tertiary}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// Helper functions
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else if (diffInMinutes < 10080) {
    // 7 days
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function formatNotificationType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getNotificationMetadata(notification: Notification, theme: any) {
  const { type, data } = notification;

  // Default values
  let icon: keyof typeof Ionicons.glyphMap = 'notifications-outline';
  let iconColor = theme.colors.primary[500];
  let avatarData: { imageUrl?: string; name: string } | null = null;

  switch (type) {
    case 'friend_request_received':
    case 'friend_request_accepted':
      icon = 'person-add-outline';
      iconColor = theme.colors.success[500];
      if (data.fromUserName || data.acceptedByUserName) {
        avatarData = {
          name: data.fromUserName || data.acceptedByUserName,
          imageUrl: data.fromUserAvatar || data.acceptedByUserAvatar,
        };
      }
      break;

    case 'group_request_submitted':
    case 'group_request_approved':
    case 'group_request_denied':
      icon = 'people-outline';
      iconColor = theme.colors.info[500];
      if (data.creatorName || data.approvedByName || data.deniedByName) {
        avatarData = {
          name: data.creatorName || data.approvedByName || data.deniedByName,
          imageUrl:
            data.creatorAvatar || data.approvedByAvatar || data.deniedByAvatar,
        };
      }
      break;

    case 'join_request_received':
    case 'join_request_approved':
    case 'join_request_denied':
    case 'group_member_added':
      icon = 'enter-outline';
      iconColor = theme.colors.primary[500];
      if (
        data.requesterName ||
        data.approvedByName ||
        data.deniedByName ||
        data.addedByName
      ) {
        avatarData = {
          name:
            data.requesterName ||
            data.approvedByName ||
            data.deniedByName ||
            data.addedByName,
          imageUrl:
            data.requesterAvatar ||
            data.approvedByAvatar ||
            data.deniedByAvatar ||
            data.addedByAvatar,
        };
      }
      break;

    case 'referral_accepted':
    case 'referral_joined_group':
      icon = 'gift-outline';
      iconColor = theme.colors.warning[500];
      if (data.referredUserName) {
        avatarData = {
          name: data.referredUserName,
          imageUrl: data.referredUserAvatar,
        };
      }
      break;

    case 'event_reminder':
      icon = 'calendar-outline';
      iconColor = theme.colors.info[500];
      break;

    default:
      icon = 'notifications-outline';
      iconColor = theme.colors.neutral[500];
  }

  return { icon, iconColor, avatarData };
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  containerLast: {
    // No additional styles needed for last item
  },
  swipeActionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH * 2,
    overflow: 'hidden',
  },
  swipeActions: {
    flexDirection: 'row',
    height: '100%',
    width: ACTION_WIDTH * 2,
    justifyContent: 'flex-end', // Align actions to the right edge
    alignItems: 'stretch',
  },
  swipeAction: {
    width: ACTION_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionText: {
    fontSize: 10,
    marginTop: 2,
  },
  content: {
    borderBottomWidth: 1,
    zIndex: 2,
  },
  contentLast: {
    borderBottomWidth: 0,
  },
  touchableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 80,
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  avatarContainer: {
    marginRight: 12,
    marginLeft: 8, // Account for unread indicator
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    flexShrink: 0,
  },
  body: {
    marginBottom: 8,
    lineHeight: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
  },
  chevronContainer: {
    marginLeft: 8,
    justifyContent: 'center',
  },
});
