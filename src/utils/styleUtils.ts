/**
 * Style Utilities and Helper Functions
 * Provides utilities for dynamic styling, responsive design, and performance optimization
 */

import {
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Dimensions,
} from 'react-native';
import { Theme, ThemeColors, ThemeSpacing } from '../theme/themes/types';

// Get device dimensions (will be updated dynamically)
let screenWidth = Dimensions.get('window').width;
let screenHeight = Dimensions.get('window').height;

// Update dimensions when they change (for testing and orientation changes)
const updateDimensions = () => {
  const { width, height } = Dimensions.get('window');
  screenWidth = width;
  screenHeight = height;
};

// Breakpoint definitions for responsive design
export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Device size categories
export const deviceSizes = {
  small: screenWidth < breakpoints.sm,
  medium: screenWidth >= breakpoints.sm && screenWidth < breakpoints.lg,
  large: screenWidth >= breakpoints.lg,
} as const;

// Style types
export type StyleValue = ViewStyle | TextStyle | ImageStyle;
export type ResponsiveStyleValue<T = StyleValue> =
  | T
  | Partial<Record<Breakpoint, T>>;
export type ThemeStyleFunction<T = StyleValue> = (theme: Theme) => T;
export type ConditionalStyle<T = StyleValue> = {
  condition: boolean;
  style: T;
};

/**
 * Responsive Design Helpers
 */
export class ResponsiveUtils {
  /**
   * Get current breakpoint based on screen width
   */
  static getCurrentBreakpoint(): Breakpoint {
    updateDimensions();
    if (screenWidth >= breakpoints.xl) return 'xl';
    if (screenWidth >= breakpoints.lg) return 'lg';
    if (screenWidth >= breakpoints.md) return 'md';
    if (screenWidth >= breakpoints.sm) return 'sm';
    return 'xs';
  }

  /**
   * Check if current screen matches breakpoint
   */
  static matchesBreakpoint(breakpoint: Breakpoint): boolean {
    updateDimensions();
    return screenWidth >= breakpoints[breakpoint];
  }

  /**
   * Get responsive value based on current screen size
   */
  static getResponsiveValue<T>(value: ResponsiveStyleValue<T>): T {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      updateDimensions();
      const currentBreakpoint = this.getCurrentBreakpoint();
      const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];

      // Find the best matching breakpoint value
      for (const bp of breakpointOrder) {
        if (breakpoints[bp] <= screenWidth && value[bp] !== undefined) {
          return value[bp] as T;
        }
      }

      // Fallback to smallest available value
      for (const bp of ['xs', 'sm', 'md', 'lg', 'xl'] as Breakpoint[]) {
        if (value[bp] !== undefined) {
          return value[bp] as T;
        }
      }
    }

    return value as T;
  }

  /**
   * Create responsive styles object
   */
  static createResponsiveStyles<T extends Record<string, ResponsiveStyleValue>>(
    styles: T
  ): Record<keyof T, StyleValue> {
    const result = {} as Record<keyof T, StyleValue>;

    for (const [key, value] of Object.entries(styles)) {
      result[key as keyof T] = this.getResponsiveValue(value);
    }

    return result;
  }

  /**
   * Get scale factor based on screen size
   */
  static getScaleFactor(): number {
    updateDimensions();
    const baseWidth = 375; // iPhone 6/7/8 width as base
    return Math.min(screenWidth / baseWidth, 1.5); // Cap at 1.5x
  }

  /**
   * Scale value based on screen size
   */
  static scale(value: number): number {
    return Math.round(value * this.getScaleFactor());
  }
}

/**
 * Theme-Aware Style Generation
 */
export class ThemeStyleUtils {
  /**
   * Generate styles with theme context
   */
  static createThemedStyles<T extends Record<string, ThemeStyleFunction>>(
    styleDefinitions: T,
    theme: Theme
  ): Record<keyof T, StyleValue> {
    const styles = {} as Record<keyof T, StyleValue>;

    for (const [key, styleFunction] of Object.entries(styleDefinitions)) {
      styles[key as keyof T] = styleFunction(theme);
    }

    return styles;
  }

  /**
   * Merge theme-aware styles with overrides
   */
  static mergeThemedStyles(
    baseStyles: StyleValue,
    overrideStyles?: StyleValue,
    theme?: Theme
  ): StyleValue {
    if (!overrideStyles) return baseStyles;

    // Handle theme-dependent overrides
    if (typeof overrideStyles === 'function' && theme) {
      overrideStyles = (overrideStyles as ThemeStyleFunction)(theme);
    }

    return {
      ...baseStyles,
      ...overrideStyles,
    };
  }

  /**
   * Apply conditional styles based on theme or other conditions
   */
  static applyConditionalStyles(
    baseStyles: StyleValue,
    conditionalStyles: ConditionalStyle[]
  ): StyleValue {
    let result = { ...baseStyles };

    for (const { condition, style } of conditionalStyles) {
      if (condition) {
        result = { ...result, ...style };
      }
    }

    return result;
  }

