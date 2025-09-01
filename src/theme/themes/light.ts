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
  defaultTypography,
  spacing,
  shadows,
  borderRadius,
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

    // Background colors
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      inverse: '#0f172a',
    },

    // Text colors
    text: {
      primary: '#0f172a',
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
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      overlay: 'rgba(15, 23, 42, 0.5)',
    },
  },

  typography: defaultTypography,
  spacing,
  borderRadius,
  shadows,

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