/**
 * Enhanced Color Token System
 * Provides semantic color naming with accessibility features
 */

export interface ColorToken {
  50: string; // Lightest
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; // Base color
  600: string;
  700: string;
  800: string;
  900: string; // Darkest
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
  // Individual color palettes
  blue: ColorToken;
  green: ColorToken;
  orange: ColorToken;
  red: ColorToken;
  purple: ColorToken;

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

// Primary color palette - Updated to use #ff0083 (hot pink)
export const primaryColors: ColorToken = {
  50: '#fff0f8',
  100: '#ffe0f1',
  200: '#ffc1e3',
  300: '#ff82c7',
  400: '#ff43ab',
  500: '#ff0083', // Base primary - hot pink
  600: '#e60075',
  700: '#cc0067',
  800: '#b30059',
  900: '#99004b',
};

// Secondary color palette - Updated to use #FFFBEE (light cream)
export const secondaryColors: ColorToken = {
  50: '#fffef9',
  100: '#FFFBEE', // Base secondary - light cream
  200: '#fff8e0',
  300: '#fff5d1',
  400: '#fff2c2',
  500: '#ffefb3',
  600: '#e6d7a1',
  700: '#ccbf8f',
  800: '#b3a77d',
  900: '#998f6b',
};

// Success color palette - Using primary pink instead of green
export const successColors: ColorToken = {
  50: '#fff0f8',
  100: '#ffe0f1',
  200: '#ffc1e3',
  300: '#ff82c7',
  400: '#ff43ab',
  500: '#ff0083', // Base success - using primary pink
  600: '#e60075',
  700: '#cc0067',
  800: '#b30059',
  900: '#99004b',
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

// Neutral color palette - Updated dark colors to use #2C2235
export const neutralColors: ColorToken = {
  50: '#fafafa',
  100: '#f0f3ea',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a', // Base neutral
  600: '#52525b',
  700: '#3f3f46',
  800: '#2C2235', // Updated to use dark color
  900: '#1a1a1f',
};

// Blue color palette
export const blueColors: ColorToken = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6', // Base blue
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
};

// Green color palette - Replaced with primary pink palette (no longer using green)
export const greenColors: ColorToken = {
  50: '#fff0f8',
  100: '#ffe0f1',
  200: '#ffc1e3',
  300: '#ff82c7',
  400: '#ff43ab',
  500: '#ff0083', // Base - using primary pink instead of green
  600: '#e60075',
  700: '#cc0067',
  800: '#b30059',
  900: '#99004b',
};

// Orange color palette
export const orangeColors: ColorToken = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316', // Base orange
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
};

// Red color palette
export const redColors: ColorToken = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444', // Base red
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
};

// Purple color palette
export const purpleColors: ColorToken = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7', // Base purple
  600: '#9333ea',
  700: '#7c3aed',
  800: '#6b21a8',
  900: '#581c87',
};

// Re-export color utilities from the main utils file
export { colorUtils } from '../../utils/colors';
