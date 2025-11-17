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

interface FriendCardProps {
  friendship: FriendshipWithUser;
  onRemoveFriend?: (friendId: string) => void;
  showActions?: boolean;
  onViewProfile?: (userId: string) => void;
}

export function FriendCard({
  friendship,
  onRemoveFriend,
  showActions = true,
  onViewProfile,
}: FriendCardProps) {
  const friend = friendship.friend;

  if (!friend) {
    return null;
  }

  const shortName = getDisplayName(friend, {
    lastInitial: true,
    fallback: 'full',
  });
  const fullName = getFullName(friend);

  const handleCardPress = () => {
    if (friend?.id) {
      if (onViewProfile) {
        onViewProfile(friend.id);
      } else {
        router.push(`/user/${friend.id}`);
      }
    }
  };

  const handleRemoveFriend = () => {
    if (friend?.id) {
      onRemoveFriend?.(friend.id);
    }
  };

  const handleActionPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    handleRemoveFriend();
  };

  // Block user action removed

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleCardPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`View ${fullName || 'user'}'s profile`}
    >
      <View style={styles.userInfo}>
        <Avatar imageUrl={friend.avatar_url} name={fullName} size={50} />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{shortName || fullName || 'Friend'}</Text>
          <Text style={styles.email}>{friend.email}</Text>
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={handleActionPress}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
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
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9, // Updated to pill shape (half of paddingVertical: 6 * 2 + text height)
    minWidth: 60,
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  removeButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
});
