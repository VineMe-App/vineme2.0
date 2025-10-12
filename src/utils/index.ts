// Barrel exports for utilities
export * from './constants';
export * from './helpers';
export * from './errorHandling';
export * from './globalErrorHandler';
export * from './theme';
export * from './colors';
export { secureStorage, SECURE_STORAGE_KEYS } from './secureStorage';
export {
  performanceMonitor,
  usePerformanceMonitor,
  withPerformanceMonitoring,
} from './performance';
export {
  bundleOptimizer,
  CodeSplitting,
  MemoryOptimization,
  PerformanceHints,
} from './bundleOptimization';

// Style utilities
export * from './styleUtils';
export * from './responsiveHelpers';
export * from './performanceStyleUtils';

// Notification utilities
export * from './notificationFormatting';

// Expo Go detection
export * from './expoGoDetection';
