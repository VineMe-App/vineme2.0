/**
 * Color Utilities and Accessibility Tests
 */

import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  withOpacity,
  lighten,
  darken,
  saturate,
  desaturate,
  getLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAALarge,
  meetsWCAGAAA,
  meetsWCAGAAALarge,
  getAccessibilityLevel,
  findAccessibleColor,
  getAccessibleTextColor,
  generateColorVariants,
  generateSemanticVariants,
  generateThemeColors,
  ensureAccessibleColor,
  generateAccessiblePalette,
  mixColors,
  getComplementaryColor,
  getAnalogousColors,
  isValidHexColor,
  colorUtils,
  WCAG_STANDARDS,
} from '../colors';

describe('Color Conversion Functions', () => {
  describe('hexToRgb', () => {
    it('should convert hex to RGB correctly', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should handle hex without # prefix', () => {
      expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#gggggg')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB to hex correctly', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });

    it('should clamp values to valid range', () => {
      expect(rgbToHex(300, -10, 128)).toBe('#ff0080');
    });
  });

  describe('rgbToHsl and hslToRgb', () => {
    it('should convert RGB to HSL and back correctly', () => {
      const testCases = [
        { r: 255, g: 0, b: 0 }, // Red
        { r: 0, g: 255, b: 0 }, // Green
        { r: 0, g: 0, b: 255 }, // Blue
        { r: 255, g: 255, b: 255 }, // White
        { r: 0, g: 0, b: 0 }, // Black
        { r: 128, g: 128, b: 128 }, // Gray
      ];

      testCases.forEach(({ r, g, b }) => {
        const hsl = rgbToHsl(r, g, b);
        const backToRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
        
        // Allow for small rounding differences
        expect(Math.abs(backToRgb.r - r)).toBeLessThanOrEqual(1);
        expect(Math.abs(backToRgb.g - g)).toBeLessThanOrEqual(1);
        expect(Math.abs(backToRgb.b - b)).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe('Color Manipulation Functions', () => {
  describe('withOpacity', () => {
    it('should add opacity to hex color', () => {
      expect(withOpacity('#ff0000', 0.5)).toBe('#ff000080');
      expect(withOpacity('#ffffff', 1)).toBe('#ffffffff');
      expect(withOpacity('#000000', 0)).toBe('#00000000');
    });

    it('should clamp opacity values', () => {
      expect(withOpacity('#ff0000', 1.5)).toBe('#ff0000ff');
      expect(withOpacity('#ff0000', -0.5)).toBe('#ff000000');
    });
  });

  describe('lighten', () => {
    it('should lighten colors correctly', () => {
      const darkBlue = '#000080';
      const lightened = lighten(darkBlue, 20);
      
      // Should be lighter than original
      const originalLum = getLuminance(darkBlue);
      const lightenedLum = getLuminance(lightened);
      expect(lightenedLum).toBeGreaterThan(originalLum);
    });

    it('should not exceed maximum lightness', () => {
      const white = '#ffffff';
      const lightened = lighten(white, 50);
      expect(lightened).toBe('#ffffff');
    });
  });

  describe('darken', () => {
    it('should darken colors correctly', () => {
      const lightBlue = '#87ceeb';
      const darkened = darken(lightBlue, 20);
      
      // Should be darker than original
      const originalLum = getLuminance(lightBlue);
      const darkenedLum = getLuminance(darkened);
      expect(darkenedLum).toBeLessThan(originalLum);
    });

    it('should not go below minimum darkness', () => {
      const black = '#000000';
      const darkened = darken(black, 50);
      expect(darkened).toBe('#000000');
    });
  });

  describe('saturate and desaturate', () => {
    it('should adjust saturation correctly', () => {
      const gray = '#808080';
      const saturated = saturate(gray, 50);
      const desaturated = desaturate(saturated, 25);
      
      // Saturated should be more colorful than gray
      // Desaturated should be less colorful than saturated
      expect(saturated).not.toBe(gray);
      expect(desaturated).not.toBe(saturated);
    });
  });
});

describe('Accessibility Functions', () => {
  describe('getLuminance', () => {
    it('should calculate luminance correctly for known values', () => {
      expect(getLuminance('#ffffff')).toBeCloseTo(1, 2);
      expect(getLuminance('#000000')).toBeCloseTo(0, 2);
      
      // Gray should be in between
      const grayLum = getLuminance('#808080');
      expect(grayLum).toBeGreaterThan(0);
      expect(grayLum).toBeLessThan(1);
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast ratios correctly', () => {
      // Black on white should have maximum contrast
      const blackWhiteRatio = getContrastRatio('#000000', '#ffffff');
      expect(blackWhiteRatio).toBeCloseTo(21, 0);
      
      // Same colors should have minimum contrast
      const sameColorRatio = getContrastRatio('#ff0000', '#ff0000');
      expect(sameColorRatio).toBeCloseTo(1, 1);
    });
  });

  describe('WCAG Compliance Functions', () => {
    it('should correctly identify WCAG AA compliance', () => {
      // Black on white meets AA
      expect(meetsWCAGAA('#000000', '#ffffff')).toBe(true);
      
      // Light gray on white fails AA
      expect(meetsWCAGAA('#cccccc', '#ffffff')).toBe(false);
    });

    it('should correctly identify WCAG AAA compliance', () => {
      // Black on white meets AAA
      expect(meetsWCAGAAA('#000000', '#ffffff')).toBe(true);
      
      // Dark gray on white might meet AA but not AAA
      expect(meetsWCAGAAA('#666666', '#ffffff')).toBe(false);
    });

    it('should handle large text standards', () => {
      // Some combinations might pass for large text but not normal text
      const ratio = getContrastRatio('#777777', '#ffffff');
      if (ratio >= 3 && ratio < 4.5) {
        expect(meetsWCAGAALarge('#777777', '#ffffff')).toBe(true);
        expect(meetsWCAGAA('#777777', '#ffffff')).toBe(false);
      }
    });
  });

  describe('getAccessibilityLevel', () => {
    it('should return correct accessibility levels', () => {
      expect(getAccessibilityLevel('#000000', '#ffffff')).toBe('AAA');
      expect(getAccessibilityLevel('#cccccc', '#ffffff')).toBe('Fail');
    });
  });

  describe('findAccessibleColor', () => {
    it('should find accessible color from palette', () => {
      const palette = ['#cccccc', '#999999', '#666666', '#333333', '#000000'];
      const background = '#ffffff';
      
      const accessibleColor = findAccessibleColor(background, palette, 'AA');
      expect(accessibleColor).not.toBeNull();
      
      if (accessibleColor) {
        expect(meetsWCAGAA(accessibleColor, background)).toBe(true);
      }
    });

    it('should return null if no accessible color found', () => {
      const palette = ['#f0f0f0', '#e0e0e0', '#d0d0d0'];
      const background = '#ffffff';
      
      const accessibleColor = findAccessibleColor(background, palette, 'AA');
      expect(accessibleColor).toBeNull();
    });
  });

  describe('getAccessibleTextColor', () => {
    it('should return appropriate text color for backgrounds', () => {
      // Light background should get dark text
      expect(getAccessibleTextColor('#ffffff')).toBe('#000000');
      
      // Dark background should get light text
      expect(getAccessibleTextColor('#000000')).toBe('#ffffff');
    });
  });
});

describe('Color Generation Functions', () => {
  describe('generateColorVariants', () => {
    it('should generate complete color palette', () => {
      const variants = generateColorVariants('#3b82f6');
      
      expect(variants).toHaveProperty('50');
      expect(variants).toHaveProperty('500', '#3b82f6');
      expect(variants).toHaveProperty('900');
      
      // Lighter variants should have higher luminance
      const lum50 = getLuminance(variants[50]);
      const lum500 = getLuminance(variants[500]);
      const lum900 = getLuminance(variants[900]);
      
      expect(lum50).toBeGreaterThan(lum500);
      expect(lum500).toBeGreaterThan(lum900);
    });

    it('should throw error for invalid color', () => {
      expect(() => generateColorVariants('invalid')).toThrow();
    });
  });

  describe('generateSemanticVariants', () => {
    it('should generate semantic color variants', () => {
      const variants = generateSemanticVariants('#3b82f6');
      
      expect(variants).toHaveProperty('default', '#3b82f6');
      expect(variants).toHaveProperty('hover');
      expect(variants).toHaveProperty('active');
      expect(variants).toHaveProperty('disabled');
      expect(variants).toHaveProperty('focus');
      expect(variants).toHaveProperty('muted');
    });
  });

  describe('generateThemeColors', () => {
    it('should generate theme-appropriate colors', () => {
      const baseColors = {
        primary: '#3b82f6',
        secondary: '#6b7280',
      };
      
      const lightTheme = generateThemeColors(baseColors, false);
      const darkTheme = generateThemeColors(baseColors, true);
      
      expect(lightTheme).toHaveProperty('primary');
      expect(lightTheme).toHaveProperty('secondary');
      expect(darkTheme).toHaveProperty('primary');
      expect(darkTheme).toHaveProperty('secondary');
    });
  });

  describe('ensureAccessibleColor', () => {
    it('should adjust color to meet accessibility requirements', () => {
      const inaccessibleColor = '#cccccc';
      const background = '#ffffff';
      
      const accessibleColor = ensureAccessibleColor(inaccessibleColor, background);
      expect(meetsWCAGAA(accessibleColor, background)).toBe(true);
    });

    it('should return original color if already accessible', () => {
      const accessibleColor = '#000000';
      const background = '#ffffff';
      
      const result = ensureAccessibleColor(accessibleColor, background);
      expect(result).toBe(accessibleColor);
    });
  });
});

describe('Color Harmony Functions', () => {
  describe('mixColors', () => {
    it('should mix colors correctly', () => {
      const red = '#ff0000';
      const blue = '#0000ff';
      const mixed = mixColors(red, blue, 0.5);
      
      // Should be purple-ish
      const rgb = hexToRgb(mixed);
      expect(rgb?.r).toBeGreaterThan(0);
      expect(rgb?.b).toBeGreaterThan(0);
      expect(rgb?.g).toBe(0);
    });

    it('should handle edge ratios', () => {
      const red = '#ff0000';
      const blue = '#0000ff';
      
      expect(mixColors(red, blue, 0)).toBe(red);
      expect(mixColors(red, blue, 1)).toBe(blue);
    });
  });

  describe('getComplementaryColor', () => {
    it('should generate complementary colors', () => {
      const red = '#ff0000';
      const complementary = getComplementaryColor(red);
      
      // Complementary of red should be cyan-ish
      expect(complementary).not.toBe(red);
      
      const redRgb = hexToRgb(red);
      const compRgb = hexToRgb(complementary);
      
      if (redRgb && compRgb) {
        // Red component should be low in complementary
        expect(compRgb.r).toBeLessThan(redRgb.r);
      }
    });
  });

  describe('getAnalogousColors', () => {
    it('should generate analogous colors', () => {
      const base = '#ff0000';
      const [analog1, analog2] = getAnalogousColors(base);
      
      expect(analog1).not.toBe(base);
      expect(analog2).not.toBe(base);
      expect(analog1).not.toBe(analog2);
    });
  });
});

describe('Validation Functions', () => {
  describe('isValidHexColor', () => {
    it('should validate hex colors correctly', () => {
      expect(isValidHexColor('#ffffff')).toBe(true);
      expect(isValidHexColor('#fff')).toBe(true);
      expect(isValidHexColor('#123abc')).toBe(true);
      
      expect(isValidHexColor('ffffff')).toBe(false);
      expect(isValidHexColor('#gggggg')).toBe(false);
      expect(isValidHexColor('#12345')).toBe(false);
      expect(isValidHexColor('invalid')).toBe(false);
    });
  });
});

describe('colorUtils object', () => {
  it('should export all utility functions', () => {
    expect(colorUtils).toHaveProperty('hexToRgb');
    expect(colorUtils).toHaveProperty('getContrastRatio');
    expect(colorUtils).toHaveProperty('meetsWCAGAA');
    expect(colorUtils).toHaveProperty('generateColorVariants');
    expect(colorUtils).toHaveProperty('WCAG_STANDARDS');
  });

  it('should have correct WCAG standards', () => {
    expect(colorUtils.WCAG_STANDARDS.AA_NORMAL).toBe(4.5);
    expect(colorUtils.WCAG_STANDARDS.AA_LARGE).toBe(3);
    expect(colorUtils.WCAG_STANDARDS.AAA_NORMAL).toBe(7);
    expect(colorUtils.WCAG_STANDARDS.AAA_LARGE).toBe(4.5);
  });
});

describe('Integration Tests', () => {
  it('should work with real-world color scenarios', () => {
    // Test a complete workflow: generate palette, ensure accessibility
    const brandColor = '#3b82f6';
    const variants = generateColorVariants(brandColor);
    const backgrounds = ['#ffffff', '#f8fafc', '#1e293b'];
    
    // Ensure we can find accessible combinations
    backgrounds.forEach(bg => {
      const accessibleVariant = findAccessibleColor(bg, Object.values(variants));
      expect(accessibleVariant).not.toBeNull();
    });
  });

  it('should maintain color relationships through transformations', () => {
    const baseColor = '#3b82f6';
    const lightened = lighten(baseColor, 20);
    const darkened = darken(baseColor, 20);
    
    // Verify luminance relationships
    const baseLum = getLuminance(baseColor);
    const lightLum = getLuminance(lightened);
    const darkLum = getLuminance(darkened);
    
    expect(lightLum).toBeGreaterThan(baseLum);
    expect(darkLum).toBeLessThan(baseLum);
  });
});