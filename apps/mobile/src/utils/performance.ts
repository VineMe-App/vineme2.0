import React from 'react';
import { Platform } from 'react-native';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceConfig {
  enableLogging: boolean;
  sampleRate: number; // 0-1, percentage of metrics to actually record
  maxMetrics: number; // Maximum number of metrics to keep in memory
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: PerformanceConfig = {
    enableLogging: __DEV__,
    sampleRate: __DEV__ ? 1 : 0.1, // 100% in dev, 10% in production
    maxMetrics: 1000,
  };

  private timers: Map<string, number> = new Map();

  configure(config: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...config };
  }

  startTimer(name: string): void {
    if (!this.shouldRecord()) return;
    this.timers.set(name, Date.now());
  }

  endTimer(name: string, metadata?: Record<string, any>): number | null {
    if (!this.shouldRecord()) return null;

    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Performance timer "${name}" was not started`);
      return null;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.recordMetric(name, duration, metadata);
    return duration;
  }

  recordMetric(
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldRecord()) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata: {
        platform: Platform.OS,
        ...metadata,
      },
    };

    this.metrics.push(metric);

    // Keep metrics array within bounds
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    if (this.config.enableLogging) {
      console.log(`[Performance] ${name}: ${value}ms`, metadata);
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((metric) => metric.name === name);
    }
    return [...this.metrics];
  }

  getAverageMetric(name: string): number | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;

    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
  }

  // Memory usage monitoring (React Native specific)
  recordMemoryUsage(context?: string): void {
    if (!this.shouldRecord()) return;

    // Note: React Native doesn't have direct memory APIs like web
    // This is a placeholder for future native module integration
    this.recordMetric('memory_usage', 0, {
      context,
      note: 'Memory monitoring requires native module integration',
    });
  }

  // Bundle size monitoring
  recordBundleMetric(bundleName: string, size: number): void {
    this.recordMetric('bundle_size', size, { bundleName });
  }

  // Network request monitoring
  recordNetworkRequest(url: string, duration: number, success: boolean): void {
    this.recordMetric('network_request', duration, {
      url,
      success,
      type: 'api_call',
    });
  }

  // Component render monitoring
  recordComponentRender(componentName: string, renderTime: number): void {
    this.recordMetric('component_render', renderTime, {
      componentName,
      type: 'render_time',
    });
  }

  // Query performance monitoring
  recordQueryPerformance(
    queryKey: string,
    duration: number,
    cacheHit: boolean
  ): void {
    this.recordMetric('query_performance', duration, {
      queryKey,
      cacheHit,
      type: 'data_fetch',
    });
  }

  private shouldRecord(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  // Export metrics for analytics (in production)
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      platform: Platform.OS,
      metrics: this.metrics,
      summary: this.generateSummary(),
    });
  }

  private generateSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    // Group metrics by name
    const groupedMetrics = this.metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = [];
        }
        acc[metric.name].push(metric.value);
        return acc;
      },
      {} as Record<string, number[]>
    );

    // Calculate statistics for each metric type
    Object.entries(groupedMetrics).forEach(([name, values]) => {
      summary[name] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.calculatePercentile(values, 0.95),
      };
    });

    return summary;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const startRender = () => {
    performanceMonitor.startTimer(`${componentName}_render`);
  };

  const endRender = () => {
    performanceMonitor.endTimer(`${componentName}_render`, {
      componentName,
    });
  };

  return { startRender, endRender };
}

// Higher-order component for automatic performance monitoring
export function withPerformanceMonitoring<T extends object>(
  Component: React.ComponentType<T>,
  componentName?: string
) {
  const name =
    componentName || Component.displayName || Component.name || 'Unknown';

  return function PerformanceMonitoredComponent(props: T) {
    const { startRender, endRender } = usePerformanceMonitor(name);

    React.useEffect(() => {
      startRender();
      return endRender;
    });

    return React.createElement(Component, props);
  };
}
