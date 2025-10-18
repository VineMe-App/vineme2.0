/**
 * Error suppression utilities for expected errors that occur during normal app flow
 */

/**
 * Type that accepts both Error and PostgrestError
 * PostgrestError has a message property but doesn't extend Error
 */
type ErrorLike = Error | { message: string };

/**
 * Check if an error is likely a post-account-deletion error that should be suppressed
 * Accepts both Error and PostgrestError types
 */
export function isPostDeletionError(error: ErrorLike): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  
  // Check for the specific "JSON object requested, multiple (or no) rows returned" error
  // This is a PostgREST error that occurs when trying to fetch data for a deleted user
  if (errorMessage.includes('json object requested, multiple (or no) rows returned')) {
    return true; // This error is very specific to post-deletion scenarios
  }
  
  // For 406 errors, we need to be more specific
  const is406Error = 
    errorMessage.includes('406') || 
    errorMessage.includes('not acceptable');
  
  if (!is406Error) {
    return false; // Not a 406 error or JSON error
  }
  
  // For 406 errors, check if it's related to user data tables
  const userDataTables = [
    'user_notification_settings',
    'group_memberships',
    'friendships',
    'notifications',
    'users',
    'referrals',
    'user_push_tokens'
  ];
  
  const isUserDataError = userDataTables.some(table => 
    errorMessage.includes(table.toLowerCase())
  );
  
  // Suppress 406 errors only if they're related to user data tables
  return is406Error && isUserDataError;
}

/**
 * Check if an error should be suppressed based on context
 */
export function shouldSuppressError(error: ErrorLike, context?: Record<string, any>): boolean {
  // Suppress post-deletion errors
  if (isPostDeletionError(error)) {
    return true;
  }
  
  // Suppress errors during sign-out process
  if (context?.isSigningOut) {
    return true;
  }
  
  // Suppress errors during account deletion process
  if (context?.isDeletingAccount) {
    return true;
  }
  
  return false;
}

/**
 * Create a silent error that won't be logged or shown to user
 */
export function createSilentError(originalError: ErrorLike, message: string = 'Operation completed (expected behavior)') {
  // Convert ErrorLike to Error to satisfy AppError.originalError type
  const errorInstance = originalError instanceof Error 
    ? originalError 
    : new Error(originalError.message || 'Unknown error');
  
  return {
    type: 'unknown' as const,
    message,
    originalError: errorInstance,
    retryable: false,
    silent: true,
  };
}
