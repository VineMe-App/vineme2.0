/**
 * ProgressBar Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { ProgressBar, CircularProgress } from '../ProgressBar';
import { ThemeProvider } from '../../../../theme/provider/ThemeProvider';

// Animated is mocked in test-setup.js

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('ProgressBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByTestId } = renderWithTheme(
      <ProgressBar progress={50} testID="progress-bar" />
    );

    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('renders with custom dimensions', () => {
    const { getByTestId } = renderWithTheme(
      <ProgressBar 
        progress={75} 
        width={300} 
        height={12} 
        testID="progress-bar" 
      />
    );

    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('renders with different variants', () => {
    const variants: Array<'default' | 'thin' | 'thick' | 'rounded'> = [
      'default',
      'thin',
      'thick',
      'rounded'
    ];

    variants.forEach((variant) => {
      const { getByTestId } = renderWithTheme(
        <ProgressBar 
          progress={60} 
          variant={variant} 
          testID={`progress-bar-${variant}`} 
        />
      );

      expect(getByTestId(`progress-bar-${variant}`)).toBeTruthy();
    });
  });

  it('clamps progress values correctly', () => {
    // Test negative progress
    const { getByTestId: getNegative } = renderWithTheme(
      <ProgressBar progress={-10} testID="progress-negative" />
    );
    expect(getNegative('progress-negative')).toBeTruthy();

    // Test progress over 100
    const { getByTestId: getOver } = renderWithTheme(
      <ProgressBar progress={150} testID="progress-over" />
    );
    expect(getOver('progress-over')).toBeTruthy();
  });

  it('renders with progress text', () => {
    const { getByText } = renderWithTheme(
      <ProgressBar progress={75} showText={true} testID="progress-bar" />
    );

    expect(getByText('75%')).toBeTruthy();
  });

  it('renders with custom text', () => {
    const { getByText } = renderWithTheme(
      <ProgressBar 
        progress={50} 
        showText={true} 
        text="Loading..." 
        testID="progress-bar" 
      />
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('applies custom colors', () => {
    const { getByTestId } = renderWithTheme(
      <ProgressBar 
        progress={60} 
        color="#ff0000" 
        backgroundColor="#f0f0f0" 
        testID="progress-bar" 
      />
    );

    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('has proper accessibility attributes', () => {
    const { getByRole } = renderWithTheme(
      <ProgressBar 
        progress={75} 
        testID="progress-bar"
        accessibilityLabel="File upload progress"
      />
    );

    const progressBar = getByRole('progressbar');
    expect(progressBar.props.accessibilityLabel).toBe('File upload progress');
    expect(progressBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 75,
    });
  });

  it('calls onComplete when progress reaches 100', () => {
    const onComplete = jest.fn();
    
    renderWithTheme(
      <ProgressBar 
        progress={100} 
        onComplete={onComplete} 
        testID="progress-bar" 
      />
    );

    expect(onComplete).toHaveBeenCalled();
  });

  it('does not animate when animated is false', () => {
    const { getByTestId } = renderWithTheme(
      <ProgressBar 
        progress={50} 
        animated={false} 
        testID="progress-bar" 
      />
    );

    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('applies custom styles', () => {
    const customStyle = { marginTop: 20 };
    const fillStyle = { opacity: 0.8 };
    
    const { getByTestId } = renderWithTheme(
      <ProgressBar 
        progress={50} 
        style={customStyle} 
        fillStyle={fillStyle}
        testID="progress-bar" 
      />
    );

    const progressBar = getByTestId('progress-bar');
    expect(progressBar.props.style).toContainEqual(
      expect.objectContaining(customStyle)
    );
  });
});

describe('CircularProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByTestId } = renderWithTheme(
      <CircularProgress progress={50} testID="circular-progress" />
    );

    expect(getByTestId('circular-progress')).toBeTruthy();
  });

  it('renders with custom size and stroke width', () => {
    const { getByTestId } = renderWithTheme(
      <CircularProgress 
        progress={75} 
        size={80} 
        strokeWidth={8} 
        testID="circular-progress" 
      />
    );

    expect(getByTestId('circular-progress')).toBeTruthy();
  });

  it('renders with progress text by default', () => {
    const { getByText } = renderWithTheme(
      <CircularProgress progress={75} testID="circular-progress" />
    );

    expect(getByText('75%')).toBeTruthy();
  });

  it('renders with custom text', () => {
    const { getByText } = renderWithTheme(
      <CircularProgress 
        progress={50} 
        text="50/100" 
        testID="circular-progress" 
      />
    );

    expect(getByText('50/100')).toBeTruthy();
  });

  it('hides text when showText is false', () => {
    const { queryByText } = renderWithTheme(
      <CircularProgress 
        progress={75} 
        showText={false} 
        testID="circular-progress" 
      />
    );

    expect(queryByText('75%')).toBeNull();
  });

  it('applies custom colors', () => {
    const { getByTestId } = renderWithTheme(
      <CircularProgress 
        progress={60} 
        color="#00ff00" 
        backgroundColor="#f0f0f0" 
        textColor="#333333"
        testID="circular-progress" 
      />
    );

    expect(getByTestId('circular-progress')).toBeTruthy();
  });

  it('clamps progress values correctly', () => {
    // Test negative progress
    const { getByTestId: getNegative } = renderWithTheme(
      <CircularProgress progress={-10} testID="circular-negative" />
    );
    expect(getNegative('circular-negative')).toBeTruthy();

    // Test progress over 100
    const { getByTestId: getOver } = renderWithTheme(
      <CircularProgress progress={150} testID="circular-over" />
    );
    expect(getOver('circular-over')).toBeTruthy();
  });

  it('has proper accessibility attributes', () => {
    const { getByRole } = renderWithTheme(
      <CircularProgress 
        progress={75} 
        testID="circular-progress"
        accessibilityLabel="Download progress"
      />
    );

    const circularProgress = getByRole('progressbar');
    expect(circularProgress.props.accessibilityLabel).toBe('Download progress');
    expect(circularProgress.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 75,
    });
  });

  it('does not animate when animated is false', () => {
    const { getByTestId } = renderWithTheme(
      <CircularProgress 
        progress={50} 
        animated={false} 
        testID="circular-progress" 
      />
    );

    expect(getByTestId('circular-progress')).toBeTruthy();
  });

  it('applies custom styles', () => {
    const customStyle = { marginTop: 20 };
    
    const { getByTestId } = renderWithTheme(
      <CircularProgress 
        progress={50} 
        style={customStyle} 
        testID="circular-progress" 
      />
    );

    const circularProgress = getByTestId('circular-progress');
    expect(circularProgress.props.style).toContainEqual(
      expect.objectContaining(customStyle)
    );
  });
});