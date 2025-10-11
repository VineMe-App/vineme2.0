import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text, StyleSheet } from 'react-native';
import {
  ThemeCompatibilityLayer,
  withThemeCompatibility,
  useLegacyStyles,
  createMigrationStyles,
} from '../ThemeCompatibilityLayer';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { lightTheme } from '../../../theme/themes/light';

describe('ThemeCompatibilityLayer', () => {
  beforeEach(() => {
    // Reset configuration before each test
    ThemeCompatibilityLayer.configure({
      enableLegacyStyles: true,
      showDeprecationWarnings: false,
    });
  });

  describe('mergeStyles', () => {
    it('should merge legacy styles with theme-aware styles', () => {
      const legacyStyles = { backgroundColor: '#fff', padding: 16 };
      const themeAwareStyles = (theme: any) => ({
        backgroundColor: theme.colors.background.primary,
        margin: 8,
      });

      const merged = ThemeCompatibilityLayer.mergeStyles(
        legacyStyles,
        themeAwareStyles,
        lightTheme
      );

      expect(merged.backgroundColor).toBe(lightTheme.colors.background.primary); // Theme takes precedence
      expect(merged.padding).toBe(16); // Legacy preserved
      expect(merged.margin).toBe(8); // Theme added
    });

    it('should use only theme styles when legacy styles disabled', () => {
      ThemeCompatibilityLayer.configure({ enableLegacyStyles: false });

      const legacyStyles = { backgroundColor: '#fff', padding: 16 };
      const themeAwareStyles = (theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      });

      const merged = ThemeCompatibilityLayer.mergeStyles(
        legacyStyles,
        themeAwareStyles,
        lightTheme
      );

      expect(merged.backgroundColor).toBe(lightTheme.colors.background.primary);
      expect(merged.padding).toBeUndefined(); // Legacy ignored
    });
  });

  describe('createCompatibleStyles', () => {
    it('should create compatible styles function', () => {
      const legacyStyles = { backgroundColor: '#fff', padding: 16 };
      const themeAwareStyles = (theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      });

      const compatibleStylesFactory =
        ThemeCompatibilityLayer.createCompatibleStyles(
          legacyStyles,
          themeAwareStyles
        );

      const styles = compatibleStylesFactory(lightTheme);
      expect(styles.backgroundColor).toBe(lightTheme.colors.background.primary);
      expect(styles.padding).toBe(16);
    });

    it('should handle only legacy styles', () => {
      const legacyStyles = { backgroundColor: '#fff', padding: 16 };

      const compatibleStylesFactory =
        ThemeCompatibilityLayer.createCompatibleStyles(legacyStyles);

      const styles = compatibleStylesFactory(lightTheme);
      expect(styles).toEqual(legacyStyles);
    });

    it('should handle only theme-aware styles', () => {
      const themeAwareStyles = (theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      });

      const compatibleStylesFactory =
        ThemeCompatibilityLayer.createCompatibleStyles(
          undefined,
          themeAwareStyles
        );

      const styles = compatibleStylesFactory(lightTheme);
      expect(styles.backgroundColor).toBe(lightTheme.colors.background.primary);
    });
  });

  describe('convertLegacyStyleSheet', () => {
    it('should convert common color values', () => {
      const legacyStyleSheet = StyleSheet.create({
        container: {
          backgroundColor: '#fff',
          color: '#000',
        },
        text: {
          color: '#666',
        },
      });

      const converted = ThemeCompatibilityLayer.convertLegacyStyleSheet(
        legacyStyleSheet,
        lightTheme
      );

      expect(converted.container.backgroundColor).toBe(
        lightTheme.colors.background.primary
      );
      expect(converted.container.color).toBe(lightTheme.colors.text.primary);
      expect(converted.text.color).toBe(lightTheme.colors.text.secondary);
    });

    it('should convert spacing values', () => {
      const legacyStyleSheet = StyleSheet.create({
        container: {
          padding: 16,
          margin: 8,
          paddingHorizontal: 12,
        },
      });

      const converted = ThemeCompatibilityLayer.convertLegacyStyleSheet(
        legacyStyleSheet,
        lightTheme
      );

      expect(converted.container.padding).toBe(lightTheme.spacing.lg);
      expect(converted.container.margin).toBe(lightTheme.spacing.sm);
      expect(converted.container.paddingHorizontal).toBe(lightTheme.spacing.md);
    });

    it('should convert typography values', () => {
      const legacyStyleSheet = StyleSheet.create({
        text: {
          fontSize: 16,
          fontWeight: '600',
        },
      });

      const converted = ThemeCompatibilityLayer.convertLegacyStyleSheet(
        legacyStyleSheet,
        lightTheme
      );

      expect(converted.text.fontSize).toBe(lightTheme.typography.fontSize.md);
      expect(converted.text.fontWeight).toBe(
        lightTheme.typography.fontWeight.semiBold
      );
    });

    it('should preserve unmappable values', () => {
      const legacyStyleSheet = StyleSheet.create({
        container: {
          flex: 1,
          position: 'absolute',
          backgroundColor: '#custom-color',
        },
      });

      const converted = ThemeCompatibilityLayer.convertLegacyStyleSheet(
        legacyStyleSheet,
        lightTheme
      );

      expect(converted.container.flex).toBe(1);
      expect(converted.container.position).toBe('absolute');
      expect(converted.container.backgroundColor).toBe('#custom-color'); // Unmappable color preserved
    });
  });

  describe('withThemeCompatibility HOC', () => {
    it('should inject theme into component props', () => {
      const TestComponent = ({ theme }: { theme?: any }) =>
        React.createElement(
          Text,
          { testID: 'theme-text' },
          theme ? 'Has Theme' : 'No Theme'
        );

      const CompatibleComponent = withThemeCompatibility(TestComponent);

      const { getByTestId } = render(
        <ThemeProvider initialTheme={lightTheme}>
          <CompatibleComponent />
        </ThemeProvider>
      );

      expect(getByTestId('theme-text')).toHaveTextContent('Has Theme');
    });

    it('should preserve original component props', () => {
      const TestComponent = ({
        title,
        theme,
      }: {
        title: string;
        theme?: any;
      }) => React.createElement(Text, { testID: 'component-text' }, title);

      const CompatibleComponent = withThemeCompatibility(TestComponent);

      const { getByTestId } = render(
        <ThemeProvider initialTheme={lightTheme}>
          <CompatibleComponent title="Test Title" />
        </ThemeProvider>
      );

      expect(getByTestId('component-text')).toHaveTextContent('Test Title');
    });
  });

  describe('useLegacyStyles hook', () => {
    it('should create styles with legacy and theme-aware styles', () => {
      const TestComponent = () => {
        const legacyStyles = {
          container: { backgroundColor: '#fff', padding: 16 },
        };

        const themeAwareStyles = (theme: any) => ({
          container: { backgroundColor: theme.colors.background.primary },
        });

        const styles = useLegacyStyles(legacyStyles, themeAwareStyles);

        return React.createElement(View, {
          style: styles.container,
          testID: 'test-view',
        });
      };

      const { getByTestId } = render(
        <ThemeProvider initialTheme={lightTheme}>
          <TestComponent />
        </ThemeProvider>
      );

      const view = getByTestId('test-view');
      expect(view).toBeTruthy();
    });
  });

  describe('createMigrationStyles', () => {
    it('should create migration styles with partial theme styles', () => {
      const legacyStyles = {
        container: { backgroundColor: '#fff', padding: 16 },
        text: { color: '#000', fontSize: 16 },
      };

      const partialThemeStyles = {
        container: (theme: any) => ({
          backgroundColor: theme.colors.background.primary,
        }),
        // text style not provided - should use converted legacy style
      };

      const migrationStylesFactory = createMigrationStyles(
        legacyStyles,
        partialThemeStyles
      );
      const styles = migrationStylesFactory(lightTheme);

      expect(styles.container.backgroundColor).toBe(
        lightTheme.colors.background.primary
      );
      expect(styles.container.padding).toBe(16); // From legacy
      expect(styles.text.color).toBe(lightTheme.colors.text.primary); // Converted from legacy
      expect(styles.text.fontSize).toBe(lightTheme.typography.fontSize.md); // Converted from legacy
    });
  });

  describe('configuration', () => {
    it('should respect deprecation warning configuration', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      ThemeCompatibilityLayer.configure({
        showDeprecationWarnings: true,
        onDeprecationWarning: (message) => console.warn(`Custom: ${message}`),
      });

      const legacyStyles = { backgroundColor: '#fff' };
      const themeAwareStyles = (theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      });

      ThemeCompatibilityLayer.mergeStyles(
        legacyStyles,
        themeAwareStyles,
        lightTheme
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom: Component is using legacy styles')
      );

      consoleSpy.mockRestore();
    });

    it('should not show warnings when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      ThemeCompatibilityLayer.configure({
        showDeprecationWarnings: false,
      });

      const legacyStyles = { backgroundColor: '#fff' };
      const themeAwareStyles = (theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      });

      ThemeCompatibilityLayer.mergeStyles(
        legacyStyles,
        themeAwareStyles,
        lightTheme
      );

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
