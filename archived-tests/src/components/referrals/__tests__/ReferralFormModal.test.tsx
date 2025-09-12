import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ReferralFormModal, ReferralFormData } from '../ReferralFormModal';

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

describe('ReferralFormModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders general referral form correctly', () => {
      render(<ReferralFormModal {...defaultProps} />);

      expect(screen.getByText('Refer someone to VineMe')).toBeTruthy();
      expect(
        screen.getByText(/Help someone join the VineMe community/)
      ).toBeTruthy();
      expect(screen.getByTestId('referral-first-name-input')).toBeTruthy();
      expect(screen.getByTestId('referral-last-name-input')).toBeTruthy();
      expect(screen.getByTestId('referral-email-input')).toBeTruthy();
      expect(screen.getByTestId('referral-phone-input')).toBeTruthy();
      expect(screen.getByTestId('referral-note-input')).toBeTruthy();
    });

    it('renders group referral form correctly', () => {
      render(
        <ReferralFormModal
          {...defaultProps}
          groupId="group-123"
          groupName="Bible Study Group"
        />
      );

      expect(
        screen.getByText('Refer a friend to Bible Study Group')
      ).toBeTruthy();
      expect(screen.getByText(/Help someone join this group/)).toBeTruthy();
    });

    it('renders group referral without group name', () => {
      render(<ReferralFormModal {...defaultProps} groupId="group-123" />);

      expect(screen.getByText('Refer a friend to group')).toBeTruthy();
    });

    it('shows required field indicators', () => {
      render(<ReferralFormModal {...defaultProps} />);

      expect(screen.getByText('Email Address')).toBeTruthy();
      expect(screen.getByText('Phone Number')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('validates required email field', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeTruthy();
      });
    });

    it('validates email format', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const emailInput = screen.getByTestId('referral-email-input');
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeTruthy();
      });
    });

    it('validates required phone field', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Phone number is required')).toBeTruthy();
      });
    });

    it('validates phone number length - too short', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const phoneInput = screen.getByTestId('referral-phone-input');
      fireEvent.changeText(phoneInput, '123');
      fireEvent(phoneInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Phone number must be at least 10 digits')
        ).toBeTruthy();
      });
    });

    it('validates phone number length - too long', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const phoneInput = screen.getByTestId('referral-phone-input');
      fireEvent.changeText(phoneInput, '12345678901234567890');
      fireEvent(phoneInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Phone number must be no more than 15 digits')
        ).toBeTruthy();
      });
    });

    it('validates note character limit', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const noteInput = screen.getByTestId('referral-note-input');
      const longNote = 'a'.repeat(501);
      fireEvent.changeText(noteInput, longNote);
      fireEvent(noteInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Must be no more than 500 characters')
        ).toBeTruthy();
      });
    });

    it('validates name field length', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const firstNameInput = screen.getByTestId('referral-first-name-input');
      const longName = 'a'.repeat(51);
      fireEvent.changeText(firstNameInput, longName);
      fireEvent(firstNameInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Must be no more than 50 characters')
        ).toBeTruthy();
      });
    });

    it('accepts valid form data', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          phone: '5551234567',
          note: '',
          firstName: undefined,
          lastName: undefined,
        });
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with all fields filled', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const firstNameInput = screen.getByTestId('referral-first-name-input');
      const lastNameInput = screen.getByTestId('referral-last-name-input');
      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');
      const noteInput = screen.getByTestId('referral-note-input');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john.doe@example.com');
      fireEvent.changeText(phoneInput, '(555) 123-4567');
      fireEvent.changeText(noteInput, 'Great person for our community');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'john.doe@example.com',
          phone: '(555) 123-4567',
          note: 'Great person for our community',
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });

    it('trims whitespace from form fields', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');
      const noteInput = screen.getByTestId('referral-note-input');

      fireEvent.changeText(emailInput, '  test@example.com  ');
      fireEvent.changeText(phoneInput, '  5551234567  ');
      fireEvent.changeText(noteInput, '  Great person  ');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          phone: '5551234567',
          note: 'Great person',
          firstName: undefined,
          lastName: undefined,
        });
      });
    });

    it('closes modal after successful submission', async () => {
      render(<ReferralFormModal {...defaultProps} />);

      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('handles submission errors gracefully', async () => {
      const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
      mockOnSubmit.mockRejectedValueOnce(new Error('Network error'));

      render(<ReferralFormModal {...defaultProps} />);

      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          'There was an error submitting the referral. Please try again.',
          [{ text: 'OK' }]
        );
      });

      // Modal should not close on error
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      let resolveSubmit: (value: any) => void;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValueOnce(submitPromise);

      render(<ReferralFormModal {...defaultProps} />);

      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(submitButton.props.accessibilityState.disabled).toBe(true);
      });

      // Resolve the promise
      resolveSubmit!(undefined);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is pressed', () => {
      render(<ReferralFormModal {...defaultProps} />);

      const cancelButton = screen.getByTestId('referral-cancel-button');
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when modal close button is pressed', () => {
      render(<ReferralFormModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('updates character count for note field', () => {
      render(<ReferralFormModal {...defaultProps} />);

      const noteInput = screen.getByTestId('referral-note-input');
      fireEvent.changeText(noteInput, 'Test note');

      expect(screen.getByText('9/500 characters')).toBeTruthy();
    });

    it('disables cancel button during submission', async () => {
      let resolveSubmit: (value: any) => void;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValueOnce(submitPromise);

      render(<ReferralFormModal {...defaultProps} />);

      const emailInput = screen.getByTestId('referral-email-input');
      const phoneInput = screen.getByTestId('referral-phone-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(phoneInput, '5551234567');

      const submitButton = screen.getByTestId('referral-submit-button');
      fireEvent.press(submitButton);

      const cancelButton = screen.getByTestId('referral-cancel-button');

      await waitFor(() => {
        expect(cancelButton.props.accessibilityState.disabled).toBe(true);
      });

      resolveSubmit!(undefined);
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      render(<ReferralFormModal {...defaultProps} />);

      expect(screen.getByLabelText('First Name')).toBeTruthy();
      expect(screen.getByLabelText('Last Name')).toBeTruthy();
      expect(screen.getByLabelText('Email Address')).toBeTruthy();
      expect(screen.getByLabelText('Phone Number')).toBeTruthy();
      expect(screen.getByLabelText('Note (Optional)')).toBeTruthy();
    });

    it('has proper button roles', () => {
      render(<ReferralFormModal {...defaultProps} />);

      const submitButton = screen.getByTestId('referral-submit-button');
      const cancelButton = screen.getByTestId('referral-cancel-button');

      expect(submitButton.props.accessibilityRole).toBe('button');
      expect(cancelButton.props.accessibilityRole).toBe('button');
    });
  });
});
