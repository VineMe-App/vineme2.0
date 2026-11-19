import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Text from './Text';
import { Theme } from '../../utils/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
}) => {
  const getVariantDescription = () => {
    switch (variant) {
      case 'success':
        return 'positive status';
      case 'warning':
        return 'warning status';
      case 'error':
        return 'error status';
      case 'primary':
        return 'primary status';
      case 'secondary':
        return 'secondary status';
      default:
        return 'status';
    }
  };

  const defaultAccessibilityLabel =
    accessibilityLabel || `${children} ${getVariantDescription()}`;

  return (
    <View
      style={[styles.badge, styles[variant], styles[size], style]}
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={defaultAccessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessible={true}
    >
      <Text
        weight="medium"
        style={[
          styles.text,
          styles[`${variant}Text`],
          styles[`${size}Text`],
          textStyle,
        ]}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: Theme.colors.gray200,
  },
  primary: {
    backgroundColor: Theme.colors.primary,
  },
  secondary: {
    backgroundColor: Theme.colors.secondary,
  },
  success: {
    backgroundColor: Theme.colors.success,
  },
  warning: {
    backgroundColor: Theme.colors.warning,
  },
  error: {
    backgroundColor: Theme.colors.error,
  },
  small: {
    paddingHorizontal: Theme.spacing.xs,
    paddingVertical: 2,
    minHeight: 16,
  },
  medium: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    minHeight: 20,
  },
  large: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    minHeight: 24,
  },
  text: {
    textAlign: 'center',
  },
  defaultText: {
    color: Theme.colors.textPrimary,
  },
  primaryText: {
    color: Theme.colors.white,
  },
  secondaryText: {
    color: Theme.colors.white,
  },
  successText: {
    color: Theme.colors.white,
  },
  warningText: {
    color: Theme.colors.white,
  },
  errorText: {
    color: Theme.colors.white,
  },
  smallText: {
    fontSize: Theme.typography.fontSize.xs,
  },
  mediumText: {
    fontSize: Theme.typography.fontSize.sm,
  },
  largeText: {
    fontSize: Theme.typography.fontSize.base,
  },
});
