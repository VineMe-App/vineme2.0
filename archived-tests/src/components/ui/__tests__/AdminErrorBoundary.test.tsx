import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  AdminErrorBoundary,
  AdminActionError,
  AdminLoadingOverlay,
  AdminRetryableError,
} from '../AdminErrorBoundary';
import { PermissionError, NetworkError } from '../../../utils/errorHandling';

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock components
jest.mock('../Button', () => ({
  Button: ({ title, onPress, testID }: any) => (
    <button testID={testID} onClick={onPress}>
      {title}
    </button>
  ),
}));

jest.mock('../LoadingSpinner', () => ({
  LoadingSpinner: ({ testID }: any) => <div testID={testID}>Loading...</div>,
}));

jest.mock('../ErrorMessage', () => ({
  ErrorMessage: ({ error, onRetry, testID }: any) => (
    <div testID={testID}>
      <span>{typeof error === 'string' ? error : error.message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

// Component that throws an error
const ThrowError = ({
  shouldThrow,
  errorType,
}: {
  shouldThrow: boolean;
  errorType?: string;
}) => {
  if (shouldThrow) {
    if (errorType === 'permission') {
      throw new PermissionError('Access denied');
    } else if (errorType === 'network') {
      throw new NetworkError('Network failed');
    } else {
      throw new Error('Test error');
    }
  }
  return <div testID="success">Success</div>;
};

describe('AdminErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when no error occurs', () => {
    const { getByTestId } = render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AdminErrorBoundary>
    );

    expect(getByTestId('success')).toBeTruthy();
  });

  it('should catch and display permission errors', () => {
    const { getByText } = render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={true} errorType="permission" />
      </AdminErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText(/don't have permission/)).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Access Denied',
      expect.stringContaining('permission'),
      [{ text: 'OK' }]
    );
  });

  it('should catch and display network errors', () => {
    const { getByText } = render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={true} errorType="network" />
      </AdminErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText(/Unable to connect/)).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Connection Error',
      expect.stringContaining('internet connection'),
      [{ text: 'OK' }]
    );
  });

  it('should handle retry functionality', () => {
    const { getByText, rerender } = render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AdminErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();

    // Click retry button
    fireEvent.press(getByText('Try Again'));

    // Re-render with no error
    rerender(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AdminErrorBoundary>
    );

    expect(getByText('Success')).toBeTruthy();
  });

  it('should render custom fallback when provided', () => {
    const CustomFallback = () => (
      <div testID="custom-fallback">Custom Error</div>
    );

    const { getByTestId } = render(
      <AdminErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </AdminErrorBoundary>
    );

    expect(getByTestId('custom-fallback')).toBeTruthy();
  });
});

describe('AdminActionError', () => {
  it('should not render when no error is provided', () => {
    const { queryByText } = render(<AdminActionError error={null} />);

    expect(queryByText('Operation Failed')).toBeFalsy();
  });

  it('should render permission error correctly', () => {
    const error = new PermissionError('Access denied');
    const onRetry = jest.fn();
    const onDismiss = jest.fn();

    const { getByText } = render(
      <AdminActionError error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );

    expect(getByText(/do not have permission/)).toBeTruthy();
    expect(getByText('Dismiss')).toBeTruthy();
  });

  it('should handle retry and dismiss actions', () => {
    const error = new NetworkError('Network failed');
    const onRetry = jest.fn();
    const onDismiss = jest.fn();

    const { getByText } = render(
      <AdminActionError error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );

    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();

    fireEvent.press(getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('AdminLoadingOverlay', () => {
  it('should not render when not visible', () => {
    const { queryByText } = render(<AdminLoadingOverlay visible={false} />);

    expect(queryByText('Processing...')).toBeFalsy();
  });

  it('should render with default message when visible', () => {
    const { getByText } = render(<AdminLoadingOverlay visible={true} />);

    expect(getByText('Processing...')).toBeTruthy();
  });

  it('should render with custom message', () => {
    const { getByText } = render(
      <AdminLoadingOverlay visible={true} message="Custom loading message" />
    );

    expect(getByText('Custom loading message')).toBeTruthy();
  });

  it('should handle cancel action', () => {
    const onCancel = jest.fn();

    const { getByText } = render(
      <AdminLoadingOverlay visible={true} onCancel={onCancel} />
    );

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('AdminRetryableError', () => {
  it('should not render when no error is provided', () => {
    const { queryByText } = render(
      <AdminRetryableError
        error={null}
        onRetry={jest.fn()}
        retryCount={0}
        maxRetries={3}
      />
    );

    expect(queryByText('Operation Failed')).toBeFalsy();
  });

  it('should show retry button for retryable errors', () => {
    const error = new NetworkError('Network failed');
    const onRetry = jest.fn();

    const { getByText } = render(
      <AdminRetryableError
        error={error}
        onRetry={onRetry}
        retryCount={1}
        maxRetries={3}
      />
    );

    expect(getByText('Try Again (1/3)')).toBeTruthy();
    expect(getByText('Attempt 1 of 3')).toBeTruthy();

    fireEvent.press(getByText('Try Again (1/3)'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('should not show retry button for permission errors', () => {
    const error = new PermissionError('Access denied');
    const onRetry = jest.fn();

    const { queryByText } = render(
      <AdminRetryableError
        error={error}
        onRetry={onRetry}
        retryCount={0}
        maxRetries={3}
      />
    );

    expect(queryByText('Try Again')).toBeFalsy();
  });

  it('should not show retry button when max retries reached', () => {
    const error = new NetworkError('Network failed');
    const onRetry = jest.fn();

    const { queryByText } = render(
      <AdminRetryableError
        error={error}
        onRetry={onRetry}
        retryCount={3}
        maxRetries={3}
      />
    );

    expect(queryByText('Try Again')).toBeFalsy();
  });

  it('should handle dismiss action', () => {
    const error = new Error('Test error');
    const onDismiss = jest.fn();

    const { getByText } = render(
      <AdminRetryableError
        error={error}
        onRetry={jest.fn()}
        onDismiss={onDismiss}
        retryCount={0}
        maxRetries={3}
      />
    );

    fireEvent.press(getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
