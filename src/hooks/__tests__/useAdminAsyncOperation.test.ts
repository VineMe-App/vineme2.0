import { renderHook, act } from '@testing-library/react-native';
import { useAdminAsyncOperation, useAdminBatchOperation } from '../useAdminAsyncOperation';
import { AppError, NetworkError, PermissionError } from '../../utils/errorHandling';

// Mock dependencies
jest.mock('../stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user-id' },
  }),
}));

jest.mock('../../utils/globalErrorHandler', () => ({
  globalErrorHandler: {
    logError: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('useAdminAsyncOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful operations', async () => {
    const { result } = renderHook(() =>
      useAdminAsyncOperation({
        onSuccess: jest.fn(),
      })
    );

    const mockOperation = jest.fn().mockResolvedValue('success');

    await act(async () => {
      const response = await result.current.execute(mockOperation);
      expect(response).toBe('success');
    });

    expect(result.current.data).toBe('success');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(0);
  });

  it('should handle operation failures with retry', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useAdminAsyncOperation({
        onError,
        maxRetries: 2,
        showErrorAlert: false,
      })
    );

    const mockError = new NetworkError('Network failed');
    const mockOperation = jest.fn().mockRejectedValue(mockError);

    await act(async () => {
      await result.current.execute(mockOperation);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.canRetry).toBe(true);
    expect(onError).toHaveBeenCalled();
  });

  it('should handle permission errors without retry', async () => {
    const { result } = renderHook(() =>
      useAdminAsyncOperation({
        maxRetries: 3,
        showErrorAlert: false,
      })
    );

    const mockError = new PermissionError('Access denied');
    const mockOperation = jest.fn().mockRejectedValue(mockError);

    await act(async () => {
      await result.current.execute(mockOperation);
    });

    expect(result.current.canRetry).toBe(false);
    expect(result.current.error?.type).toBe('permission');
  });

  it('should handle optimistic updates with rollback', async () => {
    const { result } = renderHook(() =>
      useAdminAsyncOperation({
        optimisticUpdate: true,
        rollbackOnError: true,
        showErrorAlert: false,
      })
    );

    // Set initial data
    await act(async () => {
      await result.current.execute(
        () => Promise.resolve('initial-data')
      );
    });

    expect(result.current.data).toBe('initial-data');

    // Execute operation with optimistic update that fails
    const mockError = new Error('Operation failed');
    const mockOperation = jest.fn().mockRejectedValue(mockError);

    await act(async () => {
      await result.current.executeWithOptimisticUpdate(
        mockOperation,
        'optimistic-data'
      );
    });

    // Should rollback to original data
    expect(result.current.data).toBe('initial-data');
    expect(result.current.error).toBeTruthy();
  });

  it('should cancel ongoing operations', async () => {
    const { result } = renderHook(() => useAdminAsyncOperation());

    const mockOperation = jest.fn().mockImplementation(
      (signal) =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('success'), 1000);
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Aborted'));
          });
        })
    );

    // Start operation
    act(() => {
      result.current.execute(mockOperation);
    });

    expect(result.current.loading).toBe(true);

    // Cancel operation
    act(() => {
      result.current.cancel();
    });

    expect(result.current.loading).toBe(false);
  });

  it('should reset state correctly', async () => {
    const { result } = renderHook(() => useAdminAsyncOperation());

    // Execute operation that fails
    const mockError = new Error('Test error');
    const mockOperation = jest.fn().mockRejectedValue(mockError);

    await act(async () => {
      await result.current.execute(mockOperation);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.retryCount).toBeGreaterThan(0);

    // Reset state
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(0);
  });
});

describe('useAdminBatchOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle batch operations successfully', async () => {
    const { result } = renderHook(() => useAdminBatchOperation());

    const operations = [
      () => Promise.resolve('result1'),
      () => Promise.resolve('result2'),
      () => Promise.resolve('result3'),
    ];

    let batchResult;
    await act(async () => {
      batchResult = await result.current.executeBatch(operations);
    });

    expect(batchResult.results).toEqual(['result1', 'result2', 'result3']);
    expect(batchResult.errors).toEqual([]);
    expect(result.current.completed).toBe(3);
    expect(result.current.failed).toBe(0);
    expect(result.current.progress).toBe(1);
  });

  it('should handle batch operations with failures', async () => {
    const { result } = renderHook(() => useAdminBatchOperation());

    const operations = [
      () => Promise.resolve('result1'),
      () => Promise.reject(new Error('Operation 2 failed')),
      () => Promise.resolve('result3'),
    ];

    let batchResult;
    await act(async () => {
      batchResult = await result.current.executeBatch(operations);
    });

    expect(batchResult.results).toEqual(['result1', 'result3']);
    expect(batchResult.errors).toHaveLength(1);
    expect(result.current.completed).toBe(2);
    expect(result.current.failed).toBe(1);
    expect(result.current.hasErrors).toBe(true);
  });

  it('should track progress correctly', async () => {
    const { result } = renderHook(() => useAdminBatchOperation());

    const operations = [
      () => new Promise(resolve => setTimeout(() => resolve('result1'), 100)),
      () => new Promise(resolve => setTimeout(() => resolve('result2'), 200)),
    ];

    act(() => {
      result.current.executeBatch(operations);
    });

    expect(result.current.total).toBe(2);
    expect(result.current.loading).toBe(true);
    expect(result.current.progress).toBe(0);

    // Wait for operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    expect(result.current.completed).toBe(2);
    expect(result.current.progress).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  it('should reset batch state correctly', async () => {
    const { result } = renderHook(() => useAdminBatchOperation());

    const operations = [
      () => Promise.resolve('result1'),
      () => Promise.reject(new Error('Failed')),
    ];

    await act(async () => {
      await result.current.executeBatch(operations);
    });

    expect(result.current.total).toBe(2);
    expect(result.current.completed).toBe(1);
    expect(result.current.failed).toBe(1);

    act(() => {
      result.current.resetBatch();
    });

    expect(result.current.total).toBe(0);
    expect(result.current.completed).toBe(0);
    expect(result.current.failed).toBe(0);
    expect(result.current.errors).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});