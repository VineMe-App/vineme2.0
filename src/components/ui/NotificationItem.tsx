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
  userAvatars?: Record<string, string | null>;
}

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;
const ACTION_WIDTH = 80;
const MAX_SWIPE_DISTANCE = ACTION_WIDTH * 2;

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  isLast = false,
  testID = 'notification-item',
  userAvatars = {},
}) => {
  const { theme } = useTheme();
  const { handleNotificationPress } = useNotificationNavigation();

  const translateX = useRef(new Animated.Value(0)).current;
  const actionOpacity = useRef(new Animated.Value(0)).current;

  const isUnread = !notification.read;
  const timestamp = formatTimestamp(notification.created_at);
  const { avatarData } = getNotificationMetadata(notification, theme, userAvatars);

  const handlePress = useCallback(() => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    handleNotificationPress(notification);
  }, [notification, isUnread, onMarkAsRead, handleNotificationPress]);

  const swipeDistance = isUnread ? MAX_SWIPE_DISTANCE : ACTION_WIDTH;

  const handleGestureEvent = useCallback(
    (event: any) => {
      const { translationX } = event.nativeEvent;
      if (translationX <= 0) {
        const clampedTranslation = Math.max(translationX, -swipeDistance);
        translateX.setValue(clampedTranslation);
        const opacity = Math.min(
          Math.abs(clampedTranslation) / ACTION_WIDTH,
          1
        );
        actionOpacity.setValue(opacity);
      }
    },
    [translateX, actionOpacity, swipeDistance]
  );

  const handleGestureStateChange = useCallback(
    (event: any) => {
      const { state, translationX } = event.nativeEvent;
      if (state === State.END) {
        const clampedTranslation = Math.max(translationX, -swipeDistance);
        const effectiveThreshold = Math.min(SWIPE_THRESHOLD, swipeDistance * 0.75);
        const shouldShowActions = Math.abs(clampedTranslation) >= effectiveThreshold;

        Animated.parallel([
          Animated.spring(translateX, {
            toValue: shouldShowActions ? -swipeDistance : 0,
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
    [translateX, actionOpacity, swipeDistance]
  );

  const handleMarkAsRead = useCallback(() => {
    if (onMarkAsRead && isUnread) {
      onMarkAsRead(notification.id);
    }
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

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(notification.id);
    }
  }, [notification.id, onDelete]);

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

  // Get notification title and body based on type
  const { title, body } = getNotificationTitleAndBody(notification);

  return (
    <View style={styles.container} testID={testID}>
      <Animated.View
        style={[styles.swipeActionsContainer, { opacity: actionOpacity }]}
      >
        {renderSwipeActions()}
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleGestureStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.touchableContent}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={`Notification: ${title}. ${body}`}
            activeOpacity={0.7}
          >
            {/* Profile Picture */}
            <View style={styles.avatarContainer}>
              {avatarData ? (
                <Avatar
                  size={34}
                  imageUrl={avatarData.imageUrl}
                  name={avatarData.name}
                />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Ionicons name="person" size={20} color="#2C2235" />
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.textContent}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.timestamp}>{timestamp}</Text>
              </View>
              <Text style={styles.body} numberOfLines={2}>
                {body}
              </Text>
            </View>

            {/* Right Arrow */}
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={16} color="#2C2235" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>

      {/* Divider */}
      {!isLast && <View style={styles.divider} />}
    </View>
  );
};

// Helper function to get notification title and body based on type
function getNotificationTitleAndBody(notification: Notification): {
  title: string;
  body: string;
} {
  const { type, data } = notification;

  switch (type) {
    case 'friend_request_accepted':
      return {
        title: 'Friend request accepted',
        body: `${data.acceptedByUserName || 'Someone'} accepted your friend request`,
      };

    case 'group_request_submitted':
      return {
        title: 'New group request',
        body: `${data.creatorName || 'Someone'} has requested to create "${data.groupTitle || 'a group'}"`,
      };

    case 'join_request_received':
      return {
        title: 'New join request',
        body: `${data.requesterName || 'Someone'} wants to join "${data.groupTitle || 'a group'}"`,
      };

    case 'friend_request_received':
      return {
        title: 'New friend request',
        body: `${data.fromUserName || 'Someone'} wants to be your friend`,
      };

    case 'join_request_approved':
      return {
        title: 'Join request approved',
        body: `Your request to join "${data.groupTitle || 'a group'}" has been approved`,
      };

    case 'join_request_denied':
      return {
        title: 'Join request denied',
        body: `Your request to join "${data.groupTitle || 'a group'}" was not approved`,
      };

    case 'group_request_approved':
      return {
        title: 'Group request approved',
        body: `Your group "${data.groupTitle || 'a group'}" has been approved`,
      };

    case 'group_request_denied':
      return {
        title: 'Group request denied',
        body: `Your group request was not approved`,
      };

    case 'referral_accepted':
      return {
        title: 'Referral accepted',
        body: `${data.referredUserName || 'Someone'} accepted your referral`,
      };

    case 'referral_joined_group':
      return {
        title: 'Referral joined group',
        body: `${data.referredUserName || 'Someone'} joined "${data.groupTitle || 'a group'}"`,
      };

    default:
      return {
        title: notification.title,
        body: notification.body,
      };
  }
}

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
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else if (diffInMinutes < 10080) {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function getNotificationMetadata(
  notification: Notification,
  theme: any,
  userAvatars: Record<string, string | null> = {}
) {
  const { type, data } = notification;
  let avatarData: { imageUrl?: string; name: string } | null = null;

  switch (type) {
    case 'friend_request_received':
      if (data.fromUserName) {
        const userId = data.fromUserId;
        avatarData = {
          name: data.fromUserName,
          imageUrl: data.fromUserAvatar || (userId ? userAvatars[userId] || undefined : undefined),
        };
      }
      break;

    case 'friend_request_accepted':
      if (data.acceptedByUserName) {
        const userId = data.acceptedByUserId;
        avatarData = {
          name: data.acceptedByUserName,
          imageUrl: data.acceptedByUserAvatar || (userId ? userAvatars[userId] || undefined : undefined),
        };
      }
      break;

    case 'group_request_submitted':
      if (data.creatorName) {
        const userId = data.creatorId;
        avatarData = {
          name: data.creatorName,
          imageUrl: data.creatorAvatar || (userId ? userAvatars[userId] || undefined : undefined),
        };
      }
      break;

    case 'group_request_approved':
    case 'group_request_denied':
      // These don't have user IDs in data, so we can't fetch avatars
      if (data.approvedByName || data.deniedByName) {
        avatarData = {
          name: data.approvedByName || data.deniedByName,
          imageUrl: data.approvedByAvatar || data.deniedByAvatar,
        };
      }
      break;

    case 'join_request_received':
      if (data.requesterName) {
        const userId = data.requesterId;
        avatarData = {
          name: data.requesterName,
          imageUrl: data.requesterAvatar || (userId ? userAvatars[userId] || undefined : undefined),
        };
      }
      break;

    case 'join_request_approved':
    case 'join_request_denied':
    case 'group_member_added':
      if (
        data.approvedByName ||
        data.deniedByName ||
        data.addedByName
      ) {
        avatarData = {
          name:
            data.approvedByName ||
            data.deniedByName ||
            data.addedByName,
          imageUrl:
            data.approvedByAvatar ||
            data.deniedByAvatar ||
            data.addedByAvatar,
        };
      }
      break;

    case 'referral_accepted':
    case 'referral_joined_group':
      if (data.referredUserName) {
        const userId = data.referredUserId;
        avatarData = {
          name: data.referredUserName,
          imageUrl: data.referredUserAvatar || (userId ? userAvatars[userId] || undefined : undefined),
        };
      }
      break;
  }

  return { avatarData };
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  swipeActionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH * 2,
    overflow: 'hidden',
    zIndex: 1,
  },
  swipeActions: {
    flexDirection: 'row',
    height: '100%',
    width: ACTION_WIDTH * 2,
    justifyContent: 'flex-end',
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
    backgroundColor: '#FEFEFE',
    zIndex: 2,
  },
  touchableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 17,
    minHeight: 68,
  },
  avatarContainer: {
    marginRight: 12,
  },
  defaultAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F9FAFC',
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
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 18,
    color: '#2C2235',
    fontFamily: 'Figtree-SemiBold',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 11,
    letterSpacing: -0.22,
    lineHeight: 12,
    color: '#595959',
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    flexShrink: 0,
  },
  body: {
    fontSize: 12,
    letterSpacing: -0.24,
    lineHeight: 14,
    color: '#595959',
    fontFamily: 'Figtree-Regular',
  },
  chevronContainer: {
    marginLeft: 8,
    justifyContent: 'center',
    width: 16,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginLeft: 17,
  },
});
