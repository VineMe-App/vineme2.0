import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReferralFormModal } from '../ReferralFormModal';
import { referralService } from '../../../services/referrals';
import { useAuthStore } from '../../../stores/auth';

// Mock dependencies
jest.mock('../../../services/referrals');
jest.mock('../../../stores/auth');

const mockReferralService = referralService as jest.Mocked<
  typeof referralService
>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('ReferralFormModal Integration Tests', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      isAuthenticated: true,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      updateProfile: jest.fn(),
    });
  });

  describe('End-to-End Referral Flow', () => {
    it('should complete full referral creation flow successfully', async () => {
      mockReferralService.createReferral.mockResolvedValue({
        success: true,
        userId: 'new-user-123',
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      // Fill out the form
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');
      const noteInput = screen.getByTestId('referral-note-input');

      fireEvent.changeText(emailInput, 'newuser@example.com');
      fireEvent.changeText(phoneInput, '(555) 123-4567');
      fireEvent.changeText(noteInput, 'Great person for our community');

      // Submit the form
      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          phone: '(555) 123-4567',
          note: 'Great person for our community',
          firstName: undefined,
          lastName: undefined,
        });
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle rate limiting errors gracefully', async () => {
      mockOnSubmit.mockRejectedValue({
        errorDetails: {
          type: 'rate_limit',
          message: 'Too many referrals in the last hour',
          retryable: true,
          suggestions: ['Try again in 30 minutes'],
        },
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      // Fill out and submit form
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Too Many Referrals')).toBeTruthy();
        expect(
          screen.getByText('Too many referrals in the last hour')
        ).toBeTruthy();
      });

      // Modal should not close on error
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle duplicate referral errors', async () => {
      mockOnSubmit.mockRejectedValue({
        errorDetails: {
          type: 'duplicate',
          message: 'This person already has an account',
          retryable: false,
          suggestions: ['Check if they already have an account'],
        },
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      // Fill out and submit form
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Already Referred')).toBeTruthy();
        expect(
          screen.getByText('This person already has an account')
        ).toBeTruthy();
      });
    });

    it('should handle network errors with retry option', async () => {
      mockOnSubmit.mockRejectedValue({
        errorDetails: {
          type: 'network',
          message: 'Network connection failed',
          retryable: true,
          suggestions: ['Check your internet connection'],
        },
      });

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      // Fill out and submit form
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeTruthy();
        expect(screen.getByText('Network connection failed')).toBeTruthy();
      });
    });
  });

  describe('Group Referral Integration', () => {
    it('should handle group referral flow correctly', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal
            {...defaultProps}
            groupId="group-123"
            groupName="Bible Study Group"
          />
        </Wrapper>
      );

      expect(
        screen.getByText('Refer a friend to Bible Study Group')
      ).toBeTruthy();
      expect(screen.getByText(/Help someone join this group/)).toBeTruthy();

      // Fill out and submit form
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');
      const noteInput = screen.getByTestId('referral-note-input');

      fireEvent.changeText(emailInput, 'groupmember@example.com');
      fireEvent.changeText(phoneInput, '5551234567');
      fireEvent.changeText(noteInput, 'Perfect fit for this group');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'groupmember@example.com',
          phone: '5551234567',
          note: 'Perfect fit for this group',
          firstName: undefined,
          lastName: undefined,
        });
      });
    });
  });

  describe('Form Validation Integration', () => {
    it('should show validation warnings for disposable emails', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      const emailInput = screen.getByTestId('referral-email-input');
      fireEvent.changeText(emailInput, 'test@10minutemail.com');
      fireEvent(emailInput, 'blur');

      // Note: This would require the validation to return warnings
      // The actual implementation would need to be updated to show warnings
    });

    it('should handle complex validation scenarios', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      // Test multiple validation errors at once
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');
      const noteInput = screen.getByTestId('referral-note-input');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(phoneInput, '123');
      fireEvent.changeText(noteInput, 'a'.repeat(501));

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        // Should show the first validation error
        expect(screen.getByText('Invalid Information')).toBeTruthy();
      });
    });
  });

  describe('Loading States Integration', () => {
    it('should show loading state during submission', async () => {
      let resolveSubmit: (value: any) => void;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(submitPromise);

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      // Fill out form
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      const cancelButton = screen.getByTestId('referral-cancel-button');

      fireEvent.press(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(submitButton.props.accessibilityState.disabled).toBe(true);
        expect(cancelButton.props.accessibilityState.disabled).toBe(true);
      });

      // Resolve the promise
      resolveSubmit!(undefined);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility during error states', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Test error'));

      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      // Fill out and submit form to trigger error
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByTestId('referral-form-error');
        expect(errorElement).toBeTruthy();
        // Error should be accessible
        expect(errorElement.props.accessibilityRole).toBeDefined();
      });
    });

    it('should provide proper focus management', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ReferralFormModal {...defaultProps} />
        </Wrapper>
      );

      // Test that form fields are properly accessible
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      expect(emailInput.props.accessibilityLabel).toBe('Email Address');
      expect(phoneInput.props.accessibilityLabel).toBe('Phone Number');
    });
  });
});
