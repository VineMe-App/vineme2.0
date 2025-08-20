import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ConnectSomeoneSection } from '../ConnectSomeoneSection';

describe('ConnectSomeoneSection', () => {
  it('renders correctly', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <ConnectSomeoneSection onPress={mockOnPress} />
    );

    expect(getByText('Connect someone else in')).toBeTruthy();
    expect(getByText('Help someone join our community')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <ConnectSomeoneSection onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Connect someone else in'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility properties', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ConnectSomeoneSection onPress={mockOnPress} />
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();
  });
});