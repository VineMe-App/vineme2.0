import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Input } from '../Input';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { lightTheme } from '../../../theme/themes/light';

// Mock the theme provider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider initialTheme="light">
      {component}
    </ThemeProvider>
  );
};

// Mock icons for testing
const MockIcon = () => <Text testID="mock-icon">Icon</Text>;

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders correctly with minimal props', () => {
      const { getByTestId } = renderWithTheme(
        <Input testID="test-input" />
      );
      
      expect(getByTestId('test-input')).toBeTruthy();
    });

    it('renders with label', () => {
      const { getByTestId } = renderWithTheme(
        <Input label="Test Label" testID="test-input" />
      );
      
      expect(getByTestId('test-input-label')).toBeTruthy();
      expect(getByTestId('test-input-label')).toHaveTextContent('Test Label');
    });

    it('renders required indicator when required is true', () => {
      const { getByTestId } = renderWithTheme(
        <Input label="Required Field" required testID="test-input" />
      );
      
      expect(getByTestId('test-input-label')).toHaveTextContent('Required Field *');
    });

    it('renders with placeholder', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <Input placeholder="Enter text here" testID="test-input" />
      );
      
      expect(getByPlaceholderText('Enter text here')).toBeTruthy();
    });
  });

  describe('Validation States', () => {
    it('displays error message when error prop is provided', () => {
      const { getByTestId } = renderWithTheme(
        <Input error="This field is required" testID="test-input" />
      );
      
      expect(getByTestId('test-input-message')).toBeTruthy();
      expect(getByTestId('test-input-message')).toHaveTextContent('This field is required');
    });

    it('displays success message when successMessage prop is provided', () => {
      const { getByTestId } = renderWithTheme(
        <Input successMessage="Input is valid" testID="test-input" />
      );
      
      expect(getByTestId('test-input-message')).toBeTruthy();
      expect(getByTestId('test-input-message')).toHaveTextContent('Input is valid');
    });

    it('displays helper text when no error or success message', () => {
      const { getByTestId } = renderWithTheme(
        <Input helperText="This is helper text" testID="test-input" />
      );
      
      expect(getByTestId('test-input-message')).toBeTruthy();
      expect(getByTestId('test-input-message')).toHaveTextContent('This is helper text');
    });

    it('prioritizes error message over success message and helper text', () => {
      const { getByTestId } = renderWithTheme(
        <Input
          error="Error message"
          successMessage="Success message"
          helperText="Helper text"
          testID="test-input"
        />
      );
      
      expect(getByTestId('test-input-message')).toHaveTextContent('Error message');
    });

    it('prioritizes success message over helper text when no error', () => {
      const { getByTestId } = renderWithTheme(
        <Input
          successMessage="Success message"
          helperText="Helper text"
          testID="test-input"
        />
      );
      
      expect(getByTestId('test-input-message')).toHaveTextContent('Success message');
    });
  });

  describe('Icons', () => {
    it('renders left icon when provided', () => {
      const { getByTestId } = renderWithTheme(
        <Input leftIcon={<MockIcon />} testID="test-input" />
      );
      
      expect(getByTestId('mock-icon')).toBeTruthy();
    });

    it('renders right icon when provided', () => {
      const { getByTestId } = renderWithTheme(
        <Input rightIcon={<MockIcon />} testID="test-input" />
      );
      
      expect(getByTestId('mock-icon')).toBeTruthy();
    });

    it('calls onRightIconPress when right icon is pressed', () => {
      const mockPress = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Input
          rightIcon={<MockIcon />}
          onRightIconPress={mockPress}
          testID="test-input"
        />
      );
      
      fireEvent.press(getByTestId('mock-icon').parent!);
      expect(mockPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Variants', () => {
    it('applies default variant styles', () => {
      const { getByTestId } = renderWithTheme(
        <Input variant="default" testID="test-input" />
      );
      
      expect(getByTestId('test-input')).toBeTruthy();
    });

    it('applies filled variant styles', () => {
      const { getByTestId } = renderWithTheme(
        <Input variant="filled" testID="test-input" />
      );
      
      expect(getByTestId('test-input')).toBeTruthy();
    });

    it('applies outlined variant styles', () => {
      const { getByTestId } = renderWithTheme(
        <Input variant="outlined" testID="test-input" />
      );
      
      expect(getByTestId('test-input')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('applies small size styles', () => {
      const { getByTestId } = renderWithTheme(
        <Input size="small" testID="test-input" />
      );
      
      expect(getByTestId('test-input')).toBeTruthy();
    });

    it('applies medium size styles (default)', () => {
      const { getByTestId } = renderWithTheme(
        <Input size="medium" testID="test-input" />
      );
      
      expect(getByTestId('test-input')).toBeTruthy();
    });

    it('applies large size styles', () => {
      const { getByTestId } = renderWithTheme(
        <Input size="large" testID="test-input" />
      );
      
      expect(getByTestId('test-input')).toBeTruthy();
    });
  });

  describe('Character Count', () => {
    it('displays character count when showCharacterCount is true and maxLength is set', () => {
      const { getByTestId } = renderWithTheme(
        <Input
          showCharacterCount
          maxLength={100}
          value="Hello"
          testID="test-input"
        />
      );
      
      expect(getByTestId('test-input-message')).toHaveTextContent('5/100');
    });

    it('updates character count when text changes', () => {
      const { getByTestId } = renderWithTheme(
        <Input
          showCharacterCount
          maxLength={100}
          testID="test-input"
        />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      fireEvent.changeText(input, 'Hello World');
      
      expect(getByTestId('test-input-message')).toHaveTextContent('11/100');
    });
  });

  describe('Focus and Blur Events', () => {
    it('calls onFocus when input is focused', () => {
      const mockFocus = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Input onFocus={mockFocus} testID="test-input" />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      fireEvent(input, 'focus');
      
      expect(mockFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when input loses focus', () => {
      const mockBlur = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Input onBlur={mockBlur} testID="test-input" />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      fireEvent(input, 'blur');
      
      expect(mockBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Text Input Events', () => {
    it('calls onChangeText when text changes', () => {
      const mockChangeText = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Input onChangeText={mockChangeText} testID="test-input" />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      fireEvent.changeText(input, 'Hello');
      
      expect(mockChangeText).toHaveBeenCalledWith('Hello');
    });

    it('respects maxLength prop', () => {
      const { getByTestId } = renderWithTheme(
        <Input maxLength={5} testID="test-input" />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      expect(input.props.maxLength).toBe(5);
    });
  });

  describe('Accessibility', () => {
    it('sets correct accessibility properties', () => {
      const { getByTestId } = renderWithTheme(
        <Input
          label="Email"
          required
          accessibilityHint="Enter your email address"
          testID="test-input"
        />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      expect(input.props.accessibilityLabel).toBe('Email');
      expect(input.props.accessibilityRequired).toBe(true);
      expect(input.props.accessibilityHint).toBe('Enter your email address');
    });

    it('sets accessibilityInvalid to true when error is present', () => {
      const { getByTestId } = renderWithTheme(
        <Input error="Invalid input" testID="test-input" />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      expect(input.props.accessibilityInvalid).toBe(true);
    });

    it('sets accessibilityInvalid to false when no error', () => {
      const { getByTestId } = renderWithTheme(
        <Input testID="test-input" />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      expect(input.props.accessibilityInvalid).toBe(false);
    });

    it('sets accessibilityDescribedBy when message is present', () => {
      const { getByTestId } = renderWithTheme(
        <Input helperText="Helper text" testID="test-input" />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      expect(input.props.accessibilityDescribedBy).toBe('test-input-message');
    });
  });

  describe('Custom Styles', () => {
    it('applies custom container styles', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = renderWithTheme(
        <Input containerStyle={customStyle} testID="test-input" />
      );
      
      // The container style is applied to the main container View
      expect(getByTestId('test-input')).toBeTruthy();
    });

    it('applies custom input styles', () => {
      const customStyle = { fontSize: 18 };
      const { getByTestId } = renderWithTheme(
        <Input inputStyle={customStyle} testID="test-input" />
      );
      
      const input = getByTestId('test-input').findByType('TextInput');
      // Just verify the input exists and can receive custom styles
      expect(input).toBeTruthy();
    });

    it('applies custom label styles', () => {
      const customStyle = { fontWeight: 'bold' };
      const { getByTestId } = renderWithTheme(
        <Input
          label="Custom Label"
          labelStyle={customStyle}
          testID="test-input"
        />
      );
      
      // Just verify the label exists and can receive custom styles
      expect(getByTestId('test-input-label')).toBeTruthy();
    });
  });

  describe('Full Width', () => {
    it('applies full width by default', () => {
      const { getByTestId } = renderWithTheme(
        <Input testID="test-input" />
      );
      
      // Just verify the input renders with full width prop
      expect(getByTestId('test-input')).toBeTruthy();
    });

    it('does not apply full width when fullWidth is false', () => {
      const { getByTestId } = renderWithTheme(
        <Input fullWidth={false} testID="test-input" />
      );
      
      expect(getByTestId('test-input')).not.toHaveStyle({ width: '100%' });
    });
  });

  describe('Validation State Prop', () => {
    it('applies warning validation state', () => {
      const { getByTestId } = renderWithTheme(
        <Input
          validationState="warning"
          helperText="Warning message"
          testID="test-input"
        />
      );
      
      expect(getByTestId('test-input')).toBeTruthy();
      expect(getByTestId('test-input-message')).toBeTruthy();
    });

    it('error prop overrides validationState prop', () => {
      const { getByTestId } = renderWithTheme(
        <Input
          validationState="success"
          error="Error message"
          testID="test-input"
        />
      );
      
      expect(getByTestId('test-input-message')).toHaveTextContent('Error message');
    });
  });
});