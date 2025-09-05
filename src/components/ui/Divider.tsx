import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Text from './Text';
import { Theme } from '../../utils/theme';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed';
  thickness?: number;
  color?: string;
  style?: ViewStyle;
  label?: string;
  labelStyle?: TextStyle;
  testID?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  thickness = 1,
  color = Theme.colors.border,
  style,
  label,
  labelStyle,
  testID,
}) => {
  const isHorizontal = orientation === 'horizontal';

  const dividerStyle = [
    styles.divider,
    isHorizontal ? styles.horizontal : styles.vertical,
    {
      [isHorizontal ? 'height' : 'width']: thickness,
      backgroundColor: variant === 'solid' ? color : 'transparent',
      borderStyle: variant === 'dashed' ? 'dashed' : 'solid',
      [isHorizontal ? 'borderTopWidth' : 'borderLeftWidth']:
        variant === 'dashed' ? thickness : 0,
      [isHorizontal ? 'borderTopColor' : 'borderLeftColor']: color,
    },
    style,
  ];

  if (label && isHorizontal) {
    return (
      <View style={styles.labelContainer} testID={testID}>
        <View style={[dividerStyle, styles.labelDivider]} />
        <Text weight="medium" style={[styles.label, labelStyle]}>{label}</Text>
        <View style={[dividerStyle, styles.labelDivider]} />
      </View>
    );
  }

  return <View style={dividerStyle} testID={testID} />;
};

const styles = StyleSheet.create({
  divider: {
    backgroundColor: Theme.colors.border,
  },
  horizontal: {
    width: '100%',
    height: 1,
  },
  vertical: {
    height: '100%',
    width: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  labelDivider: {
    flex: 1,
  },
  label: {
    paddingHorizontal: Theme.spacing.base,
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.textSecondary,
  },
});
