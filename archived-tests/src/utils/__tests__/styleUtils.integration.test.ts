/**
 * Style Utilities Integration Tests
 * Tests for integration between different style utility modules
 */

import { Dimensions } from 'react-native';
import { StyleUtils } from '../styleUtils';
import { responsiveUtils } from '../responsiveHelpers';
import { PerformanceStyleUtils } from '../performanceStyleUtils';
import { lightTheme } from '../../theme/themes/light';

// Mock React Native modules
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

describe('Style Utilities Integration', () => {
  beforeEach(() => {
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });
  });

  describe('Responsive + Theme Integration', () => {
    it('should create responsive themed styles', () => {
      // Test with mobile dimensions
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 375,
        height: 667,
      });

      const responsiveStyles = {
        container: {
          xs: { padding: 8 },
          md: { padding: 16 },
          lg: { padding: 24 },
        },
        text: {
          xs: { fontSize: 14 },
          md: { fontSize: 16 },
          lg: { fontSize: 18 },
        },
      };

      const result = StyleUtils.createResponsiveThemedStyles(
        responsiveStyles,
        lightTheme
      );

      expect(result.container).toEqual({ padding: 8 });
      expect(result.text).toEqual({ fontSize: 14 });
    });

    it('should adapt to different screen sizes', () => {
      // Test with tablet dimensions (800px is 'md' breakpoint)
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 800,
        height: 1024,
      });

      const responsiveStyles = {
        container: {
          xs: { padding: 8 },
          md: { padding: 16 },
          lg: { padding: 24 },
        },
      };

      const result = StyleUtils.createResponsiveThemedStyles(
        responsiveStyles,
        lightTheme
      );

      // 800px should match 'md' breakpoint (768px), so padding should be 16
      expect(result.container).toEqual({ padding: 16 });
    });
  });

  describe('Performance + Responsive Integration', () => {
    it('should cache responsive styles efficiently', () => {
      const styleFactory = (theme: any) => ({
        container: {
          backgroundColor: theme.colors.background.primary,
          padding: responsiveUtils.sizing.getResponsivePadding(16),
        },
      });

      // Create styles multiple times - should use cache
      const result1 = PerformanceStyleUtils.cache.createThemed(
        styleFactory,
        lightTheme,
        'responsive-test'
      );
      const result2 = PerformanceStyleUtils.cache.createThemed(
        styleFactory,
        lightTheme,
        'responsive-test'
      );

      expect(result1).toBe(result2); // Same reference due to caching
    });
  });

  describe('Layout + Theme Integration', () => {
    it('should create themed layout styles', () => {
      const layoutStyles = StyleUtils.layout.createFlexStyles({
        direction: 'row',
        justify: 'space-between',
        align: 'center',
      });

      const themedStyles = StyleUtils.theme.createColorStyles(lightTheme, {
        backgroundColor: 'background.primary',
        borderColor: 'primary.500',
      });

      const mergedStyles = StyleUtils.merge.mergeStyles(
        layoutStyles,
        themedStyles
      );

      expect(mergedStyles).toEqual({
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'nowrap',
        backgroundColor: lightTheme.colors.background.primary,
        borderColor: lightTheme.colors.primary[500],
      });
    });
  });

  describe('Conditional + Responsive Integration', () => {
    it('should apply conditional styles based on device type', () => {
      const baseStyles = { padding: 16 };

      const conditionalStyles = StyleUtils.theme.applyConditionalStyles(
        baseStyles,
        [
          {
            condition: responsiveUtils.isTablet(),
            style: { padding: 24 },
          },
          {
            condition: responsiveUtils.isLandscape(),
            style: { flexDirection: 'row' as const },
          },
        ]
      );

      // Should not apply tablet styles on phone
      expect(conditionalStyles.padding).toBe(16);
    });

    it('should apply tablet-specific styles on tablet', () => {
      // Mock tablet dimensions
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 768,
        height: 1024,
      });

      const baseStyles = { padding: 16 };

      const conditionalStyles = StyleUtils.theme.applyConditionalStyles(
        baseStyles,
        [
          {
            condition: responsiveUtils.isTablet(),
            style: { padding: 24 },
          },
        ]
      );

      expect(conditionalStyles.padding).toBe(24);
    });
  });

  describe('Complete Style Pipeline', () => {
    it('should handle complete style creation pipeline', () => {
      // Mock tablet landscape
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 1024,
        height: 768,
      });

      // 1. Create responsive base styles
      const responsiveStyles = {
        container: {
          xs: { padding: 8 },
          md: { padding: 16 },
          lg: { padding: 24 },
        },
      };

      // 2. Apply theme
      const themedResponsiveStyles = StyleUtils.createResponsiveThemedStyles(
        responsiveStyles,
        lightTheme
      );

      // 3. Add layout styles
      const layoutStyles = StyleUtils.layout.createFlexStyles({
        direction: 'row',
        justify: 'center',
      });

      // 4. Add conditional styles
      const conditionalStyles = StyleUtils.theme.applyConditionalStyles({}, [
        {
          condition: responsiveUtils.isLandscape(),
          style: { marginHorizontal: 32 },
        },
      ]);

      // 5. Merge everything
      const finalStyles = StyleUtils.merge.mergeStyles(
        themedResponsiveStyles.container,
        layoutStyles,
        conditionalStyles
      );

      expect(finalStyles).toEqual({
        padding: 24, // lg breakpoint
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
        marginHorizontal: 32, // landscape condition
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should monitor performance of complex style operations', () => {
      PerformanceStyleUtils.monitor.setEnabled(true);
      PerformanceStyleUtils.monitor.clearStats();

      // Perform complex style operations
      const complexStyleFactory = (theme: any) => ({
        container: StyleUtils.merge.mergeStyles(
          StyleUtils.layout.createFlexStyles({ direction: 'column' }),
          StyleUtils.theme.createColorStyles(theme, {
            backgroundColor: 'background.primary',
          }),
          StyleUtils.theme.createSpacingStyles(theme, {
            padding: 4,
            margin: 2,
          })
        ),
      });

      PerformanceStyleUtils.createOptimizedThemedStyles(
        complexStyleFactory,
        lightTheme,
        'complex-test'
      );

      const stats = PerformanceStyleUtils.monitor.getStats();
      expect(Object.keys(stats)).toContain('themed-styles-complex-test');

      PerformanceStyleUtils.monitor.setEnabled(false);
    });
  });
});
