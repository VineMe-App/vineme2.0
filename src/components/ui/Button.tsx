import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  Animated,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import Text from './Text';
import { useTheme } from '../../theme/provider/useTheme';
import { Spinner } from './Loading/Spinner';

export interface ButtonProps {
  /**
   * Button text content
   */
  title: string;

  /**
   * Function to call when button is pressed
   */
  onPress: () => void;

  /**
   * Visual variant of the button
   */
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'ghost'
    | 'outline';

  /**
   * Size of the button
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Whether the button is in loading state
   */
  loading?: boolean;

  /**
   * Icon to display before the text
   */
  icon?: React.ReactNode;

  /**
   * Icon to display after the text
   */
  iconRight?: React.ReactNode;

  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean;

  /**
   * Custom loading spinner variant
   */
  loadingVariant?: 'circular' | 'dots' | 'pulse' | 'bars';

  /**
   * Custom styles for the button container
   */
  style?: ViewStyle;

  /**
   * Custom styles for the button text
   */
  textStyle?: TextStyle;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;

  /**
   * Accessibility hint
   */
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'secondary', // Changed from 'primary' to 'secondary'
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  loadingVariant = 'circular',
  style,
  textStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;
  const focusValue = useRef(new Animated.Value(0)).current;

  const isDisabled = disabled || loading;
  const hasIcon = icon || iconRight;

  // Generate dynamic styles based on theme
  const buttonStyles = getButtonStyles(
    theme,
    variant,
    size,
    fullWidth,
    isDisabled
  );
  const textStyles = getTextStyles(theme, variant, size);
  const loadingColor = getLoadingColor(theme, variant);

  // Handle press animations
  const handlePressIn = () => {
    if (!isDisabled) {
      Animated.spring(scaleValue, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  // Handle focus animations for accessibility
  const handleFocus = () => {
    Animated.timing(focusValue, {
      toValue: 1,
      duration: theme.animations.duration.fast,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(focusValue, {
      toValue: 0,
      duration: theme.animations.duration.fast,
      useNativeDriver: false,
    }).start();
  };

  // Announce loading state changes to screen readers
  useEffect(() => {
    if (loading) {
      AccessibilityInfo.announceForAccessibility(`${title} button is loading`);
    }
  }, [loading, title]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Spinner
            size={
              size === 'small' ? 'small' : size === 'large' ? 'medium' : 'small'
            }
            color={loadingColor}
            variant={loadingVariant}
            accessibilityLabel={`Loading ${title}`}
          />
          {Platform.OS === 'ios' && (
            <Text
              weight="medium"
              style={[textStyles, styles.loadingText, textStyle as TextStyle]}
            >
              {title}
            </Text>
          )}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.contentContainer,
          hasIcon ? styles.contentWithIcon : undefined,
        ]}
      >
        {icon && (
          <View style={[styles.iconContainer, styles.iconLeft]}>{icon}</View>
        )}
        <Text
          weight="medium"
          align="center"
          style={[
            textStyles,
            (!hasIcon ? styles.textNoIcon : undefined) as TextStyle,
            textStyle as TextStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {iconRight && (
          <View style={[styles.iconContainer, styles.iconRight]}>
            {iconRight}
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleValue }] },
        fullWidth ? styles.fullWidth : undefined,
      ]}
    >
      <TouchableOpacity
        style={[
          buttonStyles,
          {
            borderColor: focusValue.interpolate({
              inputRange: [0, 1],
              outputRange: [
                (buttonStyles.borderColor as string) || 'transparent',
                theme.colors.primary[500],
              ],
            }) as any,
            shadowOpacity: focusValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.2],
            }) as any,
          } as any,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={isDisabled}
        activeOpacity={0.8}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{
          disabled: isDisabled,
          busy: loading,
        }}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessible={true}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Get button styles based on theme, variant, size, and state
 */
const getButtonStyles = (
  theme: any,
  variant: string,
  size: string,
  fullWidth: boolean,
  isDisabled: boolean
): ViewStyle => {
  // Calculate border radius for pill-shaped buttons (half the height)
  const getPillBorderRadius = (size: string): number => {
    const sizeStyles: Record<string, number> = {
      small: 32,
      medium: 44,
      large: 52,
    };
    return sizeStyles[size] / 2;
  };

  const baseStyles: ViewStyle = {
    borderRadius: getPillBorderRadius(size), // Dynamic border radius for pill shape
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
  };

  // Size styles
  const sizeStyles: Record<string, ViewStyle> = {
    small: {
      paddingHorizontal: 20, // Good balance - 20px padding for comfortable spacing
      paddingVertical: theme.spacing.xs,
      minHeight: 32,
    },
    medium: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      minHeight: 44,
    },
    large: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      minHeight: 52,
    },
  };

  // Variant styles
  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: theme.colors.text.primary,
      borderColor: theme.colors.text.primary,
    },
    secondary: {
      backgroundColor: theme.colors.primary[500], // Changed to use primary color (pink)
      borderColor: theme.colors.primary[500],
    },
    success: {
      backgroundColor: theme.colors.success[500],
      borderColor: theme.colors.success[500],
    },
    warning: {
      backgroundColor: theme.colors.warning[500],
      borderColor: theme.colors.warning[500],
    },
    error: {
      backgroundColor: theme.colors.error[500],
      borderColor: theme.colors.error[500],
    },
    info: {
      backgroundColor: theme.colors.info[500],
      borderColor: theme.colors.info[500],
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary[500],
    },
  };

  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  if (fullWidth) {
    combinedStyles.width = '100%';
  }

  if (isDisabled) {
    combinedStyles.opacity = 0.6;
  }

  return combinedStyles;
};

/**
 * Get text styles based on theme, variant, and size
 */
const getTextStyles = (
  theme: any,
  variant: string,
  size: string
): TextStyle => {
  const baseStyles: TextStyle = {
    textAlign: 'center',
    includeFontPadding: false,
  };

  // Size styles
  const sizeStyles: Record<string, TextStyle> = {
    small: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    medium: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.lineHeight.base,
    },
    large: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.lineHeight.lg,
    },
  };

  // Variant text colors
  const variantTextColors: Record<string, string> = {
    primary: theme.colors.text.inverse, // White text on dark button
    secondary: theme.colors.text.inverse, // Light green text for pink buttons
    success: theme.colors.text.inverse,
    warning: theme.colors.text.inverse,
    error: theme.colors.text.inverse,
    info: theme.colors.text.inverse,
    ghost: theme.colors.text.secondary,
    outline: theme.colors.primary[500],
  };

  return {
    ...baseStyles,
    ...sizeStyles[size],
    color: variantTextColors[variant],
  };
};

/**
 * Get loading spinner color based on variant
 */
const getLoadingColor = (theme: any, variant: string): string => {
  const colorMap: Record<string, string> = {
    primary: theme.colors.text.inverse, // White for loading spinner
    secondary: theme.colors.text.primary,
    success: theme.colors.text.inverse,
    warning: theme.colors.text.inverse,
    error: theme.colors.text.inverse,
    info: theme.colors.text.inverse,
    ghost: theme.colors.text.secondary,
    outline: theme.colors.primary[500],
  };

  return colorMap[variant] || theme.colors.primary[500];
};

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  contentWithIcon: {
    paddingHorizontal: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    opacity: 0.7,
  },
  textNoIcon: {
    width: '100%',
    textAlign: 'center',
  },
});
