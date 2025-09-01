/**
 * Performance Style Utilities Tests
 * Tests for performance-optimized style utilities
 */

import { StyleSheet } from 'react-native';
import {
  StyleSheetCache,
  StyleMemoization,
  StyleOptimizer,
  StylePerformanceMonitor,
  PerformanceStyleUtils,
} from '../performanceStyleUtils';
import { lightTheme } from '../../theme/themes/light';

// Mock __DEV__ for testing
(global as any).__DEV__ = true;

// Mock StyleSheet
jest.mock('react-native', () => ({
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
}));

// Mock performance.now for testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

describe('StyleSheetCache', () => {
  beforeEach(() => {
    StyleSheetCache.clearCache();
    (StyleSheet.create as jest.Mock).mockClear();
  });

  describe('create', () => {
    it('should create and cache styles', () => {
      const styles = { padding: 16, margin: 8 };
      const cacheKey = 'test-styles';

      const result1 = StyleSheetCache.create(styles, cacheKey);
      const result2 = StyleSheetCache.create(styles, cacheKey);

      expect(StyleSheet.create).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should handle function-based styles', () => {
      const styleFunction = jest.fn(() => ({ padding: 16 }));
      const result = StyleSheetCache.create(styleFunction);

      expect(styleFunction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ padding: 16 });
    });

    it('should generate cache key when not provided', () => {
      const styles = { padding: 16 };
      
      StyleSheetCache.create(styles);
      StyleSheetCache.create(styles);

      expect(StyleSheet.create).toHaveBeenCalledTimes(1);
    });

    it('should clean cache when max size is reached', () => {
      // Create styles up to max cache size
      for (let i = 0; i < 100; i++) {
        StyleSheetCache.create({ padding: i }, `style-${i}`);
      }

      const statsBefore = StyleSheetCache.getStats();
      expect(statsBefore.size).toBe(100);

      // Add one more to trigger cleanup
      StyleSheetCache.create({ padding: 101 }, 'style-101');

      const statsAfter = StyleSheetCache.getStats();
      expect(statsAfter.size).toBeLessThan(100);
    });
  });

  describe('createThemed', () => {
    it('should create themed cached styles', () => {
      const styleFactory = jest.fn((theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      }));

      const result1 = StyleSheetCache.createThemed(styleFactory, lightTheme, 'test');
      const result2 = StyleSheetCache.createThemed(styleFactory, lightTheme, 'test');

      expect(styleFactory).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should generate different cache keys for different themes', () => {
      const styleFactory = jest.fn((theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      }));

      const darkTheme = { ...lightTheme, isDark: true };

      StyleSheetCache.createThemed(styleFactory, lightTheme);
      StyleSheetCache.createThemed(styleFactory, darkTheme);

      expect(styleFactory).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCache', () => {
    it('should clear cache with pattern matching', () => {
      StyleSheetCache.create({ padding: 16 }, 'test-1');
      StyleSheetCache.create({ margin: 8 }, 'other-1');
      StyleSheetCache.create({ fontSize: 14 }, 'test-2');

      StyleSheetCache.clearCache('test');
      const stats = StyleSheetCache.getStats();

      expect(stats.keys).toEqual(expect.arrayContaining(['other-1']));
      expect(stats.keys).not.toEqual(expect.arrayContaining(['test-1']));
      expect(stats.keys).not.toEqual(expect.arrayContaining(['test-2']));
    });

    it('should clear entire cache when no pattern provided', () => {
      StyleSheetCache.create({ padding: 16 }, 'test-1');
      StyleSheetCache.create({ margin: 8 }, 'test-2');

      StyleSheetCache.clearCache();
      const stats = StyleSheetCache.getStats();

      expect(stats.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      StyleSheetCache.create({ padding: 16 }, 'style-1');
      StyleSheetCache.create({ margin: 8 }, 'style-2');

      // Access style-1 multiple times to increase access count
      StyleSheetCache.create({ padding: 16 }, 'style-1');
      StyleSheetCache.create({ padding: 16 }, 'style-1');

      const stats = StyleSheetCache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.mostAccessed).toHaveLength(2);
      expect(stats.mostAccessed[0].key).toContain('style-1');
      expect(stats.mostAccessed[0].count).toBe(3);
    });
  });

  describe('preload', () => {
    it('should preload styles for better performance', () => {
      const styleFactories = [
        {
          factory: (theme: any) => ({ backgroundColor: theme.colors.primary[500] }),
          theme: lightTheme,
          key: 'primary-bg',
        },
        {
          factory: (theme: any) => ({ color: theme.colors.text.primary }),
          theme: lightTheme,
          key: 'primary-text',
        },
      ];

      StyleSheetCache.preload(styleFactories);

      const stats = StyleSheetCache.getStats();
      expect(stats.size).toBe(2);
    });
  });
});

