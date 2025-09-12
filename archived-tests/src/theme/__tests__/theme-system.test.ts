/**
 * Theme System Foundation Tests
 * Tests for the enhanced theme system foundation
 */

import {
  lightTheme,
  darkTheme,
  colorUtils,
  spacingUtils,
  shadowUtils,
  borderRadiusUtils,
  primaryColors,
  spacing,
  shadows,
  borderRadius,
} from '../index';

describe('Theme System Foundation', () => {
  describe('Color System', () => {
    it('should have complete color token structure', () => {
      expect(primaryColors).toHaveProperty('50');
      expect(primaryColors).toHaveProperty('500');
      expect(primaryColors).toHaveProperty('900');
    });

    it('should have semantic colors in themes', () => {
      expect(lightTheme.colors).toHaveProperty('primary');
      expect(lightTheme.colors).toHaveProperty('success');
      expect(lightTheme.colors).toHaveProperty('error');
      expect(lightTheme.colors).toHaveProperty('background');
      expect(lightTheme.colors).toHaveProperty('text');
    });

    it('should provide accessibility utilities', () => {
      const contrastRatio = colorUtils.getContrastRatio('#ffffff', '#000000');
      expect(contrastRatio).toBeGreaterThan(1);
      
      const meetsWCAG = colorUtils.meetsWCAGAA('#ffffff', '#000000');
      expect(meetsWCAG).toBe(true);
    });

    it('should support opacity modifications', () => {
      const colorWithOpacity = colorUtils.withOpacity('#ff0000', 0.5);
      expect(colorWithOpacity).toMatch(/#ff000080/i);
    });
  });

  describe('Typography System', () => {
    it('should have complete typography configuration', () => {
      expect(lightTheme.typography).toHaveProperty('fontFamily');
      expect(lightTheme.typography).toHaveProperty('fontSize');
      expect(lightTheme.typography).toHaveProperty('lineHeight');
      expect(lightTheme.typography).toHaveProperty('fontWeight');
      expect(lightTheme.typography).toHaveProperty('letterSpacing');
    });

    it('should have proper font size scale', () => {
      expect(lightTheme.typography.fontSize.xs).toBeLessThan(lightTheme.typography.fontSize.sm);
      expect(lightTheme.typography.fontSize.sm).toBeLessThan(lightTheme.typography.fontSize.base);
      expect(lightTheme.typography.fontSize.base).toBeLessThan(lightTheme.typography.fontSize.lg);
    });
  });

  describe('Spacing System', () => {
    it('should have complete spacing scale', () => {
      expect(spacing).toHaveProperty('0');
      expect(spacing).toHaveProperty('4');
      expect(spacing).toHaveProperty('8');
      expect(spacing).toHaveProperty('96');
    });

    it('should provide spacing utilities', () => {
      const spaceValue = spacingUtils.get('4');
      expect(spaceValue).toBe(16);

      const multipleValues = spacingUtils.getMultiple('2', '4', '8');
      expect(multipleValues).toEqual([8, 16, 32]);
    });

    it('should create symmetric padding', () => {
      const symmetricPadding = spacingUtils.symmetric('4', '2');
      expect(symmetricPadding).toEqual({
        paddingHorizontal: 16,
        paddingVertical: 8,
      });
    });
  });

  describe('Shadow System', () => {
    it('should have complete shadow definitions', () => {
      expect(shadows).toHaveProperty('none');
      expect(shadows).toHaveProperty('sm');
      expect(shadows).toHaveProperty('lg');
      expect(shadows).toHaveProperty('3xl');
    });

    it('should provide shadow utilities', () => {
      const shadowStyle = shadowUtils.getShadowStyle('md');
      expect(shadowStyle).toHaveProperty('shadowColor');
      expect(shadowStyle).toHaveProperty('shadowOffset');
      expect(shadowStyle).toHaveProperty('shadowOpacity');
      expect(shadowStyle).toHaveProperty('shadowRadius');
      expect(shadowStyle).toHaveProperty('elevation');
    });

    it('should support custom shadow colors', () => {
      const customShadow = shadowUtils.withColor('md', '#ff0000');
      expect(customShadow.shadowColor).toBe('#ff0000');
    });
  });

  describe('Border Radius System', () => {
    it('should have complete border radius scale', () => {
      expect(borderRadius).toHaveProperty('none');
      expect(borderRadius).toHaveProperty('sm');
      expect(borderRadius).toHaveProperty('lg');
      expect(borderRadius).toHaveProperty('full');
    });

    it('should provide border radius utilities', () => {
      const radiusValue = borderRadiusUtils.get('md');
      expect(radiusValue).toBe(6);

      const topRadius = borderRadiusUtils.top('lg');
      expect(topRadius).toEqual({
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      });
    });
  });

  describe('Theme Configurations', () => {
    it('should have light and dark themes', () => {
      expect(lightTheme.name).toBe('light');
      expect(darkTheme.name).toBe('dark');
    });

    it('should have different background colors for light and dark themes', () => {
      expect(lightTheme.colors.background.primary).not.toBe(darkTheme.colors.background.primary);
      expect(lightTheme.colors.text.primary).not.toBe(darkTheme.colors.text.primary);
    });

    it('should have consistent structure across themes', () => {
      const lightKeys = Object.keys(lightTheme);
      const darkKeys = Object.keys(darkTheme);
      expect(lightKeys.sort()).toEqual(darkKeys.sort());
    });
  });
});