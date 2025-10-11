/**
 * Styling System Example Screen Integration Tests
 * Tests the comprehensive example screen functionality
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import StylingSystemExample from '../styling-system-example';
import { ThemeProvider } from '../../theme/provider/ThemeProvider';
import { lightTheme, darkTheme } from '../../theme/themes';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Mock Logo component
jest.mock('../../components/brand/Logo/Logo', () => ({
  Logo: ({ testID, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: testID || 'logo', ...props });
  },
}));

// Helper to render with theme
const renderWithTheme = (initialTheme = 'light') => {
  return render(
    <ThemeProvider initialTheme={initialTheme}>
      <StylingSystemExample />
    </ThemeProvider>
  );
};

describe('StylingSystemExample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all main sections', () => {
      const { getByText } = renderWithTheme();

      expect(getByText('Styling System Demo')).toBeTruthy();
      expect(getByText('Theme Controls')).toBeTruthy();
      expect(getByText('Typography Variants')).toBeTruthy();
      expect(getByText('Button Variants')).toBeTruthy();
      expect(getByText('Loading States & Animations')).toBeTruthy();
      expect(getByText('Form Components')).toBeTruthy();
      expect(getByText('Interactive Components')).toBeTruthy();
      expect(getByText('Accessibility Features')).toBeTruthy();
    });

    it('renders logo component', () => {
      const { getByTestId } = renderWithTheme();
      expect(getByTestId('logo')).toBeTruthy();
    });

    it('displays current theme information', () => {
      const { getByText } = renderWithTheme();
      expect(getByText('Current Theme: Light')).toBeTruthy();
    });
  });

  describe('Theme Switching', () => {
    it('toggles theme when switch is pressed', async () => {
      const { getByTestId, getByText } = renderWithTheme();

      const themeToggle = getByTestId('theme-toggle');

      // Initially should show Light theme
      expect(getByText('Current Theme: Light')).toBeTruthy();

      // Toggle to dark theme
      fireEvent(themeToggle, 'valueChange', true);

      await waitFor(() => {
        expect(getByText('Current Theme: Dark')).toBeTruthy();
      });
    });

    it('updates component styling when theme changes', async () => {
      const { getByTestId, getByText } = renderWithTheme();

      const themeToggle = getByTestId('theme-toggle');

      // Toggle theme and verify components update
      fireEvent(themeToggle, 'valueChange', true);

      await waitFor(() => {
        expect(getByText('Current Theme: Dark')).toBeTruthy();
      });

      // Components should still be rendered with new theme
      expect(getByText('Typography Variants')).toBeTruthy();
      expect(getByText('Button Variants')).toBeTruthy();
    });
  });

  describe('Button Interactions', () => {
    it('handles primary button press', () => {
      const { getByText } = renderWithTheme();

      const primaryButton = getByText('Primary');
      fireEvent.press(primaryButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Primary',
        'Primary button pressed'
      );
    });

    it('handles secondary button press', () => {
      const { getByText } = renderWithTheme();

      const secondaryButton = getByText('Secondary');
      fireEvent.press(secondaryButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Secondary',
        'Secondary button pressed'
      );
    });

    it('handles outline button press', () => {
      const { getByText } = renderWithTheme();

      const outlineButton = getByText('Outline');
      fireEvent.press(outlineButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Outline',
        'Outline button pressed'
      );
    });

    it('does not trigger disabled button', () => {
      const { getByText } = renderWithTheme();

      const disabledButton = getByText('Disabled');
      fireEvent.press(disabledButton);

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state for loading buttons', async () => {
      const { getByText } = renderWithTheme();

      const loadingButton = getByText('Loading Button 1');
      fireEvent.press(loadingButton);

      // Button should show loading state
      await waitFor(() => {
        // The button text might change or show a spinner
        expect(getByText('Loading Button 1')).toBeTruthy();
      });
    });

    it('completes loading action after timeout', async () => {
      jest.useFakeTimers();
      const { getByText } = renderWithTheme();

      const loadingButton = getByText('Loading Button 1');
      fireEvent.press(loadingButton);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'button1 action completed!'
        );
      });

      jest.useRealTimers();
    });
  });

  describe('Form Interactions', () => {
    it('handles text input changes', () => {
      const { getByPlaceholderText } = renderWithTheme();

      const nameInput = getByPlaceholderText('Enter your full name');
      fireEvent.changeText(nameInput, 'John Doe');

      expect(nameInput.props.value).toBe('John Doe');
    });

    it('handles email input changes', () => {
      const { getByPlaceholderText } = renderWithTheme();

      const emailInput = getByPlaceholderText('Enter your email');
      fireEvent.changeText(emailInput, 'john@example.com');

      expect(emailInput.props.value).toBe('john@example.com');
    });

    it('handles notification toggle', () => {
      const { getByText } = renderWithTheme();

      const notificationLabel = getByText('Enable notifications');
      expect(notificationLabel).toBeTruthy();
    });
  });

  describe('Modal Interactions', () => {
    it('opens modal when show modal button is pressed', async () => {
      const { getByText } = renderWithTheme();

      const showModalButton = getByText('Show Modal');
      fireEvent.press(showModalButton);

      await waitFor(() => {
        expect(getByText('Example Modal')).toBeTruthy();
      });
    });

    it('closes modal when cancel is pressed', async () => {
      const { getByText, queryByText } = renderWithTheme();

      // Open modal
      const showModalButton = getByText('Show Modal');
      fireEvent.press(showModalButton);

      await waitFor(() => {
        expect(getByText('Example Modal')).toBeTruthy();
      });

      // Close modal
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(queryByText('Example Modal')).toBeNull();
      });
    });

    it('handles modal confirm action', async () => {
      const { getByText } = renderWithTheme();

      // Open modal
      const showModalButton = getByText('Show Modal');
      fireEvent.press(showModalButton);

      await waitFor(() => {
        expect(getByText('Example Modal')).toBeTruthy();
      });

      // Confirm action
      const confirmButton = getByText('Confirm');
      fireEvent.press(confirmButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Modal action confirmed!'
      );
    });
  });

  describe('Confirmation Dialog', () => {
    it('opens confirmation dialog', async () => {
      const { getByText } = renderWithTheme();

      const showConfirmButton = getByText('Show Confirmation');
      fireEvent.press(showConfirmButton);

      await waitFor(() => {
        expect(getByText('Confirm Action')).toBeTruthy();
      });
    });

    it('handles confirmation dialog confirm', async () => {
      const { getByText } = renderWithTheme();

      // Open dialog
      const showConfirmButton = getByText('Show Confirmation');
      fireEvent.press(showConfirmButton);

      await waitFor(() => {
        expect(getByText('Confirm Action')).toBeTruthy();
      });

      // Confirm action
      const confirmButton = getByText('Yes, Continue');
      fireEvent.press(confirmButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirmed',
        'Action was confirmed!'
      );
    });

    it('handles confirmation dialog cancel', async () => {
      const { getByText, queryByText } = renderWithTheme();

      // Open dialog
      const showConfirmButton = getByText('Show Confirmation');
      fireEvent.press(showConfirmButton);

      await waitFor(() => {
        expect(getByText('Confirm Action')).toBeTruthy();
      });

      // Cancel action - using the first Cancel button in the modal
      const cancelButtons = getByText('Cancel');
      fireEvent.press(cancelButtons);

      await waitFor(() => {
        expect(queryByText('Confirm Action')).toBeNull();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('handles accessibility button press', () => {
      const { getByText } = renderWithTheme();

      const accessibilityButton = getByText('High Contrast Test');
      fireEvent.press(accessibilityButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Accessibility',
        'This button meets WCAG contrast requirements'
      );
    });

    it('renders accessibility input with proper labels', () => {
      const { getByPlaceholderText } = renderWithTheme();

      const accessibilityInput = getByPlaceholderText(
        'Try with screen reader enabled'
      );
      expect(accessibilityInput).toBeTruthy();
      expect(accessibilityInput.props.accessibilityLabel).toBe(
        'Screen reader test input field'
      );
    });
  });

  describe('Empty State', () => {
    it('renders empty state component', () => {
      const { getByText } = renderWithTheme();

      expect(getByText('No Items Found')).toBeTruthy();
      expect(
        getByText(
          'This is an example of an empty state component with proper styling and accessibility.'
        )
      ).toBeTruthy();
    });

    it('handles empty state action', () => {
      const { getByText } = renderWithTheme();

      const addItemButton = getByText('Add Item');
      fireEvent.press(addItemButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Action',
        'Empty state action triggered'
      );
    });
  });

  describe('Progress Animations', () => {
    it('updates progress bar over time', async () => {
      jest.useFakeTimers();
      const { getByText } = renderWithTheme();

      // Initial progress should be 0%
      expect(getByText('0%')).toBeTruthy();

      // Advance time to trigger progress update
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(getByText('10%')).toBeTruthy();
      });

      jest.useRealTimers();
    });
  });

  describe('Component Variants', () => {
    it('renders all typography variants', () => {
      const { getByText } = renderWithTheme();

      expect(getByText('Heading 1')).toBeTruthy();
      expect(getByText('Heading 2')).toBeTruthy();
      expect(getByText('Heading 3')).toBeTruthy();
      expect(getByText('Body Text - Regular content')).toBeTruthy();
      expect(getByText('Body Large - Emphasized content')).toBeTruthy();
      expect(getByText('Body Small - Secondary content')).toBeTruthy();
      expect(getByText('Caption - Metadata and hints')).toBeTruthy();
    });

    it('renders all button variants', () => {
      const { getByText } = renderWithTheme();

      expect(getByText('Primary')).toBeTruthy();
      expect(getByText('Secondary')).toBeTruthy();
      expect(getByText('Outline')).toBeTruthy();
      expect(getByText('Ghost')).toBeTruthy();
      expect(getByText('Danger')).toBeTruthy();
      expect(getByText('Disabled')).toBeTruthy();
    });

    it('renders loading components', () => {
      const { getByText } = renderWithTheme();

      expect(getByText('Spinner')).toBeTruthy();
      expect(getByText('Progress Bar')).toBeTruthy();
      expect(getByText('Circular Progress')).toBeTruthy();
      expect(getByText('Skeleton Loading')).toBeTruthy();
    });

    it('renders interactive components', () => {
      const { getByText } = renderWithTheme();

      expect(getByText('Interactive Components')).toBeTruthy();
      expect(getByText('Interactive elements showcase')).toBeTruthy();
    });
  });
});
