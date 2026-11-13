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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../theme/provider/useTheme';
import { FriendCard } from './FriendCard';
import { FriendRequestCard } from './FriendRequestCard';
import { Avatar } from '../ui/Avatar';
import {
  useFriends,
  useSentFriendRequests,
  useReceivedFriendRequests,
  useRemoveFriend,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useFriendshipStatus,
  useSendFriendRequest,
  useAcceptRejectedFriendRequest,
} from '../../hooks/useFriendships';
import { useSearchUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import type { FriendshipWithUser } from '../../services/friendships';
import type { DatabaseUser } from '../../types/database';
import { getDisplayName, getFullName } from '@/utils/name';

type FilterType = 'friends' | 'received' | 'sent';

interface FriendsListProps {
  userId?: string;
  onViewProfile?: (userId: string) => void;
  onAddFriend?: () => void;
  showSearch?: boolean;
  activeFilter?: FilterType;
  onFilterChange?: (filter: FilterType) => void;
  onSearchChange?: (show: boolean) => void;
}

export function FriendsList({ 
  userId, 
  onViewProfile, 
  onAddFriend, 
  showSearch = false, 
  activeFilter: propActiveFilter, 
  onFilterChange,
  onSearchChange,
}: FriendsListProps) {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const [internalActiveFilter, setInternalActiveFilter] = useState<FilterType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  
  const activeFilter = propActiveFilter !== undefined ? propActiveFilter : internalActiveFilter;
  const setActiveFilter = (filter: FilterType) => {
    if (onFilterChange) {
      onFilterChange(filter);
    } else {
      setInternalActiveFilter(filter);
    }
    // Exit search mode and clear search query when switching tabs
    if (onSearchChange) {
      onSearchChange(false);
    }
    setSearchQuery('');
  };

  // Queries
  const friendsQuery = useFriends(userId);
  const sentRequestsQuery = useSentFriendRequests(userId);
  const receivedRequestsQuery = useReceivedFriendRequests(userId);
  const searchUsersQuery = useSearchUsers(searchQuery, searchQuery.length >= 2);

  // Mutations
  const removeFriendMutation = useRemoveFriend();
  const acceptRequestMutation = useAcceptFriendRequest();
  const rejectRequestMutation = useRejectFriendRequest();
  const sendFriendRequestMutation = useSendFriendRequest();

  const handleRemoveFriend = (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeFriendMutation.mutate(friendId);
          },
        },
      ]
    );
  };

  const handleAcceptRequest = (friendshipId: string) => {
    acceptRequestMutation.mutate(friendshipId);
  };

  const handleRejectRequest = (friendshipId: string) => {
    rejectRequestMutation.mutate(friendshipId);
  };

  const handleCancelRequest = (friendship: FriendshipWithUser) => {
    if (friendship.status !== 'pending') {
      return;
    }

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this friend request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            if (friendship.friend_id) {
              removeFriendMutation.mutate(friendship.friend_id);
            }
          },
        },
      ]
    );
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

  const handleSearchBarPress = () => {
    searchInputRef.current?.focus();
  };

  const getCurrentData = () => {
    switch (activeFilter) {
      case 'friends':
        return friendsQuery.data || [];
      case 'received':
        return receivedRequestsQuery.data || [];
      case 'sent':
        return sentRequestsQuery.data || [];
      default:
        return [];
    }
  };

  const getCurrentLoading = () => {
    switch (activeFilter) {
      case 'friends':
        return friendsQuery.isLoading;
      case 'received':
        return receivedRequestsQuery.isLoading;
      case 'sent':
        return sentRequestsQuery.isLoading;
      default:
        return false;
    }
  };

  const getCurrentError = () => {
    switch (activeFilter) {
      case 'friends':
        return friendsQuery.error;
      case 'received':
        return receivedRequestsQuery.error;
      case 'sent':
        return sentRequestsQuery.error;
      default:
        return null;
    }
  };

  const getFilterCount = (filter: FilterType) => {
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

  const renderFilterButton = (filter: FilterType, label: string) => {
    const count = getFilterCount(filter);
    // No tab is active when search is showing
    const isActive = !showSearch && activeFilter === filter;

    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor: isActive ? '#2C2235' : 'rgba(238, 238, 238, 0)',
          },
        ]}
        onPress={() => setActiveFilter(filter)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.filterButtonText,
            {
              color: isActive ? '#FFFFFF' : '#2C2235',
            },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isActive ? '#FF0083' : '#2C2235',
            },
          ]}
        >
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendshipItem = ({ item }: { item: FriendshipWithUser }) => {
    if (activeFilter === 'friends') {
      return (
        <FriendCard
          friendship={item}
          onRemoveFriend={handleRemoveFriend}
          onViewProfile={onViewProfile}
        />
      );
    } else {
      return (
        <FriendRequestCard
          friendship={item}
          type={activeFilter}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
          onCancel={handleCancelRequest}
          onViewProfile={onViewProfile}
          isLoading={
            acceptRequestMutation.isPending ||
            rejectRequestMutation.isPending ||
            removeFriendMutation.isPending
          }
        />
      );
    }
  };

  const renderSearchUserItem = ({ item }: { item: Partial<DatabaseUser> }) => {
    return (
      <UserSearchItem
        user={item}
        onSendFriendRequest={handleSendFriendRequest}
        isLoading={sendFriendRequestMutation.isPending}
        onViewProfile={onViewProfile}
      />
    );
  };

  const data = getCurrentData();
  const isLoading = getCurrentLoading();
  const error = getCurrentError();
  const filteredUsers = searchUsersQuery.data || [];

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text
          style={[
            styles.errorText,
            {
              fontFamily: theme.typography.fontFamily.medium,
              color: theme.colors.text.primary,
            },
          ]}
        >
          Failed to load friends
        </Text>
        <Text
          style={[
            styles.errorSubtext,
            {
              fontFamily: theme.typography.fontFamily.regular,
              color: theme.colors.text.secondary,
            },
          ]}
        >
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs with Add Button */}
      <View style={styles.filterContainer}>
        <View style={styles.tabsRow}>
          {renderFilterButton('friends', 'Friends')}
          {renderFilterButton('received', 'Requests')}
          {renderFilterButton('sent', 'Sent')}
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: showSearch ? '#FF0083' : 'transparent',
            },
          ]}
          onPress={() => {
            onAddFriend?.();
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="add" 
            size={24} 
            color={showSearch ? '#FFFFFF' : '#2C2235'} 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar - Show when search is active */}
      {showSearch && (
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
      )}

      {/* List or Search Results */}
      {showSearch ? (
        <>
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
              renderItem={renderSearchUserItem}
              keyExtractor={(item) => item.id || ''}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      ) : (
        <FlatList
          data={data}
          renderItem={renderFriendshipItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={() => {
            friendsQuery.refetch();
            sentRequestsQuery.refetch();
            receivedRequestsQuery.refetch();
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  {
                    fontFamily: theme.typography.fontFamily.medium,
                    color: theme.colors.text.primary,
                  },
                ]}
              >
                {activeFilter === 'friends' && 'No friends yet'}
                {activeFilter === 'received' && 'No pending requests'}
                {activeFilter === 'sent' && 'No sent requests'}
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  {
                    fontFamily: theme.typography.fontFamily.regular,
                    color: theme.colors.text.secondary,
                  },
                ]}
              >
                {activeFilter === 'friends' &&
                  'Start connecting with other church members'}
                {activeFilter === 'received' &&
                  'Friend requests will appear here'}
                {activeFilter === 'sent' && 'Your sent requests will appear here'}
              </Text>
            </View>
          }
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
          style={styles.addButtonSmall}
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
        <View style={styles.sentButtonSmall}>
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
    paddingHorizontal: 30, // 16px (card margin) - 10px (button padding) = 6px to align tabs with cards
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
  },
  badge: {
    marginLeft: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 11,
    letterSpacing: -0.27,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
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
  addButtonSmall: {
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
  sentButtonSmall: {
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
