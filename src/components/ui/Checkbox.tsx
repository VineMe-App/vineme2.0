import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Theme } from '../../utils/theme';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  labelStyle?: TextStyle;
  testID?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onPress,
  label,
  disabled = false,
  size = 'medium',
  style,
  labelStyle,
  testID,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.checkbox,
          styles[size],
          checked && styles.checked,
          disabled && styles.disabled,
        ]}
      >
        {checked && (
          <View style={[styles.checkmark, styles[`${size}Checkmark`]]} />
        )}
      </View>
      {label && (
        <Text
          style={[
            styles.label,
            styles[`${size}Label`],
            disabled && styles.disabledLabel,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Theme.spacing.xs,
  },
  checkbox: {
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.xs,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    width: 16,
    height: 16,
  },
  medium: {
    width: 20,
    height: 20,
  },
  large: {
    width: 24,
    height: 24,
  },
  checked: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  checkmark: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.full,
  },
  smallCheckmark: {
    width: 6,
    height: 6,
  },
  mediumCheckmark: {
    width: 8,
    height: 8,
  },
  largeCheckmark: {
    width: 10,
    height: 10,
  },
  label: {
    marginLeft: Theme.spacing.xs,
    color: Theme.colors.textPrimary,
  },
  smallLabel: {
    fontSize: Theme.typography.fontSize.sm,
  },
  mediumLabel: {
    fontSize: Theme.typography.fontSize.base,
  },
  largeLabel: {
    fontSize: Theme.typography.fontSize.lg,
  },
  disabledLabel: {
    color: Theme.colors.textTertiary,
  },
});
