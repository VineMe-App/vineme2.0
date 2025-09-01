/**
 * Enhanced Color Token System
 * Provides semantic color naming with accessibility features
 */

export interface ColorToken {
  50: string;   // Lightest
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;  // Base color
  600: string;
  700: string;
  800: string;
  900: string;  // Darkest
}

export interface SemanticColors {
  primary: ColorToken;
  secondary: ColorToken;
  success: ColorToken;
  warning: ColorToken;
  error: ColorToken;
  info: ColorToken;
  neutral: ColorToken;
}

export interface ThemeColors extends SemanticColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    disabled: string;
  };
  border: {
    primary: string;
    secondary: string;
    focus: string;
    error: string;
  };
  surface: {
    primary: string;
    secondary: string;
    tertiary: string;
    overlay: string;
  };
}

// Primary color palette
export const primaryColors: ColorToken = {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9', // Base primary
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
};

// Secondary color palette
export const secondaryColors: ColorToken = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e4',
  300: '#d6d3d1',
  400: '#a8a29e',
  500: '#78716c', // Base secondary
  600: '#57534e',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
};

// Success color palette
export const successColors: ColorToken = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e', // Base success
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
};

// Warning color palette
export const warningColors: ColorToken = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b', // Base warning
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
};

// Error color palette
export const errorColors: ColorToken = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444', // Base error
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
};

// Info color palette
export const infoColors: ColorToken = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6', // Base info
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
};

// Neutral color palette
export const neutralColors: ColorToken = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a', // Base neutral
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
};

// Re-export color utilities from the main utils file
export { colorUtils } from '../../utils/colors';