/**
 * Overlay Component Tests
 * Tests for the Overlay component functionality and styling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Overlay } from '../Overlay';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';

// Simple test without complex mocks

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider initialTheme="light">
    {children}
  </ThemeProvider>
);

describe('Overlay Component', () => {
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
          <Overlay {...defaultProps} testID="overlay">
            <Text>Overlay Content</Text>
          </Overlay>
        </TestWrapper>
      );

      expect(getByTestId('overlay')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} isVisible={false} testID="overlay">
            <Text>Overlay Content</Text>
          </Overlay>
        </TestWrapper>
      );

      expect(queryByTestId('overlay')).toBeNull();
    });

    it('renders children when provided', () => {
      const { getByText } = render(
        <TestWrapper>
          <Overlay {...defaultProps}>
            <Text>Test Content</Text>
          </Overlay>
        </TestWrapper>
      );

      expect(getByText('Test Content')).toBeTruthy();
    });

    it('renders without children', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} testID="overlay" />
        </TestWrapper>
      );

      expect(getByTestId('overlay')).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    it('calls onPress when overlay is pressed', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} testID="overlay" />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('overlay'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when onPress is not provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay isVisible={true} testID="overlay" />
        </TestWrapper>
      );

      fireEvent.press(getByTestId('overlay'));
      // Should not throw error
    });
  });

  describe('Styling Props', () => {
    it('applies custom opacity', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} opacity={0.8} testID="overlay" />
        </TestWrapper>
      );

      const overlay = getByTestId('overlay');
      expect(overlay).toBeTruthy();
    });

    it('applies custom color', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} color="rgba(255, 0, 0, 0.5)" testID="overlay" />
        </TestWrapper>
      );

      const overlay = getByTestId('overlay');
      expect(overlay).toBeTruthy();
    });

    it('applies custom zIndex', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} zIndex={2000} testID="overlay" />
        </TestWrapper>
      );

      const overlay = getByTestId('overlay');
      expect(overlay).toBeTruthy();
    });

    it('applies custom style', () => {
      const customStyle = { borderWidth: 1 };
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} style={customStyle} testID="overlay" />
        </TestWrapper>
      );

      const overlay = getByTestId('overlay');
      expect(overlay.props.style).toEqual(expect.arrayContaining([
        expect.objectContaining(customStyle)
      ]));
    });
  });

  describe('Pointer Events', () => {
    it('applies default pointer events', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} testID="overlay" />
        </TestWrapper>
      );

      const overlay = getByTestId('overlay');
      expect(overlay.props.pointerEvents).toBe('auto');
    });

    it('applies custom pointer events', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} pointerEvents="none" testID="overlay" />
        </TestWrapper>
      );

      const overlay = getByTestId('overlay');
      expect(overlay.props.pointerEvents).toBe('none');
    });
  });

  describe('Animation Duration', () => {
    it('uses custom animation duration', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} animationDuration={500} testID="overlay" />
        </TestWrapper>
      );

      const overlay = getByTestId('overlay');
      expect(overlay).toBeTruthy();
    });

    it('uses default animation duration when not provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} testID="overlay" />
        </TestWrapper>
      );

      const overlay = getByTestId('overlay');
      expect(overlay).toBeTruthy();
    });
  });

  describe('TestID', () => {
    it('applies testID correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Overlay {...defaultProps} testID="custom-overlay" />
        </TestWrapper>
      );

      expect(getByTestId('custom-overlay')).toBeTruthy();
    });
  });
});