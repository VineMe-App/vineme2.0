import { renderHook, act } from '@testing-library/react-native';
import { useAsyncOperation } from '../useAsyncOperation';
import { NetworkError } from '../../utils/errorHandling';

// Mock the auth store
jest.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user-id' },
  }),
}));

// Mock global error handler
jest.mock('../../utils/globalErrorHandler', () => ({
  globalErrorHandler: {
    logError: jest.fn(),
  },
}));

describe('useAsyncOperation', () => {
  it('should handle successful operations', async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useAsyncOperation({ onSuccess }));

    const mockOperation = jest.fn().mockResolvedValue('success');

    await act(async () => {
      const response = await result.current.execute(mockOperation);
      expect(response).toBe('success');
    });

    expect(result.current.data).toBe('success');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(onSuccess).toHaveBeenCalledWith('success');
  });

  it('should handle failed operations', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useAsyncOperation({ onError }));

    const mockError = new NetworkError('Network failed');
    const mockOperation = jest.fn().mockRejectedValue(mockError);

    await act(async () => {
      const response = await result.current.execute(mockOperation);
      expect(response).toBe(null);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error?.message).toBe('Network failed');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Network failed',
      })
    );
  });

  it('should set loading state during operation', async () => {
    const { result } = renderHook(() => useAsyncOperation());

    const mockOperation = jest
      .fn()
      .mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve('success'), 100))
      );

    act(() => {
      result.current.execute(mockOperation);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(result.current.loading).toBe(false);
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useAsyncOperation());

    // Set some state
    act(() => {
      result.current.execute(async () => 'test');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should retry operations', async () => {
    const { result } = renderHook(() => useAsyncOperation());

    const mockOperation = jest.fn().mockResolvedValue('retry success');

    await act(async () => {
      await result.current.retry(mockOperation);
    });

    expect(result.current.data).toBe('retry success');
    expect(mockOperation).toHaveBeenCalled();
  });
});
