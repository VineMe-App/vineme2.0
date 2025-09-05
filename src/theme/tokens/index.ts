/**
 * Theme Tokens Index
 * Exports all design tokens for the theme system
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './borderRadius';
export * from './animations';

// Export individual color palettes
export {
  blueColors,
  greenColors,
  orangeColors,
  redColors,
  purpleColors,
} from './colors';

// Re-export commonly used types and utilities
export type {
  ColorToken,
  SemanticColors,
  ThemeColors,
} from './colors';

export type {
  ThemeTypography,
  TypographyVariant,
} from './typography';

export type {
  ThemeSpacing,
} from './spacing';

export type {
  ThemeShadows,
  ShadowToken,
} from './shadows';

export type {
  ThemeBorderRadius,
} from './borderRadius';

export type {
  AnimationConfig,
} from './animations';

export { colorUtils } from './colors';
export { spacingUtils } from './spacing';
export { shadowUtils } from './shadows';
export { borderRadiusUtils } from './borderRadius';