import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Theme } from '../../theme/themes/types';
import { 
  LegacyStyleMapping, 
  StyleMigrationOptions, 
  LegacyStyle,
  ThemeAwareStyle 
} from './types';

/**
 * Utility class for migrating legacy styles to theme-aware styles
 */
export class StyleMigrator {
  private colorMappings: Map<string, string> = new Map();
  private spacingMappings: Map<number, string> = new Map();
  private typographyMappings: Map<string, string> = new Map();

  constructor() {
    this.initializeMappings();
  }

  /**
   * Initialize common style mappings
   */
  private initializeMappings(): void {
    // Common color mappings
    this.colorMappings.set('#fff', 'colors.background.primary');
    this.colorMappings.set('#ffffff', 'colors.background.primary');
    this.colorMappings.set('#000', 'colors.text.primary');
    this.colorMappings.set('#000000', 'colors.text.primary');
    this.colorMappings.set('#333', 'colors.text.primary');
    this.colorMappings.set('#666', 'colors.text.secondary');
    this.colorMappings.set('#888', 'colors.text.tertiary');
    this.colorMappings.set('#f0f0f0', 'colors.background.secondary');
    this.colorMappings.set('#f8f9fa', 'colors.background.secondary');
    this.colorMappings.set('#1d4ed8', 'colors.primary.600');
    this.colorMappings.set('#dc2626', 'colors.error.600');
    this.colorMappings.set('#16a34a', 'colors.success.600');
    this.colorMappings.set('#ea580c', 'colors.warning.600');

    // Common spacing mappings
    this.spacingMappings.set(4, 'spacing.xs');
    this.spacingMappings.set(6, 'spacing.sm');
    this.spacingMappings.set(8, 'spacing.sm');
    this.spacingMappings.set(12, 'spacing.md');
    this.spacingMappings.set(16, 'spacing.lg');
    this.spacingMappings.set(20, 'spacing.xl');
    this.spacingMappings.set(24, 'spacing.xl');
    this.spacingMappings.set(32, 'spacing.xxl');

    // Common typography mappings
    this.typographyMappings.set('12', 'typography.fontSize.xs');
    this.typographyMappings.set('14', 'typography.fontSize.sm');
    this.typographyMappings.set('16', 'typography.fontSize.md');
    this.typographyMappings.set('18', 'typography.fontSize.lg');
    this.typographyMappings.set('20', 'typography.fontSize.xl');
    this.typographyMappings.set('24', 'typography.fontSize.xxl');
  }

  /**
   * Migrate legacy styles to theme-aware styles
   */
  migrateStyles(
    legacyStyles: LegacyStyle,
    options: StyleMigrationOptions = { useSemanticColors: true, convertToTokens: true, preserveComments: false }
  ): { themeAwareStyles: ThemeAwareStyle; mappings: LegacyStyleMapping[] } {
    const themeAwareStyles: ThemeAwareStyle = {};
    const mappings: LegacyStyleMapping[] = [];

    for (const [styleName, styleObject] of Object.entries(legacyStyles)) {
      themeAwareStyles[styleName] = (theme: Theme) => {
        const migratedStyle: any = {};
        
        for (const [property, value] of Object.entries(styleObject)) {
          const migrationResult = this.migrateStyleProperty(property, value, theme, options);
          migratedStyle[property] = migrationResult.value;
          
          if (migrationResult.mapping) {
            mappings.push(migrationResult.mapping);
          }
        }
        
        return migratedStyle;
      };
    }

    return { themeAwareStyles, mappings };
  }

