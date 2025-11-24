import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Animated,
  ViewStyle,
  TextStyle,
  AccessibilityInfo,
  ColorValue,
} from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../theme/provider/useTheme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /**
   * Input label text
   */
  label?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Helper text to display below input
   */
  helperText?: string;

  /**
   * Success message to display
   */
  successMessage?: string;

  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Icon to display on the left side
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to display on the right side
   */
  rightIcon?: React.ReactNode;

  /**
   * Function to call when right icon is pressed
   */
  onRightIconPress?: () => void;

  /**
   * Visual variant of the input
   */
  variant?: 'default' | 'filled' | 'outlined';

  /**
   * Size of the input
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Validation state of the input
   */
  validationState?: 'default' | 'error' | 'success' | 'warning';

  /**
   * Whether the input should take full width
   */
  fullWidth?: boolean;

  /**
   * Whether to show character count
   */
  showCharacterCount?: boolean;

  /**
   * Maximum character count
   */
  maxLength?: number;

  /**
   * Custom styles for the container
   */
  containerStyle?: ViewStyle;

  /**
   * Custom styles for the input
   */
  inputStyle?: TextStyle;

  /**
   * Custom styles for the label
   */
  labelStyle?: TextStyle;

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

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  successMessage,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'default',
  size = 'medium',
  validationState = 'default',
  fullWidth = true,
  showCharacterCount = false,
  maxLength,
  containerStyle,
  inputStyle,
  labelStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
  onFocus,
  onBlur,
  value,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [characterCount, setCharacterCount] = useState(value?.length || 0);
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const borderAnimation = useRef(new Animated.Value(0)).current;

  // Determine validation state from props
  const currentValidationState = error
    ? 'error'
    : successMessage
      ? 'success'
      : validationState;

  // Generate dynamic styles based on theme
  const containerStyles = getContainerStyles(theme, fullWidth);
  const inputContainerStyles = getInputContainerStyles(
    theme,
    variant,
    size,
    currentValidationState,
    isFocused
  );
  const inputStyles = getInputStyles(theme, size);
  const labelStyles = getLabelStyles(theme, size, required);
  const messageStyles = getMessageStyles(theme, currentValidationState);

  // Handle focus animations
  const handleFocus = (event: any) => {
    setIsFocused(true);

    if (Animated.parallel) {
      Animated.parallel([
        Animated.timing(focusAnimation, {
          toValue: 1,
          duration: theme.animations.duration.fast,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: theme.animations.duration.fast,
          useNativeDriver: false,
        }),
      ]).start();
    }

    onFocus?.(event);
  };

  const handleBlur = (event: any) => {
    setIsFocused(false);

    if (Animated.parallel) {
      Animated.parallel([
        Animated.timing(focusAnimation, {
          toValue: 0,
          duration: theme.animations.duration.fast,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnimation, {
          toValue: 0,
          duration: theme.animations.duration.fast,
          useNativeDriver: false,
        }),
      ]).start();
    }

    onBlur?.(event);
  };

  // Handle character count
  const handleChangeText = (text: string) => {
    setCharacterCount(text.length);
    props.onChangeText?.(text);
  };

  // Update character count when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setCharacterCount(value.length);
    }
  }, [value]);

  // Announce validation state changes to screen readers
  useEffect(() => {
    if (error) {
      AccessibilityInfo.announceForAccessibility(`Error: ${error}`);
    } else if (successMessage) {
      AccessibilityInfo.announceForAccessibility(`Success: ${successMessage}`);
    }
  }, [error, successMessage]);

  // Generate accessibility properties
  const accessibilityProps = {
    accessibilityLabel: accessibilityLabel || label,
    accessibilityHint: accessibilityHint,
    accessibilityRequired: required,
    accessibilityInvalid: !!error,
    accessibilityDescribedBy:
      error || helperText || successMessage ? `${testID}-message` : undefined,
  };

  const renderMessage = () => {
    const message = error || successMessage || helperText;
    const hasCharacterCount = showCharacterCount && maxLength;

    if (!message && !hasCharacterCount) return null;

    return (
      <View style={styles.messageContainer} testID={`${testID}-message`}>
        {message && (
          <Text
            variant={error ? "bodySmall" : "bodySmall"}
            color={error ? "error" : successMessage ? "success" : "secondary"}
            style={[messageStyles, styles.messageText]}
            testID={`${testID}-message-text`}
            accessibilityLiveRegion="polite"
          >
            {message}
          </Text>
        )}
        {hasCharacterCount && (
          <Text
            style={[messageStyles, styles.characterCount]}
            testID={`${testID}-character-count`}
          >
            {characterCount}/{maxLength}
          </Text>
        )}
      </View>
    );
  };

  const animatedBorderColor = borderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      (inputContainerStyles.borderColor as string) ||
        theme.colors.border.primary,
      theme.colors.border.focus,
    ],
  });

  const animatedShadowOpacity = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.1],
  });

  return (
    <View style={[containerStyles, containerStyle]} testID={testID}>
      {label && (
        <Text 
          variant="labelSmall" 
          color="secondary" 
          weight="medium"
          style={[
            labelStyles,
            labelStyle as TextStyle,
            { fontFamily: theme.typography.fontFamily.medium }, // Ensure font is applied last
          ]} 
          testID={`${testID}-label`}
        >
          {label}
          {required && (
            <Text 
              variant="labelSmall" 
              weight="medium" 
              style={[
                labelStyles, 
                { color: theme.colors.error[500] },
                { fontFamily: theme.typography.fontFamily.medium } // Ensure font is applied last
              ]}
            >
              {' '}
              *
            </Text>
          )}
        </Text>
      )}

      <Animated.View
        style={[
          inputContainerStyles,
          {
            borderColor: animatedBorderColor,
            shadowOpacity: animatedShadowOpacity,
          },
        ]}
      >
        {leftIcon && (
          <View style={[styles.iconContainer, styles.leftIcon]}>
            {leftIcon}
          </View>
        )}

        <TextInput
          style={[inputStyles, inputStyle]}
          placeholderTextColor="#B4B4B4"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          value={value}
          maxLength={maxLength}
          {...accessibilityProps}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            style={[styles.iconContainer, styles.rightIcon]}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            accessibilityRole={onRightIconPress ? 'button' : undefined}
            accessibilityLabel={onRightIconPress ? 'Input action' : undefined}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>

      {renderMessage()}
    </View>
  );
};

