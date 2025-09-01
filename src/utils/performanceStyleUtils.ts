/**
 * Performance-Optimized Style Utilities
 * Utilities focused on optimizing style performance and memory usage
 */

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Theme } from '../theme/themes/types';
import { performanceMonitor } from './performance';

// Style types
type StyleValue = ViewStyle | TextStyle | ImageStyle;
type StyleDefinition = Record<string, StyleValue>;
type StyleFactory<T> = (theme: Theme) => T;

/**
 * Advanced StyleSheet caching system with LRU eviction and performance monitoring
 */
export class StyleSheetCache {
  private static cache = new Map<string, any>();
  private static maxCacheSize = 200; // Increased for better caching
  private static accessCount = new Map<string, number>();
  private static creationTimes = new Map<string, number>();
  private static memoryUsage = new Map<string, number>();

  /**
   * Create or retrieve cached StyleSheet with performance monitoring
   */
  static create<T extends StyleDefinition>(
    styles: T | (() => T),
    cacheKey?: string
  ): T {
    const key = cacheKey || this.generateKey(styles);
    
    // Performance monitoring for cache hits
    const startTime = performance.now();
    
    if (this.cache.has(key)) {
      this.incrementAccessCount(key);
      performanceMonitor.recordMetric('style_cache_hit', performance.now() - startTime, { key });
      return this.cache.get(key);
    }

    // Clean cache if it's getting too large
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanCache();
    }

    // Performance monitoring for style creation
    const creationStart = performance.now();
    const styleObject = typeof styles === 'function' ? styles() : styles;
    const createdStyles = StyleSheet.create(styleObject);
    const creationTime = performance.now() - creationStart;
    
    // Estimate memory usage (rough approximation)
    const memoryEstimate = this.estimateMemoryUsage(styleObject);
    
    this.cache.set(key, createdStyles);
    this.accessCount.set(key, 1);
    this.creationTimes.set(key, creationTime);
    this.memoryUsage.set(key, memoryEstimate);
    
    // Record performance metrics
    performanceMonitor.recordMetric('style_cache_miss', performance.now() - startTime, { key });
    performanceMonitor.recordMetric('style_creation_time', creationTime, { key });
    performanceMonitor.recordMetric('style_memory_usage', memoryEstimate, { key });
    