  /**
   * Migrate a single style property
   */
  private migrateStyleProperty(
    property: string,
    value: any,
    theme: Theme,
    options: StyleMigrationOptions
  ): { value: any; mapping?: LegacyStyleMapping } {
    let migratedValue = value;
    let mapping: LegacyStyleMapping | undefined;

    // Handle color properties
    if (this.isColorProperty(property) && typeof value === 'string') {
      const colorMapping = this.migrateColor(value, theme, options);
      if (colorMapping) {
        migratedValue = colorMapping.value;
        mapping = {
          legacyProperty: property,
          legacyValue: value,
          themeTokenPath: colorMapping.tokenPath,
          confidence: colorMapping.confidence,
          needsReview: colorMapping.confidence < 0.8,
        };
      }
    }

    // Handle spacing properties
    else if (this.isSpacingProperty(property) && typeof value === 'number') {
      const spacingMapping = this.migrateSpacing(value, theme);
      if (spacingMapping) {
        migratedValue = spacingMapping.value;
        mapping = {
          legacyProperty: property,
          legacyValue: value,
          themeTokenPath: spacingMapping.tokenPath,
          confidence: spacingMapping.confidence,
          needsReview: false,
        };
      }
    }

    // Handle typography properties
    else if (this.isTypographyProperty(property)) {
      const typographyMapping = this.migrateTypography(property, value, theme);
      if (typographyMapping) {
        migratedValue = typographyMapping.value;
        mapping = {
          legacyProperty: property,
          legacyValue: value,
          themeTokenPath: typographyMapping.tokenPath,
          confidence: typographyMapping.confidence,
          needsReview: typographyMapping.confidence < 0.9,
        };
      }
    }

    // Handle border radius
    else if (property === 'borderRadius' && typeof value === 'number') {
      const borderRadiusMapping = this.migrateBorderRadius(value, theme);
      if (borderRadiusMapping) {
        migratedValue = borderRadiusMapping.value;
        mapping = {
          legacyProperty: property,
          legacyValue: value,
          themeTokenPath: borderRadiusMapping.tokenPath,
          confidence: borderRadiusMapping.confidence,
          needsReview: false,
        };
      }
    }

    return { value: migratedValue, mapping };
  }

  /**
   * Check if property is color-related
   */
  private isColorProperty(property: string): boolean {
    const colorProperties = [
      'color',
      'backgroundColor',
      'borderColor',
      'shadowColor',
      'tintColor',
      'overlayColor',
    ];
    return colorProperties.includes(property);
  }

  /**
   * Check if property is spacing-related
   */
  private isSpacingProperty(property: string): boolean {
    const spacingProperties = [
      'margin',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'marginHorizontal',
      'marginVertical',
      'padding',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'paddingHorizontal',
      'paddingVertical',
      'gap',
      'rowGap',
      'columnGap',
    ];
    return spacingProperties.includes(property);
  }

  /**
   * Check if property is typography-related
   */
  private isTypographyProperty(property: string): boolean {
    const typographyProperties = [
      'fontSize',
      'fontWeight',
      'fontFamily',
      'lineHeight',
      'letterSpacing',
    ];
    return typographyProperties.includes(property);
  }

  /**
   * Migrate color value to theme token
   */
  private migrateColor(
    value: string,
    theme: Theme,
    options: StyleMigrationOptions
  ): { value: any; tokenPath: string; confidence: number } | null {
    const normalizedValue = value.toLowerCase();
    
    // Check direct mappings first
    const directMapping = this.colorMappings.get(normalizedValue);
    if (directMapping) {
      const tokenValue = this.getNestedValue(theme, directMapping);
      return {
        value: tokenValue || value,
        tokenPath: directMapping,
        confidence: 0.9,
      };
    }

    // Try to find similar colors in theme
    const similarColor = this.findSimilarColor(value, theme);
    if (similarColor) {
      return {
        value: similarColor.value,
        tokenPath: similarColor.path,
        confidence: similarColor.confidence,
      };
    }

    return null;
  }

  /**
   * Migrate spacing value to theme token
   */
  private migrateSpacing(
    value: number,
    theme: Theme
  ): { value: any; tokenPath: string; confidence: number } | null {
    const mapping = this.spacingMappings.get(value);
    if (mapping) {
      const tokenValue = this.getNestedValue(theme, mapping);
      return {
        value: tokenValue || value,
        tokenPath: mapping,
        confidence: 1.0,
      };
    }

    // Try to find closest spacing value
    const closestSpacing = this.findClosestSpacing(value, theme);
    if (closestSpacing) {
      return {
        value: closestSpacing.value,
        tokenPath: closestSpacing.path,
        confidence: closestSpacing.confidence,
      };
    }

    return null;
  }

