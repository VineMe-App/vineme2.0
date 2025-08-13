import { renderHook, act } from '@testing-library/react-native';
import { useNetworkStatus } from '../useNetworkStatus';
import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo');
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial network state', () => {
    mockNetInfo.addEventListener.mockReturnValue(() => {});
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    } as any);

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
    expect(result.current.connectionType).toBe('wifi');
  });

  it('should update network state when connection changes', async () => {
    let networkListener: (state: any) => void = () => {};

    mockNetInfo.addEventListener.mockImplementation((listener) => {
      networkListener = listener;
      return () => {};
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    } as any);

    const { result } = renderHook(() => useNetworkStatus());

    // Simulate network change
    act(() => {
      networkListener({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
    expect(result.current.connectionType).toBe('none');
  });

  it('should handle null network state', async () => {
    mockNetInfo.addEventListener.mockReturnValue(() => {});
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: null,
      isInternetReachable: null,
      type: 'unknown',
    } as any);

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
    expect(result.current.connectionType).toBe('unknown');
  });

  it('should cleanup listener on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    } as any);

    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
