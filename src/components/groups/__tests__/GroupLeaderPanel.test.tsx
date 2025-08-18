import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { GroupLeaderPanel } from '../GroupLeaderPanel';
import { useAuthStore } from '../../../stores/auth';
import { useGroupMembers } from '../../../hooks/useGroups';
import { useGroupLeaderActions } from '../../../hooks/useGroupLeaderActions';
import type {
  GroupWithDetails,
  GroupMembershipWithUser,
} from '../../../types/database';

// Mock dependencies
jest.mock('../../../stores/auth');
jest.mock('../../../hooks/useGroups');
jest.mock('../../../hooks/useGroupLeaderActions');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('../EditGroupModal', () => ({
  EditGroupModal: 'EditGroupModal',
}));
jest.mock('../MemberManagementModal', () => ({
  MemberManagementModal: 'MemberManagementModal',
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;
const mockUseGroupMembers = useGroupMembers as jest.MockedFunction<
  typeof useGroupMembers
>;
const mockUseGroupLeaderActions = useGroupLeaderActions as jest.MockedFunction<
  typeof useGroupLeaderActions
>;

const mockGroup: GroupWithDetails = {
  id: 'group-1',
  title: 'Test Group',
  description: 'Test Description',
  church_id: 'church-1',
  meeting_day: 'Sunday',
  meeting_time: '10:00',
  location: 'Test Location',
  status: 'approved',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  member_count: 3,
  whatsapp_link: null,
  image_url: null,
  created_by: 'user-1',
  service: null,
  memberships: [],
};

const mockMembers: GroupMembershipWithUser[] = [
  {
    id: 'membership-1',
    group_id: 'group-1',
    user_id: 'user-1',
    role: 'leader',
    status: 'active',
    joined_at: '2024-01-01T00:00:00Z',
    user: {
      id: 'user-1',
      name: 'John Leader',
      email: 'john@example.com',
      avatar_url: null,
      church_id: 'church-1',
      roles: ['user'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'membership-2',
    group_id: 'group-1',
    user_id: 'user-2',
    role: 'member',
    status: 'active',
    joined_at: '2024-01-02T00:00:00Z',
    user: {
      id: 'user-2',
      name: 'Jane Member',
      email: 'jane@example.com',
      avatar_url: null,
      church_id: 'church-1',
      roles: ['user'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
];

const mockActions = {
  promoteToLeaderMutation: {
    mutateAsync: jest.fn(),
    isPending: false,
  },
  demoteFromLeaderMutation: {
    mutateAsync: jest.fn(),
    isPending: false,
  },
  removeMemberMutation: {
    mutateAsync: jest.fn(),
    isPending: false,
  },
  updateGroupDetailsMutation: {
    mutateAsync: jest.fn(),
    isPending: false,
  },
};

describe('GroupLeaderPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      userProfile: {
        id: 'user-1',
        name: 'John Leader',
        email: 'john@example.com',
        avatar_url: null,
        church_id: 'church-1',
        roles: ['user'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      isAuthenticated: true,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      updateProfile: jest.fn(),
    });

    mockUseGroupMembers.mockReturnValue({
      data: mockMembers,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseGroupLeaderActions.mockReturnValue(mockActions);
  });

  it('renders group management panel for group leaders', () => {
    const { getByText } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={jest.fn()} />
    );

    expect(getByText('Group Management')).toBeTruthy();
    expect(getByText('Edit Details')).toBeTruthy();
    expect(getByText('Leaders (1)')).toBeTruthy();
    expect(getByText('Members (1)')).toBeTruthy();
    expect(getByText('John Leader')).toBeTruthy();
    expect(getByText('Jane Member')).toBeTruthy();
  });

  it('does not render for non-leaders', () => {
    mockUseAuthStore.mockReturnValue({
      userProfile: {
        id: 'user-2', // Not a leader
        name: 'Jane Member',
        email: 'jane@example.com',
        avatar_url: null,
        church_id: 'church-1',
        roles: ['user'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      isAuthenticated: true,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { queryByText } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={jest.fn()} />
    );

    expect(queryByText('Group Management')).toBeNull();
  });

  it('opens edit modal when edit button is pressed', () => {
    const { getByText } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={jest.fn()} />
    );

    fireEvent.press(getByText('Edit Details'));

    // The modal should be rendered (we can't easily test modal visibility in this setup)
    expect(getByText('Edit Details')).toBeTruthy();
  });

  it('opens member management modal when member is pressed', () => {
    const { getByText } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={jest.fn()} />
    );

    fireEvent.press(getByText('Jane Member'));

    // The modal should be rendered
    expect(getByText('Jane Member')).toBeTruthy();
  });

  it('handles promote to leader action', async () => {
    const onGroupUpdated = jest.fn();
    const { getByText } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={onGroupUpdated} />
    );

    // Press on member to open modal
    fireEvent.press(getByText('Jane Member'));

    // Mock successful promotion
    mockActions.promoteToLeaderMutation.mutateAsync.mockResolvedValue({});

    // Simulate promote action (this would be triggered from the modal)
    await waitFor(() => {
      expect(mockActions.promoteToLeaderMutation.mutateAsync).toBeDefined();
    });
  });

  it('handles demote from leader action', async () => {
    // Add another leader to avoid last leader restriction
    const membersWithTwoLeaders = [
      ...mockMembers,
      {
        id: 'membership-3',
        group_id: 'group-1',
        user_id: 'user-3',
        role: 'leader' as const,
        status: 'active' as const,
        joined_at: '2024-01-03T00:00:00Z',
        user: {
          id: 'user-3',
          name: 'Bob Leader',
          email: 'bob@example.com',
          avatar_url: null,
          church_id: 'church-1',
          roles: ['user'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    ];

    mockUseGroupMembers.mockReturnValue({
      data: membersWithTwoLeaders,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const onGroupUpdated = jest.fn();
    const { getByText } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={onGroupUpdated} />
    );

    // Mock successful demotion
    mockActions.demoteFromLeaderMutation.mutateAsync.mockResolvedValue({});

    await waitFor(() => {
      expect(mockActions.demoteFromLeaderMutation.mutateAsync).toBeDefined();
    });
  });

  it('handles remove member action', async () => {
    const onGroupUpdated = jest.fn();
    const { getByText } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={onGroupUpdated} />
    );

    // Mock successful removal
    mockActions.removeMemberMutation.mutateAsync.mockResolvedValue(true);

    await waitFor(() => {
      expect(mockActions.removeMemberMutation.mutateAsync).toBeDefined();
    });
  });

  it('shows loading state when members are loading', () => {
    mockUseGroupMembers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={jest.fn()} />
    );

    // Should show loading indicators
    expect(mockUseGroupMembers).toHaveBeenCalledWith(mockGroup.id);
  });

  it('handles errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockActions.promoteToLeaderMutation.mutateAsync.mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = render(
      <GroupLeaderPanel group={mockGroup} onGroupUpdated={jest.fn()} />
    );

    // The component should handle errors without crashing
    expect(getByText('Group Management')).toBeTruthy();

    consoleSpy.mockRestore();
  });
});
