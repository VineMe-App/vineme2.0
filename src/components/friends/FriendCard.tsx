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
      <Avatar imageUrl={friend.avatar_url} name={fullName} size={48} />
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {shortName || fullName || 'Friend'}
        </Text>
      </View>

      {showActions && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleActionPress}
          activeOpacity={0.7}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFC', // Figma: #f9fafc
    borderWidth: 1,
    borderColor: '#EAEAEA', // Figma: #eaeaea
    borderRadius: 12, // Figma: 12px
    height: 66, // Figma: 66px height
    paddingLeft: 20, // Figma: 20px from container left (avatar at 36px from screen: 16px margin + 20px padding)
    paddingRight: 20,
    marginBottom: 8, // Figma: spacing between cards (card top 258 - previous card bottom 250 = 8px gap)
    marginHorizontal: 16, // Figma: 16px from screen left edge
  },
  textContainer: {
    flex: 1,
    marginLeft: 14, // Figma: spacing between avatar and name (98px - 36px - 48px = 14px)
  },
  name: {
    fontSize: 16, // Figma: 16px
    fontWeight: '700', // Bold
    color: '#2C2235', // Figma: #2c2235
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 18,
  },
  removeButton: {
    backgroundColor: '#2C2235', // Figma: #2c2235
    height: 16, // Figma: 16px height
    width: 51, // Figma: 51px width
    borderRadius: 4, // Figma: 4px border radius
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 9, // Figma: 9px
    fontWeight: '500', // Medium
    letterSpacing: -0.27, // Figma: -0.27px
    lineHeight: 9,
  },
});
