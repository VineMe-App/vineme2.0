import { AppError, handleSupabaseError } from './errorHandling';

interface ErrorReport {
  error: AppError;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
}

class GlobalErrorHandler {
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;

  logError(error: Error | AppError, context?: Record<string, any>, userId?: string) {
    const appError = 'type' in error ? error : handleSupabaseError(error);
    
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
    // In a real app, implement crash reporting here
    // Example with Sentry:
    // Sentry.captureException(report.error.originalError || new Error(report.error.message), {
    //   tags: {
    //     errorType: report.error.type,
    //   },
    //   contexts: {
    //     error: report.context,
    //   },
    //   user: {
    //     id: report.userId,
    //   },
    // });
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
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler.logError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { type: 'unhandledPromiseRejection' }
    );
  });

  window.addEventListener('error', (event) => {
    globalErrorHandler.logError(
      event.error || new Error(event.message),
      { 
        type: 'globalError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });
}