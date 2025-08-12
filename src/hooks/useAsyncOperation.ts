import { useState, useCallback } from 'react';
import { AppError, handleSupabaseError } from '../utils/errorHandling';
import { globalErrorHandler } from '../utils/globalErrorHandler';
import { useAuthStore } from '../stores/auth';

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
}

interface UseAsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: AppError) => void;
  logErrors?: boolean;
}

export function useAsyncOperation<T = any>(
  options: UseAsyncOperationOptions = {}
) {
  const { onSuccess, onError, logErrors = true } = options;
  const { user } = useAuthStore();
  
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await operation();
      
      setState({
        data: result,
        loading: false,
        error: null,
      });

      onSuccess?.(result);
      return result;
    } catch (error) {
      const appError = handleSupabaseError(error as Error);
      
      setState({
        data: null,
        loading: false,
        error: appError,
      });

      if (logErrors) {
        globalErrorHandler.logError(appError, context, user?.id);
      }

      onError?.(appError);
      return null;
    }
  }, [onSuccess, onError, logErrors, user?.id]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  const retry = useCallback(async (
    operation: () => Promise<T>,
    context?: Record<string, any>
  ) => {
    return execute(operation, context);
  }, [execute]);

  return {
    ...state,
    execute,
    reset,
    retry,
  };
}