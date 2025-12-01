import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { Platform, AppState } from 'react-native';
import { ReactNode, useEffect } from 'react';
import { handleSupabaseError } from '../utils/errorHandling';
import { globalErrorHandler } from '../utils/globalErrorHandler';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { performanceMonitor } from '../utils/performance';
import { getPerformanceConfig } from '../config/performance';
import NetInfo from '@react-native-community/netinfo';
import { isDeletionFlowActive, isPostDeletionError } from '../utils/errorSuppression';

// Conditionally import devtools only in development and on web
let ReactQueryDevtools: React.ComponentType<any> | null = null;
if (__DEV__ && Platform.OS === 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const devtools = require('@tanstack/react-query-devtools');
    ReactQueryDevtools = devtools.ReactQueryDevtools;
  } catch (error) {
    // Devtools not available, continue without them
    console.warn('React Query Devtools not available:', error);
  }
}

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
        // CRITICAL: Don't retry queries if we're in a deletion flow
        // This prevents errors from queries trying to fetch deleted user data
        if (isDeletionFlowActive()) {
          return false;
        }

        const appError = handleSupabaseError(error as Error, {
          queryRetry: true,
          failureCount,
          isPostDeletion: isDeletionFlowActive(),
        });

        // Check if this is a post-deletion error that should be suppressed
        const isPostDeletion = isPostDeletionError(error as Error, {
          queryRetry: true,
          failureCount,
          isPostDeletion: isDeletionFlowActive(),
        });

        // Skip logging if this is a silent error or post-deletion error
        if (!appError.silent && !isPostDeletion) {
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

        // Don't retry if it's a post-deletion error
        if (isPostDeletion) {
          return false;
        }

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
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
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
