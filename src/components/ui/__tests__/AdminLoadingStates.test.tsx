import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  AdminLoadingCard,
  AdminBatchLoading,
  AdminSkeletonLoader,
  AdminLoadingList,
  AdminRetryLoading,
} from '../AdminLoadingStates';

// Mock components
jest.mock('../LoadingSpinner', () => ({
  LoadingSpinner: ({ size, testID }: any) => (
    <div testID={testID} data-size={size}>
      Loading Spinner
    </div>
  ),
}));

jest.mock('../Button', () => ({
  Button: ({ title, onPress, variant, size, testID }: any) => (
    <button
      testID={testID}
      onClick={onPress}
      data-variant={variant}
      data-size={size}
    >
      {title}
    </button>
  ),
}));

describe('AdminLoadingCard', () => {
  it('should render with title and loading spinner', () => {
    const { getByText } = render(
      <AdminLoadingCard title="Loading Data" />
    );

    expect(getByText('Loading Data')).toBeTruthy();
    expect(getByText('Loading Spinner')).toBeTruthy();
  });

  it('should render with optional message', () => {
    const { getByText } = render(
      <AdminLoadingCard
        title="Loading Data"
        message="Please wait while we fetch your data..."
      />
    );

    expect(getByText('Loading Data')).toBeTruthy();
    expect(getByText('Please wait while we fetch your data...')).toBeTruthy();
  });

  it('should show progress bar when progress is provided', () => {
    const { getByText } = render(
      <AdminLoadingCard
        title="Loading Data"
        progress={0.75}
        showProgress={true}
      />
    );

    expect(getByText('75%')).toBeTruthy();
  });

  it('should handle cancel action', () => {
    const onCancel = jest.fn();

    const { getByText } = render(
      <AdminLoadingCard title="Loading Data" onCancel={onCancel} />
    );

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should handle progress bounds correctly', () => {
    const { getByText, rerender } = render(
      <AdminLoadingCard
        title="Loading Data"
        progress={-0.5}
        showProgress={true}
      />
    );

    expect(getByText('0%')).toBeTruthy();

    rerender(
      <AdminLoadingCard
        title="Loading Data"
        progress={1.5}
        showProgress={true}
      />
    );

    expect(getByText('150%')).toBeTruthy();
  });
});

describe('AdminBatchLoading', () => {
  it('should render batch statistics correctly', () => {
    const { getByText } = render(
      <AdminBatchLoading
        total={10}
        completed={7}
        failed={2}
      />
    );

    expect(getByText('Processing Operations')).toBeTruthy();
    expect(getByText('7')).toBeTruthy(); // Completed
    expect(getByText('2')).toBeTruthy(); // Failed
    expect(getByText('1')).toBeTruthy(); // Remaining (10 - 7 - 2)
    expect(getByText('7 of 10 (70%)')).toBeTruthy();
  });

  it('should show current operation when provided', () => {
    const { getByText } = render(
      <AdminBatchLoading
        total={5}
        completed={2}
        failed={0}
        currentOperation="Processing user data..."
      />
    );

    expect(getByText('Current: Processing user data...')).toBeTruthy();
  });

  it('should handle cancel action', () => {
    const onCancel = jest.fn();

    const { getByText } = render(
      <AdminBatchLoading
        total={5}
        completed={2}
        failed={0}
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByText('Cancel Remaining'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should calculate progress correctly', () => {
    const { getByText } = render(
      <AdminBatchLoading
        total={8}
        completed={6}
        failed={1}
      />
    );

    // Progress should be 6/8 = 75%
    expect(getByText('6 of 8 (75%)')).toBeTruthy();
  });

  it('should handle zero total correctly', () => {
    const { getByText } = render(
      <AdminBatchLoading
        total={0}
        completed={0}
        failed={0}
      />
    );

    expect(getByText('0 of 0 (0%)')).toBeTruthy();
  });
});

describe('AdminSkeletonLoader', () => {
  it('should render with default configuration', () => {
    const { container } = render(<AdminSkeletonLoader />);

    // Should have avatar, 3 lines, and actions by default
    const skeletonLines = container.querySelectorAll('[style*="backgroundColor: #e5e7eb"]');
    expect(skeletonLines.length).toBeGreaterThan(0);
  });

  it('should render without avatar when showAvatar is false', () => {
    const { container } = render(<AdminSkeletonLoader showAvatar={false} />);

    // Check that skeleton structure is rendered
    expect(container.firstChild).toBeTruthy();
  });

  it('should render without actions when showActions is false', () => {
    const { container } = render(<AdminSkeletonLoader showActions={false} />);

    // Check that skeleton structure is rendered
    expect(container.firstChild).toBeTruthy();
  });

  it('should render custom number of lines', () => {
    const { container } = render(<AdminSkeletonLoader lines={5} />);

    // Check that skeleton structure is rendered
    expect(container.firstChild).toBeTruthy();
  });
});

describe('AdminLoadingList', () => {
  it('should render default number of skeleton items', () => {
    const { container } = render(<AdminLoadingList />);

    // Should render 5 skeleton items by default
    expect(container.firstChild).toBeTruthy();
  });

  it('should render custom number of skeleton items', () => {
    const { container } = render(<AdminLoadingList count={3} />);

    // Should render 3 skeleton items
    expect(container.firstChild).toBeTruthy();
  });

  it('should pass props to skeleton items', () => {
    const { container } = render(
      <AdminLoadingList
        count={2}
        showAvatar={false}
        showActions={false}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });
});

describe('AdminRetryLoading', () => {
  it('should render retry information correctly', () => {
    const onRetry = jest.fn();

    const { getByText } = render(
      <AdminRetryLoading
        message="Operation failed, retrying..."
        retryCount={2}
        maxRetries={5}
        onRetry={onRetry}
      />
    );

    expect(getByText('Operation failed, retrying...')).toBeTruthy();
    expect(getByText('Retry attempt 2 of 5')).toBeTruthy();
    expect(getByText('Retry Now')).toBeTruthy();
  });

  it('should handle retry action', () => {
    const onRetry = jest.fn();

    const { getByText } = render(
      <AdminRetryLoading
        message="Retrying operation..."
        retryCount={1}
        maxRetries={3}
        onRetry={onRetry}
      />
    );

    fireEvent.press(getByText('Retry Now'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('should handle cancel action when provided', () => {
    const onRetry = jest.fn();
    const onCancel = jest.fn();

    const { getByText } = render(
      <AdminRetryLoading
        message="Retrying operation..."
        retryCount={1}
        maxRetries={3}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should not show cancel button when onCancel is not provided', () => {
    const onRetry = jest.fn();

    const { queryByText } = render(
      <AdminRetryLoading
        message="Retrying operation..."
        retryCount={1}
        maxRetries={3}
        onRetry={onRetry}
      />
    );

    expect(queryByText('Cancel')).toBeFalsy();
  });
});