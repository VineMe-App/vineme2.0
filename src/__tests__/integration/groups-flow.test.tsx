import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GroupsScreen from '@/app/(tabs)/groups';
import * as groupsService from '@/services/groups';

// Mock the groups service
jest.mock('@/services/groups');
const mockGroupsService = groupsService as jest.Mocked<typeof groupsService>;

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock the auth store
const mockAuthStore = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    church_id: 'church-1',
  },
  isAuthenticated: true,
  isLoading: false,
};

jest.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

const mockGroups = [
  {
    id: 'group-1',
    title: 'Young Adults Bible Study',
    description: 'Weekly Bible study for young adults',
    meeting_day: 'Wednesday',
    meeting_time: '19:00',
    location: { address: '123 Church St' },
    member_count: 12,
    service: { name: 'Evening Service' },
    church: { name: 'First Baptist Church' },
  },
  {
    id: 'group-2',
    title: 'Prayer Group',
    description: 'Weekly prayer meeting',
    meeting_day: 'Friday',
    meeting_time: '18:00',
    location: { address: '456 Faith Ave' },
    member_count: 8,
    service: { name: 'Morning Service' },
    church: { name: 'First Baptist Church' },
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Groups Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and display groups', async () => {
    mockGroupsService.getGroupsByChurch.mockResolvedValue({
      data: mockGroups,
      error: null,
    });

    renderWithProviders(<GroupsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Young Adults Bible Study')).toBeTruthy();
      expect(screen.getByText('Prayer Group')).toBeTruthy();
    });

    expect(mockGroupsService.getGroupsByChurch).toHaveBeenCalledWith('church-1');
  });

  it('should handle groups loading error', async () => {
    mockGroupsService.getGroupsByChurch.mockResolvedValue({
      data: null,
      error: new Error('Failed to load groups'),
    });

    renderWithProviders(<GroupsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load groups')).toBeTruthy();
    });
  });

  it('should navigate to group detail when group is pressed', async () => {
    mockGroupsService.getGroupsByChurch.mockResolvedValue({
      data: mockGroups,
      error: null,
    });

    renderWithProviders(<GroupsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Young Adults Bible Study')).toBeTruthy();
    });

    const groupCard = screen.getByTestId('group-card-group-1');
    fireEvent.press(groupCard);

    expect(mockPush).toHaveBeenCalledWith('/group/group-1');
  });

  it('should handle search functionality', async () => {
    mockGroupsService.getGroupsByChurch.mockResolvedValue({
      data: mockGroups,
      error: null,
    });

    mockGroupsService.searchGroups.mockResolvedValue({
      data: [mockGroups[0]], // Only return first group for search
      error: null,
    });

    renderWithProviders(<GroupsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Young Adults Bible Study')).toBeTruthy();
      expect(screen.getByText('Prayer Group')).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText('Search groups...');
    fireEvent.changeText(searchInput, 'Bible');

    await waitFor(() => {
      expect(mockGroupsService.searchGroups).toHaveBeenCalledWith('Bible');
    });

    await waitFor(() => {
      expect(screen.getByText('Young Adults Bible Study')).toBeTruthy();
      expect(screen.queryByText('Prayer Group')).toBeNull();
    });
  });

  it('should show empty state when no groups found', async () => {
    mockGroupsService.getGroupsByChurch.mockResolvedValue({
      data: [],
      error: null,
    });

    renderWithProviders(<GroupsScreen />);

    await waitFor(() => {
      expect(screen.getByText('No groups found')).toBeTruthy();
      expect(screen.getByText('There are no groups available at this time.')).toBeTruthy();
    });
  });

  it('should show loading state while fetching groups', () => {
    mockGroupsService.getGroupsByChurch.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        data: mockGroups,
        error: null,
      }), 100))
    );

    renderWithProviders(<GroupsScreen />);

    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should handle join group action', async () => {
    mockGroupsService.getGroupsByChurch.mockResolvedValue({
      data: mockGroups,
      error: null,
    });

    mockGroupsService.joinGroup.mockResolvedValue({
      data: { id: 'membership-1', group_id: 'group-1', user_id: 'user-1' },
      error: null,
    });

    renderWithProviders(<GroupsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Young Adults Bible Study')).toBeTruthy();
    });

    const joinButton = screen.getByTestId('join-group-group-1');
    fireEvent.press(joinButton);

    await waitFor(() => {
      expect(mockGroupsService.joinGroup).toHaveBeenCalledWith('group-1', 'user-1');
    });
  });
});