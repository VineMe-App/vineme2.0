/**
 * Accessibility-focused tests for color utilities
 * Tests WCAG compliance and accessibility features specifically
 */

import {
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAALarge,
  meetsWCAGAAA,
  meetsWCAGAAALarge,
  getAccessibilityLevel,
  findAccessibleColor,
  getAccessibleTextColor,
  ensureAccessibleColor,
  generateAccessiblePalette,
  WCAG_STANDARDS,
} from '../colors';

describe('WCAG Accessibility Compliance', () => {
  // Test cases with known contrast ratios
  const testCases = [
    { fg: '#000000', bg: '#ffffff', ratio: 21, level: 'AAA' },
    { fg: '#ffffff', bg: '#000000', ratio: 21, level: 'AAA' },
    { fg: '#767676', bg: '#ffffff', ratio: 4.54, level: 'AA' },
    { fg: '#949494', bg: '#ffffff', ratio: 3.05, level: 'AA Large' },
    { fg: '#cccccc', bg: '#ffffff', ratio: 1.61, level: 'Fail' },
  ];

  describe('Contrast Ratio Calculations', () => {
    testCases.forEach(({ fg, bg, ratio, level }) => {
      it(`should calculate correct contrast ratio for ${fg} on ${bg}`, () => {
        const calculatedRatio = getContrastRatio(fg, bg);
        expect(calculatedRatio).toBeCloseTo(ratio, 1);
      });
    });

    it('should handle identical colors', () => {
      expect(getContrastRatio('#ff0000', '#ff0000')).toBeCloseTo(1, 1);
    });

    it('should be symmetric', () => {
      const ratio1 = getContrastRatio('#000000', '#ffffff');
      const ratio2 = getContrastRatio('#ffffff', '#000000');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });
  });

  describe('WCAG AA Compliance', () => {
    it('should correctly identify AA compliant combinations', () => {
      // Known AA compliant combinations
      expect(meetsWCAGAA('#000000', '#ffffff')).toBe(true);
      expect(meetsWCAGAA('#767676', '#ffffff')).toBe(true);
      expect(meetsWCAGAA('#ffffff', '#767676')).toBe(true);
    });

    it('should correctly identify AA non-compliant combinations', () => {
      // Known non-compliant combinations
      expect(meetsWCAGAA('#cccccc', '#ffffff')).toBe(false);
      expect(meetsWCAGAA('#e0e0e0', '#ffffff')).toBe(false);
    });

    it('should handle large text standards correctly', () => {
      // Color that meets AA Large but not AA Normal
      const borderlineColor = '#949494';
      const background = '#ffffff';
      
      expect(meetsWCAGAALarge(borderlineColor, background)).toBe(true);
      expect(meetsWCAGAA(borderlineColor, background)).toBe(false);
    });
  });

  describe('WCAG AAA Compliance', () => {
    it('should correctly identify AAA compliant combinations', () => {
      expect(meetsWCAGAAA('#000000', '#ffffff')).toBe(true);
      expect(meetsWCAGAAA('#ffffff', '#000000')).toBe(true);
    });

    it('should correctly identify AAA non-compliant combinations', () => {
      // Colors that meet AA but not AAA
      expect(meetsWCAGAAA('#767676', '#ffffff')).toBe(false);
      expect(meetsWCAGAAA('#595959', '#ffffff')).toBe(true); // This should meet AAA
    });

    it('should handle AAA large text standards', () => {
      // Test AAA large text requirements
      const color = '#767676';
      const background = '#ffffff';
      
      expect(meetsWCAGAAALarge(color, background)).toBe(true);
      expect(meetsWCAGAAA(color, background)).toBe(false);
    });
  });

  describe('Accessibility Level Detection', () => {
    testCases.forEach(({ fg, bg, level }) => {
      it(`should return ${level} for ${fg} on ${bg}`, () => {
        expect(getAccessibilityLevel(fg, bg)).toBe(level);
      });
    });
  });

  describe('Accessible Color Finding', () => {
    const lightPalette = [
      '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd',
      '#6c757d', '#495057', '#343a40', '#212529', '#000000'
    ];

    const darkPalette = [
      '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da',
      '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529'
    ];

    it('should find accessible color for light backgrounds', () => {
      const lightBg = '#ffffff';
      const accessibleColor = findAccessibleColor(lightBg, lightPalette, 'AA');
      
      expect(accessibleColor).not.toBeNull();
      if (accessibleColor) {
        expect(meetsWCAGAA(accessibleColor, lightBg)).toBe(true);
      }
    });

    it('should find accessible color for dark backgrounds', () => {
      const darkBg = '#000000';
      const accessibleColor = findAccessibleColor(darkBg, darkPalette, 'AA');
      
      expect(accessibleColor).not.toBeNull();
      if (accessibleColor) {
        expect(meetsWCAGAA(accessibleColor, darkBg)).toBe(true);
      }
    });

    it('should respect AAA standards when requested', () => {
      const background = '#ffffff';
      const accessibleColor = findAccessibleColor(background, lightPalette, 'AAA');
      
      if (accessibleColor) {
        expect(meetsWCAGAAA(accessibleColor, background)).toBe(true);
      }
    });

    it('should return null when no accessible color exists', () => {
      const similarColors = ['#f0f0f0', '#f5f5f5', '#fafafa'];
      const background = '#ffffff';
      
      const result = findAccessibleColor(background, similarColors, 'AA');
      expect(result).toBeNull();
    });
  });

  describe('Accessible Text Color Generation', () => {
    it('should return dark text for light backgrounds', () => {
      const lightBackgrounds = ['#ffffff', '#f8f9fa', '#e9ecef'];
      
      lightBackgrounds.forEach(bg => {
        const textColor = getAccessibleTextColor(bg);
        expect(textColor).toBe('#000000');
        expect(meetsWCAGAA(textColor, bg)).toBe(true);
      });
    });

    it('should return light text for dark backgrounds', () => {
      const darkBackgrounds = ['#000000', '#212529', '#343a40'];
      
      darkBackgrounds.forEach(bg => {
        const textColor = getAccessibleTextColor(bg);
        expect(textColor).toBe('#ffffff');
        expect(meetsWCAGAA(textColor, bg)).toBe(true);
      });
    });

    it('should use custom light and dark colors when provided', () => {
      const background = '#ffffff';
      const customLight = '#f0f0f0';
      const customDark = '#333333';
      
      const textColor = getAccessibleTextColor(background, customLight, customDark);
      expect([customLight, customDark]).toContain(textColor);
    });
  });

  describe('Accessible Color Adjustment', () => {
    it('should adjust inaccessible colors to meet standards', () => {
      const inaccessibleColor = '#cccccc';
      const background = '#ffffff';
      
      // Verify it's initially inaccessible
      expect(meetsWCAGAA(inaccessibleColor, background)).toBe(false);
      
      const adjustedColor = ensureAccessibleColor(inaccessibleColor, background);
      expect(meetsWCAGAA(adjustedColor, background)).toBe(true);
    });

    it('should not modify already accessible colors', () => {
      const accessibleColor = '#000000';
      const background = '#ffffff';
      
      const result = ensureAccessibleColor(accessibleColor, background);
      expect(result).toBe(accessibleColor);
    });

    it('should respect custom contrast requirements', () => {
      const color = '#767676';
      const background = '#ffffff';
      const customRatio = 7; // AAA standard
      
      const adjustedColor = ensureAccessibleColor(color, background, customRatio);
      expect(getContrastRatio(adjustedColor, background)).toBeGreaterThanOrEqual(customRatio);
    });

    it('should work with dark backgrounds', () => {
      const lightColor = '#cccccc';
      const darkBackground = '#000000';
      
      const adjustedColor = ensureAccessibleColor(lightColor, darkBackground);
      expect(meetsWCAGAA(adjustedColor, darkBackground)).toBe(true);
    });
  });

  describe('Accessible Palette Generation', () => {
    it('should generate accessible palettes for multiple backgrounds', () => {
      const baseColors = {
        primary: '#3b82f6',
        secondary: '#6b7280',
        success: '#10b981',
      };
      
      const backgrounds = ['#ffffff', '#f8fafc', '#1e293b'];
      const palette = generateAccessiblePalette(baseColors, backgrounds);
      
      expect(palette).toHaveProperty('primary');
      expect(palette).toHaveProperty('secondary');
      expect(palette).toHaveProperty('success');
      
      // Verify that each color has accessible variants for at least one background
      Object.entries(palette).forEach(([colorName, colorVariants]) => {
        const hasAccessibleCombination = backgrounds.some(bg => 
          Object.values(colorVariants).some(variant => 
            meetsWCAGAA(variant, bg)
          )
        );
        expect(hasAccessibleCombination).toBe(true);
      });
    });
  });

  describe('Real-world Accessibility Scenarios', () => {
    it('should handle common UI color combinations', () => {
      const commonCombinations = [
        { name: 'Primary button', fg: '#ffffff', bg: '#3b82f6' },
        { name: 'Success message', fg: '#065f46', bg: '#d1fae5' },
        { name: 'Error message', fg: '#991b1b', bg: '#fee2e2' },
        { name: 'Warning message', fg: '#92400e', bg: '#fef3c7' },
        { name: 'Info message', fg: '#1e40af', bg: '#dbeafe' },
      ];

      commonCombinations.forEach(({ name, fg, bg }) => {
        const level = getAccessibilityLevel(fg, bg);
        expect(['AA', 'AAA', 'AA Large']).toContain(level);
      });
    });

    it('should validate form input states', () => {
      const inputStates = [
        { state: 'normal', border: '#d1d5db', bg: '#ffffff' },
        { state: 'focus', border: '#3b82f6', bg: '#ffffff' },
        { state: 'error', border: '#ef4444', bg: '#ffffff' },
        { state: 'success', border: '#10b981', bg: '#ffffff' },
      ];

      inputStates.forEach(({ state, border, bg }) => {
        // Border should have sufficient contrast with background
        const ratio = getContrastRatio(border, bg);
        // Some borders might be subtle, so we'll check they're at least perceivable
        expect(ratio).toBeGreaterThanOrEqual(1.2); // Minimum perceivable difference
      });
    });

    it('should validate navigation and interactive elements', () => {
      const interactiveElements = [
        { element: 'link', color: '#2563eb', bg: '#ffffff' },
        { element: 'visited link', color: '#7c3aed', bg: '#ffffff' },
        { element: 'button text', color: '#ffffff', bg: '#1f2937' },
        { element: 'disabled button', color: '#9ca3af', bg: '#f3f4f6' },
      ];

      interactiveElements.forEach(({ element, color, bg }) => {
        if (element !== 'disabled button') {
          // Active elements should meet AA standards
          expect(meetsWCAGAA(color, bg)).toBe(true);
        } else {
          // Disabled elements have relaxed requirements but should still be perceivable
          const ratio = getContrastRatio(color, bg);
          expect(ratio).toBeGreaterThanOrEqual(2);
        }
      });
    });
  });

  describe('WCAG Standards Constants', () => {
    it('should have correct WCAG standard values', () => {
      expect(WCAG_STANDARDS.AA_NORMAL).toBe(4.5);
      expect(WCAG_STANDARDS.AA_LARGE).toBe(3);
      expect(WCAG_STANDARDS.AAA_NORMAL).toBe(7);
      expect(WCAG_STANDARDS.AAA_LARGE).toBe(4.5);
    });
  });
});