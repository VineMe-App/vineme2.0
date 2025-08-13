import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../useAuth';
import * as authService from '@/services/auth';

// Mock the auth service
jest.mock('@/services/auth');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock the auth store
const mockAuthStore = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: jest.fn(),
  setLoading: jest.fn(),
  clearUser: jest.fn(),
};

jest.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return auth state and methods', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });

  it('should handle successful sign in', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    mockAuthService.signIn.mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signIn(
        'test@example.com',
        'password'
      );
      expect(response.error).toBeNull();
    });

    expect(mockAuthService.signIn).toHaveBeenCalledWith(
      'test@example.com',
      'password'
    );
  });

  it('should handle sign in error', async () => {
    const mockError = new Error('Invalid credentials');
    mockAuthService.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signIn(
        'test@example.com',
        'wrong-password'
      );
      expect(response.error).toBe(mockError);
    });
  });

  it('should handle successful sign up', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    mockAuthService.signUp.mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.signUp(
        'test@example.com',
        'password'
      );
      expect(response.error).toBeNull();
    });

    expect(mockAuthService.signUp).toHaveBeenCalledWith(
      'test@example.com',
      'password'
    );
  });

  it('should handle sign out', async () => {
    mockAuthService.signOut.mockResolvedValue();

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuthService.signOut).toHaveBeenCalled();
    expect(mockAuthStore.clearUser).toHaveBeenCalled();
  });
});
