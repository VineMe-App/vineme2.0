import { useCallback } from 'react';
import { Alert } from 'react-native';
import {
  AppError,
  getErrorMessage,
  handleSupabaseError,
} from '../utils/errorHandling';
import { globalErrorHandler } from '../utils/globalErrorHandler';
import { useAuthStore } from '../stores/auth';

interface ErrorHandlerOptions {
  showAlert?: boolean;
  logError?: boolean;
  redirectOnAuth?: boolean;
  context?: Record<string, any>;
}

export function useErrorHandler() {
  const { signOut } = useAuthStore();
  const { user } = useAuthStore();

  const handleError = useCallback(
    (error: Error | AppError, options: ErrorHandlerOptions = {}) => {
      const {
        showAlert = true,
        logError = true,
        redirectOnAuth = true,
        context,
      } = options;

      const appError = 'type' in error ? error : handleSupabaseError(error);

      // Skip handling if this is a silent error (e.g., expected post-deletion errors)
      if (appError.silent) {
        return;
      }

      // Log error if requested
      if (logError) {
        globalErrorHandler.logError(appError, context, user?.id);
      }

      // Handle auth errors
      if (appError.type === 'auth' && redirectOnAuth) {
        if (showAlert) {
          Alert.alert(
            'Authentication Required',
            'Your session has expired. Please sign in again.',
            [
              {
                text: 'Sign In',
                onPress: () => {
                  signOut();
                  // Don't navigate manually - let the root layout handle it
                  // This prevents race conditions with the layout's navigation logic
                },
              },
            ]
          );
        } else {
          signOut();
          // Don't navigate manually - let the root layout handle it
          // This prevents race conditions with the layout's navigation logic
        }
        return;
      }

      // Show alert for other errors
      if (showAlert) {
        const message = getErrorMessage(appError);
        const title = getErrorTitle(appError);

        Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
      }
    },
    [signOut]
  );

  const handleAsyncError = useCallback(
    async (
      operation: () => Promise<any>,
      options: ErrorHandlerOptions = {}
    ) => {
      try {
        return await operation();
      } catch (error) {
        handleError(error as Error, options);
        throw error; // Re-throw so caller can handle if needed
      }
    },
    [handleError]
  );

  const createErrorHandler = useCallback(
    (options: ErrorHandlerOptions = {}) => {
      return (error: Error | AppError) => handleError(error, options);
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
    createErrorHandler,
  };
}

function getErrorTitle(error: AppError): string {
  switch (error.type) {
    case 'network':
      return 'Connection Problem';
    case 'auth':
      return 'Authentication Error';
    case 'validation':
      return 'Invalid Data';
    case 'permission':
      return 'Access Denied';
    default:
      return 'Error';
  }
}
