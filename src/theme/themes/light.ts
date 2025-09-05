/**
 * Light Theme Configuration
 * Defines the light theme with all design tokens
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

export const lightTheme: ThemeConfig = {
  name: 'light',
  colors: {
    // Semantic color palettes
    primary: primaryColors,
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

    // Background colors
    background: {
      primary: secondaryColors[100], // Changed from '#ffffff' to secondary light blue
      secondary: '#ffffff', // Changed from '#f8fafc' to white
      tertiary: '#f8fafc', // Changed from '#f1f5f9' to previous secondary
      inverse: '#0f172a',
    },

    // Text colors
    text: {
      primary: '#000000', // Updated to use black as requested
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#ffffff',
      disabled: '#94a3b8',
    },

    // Border colors
    border: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
      focus: primaryColors[500],
      error: errorColors[500],
    },

    // Surface colors
    surface: {
      primary: '#ffffff', // Keep white for cards/surfaces
      secondary: secondaryColors[50], // Use very light secondary for subtle surfaces
      tertiary: '#f8fafc', // Use previous secondary
      overlay: 'rgba(15, 23, 42, 0.5)',
    },
  },

  typography: defaultTypography,
  spacing,
  borderRadius,
  shadows,

  animations,

  assets: defaultAssets,
};