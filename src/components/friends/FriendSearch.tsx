import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useSearchUsers } from '../../hooks/useUsers';
import {
  useFriendshipStatus,
  useSendFriendRequest,
  useAcceptRejectedFriendRequest,
} from '../../hooks/useFriendships';
import { useAuth } from '../../hooks/useAuth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { DatabaseUser } from '../../types/database';
import { getDisplayName, getFullName } from '@/utils/name';

interface FriendSearchProps {
  onClose?: () => void;
}

export function FriendSearch({ onClose }: FriendSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const searchUsersQuery = useSearchUsers(searchQuery, searchQuery.length >= 2);
  const sendFriendRequestMutation = useSendFriendRequest();

  const handleSendFriendRequest = (friendId: string, friendName: string) => {
    Alert.alert(
      'Send Friend Request',
      `Send a friend request to ${friendName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            sendFriendRequestMutation.mutate(friendId, {
              onSuccess: () => {
                Alert.alert('Success', 'Friend request sent!');
              },
              onError: (error) => {
                Alert.alert('Error', error.message);
              },
            });
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }: { item: Partial<DatabaseUser> }) => {
    // Don't show current user in search results
    if (item.id === user?.id) {
      return null;
    }

    return (
      <UserSearchItem
        user={item}
        onSendFriendRequest={handleSendFriendRequest}
        isLoading={sendFriendRequestMutation.isPending}
      />
    );
  };

  const filteredUsers =
    searchUsersQuery.data?.filter((u) => u.id !== user?.id) || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Friends</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <Input
        placeholder="Search by name or email..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {searchQuery.length < 2 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Enter at least 2 characters to search
          </Text>
        </View>
      ) : searchUsersQuery.isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id || ''}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

interface UserSearchItemProps {
  user: Partial<DatabaseUser>;
  onSendFriendRequest: (friendId: string, friendName: string) => void;
  isLoading: boolean;
}

function UserSearchItem({
  user,
  onSendFriendRequest,
  isLoading,
}: UserSearchItemProps) {
  const { user: currentUser } = useAuth();
  const shortName = getDisplayName(user, { lastInitial: true, fallback: 'full' });
  const fullName = getFullName(user);
  const friendshipStatusQuery = useFriendshipStatus(
    user.id || '',
    currentUser?.id
  );
  const acceptRejected = useAcceptRejectedFriendRequest();
  const statusDetails = friendshipStatusQuery.data;
  const status = statusDetails?.status;
  const isIncoming = statusDetails?.direction === 'incoming';

  const handleSendRequest = () => {
    if (!user.id) return;

    if (status === 'rejected' && isIncoming) {
      acceptRejected.mutate(user.id, {
        onSuccess: () => {
          Alert.alert('Success', 'Friend request accepted!');
          friendshipStatusQuery.refetch();
        },
        onError: (error) => {
          Alert.alert('Error', error.message);
        },
      });
      return;
    }

    onSendFriendRequest(user.id, fullName || shortName || 'this person');
  };

  const getButtonState = () => {
    if (friendshipStatusQuery.isLoading) {
      return {
        text: 'Loading...',
        disabled: true,
        variant: 'secondary' as const,
      };
    }

    switch (status) {
      case 'accepted':
        return {
          text: 'Friends',
          disabled: true,
          variant: 'secondary' as const,
        };
      case 'pending':
        return {
          text: 'Request Sent',
          disabled: true,
          variant: 'secondary' as const,
        };
      case 'rejected':
        if (isIncoming) {
          return {
            text: 'Add Friend',
            disabled: acceptRejected.isPending,
            variant: 'primary' as const,
          };
        }
        return {
          text: 'Request Sent',
          disabled: true,
          variant: 'secondary' as const,
        };
      // 'blocked' status removed
      default:
        return {
          text: 'Add Friend',
          disabled: false,
          variant: 'primary' as const,
        };
    }
  };

  const buttonState = getButtonState();

  return (
    <View style={styles.userItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => user.id && router.push(`/user/${user.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`View ${fullName || 'user'}'s profile`}
      >
        <Avatar imageUrl={user.avatar_url} name={fullName} size={50} />
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{shortName || fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      </TouchableOpacity>

      <Button
        title={buttonState.text}
        onPress={handleSendRequest}
        disabled={
          buttonState.disabled ||
          isLoading ||
          acceptRejected.isPending ||
          friendshipStatusQuery.isLoading
        }
        variant={buttonState.variant}
        size="small"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  searchInput: {
    margin: 16,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
});
