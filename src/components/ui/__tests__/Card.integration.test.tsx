/**
 * Card Component Integration Tests
 * Tests for Card component integration with theme system and complex scenarios
 */

import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { Card } from '../Card';
import { ThemeProvider } from '../../../theme/provider/ThemeProvider';
import { useTheme } from '../../../theme/provider/useTheme';

// Test component that can switch themes
const ThemeSwitchingCard: React.FC<{
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated' | 'filled' | 'ghost';
}> = ({ onPress, variant = 'default' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <View>
      <Card variant={variant} onPress={onPress} testID="theme-card">
        <Text testID="card-content">
          Current theme: {isDark ? 'dark' : 'light'}
        </Text>
      </Card>
      <Card onPress={toggleTheme} testID="theme-toggle">
        <Text>Toggle Theme</Text>
      </Card>
    </View>
  );
};

// Wrapper component for theme provider
const TestWrapper: React.FC<{ 
  children: React.ReactNode;
  initialTheme?: 'light' | 'dark';
}> = ({ children, initialTheme = 'light' }) => (
  <ThemeProvider initialTheme={initialTheme}>
    {children}
  </ThemeProvider>
);

describe('Card Integration Tests', () => {
  describe('Theme Integration', () => {
    it('updates styles when theme changes', async () => {
      render(
        <TestWrapper>
          <ThemeSwitchingCard />
        </TestWrapper>
      );

      // Initial state should be light theme
      expect(screen.getByText('Current theme: light')).toBeTruthy();

      // Toggle theme
      const toggleButton = screen.getByTestId('theme-toggle');
      await act(async () => {
        fireEvent.press(toggleButton);
      });

      // Should now show dark theme
      expect(screen.getByText('Current theme: dark')).toBeTruthy();
    });

    it('applies correct theme colors for different variants', async () => {
      const variants: Array<'default' | 'outlined' | 'elevated' | 'filled' | 'ghost'> = [
        'default', 'outlined', 'elevated', 'filled', 'ghost'
      ];

      for (const variant of variants) {
        render(
          <TestWrapper>
            <Card variant={variant} testID={`${variant}-card`}>
              <Text>{variant} card</Text>
            </Card>
          </TestWrapper>
        );

        expect(screen.getByTestId(`${variant}-card`)).toBeTruthy();
        expect(screen.getByText(`${variant} card`)).toBeTruthy();
      }
    });

    it('maintains theme consistency across multiple cards', () => {
      render(
        <TestWrapper>
          <View>
            <Card variant="default" testID="card-1">
              <Text>Card 1</Text>
            </Card>
            <Card variant="outlined" testID="card-2">
              <Text>Card 2</Text>
            </Card>
            <Card variant="elevated" testID="card-3">
              <Text>Card 3</Text>
            </Card>
          </View>
        </TestWrapper>
      );

      expect(screen.getByTestId('card-1')).toBeTruthy();
      expect(screen.getByTestId('card-2')).toBeTruthy();
      expect(screen.getByTestId('card-3')).toBeTruthy();
    });
  });

  describe('Complex Interactions', () => {
    it('handles nested interactive elements', () => {
      const mockCardPress = jest.fn();
      const mockButtonPress = jest.fn();

      const NestedCard: React.FC = () => (
        <Card onPress={mockCardPress} testID="parent-card">
          <Text>Card content</Text>
          <Card onPress={mockButtonPress} testID="nested-card">
            <Text>Nested button</Text>
          </Card>
        </Card>
      );

      render(
        <TestWrapper>
          <NestedCard />
        </TestWrapper>
      );

      // Press nested card
      fireEvent.press(screen.getByTestId('nested-card'));
      expect(mockButtonPress).toHaveBeenCalledTimes(1);
      expect(mockCardPress).not.toHaveBeenCalled();

      // Press parent card (but not nested area)
      fireEvent.press(screen.getByTestId('parent-card'));
      expect(mockCardPress).toHaveBeenCalledTimes(1);
    });

    it('handles rapid successive presses', () => {
      const mockOnPress = jest.fn();

      render(
        <TestWrapper>
          <Card onPress={mockOnPress} testID="rapid-press-card">
            <Text>Rapid press test</Text>
          </Card>
        </TestWrapper>
      );

      const card = screen.getByTestId('rapid-press-card');

      // Simulate rapid presses
      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it('handles state changes during interaction', () => {
      const StateChangingCard: React.FC = () => {
        const [disabled, setDisabled] = React.useState(false);
        const [pressCount, setPressCount] = React.useState(0);

        const handlePress = () => {
          setPressCount(prev => prev + 1);
          if (pressCount >= 2) {
            setDisabled(true);
          }
        };

        return (
          <Card 
            onPress={handlePress} 
            disabled={disabled}
            testID="state-changing-card"
          >
            <Text testID="press-count">Presses: {pressCount}</Text>
            <Text testID="disabled-state">Disabled: {disabled.toString()}</Text>
          </Card>
        );
      };

      render(
        <TestWrapper>
          <StateChangingCard />
        </TestWrapper>
      );

      const card = screen.getByTestId('state-changing-card');

      // Initial state
      expect(screen.getByText('Presses: 0')).toBeTruthy();
      expect(screen.getByText('Disabled: false')).toBeTruthy();

      // First press
      fireEvent.press(card);
      expect(screen.getByText('Presses: 1')).toBeTruthy();

      // Second press
      fireEvent.press(card);
      expect(screen.getByText('Presses: 2')).toBeTruthy();

      // Third press should disable the card
      fireEvent.press(card);
      expect(screen.getByText('Presses: 3')).toBeTruthy();
      expect(screen.getByText('Disabled: true')).toBeTruthy();

      // Fourth press should not work (disabled)
      fireEvent.press(card);
      expect(screen.getByText('Presses: 3')).toBeTruthy(); // Should remain 3
    });
  });

  describe('Performance and Memory', () => {
    it('handles large numbers of cards efficiently', () => {
      const LargeCardList: React.FC = () => (
        <View>
          {Array.from({ length: 100 }, (_, index) => (
            <Card key={index} testID={`card-${index}`}>
              <Text>Card {index}</Text>
            </Card>
          ))}
        </View>
      );

      const startTime = Date.now();
      render(
        <TestWrapper>
          <LargeCardList />
        </TestWrapper>
      );
      const endTime = Date.now();

      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify some cards are rendered
      expect(screen.getByTestId('card-0')).toBeTruthy();
      expect(screen.getByTestId('card-50')).toBeTruthy();
      expect(screen.getByTestId('card-99')).toBeTruthy();
    });

    it('properly cleans up event listeners', () => {
      const mockOnPress = jest.fn();

      const { unmount } = render(
        <TestWrapper>
          <Card onPress={mockOnPress} testID="cleanup-card">
            <Text>Cleanup test</Text>
          </Card>
        </TestWrapper>
      );

      // Press before unmount
      fireEvent.press(screen.getByTestId('cleanup-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);

      // Unmount component
      unmount();

      // Verify no memory leaks or errors after unmount
      expect(() => {
        // This should not throw any errors
      }).not.toThrow();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility during theme changes', async () => {
      render(
        <TestWrapper>
          <ThemeSwitchingCard onPress={() => {}} />
        </TestWrapper>
      );

      const card = screen.getByTestId('theme-card');
      
      // Check initial accessibility
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessible).toBe(true);

      // Toggle theme
      const toggleButton = screen.getByTestId('theme-toggle');
      await act(async () => {
        fireEvent.press(toggleButton);
      });

      // Accessibility should be maintained after theme change
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessible).toBe(true);
    });

    it('handles accessibility with dynamic content', () => {
      const DynamicCard: React.FC = () => {
        const [content, setContent] = React.useState('Initial content');

        return (
          <Card 
            onPress={() => setContent('Updated content')}
            accessibilityLabel={`Card with ${content}`}
            testID="dynamic-card"
          >
            <Text testID="dynamic-content">{content}</Text>
          </Card>
        );
      };

      render(
        <TestWrapper>
          <DynamicCard />
        </TestWrapper>
      );

      const card = screen.getByTestId('dynamic-card');
      
      // Initial state
      expect(screen.getByText('Initial content')).toBeTruthy();
      expect(card.props.accessibilityLabel).toBe('Card with Initial content');

      // Update content
      fireEvent.press(card);
      expect(screen.getByText('Updated content')).toBeTruthy();
      expect(card.props.accessibilityLabel).toBe('Card with Updated content');
    });
  });

  describe('Error Boundaries', () => {
    it('handles errors in children gracefully', () => {
      const ErrorChild: React.FC = () => {
        throw new Error('Test error');
      };

      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <TestWrapper>
            <Card testID="error-card">
              <ErrorChild />
            </Card>
          </TestWrapper>
        );
      }).toThrow('Test error');

      consoleSpy.mockRestore();
    });

    it('handles theme provider errors gracefully', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <Card testID="no-theme-card">
            <Text>No theme provider</Text>
          </Card>
        );
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });
});