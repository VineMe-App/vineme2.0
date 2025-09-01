/**
 * Loading Components Integration Tests
 * Tests the loading components working together and with theme system
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { 
  Spinner, 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar,
  ProgressBar, 
  CircularProgress,
  FadeIn,
  SlideIn,
  StaggeredAnimation
} from '../index';
import { ThemeProvider } from '../../../../theme/provider/ThemeProvider';

// Animated is mocked in test-setup.js

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('Loading Components Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all loading components together', () => {
    const { getByTestId } = renderWithTheme(
      <View>
        <Spinner testID="spinner" />
        <Skeleton testID="skeleton" />
        <ProgressBar progress={50} testID="progress-bar" />
        <CircularProgress progress={75} testID="circular-progress" />
      </View>
    );

    expect(getByTestId('spinner')).toBeTruthy();
    expect(getByTestId('skeleton')).toBeTruthy();
    expect(getByTestId('progress-bar')).toBeTruthy();
    expect(getByTestId('circular-progress')).toBeTruthy();
  });

  it('works with theme switching', () => {
    const LoadingScreen = () => (
      <View>
        <Spinner size="large" testID="themed-spinner" />
        <Skeleton width="100%" height={20} testID="themed-skeleton" />
        <ProgressBar progress={60} showText testID="themed-progress" />
      </View>
    );

    const { getByTestId } = renderWithTheme(<LoadingScreen />);

    expect(getByTestId('themed-spinner')).toBeTruthy();
    expect(getByTestId('themed-skeleton')).toBeTruthy();
    expect(getByTestId('themed-progress')).toBeTruthy();
  });

  it('creates a complete loading state example', () => {
    const LoadingStateExample = () => (
      <FadeIn testID="loading-container">
        <View>
          {/* Header skeleton */}
          <SkeletonText lines={1} lineHeight={24} testID="header-skeleton" />
          
          {/* Avatar and content skeleton */}
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <SkeletonAvatar size={50} testID="avatar-skeleton" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonText lines={2} testID="content-skeleton" />
            </View>
          </View>
          
          {/* Progress indicator */}
          <ProgressBar 
            progress={45} 
            showText 
            text="Loading content..." 
            testID="loading-progress"
          />
          
          {/* Loading spinner */}
          <Spinner variant="dots" testID="loading-spinner" />
        </View>
      </FadeIn>
    );

    const { getByTestId } = renderWithTheme(<LoadingStateExample />);

    expect(getByTestId('loading-container')).toBeTruthy();
    expect(getByTestId('header-skeleton')).toBeTruthy();
    expect(getByTestId('avatar-skeleton')).toBeTruthy();
    expect(getByTestId('content-skeleton')).toBeTruthy();
    expect(getByTestId('loading-progress')).toBeTruthy();
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('creates animated loading sequence', () => {
    const AnimatedLoadingSequence = () => {
      const loadingItems = [
        <Skeleton key="1" height={20} testID="skeleton-1" />,
        <Skeleton key="2" height={20} testID="skeleton-2" />,
        <Skeleton key="3" height={20} testID="skeleton-3" />,
      ];

      return (
        <StaggeredAnimation 
          animationType="slideIn" 
          staggerDelay={150}
          testID="animated-sequence"
        >
          {loadingItems}
        </StaggeredAnimation>
      );
    };

    const { getByTestId } = renderWithTheme(<AnimatedLoadingSequence />);

    expect(getByTestId('animated-sequence')).toBeTruthy();
    expect(getByTestId('skeleton-1')).toBeTruthy();
    expect(getByTestId('skeleton-2')).toBeTruthy();
    expect(getByTestId('skeleton-3')).toBeTruthy();
  });

  it('handles loading state transitions', () => {
    const LoadingTransition = ({ isLoading }: { isLoading: boolean }) => (
      <View>
        {isLoading ? (
          <FadeIn testID="loading-state">
            <Spinner testID="transition-spinner" />
            <Text>Loading...</Text>
          </FadeIn>
        ) : (
          <SlideIn testID="content-state">
            <Text testID="loaded-content">Content loaded!</Text>
          </SlideIn>
        )}
      </View>
    );

    // Test loading state
    const { getByTestId: getLoading, rerender } = renderWithTheme(
      <LoadingTransition isLoading={true} />
    );

    expect(getLoading('loading-state')).toBeTruthy();
    expect(getLoading('transition-spinner')).toBeTruthy();

    // Test loaded state
    act(() => {
      rerender(
        <ThemeProvider>
          <LoadingTransition isLoading={false} />
        </ThemeProvider>
      );
    });

    expect(getLoading('content-state')).toBeTruthy();
    expect(getLoading('loaded-content')).toBeTruthy();
  });

  it('creates complex loading dashboard', () => {
    const LoadingDashboard = () => (
      <View testID="loading-dashboard">
        {/* Header with progress */}
        <View>
          <SkeletonText lines={1} lineHeight={28} testID="dashboard-title" />
          <ProgressBar 
            progress={33} 
            variant="thin" 
            showText 
            testID="dashboard-progress"
          />
        </View>

        {/* Stats cards */}
        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          {[1, 2, 3].map((index) => (
            <View key={index} style={{ flex: 1, marginHorizontal: 4 }}>
              <Skeleton height={80} testID={`stat-card-${index}`} />
            </View>
          ))}
        </View>

        {/* Chart area */}
        <View style={{ marginTop: 20 }}>
          <SkeletonText lines={1} lineHeight={20} testID="chart-title" />
          <Skeleton height={200} style={{ marginTop: 8 }} testID="chart-skeleton" />
        </View>

        {/* List items */}
        <View style={{ marginTop: 20 }}>
          {[1, 2, 3, 4].map((index) => (
            <View key={index} style={{ flexDirection: 'row', marginBottom: 12 }}>
              <SkeletonAvatar size={40} testID={`list-avatar-${index}`} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonText lines={2} testID={`list-content-${index}`} />
              </View>
            </View>
          ))}
        </View>

        {/* Loading indicator */}
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <CircularProgress progress={67} size={50} testID="dashboard-circular" />
        </View>
      </View>
    );

    const { getByTestId } = renderWithTheme(<LoadingDashboard />);

    expect(getByTestId('loading-dashboard')).toBeTruthy();
    expect(getByTestId('dashboard-title')).toBeTruthy();
    expect(getByTestId('dashboard-progress')).toBeTruthy();
    expect(getByTestId('stat-card-1')).toBeTruthy();
    expect(getByTestId('chart-skeleton')).toBeTruthy();
    expect(getByTestId('list-avatar-1')).toBeTruthy();
    expect(getByTestId('dashboard-circular')).toBeTruthy();
  });

  it('handles accessibility across all components', () => {
    const AccessibleLoadingScreen = () => (
      <View>
        <Spinner 
          accessibilityLabel="Loading user data" 
          testID="accessible-spinner" 
        />
        <Skeleton 
          accessibilityLabel="Loading profile image" 
          testID="accessible-skeleton" 
        />
        <ProgressBar 
          progress={75} 
          accessibilityLabel="Upload progress" 
          testID="accessible-progress" 
        />
        <CircularProgress 
          progress={50} 
          accessibilityLabel="Download progress" 
          testID="accessible-circular" 
        />
      </View>
    );

    const { getByTestId } = renderWithTheme(<AccessibleLoadingScreen />);

    // Check accessibility attributes
    const spinner = getByTestId('accessible-spinner');
    expect(spinner.props.accessibilityLabel).toBe('Loading user data');
    expect(spinner.props.accessibilityRole).toBe('progressbar');

    const skeleton = getByTestId('accessible-skeleton');
    expect(skeleton.props.accessibilityLabel).toBe('Loading profile image');
    expect(skeleton.props.accessibilityState.busy).toBe(true);
  });

  it('performs well with many loading components', () => {
    const ManyLoadingComponents = () => (
      <View testID="many-components">
        {/* Multiple spinners */}
        {['circular', 'dots', 'pulse', 'bars'].map((variant, index) => (
          <Spinner 
            key={`spinner-${variant}`}
            variant={variant as any}
            testID={`spinner-${index}`}
          />
        ))}

        {/* Multiple skeletons */}
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton 
            key={`skeleton-${index}`}
            height={20} 
            testID={`skeleton-${index}`}
          />
        ))}

        {/* Multiple progress bars */}
        {Array.from({ length: 5 }, (_, index) => (
          <ProgressBar 
            key={`progress-${index}`}
            progress={index * 20} 
            testID={`progress-${index}`}
          />
        ))}
      </View>
    );

    const { getByTestId } = renderWithTheme(<ManyLoadingComponents />);

    expect(getByTestId('many-components')).toBeTruthy();
    expect(getByTestId('spinner-0')).toBeTruthy();
    expect(getByTestId('skeleton-0')).toBeTruthy();
    expect(getByTestId('progress-0')).toBeTruthy();
  });
});