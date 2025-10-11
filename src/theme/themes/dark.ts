/**
 * Dark Theme Configuration
 * Defines the dark theme with all design tokens
 */

import {
  primaryColors,
  secondaryColors,
  successColors,
  warningColors,
  errorColors,
  infoColors,
  neutralColors,
  blueColors,
  greenColors,
  orangeColors,
  redColors,
  purpleColors,
  defaultTypography,
  spacing,
  shadows,
  borderRadius,
  animations,
} from '../tokens';
import { ThemeConfig } from './types';
import { defaultAssets } from '../../assets';

export const darkTheme: ThemeConfig = {
  name: 'dark',
  colors: {
    // Semantic color palettes (adjusted for dark theme)
    primary: {
      ...primaryColors,
      // Swap lighter and darker shades for better contrast in dark mode
      50: primaryColors[900],
      100: primaryColors[800],
      200: primaryColors[700],
      300: primaryColors[600],
      400: primaryColors[500],
      500: primaryColors[400], // Base color adjusted
      600: primaryColors[300],
      700: primaryColors[200],
      800: primaryColors[100],
      900: primaryColors[50],
    },
    secondary: secondaryColors,
    success: successColors,
    warning: warningColors,
    error: errorColors,
    info: infoColors,
    neutral: neutralColors,

    // Individual color palettes
    blue: blueColors,
    green: greenColors,
    orange: orangeColors,
    red: redColors,
    purple: purpleColors,

    // Background colors (dark theme)
    background: {
      primary: '#0f172a', // Keep dark primary for dark theme
      secondary: '#1e293b', // Keep dark secondary
      tertiary: '#334155', // Keep dark tertiary
      inverse: '#ffffff',
    },

    // Text colors (dark theme)
    text: {
      primary: '#ffffff', // Keep white for dark theme readability
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      inverse: '#000000', // Updated to use black as requested
      disabled: '#64748b',
    },

    // Border colors (dark theme)
    border: {
      primary: '#334155',
      secondary: '#475569',
      focus: primaryColors[400],
      error: errorColors[400],
    },

    // Surface colors (dark theme)
    surface: {
      primary: '#1e293b', // Keep dark primary
      secondary: '#334155', // Keep dark secondary
      tertiary: '#475569', // Keep dark tertiary
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
  },

  typography: defaultTypography,
  spacing,
  borderRadius,
  shadows: {
    ...shadows,
    // Adjust shadow colors for dark theme
    xs: { ...shadows.xs, shadowColor: '#000000', shadowOpacity: 0.3 },
    sm: { ...shadows.sm, shadowColor: '#000000', shadowOpacity: 0.3 },
    md: { ...shadows.md, shadowColor: '#000000', shadowOpacity: 0.4 },
    lg: { ...shadows.lg, shadowColor: '#000000', shadowOpacity: 0.4 },
    xl: { ...shadows.xl, shadowColor: '#000000', shadowOpacity: 0.5 },
    '2xl': { ...shadows['2xl'], shadowColor: '#000000', shadowOpacity: 0.5 },
    '3xl': { ...shadows['3xl'], shadowColor: '#000000', shadowOpacity: 0.6 },
  },

  animations,

  assets: defaultAssets,
};
