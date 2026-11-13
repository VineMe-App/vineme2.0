import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type GestureResponderEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { getDisplayName, getFullName } from '@/utils/name';
import type { FriendshipWithUser } from '../../services/friendships';

interface FriendRequestCardProps {
  friendship: FriendshipWithUser;
  type: 'sent' | 'received';
  onAccept?: (friendshipId: string) => void;
  onReject?: (friendshipId: string) => void;
  onCancel?: (friendship: FriendshipWithUser) => void;
  isLoading?: boolean;
  onViewProfile?: (userId: string) => void;
}

export function FriendRequestCard({
  friendship,
  type,
  onAccept,
  onReject,
  onCancel,
  isLoading = false,
  onViewProfile,
}: FriendRequestCardProps) {
  // For received requests, show the sender (user)
  // For sent requests, show the recipient (friend)
  const displayUser = type === 'received' ? friendship.user : friendship.friend;

  if (!displayUser) {
    return null;
  }

  const shortName = getDisplayName(displayUser, {
    lastInitial: true,
    fallback: 'full',
  });
  const fullName = getFullName(displayUser);

  const handleAccept = () => {
    onAccept?.(friendship.id);
  };

  const handleReject = () => {
    onReject?.(friendship.id);
  };

  const handleCancel = () => {
    onCancel?.(friendship);
  };

  const wrapAction = (fn?: () => void) => (event: GestureResponderEvent) => {
    event.stopPropagation();
    fn?.();
  };

  const handleCardPress = () => {
    if (displayUser?.id) {
      if (onViewProfile) {
        onViewProfile(displayUser.id);
      } else {
        router.push(`/user/${displayUser.id}`);
      }
    }
  };

  const showCancel =
    type === 'sent' && friendship.status === 'pending' && !!onCancel;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleCardPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`View ${fullName || 'user'}'s profile`}
    >
      <Avatar imageUrl={displayUser.avatar_url} name={fullName} size={48} />
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {shortName || fullName || 'User'}
        </Text>
        {type === 'sent' && (
          <Text style={styles.statusText}>Request sent</Text>
        )}
        {type === 'received' && (
          <Text style={styles.statusText}>Wants to be friends</Text>
        )}
      </View>

      <View style={styles.actions}>
        {type === 'received' ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={wrapAction(handleAccept)}
              disabled={isLoading}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={wrapAction(handleReject)}
              disabled={isLoading}
            >
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>
          </>
        ) : (
          showCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={wrapAction(handleCancel)}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFC', // Match FriendCard
    borderWidth: 1,
    borderColor: '#EAEAEA', // Match FriendCard
    borderRadius: 12, // Match FriendCard
    height: 66, // Match FriendCard
    paddingLeft: 20, // Match FriendCard
    paddingRight: 20,
    marginBottom: 8, // Match FriendCard
    marginHorizontal: 16, // Match FriendCard
  },
  textContainer: {
    flex: 1,
    marginLeft: 14, // Match FriendCard spacing
  },
  name: {
    fontSize: 16, // Match FriendCard
    fontWeight: '700', // Bold - Match FriendCard
    color: '#2C2235', // Match FriendCard
    letterSpacing: -0.32, // Match FriendCard
    lineHeight: 18,
  },
  statusText: {
    fontSize: 14, // Status text size
    fontWeight: '500', // Medium
    color: '#999999', // Grey color for status
    letterSpacing: -0.28,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
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
    backgroundColor: '#FF0083', // Red/pink color
    height: 16, // Match remove button size
    width: 51, // Match remove button width
    borderRadius: 4, // Match remove button
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 9, // Match remove button text size
    fontWeight: '500', // Medium
    letterSpacing: -0.27, // Match remove button
    lineHeight: 9,
  },
});
