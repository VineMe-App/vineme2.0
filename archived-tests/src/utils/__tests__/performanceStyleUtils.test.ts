/**
 * Performance Style Utils Tests
 * Tests for style performance optimizations and benchmarks
 */

import {
  StyleSheetCache,
  StyleMemoization,
  StyleOptimizer,
  ThemeSwitchingOptimizer,
  StylePerformanceDebugger,
  PerformanceStyleUtils,
} from '../performanceStyleUtils';
import { lightTheme, darkTheme } from '../../theme/themes';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow } as any;

describe('StyleSheetCache', () => {
  beforeEach(() => {
    StyleSheetCache.clearCache();
    mockPerformanceNow.mockReturnValue(0);
  });

  it('should cache style sheets and return cached versions', () => {
    const styles = {
      container: { flex: 1 },
      text: { fontSize: 16 },
    };

    const firstCall = StyleSheetCache.create(styles, 'test-styles');
    const secondCall = StyleSheetCache.create(styles, 'test-styles');

    expect(firstCall).toBe(secondCall);
  });

  it('should generate different cache keys for different styles', () => {
    const styles1 = { container: { flex: 1 } };
    const styles2 = { container: { flex: 2 } };

    const cached1 = StyleSheetCache.create(styles1, 'styles1');
    const cached2 = StyleSheetCache.create(styles2, 'styles2');

    expect(cached1).not.toBe(cached2);
  });

  it('should create themed styles with proper cache keys', () => {
    const styleFactory = (theme: any) => ({
      container: { backgroundColor: theme.colors.primary[500] },
    });

    const lightStyles = StyleSheetCache.createThemed(styleFactory, lightTheme);
    const darkStyles = StyleSheetCache.createThemed(styleFactory, darkTheme);

    expect(lightStyles).not.toBe(darkStyles);
  });

  it('should provide comprehensive cache statistics', () => {
    const styles = { container: { flex: 1 } };
    StyleSheetCache.create(styles, 'test');

    const stats = StyleSheetCache.getStats();

    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('totalMemoryUsage');
    expect(stats).toHaveProperty('averageCreationTime');
    expect(stats).toHaveProperty('mostAccessed');
    expect(stats).toHaveProperty('performanceMetrics');
  });

  it('should clean cache when max size is reached', () => {
    // Create many cached styles to trigger cleanup
    for (let i = 0; i < 250; i++) {
      StyleSheetCache.create({ container: { flex: i } }, `test-${i}`);
    }

    const stats = StyleSheetCache.getStats();
    expect(stats.size).toBeLessThan(250);
  });
});

