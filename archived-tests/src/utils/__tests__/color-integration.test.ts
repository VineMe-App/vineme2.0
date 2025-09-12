/**
 * Integration tests for color utilities with the theme system
 */

import { colorUtils, generateColorVariants, generateAccessiblePalette } from '../colors';
import { primaryColors, secondaryColors, successColors } from '../../theme/tokens/colors';

describe('Color Utilities Integration with Theme System', () => {
  describe('Theme Color Enhancement', () => {
    it('should enhance existing theme colors with accessibility features', () => {
      const baseColor = primaryColors[500];
      const variants = generateColorVariants(baseColor);
      
      // Should generate all required variants
      expect(variants).toHaveProperty('50');
      expect(variants).toHaveProperty('500', baseColor);
      expect(variants).toHaveProperty('900');
      
      // Variants should maintain proper luminance relationships
      const lum50 = colorUtils.getLuminance(variants[50]);
      const lum500 = colorUtils.getLuminance(variants[500]);
      const lum900 = colorUtils.getLuminance(variants[900]);
      
      expect(lum50).toBeGreaterThan(lum500);
      expect(lum500).toBeGreaterThan(lum900);
    });

    it('should ensure theme colors meet accessibility standards', () => {
      const themeColors = {
        primary: primaryColors[500],
        secondary: secondaryColors[500],
        success: successColors[500],
      };
      
      const backgrounds = ['#ffffff', '#000000'];
      const accessiblePalette = generateAccessiblePalette(themeColors, backgrounds);
      
      // Each color should have accessible variants for at least one background
      Object.entries(accessiblePalette).forEach(([name, variants]) => {
        const hasAccessibleCombination = backgrounds.some(bg => 
          Object.values(variants).some(color => 
            colorUtils.meetsWCAGAA(color, bg)
          )
        );
        expect(hasAccessibleCombination).toBe(true);
      });
    });
  });

  describe('Real-world Theme Scenarios', () => {
    it('should provide accessible text colors for theme backgrounds', () => {
      const themeBackgrounds = [
        '#ffffff', // Light background
        '#f8fafc', // Very light gray
        '#1e293b', // Dark background
        '#000000', // Black background
      ];

      themeBackgrounds.forEach(bg => {
        const textColor = colorUtils.getAccessibleTextColor(bg);
        expect(colorUtils.meetsWCAGAA(textColor, bg)).toBe(true);
      });
    });

    it('should generate semantic color variants for interactive states', () => {
      const baseColor = primaryColors[500];
      const semanticVariants = colorUtils.generateSemanticVariants(baseColor);
      
      expect(semanticVariants).toHaveProperty('default', baseColor);
      expect(semanticVariants).toHaveProperty('hover');
      expect(semanticVariants).toHaveProperty('active');
      expect(semanticVariants).toHaveProperty('disabled');
      expect(semanticVariants).toHaveProperty('focus');
      expect(semanticVariants).toHaveProperty('muted');
      
      // Hover should be darker than default
      const defaultLum = colorUtils.getLuminance(semanticVariants.default);
      const hoverLum = colorUtils.getLuminance(semanticVariants.hover);
      expect(hoverLum).toBeLessThan(defaultLum);
    });

    it('should validate existing theme color combinations', () => {
      const colorCombinations = [
        { fg: primaryColors[50], bg: primaryColors[900] },
        { fg: primaryColors[900], bg: primaryColors[50] },
        { fg: successColors[700], bg: successColors[100] },
        { fg: secondaryColors[800], bg: secondaryColors[100] },
      ];

      colorCombinations.forEach(({ fg, bg }) => {
        const level = colorUtils.getAccessibilityLevel(fg, bg);
        expect(['AA', 'AAA', 'AA Large']).toContain(level);
      });
    });
  });

  describe('Color Manipulation with Theme Colors', () => {
    it('should lighten and darken theme colors appropriately', () => {
      const baseColor = primaryColors[500];
      
      const lightened = colorUtils.lighten(baseColor, 20);
      const darkened = colorUtils.darken(baseColor, 20);
      
      // Should maintain color relationships
      const baseLum = colorUtils.getLuminance(baseColor);
      const lightLum = colorUtils.getLuminance(lightened);
      const darkLum = colorUtils.getLuminance(darkened);
      
      expect(lightLum).toBeGreaterThan(baseLum);
      expect(darkLum).toBeLessThan(baseLum);
    });

    it('should adjust theme colors for accessibility when needed', () => {
      // Test with a potentially inaccessible combination
      const lightColor = primaryColors[200];
      const lightBackground = '#ffffff';
      
      const adjustedColor = colorUtils.ensureAccessibleColor(lightColor, lightBackground);
      expect(colorUtils.meetsWCAGAA(adjustedColor, lightBackground)).toBe(true);
    });

    it('should generate complementary colors for theme colors', () => {
      const baseColor = primaryColors[500];
      const complementary = colorUtils.getComplementaryColor(baseColor);
      
      expect(complementary).not.toBe(baseColor);
      
      // Complementary should be visually distinct
      const baseHsl = colorUtils.rgbToHsl(
        ...Object.values(colorUtils.hexToRgb(baseColor) || { r: 0, g: 0, b: 0 })
      );
      const compHsl = colorUtils.rgbToHsl(
        ...Object.values(colorUtils.hexToRgb(complementary) || { r: 0, g: 0, b: 0 })
      );
      
      // Hue should be approximately 180 degrees apart
      const hueDiff = Math.abs(baseHsl.h - compHsl.h);
      expect(hueDiff).toBeCloseTo(180, 30); // Allow some tolerance
    });
  });

  describe('Performance and Validation', () => {
    it('should validate hex colors correctly', () => {
      const themeColors = [
        primaryColors[500],
        secondaryColors[500],
        successColors[500],
      ];

      themeColors.forEach(color => {
        expect(colorUtils.isValidHexColor(color)).toBe(true);
      });
    });

    it('should handle color conversions efficiently', () => {
      const testColor = primaryColors[500];
      
      // Test round-trip conversion
      const rgb = colorUtils.hexToRgb(testColor);
      expect(rgb).not.toBeNull();
      
      if (rgb) {
        const backToHex = colorUtils.rgbToHex(rgb.r, rgb.g, rgb.b);
        expect(backToHex.toLowerCase()).toBe(testColor.toLowerCase());
      }
    });

    it('should provide consistent color utilities through colorUtils object', () => {
      // Verify all expected functions are available
      const expectedFunctions = [
        'hexToRgb', 'rgbToHex', 'rgbToHsl', 'hslToRgb',
        'withOpacity', 'lighten', 'darken', 'saturate', 'desaturate',
        'getLuminance', 'getContrastRatio', 'meetsWCAGAA', 'meetsWCAGAAA',
        'generateColorVariants', 'generateSemanticVariants',
        'getAccessibleTextColor', 'ensureAccessibleColor',
        'isValidHexColor'
      ];

      expectedFunctions.forEach(funcName => {
        expect(colorUtils).toHaveProperty(funcName);
        expect(typeof colorUtils[funcName as keyof typeof colorUtils]).toBe('function');
      });
    });
  });
});