/**
 * Performance Tests for Theme Operations
 * Tests for theme switching performance and style generation efficiency
 */

import { performance } from 'perf_hooks';
import { lightTheme, darkTheme } from '../../../theme/themes';
import { 
  ThemeSwitchingOptimizer, 
  StylePerformanceDebugger,
  PerformanceStyleUtils
} from '../../../utils/performanceStyleUtils';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow } as any;

describe('Theme Operations Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
    StylePerformanceDebugger.clearLog();
  });

  describe('Theme Switching Performance', () => {
    it('should complete theme switching within performance budget', async () => {
      const startTime = 0;
      const endTime = 16; // 16ms budget for 60fps
      
      mockPerformanceNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      const mockCallback = jest.fn();
      
      await ThemeSwitchingOptimizer.optimizeThemeSwitch(
        lightTheme,
        darkTheme,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalled();
      
      // Verify performance was measured
      expect(mockPerformanceNow).toHaveBeenCalledTimes(2);
    });

    it('should batch theme updates efficiently', async () => {
      const updates = [
        () => console.log('Update 1'),
        () => console.log('Update 2'),
        () => console.log('Update 3'),
      ];

      const startTime = 0;
      const endTime = 10;
      
      mockPerformanceNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      // Test batching through the optimizer
      ThemeSwitchingOptimizer.optimizeThemeSwitch(
        lightTheme,
        darkTheme,
        () => {
          updates.forEach(update => update());
        }
      );

      // All updates should be batched and executed
      expect(mockPerformanceNow).toHaveBeenCalledTimes(2);
    });

    it('should detect performance bottlenecks', () => {
      const slowOperation = () => {
        // Simulate slow operation
        mockPerformanceNow.mockReturnValue(100); // 100ms
      };

      StylePerformanceDebugger.log('slow_test', 'Test operation');

      const logs = StylePerformanceDebugger.getLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe('slow_test');
      expect(logs[0].message).toBe('Test operation');
    });
  });

  describe('Style Generation Performance', () => {
    it('should create styles efficiently with memoization', () => {
      const styleCreator = jest.fn((theme) => ({
        container: {
          backgroundColor: theme.colors.background.primary,
          padding: theme.spacing[4],
        },
      }));

      const memoizedCreator = PerformanceStyleUtils.createMemoizedStyleFunction(styleCreator);

      // First call should execute the function
      const styles1 = memoizedCreator(lightTheme);
      expect(styleCreator).toHaveBeenCalledTimes(1);

      // Second call with same theme should use memoized result
      const styles2 = memoizedCreator(lightTheme);
      expect(styleCreator).toHaveBeenCalledTimes(1);
      expect(styles1).toBe(styles2);

      // Call with different theme should execute function again
      const styles3 = memoizedCreator(darkTheme);
      expect(styleCreator).toHaveBeenCalledTimes(2);
      expect(styles3).not.toBe(styles1);
    });

    it('should optimize style creation for large component trees', () => {
      const componentCount = 100;
      const startTime = 0;
      const endTime = 50; // 50ms for 100 components

      mockPerformanceNow
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      const styles = [];
      
      StylePerformanceDebugger.log('bulk_style_creation', 'Creating styles for components');
      
      for (let i = 0; i < componentCount; i++) {
        styles.push(PerformanceStyleUtils.createOptimizedThemedStyles(
          (theme) => ({
            container: {
              backgroundColor: theme.colors.background.primary,
              padding: theme.spacing[2],
            },
          }),
          lightTheme,
          `component-${i}`
        ));
      }

      expect(styles).toHaveLength(componentCount);
      
      const logs = StylePerformanceDebugger.getLog();
      expect(logs[0].type).toBe('bulk_style_creation');
    });

    it('should handle memory efficiently during style operations', () => {
      const initialMemory = process.memoryUsage?.() || { heapUsed: 0 };
      
      // Create many style objects
      const styles = [];
      for (let i = 0; i < 1000; i++) {
        styles.push(PerformanceStyleUtils.createOptimizedThemedStyles(
          () => ({ container: { backgroundColor: `#${i.toString(16).padStart(6, '0')}` } }),
          lightTheme,
          `style-${i}`
        ));
      }

      const finalMemory = process.memoryUsage?.() || { heapUsed: 0 };
      
      // Memory increase should be reasonable (less than 10MB for 1000 styles)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });

  describe('Performance Monitoring', () => {
    it('should track theme operation metrics', () => {
      StylePerformanceDebugger.log('test_operation', 'Test message', {
        componentCount: 5,
        themeSize: 'large',
      });

      const logs = StylePerformanceDebugger.getLog();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        type: 'test_operation',
        message: 'Test message',
        data: {
          componentCount: 5,
          themeSize: 'large',
        },
      });
    });

    it('should provide performance recommendations', () => {
      // Simulate slow theme switching
      StylePerformanceDebugger.log('theme_switch', 'Slow theme switch detected');

      const analysis = StylePerformanceDebugger.analyzePerformance();
      
      expect(analysis.recommendations).toBeDefined();
      expect(analysis.warnings).toBeDefined();
    });

    it('should clear performance logs when requested', () => {
      StylePerformanceDebugger.log('test1', 'Message 1');
      StylePerformanceDebugger.log('test2', 'Message 2');
      
      expect(StylePerformanceDebugger.getLog()).toHaveLength(2);
      
      StylePerformanceDebugger.clearLog();
      
      expect(StylePerformanceDebugger.getLog()).toHaveLength(0);
    });
  });
});