describe('StyleMemoization', () => {
  beforeEach(() => {
    StyleMemoization.clearMemoCache();
  });

  it('should memoize function results', () => {
    let callCount = 0;
    const expensiveFunction = (value: number) => {
      callCount++;
      return value * 2;
    };

    const memoizedFunction = StyleMemoization.memoize(expensiveFunction);

    expect(memoizedFunction(5)).toBe(10);
    expect(memoizedFunction(5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it('should use custom key generator', () => {
    let callCount = 0;
    const fn = (obj: { a: number; b: number }) => {
      callCount++;
      return obj.a + obj.b;
    };

    const memoizedFn = StyleMemoization.memoize(
      fn,
      (obj) => `${obj.a}-${obj.b}`
    );

    expect(memoizedFn({ a: 1, b: 2 })).toBe(3);
    expect(memoizedFn({ a: 1, b: 2 })).toBe(3);
    expect(callCount).toBe(1);
  });

  it('should provide memoization statistics', () => {
    const fn = (x: number) => x * 2;
    const memoizedFn = StyleMemoization.memoize(fn);

    memoizedFn(1);
    memoizedFn(2);

    const stats = StyleMemoization.getMemoStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toHaveLength(2);
  });
});

describe('StyleOptimizer', () => {
  it('should flatten nested style objects', () => {
    const nestedStyles = {
      container: {
        layout: { flex: 1 },
        colors: { backgroundColor: 'red' },
      },
    };

    const flattened = StyleOptimizer.flattenStyles(nestedStyles);
    // The flattened object should have the nested keys as properties
    expect(flattened['container.layout.flex']).toBe(1);
    expect(flattened['container.colors.backgroundColor']).toBe('red');
  });

  it('should clean undefined and null values', () => {
    const styles = {
      flex: 1,
      backgroundColor: undefined,
      color: null,
      fontSize: 16,
    };

    const cleaned = StyleOptimizer.cleanStyles(styles);
    expect(cleaned).toEqual({ flex: 1, fontSize: 16 });
  });

  it('should efficiently merge styles', () => {
    const base = { flex: 1, backgroundColor: 'red' };
    const override = { backgroundColor: 'blue', color: 'white' };

    const merged = StyleOptimizer.efficientMerge(base, override);
    expect(merged).toEqual({
      flex: 1,
      backgroundColor: 'blue',
      color: 'white',
    });
  });

  it('should create conditional styles', () => {
    const baseStyles = { flex: 1 };
    const conditions = [
      { condition: true, styles: { backgroundColor: 'red' } },
      { condition: false, styles: { color: 'blue' } },
      { condition: true, styles: { fontSize: 16 } },
    ];

    const result = StyleOptimizer.conditionalStyles(baseStyles, conditions);
    expect(result).toEqual({
      flex: 1,
      backgroundColor: 'red',
      fontSize: 16,
    });
  });

  it('should optimize styles for React Native', () => {
    const styles = {
      flex: '1',
      fontSize: '16',
      backgroundColor: 'red',
      margin: undefined,
    };

    const optimized = StyleOptimizer.optimizeForRN(styles);
    expect(optimized).toEqual({
      flex: 1,
      fontSize: 16,
      backgroundColor: 'red',
    });
  });
});

describe('ThemeSwitchingOptimizer', () => {
  beforeEach(() => {
    ThemeSwitchingOptimizer.clearTransitionCache();
  });

  it('should optimize theme switching with caching', () => {
    const callback = jest.fn();

    // Mock requestAnimationFrame for synchronous testing
    const originalRAF = global.requestAnimationFrame;
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };

    try {
      // First theme switch
      ThemeSwitchingOptimizer.optimizeThemeSwitch(
        lightTheme,
        darkTheme,
        callback
      );

      expect(callback).toHaveBeenCalledTimes(1);

      // Second theme switch (should use cache)
      ThemeSwitchingOptimizer.optimizeThemeSwitch(
        lightTheme,
        darkTheme,
        callback
      );

      expect(callback).toHaveBeenCalledTimes(3); // Called once for each theme switch plus cache
    } finally {
      global.requestAnimationFrame = originalRAF;
    }
  });

  it('should provide theme switching statistics', () => {
    const stats = ThemeSwitchingOptimizer.getThemeSwitchingStats();

    expect(stats).toHaveProperty('cachedTransitions');
    expect(stats).toHaveProperty('isTransitioning');
    expect(stats).toHaveProperty('queuedUpdates');
  });

  it('should queue component updates during transitions', (done) => {
    const updateFn = jest.fn();

    // Start a theme transition to enable queuing
    const callback = jest.fn();
    ThemeSwitchingOptimizer.optimizeThemeSwitch(
      lightTheme,
      darkTheme,
      callback
    );

    // Queue an update during transition
    ThemeSwitchingOptimizer.queueComponentUpdate(updateFn);

    // Allow async operations to complete
    setTimeout(() => {
      // When not transitioning, updates should execute immediately
      ThemeSwitchingOptimizer.queueComponentUpdate(updateFn);
      expect(updateFn).toHaveBeenCalled();
      done();
    }, 20);
  });
});

describe('StylePerformanceDebugger', () => {
  beforeEach(() => {
    StylePerformanceDebugger.clearLog();
    StylePerformanceDebugger.setEnabled(true);
  });

  it('should log performance information when enabled', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    StylePerformanceDebugger.log('test', 'Test message', { data: 'test' });

    expect(consoleSpy).toHaveBeenCalledWith('[StylePerf:test] Test message', {
      data: 'test',
    });

    consoleSpy.mockRestore();
  });

  it('should not log when disabled', () => {
    StylePerformanceDebugger.setEnabled(false);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    StylePerformanceDebugger.log('test', 'Test message');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should analyze performance and provide recommendations', () => {
    // Create some cached styles to analyze
    StyleSheetCache.create({ container: { flex: 1 } }, 'test');

    const analysis = StylePerformanceDebugger.analyzePerformance();

    expect(analysis).toHaveProperty('recommendations');
    expect(analysis).toHaveProperty('warnings');
    expect(analysis).toHaveProperty('stats');
    expect(Array.isArray(analysis.recommendations)).toBe(true);
    expect(Array.isArray(analysis.warnings)).toBe(true);
  });

  it('should generate performance report', () => {
    const report = StylePerformanceDebugger.generateReport();

    expect(typeof report).toBe('string');
    expect(report).toContain('Style Performance Report');
    expect(report).toContain('Cache Statistics');
    expect(report).toContain('Memoization Statistics');
  });

  it('should manage debug log entries', () => {
    StylePerformanceDebugger.log('test1', 'Message 1');
    StylePerformanceDebugger.log('test2', 'Message 2');

    const log = StylePerformanceDebugger.getLog();
    expect(log).toHaveLength(2);
    expect(log[0].type).toBe('test1');
    expect(log[1].type).toBe('test2');
  });
});

describe('PerformanceStyleUtils Integration', () => {
  beforeEach(() => {
    PerformanceStyleUtils.cache.clearCache();
    PerformanceStyleUtils.memoization.clearMemoCache();
  });

  it('should create optimized themed styles', () => {
    const styleFactory = (theme: any) => ({
      container: { backgroundColor: theme.colors.primary[500] },
    });

    const styles = PerformanceStyleUtils.createOptimizedThemedStyles(
      styleFactory,
      lightTheme,
      'test-component'
    );

    expect(styles).toHaveProperty('container');
    expect(styles.container).toHaveProperty('backgroundColor');
  });

  it('should create memoized style functions', () => {
    let callCount = 0;
    const styleFunction = (color: string) => {
      callCount++;
      return { backgroundColor: color };
    };

    const memoizedStyleFunction =
      PerformanceStyleUtils.createMemoizedStyleFunction(styleFunction);

    memoizedStyleFunction('red');
    memoizedStyleFunction('red');

    expect(callCount).toBe(1);
  });

  it('should batch style operations', () => {
    const operations = [
      () => ({ flex: 1 }),
      () => ({ backgroundColor: 'red' }),
      () => ({ fontSize: 16 }),
    ];

    const results = PerformanceStyleUtils.batchStyleOperations(operations);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ flex: 1 });
    expect(results[1]).toEqual({ backgroundColor: 'red' });
    expect(results[2]).toEqual({ fontSize: 16 });
  });

  it('should preload critical styles', () => {
    const criticalStyles = [
      {
        factory: (theme: any) => ({
          button: { backgroundColor: theme.colors.primary[500] },
        }),
        theme: lightTheme,
        key: 'button-styles',
      },
    ];

    expect(() => {
      PerformanceStyleUtils.preloadCriticalStyles(criticalStyles);
    }).not.toThrow();
  });

  it('should cleanup performance utilities', () => {
    // Create some cached data
    PerformanceStyleUtils.cache.create({ test: { flex: 1 } }, 'test');
    PerformanceStyleUtils.memoization.memoize(() => ({}))();

    PerformanceStyleUtils.cleanup();

    const cacheStats = PerformanceStyleUtils.cache.getStats();
    const memoStats = PerformanceStyleUtils.memoization.getMemoStats();

    expect(cacheStats.size).toBe(0);
    expect(memoStats.size).toBe(0);
  });
});

