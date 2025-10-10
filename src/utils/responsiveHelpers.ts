/**
 * Responsive Design Helpers
 * Additional utilities for responsive design and device adaptation
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';
import { breakpoints, Breakpoint } from './styleUtils';

// Get device information (will be updated dynamically)
let screenWidth = Dimensions.get('window').width;
let screenHeight = Dimensions.get('window').height;
const { width: windowWidth, height: windowHeight } = Dimensions.get('screen');

// Update dimensions when they change (for testing and orientation changes)
const updateDimensions = () => {
  const { width, height } = Dimensions.get('window');
  screenWidth = width;
  screenHeight = height;
};

/**
 * Device information and utilities
 */
export class DeviceUtils {
  /**
   * Get device pixel ratio
   */
  static getPixelRatio(): number {
    return PixelRatio.get();
  }

  /**
   * Convert dp to pixels
   */
  static dpToPixels(dp: number): number {
    return PixelRatio.getPixelSizeForLayoutSize(dp);
  }

  /**
   * Convert pixels to dp
   */
  static pixelsToDp(pixels: number): number {
    return pixels / PixelRatio.get();
  }

  /**
   * Get font scale factor
   */
  static getFontScale(): number {
    return PixelRatio.getFontScale();
  }

  /**
   * Check if device is tablet
   */
  static isTablet(): boolean {
    updateDimensions();
    const aspectRatio = screenWidth / screenHeight;
    return (
      (Platform.OS === 'ios' && aspectRatio < 1.6) ||
      (Platform.OS === 'android' && screenWidth >= 600)
    );
  }

  /**
   * Check if device is phone
   */
  static isPhone(): boolean {
    return !this.isTablet();
  }

  /**
   * Get device orientation
   */
  static getOrientation(): 'portrait' | 'landscape' {
    updateDimensions();
    return screenWidth > screenHeight ? 'landscape' : 'portrait';
  }

  /**
   * Check if device is in landscape mode
   */
  static isLandscape(): boolean {
    return this.getOrientation() === 'landscape';
  }

  /**
   * Check if device is in portrait mode
   */
  static isPortrait(): boolean {
    return this.getOrientation() === 'portrait';
  }

  /**
   * Get safe area dimensions (accounting for notches, etc.)
   */
  static getSafeAreaDimensions(): {
    width: number;
    height: number;
    topInset: number;
    bottomInset: number;
  } {
    updateDimensions();
    // Basic implementation - in real app, you'd use react-native-safe-area-context
    const topInset = Platform.OS === 'ios' ? 44 : 24; // Status bar height
    const bottomInset = Platform.OS === 'ios' ? 34 : 0; // Home indicator height
    
    return {
      width: screenWidth,
      height: screenHeight - topInset - bottomInset,
      topInset,
      bottomInset,
    };
  }
}

/**
 * Responsive sizing utilities
 */
export class ResponsiveSizing {
  private static baseWidth = 375; // iPhone 6/7/8 width as base
  private static baseHeight = 667; // iPhone 6/7/8 height as base

  /**
   * Scale width based on screen size
   */
  static scaleWidth(size: number): number {
    updateDimensions();
    return (screenWidth / this.baseWidth) * size;
  }

  /**
   * Scale height based on screen size
   */
  static scaleHeight(size: number): number {
    updateDimensions();
    return (screenHeight / this.baseHeight) * size;
  }

  /**
   * Scale size moderately (less aggressive scaling)
   */
  static moderateScale(size: number, factor: number = 0.5): number {
    const scale = this.scaleWidth(size);
    return size + (scale - size) * factor;
  }

  /**
   * Scale font size with accessibility considerations
   */
  static scaleFontSize(size: number): number {
    const fontScale = DeviceUtils.getFontScale();
    const scaledSize = this.moderateScale(size);
    
    // Apply font scale but cap it to prevent extremely large text
    const maxScale = 1.3;
    const appliedScale = Math.min(fontScale, maxScale);
    
    return Math.round(scaledSize * appliedScale);
  }

  /**
   * Get responsive padding based on screen size
   */
  static getResponsivePadding(basePadding: number): number {
    if (DeviceUtils.isTablet()) {
      return basePadding * 1.5;
    }
    return this.moderateScale(basePadding);
  }

  /**
   * Get responsive margin based on screen size
   */
  static getResponsiveMargin(baseMargin: number): number {
    if (DeviceUtils.isTablet()) {
      return baseMargin * 1.5;
    }
    return this.moderateScale(baseMargin);
  }

  /**
   * Get responsive border radius
   */
  static getResponsiveBorderRadius(baseRadius: number): number {
    return this.moderateScale(baseRadius, 0.3);
  }
}

/**
 * Breakpoint utilities for responsive design
 */
export class BreakpointUtils {
  /**
   * Check if current screen is at or above breakpoint
   */
  static isAtLeast(breakpoint: Breakpoint): boolean {
    updateDimensions();
    return screenWidth >= breakpoints[breakpoint];
  }

  /**
   * Check if current screen is below breakpoint
   */
  static isBelow(breakpoint: Breakpoint): boolean {
    updateDimensions();
    return screenWidth < breakpoints[breakpoint];
  }

  /**
   * Check if current screen is between two breakpoints
   */
  static isBetween(minBreakpoint: Breakpoint, maxBreakpoint: Breakpoint): boolean {
    updateDimensions();
    return (
      screenWidth >= breakpoints[minBreakpoint] &&
      screenWidth < breakpoints[maxBreakpoint]
    );
  }

