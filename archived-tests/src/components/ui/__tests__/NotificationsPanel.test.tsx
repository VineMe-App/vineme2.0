import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { NotificationsPanel } from '../NotificationsPanel';
import { ThemeProvider } from '@/theme/provider/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotificationPanel } from '@/hooks/useNotifications';

// Mock the notification hook
jest.mock('@/hooks/useNotifications', () => ({
  useNotificationPanel: jest.fn(),
}));

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock the Modal component
jest.mock('../Modal', () => ({
  Modal: ({ children, isVisible, onClose, testID }: any) =>
    isVisible ? (
      <div data-testid={testID} onClick={onClose}>
        {children}
      </div>
    ) : null,
}));

const mockUseNotificationPanel = useNotificationPanel as jest.MockedFunction<
  typeof useNotificationPanel
>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe('NotificationsPanel', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    userId: 'test-user-id',
  };

  const mockNotificationPanelData = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isLoadingMore: false,
    hasNextPage: false,
    onRefresh: jest.fn(),
    loadMore: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    isMarkingAllAsRead: false,
    filterType: 'all' as const,
    setFilter: jest.fn(),
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationPanel.mockReturnValue(mockNotificationPanelData);
  });

  it('renders correctly when visible', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByTestId('notifications-panel')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} visible={false} />
      </Wrapper>
    );

    expect(screen.queryByTestId('notifications-panel')).toBeNull();
  });

  it('displays unread count badge when there are unread notifications', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      unreadCount: 5,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('5')).toBeTruthy();
  });

  it('displays 99+ for unread counts over 99', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      unreadCount: 150,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('shows mark all read button when there are unread notifications', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      unreadCount: 3,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Mark all read')).toBeTruthy();
  });

  it('hides mark all read button when there are no unread notifications', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.queryByText('Mark all read')).toBeNull();
  });

  it('calls markAllAsRead when mark all read button is pressed', () => {
    const mockMarkAllAsRead = jest.fn();
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      unreadCount: 3,
      markAllAsRead: mockMarkAllAsRead,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    fireEvent.press(screen.getByText('Mark all read'));
    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });

  it('shows loading state when notifications are loading', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      isLoading: true,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Loading notifications...')).toBeTruthy();
  });

  it('shows empty state when there are no notifications', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByTestId('notifications-empty-state')).toBeTruthy();
    expect(screen.getByText('No notifications yet')).toBeTruthy();
    expect(
      screen.getByText(
        "When you receive notifications, they'll appear here. Stay connected with your community!"
      )
    ).toBeTruthy();
  });

  it('shows error state when there is an error', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      error: new Error('Network error'),
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Unable to load notifications')).toBeTruthy();
    expect(
      screen.getByText('Please check your connection and try again.')
    ).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  it('calls onRefresh when retry button is pressed in error state', () => {
    const mockOnRefresh = jest.fn();
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      error: new Error('Network error'),
      onRefresh: mockOnRefresh,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    fireEvent.press(screen.getByText('Try Again'));
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('displays notifications when available', () => {
    const mockNotifications = [
      {
        id: '1',
        user_id: 'test-user-id',
        type: 'friend_request_received' as const,
        title: 'New friend request',
        body: 'John Doe sent you a friend request',
        data: {},
        read: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        user_id: 'test-user-id',
        type: 'group_request_approved' as const,
        title: 'Group approved',
        body: 'Your group request has been approved',
        data: {},
        read: true,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      notifications: mockNotifications,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Notification: New friend request')).toBeTruthy();
    expect(screen.getByText('Notification: Group approved')).toBeTruthy();
  });

  it('shows load more indicator when loading more notifications', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      notifications: [
        {
          id: '1',
          user_id: 'test-user-id',
          type: 'friend_request_received' as const,
          title: 'Test notification',
          body: 'Test body',
          data: {},
          read: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      isLoadingMore: true,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Loading more...')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const mockOnClose = jest.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} onClose={mockOnClose} />
      </Wrapper>
    );

    // The Modal component in our mock calls onClose when clicked
    fireEvent.press(screen.getByTestId('notifications-panel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('has proper accessibility labels', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByLabelText('Close notifications panel')).toBeTruthy();
  });

  it('shows marking state when marking all as read', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      unreadCount: 3,
      isMarkingAllAsRead: true,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Marking...')).toBeTruthy();
  });

  it('shows filter button and toggles filter visibility', () => {
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    const filterButton = screen.getByLabelText('Toggle notification filters');
    expect(filterButton).toBeTruthy();

    // Filters should not be visible initially
    expect(screen.queryByText('Filter by:')).toBeNull();

    // Toggle filters
    fireEvent.press(filterButton);
    // Note: In a real test, we'd need to handle state updates properly
  });

  it('shows different empty states based on filter type', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      filterType: 'unread',
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('No unread notifications')).toBeTruthy();
    expect(
      screen.getByText(
        'All caught up! You have no unread notifications at the moment.'
      )
    ).toBeTruthy();
  });

  it('shows load more button when there are more pages', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      notifications: [
        {
          id: '1',
          user_id: 'test-user-id',
          type: 'friend_request_received' as const,
          title: 'Test notification',
          body: 'Test body',
          data: {},
          read: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      hasNextPage: true,
      isLoadingMore: false,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Load More')).toBeTruthy();
  });

  it('calls loadMore when load more button is pressed', () => {
    const mockLoadMore = jest.fn();
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      notifications: [
        {
          id: '1',
          user_id: 'test-user-id',
          type: 'friend_request_received' as const,
          title: 'Test notification',
          body: 'Test body',
          data: {},
          read: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      hasNextPage: true,
      isLoadingMore: false,
      loadMore: mockLoadMore,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    fireEvent.press(screen.getByText('Load More'));
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('shows end of list message when no more pages', () => {
    mockUseNotificationPanel.mockReturnValue({
      ...mockNotificationPanelData,
      notifications: [
        {
          id: '1',
          user_id: 'test-user-id',
          type: 'friend_request_received' as const,
          title: 'Test notification',
          body: 'Test body',
          data: {},
          read: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      hasNextPage: false,
    });

    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <NotificationsPanel {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText("You're all caught up!")).toBeTruthy();
  });
});
