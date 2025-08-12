import { Animated, Easing } from 'react-native';

/**
 * Fade in animation
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = 300,
  toValue: number = 1
) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  });
};

/**
 * Fade out animation
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = 300,
  toValue: number = 0
) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.in(Easing.quad),
    useNativeDriver: true,
  });
};

/**
 * Scale animation
 */
export const scale = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = 200
) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.out(Easing.back(1.1)),
    useNativeDriver: true,
  });
};

/**
 * Slide in from bottom animation
 */
export const slideInFromBottom = (
  animatedValue: Animated.Value,
  duration: number = 300
) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
};

/**
 * Slide out to bottom animation
 */
export const slideOutToBottom = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = 300
) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  });
};

/**
 * Spring animation
 */
export const spring = (
  animatedValue: Animated.Value,
  toValue: number,
  tension: number = 100,
  friction: number = 8
) => {
  return Animated.spring(animatedValue, {
    toValue,
    tension,
    friction,
    useNativeDriver: true,
  });
};

/**
 * Stagger animation for lists
 */
export const staggerAnimation = (
  animations: Animated.CompositeAnimation[],
  staggerDelay: number = 100
) => {
  return Animated.stagger(staggerDelay, animations);
};

/**
 * Pulse animation
 */
export const pulse = (
  animatedValue: Animated.Value,
  minValue: number = 0.95,
  maxValue: number = 1.05,
  duration: number = 1000
) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: maxValue,
        duration: duration / 2,
        easing: Easing.inOut(Easing.sine),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: minValue,
        duration: duration / 2,
        easing: Easing.inOut(Easing.sine),
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Shake animation
 */
export const shake = (
  animatedValue: Animated.Value,
  intensity: number = 10,
  duration: number = 500
) => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: duration / 8,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: duration / 8,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: duration / 8,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: duration / 8,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: intensity / 2,
      duration: duration / 8,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity / 2,
      duration: duration / 8,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: intensity / 4,
      duration: duration / 8,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: duration / 8,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Create a reusable animated component
 */
export const createAnimatedComponent = (
  Component: any,
  initialValue: number = 0
) => {
  const AnimatedComponent = Animated.createAnimatedComponent(Component);
  return { AnimatedComponent, animatedValue: new Animated.Value(initialValue) };
};