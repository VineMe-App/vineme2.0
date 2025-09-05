import * as fs from 'fs';
import * as path from 'path';
import { 
  ComponentMigrationResult, 
  MigrationConfig, 
  StyleMigrationOptions 
} from './types';
import { StyleMigrator } from './StyleMigrator';

/**
 * Utility class for migrating React Native components to use the new styling system
 */
export class ComponentMigrator {
  private styleMigrator: StyleMigrator;

  constructor() {
    this.styleMigrator = new StyleMigrator();
  }

  /**
   * Migrate a single component file
   */
  async migrateComponent(
    filePath: string,
    config: MigrationConfig
  ): Promise<ComponentMigrationResult> {
    try {
      const originalCode = await this.readFile(filePath);
      const result = await this.processComponentCode(originalCode, config);
      
      return {
        originalCode,
        migratedCode: result.code,
        warnings: result.warnings,
        errors: result.errors,
        success: result.errors.length === 0,
        backupPath: config.preserveOriginalStyles ? await this.createBackup(filePath, originalCode) : undefined,
      };
    } catch (error) {
      return {
        originalCode: '',
        migratedCode: '',
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        success: false,
      };
    }
  }

  /**
   * Process component code and apply migrations
   */
  private async processComponentCode(
    code: string,
    config: MigrationConfig
  ): Promise<{ code: string; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let migratedCode = code;

    try {
      // Step 1: Add theme imports
      migratedCode = this.addThemeImports(migratedCode);

      // Step 2: Add useTheme hook
      migratedCode = this.addUseThemeHook(migratedCode);

      // Step 3: Convert StyleSheet.create to theme-aware styles
      const styleConversionResult = this.convertStylesToThemeAware(migratedCode, config);
      migratedCode = styleConversionResult.code;
      warnings.push(...styleConversionResult.warnings);

      // Step 4: Update component to use theme
      migratedCode = this.updateComponentToUseTheme(migratedCode);

      // Step 5: Add compatibility layer if requested
      if (config.addCompatibilityLayer) {
        migratedCode = this.addCompatibilityLayer(migratedCode);
      }

      // Step 6: Add TypeScript types if requested
      if (config.generateTypes) {
        migratedCode = this.addTypeScriptTypes(migratedCode);
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown processing error');
    }

    return { code: migratedCode, warnings, errors };
  }

  /**
   * Add theme-related imports to the component
   */
  private addThemeImports(code: string): string {
    const imports = [
      "import { useTheme } from '../theme/provider/useTheme';",
      "import type { Theme } from '../theme/themes/types';"
    ];

    // Find the last import statement
    const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
    const matches = Array.from(code.matchAll(importRegex));
    
    if (matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      const insertPosition = lastImport.index! + lastImport[0].length;
      
      return code.slice(0, insertPosition) + '\n' + imports.join('\n') + '\n' + code.slice(insertPosition);
    }

    // If no imports found, add at the beginning
    return imports.join('\n') + '\n\n' + code;
  }

  /**
   * Add useTheme hook to the component
   */
  private addUseThemeHook(code: string): string {
    // Find the component function
    const componentRegex = /export\s+(?:default\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/;
    const match = code.match(componentRegex);
    
    if (match) {
      const insertPosition = match.index! + match[0].length;
      const themeHook = '\n  const theme = useTheme();\n';
      
      return code.slice(0, insertPosition) + themeHook + code.slice(insertPosition);
    }

    return code;
  }

  /**
   * Convert StyleSheet.create to theme-aware styles
   */
  private convertStylesToThemeAware(
    code: string,
    config: MigrationConfig
  ): { code: string; warnings: string[] } {
    const warnings: string[] = [];
    
    // Find StyleSheet.create calls
    const styleSheetRegex = /const\s+(\w+)\s*=\s*StyleSheet\.create\s*\(\s*\{([\s\S]*?)\}\s*\);?/g;
    
    let migratedCode = code;
    const matches = Array.from(code.matchAll(styleSheetRegex));
    
    for (const match of matches.reverse()) { // Reverse to maintain positions
      const [fullMatch, stylesName, stylesContent] = match;
      
      try {
        // Parse the styles object (simplified parsing)
        const parsedStyles = this.parseStylesObject(stylesContent);
        
        // Generate theme-aware styles
        const themeAwareStyles = this.generateThemeAwareStyles(parsedStyles, stylesName);
        
        // Replace the original StyleSheet.create
        migratedCode = migratedCode.slice(0, match.index!) + 
                      themeAwareStyles + 
                      migratedCode.slice(match.index! + fullMatch.length);
        
        warnings.push(`Converted ${stylesName} to theme-aware styles`);
      } catch (error) {
        warnings.push(`Failed to convert ${stylesName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { code: migratedCode, warnings };
  }

  /**
   * Parse styles object from string (simplified implementation)
   */
  private parseStylesObject(stylesContent: string): Record<string, any> {
    // This is a simplified parser - in a real implementation, you'd want to use
    // a proper AST parser like @babel/parser
    const styles: Record<string, any> = {};
    
    // Split by style names (looking for pattern: styleName: {)
    const styleRegex = /(\w+):\s*\{([^}]*)\}/g;
    const matches = Array.from(stylesContent.matchAll(styleRegex));
    
    for (const match of matches) {
      const [, styleName, styleProps] = match;
      const props: Record<string, any> = {};
      
      // Parse individual properties
      const propRegex = /(\w+):\s*([^,\n]+)/g;
      const propMatches = Array.from(styleProps.matchAll(propRegex));
      
      for (const propMatch of propMatches) {
        const [, propName, propValue] = propMatch;
        props[propName] = this.parseStyleValue(propValue.trim());
      }
      
      styles[styleName] = props;
    }
    
    return styles;
  }

  /**
   * Parse individual style value
   */
  private parseStyleValue(value: string): any {
    // Remove quotes and parse value
    const trimmed = value.replace(/['"]/g, '').replace(/,$/, '');
    
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    
    // Return as string
    return trimmed;
  }

  /**
   * Generate theme-aware styles code
   */
  private generateThemeAwareStyles(styles: Record<string, any>, stylesName: string): string {
    const lines: string[] = [];
    
    lines.push(`const create${stylesName.charAt(0).toUpperCase() + stylesName.slice(1)} = (theme: Theme) => StyleSheet.create({`);
    
    for (const [styleName, styleProps] of Object.entries(styles)) {
      lines.push(`  ${styleName}: {`);
      
      for (const [prop, value] of Object.entries(styleProps)) {
        const themeValue = this.convertPropertyToTheme(prop, value);
        lines.push(`    ${prop}: ${themeValue},`);
      }
      
      lines.push('  },');
    }
    
    lines.push('});');
    lines.push('');
    lines.push(`const ${stylesName} = create${stylesName.charAt(0).toUpperCase() + stylesName.slice(1)}(theme);`);
    
    return lines.join('\n');
  }

  /**
   * Convert a style property to use theme values
   */
  private convertPropertyToTheme(property: string, value: any): string {
    // Color properties
    if (this.isColorProperty(property) && typeof value === 'string') {
      const themeColor = this.mapColorToTheme(value);
      return themeColor || `'${value}'`;
    }
    
    // Spacing properties
    if (this.isSpacingProperty(property) && typeof value === 'number') {
      const themeSpacing = this.mapSpacingToTheme(value);
      return themeSpacing || value.toString();
    }
    
    // Typography properties
    if (this.isTypographyProperty(property)) {
      const themeTypography = this.mapTypographyToTheme(property, value);
      return themeTypography || (typeof value === 'string' ? `'${value}'` : value.toString());
    }
    
    // Border radius
    if (property === 'borderRadius' && typeof value === 'number') {
      const themeBorderRadius = this.mapBorderRadiusToTheme(value);
      return themeBorderRadius || value.toString();
    }
    
    // Default: return as-is
    return typeof value === 'string' ? `'${value}'` : value.toString();
  }

  /**
   * Map color value to theme token
   */
  private mapColorToTheme(color: string): string | null {
    const colorMappings: Record<string, string> = {
      '#fff': 'theme.colors.background.primary',
      '#ffffff': 'theme.colors.background.primary',
      '#000': 'theme.colors.text.primary',
      '#000000': 'theme.colors.text.primary',
      '#333': 'theme.colors.text.primary',
      '#666': 'theme.colors.text.secondary',
      '#888': 'theme.colors.text.tertiary',
      '#f0f0f0': 'theme.colors.background.secondary',
      '#f8f9fa': 'theme.colors.background.secondary',
      '#1d4ed8': 'theme.colors.primary[600]',
      '#dc2626': 'theme.colors.error[600]',
      '#16a34a': 'theme.colors.success[600]',
      '#ea580c': 'theme.colors.warning[600]',
    };
    
    return colorMappings[color.toLowerCase()] || null;
  }

  /**
   * Map spacing value to theme token
   */
  private mapSpacingToTheme(spacing: number): string | null {
    const spacingMappings: Record<number, string> = {
      4: 'theme.spacing.xs',
      6: 'theme.spacing.sm',
      8: 'theme.spacing.sm',
      12: 'theme.spacing.md',
      16: 'theme.spacing.lg',
      20: 'theme.spacing.xl',
      24: 'theme.spacing.xl',
      32: 'theme.spacing.xxl',
    };
    
    return spacingMappings[spacing] || null;
  }

  /**
   * Map typography value to theme token
   */
  private mapTypographyToTheme(property: string, value: any): string | null {
    if (property === 'fontSize' && typeof value === 'number') {
      const fontSizeMappings: Record<number, string> = {
        12: 'theme.typography.fontSize.xs',
        14: 'theme.typography.fontSize.sm',
        16: 'theme.typography.fontSize.md',
        18: 'theme.typography.fontSize.lg',
        20: 'theme.typography.fontSize.xl',
        24: 'theme.typography.fontSize.xxl',
      };
      return fontSizeMappings[value] || null;
    }
    
    if (property === 'fontWeight') {
      const fontWeightMappings: Record<string, string> = {
        '400': 'theme.typography.fontWeight.normal',
        '500': 'theme.typography.fontWeight.medium',
        '600': 'theme.typography.fontWeight.semiBold',
        '700': 'theme.typography.fontWeight.bold',
        'normal': 'theme.typography.fontWeight.normal',
        'bold': 'theme.typography.fontWeight.bold',
      };
      return fontWeightMappings[value.toString()] || null;
    }
    
    return null;
  }

  /**
   * Map border radius to theme token
   */
  private mapBorderRadiusToTheme(radius: number): string | null {
    const borderRadiusMappings: Record<number, string> = {
      4: 'theme.borderRadius.sm',
      6: 'theme.borderRadius.md',
      8: 'theme.borderRadius.md',
      12: 'theme.borderRadius.lg',
      16: 'theme.borderRadius.xl',
      20: 'theme.borderRadius.xxl',
    };
    
    return borderRadiusMappings[radius] || null;
  }

  /**
   * Update component to use theme in render
   */
  private updateComponentToUseTheme(code: string): string {
    // This is a simplified implementation
    // In practice, you'd want to use AST manipulation for more accurate results
    return code;
  }

  /**
   * Add compatibility layer
   */
  private addCompatibilityLayer(code: string): string {
    const compatibilityImport = "import { withThemeCompatibility } from '../utils/migration/ThemeCompatibilityLayer';";
    
    // Add import
    let migratedCode = this.addThemeImports(code);
    migratedCode = compatibilityImport + '\n' + migratedCode;
    
    // Wrap export with compatibility layer
    migratedCode = migratedCode.replace(
      /export\s+(?:default\s+)?(\w+)/,
      'export default withThemeCompatibility($1)'
    );
    
    return migratedCode;
  }

  /**
   * Add TypeScript types
   */
  private addTypeScriptTypes(code: string): string {
    // Add prop types and other TypeScript enhancements
    return code;
  }

  /**
   * Helper methods
   */
  private isColorProperty(property: string): boolean {
    const colorProperties = ['color', 'backgroundColor', 'borderColor', 'shadowColor', 'tintColor'];
    return colorProperties.includes(property);
  }

  private isSpacingProperty(property: string): boolean {
    const spacingProperties = [
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'marginHorizontal', 'marginVertical', 'padding', 'paddingTop',
      'paddingRight', 'paddingBottom', 'paddingLeft', 'paddingHorizontal',
      'paddingVertical', 'gap'
    ];
    return spacingProperties.includes(property);
  }

  private isTypographyProperty(property: string): boolean {
    const typographyProperties = ['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing'];
    return typographyProperties.includes(property);
  }

  private async readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  private async createBackup(filePath: string, content: string): Promise<string> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    return new Promise((resolve, reject) => {
      fs.writeFile(backupPath, content, 'utf8', (err) => {
        if (err) reject(err);
        else resolve(backupPath);
      });
    });
  }
}