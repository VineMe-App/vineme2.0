import { Platform } from 'react-native';

// Performance configuration for the app
export const PERFORMANCE_CONFIG = {
  // React Query configuration
  reactQuery: {
    // Cache times
    staleTime: {
      short: 1000 * 60 * 2, // 2 minutes
      medium: 1000 * 60 * 5, // 5 minutes
      long: 1000 * 60 * 15, // 15 minutes
      veryLong: 1000 * 60 * 60, // 1 hour
    },
    gcTime: {
      short: 1000 * 60 * 5, // 5 minutes
      medium: 1000 * 60 * 10, // 10 minutes
      long: 1000 * 60 * 30, // 30 minutes
      veryLong: 1000 * 60 * 60 * 2, // 2 hours
    },
    // Retry configuration
    retry: {
      count: 3,
      delay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    // Network mode
    networkMode: {
      queries: 'offlineFirst' as const,
      mutations: 'online' as const,
    },
  },

  // Image optimization
  images: {
    // Quality settings
    quality: {
      low: 60,
      medium: 80,
      high: 95,
    },
    // Size limits
    maxWidth: Platform.OS === 'web' ? 1920 : 1080,
    maxHeight: Platform.OS === 'web' ? 1080 : 1920,
    // Lazy loading
    lazyLoading: {
      enabled: true,
      threshold: 100, // pixels
      delay: 100, // milliseconds
    },
    // Preloading
    preload: {
      enabled: true,
      maxConcurrent: 3,
    },
  },

  // Bundle optimization
  bundles: {
    // Code splitting thresholds
    splitThreshold: 50000, // bytes
    // Preloading
    preloadCritical: true,
    preloadDelay: 1000, // milliseconds
    // Monitoring
    trackBundleSize: __DEV__,
    trackLoadTime: true,
  },

  // Memory management
  memory: {
    // Component cleanup
    cleanupInterval: 1000 * 60 * 5, // 5 minutes
    maxCachedComponents: 50,
    // Image cache
    maxImageCacheSize: 1024 * 1024 * 50, // 50MB
    imageCacheCleanupThreshold: 0.8, // 80% full
    // Query cache
    maxQueryCacheSize: 1000,
    queryCacheCleanupThreshold: 0.9, // 90% full
  },

  // Performance monitoring
  monitoring: {
    enabled: true,
    sampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
    maxMetrics: 1000,
    // Thresholds for alerts
    thresholds: {
      renderTime: 16, // milliseconds (60fps)
      queryTime: 1000, // milliseconds
      imageLoadTime: 3000, // milliseconds
      bundleLoadTime: 5000, // milliseconds
    },
    // What to track
    track: {
      renders: true,
      queries: true,
      images: true,
      bundles: true,
      memory: Platform.OS !== 'web', // Memory tracking not available on web
      network: true,
    },
  },

  // List virtualization
  virtualization: {
    // When to virtualize lists
    threshold: 50, // items
    // Window size
    windowSize: 10,
    // Initial number of items to render
    initialNumToRender: 10,
    // Maximum number of items to render
    maxToRenderPerBatch: 5,
    // Update cells batch period
    updateCellsBatchingPeriod: 50,
  },

  // Animation performance
  animations: {
    // Use native driver when possible
    useNativeDriver: true,
    // Reduce motion for accessibility
    respectReduceMotion: true,
    // Animation duration limits
    maxDuration: 500, // milliseconds
    // Easing
    defaultEasing: 'ease-out',
  },

  // Network optimization
  network: {
    // Request timeouts
    timeout: 10000, // milliseconds
    // Retry configuration
    retryCount: 3,
    retryDelay: 1000, // milliseconds
    // Concurrent requests
    maxConcurrentRequests: 6,
    // Request deduplication
    deduplication: true,
    // Compression
    compression: true,
  },
} as const;

// Performance presets for different scenarios
export const PERFORMANCE_PRESETS = {
  // High performance mode (good network, powerful device)
  high: {
    ...PERFORMANCE_CONFIG,
    reactQuery: {
      ...PERFORMANCE_CONFIG.reactQuery,
      staleTime: {
        short: 1000 * 60 * 1, // 1 minute
        medium: 1000 * 60 * 3, // 3 minutes
        long: 1000 * 60 * 10, // 10 minutes
        veryLong: 1000 * 60 * 30, // 30 minutes
      },
    },
    images: {
      ...PERFORMANCE_CONFIG.images,
      quality: {
        low: 70,
        medium: 85,
        high: 95,
      },
      preload: {
        enabled: true,
        maxConcurrent: 5,
      },
    },
  },

  // Balanced mode (default)
  balanced: PERFORMANCE_CONFIG,

  // Low performance mode (slow network, older device)
  low: {
    ...PERFORMANCE_CONFIG,
    reactQuery: {
      ...PERFORMANCE_CONFIG.reactQuery,
      staleTime: {
        short: 1000 * 60 * 5, // 5 minutes
        medium: 1000 * 60 * 10, // 10 minutes
        long: 1000 * 60 * 30, // 30 minutes
        veryLong: 1000 * 60 * 60 * 2, // 2 hours
      },
    },
    images: {
      ...PERFORMANCE_CONFIG.images,
      quality: {
        low: 50,
        medium: 70,
        high: 85,
      },
      maxWidth: 720,
      maxHeight: 1280,
      preload: {
        enabled: false,
        maxConcurrent: 1,
      },
    },
    monitoring: {
      ...PERFORMANCE_CONFIG.monitoring,
      sampleRate: 0.05, // 5% sampling
    },
  },
} as const;

// Get performance config based on device capabilities
export function getPerformanceConfig() {
  // In a real app, you might detect device capabilities
  // For now, we'll use the balanced preset
  return PERFORMANCE_PRESETS.balanced;
}

// Performance optimization recommendations
export const PERFORMANCE_RECOMMENDATIONS = {
  // Component optimization
  components: [
    'Use React.memo for components that receive stable props',
    'Use useMemo for expensive calculations',
    'Use useCallback for stable function references',
    'Avoid inline objects and functions in render',
    'Use keys properly in lists',
  ],

  // Image optimization
  images: [
    'Use WebP format when supported',
    'Implement lazy loading for images below the fold',
    'Use appropriate image sizes for different screen densities',
    'Preload critical images',
    'Use placeholder images while loading',
  ],

  // List optimization
  lists: [
    'Use FlatList or VirtualizedList for long lists',
    'Implement getItemLayout when possible',
    'Use keyExtractor for better performance',
    'Optimize renderItem with React.memo',
    'Use removeClippedSubviews for very long lists',
  ],

  // Network optimization
  network: [
    'Implement request deduplication',
    'Use appropriate cache strategies',
    'Implement optimistic updates',
    'Use pagination for large datasets',
    'Implement offline support',
  ],

  // Bundle optimization
  bundles: [
    'Use code splitting for large features',
    'Implement lazy loading for non-critical components',
    'Use tree shaking to remove unused code',
    'Optimize third-party dependencies',
    'Use dynamic imports for conditional features',
  ],
} as const;
