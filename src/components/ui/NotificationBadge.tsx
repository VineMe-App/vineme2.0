import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import { AdminAccessibilityLabels } from '@/utils/accessibility';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  style?: any;
  maxCount?: number;
  type?: string;
  accessibilityLabel?: string;
}

export function NotificationBadge({
  count,
  size = 'medium',
  color = '#ef4444',
  textColor = '#fff',
  style,
  maxCount = 99,
  type = 'notifications',
  accessibilityLabel,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const defaultAccessibilityLabel =
    accessibilityLabel ||
    AdminAccessibilityLabels.notificationBadge(count, type);

  const sizeStyles = {
    small: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
    },
    medium: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
    },
    large: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 8,
    },
  };

  const textSizes = {
    small: 10,
    medium: 12,
    large: 14,
  };

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size],
        { backgroundColor: color },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={defaultAccessibilityLabel}
      accessibilityLiveRegion="polite"
      accessible={true}
      importantForAccessibility="yes"
    >
      <Text
        weight="bold"
        style={[
          styles.badgeText,
          { color: textColor, fontSize: textSizes[size] },
        ]}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 1,
  },
  badgeText: {
    textAlign: 'center',
  },
});