  /**
   * Migrate typography value to theme token
   */
  private migrateTypography(
    property: string,
    value: any,
    theme: Theme
  ): { value: any; tokenPath: string; confidence: number } | null {
    if (property === 'fontSize' && typeof value === 'number') {
      const mapping = this.typographyMappings.get(value.toString());
      if (mapping) {
        const tokenValue = this.getNestedValue(theme, mapping);
        return {
          value: tokenValue || value,
          tokenPath: mapping,
          confidence: 0.9,
        };
      }
    }

    if (property === 'fontWeight') {
      const weightMapping = this.mapFontWeight(value);
      if (weightMapping) {
        const tokenValue = this.getNestedValue(theme, weightMapping.path);
        return {
          value: tokenValue || value,
          tokenPath: weightMapping.path,
          confidence: weightMapping.confidence,
        };
      }
    }

    return null;
  }

  /**
   * Migrate border radius to theme token
   */
  private migrateBorderRadius(
    value: number,
    theme: Theme
  ): { value: any; tokenPath: string; confidence: number } | null {
    const radiusMappings: Record<number, string> = {
      4: 'borderRadius.sm',
      6: 'borderRadius.md',
      8: 'borderRadius.md',
      12: 'borderRadius.lg',
      16: 'borderRadius.xl',
      20: 'borderRadius.xxl',
    };

    const mapping = radiusMappings[value];
    if (mapping) {
      const tokenValue = this.getNestedValue(theme, mapping);
      return {
        value: tokenValue || value,
        tokenPath: mapping,
        confidence: 1.0,
      };
    }

    return null;
  }

  /**
   * Find similar color in theme
   */
  private findSimilarColor(
    targetColor: string,
    theme: Theme
  ): { value: string; path: string; confidence: number } | null {
    // This is a simplified implementation
    // In a real scenario, you might want to use color distance algorithms
    return null;
  }

  /**
   * Find closest spacing value in theme
   */
  private findClosestSpacing(
    targetValue: number,
    theme: Theme
  ): { value: number; path: string; confidence: number } | null {
    const spacingValues = Array.from(this.spacingMappings.keys());
    const closest = spacingValues.reduce((prev, curr) => 
      Math.abs(curr - targetValue) < Math.abs(prev - targetValue) ? curr : prev
    );

    const difference = Math.abs(closest - targetValue);
    if (difference <= 4) { // Allow 4px difference
      const mapping = this.spacingMappings.get(closest);
      if (mapping) {
        const tokenValue = this.getNestedValue(theme, mapping);
        return {
          value: tokenValue || targetValue,
          path: mapping,
          confidence: 1 - (difference / 8), // Reduce confidence based on difference
        };
      }
    }

    return null;
  }

  /**
   * Map font weight to theme token
   */
  private mapFontWeight(
    weight: string | number
  ): { path: string; confidence: number } | null {
    const weightMappings: Record<string, string> = {
      '100': 'typography.fontWeight.thin',
      '200': 'typography.fontWeight.extraLight',
      '300': 'typography.fontWeight.light',
      '400': 'typography.fontWeight.normal',
      '500': 'typography.fontWeight.medium',
      '600': 'typography.fontWeight.semiBold',
      '700': 'typography.fontWeight.bold',
      '800': 'typography.fontWeight.extraBold',
      '900': 'typography.fontWeight.black',
      'normal': 'typography.fontWeight.normal',
      'bold': 'typography.fontWeight.bold',
    };

    const mapping = weightMappings[weight.toString()];
    if (mapping) {
      return { path: mapping, confidence: 1.0 };
    }

    return null;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate migration code for a style object
   */
  generateMigrationCode(
    styleName: string,
    legacyStyle: ViewStyle | TextStyle | ImageStyle,
    mappings: LegacyStyleMapping[]
  ): string {
    const lines: string[] = [];
    lines.push(`${styleName}: (theme: Theme) => ({`);

    for (const [property, value] of Object.entries(legacyStyle)) {
      const mapping = mappings.find(m => m.legacyProperty === property);
      
      if (mapping && mapping.confidence > 0.7) {
        if (mapping.needsReview) {
          lines.push(`  ${property}: theme.${mapping.themeTokenPath}, // TODO: Review migration - was: ${mapping.legacyValue}`);
        } else {
          lines.push(`  ${property}: theme.${mapping.themeTokenPath},`);
        }
      } else {
        lines.push(`  ${property}: ${JSON.stringify(value)}, // TODO: Migrate to theme token`);
      }
    }

    lines.push('}),');
    return lines.join('\n');
  }
}