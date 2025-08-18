import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import type { FriendshipWithUser } from '../../services/friendships';

interface FriendRequestCardProps {
  friendship: FriendshipWithUser;
  type: 'sent' | 'received';
  onAccept?: (friendshipId: string) => void;
  onReject?: (friendshipId: string) => void;
  onCancel?: (friendshipId: string) => void;
  isLoading?: boolean;
}

export function FriendRequestCard({
  friendship,
  type,
  onAccept,
  onReject,
  onCancel,
  isLoading = false,
}: FriendRequestCardProps) {
  // For received requests, show the sender (user)
  // For sent requests, show the recipient (friend)
  const displayUser = type === 'received' ? friendship.user : friendship.friend;

  if (!displayUser) {
    return null;
  }

  const handleAccept = () => {
    onAccept?.(friendship.id);
  };

  const handleReject = () => {
    onReject?.(friendship.id);
  };

  const handleCancel = () => {
    onCancel?.(friendship.id);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => displayUser?.id && router.push(`/user/${displayUser.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`View ${displayUser.name}'s profile`}
      >
        <Avatar
          imageUrl={displayUser.avatar_url}
          name={displayUser.name}
          size={50}
        />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{displayUser.name}</Text>
          <Text style={styles.email}>{displayUser.email}</Text>
          <Text style={styles.status}>
            {type === 'received' ? 'Wants to be friends' : 'Request sent'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        {type === 'received' ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isLoading}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={isLoading}
            >
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  acceptButtonText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '500',
  },
  rejectButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  rejectButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '500',
  },
});
