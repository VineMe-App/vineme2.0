import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Theme } from '../../utils/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: keyof typeof Theme.spacing;
  style?: ViewStyle;
  onPress?: () => void;
  touchableProps?: Omit<TouchableOpacityProps, 'style' | 'onPress'>;
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'base',
  style,
  onPress,
  touchableProps,
  testID,
}) => {
  const cardStyle = [
    styles.card,
    styles[variant],
    { padding: Theme.spacing[padding] },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.base,
    backgroundColor: Theme.colors.surface,
  },
  default: {
    ...Theme.shadows.sm,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  elevated: {
    ...Theme.shadows.md,
  },
});