/**
 * Backdrop Component Tests
 * Tests for the Backdrop component functionality and styling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Backdrop } from '../Backdrop';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';

// Mock Animated
const mockAnimatedValue = {
  setValue: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockAnimatedTiming = {
  start: jest.fn(),
};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      Value: jest.fn(() => mockAnimatedValue),
      timing: jest.fn(() => mockAnimatedTiming),
      parallel: jest.fn(() => mockAnimatedTiming),
      View: RN.View,
    },
  };
});

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider initialTheme="light">{children}</ThemeProvider>
);

describe('Backdrop Component', () => {
  const mockOnPress = jest.fn();
  const defaultProps = {
    isVisible: true,
    onPress: mockOnPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} testID="backdrop">
            <Text>Backdrop Content</Text>
          </Backdrop>
        </TestWrapper>
      );

      expect(getByTestId('backdrop')).toBeTruthy();
    });

    it('does not render when not visible with fade animation', () => {
      const { queryByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} isVisible={false} testID="backdrop">
            <Text>Backdrop Content</Text>
          </Backdrop>
        </TestWrapper>
      );

      expect(queryByTestId('backdrop')).toBeNull();
    });

    it('renders when not visible with none animation', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop
            {...defaultProps}
            isVisible={false}
            animationType="none"
            testID="backdrop"
          >
            <Text>Backdrop Content</Text>
          </Backdrop>
        </TestWrapper>
      );

      expect(getByTestId('backdrop')).toBeTruthy();
    });

    it('renders children when provided', () => {
      const { getByText } = render(
        <TestWrapper>
          <Backdrop {...defaultProps}>
            <Text>Test Content</Text>
          </Backdrop>
        </TestWrapper>
      );

      expect(getByText('Test Content')).toBeTruthy();
    });

    it('renders without children', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} testID="backdrop" />
        </TestWrapper>
      );

      expect(getByTestId('backdrop')).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    it('calls onPress when backdrop is pressed', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} testID="backdrop" />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('backdrop'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} disabled={true} testID="backdrop" />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('backdrop'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when onPress is not provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop isVisible={true} testID="backdrop" />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('backdrop'));
      // Should not throw error
    });
  });

  describe('Animation Types', () => {
    it('handles fade animation type', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} animationType="fade" testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop).toBeTruthy();
    });

    it('handles none animation type', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} animationType="none" testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop).toBeTruthy();
    });
  });

  describe('Styling Props', () => {
    it('applies custom opacity', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} opacity={0.8} testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop).toBeTruthy();
    });

    it('applies custom color', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop
            {...defaultProps}
            color="rgba(255, 0, 0, 0.5)"
            testID="backdrop"
          />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop).toBeTruthy();
    });

    it('applies custom zIndex', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} zIndex={2000} testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop).toBeTruthy();
    });

    it('applies blur effect when enabled', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} blur={true} testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop).toBeTruthy();
    });

    it('applies custom style', () => {
      const customStyle = { borderWidth: 1 };
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} style={customStyle} testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });
  });

  describe('Animation Duration', () => {
    it('uses custom animation duration', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop
            {...defaultProps}
            animationDuration={500}
            testID="backdrop"
          />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop).toBeTruthy();
    });

    it('uses default animation duration when not provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      expect(backdrop).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('handles disabled state correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} disabled={true} testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      fireEvent.press(backdrop);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('handles enabled state correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} disabled={false} testID="backdrop" />
        </TestWrapper>
      );

      const backdrop = getByTestId('backdrop');
      fireEvent.press(backdrop);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('TestID', () => {
    it('applies testID correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Backdrop {...defaultProps} testID="custom-backdrop" />
        </TestWrapper>
      );

      expect(getByTestId('custom-backdrop')).toBeTruthy();
    });
  });
});
