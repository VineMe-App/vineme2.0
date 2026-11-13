/**
 * Style Performance Hook
 * React hook for monitoring and optimizing component style performance
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import {
  PerformanceStyleUtils,
  StylePerformanceDebugger,
  ThemeSwitchingOptimizer,
} from '../utils/performanceStyleUtils';
import { useTheme } from '../theme/provider/useTheme';
import { Theme } from '../theme/themes/types';

type StyleValue = ViewStyle | TextStyle | ImageStyle;
type StyleFactory<T> = (theme: Theme) => T;

interface StylePerformanceOptions {
  componentName?: string;
  enableMonitoring?: boolean;
  cacheKey?: string;
  preloadStyles?: boolean;
}

/**
 * Hook for performance-optimized themed styles
 */
export function useOptimizedStyles<T extends Record<string, StyleValue>>(
  styleFactory: StyleFactory<T>,
  options: StylePerformanceOptions = {}
): T {
  const { theme } = useTheme();
  const {
    componentName = 'UnknownComponent',
    enableMonitoring = __DEV__,
    cacheKey,
    preloadStyles = false,
  } = options;

  const renderCountRef = useRef(0);
  const lastThemeRef = useRef<Theme | null>(null);

  // Track render count for performance monitoring
  useEffect(() => {
    renderCountRef.current += 1;

    if (enableMonitoring) {
      StylePerformanceDebugger.log(
        'component_render',
        `${componentName} rendered`,
        {
          renderCount: renderCountRef.current,
          themeName: theme.name,
          isDark: theme.isDark,
        }
      );
    }
  });

  // Monitor theme changes
  useEffect(() => {
    if (lastThemeRef.current && lastThemeRef.current !== theme) {
      if (enableMonitoring) {
        StylePerformanceDebugger.log(
          'theme_change',
          `Theme changed in ${componentName}`,
          {
            from: lastThemeRef.current.name,
            to: theme.name,
            renderCount: renderCountRef.current,
          }
        );
      }
    }
    lastThemeRef.current = theme;
  }, [theme, componentName, enableMonitoring]);

  // Create optimized styles with caching and performance monitoring
  const styles = useMemo(() => {
    const finalCacheKey = cacheKey || componentName;

    return PerformanceStyleUtils.createOptimizedThemedStyles(
      styleFactory,
      theme,
      finalCacheKey
    );
  }, [styleFactory, theme, cacheKey, componentName]);

  // Preload styles if requested
  useEffect(() => {
    if (preloadStyles) {
      PerformanceStyleUtils.preloadCriticalStyles([
        {
          factory: styleFactory,
          theme,
          key: cacheKey || componentName,
        },
      ]);
    }
  }, [preloadStyles, styleFactory, theme, cacheKey, componentName]);

  return styles;
}

/**
 * Hook for memoized style calculations
 */
export function useMemoizedStyleCalculation<
  T extends (...args: any[]) => StyleValue,
>(styleCalculation: T, dependencies: any[] = []): T {
  return useMemo(() => {
    return PerformanceStyleUtils.createMemoizedStyleFunction(styleCalculation);
  }, dependencies);
}

/**
 * Hook for monitoring component style performance
 */
export function useStylePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const { theme } = useTheme();

  const startRenderMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderMeasurement = useCallback(() => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;

      StylePerformanceDebugger.log(
        'render_performance',
        `${componentName} render time`,
        {
          renderTime,
          themeName: theme.name,
          isDark: theme.isDark,
        }
      );

      renderStartTime.current = 0;
    }
  }, [componentName, theme]);

  const measureStyleOperation = useCallback(
    <T>(operationName: string, operation: () => T): T => {
      const startTime = performance.now();
      const result = operation();
      const endTime = performance.now();

      StylePerformanceDebugger.log(
        'style_operation',
        `${componentName} - ${operationName}`,
        {
          duration: endTime - startTime,
          themeName: theme.name,
        }
      );

      return result;
    },
    [componentName, theme]
  );

  return {
    startRenderMeasurement,
    endRenderMeasurement,
    measureStyleOperation,
  };
}

