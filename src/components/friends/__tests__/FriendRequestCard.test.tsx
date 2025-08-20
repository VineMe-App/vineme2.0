import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { FriendRequestCard } from '../FriendRequestCard';
import { FriendRequest } from '@/types';

const mockFriendRequest: FriendRequest = {
  id: 'request-1',
  user_id: 'user-1',
  friend_id: 'user-2',
  status: 'pending',
  created_at: '2024-01-01T00:00:00Z',
  user: {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    church_id: 'church-1',
    service_id: 'service-1',
    roles: ['user'],
    created_at: '2024-01-01T00:00:00Z',
  },
};

const mockOnAccept = jest.fn();
const mockOnReject = jest.fn();

describe('FriendRequestCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render friend request information correctly', () => {
    render(
      <FriendRequestCard
        request={mockFriendRequest}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('wants to be your friend')).toBeTruthy();
    expect(screen.getByText('Accept')).toBeTruthy();
    expect(screen.getByText('Decline')).toBeTruthy();
  });

  it('should call onAccept when accept button is pressed', async () => {
    render(
      <FriendRequestCard
        request={mockFriendRequest}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const acceptButton = screen.getByText('Accept');
    fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalledWith('request-1');
    });
  });

  it('should call onReject when decline button is pressed', async () => {
    render(
      <FriendRequestCard
        request={mockFriendRequest}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const declineButton = screen.getByText('Decline');
    fireEvent.press(declineButton);

    await waitFor(() => {
      expect(mockOnReject).toHaveBeenCalledWith('request-1');
    });
  });

  it('should display loading state when processing', () => {
    render(
      <FriendRequestCard
        request={mockFriendRequest}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        isLoading={true}
      />
    );

    const acceptButton = screen.getByTestId('accept-button');
    const declineButton = screen.getByTestId('decline-button');

    expect(acceptButton.props.disabled).toBe(true);
    expect(declineButton.props.disabled).toBe(true);
  });

  it('should display user avatar when available', () => {
    render(
      <FriendRequestCard
        request={mockFriendRequest}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const avatar = screen.getByTestId('request-avatar-user-1');
    expect(avatar).toBeTruthy();
  });
});
