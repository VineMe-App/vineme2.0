/**
 * Spinner Component
 * A customizable loading spinner with multiple variants and theme integration
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  AccessibilityInfo,
} from 'react-native';
import { useTheme } from '../../../theme/provider/useTheme';

export interface SpinnerProps {
  /**
   * Size of the spinner
   */
  size?: 'small' | 'medium' | 'large' | number;

  /**
   * Color of the spinner. If not provided, uses theme primary color
   */
  color?: string;

  /**
   * Variant of the spinner animation
   */
  variant?: 'circular' | 'dots' | 'pulse' | 'bars';

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Whether the spinner is visible
   */
  visible?: boolean;

  /**
   * Additional styles
   */
  style?: ViewStyle;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
}

const SIZE_MAP = {
  small: 16,
  medium: 24,
  large: 32,
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  color,
  variant = 'circular',
  duration,
  visible = true,
  style,
  testID,
  accessibilityLabel = 'Loading',
}) => {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0)).current;

  const spinnerSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const spinnerColor = color || theme.colors.primary[500];
  const animationDuration = duration || theme.animations.timing.spinner;

  useEffect(() => {
    if (!visible) {
      spinValue.setValue(0);
      pulseValue.setValue(0);
      return;
    }

    const createAnimation = () => {
      switch (variant) {
        case 'circular':
        case 'bars':
          return Animated.loop(
            Animated.timing(spinValue, {
              toValue: 1,
              duration: animationDuration,
              useNativeDriver: true,
            })
          );
        case 'pulse':
          return Animated.loop(
            Animated.sequence([
              Animated.timing(pulseValue, {
                toValue: 1,
                duration: animationDuration / 2,
                useNativeDriver: true,
              }),
              Animated.timing(pulseValue, {
                toValue: 0,
                duration: animationDuration / 2,
                useNativeDriver: true,
              }),
            ])
          );
        case 'dots':
          return Animated.loop(
            Animated.timing(spinValue, {
              toValue: 1,
              duration: animationDuration,
              useNativeDriver: true,
            })
          );
        default:
          return Animated.loop(
            Animated.timing(spinValue, {
              toValue: 1,
              duration: animationDuration,
              useNativeDriver: true,
            })
          );
      }
    };

    const animation = createAnimation();
    animation.start();

    return () => {
      animation.stop();
    };
  }, [visible, variant, animationDuration, spinValue, pulseValue]);

  // Announce loading state to screen readers
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(accessibilityLabel);
    }
  }, [visible, accessibilityLabel]);

  if (!visible) {
    return null;
  }

  const renderSpinner = () => {
    switch (variant) {
      case 'circular':
        return (
          <Animated.View
            style={[
              styles.circular,
              {
                width: spinnerSize,
                height: spinnerSize,
                borderColor: `${spinnerColor}20`,
                borderTopColor: spinnerColor,
                borderWidth: Math.max(2, spinnerSize / 8),
                transform: [
                  {
                    rotate: spinValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        );

      case 'dots':
        return (
          <View style={[styles.dotsContainer, { width: spinnerSize * 2 }]}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: spinnerSize / 4,
                    height: spinnerSize / 4,
                    backgroundColor: spinnerColor,
                    opacity: spinValue.interpolate({
                      inputRange: [0, 0.33, 0.66, 1],
                      outputRange:
                        index === 0
                          ? [1, 0.3, 0.3, 1]
                          : index === 1
                            ? [0.3, 1, 0.3, 0.3]
                            : [0.3, 0.3, 1, 0.3],
                    }),
                  },
                ]}
              />
            ))}
          </View>
        );

      case 'pulse':
        return (
          <Animated.View
            style={[
              styles.pulse,
              {
                width: spinnerSize,
                height: spinnerSize,
                backgroundColor: spinnerColor,
                transform: [
                  {
                    scale: pulseValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
                opacity: pulseValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.3],
                }),
              },
            ]}
          />
        );

      case 'bars':
        return (
          <View style={[styles.barsContainer, { width: spinnerSize }]}>
            {[0, 1, 2, 3].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.bar,
                  {
                    width: spinnerSize / 6,
                    height: spinnerSize,
                    backgroundColor: spinnerColor,
                    transform: [
                      {
                        scaleY: spinValue.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange:
                            index === 0
                              ? [1, 0.4, 0.4, 0.4, 1]
                              : index === 1
                                ? [0.4, 1, 0.4, 0.4, 0.4]
                                : index === 2
                                  ? [0.4, 0.4, 1, 0.4, 0.4]
                                  : [0.4, 0.4, 0.4, 1, 0.4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      {renderSpinner()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circular: {
    borderRadius: 999,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dot: {
    borderRadius: 999,
  },
  pulse: {
    borderRadius: 999,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    borderRadius: 2,
  },
});
