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
  AnimationConfig,
} from '../tokens';
import { AssetConfig } from '../../assets';

// AnimationConfig is now imported from tokens

// AssetConfig is now imported from assets module

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
  assets: AssetConfig;
  updateAssets: (assets: Partial<AssetConfig>) => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
}