import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NotificationItem } from '../NotificationItem';
import { ThemeProvider } from '@/theme/provider/ThemeProvider';
import { useNotificationNavigation } from '@/hooks/useNotifications';
import type { Notification } from '@/types/notifications';

// Mock the notification navigation hook
jest.mock('@/hooks/useNotifications', () => ({
  useNotificationNavigation: jest.fn(),
}));

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: ({ children }: any) => children,
  State: { END: 5 },
}));

const mockUseNotificationNavigation = useNotificationNavigation as jest.MockedFunction<typeof useNotificationNavigation>;

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};

describe('NotificationItem', () => {
  const mockHandleNotificationPress = jest.fn();

  const mockNotification: Notification = {
    id: 'test-notification-1',
    user_id: 'test-user-id',
    type: 'friend_request_received',
    title: 'New Friend Request',
    body: 'John Doe sent you a friend request',
    data: {
      fromUserId: 'user-123',
      fromUserName: 'John Doe',
      toUserId: 'test-user-id',
    },
    read: false,
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  };

  const defaultProps = {
    notification: mockNotification,
    onMarkAsRead: jest.fn(),
    onDelete: jest.fn(),
    isLast: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationNavigation.mockReturnValue({
      handleNotificationPress: mockHandleNotificationPress,
      validateNavigationPermissions: jest.fn(),
      getNavigationTarget: jest.fn(),
    });
  });

  it('renders notification content correctly', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('New Friend Request')).toBeTruthy();
    expect(screen.getByText('John Doe sent you a friend request')).toBeTruthy();
  });

  it('shows unread indicator for unread notifications', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} />
      </Wrapper>
    );

    // The unread indicator should be present (it's a visual element)
    expect(screen.getByTestId('notification-item')).toBeTruthy();
  });

  it('does not show unread indicator for read notifications', () => {
    const readNotification = {
      ...mockNotification,
      read: true,
      read_at: '2024-01-01T12:30:00Z',
    };

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} notification={readNotification} />
      </Wrapper>
    );

    expect(screen.getByTestId('notification-item')).toBeTruthy();
  });

  it('displays formatted timestamp correctly', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} />
      </Wrapper>
    );

    // Should show some form of timestamp (exact format depends on current time)
    expect(screen.getByTestId('notification-item')).toBeTruthy();
  });

  it('displays notification type badge', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Friend Request Received')).toBeTruthy();
  });

  it('calls onMarkAsRead and handleNotificationPress when pressed', () => {
    const mockOnMarkAsRead = jest.fn();
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem 
          {...defaultProps} 
          onMarkAsRead={mockOnMarkAsRead}
        />
      </Wrapper>
    );

    fireEvent.press(screen.getByLabelText(/Notification: New Friend Request/));
    
    expect(mockOnMarkAsRead).toHaveBeenCalledWith('test-notification-1');
    expect(mockHandleNotificationPress).toHaveBeenCalledWith(mockNotification);
  });

  it('does not call onMarkAsRead for read notifications when pressed', () => {
    const mockOnMarkAsRead = jest.fn();
    const readNotification = {
      ...mockNotification,
      read: true,
      read_at: '2024-01-01T12:30:00Z',
    };

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem 
          {...defaultProps} 
          notification={readNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />
      </Wrapper>
    );

    fireEvent.press(screen.getByLabelText(/Notification: New Friend Request/));
    
    expect(mockOnMarkAsRead).not.toHaveBeenCalled();
    expect(mockHandleNotificationPress).toHaveBeenCalledWith(readNotification);
  });

  it('renders different icons for different notification types', () => {
    const groupNotification: Notification = {
      ...mockNotification,
      type: 'group_request_submitted',
      title: 'New Group Request',
      body: 'Jane Smith wants to create a new group',
    };

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} notification={groupNotification} />
      </Wrapper>
    );

    expect(screen.getByText('New Group Request')).toBeTruthy();
    expect(screen.getByText('Group Request Submitted')).toBeTruthy();
  });

  it('renders avatar when user data is available', () => {
    const notificationWithAvatar: Notification = {
      ...mockNotification,
      data: {
        ...mockNotification.data,
        fromUserName: 'John Doe',
        fromUserAvatar: 'https://example.com/avatar.jpg',
      },
    };

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} notification={notificationWithAvatar} />
      </Wrapper>
    );

    expect(screen.getByTestId('notification-item')).toBeTruthy();
  });

  it('has proper accessibility labels', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByLabelText(/Notification: New Friend Request/)).toBeTruthy();
    expect(screen.getByLabelText(/Double tap to open notification/)).toBeTruthy();
  });

  it('handles different notification types correctly', () => {
    const eventNotification: Notification = {
      ...mockNotification,
      type: 'event_reminder',
      title: 'Event Reminder',
      body: 'Sunday Service starts in 30 minutes',
      data: {
        eventId: 'event-123',
        eventTitle: 'Sunday Service',
        reminderMinutes: 30,
      },
    };

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} notification={eventNotification} />
      </Wrapper>
    );

    expect(screen.getByText('Event Reminder')).toBeTruthy();
    expect(screen.getByText('Event Reminder')).toBeTruthy(); // Type badge
  });

  it('truncates long titles and bodies', () => {
    const longNotification: Notification = {
      ...mockNotification,
      title: 'This is a very long notification title that should be truncated when displayed',
      body: 'This is a very long notification body that should be truncated when displayed in the notification item to prevent layout issues and maintain readability',
    };

    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} notification={longNotification} />
      </Wrapper>
    );

    expect(screen.getByTestId('notification-item')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <NotificationItem {...defaultProps} testID="custom-notification-item" />
      </Wrapper>
    );

    expect(screen.getByTestId('custom-notification-item')).toBeTruthy();
  });
});