    return createdStyles;
  }

  /**
   * Create theme-dependent cached styles
   */
  static createThemed<T extends StyleDefinition>(
    styleFactory: StyleFactory<T>,
    theme: Theme,
    additionalKey?: string
  ): T {
    const themeKey = this.generateThemeKey(theme);
    const key = additionalKey ? `${themeKey}:${additionalKey}` : themeKey;
    
    return this.create(() => styleFactory(theme), key);
  }

  /**
   * Generate cache key from style object
   */
  private static generateKey(styles: any): string {
    if (typeof styles === 'function') {
      return styles.toString();
    }
    return JSON.stringify(styles);
  }

  /**
   * Generate theme-specific cache key with hash for better performance
   */
  private static generateThemeKey(theme: Theme): string {
    // Create a more efficient hash-based key
    const themeHash = this.hashTheme(theme);
    return `theme:${theme.name}:${theme.isDark ? 'dark' : 'light'}:${themeHash}`;
  }

  /**
   * Generate hash for theme to detect changes efficiently
   */
  private static hashTheme(theme: Theme): string {
    // Simple hash based on key theme properties
    const keyProps = {
      colors: theme.colors.primary,
      spacing: theme.spacing.md,
      typography: theme.typography.fontSize.body,
    };
    return btoa(JSON.stringify(keyProps)).slice(0, 8);
  }

  /**
   * Estimate memory usage of style object
   */
  private static estimateMemoryUsage(styleObject: any): number {
    // Rough estimation based on JSON string length
    try {
      return JSON.stringify(styleObject).length * 2; // Approximate bytes
    } catch {
      return 1000; // Default estimate
    }
  }

  /**
   * Increment access count for LRU tracking
   */
  private static incrementAccessCount(key: string): void {
    const count = this.accessCount.get(key) || 0;
    this.accessCount.set(key, count + 1);
  }

  /**
   * Clean cache using LRU strategy
   */
  private static cleanCache(): void {
    const entries = Array.from(this.accessCount.entries());
    entries.sort((a, b) => a[1] - b[1]); // Sort by access count (ascending)
    
    // Remove least accessed items (bottom 25%)
    const itemsToRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < itemsToRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.accessCount.delete(key);
    }
  }

  /**
   * Clear cache with optional pattern matching
   */
  static clearCache(pattern?: string): void {
    if (pattern) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key =>
        key.includes(pattern)
      );
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.accessCount.delete(key);
      });
    } else {
      this.cache.clear();
      this.accessCount.clear();
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  static getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalMemoryUsage: number;
    averageCreationTime: number;
    mostAccessed: Array<{ key: string; count: number; creationTime: number; memoryUsage: number }>;
    performanceMetrics: {
      slowestCreations: Array<{ key: string; time: number }>;
      largestMemoryUsage: Array<{ key: string; memory: number }>;
    };
  } {
    const totalAccess = Array.from(this.accessCount.values()).reduce((a, b) => a + b, 0);
    const hitRate = totalAccess > 0 ? (totalAccess - this.cache.size) / totalAccess : 0;
    
    const totalMemoryUsage = Array.from(this.memoryUsage.values()).reduce((a, b) => a + b, 0);
    const totalCreationTime = Array.from(this.creationTimes.values()).reduce((a, b) => a + b, 0);
    const averageCreationTime = this.creationTimes.size > 0 ? totalCreationTime / this.creationTimes.size : 0;
    
    const mostAccessed = Array.from(this.accessCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({
        key,
        count,
        creationTime: this.creationTimes.get(key) || 0,
        memoryUsage: this.memoryUsage.get(key) || 0,
      }));

    const slowestCreations = Array.from(this.creationTimes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, time]) => ({ key, time }));

    const largestMemoryUsage = Array.from(this.memoryUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, memory]) => ({ key, memory }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate,
      totalMemoryUsage,
      averageCreationTime,
      mostAccessed,
      performanceMetrics: {
        slowestCreations,
        largestMemoryUsage,
      },
    };
  }

  /**
   * Preload styles for better performance
   */
  static preload<T extends StyleDefinition>(
    styleFactories: Array<{
      factory: StyleFactory<T>;
      theme: Theme;
      key?: string;
    }>
  ): void {
    styleFactories.forEach(({ factory, theme, key }) => {
      this.createThemed(factory, theme, key);
    });
  }
}

/**
 * Memoization utilities for expensive style calculations
 */
export class StyleMemoization {
  private static memoCache = new Map<string, any>();

  /**
   * Memoize expensive style calculations
   */
  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (this.memoCache.has(key)) {
        return this.memoCache.get(key);
      }
      
      const result = fn(...args);
      this.memoCache.set(key, result);
      
      return result;
    }) as T;
  }

  /**
   * Clear memoization cache
   */
  static clearMemoCache(): void {
    this.memoCache.clear();
  }

  /**
   * Get memoization cache size
   */
  static getMemoStats(): { size: number; keys: string[] } {
    return {
      size: this.memoCache.size,
      keys: Array.from(this.memoCache.keys()),
    };
  }
}

/**
 * Style optimization utilities
 */
export class StyleOptimizer {
  /**
   * Flatten nested style objects to reduce object creation
   */
  static flattenStyles(styles: any): StyleValue {
    const flattened: StyleValue = {};
    
    const flatten = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, prefix ? `${prefix}.${key}` : key);
        } else {
          const flatKey = prefix ? `${prefix}.${key}` : key;
          flattened[flatKey as keyof StyleValue] = value;
        }
      }
    };
    
    flatten(styles);
    return flattened;
  }

  /**
   * Remove undefined/null values from styles
   */
  static cleanStyles(styles: StyleValue): StyleValue {
    const cleaned: StyleValue = {};
    
    for (const [key, value] of Object.entries(styles)) {
      if (value !== undefined && value !== null) {
        cleaned[key as keyof StyleValue] = value;
      }
    }
    
    return cleaned;
  }

  /**
   * Merge styles efficiently without creating intermediate objects
   */
  static efficientMerge(...styles: (StyleValue | undefined | null)[]): StyleValue {
    const result: StyleValue = {};
    
    for (const style of styles) {
      if (style && typeof style === 'object') {
        // Use Object.assign for better performance than spread operator
        Object.assign(result, style);
      }
    }
    
    return result;
  }

  /**
   * Create optimized conditional styles
   */
  static conditionalStyles(
    baseStyles: StyleValue,
    conditions: Array<{
      condition: boolean;
      styles: StyleValue;
    }>
  ): StyleValue {
    let result = baseStyles;
    
    for (const { condition, styles } of conditions) {
      if (condition) {
        result = this.efficientMerge(result, styles);
      }
    }
    
    return result;
  }

  /**
   * Optimize styles for React Native's style system
   */
  static optimizeForRN(styles: StyleValue): StyleValue {
    const optimized = this.cleanStyles(styles);
    
    // Convert string numbers to actual numbers for better performance
    for (const [key, value] of Object.entries(optimized)) {
      if (typeof value === 'string' && !isNaN(Number(value))) {
        optimized[key as keyof StyleValue] = Number(value);
      }
    }
    
    return optimized;
  }
}