describe('StyleMemoization', () => {
  beforeEach(() => {
    StyleMemoization.clearMemoCache();
  });

  describe('memoize', () => {
    it('should memoize function results', () => {
      const expensiveFunction = jest.fn((a: number, b: number) => a + b);
      const memoizedFunction = StyleMemoization.memoize(expensiveFunction);

      const result1 = memoizedFunction(1, 2);
      const result2 = memoizedFunction(1, 2);
      const result3 = memoizedFunction(2, 3);

      expect(expensiveFunction).toHaveBeenCalledTimes(2);
      expect(result1).toBe(3);
      expect(result2).toBe(3);
      expect(result3).toBe(5);
    });

    it('should use custom key generator', () => {
      const expensiveFunction = jest.fn((obj: { a: number; b: number }) => obj.a + obj.b);
      const keyGenerator = (obj: { a: number; b: number }) => `${obj.a}-${obj.b}`;
      const memoizedFunction = StyleMemoization.memoize(expensiveFunction, keyGenerator);

      memoizedFunction({ a: 1, b: 2 });
      memoizedFunction({ a: 1, b: 2 });

      expect(expensiveFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearMemoCache', () => {
    it('should clear memoization cache', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = StyleMemoization.memoize(fn);

      memoized(5);
      expect(StyleMemoization.getMemoStats().size).toBe(1);

      StyleMemoization.clearMemoCache();
      expect(StyleMemoization.getMemoStats().size).toBe(0);

      memoized(5);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMemoStats', () => {
    it('should return memoization statistics', () => {
      const fn = StyleMemoization.memoize((x: number) => x * 2);
      
      fn(1);
      fn(2);

      const stats = StyleMemoization.getMemoStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
    });
  });
});

describe('StyleOptimizer', () => {
  describe('flattenStyles', () => {
    it('should flatten nested style objects', () => {
      const nestedStyles = {
        container: {
          padding: 16,
          margin: 8,
        },
        text: {
          fontSize: 14,
          color: 'red',
        },
      };

      const result = StyleOptimizer.flattenStyles(nestedStyles);

      expect(result).toEqual({
        'container.padding': 16,
        'container.margin': 8,
        'text.fontSize': 14,
        'text.color': 'red',
      });
    });

    it('should handle deeply nested objects', () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              value: 42,
            },
          },
        },
      };

      const result = StyleOptimizer.flattenStyles(deeplyNested);

      expect(result).toEqual({
        'level1.level2.level3.value': 42,
      });
    });
  });

  describe('cleanStyles', () => {
    it('should remove undefined and null values', () => {
      const styles = {
        padding: 16,
        margin: undefined,
        backgroundColor: null,
        fontSize: 14,
        color: '',
      };

      const result = StyleOptimizer.cleanStyles(styles);

      expect(result).toEqual({
        padding: 16,
        fontSize: 14,
        color: '',
      });
    });
  });

  describe('efficientMerge', () => {
    it('should merge styles efficiently', () => {
      const style1 = { padding: 16, margin: 8 };
      const style2 = { backgroundColor: 'red', padding: 24 };
      const style3 = undefined;
      const style4 = { borderRadius: 4 };

      const result = StyleOptimizer.efficientMerge(style1, style2, style3, style4);

      expect(result).toEqual({
        padding: 24,
        margin: 8,
        backgroundColor: 'red',
        borderRadius: 4,
      });
    });
  });

  describe('conditionalStyles', () => {
    it('should apply conditional styles', () => {
      const baseStyles = { padding: 16 };
      const conditions = [
        { condition: true, styles: { margin: 8 } },
        { condition: false, styles: { backgroundColor: 'red' } },
        { condition: true, styles: { borderRadius: 4 } },
      ];

      const result = StyleOptimizer.conditionalStyles(baseStyles, conditions);

      expect(result).toEqual({
        padding: 16,
        margin: 8,
        borderRadius: 4,
      });
    });
  });

  describe('optimizeForRN', () => {
    it('should optimize styles for React Native', () => {
      const styles = {
        padding: '16',
        margin: 8,
        fontSize: '14',
        backgroundColor: undefined,
        color: 'red',
      };

      const result = StyleOptimizer.optimizeForRN(styles);

      expect(result).toEqual({
        padding: 16,
        margin: 8,
        fontSize: 14,
        color: 'red',
      });
    });
  });
});

