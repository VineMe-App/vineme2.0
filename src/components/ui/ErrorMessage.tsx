import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from './Text';
import { AppError, getErrorMessage } from '../../utils/errorHandling';

interface ErrorMessageProps {
  error: AppError | Error | string;
  onRetry?: () => void;
  showRetry?: boolean;
  style?: any;
}

export function ErrorMessage({
  error,
  onRetry,
  showRetry = true,
  style,
}: ErrorMessageProps) {
  const getMessage = () => {
    if (typeof error === 'string') {
      return error;
    }

    if ('type' in error) {
      return getErrorMessage(error);
    }

    return error.message || 'An unexpected error occurred';
  };

  const canRetry = () => {
    if (typeof error === 'string') {
      return true;
    }

    if ('retryable' in error) {
      return error.retryable;
    }

    return true;
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.message}>{getMessage()}</Text>
      {showRetry && canRetry() && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text weight="semiBold" style={styles.retryText}>
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7d7',
    margin: 16,
  },
  message: {
    fontSize: 14,
    color: '#c53030',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#c53030',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'center',
  },
  retryText: {
    color: 'white',
    fontSize: 14,
  },
});
