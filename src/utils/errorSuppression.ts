/**
 * Error suppression utilities for expected errors that occur during normal app flow
 */

/**
 * Type that accepts both Error and PostgrestError
 * PostgrestError has a message property but doesn't extend Error
 */
type ErrorLike = Error | { message: string };

/**
 * Global flag to track when we're in a post-deletion or sign-out flow
 * This prevents us from hiding legitimate errors in normal app operation
 */
let isInDeletionFlow = false;

/**
 * Set the deletion flow flag - call this when starting account deletion or sign-out
 */
export function setDeletionFlowActive(active: boolean) {
  isInDeletionFlow = active;
}

/**
 * Check if we're currently in a deletion flow
 */
export function isDeletionFlowActive(): boolean {
  return isInDeletionFlow;
}

/**
 * Check if an error is likely a post-account-deletion error that should be suppressed
 * IMPORTANT: Only call this when context indicates we're in a post-deletion or sign-out flow
 * to avoid hiding legitimate errors in normal app operation
 * 
 * @param error - The error to check
 * @param context - Context about when/where the error occurred
 */
export function isPostDeletionError(error: ErrorLike, context?: Record<string, any>): boolean {
  // CRITICAL: Only suppress errors if we have explicit context that we're in a
  // post-deletion or sign-out flow. Without this, we'd hide real bugs!
  const contextIndicatesDeletion = context?.isSigningOut || context?.isDeletingAccount || context?.isPostDeletion;
  const globalFlagActive = isDeletionFlowActive();
  
  if (!contextIndicatesDeletion && !globalFlagActive) {
    return false; // Not in deletion flow, don't suppress ANY errors
  }
  
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
  
  // Only suppress 406 errors if:
  // 1. We're in a deletion/sign-out flow (checked above)
  // 2. It's a 406 error
  // 3. It's related to user data tables
  return is406Error && isUserDataError;
}

/**
 * Check if an error should be suppressed based on context
 * This function passes context to isPostDeletionError to ensure
 * we only suppress errors that occur in specific deletion/sign-out flows
 */
export function shouldSuppressError(error: ErrorLike, context?: Record<string, any>): boolean {
  // Suppress post-deletion errors ONLY if we have explicit context
  // that we're in a deletion/sign-out flow
  if (isPostDeletionError(error, context)) {
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
