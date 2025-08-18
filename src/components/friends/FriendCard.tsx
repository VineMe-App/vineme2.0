import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';

import type { FriendshipWithUser } from '../../services/friendships';

interface FriendCardProps {
  friendship: FriendshipWithUser;
  onRemoveFriend?: (friendId: string) => void;
  onBlockUser?: (friendId: string) => void;
  showActions?: boolean;
}

export function FriendCard({
  friendship,
  onRemoveFriend,
  onBlockUser,
  showActions = true,
}: FriendCardProps) {
  const friend = friendship.friend;

  if (!friend) {
    return null;
  }

  const handleRemoveFriend = () => {
    if (friend?.id) {
      onRemoveFriend?.(friend.id);
    }
  };

  const handleBlockUser = () => {
    if (friend?.id) {
      onBlockUser?.(friend.id);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => friend?.id && router.push(`/user/${friend.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`View ${friend.name}'s profile`}
      >
        <Avatar imageUrl={friend.avatar_url} name={friend.name} size={50} />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{friend.name}</Text>
          <Text style={styles.email}>{friend.email}</Text>
        </View>
      </TouchableOpacity>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={handleRemoveFriend}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.blockButton]}
            onPress={handleBlockUser}
          >
            <Text style={styles.blockButtonText}>Block</Text>
          </TouchableOpacity>
        </View>
      )}
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
  blockButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  blockButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '500',
  },
});
