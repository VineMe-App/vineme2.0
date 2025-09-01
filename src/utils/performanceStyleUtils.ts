/**
 * Performance-Optimized Style Utilities
 * Utilities focused on optimizing style performance and memory usage
 */

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Theme } from '../theme/themes/types';

// Style types
type StyleValue = ViewStyle | TextStyle | ImageStyle;
type StyleDefinition = Record<string, StyleValue>;
type StyleFactory<T> = (theme: Theme) => T;

/**
 * Advanced StyleSheet caching system
 */
export class StyleSheetCache {
  private static cache = new Map<string, any>();
  private static maxCacheSize = 100;
  private static accessCount = new Map<string, number>();

  /**
   * Create or retrieve cached StyleSheet
   */
  static create<T extends StyleDefinition>(
    styles: T | (() => T),
    cacheKey?: string
  ): T {
    const key = cacheKey || this.generateKey(styles);
    
    if (this.cache.has(key)) {
      this.incrementAccessCount(key);
      return this.cache.get(key);
    }

    // Clean cache if it's getting too large
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanCache();
    }

    const styleObject = typeof styles === 'function' ? styles() : styles;
    const createdStyles = StyleSheet.create(styleObject);
    
    this.cache.set(key, createdStyles);
    this.accessCount.set(key, 1);
    
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
   * Generate theme-specific cache key
   */
  private static generateThemeKey(theme: Theme): string {
    return `theme:${theme.name}:${theme.isDark ? 'dark' : 'light'}`;
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
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    mostAccessed: Array<{ key: string; count: number }>;
  } {
    const totalAccess = Array.from(this.accessCount.values()).reduce((a, b) => a + b, 0);
    const hitRate = totalAccess > 0 ? (totalAccess - this.cache.size) / totalAccess : 0;
    
    const mostAccessed = Array.from(this.accessCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate,
      mostAccessed,
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
 * Main performance utilities class
 */
export class PerformanceStyleUtils {
  static cache = StyleSheetCache;
  static memoization = StyleMemoization;
  static optimizer = StyleOptimizer;
  static monitor = StylePerformanceMonitor;

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