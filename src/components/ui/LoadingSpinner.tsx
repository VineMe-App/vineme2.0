import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, ViewStyle } from 'react-native';
import { Text } from './Text';
import { fadeIn } from '../../utils/animations';
import { AuthLoadingAnimation } from '../auth/AuthLoadingAnimation';

type SpinnerSize = 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  message?: string;
  overlay?: boolean;
  testID?: string;
  animated?: boolean;
}

const SIZE_SCALE_MAP = {
  small: 0.6,
  medium: 0.8,
  large: 1.0,
};

export function LoadingSpinner({
  size = 'large',
  color,
  message,
  overlay = false,
  testID,
  animated = true,
}: LoadingSpinnerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Fade in animation
      fadeIn(fadeAnim, 300).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [fadeAnim, animated]);

  const containerStyle = overlay
    ? [styles.container, styles.overlay]
    : styles.container;

  const scale = SIZE_SCALE_MAP[size];
  const animationStyle: ViewStyle = {
    transform: [{ scale }],
  };

  return (
    <Animated.View
      style={[
        containerStyle,
        animated && {
          opacity: fadeAnim,
        },
      ]}
      testID={testID}
    >
      <Animated.View style={animationStyle}>
        <AuthLoadingAnimation />
      </Animated.View>
      {message && (
        <Animated.View style={animated && { opacity: fadeAnim }}>
          <Text variant="body" color="secondary" style={styles.message}>
            {message}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18, // lg spacing
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  message: {
    marginTop: 12, // md spacing
    textAlign: 'center',
  },
});
