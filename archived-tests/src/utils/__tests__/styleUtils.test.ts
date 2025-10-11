/**
 * Style Utilities Tests
 * Comprehensive tests for style utilities and helper functions
 */

import { Dimensions } from 'react-native';
import {
  StyleUtils,
  ResponsiveUtils,
  ThemeStyleUtils,
  PerformantStyleUtils,
  StyleMergeUtils,
  LayoutUtils,
  breakpoints,
} from '../styleUtils';
import { lightTheme } from '../../theme/themes/light';

// Mock Dimensions
jest.mock('react-native', () => ({
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
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

describe('ResponsiveUtils', () => {
  beforeEach(() => {
    // Reset dimensions to default
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
  });

  describe('getCurrentBreakpoint', () => {
    it('should return correct breakpoint for different screen sizes', () => {
      // xs breakpoint
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 400,
        height: 667,
      });
      expect(ResponsiveUtils.getCurrentBreakpoint()).toBe('xs');

      // sm breakpoint
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 600,
        height: 667,
      });
      expect(ResponsiveUtils.getCurrentBreakpoint()).toBe('sm');

      // md breakpoint
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 800,
        height: 667,
      });
      expect(ResponsiveUtils.getCurrentBreakpoint()).toBe('md');

      // lg breakpoint
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 1000,
        height: 667,
      });
      expect(ResponsiveUtils.getCurrentBreakpoint()).toBe('lg');

      // xl breakpoint
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 1300,
        height: 667,
      });
      expect(ResponsiveUtils.getCurrentBreakpoint()).toBe('xl');
    });
  });

  describe('matchesBreakpoint', () => {
    it('should correctly match breakpoints', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 800,
        height: 667,
      });

      expect(ResponsiveUtils.matchesBreakpoint('xs')).toBe(true);
      expect(ResponsiveUtils.matchesBreakpoint('sm')).toBe(true);
      expect(ResponsiveUtils.matchesBreakpoint('md')).toBe(true);
      expect(ResponsiveUtils.matchesBreakpoint('lg')).toBe(false);
      expect(ResponsiveUtils.matchesBreakpoint('xl')).toBe(false);
    });
  });

  describe('getResponsiveValue', () => {
    it('should return correct value for responsive object', () => {
      const responsiveValue = {
        xs: 10,
        sm: 20,
        md: 30,
        lg: 40,
        xl: 50,
      };

      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 800,
        height: 667,
      });
      expect(ResponsiveUtils.getResponsiveValue(responsiveValue)).toBe(30);

      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 400,
        height: 667,
      });
      expect(ResponsiveUtils.getResponsiveValue(responsiveValue)).toBe(10);
    });

    it('should return value as-is for non-responsive values', () => {
      expect(ResponsiveUtils.getResponsiveValue(42)).toBe(42);
      expect(ResponsiveUtils.getResponsiveValue('test')).toBe('test');
    });

    it('should fallback to smallest available value', () => {
      const partialResponsiveValue = {
        md: 30,
        lg: 40,
      };

      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 400,
        height: 667,
      });
      expect(ResponsiveUtils.getResponsiveValue(partialResponsiveValue)).toBe(
        30
      );
    });
  });

  describe('createResponsiveStyles', () => {
    it('should create responsive styles object', () => {
      const responsiveStyles = {
        fontSize: { xs: 14, md: 16, lg: 18 },
        padding: { xs: 8, md: 12, lg: 16 },
      };

      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 800,
        height: 667,
      });
      const result = ResponsiveUtils.createResponsiveStyles(responsiveStyles);

      expect(result.fontSize).toBe(16);
      expect(result.padding).toBe(12);
    });
  });

  describe('getScaleFactor', () => {
    it('should return correct scale factor', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 375,
        height: 667,
      });
      expect(ResponsiveUtils.getScaleFactor()).toBe(1);

      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 750,
        height: 667,
      });
      expect(ResponsiveUtils.getScaleFactor()).toBe(1.5); // Capped at 1.5

      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 300,
        height: 667,
      });
      expect(ResponsiveUtils.getScaleFactor()).toBe(0.8);
    });
  });

  describe('scale', () => {
    it('should scale values correctly', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 375,
        height: 667,
      });
      expect(ResponsiveUtils.scale(16)).toBe(16);

      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 450,
        height: 667,
      });
      expect(ResponsiveUtils.scale(16)).toBe(19); // 16 * 1.2 = 19.2, rounded to 19
    });
  });
});

const mockTheme = lightTheme;

