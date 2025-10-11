import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationIconWithBadge } from '../NotificationIconWithBadge';
import { ThemeProvider } from '@/theme/provider/ThemeProvider';
import { lightTheme } from '@/theme/themes/light';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, testID }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID || `ionicon-${name}`}>
        <Text>{`${name}-${size}-${color}`}</Text>
      </View>
    );
  },
}));

// Mock the theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
);

describe('NotificationIconWithBadge', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders notification icon without badge when unreadCount is 0', () => {
    const { getByTestId, queryByText } = render(
      <TestWrapper>
        <NotificationIconWithBadge onPress={mockOnPress} unreadCount={0} />
      </TestWrapper>
    );

    expect(getByTestId('notification-icon-with-badge')).toBeTruthy();
    expect(queryByText('0')).toBeNull();
  });

  it('renders notification icon with badge when unreadCount > 0', () => {
    const { getByTestId, getByLabelText } = render(
      <TestWrapper>
        <NotificationIconWithBadge onPress={mockOnPress} unreadCount={5} />
      </TestWrapper>
    );

    expect(getByTestId('notification-icon-with-badge')).toBeTruthy();
    expect(getByLabelText('5 unread notifications')).toBeTruthy();
  });

  it('displays 99+ for counts over 99', () => {
    const { getByLabelText } = render(
      <TestWrapper>
        <NotificationIconWithBadge onPress={mockOnPress} unreadCount={150} />
      </TestWrapper>
    );

    expect(getByLabelText('150 unread notifications')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <NotificationIconWithBadge onPress={mockOnPress} unreadCount={3} />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('notification-icon-with-badge'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <NotificationIconWithBadge
          onPress={mockOnPress}
          unreadCount={3}
          disabled={true}
        />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('notification-icon-with-badge'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('has proper accessibility labels', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <NotificationIconWithBadge onPress={mockOnPress} unreadCount={3} />
      </TestWrapper>
    );

    const icon = getByTestId('notification-icon-with-badge');
    expect(icon.props.accessibilityLabel).toContain('3 unread notifications');
    expect(icon.props.accessibilityRole).toBe('button');
  });

  it('has proper accessibility labels for single notification', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <NotificationIconWithBadge onPress={mockOnPress} unreadCount={1} />
      </TestWrapper>
    );

    const icon = getByTestId('notification-icon-with-badge');
    expect(icon.props.accessibilityLabel).toContain('1 unread notification');
  });

  it('has proper accessibility labels for no notifications', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <NotificationIconWithBadge onPress={mockOnPress} unreadCount={0} />
      </TestWrapper>
    );

    const icon = getByTestId('notification-icon-with-badge');
    expect(icon.props.accessibilityLabel).toContain('no unread notifications');
  });

  it('accepts custom accessibility labels', () => {
    const customLabel = 'Custom notification button';
    const { getByTestId } = render(
      <TestWrapper>
        <NotificationIconWithBadge
          onPress={mockOnPress}
          unreadCount={5}
          accessibilityLabel={customLabel}
        />
      </TestWrapper>
    );

    const icon = getByTestId('notification-icon-with-badge');
    expect(icon.props.accessibilityLabel).toBe(customLabel);
  });
});
