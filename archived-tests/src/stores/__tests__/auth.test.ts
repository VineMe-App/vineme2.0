import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../auth';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.clearUser();
    });
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should set user and update authentication state', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should clear user and reset authentication state', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    // First set a user
    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then clear the user
    act(() => {
      result.current.clearUser();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle user profile updates', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    act(() => {
      result.current.setUser(mockUser);
    });

    const updatedUser = {
      ...mockUser,
      name: 'Updated Name',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    act(() => {
      result.current.setUser(updatedUser);
    });

    expect(result.current.user?.name).toBe('Updated Name');
    expect(result.current.user?.avatar_url).toBe(
      'https://example.com/avatar.jpg'
    );
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should persist state across multiple hook instances', () => {
    const { result: result1 } = renderHook(() => useAuthStore());
    const { result: result2 } = renderHook(() => useAuthStore());

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    act(() => {
      result1.current.setUser(mockUser);
    });

    // Both hook instances should have the same state
    expect(result1.current.user).toEqual(mockUser);
    expect(result2.current.user).toEqual(mockUser);
    expect(result1.current.isAuthenticated).toBe(true);
    expect(result2.current.isAuthenticated).toBe(true);
  });
});
