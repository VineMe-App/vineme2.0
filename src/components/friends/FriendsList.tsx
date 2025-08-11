import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FriendCard } from './FriendCard';
import { FriendRequestCard } from './FriendRequestCard';
import {
  useFriends,
  useSentFriendRequests,
  useReceivedFriendRequests,
  useRemoveFriend,
  useBlockUser,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from '../../hooks/useFriendships';
import type { FriendshipWithUser } from '../../services/friendships';

type FilterType = 'friends' | 'received' | 'sent';

interface FriendsListProps {
  userId?: string;
}

export function FriendsList({ userId }: FriendsListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('friends');

  // Queries
  const friendsQuery = useFriends(userId);
  const sentRequestsQuery = useSentFriendRequests(userId);
  const receivedRequestsQuery = useReceivedFriendRequests(userId);

  // Mutations
  const removeFriendMutation = useRemoveFriend();
  const blockUserMutation = useBlockUser();
  const acceptRequestMutation = useAcceptFriendRequest();
  const rejectRequestMutation = useRejectFriendRequest();

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

  const handleBlockUser = (friendId: string) => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will not be able to send you friend requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            blockUserMutation.mutate(friendId);
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

  const handleCancelRequest = (friendshipId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this friend request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            // For sent requests, we can remove the friendship
            removeFriendMutation.mutate(friendshipId);
          },
        },
      ]
    );
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
    const isActive = activeFilter === filter;

    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => setActiveFilter(filter)}
      >
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.activeFilterButtonText,
          ]}
        >
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.badge, isActive && styles.activeBadge]}>
            <Text
              style={[styles.badgeText, isActive && styles.activeBadgeText]}
            >
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFriendshipItem = ({ item }: { item: FriendshipWithUser }) => {
    if (activeFilter === 'friends') {
      return (
        <FriendCard
          friendship={item}
          onRemoveFriend={handleRemoveFriend}
          onBlockUser={handleBlockUser}
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
          isLoading={
            acceptRequestMutation.isPending ||
            rejectRequestMutation.isPending ||
            removeFriendMutation.isPending
          }
        />
      );
    }
  };

  const data = getCurrentData();
  const isLoading = getCurrentLoading();
  const error = getCurrentError();

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load friends</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {renderFilterButton('friends', 'Friends')}
        {renderFilterButton('received', 'Requests')}
        {renderFilterButton('sent', 'Sent')}
      </View>

      {/* List */}
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
            <Text style={styles.emptyText}>
              {activeFilter === 'friends' && 'No friends yet'}
              {activeFilter === 'received' && 'No pending requests'}
              {activeFilter === 'sent' && 'No sent requests'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'friends' &&
                'Start connecting with other church members'}
              {activeFilter === 'received' &&
                'Friend requests will appear here'}
              {activeFilter === 'sent' && 'Your sent requests will appear here'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeFilterButton: {
    backgroundColor: '#8b5cf6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  badge: {
    marginLeft: 6,
    backgroundColor: '#6b7280',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    backgroundColor: '#fff',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  activeBadgeText: {
    color: '#8b5cf6',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
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
    color: '#dc2626',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