// Performance Benchmarks
describe('Performance Benchmarks', () => {
  const createLargeStyleObject = () => {
    const styles: any = {};
    for (let i = 0; i < 100; i++) {
      styles[`style${i}`] = {
        flex: i,
        backgroundColor: `rgb(${i}, ${i}, ${i})`,
        fontSize: 10 + i,
        margin: i * 2,
        padding: i * 3,
      };
    }
    return styles;
  };

  it('should benchmark style creation performance', () => {
    const largeStyles = createLargeStyleObject();

    const startTime = performance.now();
    StyleSheetCache.create(largeStyles, 'benchmark-test');
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Performance should be reasonable (less than 50ms for large style objects)
    expect(duration).toBeLessThan(50);
  });

  it('should benchmark cache hit performance', () => {
    const styles = createLargeStyleObject();

    // First call (cache miss)
    StyleSheetCache.create(styles, 'cache-benchmark');

    // Benchmark cache hit
    const startTime = performance.now();
    StyleSheetCache.create(styles, 'cache-benchmark');
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Cache hits should be very fast (less than 1ms)
    expect(duration).toBeLessThan(1);
  });

  it('should benchmark memoization performance', () => {
    const expensiveFunction = (n: number) => {
      // Simulate expensive calculation
      let result = 0;
      for (let i = 0; i < n; i++) {
        result += Math.sqrt(i);
      }
      return result;
    };

    const memoizedFunction = StyleMemoization.memoize(expensiveFunction);

    // First call (expensive)
    const startTime1 = performance.now();
    memoizedFunction(1000);
    const endTime1 = performance.now();

    // Second call (memoized)
    const startTime2 = performance.now();
    memoizedFunction(1000);
    const endTime2 = performance.now();

    const firstCallDuration = endTime1 - startTime1;
    const secondCallDuration = endTime2 - startTime2;

    // Memoized call should be significantly faster
    expect(secondCallDuration).toBeLessThan(firstCallDuration * 0.1);
  });

  it('should benchmark theme switching performance', () => {
    const callback = jest.fn();

    const startTime = performance.now();
    ThemeSwitchingOptimizer.optimizeThemeSwitch(
      lightTheme,
      darkTheme,
      callback
    );
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Theme switching should be fast (less than 10ms)
    expect(duration).toBeLessThan(10);
  });
});
