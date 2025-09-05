/**
 * Overlay Component
 * A flexible overlay component for modals, dropdowns, and other UI elements
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/provider/useTheme';

export interface OverlayProps {
  children?: React.ReactNode;
  isVisible: boolean;
  onPress?: () => void;
  opacity?: number;
  color?: string;
  animationDuration?: number;
  zIndex?: number;
  style?: ViewStyle;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  testID?: string;
}

export const Overlay: React.FC<OverlayProps> = ({
  children,
  isVisible,
  onPress,
  opacity = 0.5,
  color,
  animationDuration,
  zIndex = 1000,
  style,
  pointerEvents = 'auto',
  testID,
}) => {
  const { colors } = useTheme();
  const overlayColor = color || colors.surface.overlay;

  if (!isVisible) {
    return null;
  }

  const styles = createStyles(zIndex, overlayColor, opacity);

  return (
    <View
      style={[
        styles.overlay,
        style,
      ]}
      pointerEvents={pointerEvents}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.touchable}
        activeOpacity={1}
        onPress={onPress}
        accessible={false}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (zIndex: number, overlayColor: string, opacity: number) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overlayColor,
    opacity,
    zIndex,
    ...Platform.select({
      android: {
        elevation: zIndex,
      },
    }),
  },
  touchable: {
    flex: 1,
  },
});