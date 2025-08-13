import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Theme } from '../../utils/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
  textStyle,
  testID,
}) => {
  return (
    <View
      style={[
        styles.badge,
        styles[variant],
        styles[size],
        style,
      ]}
      testID={testID}
    >
      <Text
        style={[
          styles.text,
          styles[`${variant}Text`],
          styles[`${size}Text`],
          textStyle,
        ]}
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
    fontWeight: Theme.typography.fontWeight.medium,
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