import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { globalErrorHandler } from '../utils/globalErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log to global error handler
    globalErrorHandler.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount: this.state.retryCount,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1 
      });
    }
  };

  handleReload = () => {
    // In a real app, you might want to reload the entire app
    // For now, we'll just reset the error boundary
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: 0 
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const showDetails = this.props.showErrorDetails || __DEV__;

      return (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          
          <Text style={styles.title}>Something went wrong</Text>
          
          <Text style={styles.message}>
            We're sorry, but something unexpected happened. 
            {canRetry ? ' Please try again.' : ' Please restart the app.'}
          </Text>

          {this.state.error?.message && (
            <View style={styles.errorBox}>
              <Text style={styles.errorHeading}>Error Details</Text>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
            </View>
          )}

          {showDetails && this.state.errorInfo?.componentStack && (
            <View style={styles.debugBox}>
              <Text style={styles.debugHeading}>Component Stack (Debug)</Text>
              <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                <Text style={styles.debugText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              </ScrollView>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {canRetry ? (
              <TouchableOpacity style={styles.primaryButton} onPress={this.handleRetry}>
                <Text style={styles.primaryButtonText}>
                  Try Again ({this.maxRetries - this.state.retryCount} left)
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={this.handleReload}>
                <Text style={styles.primaryButtonText}>Restart App</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.helpText}>
            If this problem persists, please contact support.
          </Text>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: '#fff0f0',
    borderColor: '#ffccd1',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  errorHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b00020',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#b00020',
  },
  debugBox: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignSelf: 'stretch',
    maxHeight: 200,
  },
  debugHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});