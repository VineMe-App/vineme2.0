import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import {
  AppError,
  handleSupabaseError,
  retryWithBackoff,
} from '../utils/errorHandling';
import { globalErrorHandler } from '../utils/globalErrorHandler';
import { useAuthStore } from '../stores/auth';

interface AdminAsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  retryCount: number;
}

interface UseAdminAsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: AppError) => void;
  onRetry?: (retryCount: number) => void;
  logErrors?: boolean;
  maxRetries?: number;
  showSuccessAlert?: boolean;
  showErrorAlert?: boolean;
  optimisticUpdate?: boolean;
  rollbackOnError?: boolean;
}

interface OptimisticUpdateConfig<T> {
  optimisticData: T;
  rollbackData?: T;
}

export function useAdminAsyncOperation<T = any>(
  options: UseAdminAsyncOperationOptions = {}
) {
  const {
    onSuccess,
    onError,
    onRetry,
    logErrors = true,
    maxRetries = 3,
    showSuccessAlert = false,
    showErrorAlert = true,
    optimisticUpdate = false,
    rollbackOnError = true,
  } = options;

  const { user } = useAuthStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const originalDataRef = useRef<T | null>(null);

  const [state, setState] = useState<AdminAsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const execute = useCallback(
    async (
      operation: (signal?: AbortSignal) => Promise<T>,
      context?: Record<string, any>,
      optimisticConfig?: OptimisticUpdateConfig<T>
    ): Promise<T | null> => {
      // Cancel any ongoing operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Store original data for rollback
      if (rollbackOnError && state.data) {
        originalDataRef.current = state.data;
      }

      // Apply optimistic update if configured
      if (optimisticUpdate && optimisticConfig) {
        setState((prev) => ({
          ...prev,
          data: optimisticConfig.optimisticData,
          loading: true,
          error: null,
        }));
      } else {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const result = await retryWithBackoff(
          () => operation(signal),
          maxRetries,
          1000
        );

        // Check if operation was aborted
        if (signal.aborted) {
          return null;
        }

        setState({
          data: result,
          loading: false,
          error: null,
          retryCount: 0,
        });

        if (showSuccessAlert) {
          Alert.alert('Success', 'Operation completed successfully');
        }

        onSuccess?.(result);
        return result;
      } catch (error) {
        // Check if operation was aborted
        if (signal.aborted) {
          return null;
        }

        const appError = handleSupabaseError(error as Error);
        const newRetryCount = state.retryCount + 1;

        // Rollback optimistic update if configured
        if (optimisticUpdate && rollbackOnError && originalDataRef.current) {
          setState({
            data: originalDataRef.current,
            loading: false,
            error: appError,
            retryCount: newRetryCount,
          });
        } else {
          setState({
            data: null,
            loading: false,
            error: appError,
            retryCount: newRetryCount,
          });
        }

        if (logErrors) {
          globalErrorHandler.logError(
            appError,
            {
              ...context,
              retryCount: newRetryCount,
              operation: operation.name || 'anonymous',
            },
            user?.id
          );
        }

        if (showErrorAlert) {
          Alert.alert('Operation Failed', getAdminErrorMessage(appError), [
            { text: 'OK', style: 'default' },
            ...(appError.retryable && newRetryCount < maxRetries
              ? [
                  {
                    text: 'Retry',
                    onPress: () => retry(operation, context, optimisticConfig),
                  },
                ]
              : []),
          ]);
        }

        onError?.(appError);
        return null;
      }
    },
    [
      state.data,
      state.retryCount,
      maxRetries,
      optimisticUpdate,
      rollbackOnError,
      showSuccessAlert,
      showErrorAlert,
      logErrors,
      onSuccess,
      onError,
      user?.id,
    ]
  );

  const retry = useCallback(
    async (
      operation: (signal?: AbortSignal) => Promise<T>,
      context?: Record<string, any>,
      optimisticConfig?: OptimisticUpdateConfig<T>
    ) => {
      onRetry?.(state.retryCount + 1);
      return execute(operation, context, optimisticConfig);
    },
    [execute, onRetry, state.retryCount]
  );

  const reset = useCallback(() => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
    });

    originalDataRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState((prev) => ({
      ...prev,
      loading: false,
    }));
  }, []);

  const executeWithOptimisticUpdate = useCallback(
    async (
      operation: (signal?: AbortSignal) => Promise<T>,
      optimisticData: T,
      context?: Record<string, any>
    ) => {
      return execute(operation, context, {
        optimisticData,
        rollbackData: state.data,
      });
    },
    [execute, state.data]
  );

  return {
    ...state,
    execute,
    retry,
    reset,
    cancel,
    executeWithOptimisticUpdate,
    canRetry: state.error?.retryable && state.retryCount < maxRetries,
    isRetrying: state.retryCount > 0,
  };
}

function getAdminErrorMessage(error: AppError): string {
  switch (error.type) {
    case 'permission':
      return 'You do not have permission to perform this action. Please contact your church administrator if you believe this is an error.';
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case 'validation':
      return `Invalid data: ${error.message}`;
    case 'auth':
      return 'Your session has expired. Please sign in again.';
    default:
      return (
        error.message ||
        'An unexpected error occurred. Please try again or contact support if the problem persists.'
      );
  }
}

// Hook for batch operations with progress tracking
export function useAdminBatchOperation<T = any>(
  options: UseAdminAsyncOperationOptions = {}
) {
  const [batchState, setBatchState] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    errors: [] as AppError[],
    loading: false,
  });

  const executeBatch = useCallback(
    async (
      operations: Array<() => Promise<T>>,
      context?: Record<string, any>
    ): Promise<{ results: T[]; errors: AppError[] }> => {
      setBatchState({
        total: operations.length,
        completed: 0,
        failed: 0,
        errors: [],
        loading: true,
      });

      const results: T[] = [];
      const errors: AppError[] = [];

      for (let i = 0; i < operations.length; i++) {
        try {
          const result = await operations[i]();
          results.push(result);

          setBatchState((prev) => ({
            ...prev,
            completed: prev.completed + 1,
          }));
        } catch (error) {
          const appError = handleSupabaseError(error as Error);
          errors.push(appError);

          setBatchState((prev) => ({
            ...prev,
            failed: prev.failed + 1,
            errors: [...prev.errors, appError],
          }));

          if (options.logErrors) {
            globalErrorHandler.logError(appError, {
              ...context,
              batchIndex: i,
              batchTotal: operations.length,
            });
          }
        }
      }

      setBatchState((prev) => ({
        ...prev,
        loading: false,
      }));

      return { results, errors };
    },
    [options.logErrors]
  );

  const resetBatch = useCallback(() => {
    setBatchState({
      total: 0,
      completed: 0,
      failed: 0,
      errors: [],
      loading: false,
    });
  }, []);

  return {
    ...batchState,
    executeBatch,
    resetBatch,
    progress:
      batchState.total > 0 ? batchState.completed / batchState.total : 0,
    hasErrors: batchState.errors.length > 0,
  };
}
