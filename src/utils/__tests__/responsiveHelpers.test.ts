/**
 * Responsive Helpers Tests
 * Tests for responsive design utilities and device adaptation
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';
import {
  DeviceUtils,
  ResponsiveSizing,
  BreakpointUtils,
  GridUtils,
  ResponsiveTypography,
  responsiveUtils,
} from '../responsiveHelpers';

// Mock React Native modules
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
  Platform: {
    OS: 'ios',
  },
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
  },
}));

describe('DeviceUtils', () => {
  beforeEach(() => {
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
    (Platform as any).OS = 'ios';
    (PixelRatio.get as jest.Mock).mockReturnValue(2);
    (PixelRatio.getFontScale as jest.Mock).mockReturnValue(1);
  });

  describe('getPixelRatio', () => {
    it('should return pixel ratio', () => {
      expect(DeviceUtils.getPixelRatio()).toBe(2);
    });
  });

  describe('dpToPixels', () => {
    it('should convert dp to pixels', () => {
      (PixelRatio.getPixelSizeForLayoutSize as jest.Mock).mockReturnValue(32);
      expect(DeviceUtils.dpToPixels(16)).toBe(32);
    });
  });

  describe('pixelsToDp', () => {
    it('should convert pixels to dp', () => {
      expect(DeviceUtils.pixelsToDp(32)).toBe(16);
    });
  });

  describe('getFontScale', () => {
    it('should return font scale', () => {
      expect(DeviceUtils.getFontScale()).toBe(1);
    });
  });

  describe('isTablet', () => {
    it('should detect tablet on iOS based on aspect ratio', () => {
      // iPad-like dimensions (4:3 aspect ratio)
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 768, height: 1024 });
      expect(DeviceUtils.isTablet()).toBe(true);

      // iPhone-like dimensions (16:9 aspect ratio)
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
      expect(DeviceUtils.isTablet()).toBe(false);
    });

    it('should detect tablet on Android based on width', () => {
      (Platform as any).OS = 'android';
      
      // Tablet width
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 700, height: 1000 });
      expect(DeviceUtils.isTablet()).toBe(true);

      // Phone width
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 400, height: 700 });
      expect(DeviceUtils.isTablet()).toBe(false);
    });
  });

  describe('isPhone', () => {
    it('should return opposite of isTablet', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
      expect(DeviceUtils.isPhone()).toBe(true);

      (Dimensions.get as jest.Mock).mockReturnValue({ width: 768, height: 1024 });
      expect(DeviceUtils.isPhone()).toBe(false);
    });
  });

  describe('getOrientation', () => {
    it('should detect portrait orientation', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
      expect(DeviceUtils.getOrientation()).toBe('portrait');
    });

    it('should detect landscape orientation', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 667, height: 375 });
      expect(DeviceUtils.getOrientation()).toBe('landscape');
    });
  });

  describe('isLandscape', () => {
    it('should return true for landscape orientation', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 667, height: 375 });
      expect(DeviceUtils.isLandscape()).toBe(true);
    });

    it('should return false for portrait orientation', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
      expect(DeviceUtils.isLandscape()).toBe(false);
    });
  });

  describe('isPortrait', () => {
    it('should return true for portrait orientation', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
      expect(DeviceUtils.isPortrait()).toBe(true);
    });

    it('should return false for landscape orientation', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 667, height: 375 });
      expect(DeviceUtils.isPortrait()).toBe(false);
    });
  });

  describe('getSafeAreaDimensions', () => {
    it('should return safe area dimensions for iOS', () => {
      (Platform as any).OS = 'ios';
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });

      const result = DeviceUtils.getSafeAreaDimensions();

      expect(result).toEqual({
        width: 375,
        height: 589, // 667 - 44 - 34
        topInset: 44,
        bottomInset: 34,
      });
    });

    it('should return safe area dimensions for Android', () => {
      (Platform as any).OS = 'android';
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });

      const result = DeviceUtils.getSafeAreaDimensions();

      expect(result).toEqual({
        width: 375,
        height: 643, // 667 - 24 - 0
        topInset: 24,
        bottomInset: 0,
      });
    });
  });
});

describe('ResponsiveSizing', () => {
  beforeEach(() => {
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
  });

  describe('scaleWidth', () => {
    it('should scale width based on screen size', () => {
      expect(ResponsiveSizing.scaleWidth(100)).toBe(100); // 375/375 * 100

      (Dimensions.get as jest.Mock).mockReturnValue({ width: 750, height: 667 });
      expect(ResponsiveSizing.scaleWidth(100)).toBe(200); // 750/375 * 100
    });
  });

  describe('scaleHeight', () => {
    it('should scale height based on screen size', () => {
      expect(ResponsiveSizing.scaleHeight(100)).toBe(100); // 667/667 * 100

      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 1334 });
      expect(ResponsiveSizing.scaleHeight(100)).toBe(200); // 1334/667 * 100
    });
  });

  describe('moderateScale', () => {
    it('should apply moderate scaling with default factor', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 750, height: 667 });
      
      const result = ResponsiveSizing.moderateScale(100);
      const expectedScale = (750 / 375) * 100; // 200
      const expected = 100 + (expectedScale - 100) * 0.5; // 100 + 50 = 150
      
      expect(result).toBe(expected);
    });

    it('should apply moderate scaling with custom factor', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 750, height: 667 });
      
      const result = ResponsiveSizing.moderateScale(100, 0.25);
      const expectedScale = (750 / 375) * 100; // 200
      const expected = 100 + (expectedScale - 100) * 0.25; // 100 + 25 = 125
      
      expect(result).toBe(expected);
    });
  });

  describe('scaleFontSize', () => {
    it('should scale font size with accessibility considerations', () => {
      (PixelRatio.getFontScale as jest.Mock).mockReturnValue(1.2);
      
      const result = ResponsiveSizing.scaleFontSize(16);
      const moderateScaled = ResponsiveSizing.moderateScale(16);
      const expected = Math.round(moderateScaled * 1.2);
      
      expect(result).toBe(expected);
    });

    it('should cap font scale at 1.3x', () => {
      (PixelRatio.getFontScale as jest.Mock).mockReturnValue(2.0);
      
      const result = ResponsiveSizing.scaleFontSize(16);
      const moderateScaled = ResponsiveSizing.moderateScale(16);
      const expected = Math.round(moderateScaled * 1.3); // Capped at 1.3
      
      expect(result).toBe(expected);
    });
  });

  describe('getResponsivePadding', () => {
    it('should return scaled padding for phone', () => {
      const result = ResponsiveSizing.getResponsivePadding(16);
      const expected = ResponsiveSizing.moderateScale(16);
      
      expect(result).toBe(expected);
    });

    it('should return 1.5x padding for tablet', () => {
      // Mock tablet dimensions
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 768, height: 1024 });
      
      const result = ResponsiveSizing.getResponsivePadding(16);
      
      expect(result).toBe(24); // 16 * 1.5
    });
  });

  describe('getResponsiveMargin', () => {
    it('should return scaled margin for phone', () => {
      const result = ResponsiveSizing.getResponsiveMargin(8);
      const expected = ResponsiveSizing.moderateScale(8);
      
      expect(result).toBe(expected);
    });

    it('should return 1.5x margin for tablet', () => {
      // Mock tablet dimensions
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 768, height: 1024 });
      
      const result = ResponsiveSizing.getResponsiveMargin(8);
      
      expect(result).toBe(12); // 8 * 1.5
    });
  });

  describe('getResponsiveBorderRadius', () => {
    it('should return moderately scaled border radius', () => {
      const result = ResponsiveSizing.getResponsiveBorderRadius(8);
      const expected = ResponsiveSizing.moderateScale(8, 0.3);
      
      expect(result).toBe(expected);
    });
  });
});

describe('BreakpointUtils', () => {
  beforeEach(() => {
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
  });

  describe('isAtLeast', () => {
    it('should check if screen is at least the specified breakpoint', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 800, height: 667 });
      
      expect(BreakpointUtils.isAtLeast('xs')).toBe(true);
      expect(BreakpointUtils.isAtLeast('sm')).toBe(true);
      expect(BreakpointUtils.isAtLeast('md')).toBe(true);
      expect(BreakpointUtils.isAtLeast('lg')).toBe(false);
      expect(BreakpointUtils.isAtLeast('xl')).toBe(false);
    });
  });

  describe('isBelow', () => {
    it('should check if screen is below the specified breakpoint', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 600, height: 667 });
      
      expect(BreakpointUtils.isBelow('xs')).toBe(false);
      expect(BreakpointUtils.isBelow('sm')).toBe(false);
      expect(BreakpointUtils.isBelow('md')).toBe(true);
      expect(BreakpointUtils.isBelow('lg')).toBe(true);
      expect(BreakpointUtils.isBelow('xl')).toBe(true);
    });
  });

  describe('isBetween', () => {
    it('should check if screen is between two breakpoints', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 800, height: 667 });
      
      expect(BreakpointUtils.isBetween('sm', 'lg')).toBe(true);
      expect(BreakpointUtils.isBetween('md', 'xl')).toBe(true);
      expect(BreakpointUtils.isBetween('lg', 'xl')).toBe(false);
    });
  });

  describe('getValue', () => {
    it('should return value based on current breakpoint', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 800, height: 667 });
      
      const breakpointValues = {
        xs: 'small',
        sm: 'medium',
        md: 'large',
        lg: 'extra-large',
      };
      
      const result = BreakpointUtils.getValue(breakpointValues, 'default');
      expect(result).toBe('large');
    });

    it('should return fallback when no matching breakpoint', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 300, height: 667 });
      
      const breakpointValues = {
        lg: 'large',
        xl: 'extra-large',
      };
      
      const result = BreakpointUtils.getValue(breakpointValues, 'default');
      expect(result).toBe('default');
    });
  });

  describe('getCurrentBreakpoint', () => {
    it('should return current breakpoint', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 800, height: 667 });
      expect(BreakpointUtils.getCurrentBreakpoint()).toBe('md');

      (Dimensions.get as jest.Mock).mockReturnValue({ width: 1000, height: 667 });
      expect(BreakpointUtils.getCurrentBreakpoint()).toBe('lg');
    });
  });

  describe('getColumnCount', () => {
    it('should return default column count based on breakpoint', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 400, height: 667 });
      expect(BreakpointUtils.getColumnCount()).toBe(1); // xs

      (Dimensions.get as jest.Mock).mockReturnValue({ width: 600, height: 667 });
      expect(BreakpointUtils.getColumnCount()).toBe(2); // sm

      (Dimensions.get as jest.Mock).mockReturnValue({ width: 800, height: 667 });
      expect(BreakpointUtils.getColumnCount()).toBe(3); // md
    });

    it('should use custom column configuration', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 800, height: 667 });
      
      const customColumns = {
        md: 4,
        lg: 6,
      };
      
      expect(BreakpointUtils.getColumnCount(customColumns)).toBe(4);
    });
  });
});

describe('GridUtils', () => {
  describe('getItemWidth', () => {
    it('should calculate item width for grid layout', () => {
      const containerWidth = 300;
      const columns = 3;
      const spacing = 20;
      
      const result = GridUtils.getItemWidth(containerWidth, columns, spacing);
      const expected = (300 - 20 * 2) / 3; // (300 - 40) / 3 = 86.67
      
      expect(result).toBeCloseTo(expected);
    });

    it('should handle zero spacing', () => {
      const result = GridUtils.getItemWidth(300, 3, 0);
      expect(result).toBe(100);
    });
  });

  describe('calculateGridDimensions', () => {
    it('should calculate grid dimensions', () => {
      const itemCount = 10;
      const columns = 3;
      const itemHeight = 100;
      const spacing = 10;
      
      const result = GridUtils.calculateGridDimensions(itemCount, columns, itemHeight, spacing);
      
      expect(result.rows).toBe(4); // Math.ceil(10/3)
      expect(result.width).toBe(375); // Screen width
      expect(result.height).toBe(430); // 4 * 100 + 3 * 10
    });
  });

  describe('getResponsiveGridConfig', () => {
    it('should return responsive grid configuration', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 800, height: 667 });
      
      const breakpointConfigs = {
        md: {
          columns: 3,
          spacing: 16,
          itemHeight: 150,
        },
        lg: {
          columns: 4,
          spacing: 20,
        },
      };
      
      const result = GridUtils.getResponsiveGridConfig(breakpointConfigs);
      
      expect(result).toEqual({
        columns: 3,
        spacing: 16,
        itemHeight: 150,
      });
    });

    it('should return default config when no matching breakpoint', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 300, height: 667 });
      
      const result = GridUtils.getResponsiveGridConfig({});
      
      expect(result).toEqual({
        columns: 1,
        spacing: 16,
        itemHeight: 200,
      });
    });
  });
});

describe('ResponsiveTypography', () => {
  beforeEach(() => {
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
    (PixelRatio.getFontScale as jest.Mock).mockReturnValue(1);
  });

  describe('getFontSize', () => {
    it('should return responsive font size with default options', () => {
      const result = ResponsiveTypography.getFontSize(16);
      const expected = ResponsiveSizing.scaleFontSize(16);
      
      expect(result).toBe(expected);
    });

    it('should respect min and max size bounds', () => {
      (PixelRatio.getFontScale as jest.Mock).mockReturnValue(2);
      
      const result = ResponsiveTypography.getFontSize(16, {
        minSize: 14,
        maxSize: 20,
      });
      
      expect(result).toBeGreaterThanOrEqual(14);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('should disable device scaling when specified', () => {
      const result = ResponsiveTypography.getFontSize(16, {
        scaleWithDevice: false,
      });
      
      expect(result).toBe(16); // Should not be scaled
    });

    it('should disable accessibility scaling when specified', () => {
      (PixelRatio.getFontScale as jest.Mock).mockReturnValue(1.5);
      
      const result = ResponsiveTypography.getFontSize(16, {
        scaleWithAccessibility: false,
      });
      
      const expected = ResponsiveSizing.scaleFontSize(16) / 1.5; // Remove accessibility scaling
      expect(result).toBeCloseTo(expected);
    });
  });

  describe('getLineHeight', () => {
    it('should calculate line height with default multiplier', () => {
      const result = ResponsiveTypography.getLineHeight(16);
      expect(result).toBe(22); // Math.round(16 * 1.4)
    });

    it('should calculate line height with custom multiplier', () => {
      const result = ResponsiveTypography.getLineHeight(16, 1.6);
      expect(result).toBe(26); // Math.round(16 * 1.6)
    });
  });

  describe('getLetterSpacing', () => {
    it('should return appropriate letter spacing for different font sizes', () => {
      expect(ResponsiveTypography.getLetterSpacing(10)).toBe(0.5);
      expect(ResponsiveTypography.getLetterSpacing(14)).toBe(0.25);
      expect(ResponsiveTypography.getLetterSpacing(18)).toBe(0);
      expect(ResponsiveTypography.getLetterSpacing(24)).toBe(-0.25);
    });
  });
});

describe('responsiveUtils', () => {
  it('should provide convenience methods', () => {
    expect(typeof responsiveUtils.isTablet).toBe('function');
    expect(typeof responsiveUtils.isPhone).toBe('function');
    expect(typeof responsiveUtils.scaleWidth).toBe('function');
    expect(typeof responsiveUtils.getCurrentBreakpoint).toBe('function');
  });

  it('should provide access to utility classes', () => {
    expect(responsiveUtils.device).toBe(DeviceUtils);
    expect(responsiveUtils.sizing).toBe(ResponsiveSizing);
    expect(responsiveUtils.breakpoints).toBe(BreakpointUtils);
    expect(responsiveUtils.grid).toBe(GridUtils);
    expect(responsiveUtils.typography).toBe(ResponsiveTypography);
  });
});