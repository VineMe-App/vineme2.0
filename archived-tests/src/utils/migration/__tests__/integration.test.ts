import { ComponentMigrator } from '../ComponentMigrator';
import { ThemeCompatibilityLayer } from '../ThemeCompatibilityLayer';
import { migrationHelpers } from '../migrationHelpers';
import { createMigrationScript, migrationPresets } from '../migrationScripts';
import { lightTheme } from '../../../theme/themes/light';
import { MigrationConfig } from '../types';

describe('Migration Integration Tests', () => {
  describe('End-to-End Component Migration', () => {
    it('should migrate a complete component successfully', async () => {
      const sampleComponentCode = `
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
}

export function SampleComponent({ title, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
      `;

      const migrator = new ComponentMigrator();
      const config: MigrationConfig = {
        preserveOriginalStyles: true,
        addCompatibilityLayer: true,
        generateTypes: true,
      };

      // Mock file operations for testing
      const originalReadFile = (migrator as any).readFile;
      const originalCreateBackup = (migrator as any).createBackup;

      (migrator as any).readFile = jest
        .fn()
        .mockResolvedValue(sampleComponentCode);
      (migrator as any).createBackup = jest
        .fn()
        .mockResolvedValue('backup-path');

      const result = await migrator.migrateComponent(
        'test-component.tsx',
        config
      );

      expect(result.success).toBe(true);
      expect(result.migratedCode).toContain('useTheme');
      expect(result.migratedCode).toContain('theme');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      // Restore original methods
      (migrator as any).readFile = originalReadFile;
      (migrator as any).createBackup = originalCreateBackup;
    });
  });

  describe('Compatibility Layer Integration', () => {
    it('should work seamlessly with migrated components', () => {
      const legacyStyles = {
        container: {
          backgroundColor: '#fff',
          padding: 16,
          borderRadius: 8,
        },
      };

      const themeAwareStyles = (theme: typeof lightTheme) => ({
        container: {
          backgroundColor: theme.colors.background.primary,
          padding: theme.spacing.lg,
          borderRadius: theme.borderRadius.md,
        },
      });

      const compatibleStylesFactory =
        ThemeCompatibilityLayer.createCompatibleStyles(
          legacyStyles,
          themeAwareStyles
        );

      const styles = compatibleStylesFactory(lightTheme);

      // Theme values should take precedence
      expect(styles.container.backgroundColor).toBe(
        lightTheme.colors.background.primary
      );
      expect(styles.container.padding).toBe(lightTheme.spacing.lg);
      expect(styles.container.borderRadius).toBe(lightTheme.borderRadius.md);
    });

    it('should handle gradual migration scenarios', () => {
      const legacyStyles = {
        container: { backgroundColor: '#fff', padding: 16 },
        header: { fontSize: 18, fontWeight: 'bold' },
        footer: { color: '#666', marginTop: 20 },
      };

      // Only migrate container styles
      const partialThemeStyles = {
        container: (theme: typeof lightTheme) => ({
          backgroundColor: theme.colors.background.primary,
          padding: theme.spacing.lg,
        }),
      };

      const migrationStylesFactory =
        ThemeCompatibilityLayer.createCompatibleStyles(
          legacyStyles,
          (theme) => {
            const result: any = {};

            // Apply theme styles where available
            if (partialThemeStyles.container) {
              result.container = partialThemeStyles.container(theme);
            }

            // Convert remaining legacy styles
            const convertedLegacy =
              ThemeCompatibilityLayer.convertLegacyStyleSheet(
                { header: legacyStyles.header, footer: legacyStyles.footer },
                theme
              );

            return { ...result, ...convertedLegacy };
          }
        );

      const styles = migrationStylesFactory(lightTheme);

      // Container should use theme styles
      expect(styles.container.backgroundColor).toBe(
        lightTheme.colors.background.primary
      );
      expect(styles.container.padding).toBe(lightTheme.spacing.lg);

      // Header and footer should use converted legacy styles
      expect(styles.header.fontSize).toBe(lightTheme.typography.fontSize.lg);
      expect(styles.header.fontWeight).toBe(
        lightTheme.typography.fontWeight.bold
      );
      expect(styles.footer.color).toBe(lightTheme.colors.text.secondary);
    });
  });

  describe('Migration Scripts Integration', () => {
    it('should create migration script with proper configuration', () => {
      const script = createMigrationScript({
        sourceDir: 'src/components',
        migrationOptions: {
          preserveOriginalStyles: true,
          addCompatibilityLayer: true,
          generateTypes: true,
        },
      });

      expect(script).toBeDefined();
      expect(typeof script.run).toBe('function');
      expect(typeof script.dryRun).toBe('function');
      expect(typeof script.configure).toBe('function');
    });

    it('should use migration presets correctly', () => {
      const allComponentsScript = migrationPresets.allComponents();
      const uiComponentsScript = migrationPresets.uiComponents();
      const safeScript = migrationPresets.safeMigration();

      expect(allComponentsScript).toBeDefined();
      expect(uiComponentsScript).toBeDefined();
      expect(safeScript).toBeDefined();
    });
  });

  describe('Migration Helpers Integration', () => {
    it('should generate complete migration documentation', () => {
      const mappings = [
        {
          legacyProperty: 'backgroundColor',
          legacyValue: '#fff',
          themeTokenPath: 'colors.background.primary',
          confidence: 0.9,
          needsReview: false,
        },
        {
          legacyProperty: 'padding',
          legacyValue: 16,
          themeTokenPath: 'spacing.lg',
          confidence: 1.0,
          needsReview: false,
        },
      ];

      const config: MigrationConfig = {
        preserveOriginalStyles: true,
        addCompatibilityLayer: true,
        generateTypes: true,
      };

      const docs = migrationHelpers.generateMigrationDocs(
        'TestComponent',
        mappings,
        config
      );
      const example = migrationHelpers.generateExampleUsage(
        'TestComponent',
        lightTheme
      );
      const tests = migrationHelpers.generateMigrationTests(
        'TestComponent',
        mappings
      );
      const checklist = migrationHelpers.generateMigrationChecklist(
        'TestComponent',
        mappings
      );

      expect(docs).toContain('TestComponent');
      expect(example).toContain('TestComponent');
      expect(tests).toContain('TestComponent');
      expect(checklist.length).toBeGreaterThan(0);
    });

    it('should validate migration results accurately', () => {
      const originalCode = `
        const styles = StyleSheet.create({
          container: { backgroundColor: '#fff' }
        });
      `;

      const goodMigratedCode = `
        import { useTheme } from '../theme/provider/useTheme';
        const theme = useTheme();
        const styles = createStyles(theme);
        // Uses theme.colors.background.primary
      `;

      const badMigratedCode = `
        const styles = StyleSheet.create({
          container: { backgroundColor: '#fff' }
        });
      `;

      const mappings = [
        {
          legacyProperty: 'backgroundColor',
          legacyValue: '#fff',
          themeTokenPath: 'colors.background.primary',
          confidence: 0.9,
          needsReview: false,
        },
      ];

      const goodResult = migrationHelpers.validateMigration(
        originalCode,
        goodMigratedCode,
        mappings
      );
      const badResult = migrationHelpers.validateMigration(
        originalCode,
        badMigratedCode,
        mappings
      );

      expect(goodResult.isValid).toBe(true);
      expect(badResult.isValid).toBe(false);
      expect(badResult.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Migration Scenarios', () => {
    it('should handle complex component with multiple style objects', () => {
      const complexComponentCode = `
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export function ComplexComponent() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Title</Text>
        <Text style={styles.subtitle}>Subtitle</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardText}>Card content</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
});
      `;

      // Test that the compatibility layer can handle this complex structure
      const convertedStyles = ThemeCompatibilityLayer.convertLegacyStyleSheet(
        {
          container: { flex: 1, backgroundColor: '#f8f9fa' },
          header: { padding: 20, backgroundColor: '#fff' },
          title: { fontSize: 24, fontWeight: 'bold', color: '#212529' },
          subtitle: { fontSize: 16, color: '#6c757d' },
        },
        lightTheme
      );

      expect(convertedStyles.container.flex).toBe(1);
      expect(convertedStyles.container.backgroundColor).toBe(
        lightTheme.colors.background.secondary
      );
      expect(convertedStyles.header.padding).toBe(lightTheme.spacing.xl);
      expect(convertedStyles.header.backgroundColor).toBe(
        lightTheme.colors.background.primary
      );
      expect(convertedStyles.title.fontSize).toBe(
        lightTheme.typography.fontSize.xxl
      );
      expect(convertedStyles.title.fontWeight).toBe(
        lightTheme.typography.fontWeight.bold
      );
    });

    it('should handle components with conditional styles', () => {
      // Test compatibility with dynamic/conditional styling patterns
      const legacyStyles = {
        button: { backgroundColor: '#007bff', padding: 12 },
        buttonDisabled: { backgroundColor: '#6c757d', padding: 12 },
      };

      const themeAwareStyles = (theme: typeof lightTheme) => ({
        button: {
          backgroundColor: theme.colors.primary[600],
          padding: theme.spacing.md,
        },
        buttonDisabled: {
          backgroundColor: theme.colors.neutral[400],
          padding: theme.spacing.md,
        },
      });

      const compatibleStylesFactory =
        ThemeCompatibilityLayer.createCompatibleStyles(
          legacyStyles,
          themeAwareStyles
        );

      const styles = compatibleStylesFactory(lightTheme);

      expect(styles.button.backgroundColor).toBe(
        lightTheme.colors.primary[600]
      );
      expect(styles.buttonDisabled.backgroundColor).toBe(
        lightTheme.colors.neutral[400]
      );
      expect(styles.button.padding).toBe(lightTheme.spacing.md);
    });
  });
});