  /**
   * Get value based on breakpoint conditions
   */
  static getValue<T>(breakpointValues: Partial<Record<Breakpoint, T>>, fallback: T): T {
    updateDimensions();
    const currentBreakpoint = this.getCurrentBreakpoint();
    const breakpointOrder: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    
    // Find the best matching breakpoint value
    for (const bp of breakpointOrder) {
      if (breakpoints[bp] <= screenWidth && breakpointValues[bp] !== undefined) {
        return breakpointValues[bp] as T;
      }
    }
    
    return fallback;
  }

  /**
   * Get current breakpoint
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
   * Get breakpoint-specific column count for grids
   */
  static getColumnCount(
    breakpointColumns: Partial<Record<Breakpoint, number>> = {}
  ): number {
    const defaultColumns = {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
    };

    const columns = { ...defaultColumns, ...breakpointColumns };
    return this.getValue(columns, 1);
  }
}

/**
 * Grid system utilities
 */
export class GridUtils {
  /**
   * Calculate item width for grid layout
   */
  static getItemWidth(
    containerWidth: number,
    columns: number,
    spacing: number = 0
  ): number {
    const totalSpacing = spacing * (columns - 1);
    return (containerWidth - totalSpacing) / columns;
  }

  /**
   * Calculate grid dimensions
   */
  static calculateGridDimensions(
    itemCount: number,
    columns: number,
    itemHeight: number,
    spacing: number = 0
  ): { width: number; height: number; rows: number } {
    updateDimensions();
    const rows = Math.ceil(itemCount / columns);
    const width = screenWidth;
    const height = rows * itemHeight + (rows - 1) * spacing;

    return { width, height, rows };
  }

  /**
   * Get responsive grid configuration
   */
  static getResponsiveGridConfig(
    breakpointConfigs: Partial<Record<Breakpoint, {
      columns: number;
      spacing: number;
      itemHeight?: number;
    }>>
  ): { columns: number; spacing: number; itemHeight: number } {
    const defaultConfig = {
      columns: 1,
      spacing: 16,
      itemHeight: 200,
    };

    const currentBreakpoint = BreakpointUtils.getCurrentBreakpoint();
    const config = breakpointConfigs[currentBreakpoint] || defaultConfig;

    return {
      columns: config.columns,
      spacing: config.spacing,
      itemHeight: config.itemHeight || defaultConfig.itemHeight,
    };
  }
}

/**
 * Typography responsive utilities
 */
export class ResponsiveTypography {
  /**
   * Get responsive font size based on screen size and accessibility
   */
  static getFontSize(
    baseFontSize: number,
    options: {
      minSize?: number;
      maxSize?: number;
      scaleWithDevice?: boolean;
      scaleWithAccessibility?: boolean;
    } = {}
  ): number {
    const {
      minSize = baseFontSize * 0.8,
      maxSize = baseFontSize * 1.5,
      scaleWithDevice = true,
      scaleWithAccessibility = true,
    } = options;

    let fontSize = baseFontSize;

    // Scale with device size
    if (scaleWithDevice) {
      fontSize = ResponsiveSizing.scaleFontSize(fontSize);
    }

    // Apply accessibility scaling
    if (scaleWithAccessibility) {
      const fontScale = DeviceUtils.getFontScale();
      fontSize *= Math.min(fontScale, 1.3); // Cap at 1.3x for readability
    }

    // Ensure within bounds
    return Math.max(minSize, Math.min(maxSize, fontSize));
  }

  /**
   * Get responsive line height
   */
  static getLineHeight(fontSize: number, multiplier: number = 1.4): number {
    return Math.round(fontSize * multiplier);
  }

  /**
   * Get responsive letter spacing
   */
  static getLetterSpacing(fontSize: number): number {
    // Smaller fonts need more letter spacing, larger fonts need less
    if (fontSize <= 12) return 0.5;
    if (fontSize <= 16) return 0.25;
    if (fontSize <= 20) return 0;
    return -0.25;
  }
}

/**
 * Main responsive utilities export
 */
export const responsiveUtils = {
  device: DeviceUtils,
  sizing: ResponsiveSizing,
  breakpoints: BreakpointUtils,
  grid: GridUtils,
  typography: ResponsiveTypography,
  
  // Convenience methods
  isTablet: () => DeviceUtils.isTablet(),
  isPhone: () => DeviceUtils.isPhone(),
  isLandscape: () => DeviceUtils.isLandscape(),
  isPortrait: () => DeviceUtils.isPortrait(),
  scaleWidth: (size: number) => ResponsiveSizing.scaleWidth(size),
  scaleHeight: (size: number) => ResponsiveSizing.scaleHeight(size),
  moderateScale: (size: number, factor?: number) => ResponsiveSizing.moderateScale(size, factor),
  getCurrentBreakpoint: () => BreakpointUtils.getCurrentBreakpoint(),
};

// Export individual classes with renamed exports to avoid React 19 conflicts
export {
  DeviceUtils as ResponsiveDeviceUtils,
  ResponsiveSizing as ResponsiveScale,
  BreakpointUtils as ResponsiveBreakpoints,
  GridUtils as ResponsiveGrid,
  ResponsiveTypography as ResponsiveTextSizing,
};