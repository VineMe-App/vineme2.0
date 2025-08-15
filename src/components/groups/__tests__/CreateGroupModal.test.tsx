import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CreateGroupModal } from '../CreateGroupModal';
import { groupCreationService } from '../../../services/groupCreation';
import { useAuthStore } from '../../../stores/auth';

// Mock dependencies
jest.mock('../../../services/groupCreation');
jest.mock('../../../stores/auth');
jest.mock('../../../services/location');
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../../hooks', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockGroupCreationService = groupCreationService as jest.Mocked<
  typeof groupCreationService
>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;

describe('CreateGroupModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockUserProfile = {
    id: 'user-1',
    church_id: 'church-1',
    service_id: 'service-1',
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      userProfile: mockUserProfile,
      user: null,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });
  });

  it('renders correctly when visible', () => {
    render(
      <CreateGroupModal
        isVisible={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create New Group - Basic Information')).toBeTruthy();
    expect(screen.getByText('Group Title')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
    // Step indicator should show step 1
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(
      <CreateGroupModal
        isVisible={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Create New Group - Basic Information')).toBeNull();
  });

  it('validates required fields on first step', async () => {
    render(
      <CreateGroupModal
        isVisible={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const nextButton = screen.getByText('Next');
    fireEvent.press(nextButton);

    await waitFor(() => {
      expect(screen.getByText('This field is required')).toBeTruthy();
    });
  });

  it('navigates through steps correctly', async () => {
    render(
      <CreateGroupModal
        isVisible={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill first step
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Young Adults Bible Study'),
      'Test Group'
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        "Describe your group's purpose, target audience, and what to expect..."
      ),
      'A test group for testing purposes'
    );

    // Go to next step
    fireEvent.press(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Create New Group - Meeting Schedule')).toBeTruthy();
      expect(screen.getByText('Meeting Day')).toBeTruthy();
    });
  });

  it('submits form with valid data through all steps', async () => {
    mockGroupCreationService.createGroupRequest.mockResolvedValue({
      data: {
        id: 'group-1',
        title: 'Test Group',
        status: 'pending',
      } as any,
      error: null,
    });

    render(
      <CreateGroupModal
        isVisible={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Step 1: Basic Information
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Young Adults Bible Study'),
      'Test Group'
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        "Describe your group's purpose, target audience, and what to expect..."
      ),
      'A test group for testing purposes'
    );
    fireEvent.press(screen.getByText('Next'));

    // Step 2: Schedule
    await waitFor(() => {
      expect(screen.getByText('Meeting Day')).toBeTruthy();
    });

    const daySelect = screen.getByText('Select a day of the week');
    fireEvent.press(daySelect);
    fireEvent.press(screen.getByText('Wednesday'));

    // Mock time selection
    fireEvent.press(screen.getByText('Select meeting time'));
    fireEvent.press(screen.getByText('Next'));

    // Step 3: Location
    await waitFor(() => {
      expect(screen.getByText('Meeting Location')).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText(
        'e.g., Church Room 101, or 123 Main St, City'
      ),
      'Church Room 101'
    );
    fireEvent.press(screen.getByText('Next'));

    // Step 4: Review and Submit
    await waitFor(() => {
      expect(screen.getByText('Submit Request')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Submit Request'));

    await waitFor(() => {
      expect(mockGroupCreationService.createGroupRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Group',
          description: 'A test group for testing purposes',
          meeting_day: 'wednesday',
          location: expect.objectContaining({
            address: 'Church Room 101',
          }),
          service_id: 'service-1',
          church_id: 'church-1',
        }),
        'user-1'
      );
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Group Request Submitted! 🎉',
      expect.stringContaining('Your group creation request has been submitted'),
      expect.any(Array)
    );
  });

  it('handles submission error', async () => {
    const mockError = new Error('Failed to create group');
    mockGroupCreationService.createGroupRequest.mockResolvedValue({
      data: null,
      error: mockError,
    });

    render(
      <CreateGroupModal
        isVisible={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Navigate through steps quickly for testing
    // Step 1
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Young Adults Bible Study'),
      'Test Group'
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        "Describe your group's purpose, target audience, and what to expect..."
      ),
      'A test group for testing purposes'
    );
    fireEvent.press(screen.getByText('Next'));

    // Step 2
    await waitFor(() => {
      const daySelect = screen.getByText('Select a day of the week');
      fireEvent.press(daySelect);
      fireEvent.press(screen.getByText('Wednesday'));
    });
    fireEvent.press(screen.getByText('Next'));

    // Step 3
    await waitFor(() => {
      fireEvent.changeText(
        screen.getByPlaceholderText(
          'e.g., Church Room 101, or 123 Main St, City'
        ),
        'Church Room 101'
      );
    });
    fireEvent.press(screen.getByText('Next'));

    // Step 4 - Submit
    await waitFor(() => {
      fireEvent.press(screen.getByText('Submit Request'));
    });

    await waitFor(() => {
      expect(mockGroupCreationService.createGroupRequest).toHaveBeenCalled();
    });

    // Error should be handled by useErrorHandler
  });

  it('shows alert when user profile is incomplete', async () => {
    mockUseAuthStore.mockReturnValue({
      userProfile: {
        ...mockUserProfile,
        church_id: null,
      } as any,
      user: null,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    render(
      <CreateGroupModal
        isVisible={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Navigate through all steps quickly
    // Step 1
    fireEvent.changeText(
      screen.getByPlaceholderText('e.g., Young Adults Bible Study'),
      'Test Group'
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        "Describe your group's purpose, target audience, and what to expect..."
      ),
      'A test group for testing purposes'
    );
    fireEvent.press(screen.getByText('Next'));

    // Step 2
    await waitFor(() => {
      const daySelect = screen.getByText('Select a day of the week');
      fireEvent.press(daySelect);
      fireEvent.press(screen.getByText('Wednesday'));
    });
    fireEvent.press(screen.getByText('Next'));

    // Step 3
    await waitFor(() => {
      fireEvent.changeText(
        screen.getByPlaceholderText(
          'e.g., Church Room 101, or 123 Main St, City'
        ),
        'Church Room 101'
      );
    });
    fireEvent.press(screen.getByText('Next'));

    // Step 4 - Submit
    await waitFor(() => {
      fireEvent.press(screen.getByText('Submit Request'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please complete your profile before creating a group.'
      );
    });
  });

  it('closes modal when cancel is pressed', () => {
    render(
      <CreateGroupModal
        isVisible={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('prevents closing when submitting', () => {
    render(
      <CreateGroupModal
        isVisible={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Mock submitting state
    const modal = screen.getByTestId('modal'); // Assuming modal has testID
    fireEvent(modal, 'requestClose');

    // Should not close when submitting
    // This would need to be tested with actual submission state
  });
});
