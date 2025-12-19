import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../theme/provider/useTheme';
import { Theme } from '../../theme/themes/types';
import { CompatibilityLayerOptions } from './types';

/**
 * Compatibility layer for components transitioning to the new theme system
 */
export class ThemeCompatibilityLayer {
  private static options: CompatibilityLayerOptions = {
    enableLegacyStyles: true,
    showDeprecationWarnings: __DEV__,
    onDeprecationWarning: (message: string) => {
      if (__DEV__) {
        console.warn(`[Theme Migration] ${message}`);
      }
    },
  };

  /**
   * Configure the compatibility layer
   */
  static configure(options: Partial<CompatibilityLayerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Merge legacy styles with theme-aware styles
   */
  static mergeStyles(
    legacyStyles: any,
    themeAwareStyles: (theme: Theme) => any,
    theme: Theme
  ): any {
    if (!this.options.enableLegacyStyles) {
      return themeAwareStyles(theme);
    }

    const themeStyles = themeAwareStyles(theme);

    // Merge legacy styles with theme styles, with theme taking precedence
    const mergedStyles = { ...legacyStyles, ...themeStyles };

    if (this.options.showDeprecationWarnings && legacyStyles) {
      this.options.onDeprecationWarning?.(
        'Component is using legacy styles. Consider migrating to theme-aware styles.'
      );
    }

    return mergedStyles;
  }

  /**
   * Create a style function that supports both legacy and theme-aware styles
   */
  static createCompatibleStyles<T extends Record<string, any>>(
    legacyStyles?: T,
    themeAwareStylesFactory?: (theme: Theme) => T
  ): (theme: Theme) => T {
    return (theme: Theme) => {
      if (themeAwareStylesFactory) {
        const themeStyles = themeAwareStylesFactory(theme);

        if (legacyStyles && this.options.enableLegacyStyles) {
          return this.mergeStyles(legacyStyles, () => themeStyles, theme);
        }

        return themeStyles;
      }

      if (legacyStyles) {
        if (this.options.showDeprecationWarnings) {
          this.options.onDeprecationWarning?.(
            'Component is using only legacy styles. Consider migrating to theme-aware styles.'
          );
        }
        return legacyStyles;
      }

      return {} as T;
    };
  }

  /**
   * Convert legacy StyleSheet to theme-aware StyleSheet
   */
  static convertLegacyStyleSheet<T extends Record<string, any>>(
    legacyStyleSheet: T,
    theme: Theme
  ): T {
    const convertedStyles: any = {};

    for (const [key, style] of Object.entries(legacyStyleSheet)) {
      convertedStyles[key] = this.convertLegacyStyle(style, theme);
    }

    return convertedStyles;
  }

  /**
   * Convert individual legacy style to use theme values where possible
   */
  private static convertLegacyStyle(style: any, theme: Theme): any {
    if (!style || typeof style !== 'object') {
      return style;
    }

    const convertedStyle: any = { ...style };

    // Convert common color properties
    if (convertedStyle.backgroundColor) {
      convertedStyle.backgroundColor = this.convertColorValue(
        convertedStyle.backgroundColor,
        theme
      );
    }

    if (convertedStyle.color) {
      convertedStyle.color = this.convertColorValue(
        convertedStyle.color,
        theme
      );
    }

    if (convertedStyle.borderColor) {
      convertedStyle.borderColor = this.convertColorValue(
        convertedStyle.borderColor,
        theme
      );
    }

    // Convert spacing properties
    const spacingProps = [
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
    ];

    spacingProps.forEach((prop) => {
      if (convertedStyle[prop] !== undefined) {
        convertedStyle[prop] = this.convertSpacingValue(
          convertedStyle[prop],
          theme
        );
      }
    });

    // Convert typography properties
    if (convertedStyle.fontSize) {
      convertedStyle.fontSize = this.convertFontSizeValue(
        convertedStyle.fontSize,
        theme
      );
    }

    if (convertedStyle.fontWeight) {
      convertedStyle.fontWeight = this.convertFontWeightValue(
        convertedStyle.fontWeight,
        theme
      );
    }

    // Convert border radius
    if (convertedStyle.borderRadius) {
      convertedStyle.borderRadius = this.convertBorderRadiusValue(
        convertedStyle.borderRadius,
        theme
      );
    }

    return convertedStyle;
  }

  /**
   * Convert color value to theme color if available
   */
  private static convertColorValue(value: string, theme: Theme): string {
    const colorMappings: Record<string, string> = {
      '#fff': theme.colors.background.primary,
      '#ffffff': theme.colors.background.primary,
      '#000': theme.colors.text.primary,
      '#000000': theme.colors.text.primary,
      '#333': theme.colors.text.primary,
      '#666': theme.colors.text.secondary,
      '#888': theme.colors.text.tertiary,
    };

    return colorMappings[value.toLowerCase()] || value;
  }

  /**
   * Convert spacing value to theme spacing if available
   */
  private static convertSpacingValue(value: number, theme: Theme): number {
    const spacingMappings: Record<number, keyof typeof theme.spacing> = {
      4: 'xs',
      8: 'sm',
      12: 'md',
      16: 'lg',
      20: 'xl',
      24: 'xl',
      32: 'xxl',
    };

    const mappedKey = spacingMappings[value];
    return mappedKey ? theme.spacing[mappedKey] : value;
  }

  /**
   * Convert font size value to theme font size if available
   */
  private static convertFontSizeValue(value: number, theme: Theme): number {
    const fontSizeMappings: Record<
      number,
      keyof typeof theme.typography.fontSize
    > = {
      12: 'xs',
      14: 'sm',
      16: 'md',
      18: 'lg',
      20: 'xl',
      24: 'xxl',
    };

    const mappedKey = fontSizeMappings[value];
    return mappedKey ? theme.typography.fontSize[mappedKey] : value;
  }

  /**
   * Convert font weight value to theme font weight if available
   */
  private static convertFontWeightValue(
    value: string | number,
    theme: Theme
  ): string {
    const fontWeightMappings: Record<
      string,
      keyof typeof theme.typography.fontWeight
    > = {
      '400': 'normal',
      '500': 'medium',
      '600': 'semiBold',
      '700': 'bold',
      normal: 'normal',
      bold: 'bold',
    };

    const mappedKey = fontWeightMappings[value.toString()];
    return mappedKey
      ? theme.typography.fontWeight[mappedKey]
      : value.toString();
  }

  /**
   * Convert border radius value to theme border radius if available
   */
  private static convertBorderRadiusValue(value: number, theme: Theme): number {
    const borderRadiusMappings: Record<
      number,
      keyof typeof theme.borderRadius
    > = {
      4: 'sm',
      8: 'md',
      12: 'lg',
      16: 'xl',
      20: 'xxl',
    };

    const mappedKey = borderRadiusMappings[value];
    return mappedKey ? theme.borderRadius[mappedKey] : value;
  }
}

/**
 * Higher-order component that adds theme compatibility to existing components
 */
export function withThemeCompatibility<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const CompatibleComponent = (props: P) => {
    const theme = useTheme();

    // Inject theme into component props if it accepts it
    const enhancedProps = {
      ...props,
      theme,
    } as P;

    return React.createElement(Component, enhancedProps);
  };

