import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/app/_layout';
import * as authService from '@/services/auth';
import * as groupsService from '@/services/groups';
import * as eventsService from '@/services/events';

// Mock all services
jest.mock('@/services/auth');
jest.mock('@/services/groups');
jest.mock('@/services/events');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockGroupsService = groupsService as jest.Mocked<typeof groupsService>;
const mockEventsService = eventsService as jest.Mocked<typeof eventsService>;

// Mock expo-router
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  Stack: ({ children }: any) => children,
  Tabs: ({ children }: any) => children,
}));

// Mock auth store
let mockUser: any = null;
const mockAuthStore = {
  get user() {
    return mockUser;
  },
  get isAuthenticated() {
    return !!mockUser;
  },
  isLoading: false,
  setUser: jest.fn((user) => {
    mockUser = user;
  }),
  setLoading: jest.fn(),
  clearUser: jest.fn(() => {
    mockUser = null;
  }),
};

jest.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

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
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('Complete User Journey E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
  });

  it('should complete full user journey: sign in -> browse groups -> join group -> view events', async () => {
    // Mock user data
    const testUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      church_id: 'church-1',
    };

    const testGroups = [
      {
        id: 'group-1',
        title: 'Bible Study Group',
        description: 'Weekly Bible study',
        meeting_day: 'Wednesday',
        meeting_time: '19:00',
        member_count: 10,
      },
    ];

    const testEvents = [
      {
        id: 'event-1',
        title: 'Church Picnic',
        description: 'Annual church picnic',
        start_date: '2024-06-15T12:00:00Z',
        host: { name: 'Pastor John' },
      },
    ];

    // Mock service responses
    mockAuthService.signIn.mockResolvedValue({
      data: { user: testUser, session: { access_token: 'token' } },
      error: null,
    });

    mockGroupsService.getGroupsByChurch.mockResolvedValue({
      data: testGroups,
      error: null,
    });

    mockGroupsService.joinGroup.mockResolvedValue({
      data: { id: 'membership-1', group_id: 'group-1', user_id: 'user-1' },
      error: null,
    });

    mockEventsService.getEventsByChurch.mockResolvedValue({
      data: testEvents,
      error: null,
    });

    // Start the journey
    renderWithProviders(<App />);

    // Step 1: Sign in
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    // Verify sign in was called
    await waitFor(() => {
      expect(mockAuthService.signIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    // Step 2: Navigate to Groups tab
    await waitFor(() => {
      expect(screen.getByText('Groups')).toBeTruthy();
    });

    const groupsTab = screen.getByText('Groups');
    fireEvent.press(groupsTab);

    // Step 3: Browse and join a group
    await waitFor(() => {
      expect(screen.getByText('Bible Study Group')).toBeTruthy();
    });

    const joinButton = screen.getByTestId('join-group-group-1');
    fireEvent.press(joinButton);

    await waitFor(() => {
      expect(mockGroupsService.joinGroup).toHaveBeenCalledWith(
        'group-1',
        'user-1'
      );
    });

    // Step 4: Navigate to Events tab
    const eventsTab = screen.getByText('Events');
    fireEvent.press(eventsTab);

    // Step 5: View events
    await waitFor(() => {
      expect(screen.getByText('Church Picnic')).toBeTruthy();
      expect(screen.getByText('Annual church picnic')).toBeTruthy();
    });

    // Verify all services were called correctly
    expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
    expect(mockGroupsService.getGroupsByChurch).toHaveBeenCalledWith(
      'church-1'
    );
    expect(mockGroupsService.joinGroup).toHaveBeenCalledWith(
      'group-1',
      'user-1'
    );
    expect(mockEventsService.getEventsByChurch).toHaveBeenCalledWith(
      'church-1'
    );
  });

  it('should handle error states gracefully throughout the journey', async () => {
    // Mock authentication failure
    mockAuthService.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Invalid credentials'),
    });

    renderWithProviders(<App />);

    // Attempt sign in with wrong credentials
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(signInButton);

    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });

    // User should still be on sign in screen
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('should handle offline state during user journey', async () => {
    // Mock network error
    mockAuthService.signIn.mockRejectedValue(
      new Error('Network request failed')
    );

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    // Should show network error
    await waitFor(() => {
      expect(screen.getByText('Network request failed')).toBeTruthy();
    });
  });

  it('should maintain user session across app restarts', async () => {
    const testUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      church_id: 'church-1',
    };

    // Mock existing session
    mockAuthService.getCurrentUser.mockResolvedValue(testUser);
    mockUser = testUser; // Set user as already authenticated

    renderWithProviders(<App />);

    // Should skip sign in and go directly to main app
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('Groups')).toBeTruthy();
      expect(screen.getByText('Events')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
    });

    expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
  });
});
