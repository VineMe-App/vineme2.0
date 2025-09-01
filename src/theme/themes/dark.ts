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
  defaultTypography,
  spacing,
  shadows,
  borderRadius,
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

    // Background colors (dark theme)
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      inverse: '#ffffff',
    },

    // Text colors (dark theme)
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      inverse: '#0f172a',
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
      primary: '#1e293b',
      secondary: '#334155',
      tertiary: '#475569',
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

  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      linear: 'linear',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },

  assets: defaultAssets,
};