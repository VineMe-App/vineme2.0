import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { handleSupabaseError } from '../utils/errorHandling';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        const appError = handleSupabaseError(error as Error);
        // Don't retry auth or validation errors
        if (appError.type === 'auth' || appError.type === 'validation') {
          return false;
        }
        // Retry network errors up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        const appError = handleSupabaseError(error as Error);
        // Don't retry auth or validation errors
        if (appError.type === 'auth' || appError.type === 'validation') {
          return false;
        }
        // Retry network errors up to 2 times for mutations
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
