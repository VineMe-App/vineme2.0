import React from 'react';
import {
  View,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
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
    <Card
      variant="default"
      interactive={true}
      onPress={handleCardPress}
      style={styles.container}
      accessibilityLabel={`View ${fullName || 'user'}'s profile`}
    >
      <View style={styles.userInfo}>
        <Avatar imageUrl={friend.avatar_url} name={fullName} size={50} />
        <View style={styles.textContainer}>
          <Text variant="body" weight="semiBold" style={styles.name}>
            {shortName || fullName || 'Friend'}
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.email}>
            {friend.email}
          </Text>
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <Button
            title="Remove"
            onPress={handleActionPress}
            variant="ghost"
            size="small"
            style={styles.removeButton}
            textStyle={styles.removeButtonText}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
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
    marginBottom: 2,
  },
  email: {
    // Typography handled by Text component variant
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  removeButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  removeButtonText: {
    color: '#374151',
    fontSize: 12,
  },
});