/**
 * Hook for optimized theme switching in components
 */
export function useOptimizedThemeSwitch() {
  const { theme, toggleTheme } = useTheme();
  const previousThemeRef = useRef<Theme>(theme);

  const optimizedToggleTheme = useCallback(() => {
    const previousTheme = previousThemeRef.current;

    ThemeSwitchingOptimizer.optimizeThemeSwitch(previousTheme, theme, () => {
      toggleTheme();
      previousThemeRef.current = theme;
    });
  }, [theme, toggleTheme]);

  const queueStyleUpdate = useCallback((updateFn: () => void) => {
    ThemeSwitchingOptimizer.queueComponentUpdate(updateFn);
  }, []);

  return {
    optimizedToggleTheme,
    queueStyleUpdate,
    isTransitioning:
      ThemeSwitchingOptimizer.getThemeSwitchingStats().isTransitioning,
  };
}

/**
 * Hook for batch style operations
 */
export function useBatchedStyleOperations() {
  const batchOperations = useCallback(<T>(operations: (() => T)[]): T[] => {
    return PerformanceStyleUtils.batchStyleOperations(operations);
  }, []);

  const batchStyleUpdates = useCallback((updates: (() => void)[]) => {
    // Use requestAnimationFrame to batch updates
    requestAnimationFrame(() => {
      updates.forEach((update) => update());
    });
  }, []);

  return {
    batchOperations,
    batchStyleUpdates,
  };
}

/**
 * Hook for style performance debugging
 */
export function useStylePerformanceDebug(componentName: string) {
  const { theme } = useTheme();

  const logPerformanceInfo = useCallback(
    (type: string, message: string, data?: any) => {
      StylePerformanceDebugger.log(type, `${componentName}: ${message}`, {
        ...data,
        themeName: theme.name,
        isDark: theme.isDark,
      });
    },
    [componentName, theme]
  );

  const getPerformanceAnalysis = useCallback(() => {
    return StylePerformanceDebugger.analyzePerformance();
  }, []);

  const generatePerformanceReport = useCallback(() => {
    return StylePerformanceDebugger.generateReport();
  }, []);

  return {
    logPerformanceInfo,
    getPerformanceAnalysis,
    generatePerformanceReport,
  };
}

/**
 * Higher-order hook for automatic performance monitoring
 */
export function withStylePerformanceMonitoring<T extends Record<string, any>>(
  useStylesHook: () => T,
  componentName: string
): () => T {
  return function useMonitoredStyles(): T {
    const { startRenderMeasurement, endRenderMeasurement } =
      useStylePerformanceMonitor(componentName);

    useEffect(() => {
      startRenderMeasurement();
      return endRenderMeasurement;
    });

    return useStylesHook();
  };
}

/**
 * Hook for critical style preloading
 */
export function useCriticalStylePreloader(
  criticalStyles: {
    factory: StyleFactory<any>;
    key: string;
  }[]
) {
  const { theme } = useTheme();

  useEffect(() => {
    const stylesToPreload = criticalStyles.map(({ factory, key }) => ({
      factory,
      theme,
      key,
    }));

    PerformanceStyleUtils.preloadCriticalStyles(stylesToPreload);
  }, [criticalStyles, theme]);
}

/**
 * Hook for style cache management
 */
export function useStyleCacheManagement() {
  const clearCache = useCallback((pattern?: string) => {
    PerformanceStyleUtils.cache.clearCache(pattern);
  }, []);

  const getCacheStats = useCallback(() => {
    return PerformanceStyleUtils.cache.getStats();
  }, []);

  const preloadStyles = useCallback(
    (
      styles: {
        factory: StyleFactory<any>;
        theme: Theme;
        key: string;
      }[]
    ) => {
      PerformanceStyleUtils.preloadCriticalStyles(styles);
    },
    []
  );

  return {
    clearCache,
    getCacheStats,
    preloadStyles,
  };
}
