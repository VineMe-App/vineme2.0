import React, { useEffect, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Theme } from '../../utils/theme';
import { fadeIn, pulse } from '../../utils/animations';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  overlay?: boolean;
  testID?: string;
  animated?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  color = Theme.colors.primary,
  message,
  overlay = false,
  testID,
  animated = true,
}: LoadingSpinnerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      // Fade in animation
      fadeIn(fadeAnim, 300).start();

      // Pulse animation for the container
      pulse(pulseAnim, 0.98, 1.02, 2000).start();
    } else {
      fadeAnim.setValue(1);
      pulseAnim.setValue(1);
    }
  }, [fadeAnim, pulseAnim, animated]);

  const containerStyle = overlay
    ? [styles.container, styles.overlay]
    : styles.container;

  return (
    <Animated.View
      style={[
        containerStyle,
        animated && {
          opacity: fadeAnim,
          transform: [{ scale: pulseAnim }],
        },
      ]}
      testID={testID}
    >
      <ActivityIndicator
        size={size}
        color={color}
        style={size === 'large' ? styles.indicatorLarge : styles.indicatorSmall}
      />
      {message && (
        <Animated.Text
          style={[styles.message, animated && { opacity: fadeAnim }]}
        >
          {message}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  indicatorSmall: {
    width: 20,
    height: 20,
  },
  indicatorLarge: {
    width: 36,
    height: 36,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.colors.overlayLight,
    zIndex: Theme.layout.zIndex.overlay,
  },
  message: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.base,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
});
