import { renderHook, act } from '@testing-library/react-native';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty loading state', () => {
    const { result } = renderHook(() => useLoadingState());

    expect(result.current.loadingState).toEqual({});
    expect(result.current.isAnyLoading()).toBe(false);
  });

  it('should initialize with provided initial state', () => {
    const initialState = { test: true };
    const { result } = renderHook(() => useLoadingState(initialState));

    expect(result.current.loadingState).toEqual(initialState);
    expect(result.current.isLoading('test')).toBe(true);
    expect(result.current.isAnyLoading()).toBe(true);
  });

  it('should set and get loading states', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setLoading('operation1', true);
    });

    expect(result.current.isLoading('operation1')).toBe(true);
    expect(result.current.isAnyLoading()).toBe(true);

    act(() => {
      result.current.setLoading('operation1', false);
    });

    expect(result.current.isLoading('operation1')).toBe(false);
    expect(result.current.isAnyLoading()).toBe(false);
  });

  it('should handle multiple loading states', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setLoading('op1', true);
      result.current.setLoading('op2', true);
    });

    expect(result.current.isLoading('op1')).toBe(true);
    expect(result.current.isLoading('op2')).toBe(true);
    expect(result.current.isAnyLoading()).toBe(true);

    act(() => {
      result.current.setLoading('op1', false);
    });

    expect(result.current.isLoading('op1')).toBe(false);
    expect(result.current.isLoading('op2')).toBe(true);
    expect(result.current.isAnyLoading()).toBe(true);
  });

  it('should handle timeout for loading states', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setLoading('timedOperation', true, 1000);
    });

    expect(result.current.isLoading('timedOperation')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isLoading('timedOperation')).toBe(false);
  });

  it('should clear specific loading state', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setLoading('op1', true);
      result.current.setLoading('op2', true);
    });

    act(() => {
      result.current.clearLoading('op1');
    });

    expect(result.current.isLoading('op1')).toBe(false);
    expect(result.current.isLoading('op2')).toBe(true);
  });

  it('should clear all loading states', () => {
    const { result } = renderHook(() => useLoadingState());

    act(() => {
      result.current.setLoading('op1', true);
      result.current.setLoading('op2', true);
    });

    act(() => {
      result.current.clearLoading();
    });

    expect(result.current.isLoading('op1')).toBe(false);
    expect(result.current.isLoading('op2')).toBe(false);
    expect(result.current.isAnyLoading()).toBe(false);
  });

  it('should handle withLoading wrapper', async () => {
    const { result } = renderHook(() => useLoadingState());

    const mockOperation = jest.fn().mockResolvedValue('success');

    await act(async () => {
      const response = await result.current.withLoading('testOp', mockOperation);
      expect(response).toBe('success');
    });

    expect(result.current.isLoading('testOp')).toBe(false);
    expect(mockOperation).toHaveBeenCalled();
  });

  it('should handle withLoading wrapper with errors', async () => {
    const { result } = renderHook(() => useLoadingState());

    const mockError = new Error('Test error');
    const mockOperation = jest.fn().mockRejectedValue(mockError);

    await act(async () => {
      try {
        await result.current.withLoading('testOp', mockOperation);
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(result.current.isLoading('testOp')).toBe(false);
  });
});