/**
 * Animation Components
 * Reusable animation components with accessibility considerations
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

export interface FadeInProps {
  /**
   * Children to animate
   */
  children: React.ReactNode;

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Delay before animation starts
   */
  delay?: number;

  /**
   * Whether the component is visible
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
   * Callback when animation completes
   */
  onComplete?: () => void;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  duration,
  delay = 0,
  visible = true,
  style,
  testID,
  onComplete,
}) => {
  const { theme } = useTheme();
  const fadeValue = useRef(new Animated.Value(0)).current;

  const animationDuration = duration || theme.animations.timing.fade;

  useEffect(() => {
    const animation = Animated.timing(fadeValue, {
      toValue: visible ? 1 : 0,
      duration: animationDuration,
      delay,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });

    return () => {
      animation.stop();
    };
  }, [visible, animationDuration, delay, fadeValue, onComplete]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeValue,
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};

export interface SlideInProps {
  /**
   * Children to animate
   */
  children: React.ReactNode;

  /**
   * Direction of the slide animation
   */
  direction?: 'up' | 'down' | 'left' | 'right';

  /**
   * Distance to slide in pixels
   */
  distance?: number;

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Delay before animation starts
   */
  delay?: number;

  /**
   * Whether the component is visible
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
   * Callback when animation completes
   */
  onComplete?: () => void;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  direction = 'up',
  distance = 50,
  duration,
  delay = 0,
  visible = true,
  style,
  testID,
  onComplete,
}) => {
  const { theme } = useTheme();
  const slideValue = useRef(new Animated.Value(0)).current;

  const animationDuration = duration || theme.animations.timing.slide;

  useEffect(() => {
    const animation = Animated.timing(slideValue, {
      toValue: visible ? 1 : 0,
      duration: animationDuration,
      delay,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });

    return () => {
      animation.stop();
    };
  }, [visible, animationDuration, delay, slideValue, onComplete]);

  const getTransform = () => {
    const translateValue = slideValue.interpolate({
      inputRange: [0, 1],
      outputRange: [distance, 0],
    });

    switch (direction) {
      case 'up':
        return [{ translateY: translateValue }];
      case 'down':
        return [
          {
            translateY: slideValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-distance, 0],
            }),
          },
        ];
      case 'left':
        return [{ translateX: translateValue }];
      case 'right':
        return [
          {
            translateX: slideValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-distance, 0],
            }),
          },
        ];
      default:
        return [{ translateY: translateValue }];
    }
  };

  return (
    <Animated.View
      style={[
        {
          opacity: slideValue,
          transform: getTransform(),
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};

export interface ScaleInProps {
  /**
   * Children to animate
   */
  children: React.ReactNode;

  /**
   * Initial scale value
   */
  initialScale?: number;

  /**
   * Final scale value
   */
  finalScale?: number;

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Delay before animation starts
   */
  delay?: number;

  /**
   * Whether the component is visible
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
   * Callback when animation completes
   */
  onComplete?: () => void;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  initialScale = 0.8,
  finalScale = 1,
  duration,
  delay = 0,
  visible = true,
  style,
  testID,
  onComplete,
}) => {
  const { theme } = useTheme();
  const scaleValue = useRef(new Animated.Value(0)).current;

  const animationDuration = duration || theme.animations.duration.normal;

  useEffect(() => {
    const animation = Animated.spring(scaleValue, {
      toValue: visible ? 1 : 0,
      delay,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    });

    animation.start(({ finished }) => {
      if (finished && onComplete) {
        onComplete();
      }
    });

    return () => {
      animation.stop();
    };
  }, [visible, delay, scaleValue, onComplete]);

  return (
    <Animated.View
      style={[
        {
          opacity: scaleValue,
          transform: [
            {
              scale: scaleValue.interpolate({
                inputRange: [0, 1],
                outputRange: [initialScale, finalScale],
              }),
            },
          ],
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};

export interface PulseProps {
  /**
   * Children to animate
   */
  children: React.ReactNode;

  /**
   * Minimum scale value
   */
  minScale?: number;

  /**
   * Maximum scale value
   */
  maxScale?: number;

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Whether the animation is running
   */
  running?: boolean;

  /**
   * Additional styles
   */
  style?: ViewStyle;

  /**
   * Test ID for testing
   */
  testID?: string;
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  minScale = 0.95,
  maxScale = 1.05,
  duration,
  running = true,
  style,
  testID,
}) => {
  const { theme } = useTheme();
  const pulseValue = useRef(new Animated.Value(0)).current;

  const animationDuration = duration || theme.animations.duration.slow;

  useEffect(() => {
    if (!running) {
      pulseValue.setValue(0);
      return;
    }

    const pulseAnimation = Animated.loop(
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

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [running, animationDuration, pulseValue]);

  return (
    <Animated.View
      style={[
        {
          transform: [
            {
              scale: pulseValue.interpolate({
                inputRange: [0, 1],
                outputRange: [minScale, maxScale],
              }),
            },
          ],
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Staggered Animation Container
 * Animates children with a staggered delay
 */
export interface StaggeredAnimationProps {
  /**
   * Children to animate
   */
  children: React.ReactNode[];

  /**
   * Delay between each child animation
   */
  staggerDelay?: number;

  /**
   * Animation type
   */
  animationType?: 'fadeIn' | 'slideIn' | 'scaleIn';

  /**
   * Animation duration for each child
   */
  duration?: number;

  /**
   * Whether animations are running
   */
  running?: boolean;

  /**
   * Additional styles for container
   */
  style?: ViewStyle;

  /**
   * Test ID for testing
   */
  testID?: string;
}

export const StaggeredAnimation: React.FC<StaggeredAnimationProps> = ({
  children,
  staggerDelay = 100,
  animationType = 'fadeIn',
  duration,
  running = true,
  style,
  testID,
}) => {
  const renderAnimatedChild = (child: React.ReactNode, index: number) => {
    const delay = index * staggerDelay;

    switch (animationType) {
      case 'fadeIn':
        return (
          <FadeIn
            key={index}
            delay={delay}
            duration={duration}
            visible={running}
          >
            {child}
          </FadeIn>
        );
      case 'slideIn':
        return (
          <SlideIn
            key={index}
            delay={delay}
            duration={duration}
            visible={running}
          >
            {child}
          </SlideIn>
        );
      case 'scaleIn':
        return (
          <ScaleIn
            key={index}
            delay={delay}
            duration={duration}
            visible={running}
          >
            {child}
          </ScaleIn>
        );
      default:
        return child;
    }
  };

  return (
    <View style={style} testID={testID}>
      {children.map(renderAnimatedChild)}
    </View>
  );
};

const styles = StyleSheet.create({
  // No styles needed for these components
});
