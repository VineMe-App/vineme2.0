import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { LoadingSpinner } from './LoadingSpinner';

interface AdminErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary specifically for admin features with enhanced error handling
 */
export class AdminErrorBoundary extends React.Component<
  AdminErrorBoundaryProps,
  AdminErrorBoundaryState
> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log admin errors for debugging
    console.error('Admin Error Boundary caught an error:', error, errorInfo);

    // Show user-friendly error for permission-related errors
    if (this.isPermissionError(error)) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to perform this action. Please contact your church administrator if you believe this is an error.',
        [{ text: 'OK' }]
      );
    } else if (this.isNetworkError(error)) {
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Unexpected Error',
        'An unexpected error occurred. Please try again or contact support if the problem persists.',
        [{ text: 'OK' }]
      );
    }
  }

  private isPermissionError(error: Error): boolean {
    const permissionKeywords = [
      'permission',
      'unauthorized',
      'access denied',
      'insufficient',
      'church admin',
      'group leader',
      'role required',
    ];
    
    return permissionKeywords.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    );
  }

  private isNetworkError(error: Error): boolean {
    const networkKeywords = [
      'network',
      'fetch',
      'connection',
      'timeout',
      'offline',
    ];
    
    return networkKeywords.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    );
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <View style={{ alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="warning-outline" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            
            {this.isPermissionError(this.state.error!) ? (
              <Text style={styles.errorMessage}>
                You don't have permission to access this feature. Please contact your church administrator.
              </Text>
            ) : this.isNetworkError(this.state.error!) ? (
              <Text style={styles.errorMessage}>
                Unable to connect to the server. Please check your internet connection.
              </Text>
            ) : (
              <Text style={styles.errorMessage}>
                An unexpected error occurred. Please try again.
              </Text>
            )}

            <Button
              title="Try Again"
              onPress={this.handleRetry}
              variant="primary"
              style={styles.retryButton}
            />

            {__DEV__ && this.state.error && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.message}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

interface AdminActionErrorProps {
  error: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

interface AdminLoadingOverlayProps {
  visible: boolean;
  message?: string;
  onCancel?: () => void;
}

/**
 * Loading overlay for admin operations with cancel option
 */
export const AdminLoadingOverlay: React.FC<AdminLoadingOverlayProps> = ({
  visible,
  message = 'Processing...',
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContent}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingMessage}>{message}</Text>
        {onCancel && (
          <Button
            title="Cancel"
            onPress={onCancel}
            variant="secondary"
            size="small"
            style={styles.cancelButton}
          />
        )}
      </View>
    </View>
  );
};

interface AdminRetryableErrorProps {
  error: Error | null;
  onRetry: () => void;
  onDismiss?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Enhanced error component with retry logic and backoff
 */
export const AdminRetryableError: React.FC<AdminRetryableErrorProps> = ({
  error,
  onRetry,
  onDismiss,
  retryCount = 0,
  maxRetries = 3,
}) => {
  if (!error) return null;

  const isPermissionError = (error: Error): boolean => {
    const permissionKeywords = [
      'permission',
      'unauthorized',
      'access denied',
      'insufficient',
      'church admin',
      'group leader',
      'role required',
    ];
    
    return permissionKeywords.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    );
  };

  const isNetworkError = (error: Error): boolean => {
    const networkKeywords = [
      'network',
      'fetch',
      'connection',
      'timeout',
      'offline',
    ];
    
    return networkKeywords.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    );
  };

  const canRetry = (): boolean => {
    // Don't allow retry for permission errors
    if (isPermissionError(error)) return false;
    
    // Allow retry for network errors and other retryable errors
    return retryCount < maxRetries;
  };

  const getErrorMessage = (error: Error): string => {
    if (isPermissionError(error)) {
      return 'You do not have permission to perform this action. Please contact your church administrator.';
    }
    
    if (isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    return error.message || 'An unexpected error occurred. Please try again.';
  };

  const getRetryButtonText = (): string => {
    if (retryCount === 0) return 'Try Again';
    return `Try Again (${retryCount}/${maxRetries})`;
  };

  return (
    <View style={styles.retryableErrorContainer}>
      <View style={styles.errorHeader}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Operation Failed</Text>
      </View>
      
      <Text style={styles.errorDescription}>
        {getErrorMessage(error)}
      </Text>

      {retryCount > 0 && (
        <Text style={styles.retryInfo}>
          Attempt {retryCount} of {maxRetries}
        </Text>
      )}

      <View style={styles.errorActions}>
        {canRetry() && (
          <Button
            title={getRetryButtonText()}
            onPress={onRetry}
            variant="primary"
            size="small"
            style={styles.retryButton}
          />
        )}
        {onDismiss && (
          <Button
            title="Dismiss"
            onPress={onDismiss}
            variant="secondary"
            size="small"
            style={styles.dismissButton}
          />
        )}
      </View>
    </View>
  );
};

/**
 * Component for displaying admin action errors
 */
export const AdminActionError: React.FC<AdminActionErrorProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  if (!error) return null;

  const isPermissionError = (error: Error): boolean => {
    const permissionKeywords = [
      'permission',
      'unauthorized',
      'access denied',
      'insufficient',
      'church admin',
      'group leader',
      'role required',
    ];
    
    return permissionKeywords.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    );
  };

  const getErrorMessage = (error: Error): string => {
    if (isPermissionError(error)) {
      return 'You do not have permission to perform this action. Please contact your church administrator.';
    }
    
    if (error.message.toLowerCase().includes('network') || 
        error.message.toLowerCase().includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    return error.message || 'An unexpected error occurred. Please try again.';
  };

  return (
    <View style={styles.actionErrorContainer}>
      <ErrorMessage
        error={getErrorMessage(error)}
        onRetry={onRetry}
        style={styles.actionError}
      />
      {onDismiss && (
        <Button
          title="Dismiss"
          onPress={onDismiss}
          variant="secondary"
          size="small"
          style={styles.dismissButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    marginTop: 16,
  },
  debugContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  actionErrorContainer: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    marginVertical: 8,
  },
  actionError: {
    marginBottom: 8,
  },
  dismissButton: {
    alignSelf: 'flex-end',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingMessage: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 8,
  },
  retryableErrorContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c53030',
  },
  errorDescription: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryInfo: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  retryButton: {
    flex: 1,
  },
});