describe('StylePerformanceMonitor', () => {
  beforeEach(() => {
    StylePerformanceMonitor.clearStats();
    mockPerformanceNow.mockReset();
  });

  describe('measureStyleCreation', () => {
    it('should measure style creation performance when enabled', () => {
      StylePerformanceMonitor.setEnabled(true);
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(5);

      const styleCreationFn = jest.fn(() => ({ padding: 16 }));
      const result = StylePerformanceMonitor.measureStyleCreation('test', styleCreationFn);

      expect(result).toEqual({ padding: 16 });
      expect(styleCreationFn).toHaveBeenCalledTimes(1);

      const stats = StylePerformanceMonitor.getStats();
      expect(stats.test.count).toBe(1);
      expect(stats.test.total).toBeGreaterThan(0);
    });

    it('should not measure when disabled', () => {
      StylePerformanceMonitor.setEnabled(false);

      const styleCreationFn = jest.fn(() => ({ padding: 16 }));
      StylePerformanceMonitor.measureStyleCreation('test', styleCreationFn);

      const stats = StylePerformanceMonitor.getStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return performance statistics', () => {
      StylePerformanceMonitor.setEnabled(true);
      mockPerformanceNow
        .mockReturnValueOnce(0).mockReturnValueOnce(5)
        .mockReturnValueOnce(10).mockReturnValueOnce(18)
        .mockReturnValueOnce(20).mockReturnValueOnce(25);

      StylePerformanceMonitor.measureStyleCreation('test', () => ({}));
      StylePerformanceMonitor.measureStyleCreation('test', () => ({}));
      StylePerformanceMonitor.measureStyleCreation('test', () => ({}));

      const stats = StylePerformanceMonitor.getStats();

      expect(stats.test.count).toBe(3);
      expect(stats.test.total).toBeGreaterThan(0);
      expect(stats.test.average).toBeGreaterThan(0);
      expect(stats.test.min).toBeGreaterThan(0);
      expect(stats.test.max).toBeGreaterThan(0);
    });
  });

  describe('checkPerformance', () => {
    it('should log warnings for slow operations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      StylePerformanceMonitor.setEnabled(true);
      
      // Create a slow operation by measuring multiple times to get a high average
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(10);
        StylePerformanceMonitor.measureStyleCreation('slow-operation', () => ({}));
      }
      
      StylePerformanceMonitor.checkPerformance(5);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe('PerformanceStyleUtils', () => {
  beforeEach(() => {
    PerformanceStyleUtils.cleanup();
  });

  describe('createOptimizedThemedStyles', () => {
    it('should create optimized themed styles with performance monitoring', () => {
      StylePerformanceMonitor.setEnabled(true);
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(2);

      const styleFactory = jest.fn((theme: any) => ({
        backgroundColor: theme.colors.background.primary,
      }));

      const result = PerformanceStyleUtils.createOptimizedThemedStyles(
        styleFactory,
        lightTheme,
        'test'
      );

      expect(result).toEqual({
        backgroundColor: lightTheme.colors.background.primary,
      });

      const stats = StylePerformanceMonitor.getStats();
      expect(stats['themed-styles-test']).toBeDefined();
    });
  });

  describe('createMemoizedStyleFunction', () => {
    it('should create memoized style function', () => {
      const styleFunction = jest.fn((color: string) => ({ backgroundColor: color }));
      const memoized = PerformanceStyleUtils.createMemoizedStyleFunction(styleFunction);

      memoized('red');
      memoized('red');
      memoized('blue');

      expect(styleFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchStyleOperations', () => {
    it('should batch style operations', () => {
      const operations = [
        () => ({ padding: 16 }),
        () => ({ margin: 8 }),
        () => ({ fontSize: 14 }),
      ];

      const results = PerformanceStyleUtils.batchStyleOperations(operations);

      expect(results).toEqual([
        { padding: 16 },
        { margin: 8 },
        { fontSize: 14 },
      ]);
    });
  });

  describe('preloadCriticalStyles', () => {
    it('should preload critical styles', () => {
      const criticalStyles = [
        {
          factory: (theme: any) => ({ backgroundColor: theme.colors.primary[500] }),
          theme: lightTheme,
          key: 'primary',
        },
      ];

      PerformanceStyleUtils.preloadCriticalStyles(criticalStyles);

      const stats = StyleSheetCache.getStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up all performance utilities', () => {
      // Add some data to clean up
      StyleSheetCache.create({ padding: 16 }, 'test');
      StyleMemoization.memoize(() => {})();
      StylePerformanceMonitor.setEnabled(true);
      StylePerformanceMonitor.measureStyleCreation('test', () => ({}));

      PerformanceStyleUtils.cleanup();

      expect(StyleSheetCache.getStats().size).toBe(0);
      expect(StyleMemoization.getMemoStats().size).toBe(0);
      expect(Object.keys(StylePerformanceMonitor.getStats())).toHaveLength(0);
    });
  });
});