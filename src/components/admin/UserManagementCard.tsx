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
import { getDisplayName, getFullName } from '@/utils/name';

interface UserManagementCardProps {
  user: UserWithGroupStatus;
  onPress?: () => void;
}

export function UserManagementCard({ user, onPress }: UserManagementCardProps) {

  const getConnectionStatusText = () => {
    return user.is_connected ? 'Connected' : 'Unconnected';
  };

  const fullName = getFullName(user);
  const displayName = getDisplayName(user) || fullName || 'Member';

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        {...AccessibilityHelpers.createNavigationProps(
          AdminAccessibilityLabels.userConnectionStatus(
            displayName,
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
            name={fullName || displayName}
            accessibilityLabel={`Profile picture for ${displayName}`}
          />
          <View style={styles.userInfo}>
            <Text
              style={styles.userName}
              accessibilityRole="header"
              accessibilityLevel={3}
            >
              {displayName}
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
                displayName,
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
            title="WhatsApp"
            onPress={() => {}}
            variant="primary"
            size="small"
            style={styles.actionButton}
            accessibilityLabel={`Contact ${displayName} on WhatsApp (coming soon)`}
            accessibilityHint="This button will open WhatsApp in a future update"
          />
          <Button
            title="Email"
            onPress={() => {}}
            variant="secondary"
            size="small"
            style={styles.actionButton}
            accessibilityLabel={`Email ${displayName} (coming soon)`}
            accessibilityHint="This button will open your email app in a future update"
          />
        </View>
      </TouchableOpacity>
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
