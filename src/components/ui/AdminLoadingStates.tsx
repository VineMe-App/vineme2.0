import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from './Button';

interface AdminLoadingCardProps {
  title: string;
  message?: string;
  progress?: number;
  onCancel?: () => void;
  showProgress?: boolean;
}

/**
 * Loading card for admin operations with progress indicator
 */
export const AdminLoadingCard: React.FC<AdminLoadingCardProps> = ({
  title,
  message,
  progress,
  onCancel,
  showProgress = false,
}) => {
  return (
    <View style={styles.loadingCard}>
      <View style={styles.loadingHeader}>
        <LoadingSpinner size="medium" />
        <Text weight="semiBold" style={styles.loadingTitle}>{title}</Text>
      </View>

      {message && <Text style={styles.loadingMessage}>{message}</Text>}

      {showProgress && typeof progress === 'number' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0, Math.min(100, progress * 100))}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      )}

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
  );
};

interface AdminBatchLoadingProps {
  total: number;
  completed: number;
  failed: number;
  currentOperation?: string;
  onCancel?: () => void;
}

/**
 * Loading component for batch operations
 */
export const AdminBatchLoading: React.FC<AdminBatchLoadingProps> = ({
  total,
  completed,
  failed,
  currentOperation,
  onCancel,
}) => {
  const progress = total > 0 ? completed / total : 0;
  const remaining = total - completed - failed;

  return (
    <View style={styles.batchLoadingContainer}>
      <View style={styles.batchHeader}>
        <LoadingSpinner size="large" />
        <Text weight="semiBold" style={styles.batchTitle}>Processing Operations</Text>
      </View>

      <View style={styles.batchStats}>
        <View style={styles.statItem}>
          <Text weight="bold" style={styles.statNumber}>{completed}</Text>
          <Text weight="medium" style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text weight="bold" style={[styles.statNumber, styles.failedNumber]}>{failed}</Text>
          <Text weight="medium" style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statItem}>
          <Text weight="bold" style={styles.statNumber}>{remaining}</Text>
          <Text weight="medium" style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(0, Math.min(100, progress * 100))}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completed} of {total} ({Math.round(progress * 100)}%)
        </Text>
      </View>

      {currentOperation && (
        <Text style={styles.currentOperation}>Current: {currentOperation}</Text>
      )}

      {onCancel && (
        <Button
          title="Cancel Remaining"
          onPress={onCancel}
          variant="secondary"
          size="small"
          style={styles.cancelButton}
        />
      )}
    </View>
  );
};

interface AdminSkeletonLoaderProps {
  lines?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}

/**
 * Skeleton loader for admin list items
 */
export const AdminSkeletonLoader: React.FC<AdminSkeletonLoaderProps> = ({
  lines = 3,
  showAvatar = true,
  showActions = true,
}) => {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader}>
        {showAvatar && <View style={styles.skeletonAvatar} />}
        <View style={styles.skeletonContent}>
          <View style={[styles.skeletonLine, styles.skeletonTitle]} />
          {Array.from({ length: lines - 1 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.skeletonLine,
                index === lines - 2 ? styles.skeletonLastLine : null,
              ]}
            />
          ))}
        </View>
      </View>

      {showActions && (
        <View style={styles.skeletonActions}>
          <View style={styles.skeletonButton} />
          <View style={styles.skeletonButton} />
        </View>
      )}
    </View>
  );
};

interface AdminLoadingListProps {
  count?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}

/**
 * Loading list with multiple skeleton items
 */
export const AdminLoadingList: React.FC<AdminLoadingListProps> = ({
  count = 5,
  showAvatar = true,
  showActions = true,
}) => {
  return (
    <View style={styles.loadingList}>
      {Array.from({ length: count }).map((_, index) => (
        <AdminSkeletonLoader
          key={index}
          showAvatar={showAvatar}
          showActions={showActions}
        />
      ))}
    </View>
  );
};

interface AdminRetryLoadingProps {
  message: string;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onCancel?: () => void;
}

/**
 * Loading component with retry information
 */
export const AdminRetryLoading: React.FC<AdminRetryLoadingProps> = ({
  message,
  retryCount,
  maxRetries,
  onRetry,
  onCancel,
}) => {
  return (
    <View style={styles.retryLoadingContainer}>
      <LoadingSpinner size="large" />
      <Text style={styles.retryMessage}>{message}</Text>
      <Text style={styles.retryInfo}>
        Retry attempt {retryCount} of {maxRetries}
      </Text>

      <View style={styles.retryActions}>
        <Button
          title="Retry Now"
          onPress={onRetry}
          variant="primary"
          size="small"
          style={styles.retryButton}
        />
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

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  loadingMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  cancelButton: {
    alignSelf: 'center',
    minWidth: 100,
  },
  batchLoadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  batchHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  batchTitle: {
    fontSize: 18,
    color: '#1a1a1a',
    marginTop: 12,
  },
  batchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    color: '#3b82f6',
    marginBottom: 4,
  },
  failedNumber: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  currentOperation: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  skeletonContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonTitle: {
    width: '70%',
    height: 16,
  },
  skeletonLastLine: {
    width: '40%',
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonButton: {
    height: 32,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    flex: 1,
  },
  loadingList: {
    padding: 16,
  },
  retryLoadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  retryMessage: {
    fontSize: 16,
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  retryInfo: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    minWidth: 100,
  },
});
