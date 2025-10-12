import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import VerifyEmailScreen from '../verify-email';
import { authService } from '../../../services/auth';
import { useAuthStore } from '../../../stores/auth';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../../services/auth', () => ({
  authService: {
    handleEmailVerification: jest.fn(),
    resendVerificationEmail: jest.fn(),
  },
}));

jest.mock('../../../stores/auth', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('VerifyEmailScreen', () => {
  const mockRouter = {
    replace: jest.fn(),
  };

  const mockInitialize = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as jest.Mock).mockReturnValue({
      initialize: mockInitialize,
    });
  });

  it('should show loading state initially', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
    });

    const { getByText } = render(<VerifyEmailScreen />);

    expect(getByText('Verifying Your Email')).toBeTruthy();
    expect(
      getByText('Please wait while we verify your email address...')
    ).toBeTruthy();
  });

  it('should handle successful email verification', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
    });

    (authService.handleEmailVerification as jest.Mock).mockResolvedValue({
      success: true,
      user: { id: 'user-123' },
    });

    const { getByText } = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(getByText('Email Verified!')).toBeTruthy();
      expect(
        getByText(/Your email has been successfully verified/)
      ).toBeTruthy();
    });

    expect(authService.handleEmailVerification).toHaveBeenCalledWith(
      'test-access-token',
      'test-refresh-token'
    );
    expect(mockInitialize).toHaveBeenCalled();

    // Should redirect after 2 seconds
    await waitFor(
      () => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/onboarding');
      },
      { timeout: 3000 }
    );
  });

  it('should handle verification failure', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      access_token: 'invalid-token',
      refresh_token: 'invalid-refresh',
    });

    (authService.handleEmailVerification as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Invalid verification tokens',
    });

    const { getByText } = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(getByText('Verification Failed')).toBeTruthy();
      expect(getByText('Invalid verification tokens')).toBeTruthy();
    });

    expect(getByText('Resend Verification Email')).toBeTruthy();
    expect(getByText('Return to Sign In')).toBeTruthy();
  });

  it('should handle missing tokens', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { getByText } = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(getByText('Verification Failed')).toBeTruthy();
      expect(getByText(/Invalid verification link/)).toBeTruthy();
    });
  });

  it('should handle resend email button', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      access_token: 'invalid-token',
      refresh_token: 'invalid-refresh',
    });

    (authService.handleEmailVerification as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Invalid tokens',
    });

    (authService.resendVerificationEmail as jest.Mock).mockResolvedValue({
      success: true,
    });

    const { getByText } = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(getByText('Verification Failed')).toBeTruthy();
    });

    const resendButton = getByText('Resend Verification Email');
    fireEvent.press(resendButton);

    await waitFor(() => {
      expect(authService.resendVerificationEmail).toHaveBeenCalled();
    });
  });

  it('should handle return to sign in button', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      access_token: 'invalid-token',
      refresh_token: 'invalid-refresh',
    });

    (authService.handleEmailVerification as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Invalid tokens',
    });

    const { getByText } = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(getByText('Verification Failed')).toBeTruthy();
    });

    const returnButton = getByText('Return to Sign In');
    fireEvent.press(returnButton);

    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('should handle unexpected errors', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
    });

    (authService.handleEmailVerification as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(getByText('Verification Failed')).toBeTruthy();
      expect(getByText(/An unexpected error occurred/)).toBeTruthy();
    });
  });
});
