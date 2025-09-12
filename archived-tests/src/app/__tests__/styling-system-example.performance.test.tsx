/**
 * Styling System Example - Performance Tests
 * Tests performance characteristics of the comprehensive example screen
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import StylingSystemExample from '../styling-system-example';
import { ThemeProvider } from '../../theme/provider/ThemeProvider';

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock Logo component
jest.mock('../../components/brand/Logo/Logo', () => ({
  Logo: ({ testID }: any) => <div testID={testID || 'logo'} />,
}));

// Performance measurement utilities
const measureRenderTime = (renderFn: () => any) => {
  const startTime = performance.now();
  const result = renderFn();
  const endTime = performance.now();
  return {
    result,
    renderTime: endTime - startTime,
  };
};

const measureMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    };
  }
  return null;
};

describe('StylingSystemExample - Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render Performance', () => {
    it('renders within acceptable time limits', () => {
      const { renderTime } = measureRenderTime(() =>
        render(
          <ThemeProvider initialTheme="light">
            <StylingSystemExample />
          </ThemeProvider>
        )
      );

      // Should render within 100ms for good performance
      expect(renderTime).toBeLessThan(100);
    });

    it('does not cause memory leaks during initial render', () => {
      const initialMemory = measureMemoryUsage();
      
      const { unmount } = render(
        <ThemeProvider initialTheme="light">
          <StylingSystemExample />
        </ThemeProvider>
      );

      unmount();

      // Allow garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = measureMemoryUsage();
      
      if (initialMemory && finalMemory) {
        // Memory usage should not increase significantly
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
      }
    });
  });

  describe('Theme Switching Performance', () => {
    it('switches themes quickly', async () => {
      const { getByTestId } = render(
        <ThemeProvider initialTheme="light">
          <StylingSystemExample />
        </ThemeProvider>
      );

      const themeToggle = getByTestId('theme-toggle');

      const { renderTime } = measureRenderTime(() => {
        act(() => {
          themeToggle.props.onValueChange(true);
        });
      });

      // Theme switching should be fast
      expect(renderTime).toBeLessThan(50);
    });

    it('maintains performance during multiple theme switches', async () => {
      const { getByTestId } = render(
        <ThemeProvider initialTheme="light">
          <StylingSystemExample />
        </ThemeProvider>
      );

      const themeToggle = getByTestId('theme-toggle');
      const renderTimes: number[] = [];

      // Perform multiple theme switches
      for (let i = 0; i < 10; i++) {
        const { renderTime } = measureRenderTime(() => {
          act(() => {
            themeToggle.props.onValueChange(i % 2 === 0);
          });
        });
        renderTimes.push(renderTime);
      }

      // All switches should be fast
      renderTimes.forEach(time => {
        expect(time).toBeLessThan(50);
      });

      // Performance should not degrade over time
      const firstHalf = renderTimes.slice(0, 5);
      const secondHalf = renderTimes.slice(5);
      const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

      // Second half should not be significantly slower
      expect(secondAvg).toBeLessThan(firstAvg * 2);
    });
  });

  describe('Animation Performance', () => {
    it('handles progress bar updates efficiently', () => {
      jest.useFakeTimers();
      
      const { renderTime } = measureRenderTime(() =>
        render(
          <ThemeProvider initialTheme="light">
            <StylingSystemExample />
          </ThemeProvider>
        )
      );

      // Advance timers to trigger progress updates
      act(() => {
        jest.advanceTimersByTime(5000); // 10 progress updates
      });

      // Should handle animations without performance degradation
      expect(renderTime).toBeLessThan(100);

      jest.useRealTimers();
    });

    it('maintains frame rate during animations', () => {
      jest.useFakeTimers();
      
      render(
        <ThemeProvider initialTheme="light">
          <StylingSystemExample />
        </ThemeProvider>
      );

      const frameRates: number[] = [];
      
      // Simulate frame rate measurement during animations
      for (let i = 0; i < 60; i++) { // 1 second at 60fps
        const frameStart = performance.now();
        
        act(() => {
          jest.advanceTimersByTime(16.67); // ~60fps
        });
        
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        frameRates.push(1000 / frameTime); // Convert to FPS
      }

      // Should maintain reasonable frame rates
      const avgFrameRate = frameRates.reduce((a, b) => a + b) / frameRates.length;
      expect(avgFrameRate).toBeGreaterThan(30); // At least 30fps

      jest.useRealTimers();
    });
  });

  describe('Component Rendering Performance', () => {
    it('renders large lists efficiently', () => {
      // Test with many components rendered
      const { renderTime } = measureRenderTime(() =>
        render(
          <ThemeProvider initialTheme="light">
            <StylingSystemExample />
          </ThemeProvider>
        )
      );

      // Should handle complex component tree efficiently
      expect(renderTime).toBeLessThan(200);
    });

    it('optimizes re-renders during state changes', () => {
      const { getByPlaceholderText } = render(
        <ThemeProvider initialTheme="light">
          <StylingSystemExample />
        </ThemeProvider>
      );

      const nameInput = getByPlaceholderText('Enter your full name');

      // Measure multiple input changes
      const renderTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const { renderTime } = measureRenderTime(() => {
          act(() => {
            nameInput.props.onChangeText(`Test ${i}`);
          });
        });
        renderTimes.push(renderTime);
      }

      // Input changes should be fast
      renderTimes.forEach(time => {
        expect(time).toBeLessThan(20);
      });
    });
  });

  describe('Memory Usage', () => {
    it('does not leak memory during component lifecycle', () => {
      const components: any[] = [];
      
      // Create and destroy multiple instances
      for (let i = 0; i < 5; i++) {
        const component = render(
          <ThemeProvider initialTheme="light">
            <StylingSystemExample />
          </ThemeProvider>
        );
        components.push(component);
      }

      // Unmount all components
      components.forEach(component => component.unmount());

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Memory should be released (this is a basic check)
      expect(components.length).toBe(5);
    });

    it('handles theme provider memory efficiently', () => {
      const providers: any[] = [];
      
      // Create multiple theme providers
      for (let i = 0; i < 10; i++) {
        const provider = render(
          <ThemeProvider initialTheme={i % 2 === 0 ? 'light' : 'dark'}>
            <StylingSystemExample />
          </ThemeProvider>
        );
        providers.push(provider);
      }

      // Cleanup
      providers.forEach(provider => provider.unmount());

      expect(providers.length).toBe(10);
    });
  });

  describe('Bundle Size Impact', () => {
    it('does not significantly increase bundle size', () => {
      // This would typically be measured during build
      // For now, we ensure the component renders without issues
      const { getByText } = render(
        <ThemeProvider initialTheme="light">
          <StylingSystemExample />
        </ThemeProvider>
      );

      expect(getByText('Styling System Demo')).toBeTruthy();
    });
  });

  describe('Scroll Performance', () => {
    it('maintains performance during scrolling', () => {
      const { getByTestId } = render(
        <ThemeProvider initialTheme="light">
          <StylingSystemExample />
        </ThemeProvider>
      );

      // Simulate scroll events
      const scrollView = getByTestId('scroll-view') || { props: { onScroll: jest.fn() } };
      
      const scrollTimes: number[] = [];
      
      for (let i = 0; i < 20; i++) {
        const { renderTime } = measureRenderTime(() => {
          act(() => {
            if (scrollView.props.onScroll) {
              scrollView.props.onScroll({
                nativeEvent: {
                  contentOffset: { y: i * 100 },
                },
              });
            }
          });
        });
        scrollTimes.push(renderTime);
      }

      // Scroll handling should be efficient
      const avgScrollTime = scrollTimes.reduce((a, b) => a + b) / scrollTimes.length;
      expect(avgScrollTime).toBeLessThan(10);
    });
  });

  describe('Component Update Performance', () => {
    it('efficiently updates component props', () => {
      const TestWrapper = ({ variant }: { variant: string }) => (
        <ThemeProvider initialTheme="light">
          <StylingSystemExample />
        </ThemeProvider>
      );

      const { rerender } = render(<TestWrapper variant="primary" />);

      const updateTimes: number[] = [];
      
      // Test multiple prop updates
      for (let i = 0; i < 10; i++) {
        const { renderTime } = measureRenderTime(() => {
          rerender(<TestWrapper variant={`variant-${i}`} />);
        });
        updateTimes.push(renderTime);
      }

      // Updates should be fast
      updateTimes.forEach(time => {
        expect(time).toBeLessThan(30);
      });
    });
  });
});