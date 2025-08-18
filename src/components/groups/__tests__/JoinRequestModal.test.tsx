import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { JoinRequestModal } from '../JoinRequestModal';
import { useCreateJoinRequest } from '../../../hooks/useJoinRequests';
import type { GroupWithDetails } from '../../../types/database';

// Mock the hook
jest.mock('../../../hooks/useJoinRequests');
const mockUseCreateJoinRequest = useCreateJoinRequest as jest.MockedFunction<
  typeof useCreateJoinRequest
>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockGroup: GroupWithDetails = {
  id: 'group-1',
  title: 'Bible Study Group',
  description: 'Weekly Bible study and fellowship',
  meeting_day: 'Wednesday',
  meeting_time: '7:00 PM',
  location: { address: '123 Church St' },
  whatsapp_link: null,
  image_url: null,
  service_id: 'service-1',
  church_id: 'church-1',
  status: 'approved',
  created_at: '2024-01-01T00:00:00Z',
  member_count: 5,
};

describe('JoinRequestModal', () => {
  const mockOnClose = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateJoinRequest.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as any);
  });

  it('should render modal with group information', () => {
    const { getByText } = render(
      <JoinRequestModal
        visible={true}
        onClose={mockOnClose}
        group={mockGroup}
        userId="user-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(getByText('Request to Join Group')).toBeTruthy();
    expect(getByText('Bible Study Group')).toBeTruthy();
    expect(getByText('Weekly Bible study and fellowship')).toBeTruthy();
    expect(getByText('📅 Wednesdays at 7:00 PM')).toBeTruthy();
  });

  it('should allow user to enter message and toggle consent', () => {
    const { getByPlaceholderText, getByText } = render(
      <JoinRequestModal
        visible={true}
        onClose={mockOnClose}
        group={mockGroup}
        userId="user-1"
      />,
      { wrapper: createWrapper() }
    );

    const messageInput = getByPlaceholderText(
      "Hi! I'm interested in joining your group because..."
    );
    const consentCheckbox = getByText(
      'I consent to sharing my contact information (name and email) with the group leaders'
    );

    fireEvent.changeText(messageInput, 'I would love to join this group!');
    fireEvent.press(consentCheckbox);

    expect(messageInput.props.value).toBe('I would love to join this group!');
  });

  it('should submit join request with correct data', async () => {
    mockMutateAsync.mockResolvedValue({
      id: 'request-1',
      group_id: 'group-1',
      user_id: 'user-1',
      contact_consent: true,
      message: 'Test message',
      status: 'pending',
      created_at: '2024-01-01T00:00:00Z',
    });

    const { getByPlaceholderText, getByText } = render(
      <JoinRequestModal
        visible={true}
        onClose={mockOnClose}
        group={mockGroup}
        userId="user-1"
      />,
      { wrapper: createWrapper() }
    );

    const messageInput = getByPlaceholderText(
      "Hi! I'm interested in joining your group because..."
    );
    const consentCheckbox = getByText(
      'I consent to sharing my contact information (name and email) with the group leaders'
    );
    const submitButton = getByText('Send Request');

    fireEvent.changeText(messageInput, 'Test message');
    fireEvent.press(consentCheckbox);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        group_id: 'group-1',
        user_id: 'user-1',
        contact_consent: true,
        message: 'Test message',
      });
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Request Sent!',
      'Your join request has been sent to the group leaders. They will review it and get back to you soon.',
      [{ text: 'OK', onPress: mockOnClose }]
    );
  });

  it('should submit join request without message if empty', async () => {
    mockMutateAsync.mockResolvedValue({
      id: 'request-1',
      group_id: 'group-1',
      user_id: 'user-1',
      contact_consent: false,
      status: 'pending',
      created_at: '2024-01-01T00:00:00Z',
    });

    const { getByText } = render(
      <JoinRequestModal
        visible={true}
        onClose={mockOnClose}
        group={mockGroup}
        userId="user-1"
      />,
      { wrapper: createWrapper() }
    );

    const submitButton = getByText('Send Request');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        group_id: 'group-1',
        user_id: 'user-1',
        contact_consent: false,
        message: undefined,
      });
    });
  });

  it('should handle submission error', async () => {
    const error = new Error('User already has a pending request');
    mockMutateAsync.mockRejectedValue(error);

    const { getByText } = render(
      <JoinRequestModal
        visible={true}
        onClose={mockOnClose}
        group={mockGroup}
        userId="user-1"
      />,
      { wrapper: createWrapper() }
    );

    const submitButton = getByText('Send Request');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'User already has a pending request'
      );
    });
  });

  it('should close modal when cancel is pressed', () => {
    const { getByText } = render(
      <JoinRequestModal
        visible={true}
        onClose={mockOnClose}
        group={mockGroup}
        userId="user-1"
      />,
      { wrapper: createWrapper() }
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show loading state during submission', () => {
    mockUseCreateJoinRequest.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      isError: false,
      error: null,
    } as any);

    const { getByText } = render(
      <JoinRequestModal
        visible={true}
        onClose={mockOnClose}
        group={mockGroup}
        userId="user-1"
      />,
      { wrapper: createWrapper() }
    );

    const submitButton = getByText('Send Request');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });
});
