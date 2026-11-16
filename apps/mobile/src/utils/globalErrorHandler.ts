import * as Sentry from '@sentry/react-native';
import { AppError, handleSupabaseError } from './errorHandling';

export function initSentry() {
  Sentry.init({
    dsn:
      process.env.EXPO_PUBLIC_SENTRY_DSN ??
      'https://748bc1b8879b77ec1d38a684c7ca7f4c@o4512441027264512.ingest.de.sentry.io/4512441096994896',
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    profilesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.mobileReplayIntegration()],
  });
}

initSentry();

interface ErrorReport {
  error: AppError;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
}

class GlobalErrorHandler {
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;

  logError(
    error: Error | AppError,
    context?: Record<string, any>,
    userId?: string
  ) {
    const appError = 'type' in error ? error : handleSupabaseError(error);

    // Skip logging if this is a silent error (e.g., expected post-deletion errors)
    if (appError.silent) {
      return;
    }

    // Skip logging expected native module errors that are handled gracefully
    // These errors occur when optional native modules aren't available (e.g., in Expo Go)
    // Also skip location permission/device settings errors as these are expected
    if (
      error instanceof Error &&
      (error.message.includes('Cannot find native module') ||
        error.message.includes('expo-clipboard') ||
        error.message.includes('ExpoClipboard') ||
        error.message.includes('expo-location') ||
        error.message.includes('Location request failed') ||
        error.message.includes('unsatisfied device settings') ||
        error.message.includes('location permission') ||
        error.message.includes('location services'))
    ) {
      return;
    }

    const report: ErrorReport = {
      error: appError,
      timestamp: new Date(),
      context,
      userId,
    };

    // Add to queue
    this.errorQueue.push(report);

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Log to console in development
    if (__DEV__) {
      console.error('Global Error:', {
        type: appError.type,
        message: appError.message,
        context,
        userId,
        originalError: appError.originalError,
      });
    }

    // In production, you would send this to a crash reporting service
    // like Sentry, Bugsnag, or Firebase Crashlytics
    this.reportToService(report);
  }

  private reportToService(report: ErrorReport) {
    const errorToCapture =
      report.error.originalError ||
      (report.error instanceof Error
        ? report.error
        : new Error(report.error.message));

    Sentry.captureException(errorToCapture, {
      tags: {
        errorType: report.error.type,
      },
      contexts: report.context
        ? {
            error: report.context,
          }
        : undefined,
      user: report.userId
        ? {
            id: report.userId,
          }
        : undefined,
    });
  }

  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errorQueue.slice(-limit);
  }

  clearErrors() {
    this.errorQueue = [];
  }
}

export const globalErrorHandler = new GlobalErrorHandler();

// Global error handlers for unhandled promise rejections and errors
// Web environment
// eslint-disable-next-line no-undef
if (
  typeof window !== 'undefined' &&
  typeof (window as any).addEventListener === 'function'
) {
  window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler.logError(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
      { type: 'unhandledPromiseRejection' }
    );
  });

  window.addEventListener('error', (event) => {
    globalErrorHandler.logError(event.error || new Error(event.message), {
      type: 'globalError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}

// React Native environment (Hermes/JSC): capture JS exceptions
// eslint-disable-next-line no-undef
if (
  typeof global !== 'undefined' &&
  (global as any).ErrorUtils &&
  typeof (global as any).ErrorUtils.setGlobalHandler === 'function'
) {
  const originalHandler = (global as any).ErrorUtils.getGlobalHandler?.();
  (global as any).ErrorUtils.setGlobalHandler(
    (error: any, isFatal?: boolean) => {
      try {
        globalErrorHandler.logError(
          error instanceof Error ? error : new Error(String(error)),
          {
            type: 'reactNativeGlobalError',
            isFatal,
          }
        );
      } catch {}

      if (typeof originalHandler === 'function') {
        try {
          originalHandler(error, isFatal);
        } catch {}
      }
    }
  );
}
