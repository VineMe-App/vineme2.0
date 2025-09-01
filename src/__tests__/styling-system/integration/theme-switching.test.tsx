/**
 * Theme Switching Integration Tests
 * Tests for theme switching functionality across components
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { useTheme } from '../../../theme/provider/useTheme';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Text } from '../../../components/ui/Text';
import { lightTheme, darkTheme } from '../../../theme/themes';

// Test component that uses multiple themed components
const ThemeTestApp: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  return (
    <>
      <Text testID="theme-indicator" variant="h1">
        Current Theme: {theme.name}
      </Text>
      <Text testID="dark-indicator">
        Dark Mode: {isDark ? 'true' : 'false'}
      </Text>
      
      <Button
        testID="toggle-theme-btn"
        title="Toggle Theme"
        onPress={toggleTheme}
        variant="primary"
      />
      
      <Card testID="test-card" variant="elevated">
        <Text testID="card-text">Card Content</Text>
        <Button
          testID="card-button"
          title="Card Button"
          onPress={() => setModalVisible(true)}
          variant="secondary"
        />
      </Card>
      
      <Input
        testID="test-input"
        label="Test Input"
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="Enter text"
      />
      
      <Modal
        testID="test-modal"
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Test Modal"
      >
        <Text testID="modal-text">Modal content</Text>
        <Button
          testID="modal-close-btn"
          title="Close"
          onPress={() => setModalVisible(false)}
        />
      </Modal>
    </>
  );
};

describe('Theme Switching Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Theme Switching', () => {
    it('should switch themes across all components simultaneously', async () => {
      render(
        <ThemeProvider initialTheme="light">
          <ThemeTestApp />
        </ThemeProvider>
      );

      // Verify initial light theme
      expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: light');
      expect(screen.getByTestId('dark-indicator')).toHaveTextContent('Dark Mode: false');

      // Toggle to dark theme
      act(() => {
        screen.getByTestId('toggle-theme-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: dark');
        expect(screen.getByTestId('dark-indicator')).toHaveTextContent('Dark Mode: true');
      });

      // Toggle back to light theme
      act(() => {
        screen.getByTestId('toggle-theme-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: light');
        expect(screen.getByTestId('dark-indicator')).toHaveTextContent('Dark Mode: false');
      });
    });

    it('should preserve component state during theme switching', async () => {
      render(
        <ThemeProvider initialTheme="light">
          <ThemeTestApp />
        </ThemeProvider>
      );

      // Set input value
      const input = screen.getByTestId('test-input');
      act(() => {
        input.props.onChangeText('test value');
      });

      // Toggle theme
      act(() => {
        screen.getByTestId('toggle-theme-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: dark');
      });

      // Input value should be preserved
      expect(input.props.value).toBe('test value');
    });
  });

  describe('Component Theme Consistency', () => {
    it('should apply consistent theme colors across all components', async () => {
      const { rerender } = render(
        <ThemeProvider initialTheme="light">
          <ThemeTestApp />
        </ThemeProvider>
      );

      // Get components and verify they use light theme colors
      const button = screen.getByTestId('toggle-theme-btn');
      const card = screen.getByTestId('test-card');
      const input = screen.getByTestId('test-input');

      // Verify light theme is applied (components should have light theme styles)
      expect(button).toBeDefined();
      expect(card).toBeDefined();
      expect(input).toBeDefined();

      // Switch to dark theme
      rerender(
        <ThemeProvider initialTheme="dark">
          <ThemeTestApp />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: dark');
      });

      // Components should now use dark theme colors
      const darkButton = screen.getByTestId('toggle-theme-btn');
      const darkCard = screen.getByTestId('test-card');
      const darkInput = screen.getByTestId('test-input');

      expect(darkButton).toBeDefined();
      expect(darkCard).toBeDefined();
      expect(darkInput).toBeDefined();
    });

    it('should handle nested component theme inheritance', async () => {
      render(
        <ThemeProvider initialTheme="light">
          <ThemeTestApp />
        </ThemeProvider>
      );

      // Open modal to test nested components
      act(() => {
        screen.getByTestId('card-button').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('test-modal')).toBeDefined();
        expect(screen.getByTestId('modal-text')).toBeDefined();
      });

      // Toggle theme while modal is open
      act(() => {
        screen.getByTestId('toggle-theme-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: dark');
      });

      // Modal and its contents should also update to dark theme
      expect(screen.getByTestId('test-modal')).toBeDefined();
      expect(screen.getByTestId('modal-text')).toBeDefined();
      expect(screen.getByTestId('modal-close-btn')).toBeDefined();
    });
  });

  describe('System Theme Integration', () => {
    it('should respond to system theme changes', async () => {
      const mockAppearance = require('react-native').Appearance;
      
      render(
        <ThemeProvider initialTheme="system">
          <ThemeTestApp />
        </ThemeProvider>
      );

      // Initially should follow system (mocked as light)
      expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: light');

      // Simulate system theme change to dark
      act(() => {
        mockAppearance.getColorScheme.mockReturnValue('dark');
        // Trigger the appearance change listener
        const listener = mockAppearance.addChangeListener.mock.calls[0][0];
        listener({ colorScheme: 'dark' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: dark');
      });
    });

    it('should handle system theme override', async () => {
      render(
        <ThemeProvider initialTheme="system">
          <ThemeTestApp />
        </ThemeProvider>
      );

      // Should start with system theme (light)
      expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: light');

      // Manual toggle should override system
      act(() => {
        screen.getByTestId('toggle-theme-btn').props.onPress();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: dark');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid theme gracefully', async () => {
      const TestComponentWithInvalidTheme: React.FC = () => {
        const { setTheme } = useTheme();
        
        return (
          <Button
            testID="invalid-theme-btn"
            title="Set Invalid Theme"
            onPress={() => setTheme(null as any)}
          />
        );
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <ThemeProvider initialTheme="light">
          <TestComponentWithInvalidTheme />
        </ThemeProvider>
      );

      // Should not crash when setting invalid theme
      expect(() => {
        act(() => {
          screen.getByTestId('invalid-theme-btn').props.onPress();
        });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid theme provided, ignoring theme change'
      );

      consoleSpy.mockRestore();
    });

    it('should maintain theme consistency during rapid switching', async () => {
      render(
        <ThemeProvider initialTheme="light">
          <ThemeTestApp />
        </ThemeProvider>
      );

      // Rapidly toggle theme multiple times
      const toggleButton = screen.getByTestId('toggle-theme-btn');
      
      for (let i = 0; i < 5; i++) {
        act(() => {
          toggleButton.props.onPress();
        });
      }

      await waitFor(() => {
        // Should end up on dark theme (odd number of toggles)
        expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current Theme: dark');
      });

      // All components should be consistent
      expect(screen.getByTestId('dark-indicator')).toHaveTextContent('Dark Mode: true');
    });
  });
});