import { Theme } from '../../theme/themes/types';
import { LegacyStyleMapping, MigrationConfig } from './types';

/**
 * Collection of helper functions for component migration
 */
export const migrationHelpers = {
  /**
   * Generate migration documentation for a component
   */
  generateMigrationDocs(
    componentName: string,
    mappings: LegacyStyleMapping[],
    config: MigrationConfig
  ): string {
    const lines: string[] = [];

    lines.push(`# Migration Guide: ${componentName}`);
    lines.push('');
    lines.push('## Overview');
    lines.push(`This component has been migrated to use the new theme system.`);
    lines.push('');

    if (mappings.length > 0) {
      lines.push('## Style Mappings');
      lines.push('');
      lines.push(
        '| Legacy Property | Legacy Value | Theme Token | Confidence | Needs Review |'
      );
      lines.push(
        '|----------------|--------------|-------------|------------|--------------|'
      );

      mappings.forEach((mapping) => {
        lines.push(
          `| ${mapping.legacyProperty} | ${mapping.legacyValue} | ${mapping.themeTokenPath} | ${Math.round(mapping.confidence * 100)}% | ${mapping.needsReview ? '⚠️' : '✅'} |`
        );
      });

      lines.push('');
    }

    lines.push('## Usage');
    lines.push('');
    lines.push('### Before Migration');
    lines.push('```tsx');
    lines.push(
      `import { ${componentName} } from './components/${componentName}';`
    );
    lines.push('');
    lines.push(`<${componentName} />`);
    lines.push('```');
    lines.push('');
    lines.push('### After Migration');
    lines.push('```tsx');
    lines.push(
      `import { ${componentName} } from './components/${componentName}';`
    );
    lines.push(
      `import { ThemeProvider } from './theme/provider/ThemeProvider';`
    );
    lines.push('');
    lines.push('<ThemeProvider>');
    lines.push(`  <${componentName} />`);
    lines.push('</ThemeProvider>');
    lines.push('```');
    lines.push('');

    if (config.addCompatibilityLayer) {
      lines.push('## Compatibility Layer');
      lines.push('');
      lines.push(
        'This component includes a compatibility layer that allows it to work with both legacy and theme-aware styles.'
      );
      lines.push(
        'The compatibility layer will show deprecation warnings in development mode.'
      );
      lines.push('');
    }

    const reviewItems = mappings.filter((m) => m.needsReview);
    if (reviewItems.length > 0) {
      lines.push('## Items Requiring Review');
      lines.push('');
      reviewItems.forEach((item) => {
        lines.push(
          `- **${item.legacyProperty}**: ${item.legacyValue} → ${item.themeTokenPath} (${Math.round(item.confidence * 100)}% confidence)`
        );
      });
      lines.push('');
    }

    return lines.join('\n');
  },

  /**
   * Generate example usage code for migrated component
   */
  generateExampleUsage(componentName: string, theme: Theme): string {
    const lines: string[] = [];

    lines.push(`import React from 'react';`);
    lines.push(`import { View } from 'react-native';`);
    lines.push(
      `import { ${componentName} } from '../components/${componentName}';`
    );
    lines.push(
      `import { ThemeProvider } from '../theme/provider/ThemeProvider';`
    );
    lines.push('');
    lines.push(`export function ${componentName}Example() {`);
    lines.push('  return (');
    lines.push('    <ThemeProvider>');
    lines.push('      <View style={{ flex: 1, padding: 16 }}>');
    lines.push(`        <${componentName} />`);
    lines.push('      </View>');
    lines.push('    </ThemeProvider>');
    lines.push('  );');
    lines.push('}');

    return lines.join('\n');
  },

  /**
   * Generate test file for migrated component
   */
  generateMigrationTests(
    componentName: string,
    mappings: LegacyStyleMapping[]
  ): string {
    const lines: string[] = [];

    lines.push(`import React from 'react';`);
    lines.push(`import { render } from '@testing-library/react-native';`);
    lines.push(`import { ${componentName} } from '../${componentName}';`);
    lines.push(
      `import { ThemeProvider } from '../../theme/provider/ThemeProvider';`
    );
    lines.push(`import { lightTheme } from '../../theme/themes/light';`);
    lines.push('');
    lines.push(`describe('${componentName} Migration', () => {`);
    lines.push(
      '  const renderWithTheme = (component: React.ReactElement) => {'
    );
    lines.push('    return render(');
    lines.push('      <ThemeProvider initialTheme={lightTheme}>');
    lines.push('        {component}');
    lines.push('      </ThemeProvider>');
    lines.push('    );');
    lines.push('  };');
    lines.push('');
    lines.push('  it("should render with theme styles", () => {');
    lines.push(
      `    const { getByTestId } = renderWithTheme(<${componentName} testID="${componentName.toLowerCase()}" />);`
    );
    lines.push(
      `    const component = getByTestId('${componentName.toLowerCase()}');`
    );
    lines.push('    expect(component).toBeTruthy();');
    lines.push('  });');
    lines.push('');

    if (mappings.length > 0) {
      lines.push('  it("should apply theme-based styles correctly", () => {');
      lines.push(
        `    const { getByTestId } = renderWithTheme(<${componentName} testID="${componentName.toLowerCase()}" />);`
      );
      lines.push(
        `    const component = getByTestId('${componentName.toLowerCase()}');`
      );
      lines.push('    ');
      lines.push('    // Test that theme styles are applied');
      lines.push(
        '    // Add specific style assertions based on your component'
      );
      lines.push('    expect(component.props.style).toBeDefined();');
      lines.push('  });');
      lines.push('');
    }

    lines.push('  it("should handle theme changes", () => {');
    lines.push('    // Test theme switching functionality');
    lines.push('    // This would require a more complex test setup');
    lines.push('  });');
    lines.push('});');

    return lines.join('\n');
  },

  /**
   * Validate migration results
   */
  validateMigration(
    originalCode: string,
    migratedCode: string,
    mappings: LegacyStyleMapping[]
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if theme imports were added
    if (!migratedCode.includes('useTheme')) {
      issues.push('Missing useTheme hook import or usage');
    }

    // Check if StyleSheet.create was properly converted
    if (
      migratedCode.includes('StyleSheet.create') &&
      !migratedCode.includes('theme')
    ) {
      issues.push('StyleSheet.create found but no theme usage detected');
    }

    // Check for high-confidence mappings that should be applied
    const highConfidenceMappings = mappings.filter((m) => m.confidence > 0.8);
    highConfidenceMappings.forEach((mapping) => {
      if (
        !migratedCode.includes(mapping.themeTokenPath.replace('theme.', ''))
      ) {
        issues.push(
          `High-confidence mapping not applied: ${mapping.legacyProperty} → ${mapping.themeTokenPath}`
        );
      }
    });

    // Check for potential issues
    if (migratedCode.includes('TODO')) {
      issues.push('Migration contains TODO items that need attention');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  },

  /**
   * Generate migration checklist
   */
  generateMigrationChecklist(
    componentName: string,
    mappings: LegacyStyleMapping[]
  ): string[] {
    const checklist: string[] = [];

    checklist.push(`✅ Add theme imports to ${componentName}`);
    checklist.push(`✅ Add useTheme hook to ${componentName}`);
    checklist.push(`✅ Convert StyleSheet.create to theme-aware styles`);

    if (mappings.length > 0) {
      checklist.push(`✅ Apply ${mappings.length} style mappings`);

      const reviewItems = mappings.filter((m) => m.needsReview);
      if (reviewItems.length > 0) {
        checklist.push(
          `⚠️ Review ${reviewItems.length} low-confidence mappings`
        );
      }
    }

    checklist.push(`✅ Update component props to accept theme`);
    checklist.push(`✅ Test component with different themes`);
    checklist.push(`✅ Update component documentation`);
    checklist.push(`✅ Add migration tests`);

    return checklist;
  },

  /**
   * Extract component metadata for migration
   */
  extractComponentMetadata(code: string): {
    componentName: string;
    hasStyleSheet: boolean;
    importStatements: string[];
    exportStatement: string;
  } {
    // Extract component name
    const componentMatch = code.match(
      /export\s+(?:default\s+)?function\s+(\w+)/
    );
    const componentName = componentMatch?.[1] || 'UnknownComponent';

    // Check for StyleSheet usage
    const hasStyleSheet = code.includes('StyleSheet.create');

    // Extract import statements
    const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?/g;
    const importStatements = Array.from(code.matchAll(importRegex)).map(
      (match) => match[0]
    );

    // Extract export statement
    const exportMatch = code.match(
      /export\s+(?:default\s+)?(?:function\s+)?(\w+).*?(?:\{|;)/
    );
    const exportStatement = exportMatch?.[0] || '';

    return {
      componentName,
      hasStyleSheet,
      importStatements,
      exportStatement,
    };
  },

  /**
   * Generate rollback instructions
   */
  generateRollbackInstructions(
    componentName: string,
    backupPath?: string
  ): string {
    const lines: string[] = [];

    lines.push(`# Rollback Instructions: ${componentName}`);
    lines.push('');
    lines.push('If you need to rollback the migration for this component:');
    lines.push('');

    if (backupPath) {
      lines.push('## Option 1: Restore from Backup');
      lines.push('```bash');
      lines.push(`cp ${backupPath} src/components/${componentName}.tsx`);
      lines.push('```');
      lines.push('');
    }

    lines.push('## Option 2: Manual Rollback');
    lines.push('1. Remove theme imports');
    lines.push('2. Remove useTheme hook usage');
    lines.push('3. Convert theme-aware styles back to StyleSheet.create');
    lines.push('4. Remove theme parameter from style functions');
    lines.push('5. Restore original hardcoded style values');
    lines.push('');
    lines.push('## Option 3: Git Revert');
    lines.push('```bash');
    lines.push('git checkout HEAD~1 -- src/components/${componentName}.tsx');
    lines.push('```');

    return lines.join('\n');
  },
};
