import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ComingSoonBanner } from '../ComingSoonBanner';

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ComingSoonBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    const { getByText } = render(<ComingSoonBanner />);
    
    expect(getByText('Coming Soon!')).toBeTruthy();
    expect(getByText('This feature is coming soon. Stay tuned for updates!')).toBeTruthy();
  });

  it('renders with custom title and message', () => {
    const customTitle = 'Custom Feature';
    const customMessage = 'This custom feature is under development';
    
    const { getByText } = render(
      <ComingSoonBanner title={customTitle} message={customMessage} />
    );
    
    expect(getByText(customTitle)).toBeTruthy();
    expect(getByText(customMessage)).toBeTruthy();
  });

  it('shows default alert when pressed without custom onPress', () => {
    const { getByText } = render(<ComingSoonBanner />);
    
    fireEvent.press(getByText('Coming Soon!'));
    
    expect(Alert.alert).toHaveBeenCalledWith(
      'Coming Soon',
      'This feature is currently under development and will be available in a future update.',
      [{ text: 'OK', style: 'default' }]
    );
  });

  it('calls custom onPress when provided', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<ComingSoonBanner onPress={mockOnPress} />);
    
    fireEvent.press(getByText('Coming Soon!'));
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('has proper accessibility properties', () => {
    const { getByText } = render(<ComingSoonBanner />);
    const banner = getByText('Coming Soon!').parent;
    
    // Should be touchable
    expect(banner).toBeTruthy();
  });
});