  /**
   * Generate color-based styles with theme integration
   */
  static createColorStyles(
    theme: Theme,
    options: {
      backgroundColor?: keyof ThemeColors | string;
      textColor?: keyof ThemeColors | string;
      borderColor?: keyof ThemeColors | string;
      opacity?: number;
    }
  ): StyleValue {
    const styles: StyleValue = {};

    if (options.backgroundColor) {
      styles.backgroundColor = this.getThemeColor(
        theme,
        options.backgroundColor
      );
    }

    if (options.textColor) {
      styles.color = this.getThemeColor(theme, options.textColor);
    }

    if (options.borderColor) {
      styles.borderColor = this.getThemeColor(theme, options.borderColor);
    }

    if (options.opacity !== undefined) {
      styles.opacity = options.opacity;
    }

    return styles;
  }

  /**
   * Get color value from theme or return as-is if it's a direct color
   */
  private static getThemeColor(theme: Theme, color: string): string {
    // Check if it's a theme color path (e.g., 'primary.500', 'text.primary')
    const colorParts = color.split('.');
    let colorValue: any = theme.colors;

    for (const part of colorParts) {
      if (colorValue && typeof colorValue === 'object' && part in colorValue) {
        colorValue = colorValue[part];
      } else {
        // If path doesn't exist in theme, return original color
        return color;
      }
    }

    return typeof colorValue === 'string' ? colorValue : color;
  }

  /**
   * Generate spacing-based styles
   */
  static createSpacingStyles(
    theme: Theme,
    options: {
      margin?: keyof ThemeSpacing | number;
      marginHorizontal?: keyof ThemeSpacing | number;
      marginVertical?: keyof ThemeSpacing | number;
      padding?: keyof ThemeSpacing | number;
      paddingHorizontal?: keyof ThemeSpacing | number;
      paddingVertical?: keyof ThemeSpacing | number;
    }
  ): StyleValue {
    const styles: StyleValue = {};

    if (options.margin !== undefined) {
      styles.margin = this.getSpacingValue(theme, options.margin);
    }

    if (options.marginHorizontal !== undefined) {
      styles.marginHorizontal = this.getSpacingValue(
        theme,
        options.marginHorizontal
      );
    }

    if (options.marginVertical !== undefined) {
      styles.marginVertical = this.getSpacingValue(
        theme,
        options.marginVertical
      );
    }

    if (options.padding !== undefined) {
      styles.padding = this.getSpacingValue(theme, options.padding);
    }

    if (options.paddingHorizontal !== undefined) {
      styles.paddingHorizontal = this.getSpacingValue(
        theme,
        options.paddingHorizontal
      );
    }

    if (options.paddingVertical !== undefined) {
      styles.paddingVertical = this.getSpacingValue(
        theme,
        options.paddingVertical
      );
    }

    return styles;
  }

  /**
   * Get spacing value from theme or return as-is if it's a number
   */
  private static getSpacingValue(
    theme: Theme,
    spacing: keyof ThemeSpacing | number
  ): number {
    // Check if it's a theme spacing key
    if (spacing in theme.spacing) {
      return theme.spacing[spacing as keyof ThemeSpacing];
    }

    // Otherwise, treat it as a direct number value
    return spacing as number;
  }
}

/**
 * Performance-Optimized StyleSheet Creation
 */
export class PerformantStyleUtils {
  private static styleCache = new Map<string, any>();

  /**
   * Create cached StyleSheet to avoid recreation
   */
  static createCachedStyles<T extends StyleSheet.NamedStyles<T>>(
    styles: T | (() => T),
    cacheKey?: string
  ): T {
    const key = cacheKey || JSON.stringify(styles);

    if (this.styleCache.has(key)) {
      return this.styleCache.get(key);
    }

    const styleObject = typeof styles === 'function' ? styles() : styles;
    const createdStyles = StyleSheet.create(styleObject);

    this.styleCache.set(key, createdStyles);
    return createdStyles;
  }

  /**
   * Create theme-dependent cached styles
   */
  static createThemedCachedStyles<T extends StyleSheet.NamedStyles<T>>(
    styleFactory: (theme: Theme) => T,
    theme: Theme,
    additionalCacheKey?: string
  ): T {
    const themeKey = `${theme.name}-${theme.isDark ? 'dark' : 'light'}`;
    const cacheKey = additionalCacheKey
      ? `${themeKey}-${additionalCacheKey}`
      : themeKey;

    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey);
    }

    const styles = StyleSheet.create(styleFactory(theme));
    this.styleCache.set(cacheKey, styles);

    return styles;
  }

  /**
   * Clear style cache (useful for theme changes)
   */
  static clearCache(pattern?: string): void {
    if (pattern) {
      const keysToDelete = Array.from(this.styleCache.keys()).filter((key) =>
        key.includes(pattern)
      );
      keysToDelete.forEach((key) => this.styleCache.delete(key));
    } else {
      this.styleCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.styleCache.size,
      keys: Array.from(this.styleCache.keys()),
    };
  }
}