  CompatibleComponent.displayName = `withThemeCompatibility(${Component.displayName || Component.name})`;

  return CompatibleComponent;
}

/**
 * Hook for using legacy styles with theme compatibility
 */
export function useLegacyStyles<T extends Record<string, any>>(
  legacyStyles: T,
  themeAwareStylesFactory?: (theme: Theme) => T
): T {
  const theme = useTheme();

  return React.useMemo(() => {
    const compatibleStylesFactory =
      ThemeCompatibilityLayer.createCompatibleStyles(
        legacyStyles,
        themeAwareStylesFactory
      );

    return StyleSheet.create(compatibleStylesFactory(theme));
  }, [theme, legacyStyles, themeAwareStylesFactory]);
}

/**
 * Utility function to gradually migrate styles
 */
export function createMigrationStyles<T extends Record<string, any>>(
  legacyStyles: T,
  partialThemeStyles?: Partial<Record<keyof T, (theme: Theme) => any>>
): (theme: Theme) => T {
  return (theme: Theme) => {
    const result: any = {};

    for (const [key, legacyStyle] of Object.entries(legacyStyles)) {
      if (partialThemeStyles?.[key as keyof T]) {
        // Use theme-aware style if available
        result[key] = partialThemeStyles[key as keyof T]!(theme);
      } else {
        // Use converted legacy style
        result[key] = ThemeCompatibilityLayer.convertLegacyStyleSheet(
          { [key]: legacyStyle },
          theme
        )[key];
      }
    }

    return StyleSheet.create(result);
  };
}
