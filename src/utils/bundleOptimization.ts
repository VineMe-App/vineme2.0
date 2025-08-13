import React from 'react';
import { Platform } from 'react-native';
import { performanceMonitor } from './performance';

// Bundle size tracking
interface BundleInfo {
  name: string;
  size: number;
  loadTime: number;
  cached: boolean;
}

class BundleOptimizer {
  private loadedBundles: Map<string, BundleInfo> = new Map();
  private preloadQueue: Set<string> = new Set();

  // Track bundle loading
  trackBundleLoad(
    bundleName: string,
    size: number,
    loadTime: number,
    cached: boolean = false
  ) {
    const bundleInfo: BundleInfo = {
      name: bundleName,
      size,
      loadTime,
      cached,
    };

    this.loadedBundles.set(bundleName, bundleInfo);

    performanceMonitor.recordBundleMetric(bundleName, size);
    performanceMonitor.recordMetric('bundle_load_time', loadTime, {
      bundleName,
      cached,
      platform: Platform.OS,
    });
  }

  // Get bundle statistics
  getBundleStats(): Record<string, any> {
    const bundles = Array.from(this.loadedBundles.values());

    return {
      totalBundles: bundles.length,
      totalSize: bundles.reduce((sum, bundle) => sum + bundle.size, 0),
      averageLoadTime:
        bundles.reduce((sum, bundle) => sum + bundle.loadTime, 0) /
        bundles.length,
      cachedBundles: bundles.filter((bundle) => bundle.cached).length,
      largestBundle: bundles.reduce(
        (largest, bundle) =>
          bundle.size > (largest?.size || 0) ? bundle : largest,
        bundles[0]
      ),
    };
  }

  // Preload critical bundles
  preloadBundle(bundleName: string): Promise<void> {
    if (
      this.loadedBundles.has(bundleName) ||
      this.preloadQueue.has(bundleName)
    ) {
      return Promise.resolve();
    }

    this.preloadQueue.add(bundleName);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // In a real implementation, this would use dynamic imports
      // For now, we'll simulate the preloading
      setTimeout(() => {
        const loadTime = Date.now() - startTime;
        this.trackBundleLoad(bundleName, 0, loadTime, false);
        this.preloadQueue.delete(bundleName);
        resolve();
      }, 100);
    });
  }

  // Clear bundle cache
  clearBundleCache() {
    this.loadedBundles.clear();
    this.preloadQueue.clear();
    performanceMonitor.recordMetric('bundle_cache_clear', 1);
  }
}

export const bundleOptimizer = new BundleOptimizer();

// Higher-order component for lazy loading with bundle tracking
export function withLazyLoading<T extends object>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  bundleName: string,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(async () => {
    const startTime = Date.now();

    try {
      const module = await importFn();
      const loadTime = Date.now() - startTime;

      // Estimate bundle size (in a real app, this would come from build tools)
      bundleOptimizer.trackBundleLoad(bundleName, 0, loadTime, false);

      return module;
    } catch (error) {
      performanceMonitor.recordMetric('bundle_load_error', 1, {
        bundleName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  });

  return function LazyLoadedComponent(props: T) {
    // TODO: Fix JSX in TypeScript file
    // return (
    //   <React.Suspense fallback={fallback || <Text>Loading...</Text>}>
    //     <LazyComponent {...props} />
    //   </React.Suspense>
    // );
    return LazyComponent(props);
  };
}

// Code splitting utilities for React Native
export const CodeSplitting = {
  // Lazy load screens
  lazyScreen: <T extends object>(
    importFn: () => Promise<{ default: React.ComponentType<T> }>,
    screenName: string
  ) => {
    return withLazyLoading(importFn, `screen_${screenName}`, null);
  },

  // Lazy load components
  lazyComponent: <T extends object>(
    importFn: () => Promise<{ default: React.ComponentType<T> }>,
    componentName: string,
    fallback?: React.ReactNode
  ) => {
    return withLazyLoading(importFn, `component_${componentName}`, fallback);
  },

  // Preload critical paths
  preloadCriticalPath: async (screenNames: string[]) => {
    const preloadPromises = screenNames.map((screenName) =>
      bundleOptimizer.preloadBundle(`screen_${screenName}`)
    );

    try {
      await Promise.all(preloadPromises);
      performanceMonitor.recordMetric('critical_path_preload_success', 1, {
        screenCount: screenNames.length,
      });
    } catch (error) {
      performanceMonitor.recordMetric('critical_path_preload_error', 1, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};

// Memory optimization utilities
export const MemoryOptimization = {
  // Clean up unused components
  cleanupUnusedComponents: () => {
    // In React Native, this would involve clearing component caches
    // For now, we'll just record the action
    performanceMonitor.recordMetric('component_cleanup', 1);
  },

  // Monitor memory usage
  monitorMemoryUsage: (context: string) => {
    performanceMonitor.recordMemoryUsage(context);
  },

  // Optimize images in memory
  optimizeImageMemory: (imageCount: number) => {
    performanceMonitor.recordMetric('image_memory_optimization', imageCount);
  },
};

// Performance hints for developers
export const PerformanceHints = {
  // Check if component should use memo
  shouldUseMemo: (componentName: string, propsCount: number): boolean => {
    const shouldMemo = propsCount > 3; // Simple heuristic

    performanceMonitor.recordMetric('memo_suggestion', shouldMemo ? 1 : 0, {
      componentName,
      propsCount,
    });

    return shouldMemo;
  },

  // Check if list should be virtualized
  shouldVirtualizeList: (itemCount: number): boolean => {
    const shouldVirtualize = itemCount > 50; // Simple heuristic

    performanceMonitor.recordMetric(
      'virtualization_suggestion',
      shouldVirtualize ? 1 : 0,
      {
        itemCount,
      }
    );

    return shouldVirtualize;
  },

  // Suggest image optimization
  suggestImageOptimization: (
    imageSize: number,
    dimensions: { width: number; height: number }
  ) => {
    const needsOptimization =
      imageSize > 500000 || dimensions.width > 1000 || dimensions.height > 1000;

    performanceMonitor.recordMetric(
      'image_optimization_suggestion',
      needsOptimization ? 1 : 0,
      {
        imageSize,
        dimensions,
      }
    );

    return needsOptimization;
  },
};
