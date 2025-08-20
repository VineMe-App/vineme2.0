import { performanceMonitor, usePerformanceMonitor } from '../performance';
import { renderHook } from '@testing-library/react-native';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock React for the hook test
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn((fn) => fn()),
}));

describe('Performance Monitor', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
    performanceMonitor.configure({
      enableLogging: false,
      sampleRate: 1, // Always record for tests
      maxMetrics: 100,
    });
  });

  describe('Timer functionality', () => {
    it('should start and end timers correctly', () => {
      const timerName = 'test_timer';

      performanceMonitor.startTimer(timerName);

      // Simulate some work
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Wait 10ms
      }

      const duration = performanceMonitor.endTimer(timerName);

      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should be less than 100ms
    });

    it('should handle ending non-existent timer', () => {
      const duration = performanceMonitor.endTimer('non_existent');
      expect(duration).toBeNull();
    });
  });

  describe('Metric recording', () => {
    it('should record metrics with metadata', () => {
      const metricName = 'test_metric';
      const value = 42;
      const metadata = { test: true };

      performanceMonitor.recordMetric(metricName, value, metadata);

      const metrics = performanceMonitor.getMetrics(metricName);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe(metricName);
      expect(metrics[0].value).toBe(value);
      expect(metrics[0].metadata).toMatchObject(metadata);
    });

    it('should calculate average metrics', () => {
      const metricName = 'average_test';

      performanceMonitor.recordMetric(metricName, 10);
      performanceMonitor.recordMetric(metricName, 20);
      performanceMonitor.recordMetric(metricName, 30);

      const average = performanceMonitor.getAverageMetric(metricName);
      expect(average).toBe(20);
    });

    it('should return null for non-existent metric average', () => {
      const average = performanceMonitor.getAverageMetric('non_existent');
      expect(average).toBeNull();
    });
  });

  describe('Memory management', () => {
    it('should limit metrics to maxMetrics', () => {
      performanceMonitor.configure({ maxMetrics: 3 });

      // Record more metrics than the limit
      for (let i = 0; i < 5; i++) {
        performanceMonitor.recordMetric('test', i);
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.length).toBe(3);

      // Should keep the most recent metrics
      expect(metrics[0].value).toBe(2);
      expect(metrics[1].value).toBe(3);
      expect(metrics[2].value).toBe(4);
    });
  });

  describe('Sampling', () => {
    it('should respect sample rate', () => {
      performanceMonitor.configure({ sampleRate: 0 }); // Never record

      performanceMonitor.recordMetric('sampled_test', 42);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe('Export functionality', () => {
    it('should export metrics as JSON', () => {
      performanceMonitor.recordMetric('export_test', 100);
      performanceMonitor.recordMetric('export_test', 200);

      const exported = performanceMonitor.exportMetrics();
      const data = JSON.parse(exported);

      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('platform');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('summary');
      expect(data.metrics).toHaveLength(2);
      expect(data.summary.export_test).toMatchObject({
        count: 2,
        average: 150,
        min: 100,
        max: 200,
      });
    });
  });

  describe('Specialized metrics', () => {
    it('should record network request metrics', () => {
      const url = 'https://api.example.com/test';
      const duration = 250;
      const success = true;

      performanceMonitor.recordNetworkRequest(url, duration, success);

      const metrics = performanceMonitor.getMetrics('network_request');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(duration);
      expect(metrics[0].metadata).toMatchObject({
        url,
        success,
        type: 'api_call',
      });
    });

    it('should record component render metrics', () => {
      const componentName = 'TestComponent';
      const renderTime = 16;

      performanceMonitor.recordComponentRender(componentName, renderTime);

      const metrics = performanceMonitor.getMetrics('component_render');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(renderTime);
      expect(metrics[0].metadata).toMatchObject({
        componentName,
        type: 'render_time',
      });
    });

    it('should record query performance metrics', () => {
      const queryKey = 'users';
      const duration = 150;
      const cacheHit = true;

      performanceMonitor.recordQueryPerformance(queryKey, duration, cacheHit);

      const metrics = performanceMonitor.getMetrics('query_performance');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(duration);
      expect(metrics[0].metadata).toMatchObject({
        queryKey,
        cacheHit,
        type: 'data_fetch',
      });
    });
  });
});

describe('usePerformanceMonitor hook', () => {
  it('should provide start and end render functions', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));

    expect(result.current).toHaveProperty('startRender');
    expect(result.current).toHaveProperty('endRender');
    expect(typeof result.current.startRender).toBe('function');
    expect(typeof result.current.endRender).toBe('function');
  });
});
