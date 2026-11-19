import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/provider/useTheme';

interface NotificationIconWithBadgeProps {
  onPress: () => void;
  unreadCount: number;
  size?: number;
  color?: string;
  badgeColor?: string;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

export const NotificationIconWithBadge: React.FC<
  NotificationIconWithBadgeProps
> = ({
  onPress,
  unreadCount,
  size = 24,
  color,
  badgeColor,
  testID = 'notification-icon-with-badge',
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Use theme colors if not provided
  const iconColor = color || theme.colors.text.primary;
  const notificationBadgeColor = badgeColor || theme.colors.error[500];

  // Animation for new notifications
  React.useEffect(() => {
    if (unreadCount > 0) {
      // Subtle bounce animation when new notifications arrive
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unreadCount, scaleAnim]);

  // Default accessibility labels
  const defaultAccessibilityLabel =
    accessibilityLabel ||
    (unreadCount > 0
      ? `Notifications, ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
      : 'Notifications, no unread notifications');

  const defaultAccessibilityHint =
    accessibilityHint || 'Double tap to open notifications panel';

  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, disabled && styles.disabled]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={defaultAccessibilityLabel}
      accessibilityHint={defaultAccessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="notifications-outline"
            size={size}
            color={disabled ? theme.colors.text.disabled : iconColor}
          />
          {unreadCount > 0 && (
            <View
              style={[
                styles.notificationDot,
                { backgroundColor: notificationBadgeColor },
              ]}
              accessibilityLabel={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
            />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 1,
  },
});
