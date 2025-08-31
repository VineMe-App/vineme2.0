/**
 * Theme Type Definitions
 * Defines the complete theme structure and configuration types
 */

import {
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeShadows,
  ThemeBorderRadius,
} from '../tokens';

export interface AnimationConfig {
  duration: {
    fast: number;
    normal: number;
    slow: number;
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface AssetConfig {
  logos: {
    full: any; // ImageSourcePropType
    icon: any; // ImageSourcePropType
    light: any; // ImageSourcePropType
    dark: any; // ImageSourcePropType
  };
  icons: Record<string, any>; // Record<string, ImageSourcePropType>
  animations: Record<string, any>; // Lottie animations
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  animations: AnimationConfig;
  assets: AssetConfig;
}

export interface Theme extends ThemeConfig {
  isDark: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: ThemeConfig) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  shadows: ThemeShadows;
  borderRadius: ThemeBorderRadius;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
}