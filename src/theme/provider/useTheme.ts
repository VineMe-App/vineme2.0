/**
 * useTheme Hook
 * Hook for accessing theme values throughout the app
 */

import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { ThemeContextValue } from '../themes/types';

/**
 * Hook to access the current theme context
 * @returns ThemeContextValue containing theme data and methods
 * @throws Error if used outside of ThemeProvider
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

/**
 * Hook to safely access theme context (returns undefined if not in provider)
 * @returns ThemeContextValue or undefined
 */
export const useThemeSafe = (): ThemeContextValue | undefined => {
  return useContext(ThemeContext);
};