import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserManagementCard } from '../UserManagementCard';
import type { UserWithGroupStatus } from '@/services/admin';

// Mock the admin service
jest.mock('@/services/admin', () => ({
  userAdminService: {
    getUserGroupHistory: jest.fn(),
  },
}));

const mockUser: UserWithGroupStatus = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar_url: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  church_id: 'church1',
  service_id: 'service1',
  roles: ['member'],
  interests: [],
  meeting_night_preference: 'any',
  group_count: 2,
  is_connected: true,
  last_activity: '2023-12-01T00:00:00Z',
  church: {
    id: 'church1',
    name: 'Test Church',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  service: {
    id: 'service1',
    name: 'Morning Service',
    church_id: 'church1',
    time: '09:00',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('UserManagementCard', () => {
  it('renders user information correctly', () => {
    renderWithQueryClient(<UserManagementCard user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(screen.getByText('2 groups')).toBeTruthy();
    expect(screen.getByText('Test Church')).toBeTruthy();
    expect(screen.getByText('Morning Service')).toBeTruthy();
  });

  it('shows unconnected status for users with no groups', () => {
    const unconnectedUser = {
      ...mockUser,
      group_count: 0,
      is_connected: false,
    };

    renderWithQueryClient(<UserManagementCard user={unconnectedUser} />);

    expect(screen.getByText('Unconnected')).toBeTruthy();
    expect(screen.getByText('0 groups')).toBeTruthy();
  });

  it('renders action buttons', () => {
    renderWithQueryClient(<UserManagementCard user={mockUser} />);

    expect(screen.getByText('View History')).toBeTruthy();
    expect(screen.getByText('Contact')).toBeTruthy();
  });
});
