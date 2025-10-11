/**
 * Advanced Typography System
 * Provides proper line heights, letter spacing, and font definitions
 */

export interface ThemeTypography {
  fontFamily: {
    regular: string;
    medium: string;
    semiBold: string;
    bold: string;
  };
  fontSize: Record<string, number>;
  lineHeight: Record<string, number>;
  fontWeight: Record<string, string>;
  letterSpacing: Record<string, number>;
}

// Font family definitions
export const fontFamily = {
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semiBold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
};

// Font size scale (in pixels)
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

// Line height scale (multipliers of font size)
export const lineHeight = {
  xs: 16, // 1.33x for 12px
  sm: 20, // 1.43x for 14px
  base: 24, // 1.5x for 16px
  lg: 28, // 1.56x for 18px
  xl: 28, // 1.4x for 20px
  '2xl': 32, // 1.33x for 24px
  '3xl': 36, // 1.2x for 30px
  '4xl': 40, // 1.11x for 36px
  '5xl': 48, // 1x for 48px
  '6xl': 60, // 1x for 60px
  '7xl': 72, // 1x for 72px
  '8xl': 96, // 1x for 96px
  '9xl': 128, // 1x for 128px
};

// Font weight definitions
export const fontWeight = {
  thin: '100',
  extraLight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
};

// Letter spacing scale (in pixels)
export const letterSpacing = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.25,
  wider: 0.5,
  widest: 1,
};

// Typography variants for common use cases
export interface TypographyVariant {
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
  letterSpacing: number;
}

export const typographyVariants: Record<string, TypographyVariant> = {
  // Display styles
  display1: {
    fontSize: fontSize['9xl'],
    lineHeight: lineHeight['9xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  display2: {
    fontSize: fontSize['8xl'],
    lineHeight: lineHeight['8xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  display3: {
    fontSize: fontSize['7xl'],
    lineHeight: lineHeight['7xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },

  // Heading styles
  h1: {
    fontSize: fontSize['6xl'],
    lineHeight: lineHeight['6xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSize['5xl'],
    lineHeight: lineHeight['5xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.normal,
  },
  h4: {
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.normal,
  },
  h5: {
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.normal,
  },
  h6: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.normal,
  },

  // Body text styles
  bodyLarge: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Label styles
  labelLarge: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wide,
  },
  label: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wide,
  },
  labelSmall: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wider,
  },

  // Caption styles
  caption: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  captionBold: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.normal,
  },

  // Button styles
  buttonLarge: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.wide,
  },
  button: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.wide,
  },
  buttonSmall: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.semiBold,
    letterSpacing: letterSpacing.wider,
  },
};

// Default typography configuration
export const defaultTypography: ThemeTypography = {
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
};
