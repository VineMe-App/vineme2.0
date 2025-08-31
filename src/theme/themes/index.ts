/**
 * Theme Configurations Index
 * Exports all theme configurations and types
 */

export * from './types';
export * from './light';
export * from './dark';

import { lightTheme } from './light';
import { darkTheme } from './dark';
import { ThemeConfig } from './types';

export const themes: Record<string, ThemeConfig> = {
  light: lightTheme,
  dark: darkTheme,
};

export const defaultTheme = lightTheme;