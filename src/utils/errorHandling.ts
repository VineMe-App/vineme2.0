import { PostgrestError } from '@supabase/supabase-js';
import { isPostDeletionError, createSilentError } from './errorSuppression';

export interface AppError {
  type: 'network' | 'auth' | 'validation' | 'permission' | 'unknown';
  message: string;
  originalError?: Error;
  retryable?: boolean;
  silent?: boolean; // Flag to suppress logging and user alerts
}

export class NetworkError extends Error implements AppError {
  type: 'network' = 'network';
  retryable = true;

  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error implements AppError {
  type: 'auth' = 'auth';
  retryable = false;

  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends Error implements AppError {
  type: 'validation' = 'validation';
  retryable = false;

  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends Error implements AppError {
  type: 'permission' = 'permission';
  retryable = false;

  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export function handleSupabaseError(error: PostgrestError | Error): AppError {
  if ('code' in error && error.code) {
    // Handle specific Supabase error codes
    switch (error.code) {
      case 'PGRST116': // No rows found
        return new ValidationError('The requested resource was not found');
      case 'PGRST301': // Row level security violation
        return new PermissionError(
          'You do not have permission to access this resource'
        );
      case '42501': // Insufficient privilege
        return new PermissionError(
          'Insufficient permissions for this operation'
        );
      case '23505': // Unique violation
        return new ValidationError('This record already exists');
      case '23503': // Foreign key violation
        return new ValidationError('Invalid reference to related data');
      default:
        if (error.message.includes('JWT')) {
          return new AuthError(
            'Authentication required. Please sign in again.'
          );
        }
        return new NetworkError(
          error.message || 'Database operation failed',
          error
        );
    }
  }

  // Handle post-deletion errors that should be suppressed
  if (isPostDeletionError(error)) {
    return createSilentError(error, 'Resource not found (expected after account deletion)');
  }

  // Handle network errors
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return new NetworkError(
      'Network connection failed. Please check your internet connection.',
      error
    );
  }

  // Handle auth errors
  if (
    error.message.includes('auth') ||
    error.message.includes('unauthorized') ||
    error.message.includes('JWT')
  ) {
    return new AuthError(
      'Authentication required. Please sign in again.',
      error
    );
  }

  // Handle sole leader errors (expected validation error)
  if (error.message.includes('sole leader')) {
    return new ValidationError(error.message, error);
  }

  // Default to unknown error
  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred',
    originalError: error,
    retryable: true,
  };
}

export function getErrorMessage(error: AppError): string {
  switch (error.type) {
    case 'network':
      return 'Connection problem. Please check your internet and try again.';
    case 'auth':
      return 'Please sign in to continue.';
    case 'validation':
      return error.message;
    case 'permission':
      return "You don't have permission to perform this action.";
    default:
      return 'Something went wrong. Please try again.';
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Convert to app error to check retryability
      const appError = handleSupabaseError(lastError);

      // Don't retry non-retryable errors or if we've reached max retries
      if (!appError.retryable || attempt === maxRetries) {
        throw appError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw handleSupabaseError(lastError!);
}