describe('ThemeStyleUtils', () => {
  describe('createThemedStyles', () => {
    it('should create themed styles', () => {
      const styleDefinitions = {
        container: (theme: any) => ({
          backgroundColor: theme.colors.background.primary,
          padding: theme.spacing.md,
        }),
        text: (theme: any) => ({
          color: theme.colors.text.primary,
          fontSize: theme.typography.fontSize.body,
        }),
      };

      const result = ThemeStyleUtils.createThemedStyles(
        styleDefinitions,
        mockTheme
      );

      expect(result.container).toEqual({
        backgroundColor: mockTheme.colors.background.primary,
        padding: mockTheme.spacing.md,
      });
      expect(result.text).toEqual({
        color: mockTheme.colors.text.primary,
        fontSize: mockTheme.typography.fontSize.body,
      });
    });
  });

  describe('mergeThemedStyles', () => {
    it('should merge styles correctly', () => {
      const baseStyles = { padding: 16, margin: 8 };
      const overrideStyles = { padding: 24, backgroundColor: 'red' };

      const result = ThemeStyleUtils.mergeThemedStyles(
        baseStyles,
        overrideStyles
      );

      expect(result).toEqual({
        padding: 24,
        margin: 8,
        backgroundColor: 'red',
      });
    });

    it('should handle undefined override styles', () => {
      const baseStyles = { padding: 16 };
      const result = ThemeStyleUtils.mergeThemedStyles(baseStyles);

      expect(result).toEqual(baseStyles);
    });
  });

  describe('applyConditionalStyles', () => {
    it('should apply conditional styles based on conditions', () => {
      const baseStyles = { padding: 16 };
      const conditionalStyles = [
        { condition: true, style: { margin: 8 } },
        { condition: false, style: { backgroundColor: 'red' } },
        { condition: true, style: { borderRadius: 4 } },
      ];

      const result = ThemeStyleUtils.applyConditionalStyles(
        baseStyles,
        conditionalStyles
      );

      expect(result).toEqual({
        padding: 16,
        margin: 8,
        borderRadius: 4,
      });
    });
  });

  describe('createColorStyles', () => {
    it('should create color-based styles', () => {
      const options = {
        backgroundColor: 'primary.500',
        textColor: 'text.primary',
        borderColor: '#ff0000',
        opacity: 0.8,
      };

      const result = ThemeStyleUtils.createColorStyles(mockTheme, options);

      expect(result).toEqual({
        backgroundColor: mockTheme.colors.primary[500],
        color: mockTheme.colors.text.primary,
        borderColor: '#ff0000',
        opacity: 0.8,
      });
    });
  });

  describe('createSpacingStyles', () => {
    it('should create spacing-based styles', () => {
      const options = {
        margin: 4 as keyof typeof mockTheme.spacing,
        padding: 15, // Use a value that doesn't exist in theme spacing
        marginHorizontal: 2 as keyof typeof mockTheme.spacing,
      };

      const result = ThemeStyleUtils.createSpacingStyles(mockTheme, options);

      expect(result).toEqual({
        margin: mockTheme.spacing[4], // 16
        padding: 15, // Direct value
        marginHorizontal: mockTheme.spacing[2], // 8
      });
    });
  });
});

describe('PerformantStyleUtils', () => {
  beforeEach(() => {
    PerformantStyleUtils.clearCache();
  });

  describe('createCachedStyles', () => {
    it('should cache styles and return same instance', () => {
      const styles = { padding: 16, margin: 8 };
      const cacheKey = 'test-styles';

      const result1 = PerformantStyleUtils.createCachedStyles(styles, cacheKey);
      const result2 = PerformantStyleUtils.createCachedStyles(styles, cacheKey);

      expect(result1).toBe(result2);
    });

    it('should handle function-based styles', () => {
      const styleFunction = () => ({ padding: 16 });
      const result = PerformantStyleUtils.createCachedStyles(styleFunction);

      expect(result).toEqual({ padding: 16 });
    });
  });

  describe('createThemedCachedStyles', () => {
    it('should cache themed styles', () => {
      const styleFactory = (theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      });

      const result1 = PerformantStyleUtils.createThemedCachedStyles(
        styleFactory,
        mockTheme,
        'test'
      );
      const result2 = PerformantStyleUtils.createThemedCachedStyles(
        styleFactory,
        mockTheme,
        'test'
      );

      expect(result1).toBe(result2);
    });
  });

  describe('clearCache', () => {
    it('should clear cache with pattern', () => {
      PerformantStyleUtils.createCachedStyles({ padding: 16 }, 'test-1');
      PerformantStyleUtils.createCachedStyles({ margin: 8 }, 'other-1');

      PerformantStyleUtils.clearCache('test');
      const stats = PerformantStyleUtils.getCacheStats();

      expect(stats.keys).toContain('other-1');
      expect(stats.keys).not.toContain('test-1');
    });

    it('should clear entire cache when no pattern provided', () => {
      PerformantStyleUtils.createCachedStyles({ padding: 16 }, 'test-1');
      PerformantStyleUtils.createCachedStyles({ margin: 8 }, 'test-2');

      PerformantStyleUtils.clearCache();
      const stats = PerformantStyleUtils.getCacheStats();

      expect(stats.size).toBe(0);
    });
  });
});

