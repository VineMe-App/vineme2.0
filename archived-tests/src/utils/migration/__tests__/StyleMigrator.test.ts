import { StyleMigrator } from '../StyleMigrator';
import { lightTheme } from '../../../theme/themes/light';
import { LegacyStyle, StyleMigrationOptions } from '../types';

describe('StyleMigrator', () => {
  let migrator: StyleMigrator;

  beforeEach(() => {
    migrator = new StyleMigrator();
  });

  describe('migrateStyles', () => {
    it('should migrate basic color styles', () => {
      const legacyStyles: LegacyStyle = {
        container: {
          backgroundColor: '#fff',
          borderColor: '#333',
        },
        text: {
          color: '#000',
        },
      };

      const options: StyleMigrationOptions = {
        useSemanticColors: true,
        convertToTokens: true,
        preserveComments: false,
      };

      const { themeAwareStyles, mappings } = migrator.migrateStyles(
        legacyStyles,
        options
      );

      expect(themeAwareStyles).toBeDefined();
      expect(mappings).toHaveLength(3);

      // Test that theme-aware styles function works
      const styles = themeAwareStyles.container(lightTheme);
      expect(styles).toBeDefined();
    });

    it('should migrate spacing styles', () => {
      const legacyStyles: LegacyStyle = {
        container: {
          padding: 16,
          margin: 8,
          paddingHorizontal: 12,
        },
      };

      const { themeAwareStyles, mappings } =
        migrator.migrateStyles(legacyStyles);

      expect(mappings.some((m) => m.legacyProperty === 'padding')).toBe(true);
      expect(mappings.some((m) => m.legacyProperty === 'margin')).toBe(true);
      expect(
        mappings.some((m) => m.legacyProperty === 'paddingHorizontal')
      ).toBe(true);
    });

    it('should migrate typography styles', () => {
      const legacyStyles: LegacyStyle = {
        text: {
          fontSize: 16,
          fontWeight: '600',
        },
      };

      const { themeAwareStyles, mappings } =
        migrator.migrateStyles(legacyStyles);

      expect(mappings.some((m) => m.legacyProperty === 'fontSize')).toBe(true);
      expect(mappings.some((m) => m.legacyProperty === 'fontWeight')).toBe(
        true
      );
    });

    it('should handle border radius migration', () => {
      const legacyStyles: LegacyStyle = {
        card: {
          borderRadius: 8,
        },
      };

      const { themeAwareStyles, mappings } =
        migrator.migrateStyles(legacyStyles);

      expect(mappings.some((m) => m.legacyProperty === 'borderRadius')).toBe(
        true
      );
      expect(mappings[0].confidence).toBe(1.0);
    });

    it('should preserve unmappable styles', () => {
      const legacyStyles: LegacyStyle = {
        container: {
          flex: 1,
          position: 'absolute',
          customProperty: 'customValue',
        },
      };

      const { themeAwareStyles, mappings } =
        migrator.migrateStyles(legacyStyles);

      // Should have no mappings for unmappable properties
      expect(mappings).toHaveLength(0);

      // But should still create theme-aware styles
      const styles = themeAwareStyles.container(lightTheme);
      expect(styles.flex).toBe(1);
      expect(styles.position).toBe('absolute');
    });

    it('should mark low-confidence mappings for review', () => {
      const legacyStyles: LegacyStyle = {
        container: {
          backgroundColor: '#f5f5f5', // Uncommon color
        },
      };

      const { mappings } = migrator.migrateStyles(legacyStyles);

      // Should either have no mapping or a low-confidence mapping
      if (mappings.length > 0) {
        expect(mappings[0].confidence).toBeLessThan(0.8);
        expect(mappings[0].needsReview).toBe(true);
      }
    });
  });

  describe('generateMigrationCode', () => {
    it('should generate valid TypeScript code', () => {
      const styleName = 'container';
      const legacyStyle = {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
      };
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

      const code = migrator.generateMigrationCode(
        styleName,
        legacyStyle,
        mappings
      );

      expect(code).toContain('container: (theme: Theme) => ({');
      expect(code).toContain('theme.colors.background.primary');
      expect(code).toContain('theme.spacing.lg');
      expect(code).toContain('// TODO: Migrate to theme token');
    });

    it('should add review comments for low-confidence mappings', () => {
      const mappings = [
        {
          legacyProperty: 'backgroundColor',
          legacyValue: '#f5f5f5',
          themeTokenPath: 'colors.background.secondary',
          confidence: 0.7,
          needsReview: true,
        },
      ];

      const code = migrator.generateMigrationCode(
        'container',
        { backgroundColor: '#f5f5f5' },
        mappings
      );

      expect(code).toContain('// TODO: Review migration - was: #f5f5f5');
    });
  });

  describe('edge cases', () => {
    it('should handle empty styles object', () => {
      const { themeAwareStyles, mappings } = migrator.migrateStyles({});

      expect(themeAwareStyles).toEqual({});
      expect(mappings).toHaveLength(0);
    });

    it('should handle null/undefined values', () => {
      const legacyStyles: LegacyStyle = {
        container: {
          backgroundColor: null as any,
          padding: undefined as any,
        },
      };

      const { themeAwareStyles, mappings } =
        migrator.migrateStyles(legacyStyles);

      expect(mappings).toHaveLength(0);
      const styles = themeAwareStyles.container(lightTheme);
      expect(styles.backgroundColor).toBeNull();
      expect(styles.padding).toBeUndefined();
    });

    it('should handle complex nested objects', () => {
      const legacyStyles: LegacyStyle = {
        container: {
          shadowOffset: {
            width: 0,
            height: 2,
          },
          transform: [{ translateX: 10 }],
        },
      };

      const { themeAwareStyles } = migrator.migrateStyles(legacyStyles);

      const styles = themeAwareStyles.container(lightTheme);
      expect(styles.shadowOffset).toEqual({ width: 0, height: 2 });
      expect(styles.transform).toEqual([{ translateX: 10 }]);
    });
  });
});
