import { useState, useCallback, useRef } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

export function useLoadingState(initialState: LoadingState = {}) {
  const [loadingState, setLoadingState] = useState<LoadingState>(initialState);
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const setLoading = useCallback((key: string, loading: boolean, timeout?: number) => {
    // Clear any existing timeout for this key
    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
      delete timeoutRefs.current[key];
    }

    if (loading && timeout) {
      // Set loading to false after timeout
      timeoutRefs.current[key] = setTimeout(() => {
        setLoadingState(prev => ({ ...prev, [key]: false }));
        delete timeoutRefs.current[key];
      }, timeout);
    }

    setLoadingState(prev => ({ ...prev, [key]: loading }));
  }, []);

  const isLoading = useCallback((key: string): boolean => {
    return loadingState[key] || false;
  }, [loadingState]);

  const isAnyLoading = useCallback((): boolean => {
    return Object.values(loadingState).some(loading => loading);
  }, [loadingState]);

  const clearLoading = useCallback((key?: string) => {
    if (key) {
      // Clear specific loading state
      if (timeoutRefs.current[key]) {
        clearTimeout(timeoutRefs.current[key]);
        delete timeoutRefs.current[key];
      }
      setLoadingState(prev => ({ ...prev, [key]: false }));
    } else {
      // Clear all loading states
      Object.values(timeoutRefs.current).forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current = {};
      setLoadingState({});
    }
  }, []);

  const withLoading = useCallback(async <T>(
    key: string,
    operation: () => Promise<T>,
    timeout?: number
  ): Promise<T> => {
    setLoading(key, true, timeout);
    try {
      const result = await operation();
      setLoading(key, false);
      return result;
    } catch (error) {
      setLoading(key, false);
      throw error;
    }
  }, [setLoading]);

  return {
    loadingState,
    setLoading,
    isLoading,
    isAnyLoading,
    clearLoading,
    withLoading,
  };
}