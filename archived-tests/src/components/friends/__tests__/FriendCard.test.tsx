import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FriendCard } from '../FriendCard';
import { User } from '@/types';

const mockFriend: User = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  church_id: 'church-1',
  service_id: 'service-1',
  roles: ['user'],
  created_at: '2024-01-01T00:00:00Z',
};

const mockOnMessage = jest.fn();

describe('FriendCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render friend information correctly', () => {
    render(<FriendCard friend={mockFriend} onMessage={mockOnMessage} />);

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
  });

  it('should call onMessage when message button is pressed', () => {
    render(<FriendCard friend={mockFriend} onMessage={mockOnMessage} />);

    const messageButton = screen.getByText('Message');
    fireEvent.press(messageButton);

    expect(mockOnMessage).toHaveBeenCalledWith(mockFriend);
  });

  it('should display avatar when available', () => {
    render(<FriendCard friend={mockFriend} onMessage={mockOnMessage} />);

    const avatar = screen.getByTestId('friend-avatar-user-1');
    expect(avatar).toBeTruthy();
  });

  it('should handle friend without avatar', () => {
    const friendWithoutAvatar = { ...mockFriend, avatar_url: null };
    render(
      <FriendCard friend={friendWithoutAvatar} onMessage={mockOnMessage} />
    );

    const avatar = screen.getByTestId('friend-avatar-user-1');
    expect(avatar).toBeTruthy();
  });

  it('should be accessible', () => {
    render(<FriendCard friend={mockFriend} onMessage={mockOnMessage} />);

    const card = screen.getByTestId('friend-card-user-1');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toContain('John Doe');
  });
});