describe('StyleMergeUtils', () => {
  describe('mergeStyles', () => {
    it('should merge multiple style objects', () => {
      const style1 = { padding: 16, margin: 8 };
      const style2 = { backgroundColor: 'red', padding: 24 };
      const style3 = { borderRadius: 4 };

      const result = StyleMergeUtils.mergeStyles(style1, style2, style3);

      expect(result).toEqual({
        padding: 24,
        margin: 8,
        backgroundColor: 'red',
        borderRadius: 4,
      });
    });

    it('should handle undefined and null values', () => {
      const style1 = { padding: 16 };
      const result = StyleMergeUtils.mergeStyles(style1, undefined, null, {
        margin: 8,
      });

      expect(result).toEqual({
        padding: 16,
        margin: 8,
      });
    });
  });

  describe('conditionalMerge', () => {
    it('should merge styles based on conditions', () => {
      const baseStyle = { padding: 16 };
      const conditionalStyles = [
        { condition: true, style: { margin: 8 } },
        { condition: false, style: { backgroundColor: 'red' } },
        { condition: true, style: { borderRadius: 4 } },
      ];

      const result = StyleMergeUtils.conditionalMerge(
        baseStyle,
        conditionalStyles
      );

      expect(result).toEqual({
        padding: 16,
        margin: 8,
        borderRadius: 4,
      });
    });
  });

  describe('mergeWithPriority', () => {
    it('should merge styles based on priority', () => {
      const stylesWithPriority = [
        { style: { padding: 16, margin: 8 }, priority: 2 },
        { style: { padding: 24, backgroundColor: 'red' }, priority: 1 },
        { style: { borderRadius: 4 }, priority: 3 },
      ];

      const result = StyleMergeUtils.mergeWithPriority(...stylesWithPriority);

      expect(result).toEqual({
        padding: 16, // From priority 2, overriding priority 1
        margin: 8,
        backgroundColor: 'red',
        borderRadius: 4,
      });
    });
  });
});

describe('LayoutUtils', () => {
  describe('createFlexStyles', () => {
    it('should create flex layout styles', () => {
      const options = {
        direction: 'row' as const,
        justify: 'center' as const,
        align: 'flex-start' as const,
        wrap: 'wrap' as const,
        flex: 1,
      };

      const result = LayoutUtils.createFlexStyles(options);

      expect(result).toEqual({
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        flex: 1,
      });
    });

    it('should use default values when options not provided', () => {
      const result = LayoutUtils.createFlexStyles({});

      expect(result).toEqual({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
      });
    });
  });

  describe('createPositionStyles', () => {
    it('should create positioning styles', () => {
      const options = {
        position: 'absolute' as const,
        top: 10,
        right: '50%',
        zIndex: 999,
      };

      const result = LayoutUtils.createPositionStyles(options);

      expect(result).toEqual({
        position: 'absolute',
        top: 10,
        right: '50%',
        zIndex: 999,
      });
    });

    it('should handle undefined values', () => {
      const result = LayoutUtils.createPositionStyles({
        position: 'relative',
        top: undefined,
      });

      expect(result).toEqual({
        position: 'relative',
      });
    });
  });

  describe('createDimensionStyles', () => {
    it('should create dimension styles', () => {
      const options = {
        width: 100,
        height: '50%',
        minWidth: 50,
        maxHeight: 200,
        aspectRatio: 1.5,
      };

      const result = LayoutUtils.createDimensionStyles(options);

      expect(result).toEqual({
        width: 100,
        height: '50%',
        minWidth: 50,
        maxHeight: 200,
        aspectRatio: 1.5,
      });
    });
  });
});

describe('StyleUtils', () => {
  describe('create', () => {
    it('should create styles without theme', () => {
      const styles = { padding: 16, margin: 8 };
      const result = StyleUtils.create(styles);

      expect(result).toEqual(styles);
    });

    it('should create themed styles', () => {
      const styles = { padding: 16, margin: 8 };
      const result = StyleUtils.create(styles, mockTheme);

      expect(result).toEqual(styles);
    });
  });

  describe('createResponsiveThemedStyles', () => {
    it('should create responsive themed styles', () => {
      const styles = {
        fontSize: { xs: 14, md: 16 },
        padding: { xs: 8, md: 12 },
      };

      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 800,
        height: 667,
      });
      const result = StyleUtils.createResponsiveThemedStyles(styles, mockTheme);

      expect(result.fontSize).toBe(16);
      expect(result.padding).toBe(12);
    });
  });
});
