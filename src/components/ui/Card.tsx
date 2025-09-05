import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../../theme/provider/useTheme';
import { ThemeSpacing, ThemeBorderRadius, ThemeShadows } from '../../theme/tokens';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'filled' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  padding?: keyof ThemeSpacing;
  borderRadius?: keyof ThemeBorderRadius;
  shadow?: keyof ThemeShadows;
  interactive?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
  onLongPress?: () => void;
  touchableProps?: Omit<TouchableOpacityProps, 'style' | 'onPress' | 'onLongPress'>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  padding,
  borderRadius,
  shadow,
  interactive = false,
  disabled = false,
  style,
  onPress,
  onLongPress,
  touchableProps,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}) => {
  const { theme } = useTheme();

  // Determine if card should be interactive (not interactive if disabled)
  const isInteractive = !disabled && (interactive || !!onPress || !!onLongPress);

  // Generate card styles based on theme and props
  const cardStyles = useMemo(() => {
    const baseStyles: ViewStyle = {
      borderRadius: borderRadius ? theme.borderRadius[borderRadius] : theme.borderRadius.lg,
    };

    // Size-based padding
    const sizeStyles: ViewStyle = {
      padding: padding ? theme.spacing[padding] : getSizePadding(size, theme.spacing),
    };

    // Variant-based styles
    const variantStyles = getVariantStyles(variant, theme, disabled);

    // Shadow styles
    const shadowStyles = shadow ? theme.shadows[shadow] : getVariantShadow(variant, theme);

    // Interactive styles
    const interactiveStyles: ViewStyle = isInteractive && !disabled ? {
      opacity: 1,
    } : {};

    // Disabled styles
    const disabledStyles: ViewStyle = disabled ? {
      opacity: 0.6,
    } : {};

    return [
      baseStyles,
      sizeStyles,
      variantStyles,
      shadowStyles,
      interactiveStyles,
      disabledStyles,
      style,
    ];
  }, [variant, size, padding, borderRadius, shadow, theme, disabled, isInteractive, style]);

  // Accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole: isInteractive ? (accessibilityRole || 'button') : 'none',
    accessibilityState: {
      disabled,
    },
    testID,
  };

  // Render logic: if interactive and not disabled, render as TouchableOpacity
  if (isInteractive && !disabled) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
        {...accessibilityProps}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // Default: render as View (for non-interactive or disabled cards)
  return (
    <View style={cardStyles} {...accessibilityProps}>
      {children}
    </View>
  );
};

// Helper functions
function getSizePadding(size: 'sm' | 'md' | 'lg', spacing: ThemeSpacing): number {
  switch (size) {
    case 'sm':
      return spacing[3]; // 12px
    case 'md':
      return spacing[4]; // 16px
    case 'lg':
      return spacing[6]; // 24px
    default:
      return spacing[4];
  }
}

function getVariantStyles(variant: string, theme: any, disabled: boolean): ViewStyle {
  const { colors } = theme;

  switch (variant) {
    case 'outlined':
      return {
        backgroundColor: colors.surface.primary,
        borderWidth: 1,
        borderColor: disabled ? colors.border.secondary : colors.border.primary,
      };
    case 'elevated':
      return {
        backgroundColor: colors.surface.primary,
      };
    case 'filled':
      return {
        backgroundColor: colors.surface.secondary,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
      };
    case 'default':
    default:
      return {
        backgroundColor: colors.surface.primary,
      };
  }
}

function getVariantShadow(variant: string, theme: any): ViewStyle {
  const { shadows } = theme;

  switch (variant) {
    case 'elevated':
      return shadows.md;
    case 'outlined':
    case 'filled':
    case 'ghost':
      return shadows.none;
    case 'default':
    default:
      return shadows.sm;
  }
}


