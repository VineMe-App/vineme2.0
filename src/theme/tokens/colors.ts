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

// Primary color palette - Updated to use #f10078
export const primaryColors: ColorToken = {
  50: '#fdf2f8',
  100: '#fce7f3',
  200: '#fbcfe8',
  300: '#f9a8d4',
  400: '#f472b6',
  500: '#f10078', // Base primary - the requested color
  600: '#db2777',
  700: '#be185d',
  800: '#9d174d',
  900: '#831843',
};

// Secondary color palette - Updated to use #e3ffd1
export const secondaryColors: ColorToken = {
  50: '#f7fef4',
  100: '#e3ffd1', // Base secondary - the requested color
  200: '#c7ffa3',
  300: '#abff75',
  400: '#8fff47',
  500: '#73ff19',
  600: '#5ce600',
  700: '#45b300',
  800: '#2e8000',
  900: '#174d00',
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

// Green color palette
export const greenColors: ColorToken = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e', // Base green
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
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