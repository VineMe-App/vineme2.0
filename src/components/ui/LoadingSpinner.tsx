import React, { useEffect, useRef, useContext } from 'react';
import { ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { Text } from './Text';
import { ThemeContext } from '../../theme/provider/ThemeContext';
import { fadeIn, pulse } from '../../utils/animations';

type SpinnerSize = 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  message?: string;
  overlay?: boolean;
  testID?: string;
  animated?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  color,
  message,
  overlay = false,
  testID,
  animated = true,
}: LoadingSpinnerProps) {
  // Safely access theme context - won't throw if provider isn't ready
  const themeContext = useContext(ThemeContext);
  const spinnerColor =
    color || themeContext?.theme?.colors?.primary?.[500] || '#ff0083';

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

  const indicatorNativeSize = size === 'small' ? 'small' : 'large';
  const indicatorStyle =
    size === 'small'
      ? styles.indicatorSmall
      : size === 'medium'
        ? styles.indicatorMedium
        : styles.indicatorLarge;

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
        size={indicatorNativeSize}
        color={spinnerColor}
        style={indicatorStyle}
      />
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
  indicatorSmall: {
    width: 20,
    height: 20,
  },
  indicatorMedium: {
    width: 32,
    height: 32,
  },
  indicatorLarge: {
    width: 44,
    height: 44,
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
