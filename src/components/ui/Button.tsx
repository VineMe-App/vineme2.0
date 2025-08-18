import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Theme } from '../../utils/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
}) => {
  const isDisabled = disabled || loading;

  const getLoadingColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return Theme.colors.white;
      case 'secondary':
      case 'outline':
        return Theme.colors.primary;
      case 'ghost':
        return Theme.colors.textSecondary;
      default:
        return Theme.colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={title}
    >
      {loading ? (
          <ActivityIndicator color={getLoadingColor()} style={{ width: 16, height: 16 }} />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`${variant}Text`],
            styles[`${size}Text`],
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: Theme.layout.touchTarget,
  },
  primary: {
    backgroundColor: Theme.colors.primary,
  },
  secondary: {
    backgroundColor: Theme.colors.backgroundSecondary,
    borderColor: Theme.colors.border,
  },
  danger: {
    backgroundColor: Theme.colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Theme.colors.primary,
  },
  small: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    minHeight: 32,
  },
  medium: {
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.md,
    minHeight: Theme.layout.touchTarget,
  },
  large: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.base,
    minHeight: 52,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: Theme.typography.fontWeight.semiBold,
    textAlign: 'center',
  },
  primaryText: {
    color: Theme.colors.white,
    fontSize: Theme.typography.fontSize.base,
  },
  secondaryText: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSize.base,
  },
  dangerText: {
    color: Theme.colors.white,
    fontSize: Theme.typography.fontSize.base,
  },
  ghostText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.typography.fontSize.base,
  },
  outlineText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSize.base,
  },
  smallText: {
    fontSize: Theme.typography.fontSize.sm,
  },
  mediumText: {
    fontSize: Theme.typography.fontSize.base,
  },
  largeText: {
    fontSize: Theme.typography.fontSize.lg,
  },
});
