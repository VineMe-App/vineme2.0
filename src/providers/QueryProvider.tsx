import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { Platform, AppState } from 'react-native';
import { ReactNode, lazy, Suspense, useEffect } from 'react';
import { handleSupabaseError } from '../utils/errorHandling';
import { globalErrorHandler } from '../utils/globalErrorHandler';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      networkMode: 'offlineFirst', // Allow queries to run offline with cached data
      retry: (failureCount, error) => {
        const appError = handleSupabaseError(error as Error);
        
        // Log errors for monitoring
        globalErrorHandler.logError(appError, {
          queryRetry: true,
          failureCount,
        });
        
        // Don't retry auth or validation errors
        if (appError.type === 'auth' || appError.type === 'validation' || appError.type === 'permission') {
          return false;
        }
        
        // Retry network errors up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      networkMode: 'online', // Mutations require network connection
      retry: (failureCount, error) => {
        const appError = handleSupabaseError(error as Error);
        
        // Log errors for monitoring
        globalErrorHandler.logError(appError, {
          mutationRetry: true,
          failureCount,
        });
        
        // Don't retry auth, validation, or permission errors
        if (appError.type === 'auth' || appError.type === 'validation' || appError.type === 'permission') {
          return false;
        }
        
        // Retry network errors up to 2 times for mutations
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
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
