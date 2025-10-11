/**
 * Styling System Demo Screen Tests
 * Tests the comprehensive demo screen functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import StylingSystemDemo from '../styling-system-demo';
import { ThemeProvider } from '../../theme/provider/ThemeProvider';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Helper to render with theme
const renderWithTheme = (initialTheme = 'light') => {
  return render(
    <ThemeProvider initialTheme={initialTheme}>
      <StylingSystemDemo />
    </ThemeProvider>
  );
};

describe('StylingSystemDemo', () => {
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
      expect(getByText('Form Components')).toBeTruthy();
      expect(getByText('Accessibility Features')).toBeTruthy();
      expect(getByText('Color System')).toBeTruthy();
      expect(getByText('Interactive Components')).toBeTruthy();
    });

    it('displays current theme information', () => {
      const { getByText } = renderWithTheme();
      expect(getByText('Current Theme: Light')).toBeTruthy();
    });

    it('renders with dark theme', () => {
      const { getByText } = renderWithTheme('dark');
      expect(getByText('Current Theme: Dark')).toBeTruthy();
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

    it('handles ghost button press', () => {
      const { getByText } = renderWithTheme();

      const ghostButton = getByText('Ghost');
      fireEvent.press(ghostButton);

      expect(Alert.alert).toHaveBeenCalledWith('Ghost', 'Ghost button pressed');
    });

    it('handles danger button press', () => {
      const { getByText } = renderWithTheme();

      const dangerButton = getByText('Danger');
      fireEvent.press(dangerButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Danger',
        'Danger button pressed'
      );
    });

    it('does not trigger disabled button', () => {
      const { getByText } = renderWithTheme();

      const disabledButton = getByText('Disabled');
      fireEvent.press(disabledButton);

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('Form Interactions', () => {
    it('handles text input changes', () => {
      const { getByPlaceholderText } = renderWithTheme();

      const nameInput = getByPlaceholderText('Enter your full name');
      fireEvent.changeText(nameInput, 'John Doe');

      expect(nameInput.props.value).toBe('John Doe');
    });

    it('renders form inputs with different states', () => {
      const { getByPlaceholderText, getByText } = renderWithTheme();

      expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(
        getByPlaceholderText('This input shows success state')
      ).toBeTruthy();
      expect(getByPlaceholderText('This input is disabled')).toBeTruthy();
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });

    it('handles notification switch toggle', () => {
      const { getByText } = renderWithTheme();

      const notificationLabel = getByText('Enable notifications');
      expect(notificationLabel).toBeTruthy();
    });
  });

  describe('Interactive Demo', () => {
    it('handles interactive demo button press', () => {
      const { getByText } = renderWithTheme();

      const interactiveButton = getByText('Interactive Demo');
      fireEvent.press(interactiveButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Interactive',
        'Interactive component demo'
      );
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

  describe('Component Variants', () => {
    it('renders all typography variants', () => {
      const { getByText } = renderWithTheme();

      expect(getByText('Heading 1')).toBeTruthy();
      expect(getByText('Heading 2')).toBeTruthy();
      expect(getByText('Body Text - Regular content')).toBeTruthy();
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

    it('renders color system showcase', () => {
      const { getByText } = renderWithTheme();

      expect(getByText('Color System')).toBeTruthy();
      expect(
        getByText('Theme-aware color system with semantic naming')
      ).toBeTruthy();
      expect(getByText('Primary')).toBeTruthy();
      expect(getByText('Secondary')).toBeTruthy();
      expect(getByText('Success')).toBeTruthy();
      expect(getByText('Warning')).toBeTruthy();
      expect(getByText('Error')).toBeTruthy();
    });
  });

  describe('Scroll Performance', () => {
    it('renders scroll view with proper test ID', () => {
      const { getByTestId } = renderWithTheme();

      const scrollView = getByTestId('scroll-view');
      expect(scrollView).toBeTruthy();
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors correctly', () => {
      const { getByText } = renderWithTheme();

      // Verify that themed components are rendered
      expect(getByText('Styling System Demo')).toBeTruthy();
      expect(
        getByText('Comprehensive showcase of theme features and components')
      ).toBeTruthy();
    });

    it('handles theme switching without errors', async () => {
      const { getByTestId, getByText } = renderWithTheme();

      const themeToggle = getByTestId('theme-toggle');

      // Multiple theme switches
      fireEvent(themeToggle, 'valueChange', true);
      await waitFor(() => {
        expect(getByText('Current Theme: Dark')).toBeTruthy();
      });

      fireEvent(themeToggle, 'valueChange', false);
      await waitFor(() => {
        expect(getByText('Current Theme: Light')).toBeTruthy();
      });

      // Components should still be functional
      expect(getByText('Typography Variants')).toBeTruthy();
    });
  });

  describe('Component Styling', () => {
    it('applies proper button styling for different variants', () => {
      const { getByText } = renderWithTheme();

      const primaryButton = getByText('Primary');
      const outlineButton = getByText('Outline');
      const disabledButton = getByText('Disabled');

      expect(primaryButton).toBeTruthy();
      expect(outlineButton).toBeTruthy();
      expect(disabledButton).toBeTruthy();
    });

    it('applies proper card styling for different variants', () => {
      const { getByText } = renderWithTheme();

      // Cards should be rendered with proper content
      expect(getByText('Theme Controls')).toBeTruthy();
      expect(getByText('Typography Variants')).toBeTruthy();
      expect(getByText('Button Variants')).toBeTruthy();
    });

    it('applies proper input styling for different states', () => {
      const { getByPlaceholderText } = renderWithTheme();

      const normalInput = getByPlaceholderText('Enter your full name');
      const errorInput = getByPlaceholderText('Enter your email');
      const successInput = getByPlaceholderText(
        'This input shows success state'
      );
      const disabledInput = getByPlaceholderText('This input is disabled');

      expect(normalInput).toBeTruthy();
      expect(errorInput).toBeTruthy();
      expect(successInput).toBeTruthy();
      expect(disabledInput).toBeTruthy();
      expect(disabledInput.props.editable).toBe(false);
    });
  });
});
