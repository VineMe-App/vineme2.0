/**
 * Theme System Index
 * Main entry point for the enhanced theme system
 */

// Export all tokens
export * from './tokens';

// Export all theme configurations
export * from './themes';

// Export utilities
export {
  colorUtils,
  spacingUtils,
  shadowUtils,
  borderRadiusUtils,
} from './tokens';

// Export default theme for easy access
export { defaultTheme, themes } from './themes';