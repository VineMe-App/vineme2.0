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
      primary: '#ffffff', // Reverted back to white
      secondary: '#f8fafc', // Reverted back to light gray
      tertiary: '#f1f5f9', // Reverted back to previous tertiary
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
      primary: '#ffffff', // White for cards/surfaces
      secondary: '#f8fafc', // Light gray for subtle surfaces
      tertiary: '#f1f5f9', // Slightly darker gray
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