/**
 * Theme Provider Tests
 * Tests for ThemeProvider component and theme context functionality
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme, useThemeSafe } from '../provider';
import { lightTheme, darkTheme } from '../themes';
import { ThemeMode } from '../themes/types';

describe('ThemeProvider', () => {
  describe('Basic Functionality', () => {
    it('should provide theme context with default values', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBeDefined();
      expect(result.current.theme.name).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(result.current.themeMode).toBe('system');
      expect(result.current.colors).toBeDefined();
      expect(result.current.spacing).toBeDefined();
      expect(result.current.typography).toBeDefined();
    });

    it('should respect initial theme mode', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="dark">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme.name).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(result.current.themeMode).toBe('dark');
    });

    it('should provide light theme when initialTheme is light', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme.name).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(result.current.themeMode).toBe('light');
    });
  });

  describe('Theme Switching', () => {
    it('should switch themes using setThemeMode', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme.name).toBe('light');
      expect(result.current.themeMode).toBe('light');

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(result.current.theme.name).toBe('dark');
      expect(result.current.themeMode).toBe('dark');
      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.setThemeMode('light');
      });

      expect(result.current.theme.name).toBe('light');
      expect(result.current.themeMode).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should toggle themes using toggleTheme', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme.name).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme.name).toBe('dark');
      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme.name).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should handle setTheme with theme configs', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme.name).toBe('light');

      act(() => {
        result.current.setTheme(darkTheme);
      });

      expect(result.current.theme.name).toBe('dark');
      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.setTheme(lightTheme);
      });

      expect(result.current.theme.name).toBe('light');
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('System Theme Support', () => {
    it('should handle system theme mode', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="system">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeMode).toBe('system');
      expect(result.current.theme).toBeDefined();
      // System theme defaults to light in our test environment
      expect(result.current.theme.name).toBe('light');
    });
  });

  describe('Context Values', () => {
    it('should provide all required context values', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBeDefined();
      expect(result.current.colors).toBeDefined();
      expect(result.current.spacing).toBeDefined();
      expect(result.current.typography).toBeDefined();
      expect(result.current.shadows).toBeDefined();
      expect(result.current.borderRadius).toBeDefined();
      expect(typeof result.current.setTheme).toBe('function');
      expect(typeof result.current.setThemeMode).toBe('function');
      expect(typeof result.current.toggleTheme).toBe('function');
    });

    it('should provide theme-specific values correctly', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.colors.primary[500]).toBe(
        lightTheme.colors.primary[500]
      );
      expect(result.current.spacing[4]).toBe(lightTheme.spacing[4]);
      expect(result.current.typography.fontSize.base).toBe(
        lightTheme.typography.fontSize.base
      );
    });
  });

  describe('Theme Configuration', () => {
    it('should provide correct theme properties for light theme', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme.name).toBe('light');
      expect(result.current.theme.isDark).toBe(false);
      expect(result.current.isDark).toBe(false);
      expect(result.current.colors.background.primary).toBe(
        lightTheme.colors.background.primary
      );
    });

    it('should provide correct theme properties for dark theme', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="dark">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme.name).toBe('dark');
      expect(result.current.theme.isDark).toBe(true);
      expect(result.current.isDark).toBe(true);
      expect(result.current.colors.background.primary).toBe(
        darkTheme.colors.background.primary
      );
    });
  });
});

describe('useTheme Hook', () => {
  it('should throw error when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('should work correctly with renderHook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBeDefined();
    expect(result.current.isDark).toBe(false);
    expect(result.current.themeMode).toBe('system');
  });
});

describe('useThemeSafe Hook', () => {
  it('should return undefined when used outside ThemeProvider', () => {
    const { result } = renderHook(() => useThemeSafe());
    expect(result.current).toBeUndefined();
  });

  it('should return theme context when used inside ThemeProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useThemeSafe(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current?.theme).toBeDefined();
    expect(result.current?.isDark).toBe(false);
  });
});
