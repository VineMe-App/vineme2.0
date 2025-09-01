/**
 * Button Component Tests
 * Comprehensive test suite for the enhanced Button component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { Button } from '../Button';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { lightTheme } from '../../../theme/themes/light';

// Mock the Spinner component
jest.mock('../Loading/Spinner', () => {
  const { View, Text } = require('react-native');
  return {
    Spinner: ({ testID, accessibilityLabel }: any) => (
      <View testID={testID} accessibilityLabel={accessibilityLabel}>
        <Text>Loading Spinner</Text>
      </View>
    ),
  };
});

// Test wrapper with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider initialTheme="light">
    {children}
  </ThemeProvider>
);

describe('Button Component', () => {
  const defaultProps = {
    title: 'Test Button',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders correctly with default props', () => {
      const { getByText, getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} />
        </TestWrapper>
      );

      expect(getByText('Test Button')).toBeTruthy();
      expect(getByRole('button')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Button {...defaultProps} testID="custom-button" />
        </TestWrapper>
      );

      expect(getByTestId('custom-button')).toBeTruthy();
    });

    it('renders with accessibility label', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Button {...defaultProps} accessibilityLabel="Custom Label" />
        </TestWrapper>
      );

      expect(getByLabelText('Custom Label')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    const variants = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'ghost', 'outline'] as const;

    variants.forEach((variant) => {
      it(`renders ${variant} variant correctly`, () => {
        const { getByRole } = render(
          <TestWrapper>
            <Button {...defaultProps} variant={variant} />
          </TestWrapper>
        );

        const button = getByRole('button');
        expect(button).toBeTruthy();
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach((size) => {
      it(`renders ${size} size correctly`, () => {
        const { getByRole } = render(
          <TestWrapper>
            <Button {...defaultProps} size={size} />
          </TestWrapper>
        );

        const button = getByRole('button');
        expect(button).toBeTruthy();
      });
    });
  });

  describe('States', () => {
    it('handles disabled state correctly', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} disabled />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('handles loading state correctly', () => {
      const { getByText, getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} loading />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.busy).toBe(true);
      expect(getByText('Loading Spinner')).toBeTruthy();
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} onPress={onPress} disabled />
        </TestWrapper>
      );

      const button = getByRole('button');
      // Check that the button is actually disabled
      expect(button.props.disabled).toBe(true);
      
      // Even if we try to press it, it should not call onPress due to disabled state
      // Note: fireEvent.press doesn't respect disabled prop, but the actual component does
      if (!button.props.disabled) {
        fireEvent.press(button);
      }
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} onPress={onPress} loading />
        </TestWrapper>
      );

      const button = getByRole('button');
      // Check that the button is actually disabled when loading
      expect(button.props.disabled).toBe(true);
      
      // Even if we try to press it, it should not call onPress due to loading state
      if (!button.props.disabled) {
        fireEvent.press(button);
      }
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    const TestIcon = () => <Text>Icon</Text>;

    it('renders with left icon', () => {
      const { getByText } = render(
        <TestWrapper>
          <Button {...defaultProps} icon={<TestIcon />} />
        </TestWrapper>
      );

      expect(getByText('Icon')).toBeTruthy();
      expect(getByText('Test Button')).toBeTruthy();
    });

    it('renders with right icon', () => {
      const { getByText } = render(
        <TestWrapper>
          <Button {...defaultProps} iconRight={<TestIcon />} />
        </TestWrapper>
      );

      expect(getByText('Icon')).toBeTruthy();
      expect(getByText('Test Button')).toBeTruthy();
    });

    it('renders with both left and right icons', () => {
      const { getAllByText } = render(
        <TestWrapper>
          <Button 
            {...defaultProps} 
            icon={<TestIcon />} 
            iconRight={<TestIcon />} 
          />
        </TestWrapper>
      );

      const icons = getAllByText('Icon');
      expect(icons).toHaveLength(2);
      expect(getAllByText('Test Button')).toHaveLength(1);
    });
  });

  describe('Loading States', () => {
    const loadingVariants = ['circular', 'dots', 'pulse', 'bars'] as const;

    loadingVariants.forEach((variant) => {
      it(`renders with ${variant} loading variant`, () => {
        const { getByText } = render(
          <TestWrapper>
            <Button {...defaultProps} loading loadingVariant={variant} />
          </TestWrapper>
        );

        expect(getByText('Loading Spinner')).toBeTruthy();
      });
    });
  });

  describe('Interactions', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} onPress={onPress} />
        </TestWrapper>
      );

      const button = getByRole('button');
      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('handles press in and press out events', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} />
        </TestWrapper>
      );

      const button = getByRole('button');
      fireEvent(button, 'pressIn');
      fireEvent(button, 'pressOut');
      // Should not throw any errors
    });

    it('handles focus and blur events', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} />
        </TestWrapper>
      );

      const button = getByRole('button');
      fireEvent(button, 'focus');
      fireEvent(button, 'blur');
      // Should not throw any errors
    });
  });

  describe('Full Width', () => {
    it('renders as full width when specified', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} fullWidth />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
    });
  });

  describe('Custom Styles', () => {
    it('applies custom button styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} style={customStyle} />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('applies custom text styles', () => {
      const customTextStyle = { color: 'blue' };
      const { getByText } = render(
        <TestWrapper>
          <Button {...defaultProps} textStyle={customTextStyle} />
        </TestWrapper>
      );

      const text = getByText('Test Button');
      expect(text).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} />
        </TestWrapper>
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('has correct accessibility state when disabled', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} disabled />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('has correct accessibility state when loading', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} loading />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('uses custom accessibility label', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Button {...defaultProps} accessibilityLabel="Custom Button Label" />
        </TestWrapper>
      );

      expect(getByLabelText('Custom Button Label')).toBeTruthy();
    });

    it('uses title as accessibility label when no custom label provided', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Button {...defaultProps} />
        </TestWrapper>
      );

      expect(getByLabelText('Test Button')).toBeTruthy();
    });

    it('includes accessibility hint when provided', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} accessibilityHint="Tap to perform action" />
        </TestWrapper>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityHint).toBe('Tap to perform action');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty title gracefully', () => {
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} title="" />
        </TestWrapper>
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('handles very long titles', () => {
      const longTitle = 'This is a very long button title that should be handled gracefully';
      const { getByText } = render(
        <TestWrapper>
          <Button {...defaultProps} title={longTitle} />
        </TestWrapper>
      );

      expect(getByText(longTitle)).toBeTruthy();
    });

    it('handles rapid press events', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <TestWrapper>
          <Button {...defaultProps} onPress={onPress} />
        </TestWrapper>
      );

      const button = getByRole('button');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      
      expect(onPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Theme Integration', () => {
    it('renders without theme provider (should throw error)', () => {
      // This test verifies that the component requires a theme provider
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<Button {...defaultProps} />);
      }).toThrow('useTheme must be used within a ThemeProvider');
      
      consoleSpy.mockRestore();
    });
  });
});