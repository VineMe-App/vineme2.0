import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/provider/useTheme';
import { typographyVariants } from '../../theme/tokens/typography';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  /**
   * Typography variant to apply
   */
  variant?: keyof typeof typographyVariants;

  /**
   * Text color variant
   */
  color?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'inverse'
    | 'disabled'
    | 'success'
    | 'warning'
    | 'error'
    | 'info';

  /**
   * Font weight override
   */
  weight?:
    | 'thin'
    | 'extraLight'
    | 'light'
    | 'normal'
    | 'medium'
    | 'semiBold'
    | 'bold'
    | 'extraBold'
    | 'black';

  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right' | 'justify';

  /**
   * Whether text should be selectable
   */
  selectable?: boolean;

  /**
   * Custom style overrides
   */
  style?: TextStyle | TextStyle[];

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Children content
   */
  children: React.ReactNode;
}

/**
 * Text component with predefined typography variants and theme integration
 *
 * Features:
 * - Semantic typography variants (headings, body, captions)
 * - Theme-aware color system
 * - Accessibility support with proper scaling
 * - Font weight variations
 * - Text alignment options
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  align = 'left',
  selectable = false,
  style,
  testID,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  // Get typography variant configuration
  const typographyConfig = typographyVariants[variant];

  // Normalize any incoming fontWeight value to a key we can map
  const normalizeWeightKey = (
    w?: string | number
  ): TextProps['weight'] | undefined => {
    if (w == null) return undefined;
    const v = String(w);
    switch (v) {
      case '100':
        return 'thin';
      case '200':
        return 'extraLight';
      case '300':
        return 'light';
      case '400':
      case 'normal':
        return 'normal';
      case '500':
        return 'medium';
      case '600':
        return 'semiBold';
      case '700':
      case 'bold':
        return 'bold';
      case '800':
        return 'extraBold';
      case '900':
        return 'black';
      default:
        return undefined;
    }
  };

  // Determine the effective weight: prop > style > variant
  // We only need this to pick the correct fontFamily
  const incomingStyle = StyleSheet.flatten(style as any) as
    | TextStyle
    | undefined;
  const styleWeightKey = normalizeWeightKey(incomingStyle?.fontWeight as any);
  const variantWeightKey = normalizeWeightKey(typographyConfig.fontWeight);
  const effectiveWeight: TextProps['weight'] =
    weight || styleWeightKey || variantWeightKey || 'normal';

  // Get text color from theme
  const getTextColor = (): string => {
    switch (color) {
      case 'primary':
        return theme.colors.text.primary;
      case 'secondary':
        return theme.colors.text.secondary;
      case 'tertiary':
        return theme.colors.text.tertiary;
      case 'inverse':
        return theme.colors.text.inverse;
      case 'disabled':
        return theme.colors.text.disabled;
      case 'success':
        return theme.colors.success[600];
      case 'warning':
        return theme.colors.warning[600];
      case 'error':
        return theme.colors.error[600];
      case 'info':
        return theme.colors.info[600];
      default:
        return theme.colors.text.primary;
    }
  };

  // Get appropriate font family based on weight
  const getFontFamily = (): string => {
    const w = effectiveWeight;
    if (w) {
      switch (w) {
        case 'thin':
        case 'extraLight':
        case 'light':
        case 'normal':
          return theme.typography.fontFamily.regular;
        case 'medium':
          return theme.typography.fontFamily.medium;
        case 'semiBold':
          return theme.typography.fontFamily.semiBold;
        case 'bold':
          return theme.typography.fontFamily.bold;
        case 'extraBold':
          return (
            theme.typography.fontFamily.extraBold ||
            theme.typography.fontFamily.bold
          );
        case 'black':
          // Figtree may not include Black; fall back to ExtraBold, then Bold
          return (
            (theme.typography.fontFamily as any).black ||
            theme.typography.fontFamily.extraBold ||
            theme.typography.fontFamily.bold
          );
        default:
          return theme.typography.fontFamily.regular;
      }
    }
    return theme.typography.fontFamily.regular;
  };

  // Create base text style
  const baseStyle: TextStyle = {
    fontSize: typographyConfig.fontSize,
    lineHeight: typographyConfig.lineHeight,
    // We select fontFamily explicitly based on the intended weight
    // and intentionally avoid setting fontWeight to prevent fallbacks.
    letterSpacing: typographyConfig.letterSpacing,
    color: getTextColor(),
    textAlign: align,
    fontFamily: getFontFamily(),
  };

  // Combine styles - handle both single style and array of styles
  const stylesToCombine = [baseStyle];
  if (style) {
    if (Array.isArray(style)) {
      stylesToCombine.push(...style);
    } else {
      stylesToCombine.push(style);
    }
  }

  let combinedStyle = StyleSheet.flatten(stylesToCombine) as TextStyle;

  // Remove fontWeight on all platforms to ensure custom font is used
  // and avoid the system trying to synthesize weights or fallback.
  if ((combinedStyle as any).fontWeight) {
    delete (combinedStyle as any).fontWeight;
  }
  combinedStyle.fontFamily = getFontFamily();

  // Prevent descenders from being clipped on Android by ensuring
  // line-height is slightly larger than font size.
  if (Platform.OS === 'android') {
    const resolvedFontSize =
      combinedStyle.fontSize ?? typographyConfig.fontSize ?? 0;
    const resolvedLineHeight =
      combinedStyle.lineHeight ?? typographyConfig.lineHeight ?? 0;
    const minimumLineHeight =
      resolvedFontSize > 0 ? resolvedFontSize + 4 : resolvedLineHeight;

    if (
      minimumLineHeight &&
      (!resolvedLineHeight || resolvedLineHeight < minimumLineHeight)
    ) {
      combinedStyle.lineHeight = minimumLineHeight;
    }
  }

  // Accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityRole: getAccessibilityRole(variant),
    accessibilityLabel: typeof children === 'string' ? children : undefined,
    ...props,
  };

  return (
    <RNText
      style={combinedStyle}
      selectable={selectable}
      testID={testID}
      allowFontScaling={true} // Enable accessibility font scaling
      maxFontSizeMultiplier={Platform.OS === 'ios' ? 1.5 : 2} // Limit scaling for readability
      {...accessibilityProps}
    >
      {children}
    </RNText>
  );
};

/**
 * Get appropriate accessibility role based on typography variant
 */
function getAccessibilityRole(
  variant: keyof typeof typographyVariants
): 'text' | 'header' {
  const headingVariants = [
    'display1',
    'display2',
    'display3',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ];
  return headingVariants.includes(variant) ? 'header' : 'text';
}

// Predefined text components for common use cases
export const Heading1: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h4" {...props} />
);

export const Heading5: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h5" {...props} />
);

export const Heading6: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h6" {...props} />
);

export const BodyText: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="body" {...props} />
);

export const BodyLarge: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="bodyLarge" {...props} />
);

export const BodySmall: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="bodySmall" {...props} />
);

export const Caption: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="caption" {...props} />
);

export const Label: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="label" {...props} />
);

export const LabelLarge: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="labelLarge" {...props} />
);

export const LabelSmall: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="labelSmall" {...props} />
);

export default Text;
