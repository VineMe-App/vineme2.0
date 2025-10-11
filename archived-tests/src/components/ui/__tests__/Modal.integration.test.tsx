/**
 * Modal Integration Tests
 * Tests for Modal component integration with theme system and other components
 */

import React, { useState } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Modal } from '../Modal';
import { Overlay } from '../Overlay';
import { Backdrop } from '../Backdrop';
import { Portal, PortalHost } from '../Portal';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { Button } from '../Button';

// Mock React Native modules
const mockAnimatedValue = {
  setValue: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockAnimatedTiming = {
  start: jest.fn(),
};

const mockBackHandler = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
};

const mockAccessibilityInfo = {
  getCurrentlyFocusedField: jest.fn(),
  setAccessibilityFocus: jest.fn(),
};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      Value: jest.fn(() => mockAnimatedValue),
      timing: jest.fn(() => mockAnimatedTiming),
      parallel: jest.fn(() => mockAnimatedTiming),
      spring: jest.fn(() => mockAnimatedTiming),
      View: RN.View,
    },
    BackHandler: mockBackHandler,
    AccessibilityInfo: mockAccessibilityInfo,
  };
});

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider initialTheme="light">{children}</ThemeProvider>
);

describe('Modal Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal with Theme Integration', () => {
    it('renders correctly with light theme', () => {
      const { getByText, getByLabelText } = render(
        <TestWrapper>
          <Modal isVisible={true} onClose={() => {}} title="Test Modal">
            <Text>Modal content with light theme</Text>
          </Modal>
        </TestWrapper>
      );

      expect(getByText('Test Modal')).toBeTruthy();
      expect(getByText('Modal content with light theme')).toBeTruthy();
      expect(getByLabelText('Close modal')).toBeTruthy();
    });

    it('renders correctly with dark theme', () => {
      const { getByText, getByLabelText } = render(
        <ThemeProvider initialTheme="dark">
          <Modal isVisible={true} onClose={() => {}} title="Test Modal">
            <Text>Modal content with dark theme</Text>
          </Modal>
        </ThemeProvider>
      );

      expect(getByText('Test Modal')).toBeTruthy();
      expect(getByText('Modal content with dark theme')).toBeTruthy();
      expect(getByLabelText('Close modal')).toBeTruthy();
    });
  });

  describe('Modal with Interactive Components', () => {
    it('handles button interactions inside modal', () => {
      const mockButtonPress = jest.fn();
      const mockModalClose = jest.fn();

      const { getByText } = render(
        <TestWrapper>
          <Modal
            isVisible={true}
            onClose={mockModalClose}
            title="Interactive Modal"
          >
            <Button title="Test Button" onPress={mockButtonPress} />
          </Modal>
        </TestWrapper>
      );

      fireEvent.press(getByText('Test Button'));
      expect(mockButtonPress).toHaveBeenCalledTimes(1);
      expect(mockModalClose).not.toHaveBeenCalled();
    });

    it('handles form interactions inside modal', () => {
      const mockSubmit = jest.fn();
      const mockModalClose = jest.fn();

      const FormModal = () => {
        const [value, setValue] = useState('');

        return (
          <Modal isVisible={true} onClose={mockModalClose} title="Form Modal">
            <View>
              <Text>Form Value: {value}</Text>
              <TouchableOpacity onPress={() => setValue('test')}>
                <Text>Set Value</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => mockSubmit(value)}>
                <Text>Submit</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        );
      };

      const { getByText } = render(
        <TestWrapper>
          <FormModal />
        </TestWrapper>
      );

      fireEvent.press(getByText('Set Value'));
      expect(getByText('Form Value: test')).toBeTruthy();

      fireEvent.press(getByText('Submit'));
      expect(mockSubmit).toHaveBeenCalledWith('test');
    });
  });

  describe('Modal State Management', () => {
    it('handles modal show/hide state correctly', async () => {
      const ModalController = () => {
        const [isVisible, setIsVisible] = useState(false);

        return (
          <View>
            <TouchableOpacity onPress={() => setIsVisible(true)}>
              <Text>Show Modal</Text>
            </TouchableOpacity>
            <Modal
              isVisible={isVisible}
              onClose={() => setIsVisible(false)}
              title="Controlled Modal"
            >
              <Text>Modal Content</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <Text>Hide Modal</Text>
              </TouchableOpacity>
            </Modal>
          </View>
        );
      };

      const { getByText, queryByText } = render(
        <TestWrapper>
          <ModalController />
        </TestWrapper>
      );

      // Initially modal should not be visible
      expect(queryByText('Modal Content')).toBeNull();

      // Show modal
      fireEvent.press(getByText('Show Modal'));
      await waitFor(() => {
        expect(getByText('Modal Content')).toBeTruthy();
      });

      // Hide modal using internal button
      fireEvent.press(getByText('Hide Modal'));
      await waitFor(() => {
        expect(queryByText('Modal Content')).toBeNull();
      });
    });

    it('handles multiple modals correctly', async () => {
      const MultiModalController = () => {
        const [modal1Visible, setModal1Visible] = useState(false);
        const [modal2Visible, setModal2Visible] = useState(false);

        return (
          <View>
            <TouchableOpacity onPress={() => setModal1Visible(true)}>
              <Text>Show Modal 1</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModal2Visible(true)}>
              <Text>Show Modal 2</Text>
            </TouchableOpacity>

            <Modal
              isVisible={modal1Visible}
              onClose={() => setModal1Visible(false)}
              title="Modal 1"
            >
              <Text>Modal 1 Content</Text>
            </Modal>

            <Modal
              isVisible={modal2Visible}
              onClose={() => setModal2Visible(false)}
              title="Modal 2"
            >
              <Text>Modal 2 Content</Text>
            </Modal>
          </View>
        );
      };

      const { getByText, queryByText } = render(
        <TestWrapper>
          <MultiModalController />
        </TestWrapper>
      );

      // Show first modal
      fireEvent.press(getByText('Show Modal 1'));
      await waitFor(() => {
        expect(getByText('Modal 1 Content')).toBeTruthy();
      });

      // Show second modal
      fireEvent.press(getByText('Show Modal 2'));
      await waitFor(() => {
        expect(getByText('Modal 2 Content')).toBeTruthy();
      });

      // Both modals should be visible
      expect(getByText('Modal 1 Content')).toBeTruthy();
      expect(getByText('Modal 2 Content')).toBeTruthy();
    });
  });

  describe('Modal with Overlay Components', () => {
    it('works with custom Overlay component', () => {
      const mockOverlayPress = jest.fn();
      const mockModalClose = jest.fn();

      const { getByTestId } = render(
        <TestWrapper>
          <View>
            <Overlay
              isVisible={true}
              onPress={mockOverlayPress}
              testID="custom-overlay"
            >
              <Modal
                isVisible={true}
                onClose={mockModalClose}
                title="Modal with Overlay"
              >
                <Text>Modal Content</Text>
              </Modal>
            </Overlay>
          </View>
        </TestWrapper>
      );

      const overlay = getByTestId('custom-overlay');
      fireEvent.press(overlay);
      expect(mockOverlayPress).toHaveBeenCalledTimes(1);
    });

    it('works with custom Backdrop component', () => {
      const mockBackdropPress = jest.fn();
      const mockModalClose = jest.fn();

      const { getByTestId } = render(
        <TestWrapper>
          <View>
            <Backdrop
              isVisible={true}
              onPress={mockBackdropPress}
              testID="custom-backdrop"
            >
              <Modal
                isVisible={true}
                onClose={mockModalClose}
                title="Modal with Backdrop"
              >
                <Text>Modal Content</Text>
              </Modal>
            </Backdrop>
          </View>
        </TestWrapper>
      );

      const backdrop = getByTestId('custom-backdrop');
      fireEvent.press(backdrop);
      expect(mockBackdropPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal with Portal Integration', () => {
    it('works with Portal system', async () => {
      const PortalModalController = () => {
        const [isVisible, setIsVisible] = useState(false);

        return (
          <View>
            <PortalHost />
            <TouchableOpacity onPress={() => setIsVisible(true)}>
              <Text>Show Portal Modal</Text>
            </TouchableOpacity>

            {isVisible && (
              <Portal name="modal-portal">
                <Modal
                  isVisible={isVisible}
                  onClose={() => setIsVisible(false)}
                  title="Portal Modal"
                >
                  <Text>Portal Modal Content</Text>
                </Modal>
              </Portal>
            )}
          </View>
        );
      };

      const { getByText, queryByText } = render(
        <TestWrapper>
          <PortalModalController />
        </TestWrapper>
      );

      // Show modal through portal
      fireEvent.press(getByText('Show Portal Modal'));

      await act(async () => {
        await waitFor(() => {
          expect(getByText('Portal Modal Content')).toBeTruthy();
        });
      });
    });
  });

  describe('Modal Accessibility Integration', () => {
    it('maintains focus management with interactive elements', async () => {
      const mockButtonPress = jest.fn();
      const mockModalClose = jest.fn();

      const { getByLabelText, getByText } = render(
        <TestWrapper>
          <Modal
            isVisible={true}
            onClose={mockModalClose}
            title="Accessible Modal"
          >
            <Button title="Accessible Button" onPress={mockButtonPress} />
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Accessible Modal');
      const button = getByText('Accessible Button');
      const closeButton = getByLabelText('Close modal');

      expect(modal.props.accessibilityRole).toBe('dialog');
      expect(modal.props.accessibilityModal).toBe(true);
      expect(closeButton.props.accessibilityRole).toBe('button');
    });

    it('handles keyboard navigation correctly', () => {
      const mockModalClose = jest.fn();

      const { getByLabelText } = render(
        <TestWrapper>
          <Modal
            isVisible={true}
            onClose={mockModalClose}
            title="Keyboard Modal"
          >
            <Text>Modal with keyboard support</Text>
          </Modal>
        </TestWrapper>
      );

      const modal = getByLabelText('Keyboard Modal');

      // Simulate escape key press
      fireEvent(modal, 'keyPress', { nativeEvent: { key: 'Escape' } });
      expect(mockModalClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Performance Integration', () => {
    it('handles rapid show/hide operations', async () => {
      const RapidModalController = () => {
        const [isVisible, setIsVisible] = useState(false);
        const [count, setCount] = useState(0);

        const toggleModal = () => {
          setIsVisible(!isVisible);
          setCount((c) => c + 1);
        };

        return (
          <View>
            <TouchableOpacity onPress={toggleModal}>
              <Text>Toggle Modal ({count})</Text>
            </TouchableOpacity>

            <Modal
              isVisible={isVisible}
              onClose={() => setIsVisible(false)}
              title="Rapid Modal"
            >
              <Text>Rapid Modal Content {count}</Text>
            </Modal>
          </View>
        );
      };

      const { getByText, queryByText } = render(
        <TestWrapper>
          <RapidModalController />
        </TestWrapper>
      );

      // Rapidly toggle modal multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByText(`Toggle Modal (${i})`));

        if (i % 2 === 0) {
          await waitFor(() => {
            expect(getByText(`Rapid Modal Content ${i + 1}`)).toBeTruthy();
          });
        } else {
          await waitFor(() => {
            expect(queryByText(`Rapid Modal Content ${i + 1}`)).toBeNull();
          });
        }
      }
    });
  });
});
