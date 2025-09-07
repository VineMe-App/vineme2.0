import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from '@/components/ui/Text';
import {
  AccessibilityHelpers,
  AdminAccessibilityLabels,
  ScreenReaderUtils,
} from '@/utils/accessibility';
import { useQuery } from '@tanstack/react-query';
import { userAdminService, type UserWithGroupStatus } from '@/services/admin';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface UserManagementCardProps {
  user: UserWithGroupStatus;
  onPress?: () => void;
}

export function UserManagementCard({ user, onPress }: UserManagementCardProps) {
  const [showHistory, setShowHistory] = useState(false);

  const {
    data: groupHistory,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ['admin', 'user-group-history', user.id],
    queryFn: async () => {
      const result = await userAdminService.getUserGroupHistory(user.id);
      if (result.error) {
        throw result.error;
      }
      return result.data || [];
    },
    enabled: showHistory,
  });

  const handleViewHistory = () => {
    setShowHistory(true);
  };

  const handleContactUser = () => {
    if (user.email) {
      Alert.alert('Contact User', `Contact ${user.name} at ${user.email}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => {
            // In a real app, this would open the email client
            Alert.alert('Email', `Would open email to ${user.email}`);
          },
        },
      ]);
    }
  };

  const getConnectionStatusText = () => {
    return user.is_connected ? 'Connected' : 'Unconnected';
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        {...AccessibilityHelpers.createNavigationProps(
          AdminAccessibilityLabels.userConnectionStatus(
            user.name,
            user.is_connected,
            user.group_count
          ),
          'Double tap to view user details'
        )}
      >
        <View style={styles.header}>
          <Avatar
            size={50}
            imageUrl={user.avatar_url}
            name={user.name}
            accessibilityLabel={`Profile picture for ${user.name}`}
          />
          <View style={styles.userInfo}>
            <Text
              style={styles.userName}
              accessibilityRole="header"
              accessibilityLevel={3}
            >
              {user.name}
            </Text>
            <Text
              style={styles.userEmail}
              accessibilityLabel={`Email: ${user.email}`}
            >
              {user.email}
            </Text>
            <View
              style={styles.statusContainer}
              accessibilityRole="group"
              accessibilityLabel={AdminAccessibilityLabels.userConnectionStatus(
                user.name,
                user.is_connected,
                user.group_count
              )}
            >
              <Badge
                variant={user.is_connected ? 'success' : 'warning'}
                size="small"
                accessibilityLabel={`Connection status: ${getConnectionStatusText()}`}
              >
                {getConnectionStatusText()}
              </Badge>
              <Text
                style={styles.groupCount}
                accessibilityLabel={`Member of ${user.group_count} ${user.group_count === 1 ? 'group' : 'groups'}`}
              >
                {user.group_count} group{user.group_count !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.details}>
          {user.church && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Church:</Text>
              <Text style={styles.detailValue}>{user.church.name}</Text>
            </View>
          )}

          {user.service && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Service:</Text>
              <Text style={styles.detailValue}>{user.service.name}</Text>
            </View>
          )}

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Member Since:</Text>
            <Text style={styles.detailValue}>
              {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>

          {user.last_activity && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Last Active:</Text>
              <Text style={styles.detailValue}>
                {new Date(user.last_activity).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View
          style={styles.actions}
          accessibilityRole="group"
          accessibilityLabel="User management actions"
        >
          <Button
            title="View History"
            onPress={handleViewHistory}
            variant="secondary"
            size="small"
            style={styles.actionButton}
            accessibilityLabel={`View group history for ${user.name}`}
            accessibilityHint="Double tap to see this user's group membership history"
          />
          <Button
            title="Contact"
            onPress={handleContactUser}
            variant="primary"
            size="small"
            style={styles.actionButton}
            accessibilityLabel={`Contact ${user.name}`}
            accessibilityHint="Double tap to contact this user"
          />
        </View>
      </TouchableOpacity>

      {/* Group History Modal */}
      <Modal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        title={`${user.name}'s Group History`}
      >
        <View style={styles.historyContent}>
          {historyLoading ? (
            <View style={styles.historyLoading}>
              <LoadingSpinner size="small" />
              <Text style={styles.historyLoadingText}>Loading history...</Text>
            </View>
          ) : historyError ? (
            <View style={styles.historyError}>
              <Text style={styles.historyErrorText}>
                Failed to load group history
              </Text>
            </View>
          ) : groupHistory && groupHistory.length > 0 ? (
            <View style={styles.historyList}>
              {groupHistory.map((membership) => (
                <View key={membership.id} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyGroupName}>
                      {membership.group?.title || 'Unknown Group'}
                    </Text>
                    <Badge
                      variant={
                        membership.status === 'active' ? 'success' : 'default'
                      }
                      size="small"
                    >
                      {membership.status}
                    </Badge>
                  </View>
                  <View style={styles.historyDetails}>
                    <Text style={styles.historyRole}>
                      Role:{' '}
                      {membership.role.charAt(0).toUpperCase() +
                        membership.role.slice(1)}
                    </Text>
                    <Text style={styles.historyDate}>
                      Joined:{' '}
                      {new Date(membership.joined_at).toLocaleDateString()}
                    </Text>
                    {membership.group?.status && (
                      <Text style={styles.historyGroupStatus}>
                        Group Status:{' '}
                        {membership.group.status.charAt(0).toUpperCase() +
                          membership.group.status.slice(1)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.historyEmpty}>
              <Text style={styles.historyEmptyText}>
                No group history found
              </Text>
              <Text style={styles.historyEmptySubtext}>
                This user hasn't joined any groups yet
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupCount: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  details: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  historyContent: {
    maxHeight: 400,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  historyLoadingText: {
    fontSize: 14,
    color: '#6c757d',
  },
  historyError: {
    padding: 24,
    alignItems: 'center',
  },
  historyErrorText: {
    fontSize: 14,
    color: '#dc3545',
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  historyDetails: {
    gap: 4,
  },
  historyRole: {
    fontSize: 14,
    color: '#6c757d',
  },
  historyDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  historyGroupStatus: {
    fontSize: 14,
    color: '#6c757d',
  },
  historyEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  historyEmptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 4,
  },
  historyEmptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
