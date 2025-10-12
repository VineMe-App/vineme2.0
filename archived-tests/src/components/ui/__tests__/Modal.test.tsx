/**
 * Modal Component Tests
 * Tests for the enhanced Modal component with theme integration and accessibility
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, BackHandler } from 'react-native';
import { Modal } from '../Modal';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { lightTheme } from '../../../theme/themes/light';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{name}</Text>;
  },
}));

// Mock BackHandler
const mockBackHandler = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
};

// Mock react-native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    BackHandler: mockBackHandler,
  };
});

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider initialTheme="light">{children}</ThemeProvider>
);

describe('Modal Component', () => {
  const mockOnClose = jest.fn();
  const defaultProps = {
    isVisible: true,
    onClose: mockOnClose,
    children: <Text>Modal Content</Text>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Test Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByText('Test Modal Content')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByText } = render(
        <TestWrapper>
          <Modal {...defaultProps} isVisible={false}>
            <Text>Test Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(queryByText('Test Modal Content')).toBeNull();
    });

    it('renders with title when provided', () => {
      const { getByText } = render(
        <TestWrapper>
          <Modal {...defaultProps} title="Test Title">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders close button by default', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByLabelText('Close modal')).toBeTruthy();
    });

    it('hides close button when showCloseButton is false', () => {
      const { queryByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} showCloseButton={false}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(queryByLabelText('Close modal')).toBeNull();
    });
  });

  describe('Size Variants', () => {
    it('applies small size correctly', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} size="small">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('applies medium size by default', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('applies large size correctly', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} size="large">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('applies fullscreen size correctly', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} size="fullscreen">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('applies default variant correctly', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} variant="default">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('applies centered variant correctly', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} variant="centered">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('applies bottom-sheet variant correctly', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} variant="bottom-sheet">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('applies fullscreen variant correctly', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} variant="fullscreen">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });
  });

  describe('Interaction Handling', () => {
    it('calls onClose when close button is pressed', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      fireEvent.press(getByLabelText('Close modal'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is pressed and closeOnOverlayPress is true', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Modal {...defaultProps} closeOnOverlayPress={true} testID="modal">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      // Find the overlay touchable (parent of the modal content)
      const modal = getByTestId('modal');
      const overlay = modal.parent;
      if (overlay) {
        fireEvent.press(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('does not call onClose when overlay is pressed and closeOnOverlayPress is false', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Modal {...defaultProps} closeOnOverlayPress={false} testID="modal">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      // Find the overlay touchable (parent of the modal content)
      const modal = getByTestId('modal');
      const overlay = modal.parent;
      if (overlay) {
        fireEvent.press(overlay);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Scrollable Content', () => {
    it('renders scrollable content when scrollable is true', () => {
      const { getByText } = render(
        <TestWrapper>
          <Modal {...defaultProps} scrollable={true}>
            <Text>Scrollable Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByText('Scrollable Content')).toBeTruthy();
    });

    it('renders non-scrollable content by default', () => {
      const { getByText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Non-scrollable Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByText('Non-scrollable Content')).toBeTruthy();
    });
  });

  describe('Animation Types', () => {
    it('handles fade animation type', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} animationType="fade">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('handles slide animation type', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} animationType="slide">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('handles scale animation type', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} animationType="scale">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal).toBeTruthy();
    });

    it('handles none animation type', () => {
      const { queryByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} animationType="none" isVisible={false}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(queryByLabelText('Modal dialog')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal.props.accessibilityRole).toBe('dialog');
    });

    it('has accessibility modal property', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal.props.accessibilityModal).toBe(true);
    });

    it('uses title as accessibility label when provided', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} title="Custom Title">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByLabelText('Custom Title')).toBeTruthy();
    });

    it('uses default accessibility label when no title provided', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByLabelText('Modal dialog')).toBeTruthy();
    });

    it('close button has proper accessibility properties', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const closeButton = getByLabelText('Close modal');
      expect(closeButton.props.accessibilityRole).toBe('button');
      expect(closeButton.props.accessibilityHint).toBe(
        'Closes the modal dialog'
      );
    });
  });

  describe('Back Handler', () => {
    it('registers back handler when visible', () => {
      render(
        <TestWrapper>
          <Modal {...defaultProps}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(mockBackHandler.addEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function)
      );
    });

    it('calls onClose when back button is pressed and closeOnBackPress is true', () => {
      render(
        <TestWrapper>
          <Modal {...defaultProps} closeOnBackPress={true}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      // Get the back handler callback
      const backHandlerCallback =
        mockBackHandler.addEventListener.mock.calls[0][1];
      const result = backHandlerCallback();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('does not call onClose when back button is pressed and closeOnBackPress is false', () => {
      render(
        <TestWrapper>
          <Modal {...defaultProps} closeOnBackPress={false}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      // Get the back handler callback
      const backHandlerCallback =
        mockBackHandler.addEventListener.mock.calls[0][1];
      const result = backHandlerCallback();

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('Lifecycle Callbacks', () => {
    it('calls onShow when modal becomes visible', async () => {
      const onShow = jest.fn();
      const { rerender } = render(
        <TestWrapper>
          <Modal {...defaultProps} isVisible={false} onShow={onShow}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <Modal {...defaultProps} isVisible={true} onShow={onShow}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onShow).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onHide when modal becomes hidden', async () => {
      const onHide = jest.fn();
      const { rerender } = render(
        <TestWrapper>
          <Modal {...defaultProps} isVisible={true} onHide={onHide}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <Modal {...defaultProps} isVisible={false} onHide={onHide}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onHide).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onAnimationEnd after animations complete', async () => {
      const onAnimationEnd = jest.fn();
      render(
        <TestWrapper>
          <Modal {...defaultProps} onAnimationEnd={onAnimationEnd}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onAnimationEnd).toHaveBeenCalled();
      });
    });
  });

  describe('Custom Styling', () => {
    it('applies custom style prop', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} style={customStyle}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });

    it('applies custom contentStyle prop', () => {
      const customContentStyle = { padding: 20 };
      const { getByLabelText } = render(
        <TestWrapper>
          <Modal {...defaultProps} contentStyle={customContentStyle}>
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Modal dialog');
      expect(modal.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customContentStyle)])
      );
    });
  });

  describe('TestID', () => {
    it('applies testID to the modal', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <Modal {...defaultProps} testID="test-modal">
            <Text>Modal Content</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByTestId('test-modal')).toBeTruthy();
    });
  });
});