/**
 * Performance monitoring for styles
 */
export class StylePerformanceMonitor {
  private static measurements = new Map<string, number[]>();
  private static isEnabled = __DEV__;

  /**
   * Enable/disable performance monitoring
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Measure style creation performance
   */
  static measureStyleCreation<T>(
    name: string,
    styleCreationFn: () => T
  ): T {
    if (!this.isEnabled) {
      return styleCreationFn();
    }

    const startTime = performance.now();
    const result = styleCreationFn();
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    
    this.measurements.get(name)!.push(duration);
    
    return result;
  }

  /**
   * Get performance statistics
   */
  static getStats(): Record<string, {
    count: number;
    average: number;
    min: number;
    max: number;
    total: number;
  }> {
    const stats: Record<string, any> = {};
    
    for (const [name, measurements] of this.measurements.entries()) {
      const count = measurements.length;
      const total = measurements.reduce((sum, time) => sum + time, 0);
      const average = total / count;
      const min = Math.min(...measurements);
      const max = Math.max(...measurements);
      
      stats[name] = { count, average, min, max, total };
    }
    
    return stats;
  }

  /**
   * Clear performance measurements
   */
  static clearStats(): void {
    this.measurements.clear();
  }

  /**
   * Log performance warnings for slow style operations
   */
  static checkPerformance(threshold: number = 5): void {
    if (!this.isEnabled) return;

    const stats = this.getStats();
    
    for (const [name, stat] of Object.entries(stats)) {
      if (stat.average > threshold) {
        console.warn(
          `Style performance warning: ${name} average creation time is ${stat.average.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }
    }
  }
}

/**
 * Efficient theme switching utilities
 */
export class ThemeSwitchingOptimizer {
  private static themeTransitionCache = new Map<string, any>();
  private static componentUpdateQueue = new Set<() => void>();
  private static isTransitioning = false;

  /**
   * Optimize theme switching by batching updates
   */
  static optimizeThemeSwitch(
    fromTheme: Theme,
    toTheme: Theme,
    callback: () => void
  ): void {
    const transitionKey = `${fromTheme.name}-to-${toTheme.name}`;
    
    // Check if we have a cached transition
    if (this.themeTransitionCache.has(transitionKey)) {
      const cachedTransition = this.themeTransitionCache.get(transitionKey);
      cachedTransition();
      callback();
      return;
    }

    // Start performance monitoring
    performanceMonitor.startTimer('theme_switch');
    this.isTransitioning = true;

    // Batch the theme switch
    this.batchThemeUpdates(() => {
      // Clear theme-specific cache entries
      StyleSheetCache.clearCache(`theme:${fromTheme.name}`);
      
      // Preload critical styles for new theme
      this.preloadCriticalStylesForTheme(toTheme);
      
      // Execute callback
      callback();
      
      // Cache this transition for future use
      this.themeTransitionCache.set(transitionKey, callback);
      
      this.isTransitioning = false;
      performanceMonitor.endTimer('theme_switch', {
        fromTheme: fromTheme.name,
        toTheme: toTheme.name,
      });
    });
  }

  /**
   * Batch theme updates to prevent unnecessary re-renders
   */
  private static batchThemeUpdates(updateFn: () => void): void {
    // Use React's batching mechanism if available, otherwise use setTimeout
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        updateFn();
        this.flushComponentUpdates();
      });
    } else {
      setTimeout(() => {
        updateFn();
        this.flushComponentUpdates();
      }, 0);
    }
  }

  /**
   * Queue component updates during theme transitions
   */
  static queueComponentUpdate(updateFn: () => void): void {
    if (this.isTransitioning) {
      this.componentUpdateQueue.add(updateFn);
    } else {
      updateFn();
    }
  }

  /**
   * Flush queued component updates
   */
  private static flushComponentUpdates(): void {
    this.componentUpdateQueue.forEach(updateFn => updateFn());
    this.componentUpdateQueue.clear();
  }

  /**
   * Preload critical styles for a theme
   */
  private static preloadCriticalStylesForTheme(theme: Theme): void {
    // Define critical style factories that should be preloaded
    const criticalStyles = [
      // Button styles
      (t: Theme) => ({
        primaryButton: {
          backgroundColor: t.colors.primary[500],
          color: t.colors.text.inverse,
        },
        secondaryButton: {
          backgroundColor: t.colors.secondary[500],
          color: t.colors.text.primary,
        },
      }),
      // Text styles
      (t: Theme) => ({
        heading: {
          fontSize: t.typography.fontSize.h1,
          fontWeight: t.typography.fontWeight.bold,
          color: t.colors.text.primary,
        },
        body: {
          fontSize: t.typography.fontSize.body,
          color: t.colors.text.primary,
        },
      }),
      // Card styles
      (t: Theme) => ({
        card: {
          backgroundColor: t.colors.surface.primary,
          borderRadius: t.borderRadius.md,
          shadowColor: t.shadows.md.shadowColor,
        },
      }),
    ];

    criticalStyles.forEach((styleFactory, index) => {
      StyleSheetCache.createThemed(styleFactory, theme, `critical-${index}`);
    });
  }

  /**
   * Clear theme transition cache
   */
  static clearTransitionCache(): void {
    this.themeTransitionCache.clear();
  }

  /**
   * Get theme switching statistics
   */
  static getThemeSwitchingStats(): {
    cachedTransitions: number;
    isTransitioning: boolean;
    queuedUpdates: number;
  } {
    return {
      cachedTransitions: this.themeTransitionCache.size,
      isTransitioning: this.isTransitioning,
      queuedUpdates: this.componentUpdateQueue.size,
    };
  }
}

/**
 * Performance debugging and monitoring tools
 */
export class StylePerformanceDebugger {
  private static isEnabled = __DEV__;
  private static debugLog: Array<{
    timestamp: number;
    type: string;
    message: string;
    data?: any;
  }> = [];

  /**
   * Enable/disable performance debugging
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Log performance debug information
   */
  static log(type: string, message: string, data?: any): void {
    if (!this.isEnabled) return;

    const logEntry = {
      timestamp: Date.now(),
      type,
      message,
      data,
    };

    this.debugLog.push(logEntry);
    
    // Keep log size manageable
    if (this.debugLog.length > 1000) {
      this.debugLog = this.debugLog.slice(-500);
    }

    console.log(`[StylePerf:${type}] ${message}`, data);
  }

  /**
   * Analyze style performance and provide recommendations
   */
  static analyzePerformance(): {
    recommendations: string[];
    warnings: string[];
    stats: any;
  } {
    const cacheStats = StyleSheetCache.getStats();
    const memoStats = StyleMemoization.getMemoStats();
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Analyze cache hit rate
    if (cacheStats.hitRate < 0.7) {
      recommendations.push(
        `Low cache hit rate (${(cacheStats.hitRate * 100).toFixed(1)}%). Consider using more consistent cache keys.`
      );
    }

    // Analyze memory usage
    if (cacheStats.totalMemoryUsage > 1000000) { // 1MB
      warnings.push(
        `High memory usage (${(cacheStats.totalMemoryUsage / 1000000).toFixed(2)}MB). Consider clearing cache more frequently.`
      );
    }

    // Analyze creation times
    if (cacheStats.averageCreationTime > 5) {
      warnings.push(
        `Slow style creation (${cacheStats.averageCreationTime.toFixed(2)}ms average). Consider optimizing style factories.`
      );
    }

    // Analyze memoization
    if (memoStats.size > 500) {
      recommendations.push(
        `Large memoization cache (${memoStats.size} entries). Consider clearing periodically.`
      );
    }

    return {
      recommendations,
      warnings,
      stats: {
        cache: cacheStats,
        memoization: memoStats,
        themeSwitching: ThemeSwitchingOptimizer.getThemeSwitchingStats(),
      },
    };
  }

  /**
   * Generate performance report
   */
  static generateReport(): string {
    const analysis = this.analyzePerformance();
    const timestamp = new Date().toISOString();

    let report = `Style Performance Report - ${timestamp}\n`;
    report += '='.repeat(50) + '\n\n';

    // Cache Statistics
    report += 'Cache Statistics:\n';
    report += `- Size: ${analysis.stats.cache.size}/${analysis.stats.cache.maxSize}\n`;
    report += `- Hit Rate: ${(analysis.stats.cache.hitRate * 100).toFixed(1)}%\n`;
    report += `- Memory Usage: ${(analysis.stats.cache.totalMemoryUsage / 1000).toFixed(1)}KB\n`;
    report += `- Average Creation Time: ${analysis.stats.cache.averageCreationTime.toFixed(2)}ms\n\n`;

    // Memoization Statistics
    report += 'Memoization Statistics:\n';
    report += `- Cache Size: ${analysis.stats.memoization.size}\n\n`;

    // Theme Switching Statistics
    report += 'Theme Switching Statistics:\n';
    report += `- Cached Transitions: ${analysis.stats.themeSwitching.cachedTransitions}\n`;
    report += `- Currently Transitioning: ${analysis.stats.themeSwitching.isTransitioning}\n`;
    report += `- Queued Updates: ${analysis.stats.themeSwitching.queuedUpdates}\n\n`;

    // Recommendations
    if (analysis.recommendations.length > 0) {
      report += 'Recommendations:\n';
      analysis.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += '\n';
    }

    // Warnings
    if (analysis.warnings.length > 0) {
      report += 'Warnings:\n';
      analysis.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    return report;
  }

  /**
   * Clear debug log
   */
  static clearLog(): void {
    this.debugLog = [];
  }

  /**
   * Get debug log entries
   */
  static getLog(): typeof StylePerformanceDebugger.debugLog {
    return [...this.debugLog];
  }
}

/**
 * Main performance utilities class
 */
export class PerformanceStyleUtils {
  static cache = StyleSheetCache;
  static memoization = StyleMemoization;
  static optimizer = StyleOptimizer;
  static monitor = StylePerformanceMonitor;
  static themeSwitching = ThemeSwitchingOptimizer;
  static debugger = StylePerformanceDebugger;

  /**
   * Create high-performance themed styles
   */
  static createOptimizedThemedStyles<T extends StyleDefinition>(
    styleFactory: StyleFactory<T>,
    theme: Theme,
    cacheKey?: string
  ): T {
    return this.monitor.measureStyleCreation(
      `themed-styles-${cacheKey || 'default'}`,
      () => this.cache.createThemed(styleFactory, theme, cacheKey)
    );
  }

  /**
   * Create memoized style function
   */
  static createMemoizedStyleFunction<T extends (...args: any[]) => StyleValue>(
    styleFunction: T
  ): T {
    return this.memoization.memoize(styleFunction);
  }

  /**
   * Batch style operations for better performance
   */
  static batchStyleOperations<T>(operations: Array<() => T>): T[] {
    // In React Native, we can batch style operations to reduce layout thrashing
    return operations.map(op => op());
  }

  /**
   * Preload critical styles
   */
  static preloadCriticalStyles(
    criticalStyles: Array<{
      factory: StyleFactory<any>;
      theme: Theme;
      key: string;
    }>
  ): void {
    this.cache.preload(criticalStyles);
  }

  /**
   * Clean up performance utilities
   */
  static cleanup(): void {
    this.cache.clearCache();
    this.memoization.clearMemoCache();
    this.monitor.clearStats();
  }
}

// Export main utilities
export const performanceStyleUtils = PerformanceStyleUtils;

// Export individual classes
export {
  StyleSheetCache,
  StyleMemoization,
  StyleOptimizer,
  StylePerformanceMonitor,
};