/**
 * Shadow Token System
 * Provides consistent shadow definitions for elevation and depth
 */

import { ViewStyle } from 'react-native';

export interface ShadowToken {
  shadowColor: string;
  shadowOffset: {
    width: number;
    height: number;
  };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number; // Android elevation
}

export interface ThemeShadows {
  none: ShadowToken;
  xs: ShadowToken;
  sm: ShadowToken;
  md: ShadowToken;
  lg: ShadowToken;
  xl: ShadowToken;
  '2xl': ShadowToken;
  '3xl': ShadowToken;
}

// Base shadow color (typically black with varying opacity)
const baseShadowColor = '#000000';

// Shadow definitions with both iOS and Android support
export const shadows: ThemeShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
  },
  '2xl': {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 16,
  },
  '3xl': {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 35 },
    shadowOpacity: 0.35,
    shadowRadius: 60,
    elevation: 24,
  },
};

// Semantic shadow definitions for common use cases
export const semanticShadows = {
  // Card shadows
  card: {
    resting: shadows.sm,
    hover: shadows.md,
    pressed: shadows.xs,
  },

  // Button shadows
  button: {
    resting: shadows.xs,
    hover: shadows.sm,
    pressed: shadows.none,
  },

  // Modal and overlay shadows
  modal: shadows.xl,
  overlay: shadows['2xl'],
  dropdown: shadows.lg,

  // Navigation shadows
  header: shadows.sm,
  tabBar: shadows.md,

  // Floating action button
  fab: {
    resting: shadows.lg,
    hover: shadows.xl,
    pressed: shadows.md,
  },

  // Toast and notification shadows
  toast: shadows.lg,
  notification: shadows.md,
};

// Utility functions for working with shadows
export const shadowUtils = {
  /**
   * Get shadow style for React Native components
   */
  getShadowStyle: (shadowKey: keyof ThemeShadows): ViewStyle => {
    const shadow = shadows[shadowKey];
    return {
      shadowColor: shadow.shadowColor,
      shadowOffset: shadow.shadowOffset,
      shadowOpacity: shadow.shadowOpacity,
      shadowRadius: shadow.shadowRadius,
      elevation: shadow.elevation,
    };
  },

  /**
   * Create custom shadow with specific color
   */
  createShadow: (
    color: string,
    offset: { width: number; height: number },
    opacity: number,
    radius: number,
    elevation: number
  ): ShadowToken => ({
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  }),

  /**
   * Modify existing shadow with different color
   */
  withColor: (shadowKey: keyof ThemeShadows, color: string): ShadowToken => {
    const baseShadow = shadows[shadowKey];
    return {
      ...baseShadow,
      shadowColor: color,
    };
  },

  /**
   * Modify existing shadow with different opacity
   */
  withOpacity: (shadowKey: keyof ThemeShadows, opacity: number): ShadowToken => {
    const baseShadow = shadows[shadowKey];
    return {
      ...baseShadow,
      shadowOpacity: opacity,
    };
  },

  /**
   * Get shadow for specific component state
   */
  getComponentShadow: (
    component: keyof typeof semanticShadows,
    state: string = 'resting'
  ): ViewStyle => {
    const componentShadows = semanticShadows[component];
    if (typeof componentShadows === 'object' && 'resting' in componentShadows) {
      const shadowToken = (componentShadows as any)[state] || componentShadows.resting;
      return shadowUtils.getShadowStyle(
        Object.keys(shadows).find(key => shadows[key as keyof ThemeShadows] === shadowToken) as keyof ThemeShadows || 'sm'
      );
    }
    return shadowUtils.getShadowStyle('sm');
  },
};