/**
 * Border Radius Token System
 * Provides consistent border radius values for components
 */

export interface ThemeBorderRadius {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  full: number;
}

// Border radius scale (in pixels)
export const borderRadius: ThemeBorderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999, // Creates fully rounded corners
};

// Semantic border radius definitions for common use cases
export const semanticBorderRadius = {
  // Button border radius
  button: {
    sm: borderRadius.sm,
    md: borderRadius.md,
    lg: borderRadius.lg,
    pill: borderRadius.full,
  },

  // Input border radius
  input: {
    sm: borderRadius.sm,
    md: borderRadius.md,
    lg: borderRadius.lg,
  },

  // Card border radius
  card: {
    sm: borderRadius.md,
    md: borderRadius.lg,
    lg: borderRadius.xl,
  },

  // Modal border radius
  modal: {
    sm: borderRadius.lg,
    md: borderRadius.xl,
    lg: borderRadius['2xl'],
  },

  // Image border radius
  image: {
    sm: borderRadius.sm,
    md: borderRadius.md,
    lg: borderRadius.lg,
    circle: borderRadius.full,
  },

  // Avatar border radius
  avatar: {
    square: borderRadius.md,
    rounded: borderRadius.lg,
    circle: borderRadius.full,
  },

  // Badge border radius
  badge: {
    square: borderRadius.sm,
    rounded: borderRadius.md,
    pill: borderRadius.full,
  },

  // Chip border radius
  chip: {
    square: borderRadius.sm,
    rounded: borderRadius.lg,
    pill: borderRadius.full,
  },

  // Tab border radius
  tab: {
    square: borderRadius.none,
    rounded: borderRadius.md,
    pill: borderRadius.full,
  },

  // Toast border radius
  toast: borderRadius.lg,

  // Tooltip border radius
  tooltip: borderRadius.md,

  // Progress bar border radius
  progressBar: borderRadius.full,

  // Switch border radius
  switch: borderRadius.full,

  // Slider border radius
  slider: {
    track: borderRadius.full,
    thumb: borderRadius.full,
  },
};

// Utility functions for working with border radius
export const borderRadiusUtils = {
  /**
   * Get border radius value by key
   */
  get: (key: keyof ThemeBorderRadius): number => borderRadius[key],

  /**
   * Create asymmetric border radius
   */
  asymmetric: (
    topLeft: keyof ThemeBorderRadius,
    topRight: keyof ThemeBorderRadius,
    bottomRight: keyof ThemeBorderRadius,
    bottomLeft: keyof ThemeBorderRadius
  ) => ({
    borderTopLeftRadius: borderRadius[topLeft],
    borderTopRightRadius: borderRadius[topRight],
    borderBottomRightRadius: borderRadius[bottomRight],
    borderBottomLeftRadius: borderRadius[bottomLeft],
  }),

  /**
   * Create top-only border radius
   */
  top: (radius: keyof ThemeBorderRadius) => ({
    borderTopLeftRadius: borderRadius[radius],
    borderTopRightRadius: borderRadius[radius],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  }),

  /**
   * Create bottom-only border radius
   */
  bottom: (radius: keyof ThemeBorderRadius) => ({
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: borderRadius[radius],
    borderBottomRightRadius: borderRadius[radius],
  }),

  /**
   * Create left-only border radius
   */
  left: (radius: keyof ThemeBorderRadius) => ({
    borderTopLeftRadius: borderRadius[radius],
    borderTopRightRadius: 0,
    borderBottomLeftRadius: borderRadius[radius],
    borderBottomRightRadius: 0,
  }),

  /**
   * Create right-only border radius
   */
  right: (radius: keyof ThemeBorderRadius) => ({
    borderTopLeftRadius: 0,
    borderTopRightRadius: borderRadius[radius],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: borderRadius[radius],
  }),

  /**
   * Get semantic border radius for components
   */
  getComponentRadius: (
    component: keyof typeof semanticBorderRadius,
    variant: string = 'md'
  ): number => {
    const componentRadius = semanticBorderRadius[component];
    if (typeof componentRadius === 'object') {
      return (componentRadius as any)[variant] || borderRadius.md;
    }
    return componentRadius as number;
  },
};
