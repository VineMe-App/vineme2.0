import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from '../ui/Avatar';
import type { FriendshipWithUser } from '../../types/database';

interface FriendRequestNotificationsProps {
  requests?: FriendshipWithUser[];
  onPress?: () => void;
  maxDisplay?: number;
}

export function FriendRequestNotifications({
  requests,
  onPress,
  maxDisplay = 3,
}: FriendRequestNotificationsProps) {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const displayRequests = safeRequests.slice(0, maxDisplay);
  const remainingCount = Math.max(0, safeRequests.length - maxDisplay);

  if (safeRequests.length === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Friend Requests</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{safeRequests.length}</Text>
        </View>
      </View>

      <View style={styles.requestsContainer}>
        {displayRequests.map((request) => {
          const sender = request.friend || request.user;
          if (!sender) return null;

          return (
            <View key={request.id} style={styles.requestItem}>
              <Avatar
                uri={sender.avatar_url}
                name={sender.name}
                size={32}
              />
              <Text style={styles.requestText} numberOfLines={1}>
                <Text style={styles.senderName}>{sender.name}</Text> wants to be
                friends
              </Text>
            </View>
          );
        })}

        {remainingCount > 0 && (
          <Text style={styles.moreText}>
            and {remainingCount} more request{remainingCount > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <Text style={styles.tapText}>Tap to view all requests</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  badge: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  requestsContainer: {
    marginBottom: 8,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  senderName: {
    fontWeight: '600',
    color: '#1f2937',
  },
  moreText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  tapText: {
    fontSize: 12,
    color: '#0c4a6e',
    textAlign: 'center',
    fontWeight: '500',
  },
});
