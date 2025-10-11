/**
 * ProgressBar Component
 * A customizable progress indicator with theme integration
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  Text,
  AccessibilityInfo,
} from 'react-native';
import { useTheme } from '../../../theme/provider/useTheme';

export interface ProgressBarProps {
  /**
   * Progress value between 0 and 100
   */
  progress: number;

  /**
   * Width of the progress bar
   */
  width?: number | string;

  /**
   * Height of the progress bar
   */
  height?: number;

  /**
   * Color of the progress fill
   */
  color?: string;

  /**
   * Background color of the progress bar
   */
  backgroundColor?: string;

  /**
   * Border radius of the progress bar
   */
  borderRadius?: number;

  /**
   * Whether to animate progress changes
   */
  animated?: boolean;

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Whether to show progress text
   */
  showText?: boolean;

  /**
   * Custom text to display instead of percentage
   */
  text?: string;

  /**
   * Text color
   */
  textColor?: string;

  /**
   * Text style
   */
  textStyle?: ViewStyle;

  /**
   * Variant of the progress bar
   */
  variant?: 'default' | 'thin' | 'thick' | 'rounded';

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;

  /**
   * Additional styles for the progress fill
   */
  fillStyle?: ViewStyle;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;

  /**
   * Callback when progress animation completes
   */
  onComplete?: () => void;
}

const VARIANT_HEIGHTS = {
  default: 8,
  thin: 4,
  thick: 12,
  rounded: 16,
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  width = '100%',
  height,
  color,
  backgroundColor,
  borderRadius,
  animated = true,
  duration,
  showText = false,
  text,
  textColor,
  textStyle,
  variant = 'default',
  style,
  fillStyle,
  testID,
  accessibilityLabel,
  onComplete,
}) => {
  const { theme } = useTheme();
  const progressValue = useRef(new Animated.Value(0)).current;
  const previousProgress = useRef(0);

  const animationDuration = duration || theme.animations.timing.progress;
  const progressColor = color || theme.colors.primary[500];
  const progressBackgroundColor =
    backgroundColor ||
    (theme.isDark ? theme.colors.neutral[700] : theme.colors.neutral[200]);
  const progressHeight = height || VARIANT_HEIGHTS[variant];
  const progressBorderRadius =
    borderRadius !== undefined
      ? borderRadius
      : variant === 'rounded'
        ? progressHeight / 2
        : theme.borderRadius.sm;
  const progressTextColor = textColor || theme.colors.text.primary;

  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  useEffect(() => {
    const targetValue = clampedProgress / 100;

    if (animated) {
      const animation = Animated.timing(progressValue, {
        toValue: targetValue,
        duration: animationDuration,
        useNativeDriver: false,
      });

      animation.start(({ finished }) => {
        if (finished && clampedProgress === 100 && onComplete) {
          onComplete();
        }
      });

      return () => {
        animation.stop();
      };
    } else {
      progressValue.setValue(targetValue);
      if (clampedProgress === 100 && onComplete) {
        onComplete();
      }
    }
  }, [clampedProgress, animated, animationDuration, progressValue, onComplete]);

  // Announce progress changes to screen readers
  useEffect(() => {
    const progressDiff = Math.abs(clampedProgress - previousProgress.current);
    if (progressDiff >= 10) {
      // Only announce significant changes
      const announcement = text || `${Math.round(clampedProgress)}% complete`;
      AccessibilityInfo.announceForAccessibility(announcement);
      previousProgress.current = clampedProgress;
    }
  }, [clampedProgress, text]);

  const getProgressText = () => {
    if (text) return text;
    return `${Math.round(clampedProgress)}%`;
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View
        style={[
          styles.track,
          {
            width,
            height: progressHeight,
            backgroundColor: progressBackgroundColor,
            borderRadius: progressBorderRadius,
          },
        ]}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel={
          accessibilityLabel || `Progress: ${getProgressText()}`
        }
        accessibilityValue={{
          min: 0,
          max: 100,
          now: clampedProgress,
        }}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height: progressHeight,
              backgroundColor: progressColor,
              borderRadius: progressBorderRadius,
              width: progressValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
            fillStyle,
          ]}
        />
      </View>

      {showText && (
        <Text
          style={[
            styles.text,
            {
              color: progressTextColor,
              fontSize: theme.typography.fontSize.sm,
              fontFamily: theme.typography.fontFamily.medium,
            },
            textStyle,
          ]}
        >
          {getProgressText()}
        </Text>
      )}
    </View>
  );
};

/**
 * Circular Progress Component
 * A circular progress indicator
 */
export interface CircularProgressProps {
  /**
   * Progress value between 0 and 100
   */
  progress: number;

  /**
   * Size of the circular progress
   */
  size?: number;

  /**
   * Stroke width of the progress circle
   */
  strokeWidth?: number;

  /**
   * Color of the progress stroke
   */
  color?: string;

  /**
   * Background color of the progress circle
   */
  backgroundColor?: string;

  /**
   * Whether to animate progress changes
   */
  animated?: boolean;

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Whether to show progress text in the center
   */
  showText?: boolean;

  /**
   * Custom text to display instead of percentage
   */
  text?: string;

  /**
   * Text color
   */
  textColor?: string;

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

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 6,
  color,
  backgroundColor,
  animated = true,
  duration,
  showText = true,
  text,
  textColor,
  style,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const progressValue = useRef(new Animated.Value(0)).current;

  const animationDuration = duration || theme.animations.timing.progress;
  const progressColor = color || theme.colors.primary[500];
  const progressBackgroundColor =
    backgroundColor ||
    (theme.isDark ? theme.colors.neutral[700] : theme.colors.neutral[200]);
  const progressTextColor = textColor || theme.colors.text.primary;

  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const targetValue = clampedProgress / 100;

    if (animated) {
      Animated.timing(progressValue, {
        toValue: targetValue,
        duration: animationDuration,
        useNativeDriver: false,
      }).start();
    } else {
      progressValue.setValue(targetValue);
    }
  }, [clampedProgress, animated, animationDuration, progressValue]);

  const getProgressText = () => {
    if (text) return text;
    return `${Math.round(clampedProgress)}%`;
  };

  return (
    <View
      style={[
        styles.circularContainer,
        {
          width: size,
          height: size,
        },
        style,
      ]}
      testID={testID}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={
        accessibilityLabel || `Circular progress: ${getProgressText()}`
      }
      accessibilityValue={{
        min: 0,
        max: 100,
        now: clampedProgress,
      }}
    >
      {/* Background circle */}
      <View
        style={[
          styles.circularTrack,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: progressBackgroundColor,
          },
        ]}
      />

      {/* Progress circle */}
      <Animated.View
        style={[
          styles.circularFill,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: progressColor,
            transform: [
              { rotate: '-90deg' },
              {
                rotate: progressValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      />

      {showText && (
        <View style={styles.circularTextContainer}>
          <Text
            style={[
              styles.circularText,
              {
                color: progressTextColor,
                fontSize: theme.typography.fontSize.sm,
                fontFamily: theme.typography.fontFamily.medium,
              },
            ]}
          >
            {getProgressText()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  track: {
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  text: {
    marginTop: 8,
    textAlign: 'center',
  },
  circularContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularTrack: {
    position: 'absolute',
  },
  circularFill: {
    position: 'absolute',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  circularTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularText: {
    textAlign: 'center',
  },
});
