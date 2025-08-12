import { globalErrorHandler } from '../globalErrorHandler';
import { NetworkError, AuthError } from '../errorHandling';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    globalErrorHandler.clearErrors();
  });

  it('should log errors to the queue', () => {
    const error = new NetworkError('Test network error');
    const context = { test: 'context' };
    const userId = 'user123';

    globalErrorHandler.logError(error, context, userId);

    const recentErrors = globalErrorHandler.getRecentErrors(1);
    expect(recentErrors).toHaveLength(1);
    expect(recentErrors[0].error).toBe(error);
    expect(recentErrors[0].context).toBe(context);
    expect(recentErrors[0].userId).toBe(userId);
    expect(recentErrors[0].timestamp).toBeInstanceOf(Date);
  });

  it('should handle regular Error objects', () => {
    const error = new Error('Regular error');
    
    globalErrorHandler.logError(error);

    const recentErrors = globalErrorHandler.getRecentErrors(1);
    expect(recentErrors).toHaveLength(1);
    expect(recentErrors[0].error.type).toBe('unknown');
    expect(recentErrors[0].error.message).toBe('Regular error');
  });

  it('should maintain queue size limit', () => {
    // Add more errors than the max queue size (50)
    for (let i = 0; i < 60; i++) {
      globalErrorHandler.logError(new Error(`Error ${i}`));
    }

    const recentErrors = globalErrorHandler.getRecentErrors(100);
    expect(recentErrors.length).toBeLessThanOrEqual(50);
    
    // Should keep the most recent errors
    const lastError = recentErrors[recentErrors.length - 1];
    expect(lastError.error.message).toBe('Error 59');
  });

  it('should clear errors', () => {
    globalErrorHandler.logError(new Error('Test error'));
    expect(globalErrorHandler.getRecentErrors()).toHaveLength(1);

    globalErrorHandler.clearErrors();
    expect(globalErrorHandler.getRecentErrors()).toHaveLength(0);
  });

  it('should return limited number of recent errors', () => {
    // Add 10 errors
    for (let i = 0; i < 10; i++) {
      globalErrorHandler.logError(new Error(`Error ${i}`));
    }

    const recentErrors = globalErrorHandler.getRecentErrors(5);
    expect(recentErrors).toHaveLength(5);
    
    // Should return the most recent 5
    expect(recentErrors[0].error.message).toBe('Error 5');
    expect(recentErrors[4].error.message).toBe('Error 9');
  });

  it('should log different error types correctly', () => {
    const networkError = new NetworkError('Network failed');
    const authError = new AuthError('Auth failed');

    globalErrorHandler.logError(networkError);
    globalErrorHandler.logError(authError);

    const recentErrors = globalErrorHandler.getRecentErrors(2);
    expect(recentErrors[0].error.type).toBe('network');
    expect(recentErrors[1].error.type).toBe('auth');
  });
});