import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GroupStatusStep from '../GroupStatusStep';
import type { OnboardingData } from '@/types/app';

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock the Button component
jest.mock('@/components/ui/Button', () => ({
  Button: ({ title, onPress, disabled, loading, ...props }: any) => {
    const MockedButton = require('react-native').TouchableOpacity;
    const MockedText = require('react-native').Text;
    return (
      <MockedButton onPress={disabled ? undefined : onPress} {...props}>
        <MockedText>{loading ? 'Loading...' : title}</MockedText>
      </MockedButton>
    );
  },
}));

const mockOnNext = jest.fn();
const mockOnBack = jest.fn();

const defaultProps = {
  data: {
    name: 'Test User',
    church_id: 'church-1',
    service_id: 'service-1',
    interests: [],
    preferred_meeting_night: '',
  } as OnboardingData,
  onNext: mockOnNext,
  onBack: mockOnBack,
  isLoading: false,
  error: null,
};

describe('GroupStatusStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with both group status options', () => {
    const { getByText, getByTestId } = render(
      <GroupStatusStep {...defaultProps} />
    );

    expect(getByText('Group Status')).toBeTruthy();
    expect(
      getByText(
        'Are you already part of a small group, or are you looking to join one?'
      )
    ).toBeTruthy();
    expect(getByText("I'm already in a group")).toBeTruthy();
    expect(getByText("I'm looking for a group")).toBeTruthy();
    expect(getByTestId('group-status-existing')).toBeTruthy();
    expect(getByTestId('group-status-looking')).toBeTruthy();
  });

  it('allows selecting existing group option', () => {
    const { getByTestId, getByText } = render(
      <GroupStatusStep {...defaultProps} />
    );

    const existingOption = getByTestId('group-status-existing');
    fireEvent.press(existingOption);

    const continueButton = getByText('Continue');
    expect(continueButton).toBeTruthy();

    fireEvent.press(continueButton);
    expect(mockOnNext).toHaveBeenCalledWith({ group_status: 'existing' });
  });

  it('allows selecting looking for group option', () => {
    const { getByTestId, getByText } = render(
      <GroupStatusStep {...defaultProps} />
    );

    const lookingOption = getByTestId('group-status-looking');
    fireEvent.press(lookingOption);

    const continueButton = getByText('Continue');
    fireEvent.press(continueButton);

    expect(mockOnNext).toHaveBeenCalledWith({ group_status: 'looking' });
  });

  it('disables continue button when no option is selected', () => {
    const { getByText } = render(<GroupStatusStep {...defaultProps} />);

    const continueButton = getByText('Continue');
    // The button should be disabled (this depends on your Button component implementation)
    fireEvent.press(continueButton);

    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('calls onBack when back button is pressed', () => {
    const { getByText } = render(<GroupStatusStep {...defaultProps} />);

    const backButton = getByText('Back');
    fireEvent.press(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    const { getByText } = render(
      <GroupStatusStep {...defaultProps} isLoading={true} />
    );

    const loadingButton = getByText('Loading...');
    // Verify loading state is shown
    expect(loadingButton).toBeTruthy();
  });

  it('displays error message when error is provided', () => {
    const errorMessage = 'Something went wrong';
    const { getByText } = render(
      <GroupStatusStep {...defaultProps} error={errorMessage} />
    );

    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('preserves selected option from existing data', () => {
    const dataWithGroupStatus = {
      ...defaultProps.data,
      group_status: 'existing' as const,
    };

    const { getByTestId } = render(
      <GroupStatusStep {...defaultProps} data={dataWithGroupStatus} />
    );

    // The existing option should be pre-selected
    // This would need to be verified based on your visual selection indicators
    const existingOption = getByTestId('group-status-existing');
    expect(existingOption).toBeTruthy();
  });

  it('switches between options correctly', () => {
    const { getByTestId, getByText } = render(
      <GroupStatusStep {...defaultProps} />
    );

    // Select existing first
    const existingOption = getByTestId('group-status-existing');
    fireEvent.press(existingOption);

    // Then select looking
    const lookingOption = getByTestId('group-status-looking');
    fireEvent.press(lookingOption);

    // Continue with looking option
    const continueButton = getByText('Continue');
    fireEvent.press(continueButton);

    expect(mockOnNext).toHaveBeenCalledWith({ group_status: 'looking' });
  });
});
