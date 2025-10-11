import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line import/no-unresolved
import SignInScreen from '@/app/(auth)/sign-in';
import * as authService from '@/services/auth';

// Mock the auth service
jest.mock('@/services/auth');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful sign in flow', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockAuthService.signIn.mockResolvedValue({
      data: { user: mockUser, session: { access_token: 'token' } },
      error: null,
    });

    renderWithProviders(<SignInScreen />);

    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockAuthService.signIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    await waitFor(() => {
      expect(mockAuthStore.setUser).toHaveBeenCalledWith(mockUser);
    });
  });

  it('should handle sign in error', async () => {
    const mockError = new Error('Invalid credentials');
    mockAuthService.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });

    renderWithProviders(<SignInScreen />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('should validate form inputs', async () => {
    renderWithProviders(<SignInScreen />);

    const signInButton = screen.getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeTruthy();
      expect(screen.getByText('Password is required')).toBeTruthy();
    });
  });

  it('should validate email format', async () => {
    renderWithProviders(<SignInScreen />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeTruthy();
    });
  });

  it('should show loading state during sign in', async () => {
    mockAuthService.signIn.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: { user: null, session: null },
                error: null,
              }),
            100
          )
        )
    );

    renderWithProviders(<SignInScreen />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    expect(screen.getByText('Signing in...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.queryByText('Signing in...')).toBeNull();
    });
  });
});
