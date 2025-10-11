/**
 * Skeleton Component
 * A loading placeholder component that mimics content structure
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../../theme/provider/useTheme';

export interface SkeletonProps {
  /**
   * Width of the skeleton
   */
  width?: number | string;

  /**
   * Height of the skeleton
   */
  height?: number | string;

  /**
   * Border radius of the skeleton
   */
  borderRadius?: number;

  /**
   * Whether to show the shimmer animation
   */
  animated?: boolean;

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Base color of the skeleton
   */
  baseColor?: string;

  /**
   * Highlight color for the shimmer effect
   */
  highlightColor?: string;

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

const { width: screenWidth } = Dimensions.get('window');

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  animated = true,
  duration,
  baseColor,
  highlightColor,
  style,
  testID,
  accessibilityLabel = 'Loading content',
}) => {
  const { theme } = useTheme();
  const shimmerValue = useRef(new Animated.Value(0)).current;

  const animationDuration = duration || theme.animations.timing.skeleton;
  const skeletonBaseColor =
    baseColor ||
    (theme.isDark ? theme.colors.neutral[700] : theme.colors.neutral[200]);
  const skeletonHighlightColor =
    highlightColor ||
    (theme.isDark ? theme.colors.neutral[600] : theme.colors.neutral[100]);
  const skeletonBorderRadius =
    borderRadius !== undefined ? borderRadius : theme.borderRadius.sm;

  useEffect(() => {
    if (!animated) {
      return;
    }

    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      })
    );

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
    };
  }, [animated, animationDuration, shimmerValue]);

  const getWidth = () => {
    if (typeof width === 'string') {
      if (width.includes('%')) {
        const percentage = parseInt(width.replace('%', ''), 10);
        return (screenWidth * percentage) / 100;
      }
      return screenWidth;
    }
    return width;
  };

  const skeletonWidth = getWidth();

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          backgroundColor: skeletonBaseColor,
          borderRadius: skeletonBorderRadius,
        },
        style,
      ]}
      testID={testID}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      {animated && (
        <Animated.View
          style={[
            styles.shimmer,
            {
              width: skeletonWidth,
              height: typeof height === 'number' ? height : 20,
              borderRadius: skeletonBorderRadius,
              transform: [
                {
                  translateX: shimmerValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-skeletonWidth, skeletonWidth],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.shimmerGradient,
              {
                backgroundColor: skeletonHighlightColor,
              },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
};

/**
 * Skeleton Text Component
 * Pre-configured skeleton for text content
 */
export interface SkeletonTextProps extends Omit<SkeletonProps, 'height'> {
  /**
   * Number of lines to display
   */
  lines?: number;

  /**
   * Height of each line
   */
  lineHeight?: number;

  /**
   * Spacing between lines
   */
  lineSpacing?: number;

  /**
   * Whether the last line should be shorter
   */
  lastLineWidth?: number | string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  lineHeight = 16,
  lineSpacing = 8,
  lastLineWidth = '75%',
  testID,
  ...props
}) => {
  if (lines === 1) {
    return <Skeleton height={lineHeight} testID={testID} {...props} />;
  }

  return (
    <View style={styles.textContainer} testID={testID}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : props.width}
          style={[
            props.style,
            index < lines - 1 && { marginBottom: lineSpacing },
          ]}
          testID={testID ? `${testID}-line-${index}` : undefined}
          {...props}
        />
      ))}
    </View>
  );
};

/**
 * Skeleton Avatar Component
 * Pre-configured skeleton for avatar/profile images
 */
export interface SkeletonAvatarProps
  extends Omit<SkeletonProps, 'width' | 'height' | 'borderRadius'> {
  /**
   * Size of the avatar
   */
  size?: number;

  /**
   * Shape of the avatar
   */
  shape?: 'circle' | 'square' | 'rounded';
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 40,
  shape = 'circle',
  ...props
}) => {
  const getBorderRadius = () => {
    switch (shape) {
      case 'circle':
        return size / 2;
      case 'square':
        return 0;
      case 'rounded':
        return 8;
      default:
        return size / 2;
    }
  };

  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={getBorderRadius()}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.5,
  },
  shimmerGradient: {
    flex: 1,
    opacity: 0.8,
  },
  textContainer: {
    width: '100%',
  },
});