/**
 * Get container styles based on theme and props
 */
const getContainerStyles = (theme: any, fullWidth: boolean): ViewStyle => ({
  width: fullWidth ? '100%' : undefined,
  marginBottom: theme.spacing.lg || 24, // Increased spacing between form fields
});

/**
 * Get input container styles based on theme, variant, size, validation state, and focus
 * Matches onboarding style: borderWidth: 2, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16
 */
const getInputContainerStyles = (
  theme: any,
  variant: string,
  size: string,
  validationState: string,
  isFocused: boolean
): ViewStyle => {
  const baseStyles: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  };

  // Size styles
  // - small: compact padding for forms (referrals, create group, etc.)
  // - medium/large: standard padding for onboarding
  const sizeStyles: Record<string, ViewStyle> = {
    small: {
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    medium: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    large: {
      minHeight: 52,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  };

  // Variant styles
  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: '#FFFFFF',
      borderColor: '#EAEAEA',
    },
    filled: {
      backgroundColor: theme.colors.surface.secondary,
      borderColor: '#EAEAEA',
    },
    outlined: {
      backgroundColor: 'transparent',
      borderColor: '#EAEAEA',
    },
  };

  // Validation state styles - matching onboarding error color
  const validationStyles: Record<string, ViewStyle> = {
    default: {},
    error: {
      borderColor: '#ff4444',
    },
    success: {
      borderColor: theme.colors.success[500],
    },
    warning: {
      borderColor: theme.colors.warning[500],
    },
  };

  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...validationStyles[validationState],
  };

  if (isFocused && validationState === 'default') {
    combinedStyles.borderColor = theme.colors.border.focus || '#EAEAEA';
  }

  return combinedStyles;
};

/**
 * Get input text styles based on theme and size
 * Matches onboarding style: fontSize: 16, color: '#2C2235'
 */
const getInputStyles = (theme: any, size: string): TextStyle => {
  const baseStyles: TextStyle = {
    flex: 1,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    includeFontPadding: false,
    fontSize: 16,
  };

  const sizeStyles: Record<string, TextStyle> = {
    small: {
      fontSize: 14,
    },
    medium: {
      fontSize: 16,
    },
    large: {
      fontSize: 18,
    },
  };

  return {
    ...baseStyles,
    ...sizeStyles[size],
  };
};

/**
 * Get label styles based on theme, size, and required state
 * Label styling is handled by Text component variant="labelSmall" color="secondary"
 * We explicitly set the font family to ensure labels use Figtree-Medium
 */
const getLabelStyles = (
  theme: any,
  size: string,
  _required: boolean
): TextStyle => {
  return {
    marginBottom: theme.spacing.md || 12, // Increased spacing between label and input (12px)
    // Explicitly set font family for medium weight (labelSmall uses medium)
    fontFamily: theme.typography.fontFamily.medium,
  };
};

/**
 * Get message styles based on theme and validation state
 */
const getMessageStyles = (theme: any, validationState: string): TextStyle => {
  const baseStyles: TextStyle = {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    fontFamily: theme.typography.fontFamily.regular,
  };

  const stateColors: Record<string, string> = {
    default: theme.colors.text.secondary,
    error: theme.colors.error[500],
    success: theme.colors.success[500],
    warning: theme.colors.warning[500],
  };

  return {
    ...baseStyles,
    color: stateColors[validationState],
  };
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  messageText: {
    flex: 1,
  },
  characterCount: {
    marginLeft: 8,
  },
});
