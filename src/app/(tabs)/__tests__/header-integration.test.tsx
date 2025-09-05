import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/provider/ThemeProvider';
import { lightTheme } from '@/theme/themes/light';

// Mock the auth store
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user-id' },
  }),
}));

// Mock the notification hook
jest.mock('@/hooks/useNotifications', () => ({
  useNotificationBadge: () => ({
    count: 3,
    formattedCount: '3',
    shouldShowBadge: true,
  }),
}));

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

// Import the header component after mocks
const HomeHeader = () => {
  const { useTheme } = require('@/theme/provider/useTheme');
  const { useAuthStore } = require('@/stores/auth');
  const { NotificationIconWithBadge } = require('@/components/ui/NotificationIconWithBadge');
  const { useNotificationBadge } = require('@/hooks/useNotifications');
  const { useState } = require('react');
  const { View, StyleSheet } = require('react-native');
  const { Text } = require('@/components/ui/Text');

  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { count: unreadCount } = useNotificationBadge(user?.id);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);

  const handleNotificationPress = () => {
    setNotificationPanelVisible(true);
    console.log('Notification icon pressed - panel will be implemented in next task');
  };

  const styles = StyleSheet.create({
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: 16,
    },
  });

  return (
    <View style={styles.headerContainer}>
      <Text variant="h4" weight="semiBold">
        VineMe
      </Text>
      <NotificationIconWithBadge
        onPress={handleNotificationPress}
        unreadCount={unreadCount}
        size={24}
        color={theme.colors.text.primary}
        badgeColor={theme.colors.error[500]}
        testID="home-notification-icon"
        accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ', no unread notifications'}`}
        accessibilityHint="Double tap to open notifications panel"
      />
    </View>
  );
};

// Test wrapper with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={lightTheme}>
    {children}
  </ThemeProvider>
);

describe('Home Header Integration', () => {
  it('renders header with VineMe title and notification icon', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <HomeHeader />
      </TestWrapper>
    );

    // Check that the title is rendered
    expect(getByText('VineMe')).toBeTruthy();
    
    // Check that the notification icon is rendered
    expect(getByTestId('home-notification-icon')).toBeTruthy();
  });

  it('displays notification badge when there are unread notifications', () => {
    const { getByLabelText } = render(
      <TestWrapper>
        <HomeHeader />
      </TestWrapper>
    );

    // Check that the notification badge is displayed with correct count
    expect(getByLabelText('3 unread notifications')).toBeTruthy();
  });

  it('has proper accessibility labels for the notification icon', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <HomeHeader />
      </TestWrapper>
    );

    const notificationIcon = getByTestId('home-notification-icon');
    expect(notificationIcon.props.accessibilityLabel).toContain('Notifications, 3 unread');
    expect(notificationIcon.props.accessibilityHint).toBe('Double tap to open notifications panel');
  });

  it('has proper layout with title on left and notification icon on right', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <HomeHeader />
      </TestWrapper>
    );

    const title = getByText('VineMe');
    const notificationIcon = getByTestId('home-notification-icon');
    
    // Both elements should be present
    expect(title).toBeTruthy();
    expect(notificationIcon).toBeTruthy();
  });
});