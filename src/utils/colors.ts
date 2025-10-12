/**
 * Color Utilities and Accessibility Features
 * Provides comprehensive color manipulation and WCAG compliance functions
 */

export interface ColorHSL {
  h: number; // Hue (0-360)
  s: number; // Saturation (0-100)
  l: number; // Lightness (0-100)
}

export interface ColorRGB {
  r: number; // Red (0-255)
  g: number; // Green (0-255)
  b: number; // Blue (0-255)
}

/**
 * Convert hex color to RGB
 */
export const hexToRgb = (hex: string): ColorRGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Convert RGB to hex color
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Convert RGB to HSL
 */
export const rgbToHsl = (r: number, g: number, b: number): ColorHSL => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

/**
 * Convert HSL to RGB
 */
export const hslToRgb = (h: number, s: number, l: number): ColorRGB => {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

/**
 * Add opacity to a hex color
 */
export const withOpacity = (color: string, opacity: number): string => {
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  const alpha = Math.round(clampedOpacity * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${alpha}`;
};

/**
 * Lighten a color by a percentage
 */
export const lighten = (color: string, percentage: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newLightness = Math.min(100, hsl.l + percentage);
  const newRgb = hslToRgb(hsl.h, hsl.s, newLightness);

  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

/**
 * Darken a color by a percentage
 */
export const darken = (color: string, percentage: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newLightness = Math.max(0, hsl.l - percentage);
  const newRgb = hslToRgb(hsl.h, hsl.s, newLightness);

  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

/**
 * Adjust saturation of a color
 */
export const saturate = (color: string, percentage: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newSaturation = Math.max(0, Math.min(100, hsl.s + percentage));
  const newRgb = hslToRgb(hsl.h, newSaturation, hsl.l);

  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

/**
 * Desaturate a color by a percentage
 */
export const desaturate = (color: string, percentage: number): string => {
  return saturate(color, -percentage);
};

/**
 * Get the relative luminance of a color (for contrast calculations)
 */
export const getLuminance = (color: string): number => {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const sRGB = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
};

/**
 * Calculate contrast ratio between two colors
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * WCAG Accessibility Standards
 */
export const WCAG_STANDARDS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const;

/**
 * Check if color combination meets WCAG AA standards for normal text
 */
export const meetsWCAGAA = (
  foreground: string,
  background: string
): boolean => {
  return getContrastRatio(foreground, background) >= WCAG_STANDARDS.AA_NORMAL;
};

/**
 * Check if color combination meets WCAG AA standards for large text
 */
export const meetsWCAGAALarge = (
  foreground: string,
  background: string
): boolean => {
  return getContrastRatio(foreground, background) >= WCAG_STANDARDS.AA_LARGE;
};

/**
 * Check if color combination meets WCAG AAA standards for normal text
 */
export const meetsWCAGAAA = (
  foreground: string,
  background: string
): boolean => {
  return getContrastRatio(foreground, background) >= WCAG_STANDARDS.AAA_NORMAL;
};

/**
 * Check if color combination meets WCAG AAA standards for large text
 */
export const meetsWCAGAAALarge = (
  foreground: string,
  background: string
): boolean => {
  return getContrastRatio(foreground, background) >= WCAG_STANDARDS.AAA_LARGE;
};

/**
 * Get accessibility level for a color combination
 */
export const getAccessibilityLevel = (
  foreground: string,
  background: string
): 'AAA' | 'AA' | 'AA Large' | 'Fail' => {
  const ratio = getContrastRatio(foreground, background);

  if (ratio >= WCAG_STANDARDS.AAA_NORMAL) return 'AAA';
  if (ratio >= WCAG_STANDARDS.AA_NORMAL) return 'AA';
  if (ratio >= WCAG_STANDARDS.AA_LARGE) return 'AA Large';
  return 'Fail';
};

/**
 * Find the best accessible color from a palette
 */
export const findAccessibleColor = (
  background: string,
  colorPalette: string[],
  standard: 'AA' | 'AAA' = 'AA'
): string | null => {
  const requiredRatio =
    standard === 'AAA' ? WCAG_STANDARDS.AAA_NORMAL : WCAG_STANDARDS.AA_NORMAL;

  for (const color of colorPalette) {
    if (getContrastRatio(color, background) >= requiredRatio) {
      return color;
    }
  }

  return null;
};

/**
 * Generate accessible text color for a given background
 */
export const getAccessibleTextColor = (
  background: string,
  lightColor: string = '#ffffff',
  darkColor: string = '#000000'
): string => {
  const lightRatio = getContrastRatio(lightColor, background);
  const darkRatio = getContrastRatio(darkColor, background);

  return lightRatio > darkRatio ? lightColor : darkColor;
};
/*
 *
 * Automatic Color Derivation for Theme Variants
 */

export interface ColorVariants {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; // Base color
  600: string;
  700: string;
  800: string;
  900: string;
}

/**
 * Generate a complete color palette from a base color
 */
export const generateColorVariants = (baseColor: string): ColorVariants => {
  const rgb = hexToRgb(baseColor);
  if (!rgb) {
    throw new Error(`Invalid color format: ${baseColor}`);
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Generate lighter variants (50-400)
  const variants: ColorVariants = {
    50: lighten(baseColor, 45),
    100: lighten(baseColor, 35),
    200: lighten(baseColor, 25),
    300: lighten(baseColor, 15),
    400: lighten(baseColor, 8),
    500: baseColor, // Base color
    600: darken(baseColor, 8),
    700: darken(baseColor, 15),
    800: darken(baseColor, 25),
    900: darken(baseColor, 35),
  };

  return variants;
};

/**
 * Generate semantic color variants for different states
 */
export const generateSemanticVariants = (baseColor: string) => {
  return {
    default: baseColor,
    hover: darken(baseColor, 8),
    active: darken(baseColor, 12),
    disabled: desaturate(lighten(baseColor, 20), 40),
    focus: saturate(baseColor, 10),
    muted: desaturate(lighten(baseColor, 30), 30),
  };
};

/**
 * Generate theme-appropriate colors based on theme mode
 */
export const generateThemeColors = (
  baseColors: Record<string, string>,
  isDark: boolean = false
) => {
  const adjustment = isDark ? 15 : -15;

  return Object.entries(baseColors).reduce(
    (acc, [key, color]) => {
      acc[key] = {
        ...generateColorVariants(color),
        semantic: generateSemanticVariants(color),
      };
      return acc;
    },
    {} as Record<
      string,
      ColorVariants & { semantic: ReturnType<typeof generateSemanticVariants> }
    >
  );
};

/**
 * Ensure color meets minimum contrast requirements
 */
export const ensureAccessibleColor = (
  color: string,
  background: string,
  minRatio: number = WCAG_STANDARDS.AA_NORMAL
): string => {
  let adjustedColor = color;
  let ratio = getContrastRatio(adjustedColor, background);
  let attempts = 0;
  const maxAttempts = 20;

  // If contrast is too low, try to adjust the color
  while (ratio < minRatio && attempts < maxAttempts) {
    const luminance = getLuminance(adjustedColor);
    const backgroundLuminance = getLuminance(background);

    // Determine if we should lighten or darken
    if (backgroundLuminance > 0.5) {
      // Light background, darken the color
      adjustedColor = darken(adjustedColor, 5);
    } else {
      // Dark background, lighten the color
      adjustedColor = lighten(adjustedColor, 5);
    }

    ratio = getContrastRatio(adjustedColor, background);
    attempts++;
  }

  return adjustedColor;
};

/**
 * Generate accessible color palette ensuring all combinations meet WCAG standards
 */
export const generateAccessiblePalette = (
  baseColors: Record<string, string>,
  backgrounds: string[]
): Record<string, ColorVariants> => {
  const palette: Record<string, ColorVariants> = {};

  Object.entries(baseColors).forEach(([name, baseColor]) => {
    const variants = generateColorVariants(baseColor);

    // Ensure each variant meets accessibility requirements against common backgrounds
    Object.entries(variants).forEach(([shade, color]) => {
      backgrounds.forEach((background) => {
        const accessibleColor = ensureAccessibleColor(color, background);
        variants[shade as keyof ColorVariants] = accessibleColor;
      });
    });

    palette[name] = variants;
  });

  return palette;
};

/**
 * Color mixing utilities
 */
export const mixColors = (
  color1: string,
  color2: string,
  ratio: number = 0.5
): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  const mixed = {
    r: Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio),
    g: Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio),
    b: Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio),
  };

  return rgbToHex(mixed.r, mixed.g, mixed.b);
};

/**
 * Get complementary color
 */
export const getComplementaryColor = (color: string): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const complementaryHue = (hsl.h + 180) % 360;
  const complementaryRgb = hslToRgb(complementaryHue, hsl.s, hsl.l);

  return rgbToHex(complementaryRgb.r, complementaryRgb.g, complementaryRgb.b);
};

/**
 * Get analogous colors (colors adjacent on the color wheel)
 */
export const getAnalogousColors = (
  color: string,
  angle: number = 30
): [string, string] => {
  const rgb = hexToRgb(color);
  if (!rgb) return [color, color];

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const analogous1Hue = (hsl.h + angle) % 360;
  const analogous2Hue = (hsl.h - angle + 360) % 360;

  const analogous1Rgb = hslToRgb(analogous1Hue, hsl.s, hsl.l);
  const analogous2Rgb = hslToRgb(analogous2Hue, hsl.s, hsl.l);

  return [
    rgbToHex(analogous1Rgb.r, analogous1Rgb.g, analogous1Rgb.b),
    rgbToHex(analogous2Rgb.r, analogous2Rgb.g, analogous2Rgb.b),
  ];
};

/**
 * Validate if a color string is valid hex format
 */
export const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Color utility object for easy access to all functions
 */
export const colorUtils = {
  // Conversion functions
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,

  // Manipulation functions
  withOpacity,
  lighten,
  darken,
  saturate,
  desaturate,
  mixColors,

  // Accessibility functions
  getLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAALarge,
  meetsWCAGAAA,
  meetsWCAGAAALarge,
  getAccessibilityLevel,
  findAccessibleColor,
  getAccessibleTextColor,
  ensureAccessibleColor,

  // Color generation functions
  generateColorVariants,
  generateSemanticVariants,
  generateThemeColors,
  generateAccessiblePalette,

  // Color harmony functions
  getComplementaryColor,
  getAnalogousColors,

  // Validation
  isValidHexColor,

  // Constants
  WCAG_STANDARDS,
};
