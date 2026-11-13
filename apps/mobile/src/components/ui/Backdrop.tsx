/**
 * Backdrop Component
 * A backdrop component specifically designed for modals and overlays with proper z-index management
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/provider/useTheme';

export interface BackdropProps {
  children?: React.ReactNode;
  isVisible: boolean;
  onPress?: () => void;
  opacity?: number;
  color?: string;
  blur?: boolean;
  animationDuration?: number;
  animationType?: 'fade' | 'none';
  zIndex?: number;
  style?: ViewStyle;
  disabled?: boolean;
  testID?: string;
}

export const Backdrop: React.FC<BackdropProps> = ({
  children,
  isVisible,
  onPress,
  opacity = 0.6,
  color,
  blur = false,
  animationDuration,
  animationType = 'fade',
  zIndex = 999,
  style,
  disabled = false,
  testID,
}) => {
  const { colors, animations } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.1)).current;

  const duration = animationDuration || animations.duration.normal;
  const backdropColor = color || colors.surface.overlay;
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (isVisible && animationType !== 'none') {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: opacity,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isVisible && animationType !== 'none') {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (animationType === 'none') {
      opacityAnim.setValue(isVisible ? opacity : 0);
      scaleAnim.setValue(1);
    }
  }, [isVisible, opacity, duration, animationType]);

  if (!isVisible && animationType !== 'none') {
    return null;
  }

  const styles = createStyles(zIndex, backdropColor, width, height, blur);

  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        styles.backdrop,
        {
          opacity:
            animationType === 'none' ? (isVisible ? opacity : 0) : opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
      testID={testID}
    >
      <TouchableWithoutFeedback onPress={handlePress} disabled={disabled}>
        <View style={styles.touchArea}>
          {children && (
            <View style={styles.content} pointerEvents="box-none">
              {children}
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

const createStyles = (
  zIndex: number,
  backdropColor: string,
  width: number,
  height: number,
  blur: boolean
) =>
  StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      width,
      height,
      backgroundColor: backdropColor,
      zIndex,
      ...Platform.select({
        android: {
          elevation: zIndex,
        },
      }),
      ...(blur &&
        Platform.OS === 'ios' && {
          backdropFilter: 'blur(10px)',
        }),
    },
    touchArea: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
