/**
 * Spacing Token System
 * Provides consistent spacing values for margins, padding, and layout
 */

export interface ThemeSpacing {
  0: number;
  px: number;
  0.5: number;
  1: number;
  1.5: number;
  2: number;
  2.5: number;
  3: number;
  3.5: number;
  4: number;
  5: number;
  6: number;
  7: number;
  8: number;
  9: number;
  10: number;
  11: number;
  12: number;
  14: number;
  16: number;
  20: number;
  24: number;
  28: number;
  32: number;
  36: number;
  40: number;
  44: number;
  48: number;
  52: number;
  56: number;
  60: number;
  64: number;
  72: number;
  80: number;
  96: number;
}

// Base spacing scale (in pixels)
export const spacing: ThemeSpacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
};

// Semantic spacing values for common use cases
export const semanticSpacing = {
  // Component internal spacing
  componentPadding: {
    xs: spacing[1],      // 4px
    sm: spacing[2],      // 8px
    md: spacing[3],      // 12px
    lg: spacing[4],      // 16px
    xl: spacing[6],      // 24px
  },

  // Margins between components
  componentMargin: {
    xs: spacing[2],      // 8px
    sm: spacing[3],      // 12px
    md: spacing[4],      // 16px
    lg: spacing[6],      // 24px
    xl: spacing[8],      // 32px
  },

  // Section spacing
  sectionSpacing: {
    xs: spacing[4],      // 16px
    sm: spacing[6],      // 24px
    md: spacing[8],      // 32px
    lg: spacing[12],     // 48px
    xl: spacing[16],     // 64px
  },

  // Layout spacing
  layoutSpacing: {
    xs: spacing[2],      // 8px
    sm: spacing[4],      // 16px
    md: spacing[6],      // 24px
    lg: spacing[8],      // 32px
    xl: spacing[12],     // 48px
  },

  // Touch target sizes (minimum 44px for accessibility)
  touchTarget: {
    sm: 32,
    md: 44,              // Minimum recommended
    lg: 56,
    xl: 64,
  },

  // Icon sizes
  iconSize: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  },

  // Avatar sizes
  avatarSize: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
    '3xl': 96,
  },
};

// Layout dimensions
export const layoutDimensions = {
  // Screen breakpoints (for responsive design)
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Container max widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Common layout values
  headerHeight: 64,
  tabBarHeight: 80,
  bottomSheetHandle: 4,
  dividerHeight: 1,
  borderWidth: {
    thin: 1,
    medium: 2,
    thick: 4,
  },
};

// Utility functions for spacing
export const spacingUtils = {
  /**
   * Get spacing value by key
   */
  get: (key: keyof ThemeSpacing): number => spacing[key],

  /**
   * Get multiple spacing values
   */
  getMultiple: (...keys: (keyof ThemeSpacing)[]): number[] => 
    keys.map(key => spacing[key]),

  /**
   * Create symmetric padding/margin
   */
  symmetric: (horizontal: keyof ThemeSpacing, vertical: keyof ThemeSpacing) => ({
    paddingHorizontal: spacing[horizontal],
    paddingVertical: spacing[vertical],
  }),

  /**
   * Create asymmetric padding/margin
   */
  asymmetric: (
    top: keyof ThemeSpacing,
    right: keyof ThemeSpacing,
    bottom: keyof ThemeSpacing,
    left: keyof ThemeSpacing
  ) => ({
    paddingTop: spacing[top],
    paddingRight: spacing[right],
    paddingBottom: spacing[bottom],
    paddingLeft: spacing[left],
  }),
};