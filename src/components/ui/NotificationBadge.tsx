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
      minWidth: 28, // Doubled from 16
      height: 28, // Doubled from 16
      borderRadius: 14, // Half of height for perfect circle
      paddingHorizontal: 6, // Doubled from 4
    },
    medium: {
      minWidth: 40, // Doubled from 20
      height: 40, // Doubled from 20
      borderRadius: 20, // Half of height for perfect circle
      paddingHorizontal: 12, // Doubled from 6
    },
    large: {
      minWidth: 48, // Doubled from 24
      height: 48, // Doubled from 24
      borderRadius: 24, // Half of height for perfect circle
      paddingHorizontal: 16, // Doubled from 8
    },
  };

  const textSizes = {
    small: 14, // Increased for better readability in larger badge
    medium: 16, // Increased for better readability in larger badge
    large: 18, // Increased for better readability in larger badge
  };

  const lineHeights = {
    small: 28, // Match actual container height for perfect centering
    medium: 40, // Match actual container height for perfect centering
    large: 48, // Match actual container height for perfect centering
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
          {
            color: textColor,
            fontSize: textSizes[size],
            lineHeight: lineHeights[size],
          },
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
    top: -10, // Half of 28px small badge height for proper positioning
    right: -10, // Half of 28px small badge height for proper positioning
    zIndex: 1,
  },
  badgeText: {
    textAlign: 'center',
    // Remove includeFontPadding to allow default font padding for better centering
    textAlignVertical: 'center',
    // Add minimal padding to ensure perfect centering within container
    paddingVertical: 0,
  },
});
