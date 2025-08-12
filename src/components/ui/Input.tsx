import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '../../utils/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'default',
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputContainerStyle = [
    styles.inputContainer,
    styles[variant],
    isFocused && styles.focused,
    error && styles.inputError,
  ];

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={inputContainerStyle}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Theme.colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label}
          accessibilityRequired={required}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            accessibilityRole={onRightIconPress ? 'button' : undefined}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.base,
  },
  label: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  required: {
    color: Theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Theme.borderRadius.base,
    backgroundColor: Theme.colors.surface,
    minHeight: Theme.layout.touchTarget,
  },
  default: {
    borderColor: Theme.colors.border,
  },
  filled: {
    borderColor: 'transparent',
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  outlined: {
    borderColor: Theme.colors.border,
    backgroundColor: 'transparent',
  },
  focused: {
    borderColor: Theme.colors.primary,
    ...Theme.shadows.sm,
  },
  inputError: {
    borderColor: Theme.colors.error,
  },
  input: {
    flex: 1,
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.textPrimary,
  },
  leftIcon: {
    paddingLeft: Theme.spacing.base,
    paddingRight: Theme.spacing.xs,
  },
  rightIcon: {
    paddingRight: Theme.spacing.base,
    paddingLeft: Theme.spacing.xs,
  },
  errorText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  },
  helperText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
  },
});
