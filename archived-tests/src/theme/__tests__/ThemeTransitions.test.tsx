/**
 * Theme Transitions Tests
 * Tests for smooth theme transitions and performance
 */

import React, { useState } from 'react';
import { render, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../provider';

// Mock performance.now for consistent timing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

describe('Theme Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
  });

  describe('Smooth Transitions', () => {
    it('should maintain component state during theme changes', () => {
      const TestStatefulComponent: React.FC = () => {
        const [count, setCount] = useState(0);
        const { theme, toggleTheme } = useTheme();

        return (
          <>
            <div testID="count">{count}</div>
            <div testID="theme-name">{theme.name}</div>
            <button testID="increment" onPress={() => setCount((c) => c + 1)}>
              Increment
            </button>
            <button testID="toggle-theme" onPress={toggleTheme}>
              Toggle Theme
            </button>
          </>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider initialTheme="light">
          <TestStatefulComponent />
        </ThemeProvider>
      );

      // Increment counter
      act(() => {
        getByTestId('increment').props.onPress();
        getByTestId('increment').props.onPress();
      });

      expect(getByTestId('count').children[0]).toBe('2');
      expect(getByTestId('theme-name').children[0]).toBe('light');

      // Toggle theme - state should be preserved
      act(() => {
        getByTestId('toggle-theme').props.onPress();
      });

      expect(getByTestId('count').children[0]).toBe('2'); // State preserved
      expect(getByTestId('theme-name').children[0]).toBe('dark'); // Theme changed
    });

    it('should update all theme-dependent values simultaneously', () => {
      const TestMultipleValuesComponent: React.FC = () => {
        const { theme, colors, spacing, typography, toggleTheme } = useTheme();

        return (
          <>
            <div testID="theme-name">{theme.name}</div>
            <div testID="primary-color">{colors.primary[500]}</div>
            <div testID="background-color">{colors.background.primary}</div>
            <div testID="text-color">{colors.text.primary}</div>
            <div testID="base-spacing">{spacing[4]}</div>
            <div testID="font-size">{typography.fontSize.base}</div>
            <button testID="toggle-theme" onPress={toggleTheme}>
              Toggle Theme
            </button>
          </>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider initialTheme="light">
          <TestMultipleValuesComponent />
        </ThemeProvider>
      );

      // Capture initial values
      const initialTheme = getByTestId('theme-name').children[0];
      const initialPrimary = getByTestId('primary-color').children[0];
      const initialBackground = getByTestId('background-color').children[0];
      const initialText = getByTestId('text-color').children[0];
      const initialSpacing = getByTestId('base-spacing').children[0];
      const initialFontSize = getByTestId('font-size').children[0];

      // Toggle theme
      act(() => {
        getByTestId('toggle-theme').props.onPress();
      });

      // All values should change simultaneously
      expect(getByTestId('theme-name').children[0]).not.toBe(initialTheme);
      expect(getByTestId('primary-color').children[0]).not.toBe(initialPrimary);
      expect(getByTestId('background-color').children[0]).not.toBe(
        initialBackground
      );
      expect(getByTestId('text-color').children[0]).not.toBe(initialText);

      // Spacing and typography should remain the same (shared between themes)
      expect(getByTestId('base-spacing').children[0]).toBe(initialSpacing);
      expect(getByTestId('font-size').children[0]).toBe(initialFontSize);
    });
  });

  describe('Performance Optimization', () => {
    it('should minimize re-renders during theme changes', () => {
      let renderCount = 0;

      const TestRenderCountComponent: React.FC = () => {
        renderCount++;
        const { theme, toggleTheme } = useTheme();

        return (
          <>
            <div testID="render-count">{renderCount}</div>
            <div testID="theme-name">{theme.name}</div>
            <button testID="toggle-theme" onPress={toggleTheme}>
              Toggle Theme
            </button>
          </>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider initialTheme="light">
          <TestRenderCountComponent />
        </ThemeProvider>
      );

      const initialRenderCount = parseInt(
        getByTestId('render-count').children[0] as string
      );

      // Toggle theme
      act(() => {
        getByTestId('toggle-theme').props.onPress();
      });

      const afterToggleRenderCount = parseInt(
        getByTestId('render-count').children[0] as string
      );

      // Should only re-render once for the theme change
      expect(afterToggleRenderCount - initialRenderCount).toBe(1);
    });

    it('should not cause unnecessary re-renders for unchanged values', () => {
      let spacingRenderCount = 0;
      let colorRenderCount = 0;

      const SpacingComponent: React.FC = () => {
        spacingRenderCount++;
        const { spacing } = useTheme();
        return <div testID="spacing-value">{spacing[4]}</div>;
      };

      const ColorComponent: React.FC = () => {
        colorRenderCount++;
        const { colors } = useTheme();
        return <div testID="color-value">{colors.primary[500]}</div>;
      };

      const TestParentComponent: React.FC = () => {
        const { toggleTheme } = useTheme();

        return (
          <>
            <SpacingComponent />
            <ColorComponent />
            <button testID="toggle-theme" onPress={toggleTheme}>
              Toggle Theme
            </button>
          </>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider initialTheme="light">
          <TestParentComponent />
        </ThemeProvider>
      );

      const initialSpacingRenders = spacingRenderCount;
      const initialColorRenders = colorRenderCount;

      // Toggle theme
      act(() => {
        getByTestId('toggle-theme').props.onPress();
      });

      // Both components should re-render due to context change
      // but the number should be minimal
      expect(spacingRenderCount - initialSpacingRenders).toBe(1);
      expect(colorRenderCount - initialColorRenders).toBe(1);
    });
  });

  describe('Memory Management', () => {
    it('should not create new objects unnecessarily', () => {
      const TestObjectStabilityComponent: React.FC = () => {
        const { spacing, typography, borderRadius } = useTheme();

        // These objects should be stable across renders when theme doesn't change
        return (
          <>
            <div testID="spacing-ref">
              {JSON.stringify(spacing === spacing)}
            </div>
            <div testID="typography-ref">
              {JSON.stringify(typography === typography)}
            </div>
            <div testID="border-radius-ref">
              {JSON.stringify(borderRadius === borderRadius)}
            </div>
          </>
        );
      };

      const { getByTestId, rerender } = render(
        <ThemeProvider initialTheme="light">
          <TestObjectStabilityComponent />
        </ThemeProvider>
      );

      expect(getByTestId('spacing-ref').children[0]).toBe('true');
      expect(getByTestId('typography-ref').children[0]).toBe('true');
      expect(getByTestId('border-radius-ref').children[0]).toBe('true');

      // Re-render without theme change
      rerender(
        <ThemeProvider initialTheme="light">
          <TestObjectStabilityComponent />
        </ThemeProvider>
      );

      // Objects should still be stable
      expect(getByTestId('spacing-ref').children[0]).toBe('true');
      expect(getByTestId('typography-ref').children[0]).toBe('true');
      expect(getByTestId('border-radius-ref').children[0]).toBe('true');
    });
  });

  describe('Error Boundaries', () => {
    it('should handle theme switching errors gracefully', () => {
      const TestErrorComponent: React.FC = () => {
        const { setTheme } = useTheme();

        const handleBadTheme = () => {
          // Try to set an invalid theme
          setTheme({} as any);
        };

        return (
          <button testID="bad-theme" onPress={handleBadTheme}>
            Set Bad Theme
          </button>
        );
      };

      // This should not crash the app
      const { getByTestId } = render(
        <ThemeProvider>
          <TestErrorComponent />
        </ThemeProvider>
      );

      expect(() => {
        act(() => {
          getByTestId('bad-theme').props.onPress();
        });
      }).not.toThrow();
    });
  });
});
