import React, { useState } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { Input } from '../Input';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';

// Mock the theme provider
const renderWithTheme = (
  component: React.ReactElement,
  initialTheme: 'light' | 'dark' = 'light'
) => {
  return render(
    <ThemeProvider initialTheme={initialTheme}>{component}</ThemeProvider>
  );
};

// Test component that uses Input with state
const TestForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !validateEmail(value)) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please enter a valid email address',
      }));
    } else {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value && value.length < 8) {
      setErrors((prev) => ({
        ...prev,
        password: 'Password must be at least 8 characters',
      }));
    } else {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  return (
    <>
      <Input
        label="Email"
        value={email}
        onChangeText={handleEmailChange}
        error={errors.email}
        successMessage={
          email && !errors.email ? 'Valid email address' : undefined
        }
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        testID="email-input"
        leftIcon={<Text testID="email-icon">@</Text>}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={handlePasswordChange}
        error={errors.password}
        placeholder="Enter your password"
        secureTextEntry={!showPassword}
        testID="password-input"
        rightIcon={
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text testID="password-toggle">
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        }
        onRightIconPress={() => setShowPassword(!showPassword)}
        maxLength={50}
        showCharacterCount
      />
    </>
  );
};

describe('Input Integration Tests', () => {
  describe('Form Validation Flow', () => {
    it('validates email input and shows appropriate messages', async () => {
      const { getByTestId } = renderWithTheme(<TestForm />);

      const emailInput = getByTestId('email-input').findByType('TextInput');

      // Test invalid email
      fireEvent.changeText(emailInput, 'invalid-email');

      await waitFor(() => {
        expect(getByTestId('email-input-message')).toHaveTextContent(
          'Please enter a valid email address'
        );
      });

      // Test valid email
      fireEvent.changeText(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(getByTestId('email-input-message')).toHaveTextContent(
          'Valid email address'
        );
      });
    });

    it('validates password input and shows character count', async () => {
      const { getByTestId } = renderWithTheme(<TestForm />);

      const passwordInput =
        getByTestId('password-input').findByType('TextInput');

      // Test short password
      fireEvent.changeText(passwordInput, 'short');

      await waitFor(() => {
        expect(getByTestId('password-input-message-text')).toHaveTextContent(
          'Password must be at least 8 characters'
        );
        expect(getByTestId('password-input-character-count')).toHaveTextContent(
          '5/50'
        );
      });

      // Test valid password
      fireEvent.changeText(passwordInput, 'validpassword123');

      await waitFor(() => {
        expect(getByTestId('password-input-character-count')).toHaveTextContent(
          '16/50'
        );
      });
    });

    it('toggles password visibility', () => {
      const { getByTestId } = renderWithTheme(<TestForm />);

      const passwordInput =
        getByTestId('password-input').findByType('TextInput');
      const toggleButton = getByTestId('password-toggle');

      // Initially password should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(toggleButton).toHaveTextContent('Show');

      // Toggle to show password
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(false);
      expect(toggleButton).toHaveTextContent('Hide');

      // Toggle back to hide password
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(toggleButton).toHaveTextContent('Show');
    });
  });

  describe('Theme Integration', () => {
    it('renders correctly with light theme', () => {
      const { getByTestId } = renderWithTheme(
        <Input label="Test Input" testID="test-input" />,
        'light'
      );

      expect(getByTestId('test-input')).toBeTruthy();
      expect(getByTestId('test-input-label')).toBeTruthy();
    });

    it('renders correctly with dark theme', () => {
      const { getByTestId } = renderWithTheme(
        <Input label="Test Input" testID="test-input" />,
        'dark'
      );

      expect(getByTestId('test-input')).toBeTruthy();
      expect(getByTestId('test-input-label')).toBeTruthy();
    });
  });

  describe('Focus and Animation Integration', () => {
    it('handles focus and blur events with animations', async () => {
      const mockFocus = jest.fn();
      const mockBlur = jest.fn();

      const { getByTestId } = renderWithTheme(
        <Input
          label="Animated Input"
          onFocus={mockFocus}
          onBlur={mockBlur}
          testID="animated-input"
        />
      );

      const input = getByTestId('animated-input').findByType('TextInput');

      // Focus the input
      fireEvent(input, 'focus');
      expect(mockFocus).toHaveBeenCalledTimes(1);

      // Blur the input
      fireEvent(input, 'blur');
      expect(mockBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility Integration', () => {
    it('provides proper accessibility support for form validation', async () => {
      const { getByTestId } = renderWithTheme(<TestForm />);

      const emailInput = getByTestId('email-input').findByType('TextInput');

      // Check initial accessibility properties
      expect(emailInput.props.accessibilityLabel).toBe('Email');
      expect(emailInput.props.accessibilityInvalid).toBe(false);

      // Trigger validation error
      fireEvent.changeText(emailInput, 'invalid');

      await waitFor(() => {
        expect(emailInput.props.accessibilityInvalid).toBe(true);
        expect(emailInput.props.accessibilityDescribedBy).toBe(
          'email-input-message'
        );
      });
    });

    it('supports screen reader announcements for validation changes', async () => {
      const { getByTestId } = renderWithTheme(<TestForm />);

      const emailInput = getByTestId('email-input').findByType('TextInput');

      // Trigger error
      fireEvent.changeText(emailInput, 'invalid');

      await waitFor(() => {
        // Verify that the error message is displayed with proper accessibility attributes
        const messageText = getByTestId('email-input-message-text');
        expect(messageText).toHaveTextContent(
          'Please enter a valid email address'
        );
        expect(messageText.props.accessibilityLiveRegion).toBe('polite');
      });
    });
  });

  describe('Complex Input Scenarios', () => {
    it('handles multiple validation states simultaneously', async () => {
      const { getByTestId } = renderWithTheme(<TestForm />);

      const emailInput = getByTestId('email-input').findByType('TextInput');
      const passwordInput =
        getByTestId('password-input').findByType('TextInput');

      // Set invalid values for both inputs
      fireEvent.changeText(emailInput, 'invalid');
      fireEvent.changeText(passwordInput, 'short');

      await waitFor(() => {
        expect(getByTestId('email-input-message-text')).toHaveTextContent(
          'Please enter a valid email address'
        );
        expect(getByTestId('password-input-message-text')).toHaveTextContent(
          'Password must be at least 8 characters'
        );
      });

      // Fix email, keep password invalid
      fireEvent.changeText(emailInput, 'valid@example.com');

      await waitFor(() => {
        expect(getByTestId('email-input-message-text')).toHaveTextContent(
          'Valid email address'
        );
        expect(getByTestId('password-input-message-text')).toHaveTextContent(
          'Password must be at least 8 characters'
        );
      });
    });

    it('handles rapid input changes without breaking', async () => {
      const { getByTestId } = renderWithTheme(<TestForm />);

      const emailInput = getByTestId('email-input').findByType('TextInput');

      // Rapidly change input values
      const values = [
        'a',
        'ab',
        'abc@',
        'abc@d',
        'abc@domain',
        'abc@domain.com',
      ];

      for (const value of values) {
        fireEvent.changeText(emailInput, value);
      }

      await waitFor(() => {
        expect(getByTestId('email-input-message')).toHaveTextContent(
          'Valid email address'
        );
      });
    });
  });

  describe('Performance Integration', () => {
    it('handles large amounts of text efficiently', () => {
      const largeText = 'a'.repeat(1000);

      const { getByTestId } = renderWithTheme(
        <Input
          value={largeText}
          maxLength={1000}
          showCharacterCount
          testID="large-input"
        />
      );

      expect(getByTestId('large-input-message')).toHaveTextContent('1000/1000');
    });

    it('handles frequent validation updates without performance issues', async () => {
      const { getByTestId } = renderWithTheme(<TestForm />);

      const emailInput = getByTestId('email-input').findByType('TextInput');

      // Simulate typing
      const email = 'test@example.com';
      for (let i = 1; i <= email.length; i++) {
        fireEvent.changeText(emailInput, email.substring(0, i));
      }

      await waitFor(() => {
        expect(getByTestId('email-input-message')).toHaveTextContent(
          'Valid email address'
        );
      });
    });
  });
});