/**
 * Style Merging Utilities
 */
export class StyleMergeUtils {
  /**
   * Deep merge multiple style objects
   */
  static mergeStyles(...styles: (StyleValue | undefined | null)[]): StyleValue {
    const result: StyleValue = {};

    for (const style of styles) {
      if (style && typeof style === 'object') {
        Object.assign(result, style);
      }
    }

    return result;
  }

  /**
   * Conditionally merge styles
   */
  static conditionalMerge(
    baseStyle: StyleValue,
    conditionalStyles: {
      condition: boolean;
      style: StyleValue;
    }[]
  ): StyleValue {
    let result = { ...baseStyle };

    for (const { condition, style } of conditionalStyles) {
      if (condition && style) {
        result = this.mergeStyles(result, style);
      }
    }

    return result;
  }

  /**
   * Merge styles with priority (later styles override earlier ones)
   */
  static mergeWithPriority(
    ...stylesWithPriority: {
      style: StyleValue;
      priority: number;
    }[]
  ): StyleValue {
    const sortedStyles = stylesWithPriority
      .sort((a, b) => a.priority - b.priority)
      .map((item) => item.style);

    return this.mergeStyles(...sortedStyles);
  }
}

/**
 * Layout Utilities
 */
export class LayoutUtils {
  /**
   * Create flex layout styles
   */
  static createFlexStyles(options: {
    direction?: 'row' | 'column';
    justify?:
      | 'flex-start'
      | 'flex-end'
      | 'center'
      | 'space-between'
      | 'space-around'
      | 'space-evenly';
    align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    flex?: number;
  }): ViewStyle {
    return {
      display: 'flex',
      flexDirection: options.direction || 'column',
      justifyContent: options.justify || 'flex-start',
      alignItems: options.align || 'stretch',
      flexWrap: options.wrap || 'nowrap',
      ...(options.flex !== undefined && { flex: options.flex }),
    };
  }

  /**
   * Create positioning styles
   */
  static createPositionStyles(options: {
    position?: 'absolute' | 'relative';
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    zIndex?: number;
  }): ViewStyle {
    const styles: ViewStyle = {};

    if (options.position) styles.position = options.position;
    if (options.top !== undefined) styles.top = options.top;
    if (options.right !== undefined) styles.right = options.right;
    if (options.bottom !== undefined) styles.bottom = options.bottom;
    if (options.left !== undefined) styles.left = options.left;
    if (options.zIndex !== undefined) styles.zIndex = options.zIndex;

    return styles;
  }

  /**
   * Create dimension styles with responsive support
   */
  static createDimensionStyles(options: {
    width?: number | string | 'auto';
    height?: number | string | 'auto';
    minWidth?: number | string;
    minHeight?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    aspectRatio?: number;
  }): ViewStyle {
    const styles: ViewStyle = {};

    if (options.width !== undefined) styles.width = options.width;
    if (options.height !== undefined) styles.height = options.height;
    if (options.minWidth !== undefined) styles.minWidth = options.minWidth;
    if (options.minHeight !== undefined) styles.minHeight = options.minHeight;
    if (options.maxWidth !== undefined) styles.maxWidth = options.maxWidth;
    if (options.maxHeight !== undefined) styles.maxHeight = options.maxHeight;
    if (options.aspectRatio !== undefined)
      styles.aspectRatio = options.aspectRatio;

    return styles;
  }
}

/**
 * Main StyleUtils class that combines all utilities
 */
export class StyleUtils {
  static responsive = ResponsiveUtils;
  static theme = ThemeStyleUtils;
  static performant = PerformantStyleUtils;
  static merge = StyleMergeUtils;
  static layout = LayoutUtils;

  /**
   * Create a complete style object with all utilities
   */
  static create<T extends Record<string, any>>(
    styleDefinitions: T,
    theme?: Theme
  ): T {
    if (theme) {
      return this.performant.createThemedCachedStyles(
        () => styleDefinitions,
        theme
      );
    }

    return this.performant.createCachedStyles(styleDefinitions);
  }

  /**
   * Utility to create responsive, themed styles
   */
  static createResponsiveThemedStyles<
    T extends Record<string, ResponsiveStyleValue>,
  >(styles: T, theme: Theme): Record<keyof T, StyleValue> {
    const responsiveStyles = this.responsive.createResponsiveStyles(styles);
    return this.performant.createThemedCachedStyles(
      () => responsiveStyles,
      theme,
      'responsive'
    );
  }
}

// Export default instance
export const styleUtils = StyleUtils;

// Export individual utility classes with renamed exports to avoid React 19 conflicts
export {
  ResponsiveUtils as ResponsiveStyleUtils,
  ThemeStyleUtils as ThemedStyleUtils,
  PerformantStyleUtils as PerformantStyles,
  StyleMergeUtils as MergedStyleUtils,
  LayoutUtils as LayoutStyleUtils,
};
