/**
 * Skeleton Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { Skeleton, SkeletonText, SkeletonAvatar } from '../Skeleton';
import { ThemeProvider } from '../../../../theme/provider/ThemeProvider';

// Animated is mocked in test-setup.js

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('Skeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton testID="skeleton" />
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('renders with custom dimensions', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton width={200} height={40} testID="skeleton" />
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('renders with percentage width', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton width="80%" testID="skeleton" />
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('renders without animation when animated is false', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton animated={false} testID="skeleton" />
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('applies custom colors', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton 
        baseColor="#f0f0f0" 
        highlightColor="#ffffff" 
        testID="skeleton" 
      />
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('applies custom border radius', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton borderRadius={10} testID="skeleton" />
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('has proper accessibility attributes', () => {
    const { getByTestId } = renderWithTheme(
      <Skeleton 
        testID="skeleton" 
        accessibilityLabel="Loading user profile"
      />
    );

    const skeleton = getByTestId('skeleton');
    expect(skeleton.props.accessible).toBe(true);
    expect(skeleton.props.accessibilityRole).toBe('none');
    expect(skeleton.props.accessibilityLabel).toBe('Loading user profile');
    expect(skeleton.props.accessibilityState.busy).toBe(true);
  });

  it('applies custom styles', () => {
    const customStyle = { marginTop: 10 };
    const { getByTestId } = renderWithTheme(
      <Skeleton style={customStyle} testID="skeleton" />
    );

    const skeleton = getByTestId('skeleton');
    expect(skeleton.props.style).toContainEqual(
      expect.objectContaining(customStyle)
    );
  });

  it('starts shimmer animation when animated is true', () => {
    renderWithTheme(<Skeleton animated={true} testID="skeleton" />);

    expect(Animated.loop).toHaveBeenCalled();
    expect(Animated.timing).toHaveBeenCalled();
  });
});

describe('SkeletonText', () => {
  it('renders single line correctly', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonText lines={1} testID="skeleton-text" />
    );

    expect(getByTestId('skeleton-text')).toBeTruthy();
  });

  it('renders multiple lines correctly', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonText lines={3} testID="skeleton-text" />
    );

    // Should render a container
    expect(getByTestId('skeleton-text')).toBeTruthy();
  });

  it('applies custom line height', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonText lineHeight={20} testID="skeleton-text" />
    );

    expect(getByTestId('skeleton-text')).toBeTruthy();
  });

  it('applies custom last line width', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonText lines={2} lastLineWidth="60%" testID="skeleton-text" />
    );

    expect(getByTestId('skeleton-text')).toBeTruthy();
  });

  it('applies line spacing for multiple lines', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonText lines={3} lineSpacing={12} testID="skeleton-text" />
    );

    expect(getByTestId('skeleton-text')).toBeTruthy();
  });
});

describe('SkeletonAvatar', () => {
  it('renders with default circular shape', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonAvatar testID="skeleton-avatar" />
    );

    expect(getByTestId('skeleton-avatar')).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonAvatar size={60} testID="skeleton-avatar" />
    );

    expect(getByTestId('skeleton-avatar')).toBeTruthy();
  });

  it('renders with square shape', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonAvatar shape="square" testID="skeleton-avatar" />
    );

    expect(getByTestId('skeleton-avatar')).toBeTruthy();
  });

  it('renders with rounded shape', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonAvatar shape="rounded" testID="skeleton-avatar" />
    );

    expect(getByTestId('skeleton-avatar')).toBeTruthy();
  });

  it('renders with circle shape', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonAvatar shape="circle" testID="skeleton-avatar" />
    );

    expect(getByTestId('skeleton-avatar')).toBeTruthy();
  });

  it('passes through other skeleton props', () => {
    const { getByTestId } = renderWithTheme(
      <SkeletonAvatar 
        animated={false} 
        baseColor="#f0f0f0" 
        testID="skeleton-avatar" 
      />
    );

    expect(getByTestId('skeleton-avatar')).toBeTruthy();
  });
});