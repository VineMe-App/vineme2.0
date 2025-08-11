import {
  handleSupabaseError,
  getErrorMessage,
  retryWithBackoff,
  NetworkError,
  AuthError,
  ValidationError,
  PermissionError,
} from '../errorHandling';

describe('Error Handling', () => {
  describe('handleSupabaseError', () => {
    it('should handle PGRST116 (no rows found)', () => {
      const error = { code: 'PGRST116', message: 'No rows found' };
      const result = handleSupabaseError(error as any);
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('The requested resource was not found');
    });

    it('should handle PGRST301 (RLS violation)', () => {
      const error = { code: 'PGRST301', message: 'RLS violation' };
      const result = handleSupabaseError(error as any);
      expect(result).toBeInstanceOf(PermissionError);
      expect(result.message).toBe('You do not have permission to access this resource');
    });

    it('should handle JWT errors', () => {
      const error = new Error('JWT expired');
      const result = handleSupabaseError(error);
      expect(result).toBeInstanceOf(AuthError);
      expect(result.message).toBe('Authentication required. Please sign in again.');
    });

    it('should handle network errors', () => {
      const error = new Error('fetch failed');
      const result = handleSupabaseError(error);
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toBe('Network connection failed. Please check your internet connection.');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      const result = handleSupabaseError(error);
      expect(result.type).toBe('unknown');
      expect(result.retryable).toBe(true);
    });
  });

  describe('getErrorMessage', () => {
    it('should return appropriate message for network errors', () => {
      const error = new NetworkError('Network failed');
      const message = getErrorMessage(error);
      expect(message).toBe('Connection problem. Please check your internet and try again.');
    });

    it('should return appropriate message for auth errors', () => {
      const error = new AuthError('Auth failed');
      const message = getErrorMessage(error);
      expect(message).toBe('Please sign in to continue.');
    });

    it('should return custom message for validation errors', () => {
      const error = new ValidationError('Custom validation message');
      const message = getErrorMessage(error);
      expect(message).toBe('Custom validation message');
    });

    it('should return appropriate message for permission errors', () => {
      const error = new PermissionError('Permission denied');
      const message = getErrorMessage(error);
      expect(message).toBe('You don\'t have permission to perform this action.');
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(mockFn);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, 2, 10);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      // Use a regular error that will be converted to AuthError by handleSupabaseError
      const authError = new Error('JWT expired');
      const mockFn = jest.fn().mockRejectedValue(authError);

      await expect(retryWithBackoff(mockFn, 3, 10)).rejects.toThrow(AuthError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const networkError = new Error('network error');
      const mockFn = jest.fn().mockRejectedValue(networkError);

      await expect(retryWithBackoff(mockFn, 2, 10)).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});