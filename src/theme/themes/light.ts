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
  tertiaryColors,
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
    tertiary: tertiaryColors,
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
      primary: '#fffbee', // White
      secondary: '#FFFBEE', // Updated to use light cream color
      tertiary: '#fff8e0', // Lighter cream variant
      inverse: tertiaryColors[500], // Updated to use dark color
    },

    // Text colors
    text: {
      primary: tertiaryColors[500], // Updated to use dark color
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#fffbee',
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
      primary: '#FFFFFE', // White for cards/surfaces
      secondary: '#FFFBEE', // Updated to use light cream color
      tertiary: '#fff8e0', // Lighter cream variant
      overlay: 'rgba(44, 34, 53, 0.5)', // Updated to use dark color with opacity
    },
  },

  typography: defaultTypography,
  spacing,
  borderRadius,
  shadows,

  animations,

  assets: defaultAssets,
};
