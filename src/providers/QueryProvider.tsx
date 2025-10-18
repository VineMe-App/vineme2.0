import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { Platform, AppState } from 'react-native';
import { ReactNode, lazy, Suspense, useEffect } from 'react';
import { handleSupabaseError } from '../utils/errorHandling';
import { globalErrorHandler } from '../utils/globalErrorHandler';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { performanceMonitor } from '../utils/performance';
import { getPerformanceConfig } from '../config/performance';
import NetInfo from '@react-native-community/netinfo';

// Lazy load devtools only in development and on web
const ReactQueryDevtools =
  __DEV__ && Platform.OS === 'web'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((d) => ({
          default: d.ReactQueryDevtools,
        }))
      )
    : null;

const performanceConfig = getPerformanceConfig();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Optimized caching configuration from performance config
      staleTime: performanceConfig.reactQuery.staleTime.medium,
      gcTime: performanceConfig.reactQuery.gcTime.long,
      networkMode: performanceConfig.reactQuery.networkMode.queries,
      refetchOnWindowFocus: false, // Disable refetch on window focus for mobile
      refetchOnReconnect: 'always', // Always refetch when reconnecting
      refetchOnMount: true, // Refetch when component mounts if data is stale
      retry: (failureCount, error) => {
        const appError = handleSupabaseError(error as Error);

        // Skip logging if this is a silent error (e.g., expected post-deletion errors)
        if (!appError.silent) {
          // Log errors for monitoring
          globalErrorHandler.logError(appError, {
            queryRetry: true,
            failureCount,
          });
        }

        // Record query performance metrics
        performanceMonitor.recordMetric('query_retry', failureCount, {
          errorType: appError.type,
          errorMessage: appError.message,
        });

        // Don't retry auth or validation errors
        if (
          appError.type === 'auth' ||
          appError.type === 'validation' ||
          appError.type === 'permission'
        ) {
          return false;
        }

        // Retry network errors up to configured count
        return failureCount < performanceConfig.reactQuery.retry.count;
      },
      retryDelay: performanceConfig.reactQuery.retry.delay,
    },
    mutations: {
      networkMode: performanceConfig.reactQuery.networkMode.mutations,
      retry: (failureCount, error) => {
        const appError = handleSupabaseError(error as Error);

        // Log errors for monitoring
        globalErrorHandler.logError(appError, {
          mutationRetry: true,
          failureCount,
        });

        // Record mutation performance metrics
        performanceMonitor.recordMetric('mutation_retry', failureCount, {
          errorType: appError.type,
          errorMessage: appError.message,
        });

        // Don't retry auth, validation, or permission errors
        if (
          appError.type === 'auth' ||
          appError.type === 'validation' ||
          appError.type === 'permission'
        ) {
          return false;
        }

        // Retry network errors up to 2 times for mutations (more conservative)
        return failureCount < 2;
      },
      retryDelay: performanceConfig.reactQuery.retry.delay,
    },
  },
});

// Configure React Query's online manager to use NetInfo
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

// Configure React Query's focus manager for React Native
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });

  return () => subscription?.remove();
});

interface QueryProviderProps {
  children: ReactNode;
}

function QueryProviderInner({ children }: QueryProviderProps) {
  const { isConnected } = useNetworkStatus();

  useEffect(() => {
    // Update React Query's online status
    onlineManager.setOnline(isConnected);
  }, [isConnected]);

  return (
    <>
      {children}
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-right"
          />
        </Suspense>
      )}
    </>
  );
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryProviderInner>{children}</QueryProviderInner>
    </QueryClientProvider>
  );
}
