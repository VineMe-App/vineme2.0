import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Avatar } from '../ui/Avatar';
import { useSearchUsers } from '../../hooks/useUsers';
import {
  useFriendshipStatus,
  useSendFriendRequest,
  useAcceptRejectedFriendRequest,
  useFriends,
  useSentFriendRequests,
  useReceivedFriendRequests,
} from '../../hooks/useFriendships';
import { useAuth } from '../../hooks/useAuth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { DatabaseUser } from '../../types/database';
import { getDisplayName, getFullName } from '@/utils/name';

interface FriendSearchProps {
  onClose?: () => void;
  onViewProfile?: (userId: string) => void;
  userId?: string;
  activeFilter?: 'friends' | 'received' | 'sent';
}

export function FriendSearch({ onClose, onViewProfile, userId, activeFilter = 'friends' }: FriendSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const { user } = useAuth();

  // Get counts for tabs
  const friendsQuery = useFriends(userId);
  const sentRequestsQuery = useSentFriendRequests(userId);
  const receivedRequestsQuery = useReceivedFriendRequests(userId);

  const searchUsersQuery = useSearchUsers(searchQuery, searchQuery.length >= 2);
  const sendFriendRequestMutation = useSendFriendRequest();

  const getFilterCount = (filter: 'friends' | 'received' | 'sent') => {
    switch (filter) {
      case 'friends':
        return friendsQuery.data?.length || 0;
      case 'received':
        return receivedRequestsQuery.data?.length || 0;
      case 'sent':
        return sentRequestsQuery.data?.length || 0;
      default:
        return 0;
    }
  };

  const handleSearchBarPress = () => {
    searchInputRef.current?.focus();
  };

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
    return (
      <UserSearchItem
        user={item}
        onSendFriendRequest={handleSendFriendRequest}
        isLoading={sendFriendRequestMutation.isPending}
        onViewProfile={onViewProfile}
      />
    );
  };

  const filteredUsers = searchUsersQuery.data || [];

  return (
    <View style={styles.container}>
      {/* Tabs - Inactive when searching */}
      <View style={styles.filterContainer}>
        <View style={styles.tabsRow}>
          <View style={[styles.filterButton, { backgroundColor: activeFilter === 'friends' ? '#FFFFFF' : 'rgba(238, 238, 238, 0)' }]}>
            <Text style={styles.filterButtonText}>Friends</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getFilterCount('friends')}</Text>
            </View>
          </View>
          <View style={[styles.filterButton, { backgroundColor: activeFilter === 'received' ? '#FFFFFF' : 'rgba(238, 238, 238, 0)' }]}>
            <Text style={styles.filterButtonText}>Requests</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getFilterCount('received')}</Text>
            </View>
          </View>
          <View style={[styles.filterButton, { backgroundColor: activeFilter === 'sent' ? '#FFFFFF' : 'rgba(238, 238, 238, 0)' }]}>
            <Text style={styles.filterButtonText}>Sent</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getFilterCount('sent')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search Bar - Figma design - Fully tappable */}
      <View style={styles.searchBarContainer}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={handleSearchBarPress}
          activeOpacity={1}
        >
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search name"
            placeholderTextColor="#939393"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={24} color="#2C2235" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Results */}
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
  onViewProfile?: (userId: string) => void;
}

function UserSearchItem({
  user,
  onSendFriendRequest,
  isLoading,
  onViewProfile,
}: UserSearchItemProps) {
  const { user: currentUser } = useAuth();
  const shortName = getDisplayName(user, {
    lastInitial: true,
    fallback: 'full',
  });
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

  const handleCardPress = () => {
    if (user?.id) {
      if (onViewProfile) {
        onViewProfile(user.id);
      } else {
        router.push(`/user/${user.id}`);
      }
    }
  };

  // Don't show "Add" button if this is the current user's own card
  const isSelf = user.id === currentUser?.id;
  // Only show "Add" button if not already friends or pending, and not viewing own card
  const showAddButton = !isSelf && status !== 'accepted' && status !== 'pending';
  const showSentButton = !isSelf && status === 'pending' && !isIncoming;

  return (
    <TouchableOpacity
      style={styles.userCard}
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <Avatar imageUrl={user.avatar_url} name={fullName} size={48} />
      <View style={styles.textContainer}>
        <Text style={styles.userName} numberOfLines={1}>
          {shortName || fullName || 'User'}
        </Text>
      </View>
      {showAddButton && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={(e) => {
            e.stopPropagation();
            handleSendRequest();
          }}
          activeOpacity={0.7}
          disabled={isLoading || acceptRejected.isPending || friendshipStatusQuery.isLoading}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      )}
      {showSentButton && (
        <View style={styles.sentButton}>
          <Text style={styles.sentButtonText}>Sent</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 19,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 7,
    height: 36,
    minWidth: 71,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.32,
    lineHeight: 14,
    color: '#2C2235',
  },
  badge: {
    marginLeft: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2235',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 11,
    letterSpacing: -0.27,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: '#F9F7F7',
    borderRadius: 25,
    height: 50,
    width: 342,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2235',
    letterSpacing: -0.32,
    lineHeight: 16,
    paddingVertical: 0,
  },
  searchIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingHorizontal: 17,
    paddingTop: 0,
    paddingBottom: 100,
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFC',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    height: 66,
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 8,
    width: 360,
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2235',
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  addButton: {
    backgroundColor: '#2C2235',
    height: 16,
    width: 51,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: -0.27,
    lineHeight: 9,
  },
  sentButton: {
    backgroundColor: '#FF0083',
    height: 16,
    width: 51,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: -0.27,
    lineHeight: 9,
  },
});
