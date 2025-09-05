import { migrationHelpers } from '../migrationHelpers';
import { LegacyStyleMapping, MigrationConfig } from '../types';
import { lightTheme } from '../../../theme/themes/light';

describe('migrationHelpers', () => {
  const mockMappings: LegacyStyleMapping[] = [
    {
      legacyProperty: 'backgroundColor',
      legacyValue: '#fff',
      themeTokenPath: 'colors.background.primary',
      confidence: 0.9,
      needsReview: false,
    },
    {
      legacyProperty: 'color',
      legacyValue: '#custom-color',
      themeTokenPath: 'colors.text.primary',
      confidence: 0.6,
      needsReview: true,
    },
  ];

  const mockConfig: MigrationConfig = {
    preserveOriginalStyles: true,
    addCompatibilityLayer: true,
    generateTypes: true,
  };

  describe('generateMigrationDocs', () => {
    it('should generate comprehensive migration documentation', () => {
      const docs = migrationHelpers.generateMigrationDocs('TestComponent', mockMappings, mockConfig);

      expect(docs).toContain('# Migration Guide: TestComponent');
      expect(docs).toContain('## Style Mappings');
      expect(docs).toContain('backgroundColor');
      expect(docs).toContain('#fff');
      expect(docs).toContain('colors.background.primary');
      expect(docs).toContain('90%');
      expect(docs).toContain('✅');
      expect(docs).toContain('⚠️');
      expect(docs).toContain('## Usage');
      expect(docs).toContain('## Compatibility Layer');
      expect(docs).toContain('## Items Requiring Review');
    });

    it('should handle empty mappings', () => {
      const docs = migrationHelpers.generateMigrationDocs('TestComponent', [], mockConfig);

      expect(docs).toContain('# Migration Guide: TestComponent');
      expect(docs).not.toContain('## Style Mappings');
      expect(docs).toContain('## Usage');
    });

    it('should exclude compatibility layer section when not enabled', () => {
      const configWithoutCompatibility = { ...mockConfig, addCompatibilityLayer: false };
      const docs = migrationHelpers.generateMigrationDocs('TestComponent', mockMappings, configWithoutCompatibility);

      expect(docs).not.toContain('## Compatibility Layer');
    });
  });

  describe('generateExampleUsage', () => {
    it('should generate valid React component example', () => {
      const example = migrationHelpers.generateExampleUsage('TestComponent', lightTheme);

      expect(example).toContain("import React from 'react';");
      expect(example).toContain("import { TestComponent } from '../components/TestComponent';");
      expect(example).toContain("import { ThemeProvider } from '../theme/provider/ThemeProvider';");
      expect(example).toContain('export function TestComponentExample()');
      expect(example).toContain('<ThemeProvider>');
      expect(example).toContain('<TestComponent />');
      expect(example).toContain('</ThemeProvider>');
    });
  });

  describe('generateMigrationTests', () => {
    it('should generate comprehensive test file', () => {
      const tests = migrationHelpers.generateMigrationTests('TestComponent', mockMappings);

      expect(tests).toContain("import React from 'react';");
      expect(tests).toContain("import { render } from '@testing-library/react-native';");
      expect(tests).toContain("import { TestComponent } from '../TestComponent';");
      expect(tests).toContain("describe('TestComponent Migration'");
      expect(tests).toContain('it("should render with theme styles"');
      expect(tests).toContain('it("should apply theme-based styles correctly"');
      expect(tests).toContain('it("should handle theme changes"');
      expect(tests).toContain('renderWithTheme');
    });

    it('should handle components without mappings', () => {
      const tests = migrationHelpers.generateMigrationTests('TestComponent', []);

      expect(tests).toContain("describe('TestComponent Migration'");
      expect(tests).toContain('it("should render with theme styles"');
      expect(tests).not.toContain('it("should apply theme-based styles correctly"');
    });
  });

  describe('validateMigration', () => {
    it('should validate successful migration', () => {
      const originalCode = `
        import { StyleSheet } from 'react-native';
        const styles = StyleSheet.create({
          container: { backgroundColor: '#fff' }
        });
      `;

      const migratedCode = `
        import { useTheme } from '../theme/provider/useTheme';
        const theme = useTheme();
        const styles = createStyles(theme);
        // Uses colors.background.primary
      `;

      const result = migrationHelpers.validateMigration(originalCode, migratedCode, mockMappings);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing useTheme hook', () => {
      const originalCode = 'const styles = StyleSheet.create({});';
      const migratedCode = 'const styles = StyleSheet.create({});';

      const result = migrationHelpers.validateMigration(originalCode, migratedCode, []);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing useTheme hook import or usage');
    });

    it('should detect StyleSheet.create without theme usage', () => {
      const originalCode = 'const styles = StyleSheet.create({});';
      const migratedCode = 'const styles = StyleSheet.create({ container: {} });';

      const result = migrationHelpers.validateMigration(originalCode, migratedCode, []);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('StyleSheet.create found but no theme usage detected');
    });

    it('should detect unapplied high-confidence mappings', () => {
      const originalCode = 'const styles = StyleSheet.create({});';
      const migratedCode = 'const theme = useTheme(); const styles = createStyles(theme);';

      const result = migrationHelpers.validateMigration(originalCode, migratedCode, mockMappings);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(
        'High-confidence mapping not applied: backgroundColor → colors.background.primary'
      );
    });

    it('should detect TODO items', () => {
      const originalCode = 'const styles = StyleSheet.create({});';
      const migratedCode = 'const theme = useTheme(); // TODO: Complete migration';

      const result = migrationHelpers.validateMigration(originalCode, migratedCode, []);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Migration contains TODO items that need attention');
    });
  });

  describe('generateMigrationChecklist', () => {
    it('should generate comprehensive checklist', () => {
      const checklist = migrationHelpers.generateMigrationChecklist('TestComponent', mockMappings);

      expect(checklist).toContain('✅ Add theme imports to TestComponent');
      expect(checklist).toContain('✅ Add useTheme hook to TestComponent');
      expect(checklist).toContain('✅ Convert StyleSheet.create to theme-aware styles');
      expect(checklist).toContain('✅ Apply 2 style mappings');
      expect(checklist).toContain('⚠️ Review 1 low-confidence mappings');
      expect(checklist).toContain('✅ Update component props to accept theme');
      expect(checklist).toContain('✅ Test component with different themes');
      expect(checklist).toContain('✅ Update component documentation');
      expect(checklist).toContain('✅ Add migration tests');
    });

    it('should handle components without mappings', () => {
      const checklist = migrationHelpers.generateMigrationChecklist('TestComponent', []);

      expect(checklist).not.toContain('Apply');
      expect(checklist).not.toContain('Review');
      expect(checklist).toContain('✅ Add theme imports to TestComponent');
    });

    it('should handle mappings without review items', () => {
      const highConfidenceMappings = mockMappings.map(m => ({ ...m, needsReview: false }));
      const checklist = migrationHelpers.generateMigrationChecklist('TestComponent', highConfidenceMappings);

      expect(checklist).toContain('✅ Apply 2 style mappings');
      expect(checklist).not.toContain('⚠️ Review');
    });
  });

  describe('extractComponentMetadata', () => {
    it('should extract component information', () => {
      const code = `
        import React from 'react';
        import { View, StyleSheet } from 'react-native';
        
        export default function TestComponent() {
          return <View />;
        }
        
        const styles = StyleSheet.create({
          container: {}
        });
      `;

      const metadata = migrationHelpers.extractComponentMetadata(code);

      expect(metadata.componentName).toBe('TestComponent');
      expect(metadata.hasStyleSheet).toBe(true);
      expect(metadata.importStatements).toHaveLength(2);
      expect(metadata.importStatements[0]).toContain("import React from 'react'");
      expect(metadata.exportStatement).toContain('export default function TestComponent');
    });

    it('should handle components without StyleSheet', () => {
      const code = `
        import React from 'react';
        export function SimpleComponent() {
          return null;
        }
      `;

      const metadata = migrationHelpers.extractComponentMetadata(code);

      expect(metadata.componentName).toBe('SimpleComponent');
      expect(metadata.hasStyleSheet).toBe(false);
    });

    it('should handle unknown components', () => {
      const code = 'const something = 123;';

      const metadata = migrationHelpers.extractComponentMetadata(code);

      expect(metadata.componentName).toBe('UnknownComponent');
      expect(metadata.hasStyleSheet).toBe(false);
    });
  });

  describe('generateRollbackInstructions', () => {
    it('should generate rollback instructions with backup', () => {
      const instructions = migrationHelpers.generateRollbackInstructions(
        'TestComponent',
        'src/components/TestComponent.tsx.backup.123456'
      );

      expect(instructions).toContain('# Rollback Instructions: TestComponent');
      expect(instructions).toContain('## Option 1: Restore from Backup');
      expect(instructions).toContain('cp src/components/TestComponent.tsx.backup.123456');
      expect(instructions).toContain('## Option 2: Manual Rollback');
      expect(instructions).toContain('## Option 3: Git Revert');
    });

    it('should generate rollback instructions without backup', () => {
      const instructions = migrationHelpers.generateRollbackInstructions('TestComponent');

      expect(instructions).toContain('# Rollback Instructions: TestComponent');
      expect(instructions).not.toContain('## Option 1: Restore from Backup');
      expect(instructions).toContain('## Option 2: Manual Rollback');
      expect(instructions).toContain('## Option 3: Git Revert');
    });
  });
});