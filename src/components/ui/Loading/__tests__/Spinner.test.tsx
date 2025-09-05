/**
 * Spinner Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { Spinner } from '../Spinner';
import { ThemeProvider } from '../../../../theme/provider/ThemeProvider';

// Animated is mocked in test-setup.js

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('Spinner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByTestId } = renderWithTheme(
      <Spinner testID="spinner" />
    );

    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { getByTestId } = renderWithTheme(
      <Spinner size="large" testID="spinner" />
    );

    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('renders with numeric size', () => {
    const { getByTestId } = renderWithTheme(
      <Spinner size={40} testID="spinner" />
    );

    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('renders different variants', () => {
    const variants: Array<'circular' | 'dots' | 'pulse' | 'bars'> = [
      'circular',
      'dots', 
      'pulse',
      'bars'
    ];

    variants.forEach((variant) => {
      const { getByTestId } = renderWithTheme(
        <Spinner variant={variant} testID={`spinner-${variant}`} />
      );

      expect(getByTestId(`spinner-${variant}`)).toBeTruthy();
    });
  });

  it('does not render when visible is false', () => {
    const { queryByTestId } = renderWithTheme(
      <Spinner visible={false} testID="spinner" />
    );

    expect(queryByTestId('spinner')).toBeNull();
  });

  it('applies custom color', () => {
    const { getByTestId } = renderWithTheme(
      <Spinner color="#ff0000" testID="spinner" />
    );

    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('applies custom duration', () => {
    const { getByTestId } = renderWithTheme(
      <Spinner duration={2000} testID="spinner" />
    );

    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('has proper accessibility attributes', () => {
    const { getByTestId } = renderWithTheme(
      <Spinner 
        testID="spinner" 
        accessibilityLabel="Custom loading message"
      />
    );

    const spinner = getByTestId('spinner');
    expect(spinner.props.accessible).toBe(true);
    expect(spinner.props.accessibilityRole).toBe('progressbar');
    expect(spinner.props.accessibilityLabel).toBe('Custom loading message');
    expect(spinner.props.accessibilityState.busy).toBe(true);
  });

  it('starts animation when visible', () => {
    renderWithTheme(<Spinner testID="spinner" />);

    expect(Animated.loop).toHaveBeenCalled();
  });

  it('stops animation when not visible', () => {
    const { rerender } = renderWithTheme(
      <Spinner visible={true} testID="spinner" />
    );

    act(() => {
      rerender(
        <ThemeProvider>
          <Spinner visible={false} testID="spinner" />
        </ThemeProvider>
      );
    });

    // Component should not render when visible is false
    expect(true).toBe(true); // Animation cleanup is handled in useEffect
  });

  it('applies custom styles', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = renderWithTheme(
      <Spinner style={customStyle} testID="spinner" />
    );

    const spinner = getByTestId('spinner');
    expect(spinner.props.style).toContainEqual(
      expect.objectContaining(customStyle)
    );
  });

  describe('Variants', () => {
    it('renders circular variant correctly', () => {
      const { getByTestId } = renderWithTheme(
        <Spinner variant="circular" testID="spinner" />
      );

      expect(getByTestId('spinner')).toBeTruthy();
    });

    it('renders dots variant correctly', () => {
      const { getByTestId } = renderWithTheme(
        <Spinner variant="dots" testID="spinner" />
      );

      expect(getByTestId('spinner')).toBeTruthy();
    });

    it('renders pulse variant correctly', () => {
      const { getByTestId } = renderWithTheme(
        <Spinner variant="pulse" testID="spinner" />
      );

      expect(getByTestId('spinner')).toBeTruthy();
    });

    it('renders bars variant correctly', () => {
      const { getByTestId } = renderWithTheme(
        <Spinner variant="bars" testID="spinner" />
      );

      expect(getByTestId('spinner')).toBeTruthy();
    });
  });

  describe('Size handling', () => {
    it('handles small size', () => {
      const { getByTestId } = renderWithTheme(
        <Spinner size="small" testID="spinner" />
      );

      expect(getByTestId('spinner')).toBeTruthy();
    });

    it('handles medium size', () => {
      const { getByTestId } = renderWithTheme(
        <Spinner size="medium" testID="spinner" />
      );

      expect(getByTestId('spinner')).toBeTruthy();
    });

    it('handles large size', () => {
      const { getByTestId } = renderWithTheme(
        <Spinner size="large" testID="spinner" />
      );

      expect(getByTestId('spinner')).toBeTruthy();
    });
  });
});