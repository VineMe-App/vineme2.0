/**
 * Button Integration Tests
 * Tests the Button component integration with the theme system
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from '../Button';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';

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

describe('Button Integration Tests', () => {
  const TestIcon = () => <Text>🔥</Text>;

  describe('Theme Integration', () => {
    it('renders correctly with light theme', () => {
      const { getByText, getByRole } = render(
        <ThemeProvider initialTheme="light">
          <Button title="Test Button" onPress={() => {}} />
        </ThemeProvider>
      );

      expect(getByText('Test Button')).toBeTruthy();
      expect(getByRole('button')).toBeTruthy();
    });

    it('renders correctly with dark theme', () => {
      const { getByText, getByRole } = render(
        <ThemeProvider initialTheme="dark">
          <Button title="Test Button" onPress={() => {}} />
        </ThemeProvider>
      );

      expect(getByText('Test Button')).toBeTruthy();
      expect(getByRole('button')).toBeTruthy();
    });

    it('handles all variants with theme', () => {
      const variants = [
        'primary',
        'secondary',
        'success',
        'warning',
        'error',
        'info',
        'ghost',
        'outline',
      ] as const;

      variants.forEach((variant) => {
        const { getByRole } = render(
          <ThemeProvider initialTheme="light">
            <Button
              title={`${variant} Button`}
              variant={variant}
              onPress={() => {}}
            />
          </ThemeProvider>
        );

        expect(getByRole('button')).toBeTruthy();
      });
    });
  });

  describe('Icon Integration', () => {
    it('renders with icon and integrates with theme', () => {
      const { getByText } = render(
        <ThemeProvider initialTheme="light">
          <Button title="Icon Button" icon={<TestIcon />} onPress={() => {}} />
        </ThemeProvider>
      );

      expect(getByText('Icon Button')).toBeTruthy();
      expect(getByText('🔥')).toBeTruthy();
    });

    it('renders with right icon and integrates with theme', () => {
      const { getByText } = render(
        <ThemeProvider initialTheme="light">
          <Button
            title="Icon Button"
            iconRight={<TestIcon />}
            onPress={() => {}}
          />
        </ThemeProvider>
      );

      expect(getByText('Icon Button')).toBeTruthy();
      expect(getByText('🔥')).toBeTruthy();
    });
  });

  describe('Loading Integration', () => {
    it('renders loading state with theme integration', () => {
      const { getByText } = render(
        <ThemeProvider initialTheme="light">
          <Button title="Loading Button" loading onPress={() => {}} />
        </ThemeProvider>
      );

      expect(getByText('Loading Spinner')).toBeTruthy();
    });

    it('renders different loading variants with theme', () => {
      const variants = ['circular', 'dots', 'pulse', 'bars'] as const;

      variants.forEach((variant) => {
        const { getByText } = render(
          <ThemeProvider initialTheme="light">
            <Button
              title="Loading Button"
              loading
              loadingVariant={variant}
              onPress={() => {}}
            />
          </ThemeProvider>
        );

        expect(getByText('Loading Spinner')).toBeTruthy();
      });
    });
  });

  describe('Interaction Integration', () => {
    it('handles press events correctly with theme', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <ThemeProvider initialTheme="light">
          <Button title="Interactive Button" onPress={onPress} />
        </ThemeProvider>
      );

      const button = getByRole('button');
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('handles disabled state correctly with theme', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <ThemeProvider initialTheme="light">
          <Button title="Disabled Button" disabled onPress={onPress} />
        </ThemeProvider>
      );

      const button = getByRole('button');
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility with theme integration', () => {
      const { getByRole, getByLabelText } = render(
        <ThemeProvider initialTheme="light">
          <Button
            title="Accessible Button"
            accessibilityLabel="Custom accessible button"
            accessibilityHint="Tap to perform action"
            onPress={() => {}}
          />
        </ThemeProvider>
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
      expect(button.props.accessibilityHint).toBe('Tap to perform action');
      expect(getByLabelText('Custom accessible button')).toBeTruthy();
    });

    it('handles accessibility states correctly with theme', () => {
      const { getByRole } = render(
        <ThemeProvider initialTheme="light">
          <Button title="Loading Button" loading disabled onPress={() => {}} />
        </ThemeProvider>
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
      expect(button.props.accessibilityState.busy).toBe(true);
    });
  });

  describe('Full Width Integration', () => {
    it('renders full width correctly with theme', () => {
      const { getByRole } = render(
        <ThemeProvider initialTheme="light">
          <Button title="Full Width Button" fullWidth onPress={() => {}} />
        </ThemeProvider>
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });

  describe('Custom Styling Integration', () => {
    it('applies custom styles while maintaining theme integration', () => {
      const customStyle = { backgroundColor: 'red' };
      const customTextStyle = { color: 'blue' };

      const { getByRole, getByText } = render(
        <ThemeProvider initialTheme="light">
          <Button
            title="Custom Styled Button"
            style={customStyle}
            textStyle={customTextStyle}
            onPress={() => {}}
          />
        </ThemeProvider>
      );

      expect(getByRole('button')).toBeTruthy();
      expect(getByText('Custom Styled Button')).toBeTruthy();
    });
  });
});
