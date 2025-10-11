/**
 * Theme Provider Component
 * Provides theme context and manages theme switching with smooth transitions
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import * as Font from 'expo-font';
import { Appearance, ColorSchemeName } from 'react-native';
import { ThemeContext } from './ThemeContext';
import { lightTheme, darkTheme } from '../themes';
import {
  ThemeProviderProps,
  ThemeMode,
  Theme,
  ThemeConfig,
  ThemeContextValue,
} from '../themes/types';
import { assetManager, AssetConfig } from '../../assets';
import {
  ThemeSwitchingOptimizer,
  StylePerformanceDebugger,
} from '../../utils/performanceStyleUtils';

/**
 * ThemeProvider component that manages theme state and provides context
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'system',
}) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialTheme);
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  const previousThemeRef = useRef<Theme | null>(null);

  // Listen to system color scheme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Determine if dark mode should be active
  const isDark = useMemo(() => {
    switch (themeMode) {
      case 'dark':
        return true;
      case 'light':
        return false;
      case 'system':
        return systemColorScheme === 'dark';
      default:
        return false;
    }
  }, [themeMode, systemColorScheme]);

  // Get the current theme configuration
  const currentThemeConfig = useMemo(() => {
    return isDark ? darkTheme : lightTheme;
  }, [isDark]);

  // Create the complete theme object with performance optimization
  const theme: Theme = useMemo(() => {
    const newTheme = {
      ...currentThemeConfig,
      isDark,
    };

    // Log theme creation for performance monitoring
    StylePerformanceDebugger.log('theme_creation', 'Theme object created', {
      themeName: newTheme.name,
      isDark: newTheme.isDark,
    });

    return newTheme;
  }, [currentThemeConfig, isDark]);

  // Theme switching functions
  const setTheme = useCallback((newTheme: ThemeConfig) => {
    try {
      // Validate theme structure
      if (!newTheme || !newTheme.name || !newTheme.colors) {
        console.warn('Invalid theme provided, ignoring theme change');
        return;
      }

      // For custom themes, we'll set the mode to the theme name
      // This is a simplified implementation - in a full system you might
      // want to store custom themes separately
      if (newTheme.name === 'light') {
        setThemeMode('light');
      } else if (newTheme.name === 'dark') {
        setThemeMode('dark');
      } else {
        // For custom themes, default to light/dark based on theme characteristics
        // This is a basic heuristic - you could make this more sophisticated
        const isCustomDark =
          newTheme.colors?.background?.primary ===
          darkTheme.colors.background.primary;
        setThemeMode(isCustomDark ? 'dark' : 'light');
      }
    } catch (error) {
      console.warn('Error setting theme:', error);
      // Don't change theme if there's an error
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const previousTheme = previousThemeRef.current;

    if (themeMode === 'system') {
      // If currently system, toggle to opposite of current system setting
      const newMode = systemColorScheme === 'dark' ? 'light' : 'dark';

      if (previousTheme) {
        const newTheme = newMode === 'dark' ? darkTheme : lightTheme;
        ThemeSwitchingOptimizer.optimizeThemeSwitch(
          previousTheme,
          { ...newTheme, isDark: newMode === 'dark' },
          () => setThemeMode(newMode)
        );
      } else {
        setThemeMode(newMode);
      }
    } else {
      // Toggle between light and dark
      const newMode = themeMode === 'light' ? 'dark' : 'light';

      if (previousTheme) {
        const newTheme = newMode === 'dark' ? darkTheme : lightTheme;
        ThemeSwitchingOptimizer.optimizeThemeSwitch(
          previousTheme,
          { ...newTheme, isDark: newMode === 'dark' },
          () => setThemeMode(newMode)
        );
      } else {
        setThemeMode(newMode);
      }
    }
  }, [themeMode, systemColorScheme]);

  // Asset management functions
  const updateAssets = useCallback((newAssets: Partial<AssetConfig>) => {
    try {
      assetManager.updateAssets(newAssets);
      // Force re-render by updating a state value
      // In a production app, you might want to use a more sophisticated approach
      setThemeMode((current) => current);
    } catch (error) {
      console.warn('Error updating assets:', error);
    }
  }, []);

  // Update previous theme reference for performance optimization
  useEffect(() => {
    previousThemeRef.current = theme;
  }, [theme]);

  // Create context value with performance optimization
  const contextValue: ThemeContextValue = useMemo(
    () => ({
      theme,
      setTheme,
      themeMode,
      setThemeMode,
      isDark,
      toggleTheme,
      colors: theme.colors,
      spacing: theme.spacing,
      typography: theme.typography,
      shadows: theme.shadows,
      borderRadius: theme.borderRadius,
      assets: theme.assets,
      updateAssets,
    }),
    [
      theme,
      setTheme,
      themeMode,
      setThemeMode,
      isDark,
      toggleTheme,
      updateAssets,
    ]
  );

  console.log('theme2', theme);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
