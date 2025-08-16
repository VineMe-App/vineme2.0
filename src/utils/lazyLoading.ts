/**
 * Lazy loading utilities for admin detail screens
 */

import React, { Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export interface LazyLoadingOptions {
  fallback?: React.ComponentType;
  errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>;
  delay?: number;
  timeout?: number;
}

/**
 * Default loading fallback component
 */
const DefaultLoadingFallback: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

/**
 * Default error boundary component
 */
const DefaultErrorBoundary: React.FC<{ 
  error: Error; 
  retry: () => void;
  message?: string;
}> = ({ error, retry, message = 'Failed to load component' }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>{message}</Text>
    <Text style={styles.errorMessage}>{error.message}</Text>
    <Text style={styles.retryButton} onPress={retry}>
      Tap to retry
    </Text>
  </View>
);

/**
 * Create a lazy-loaded component with enhanced error handling
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadingOptions = {}
): React.ComponentType<React.ComponentProps<T>> {
  const {
    fallback: Fallback = DefaultLoadingFallback,
    errorBoundary: ErrorBoundary = DefaultErrorBoundary,
    delay = 0,
    timeout = 10000,
  } = options;

  const LazyComponent = React.lazy(() => {
    const importPromise = importFn();
    
    // Add artificial delay if specified
    const delayPromise = delay > 0 
      ? new Promise(resolve => setTimeout(resolve, delay))
      : Promise.resolve();

    // Add timeout handling
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Component loading timeout')), timeout);
    });

    return Promise.race([
      Promise.all([importPromise, delayPromise]).then(([module]) => module),
      timeoutPromise,
    ]);
  });

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const [error, setError] = React.useState<Error | null>(null);
    const [retryKey, setRetryKey] = React.useState(0);

    const retry = React.useCallback(() => {
      setError(null);
      setRetryKey(prev => prev + 1);
    }, []);

    if (error) {
      return <ErrorBoundary error={error} retry={retry} />;
    }

    return (
      <React.ErrorBoundary
        fallback={({ error, resetErrorBoundary }) => (
          <ErrorBoundary error={error} retry={resetErrorBoundary} />
        )}
        onError={setError}
        resetKeys={[retryKey]}
      >
        <Suspense fallback={<Fallback />}>
          <LazyComponent {...props} ref={ref} key={retryKey} />
        </Suspense>
      </React.ErrorBoundary>
    );
  });
}

/**
 * Hook for lazy loading data with intersection observer
 */
export function useLazyData<T>(
  loadFn: () => Promise<T>,
  options: {
    threshold?: number;
    rootMargin?: string;
    enabled?: boolean;
  } = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef<View>(null);

  const { threshold = 0.1, rootMargin = '50px', enabled = true } = options;

  // Load data when component becomes visible
  React.useEffect(() => {
    if (!enabled || !isVisible || data || loading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadFn()
      .then(result => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Loading failed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, enabled, data, loading, loadFn]);

  const retry = React.useCallback(() => {
    setError(null);
    setData(null);
    // This will trigger the effect above
  }, []);

  return {
    data,
    loading,
    error,
    retry,
    elementRef,
    setIsVisible,
  };
}

/**
 * Component for lazy loading list items
 */
export const LazyListItem: React.FC<{
  children: React.ReactNode;
  onVisible: () => void;
  threshold?: number;
  rootMargin?: string;
}> = ({ children, onVisible, threshold = 0.1, rootMargin = '50px' }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef<View>(null);

  React.useEffect(() => {
    if (isVisible) {
      onVisible();
    }
  }, [isVisible, onVisible]);

  // Note: React Native doesn't have IntersectionObserver
  // This would need to be implemented with onLayout and scroll events
  // For now, we'll use a simple approach

  const handleLayout = React.useCallback(() => {
    // Simple visibility detection - in a real implementation,
    // you'd want to check if the item is actually in the viewport
    if (!isVisible) {
      setIsVisible(true);
    }
  }, [isVisible]);

  return (
    <View ref={elementRef} onLayout={handleLayout}>
      {children}
    </View>
  );
};

/**
 * Virtual list component for large datasets
 */
export interface VirtualListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
}

export function VirtualList<T>({
  data,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  onEndReached,
  onEndReachedThreshold = 0.8,
}: VirtualListProps<T>) {
  const [scrollOffset, setScrollOffset] = React.useState(0);

  const visibleStart = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
  const visibleEnd = Math.min(
    data.length,
    Math.ceil((scrollOffset + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = data.slice(visibleStart, visibleEnd);
  const totalHeight = data.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = React.useCallback((event: any) => {
    const newScrollOffset = event.nativeEvent.contentOffset.y;
    setScrollOffset(newScrollOffset);

    // Check if we should load more data
    if (onEndReached && onEndReachedThreshold) {
      const scrollPercentage = (newScrollOffset + containerHeight) / totalHeight;
      if (scrollPercentage >= onEndReachedThreshold) {
        onEndReached();
      }
    }
  }, [containerHeight, totalHeight, onEndReached, onEndReachedThreshold]);

  return (
    <View style={{ height: containerHeight }}>
      <View
        style={{
          height: totalHeight,
          paddingTop: offsetY,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {visibleItems.map((item, index) => (
          <View key={visibleStart + index} style={{ height: itemHeight }}>
            {renderItem(item, visibleStart + index)}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Progressive loading component for images and heavy content
 */
export const ProgressiveLoader: React.FC<{
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  delay?: number;
  fadeIn?: boolean;
}> = ({ 
  children, 
  placeholder = <DefaultLoadingFallback />, 
  delay = 100,
  fadeIn = true 
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [opacity] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(true);
      if (fadeIn) {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, fadeIn, opacity]);

  if (!loaded) {
    return <>{placeholder}</>;
  }

  if (fadeIn) {
    return (
      <Animated.View style={{ opacity }}>
        {children}
      </Animated.View>
    );
  }

  return <>{children}</>;
};

/**
 * Batch loader for multiple async operations
 */
export class BatchLoader<T> {
  private queue: Array<{
    id: string;
    loadFn: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private processing = false;
  private batchSize: number;
  private delay: number;

  constructor(batchSize: number = 5, delay: number = 100) {
    this.batchSize = batchSize;
    this.delay = delay;
  }

  async load(id: string, loadFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id, loadFn, resolve, reject });
      this.processBatch();
    });
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      try {
        await Promise.all(
          batch.map(async ({ loadFn, resolve, reject }) => {
            try {
              const result = await loadFn();
              resolve(result);
            } catch (error) {
              reject(error instanceof Error ? error : new Error('Load failed'));
            }
          })
        );
      } catch (error) {
        // Individual errors are handled above
      }

      // Add delay between batches
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    this.processing = false;
  }

  clear(): void {
    this.queue.forEach(({ reject }) => {
      reject(new Error('Batch loader cleared'));
    });
    this.queue = [];
    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

// Fix missing import
import { Animated } from 'react-native';