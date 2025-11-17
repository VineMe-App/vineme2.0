import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/provider/useTheme';
import { FriendCard } from './FriendCard';
import { FriendRequestCard } from './FriendRequestCard';
import {
  useFriends,
  useSentFriendRequests,
  useReceivedFriendRequests,
  useRemoveFriend,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from '../../hooks/useFriendships';
import type { FriendshipWithUser } from '../../services/friendships';

type FilterType = 'friends' | 'received' | 'sent';

interface FriendsListProps {
  userId?: string;
  onViewProfile?: (userId: string) => void;
}

export function FriendsList({ userId, onViewProfile }: FriendsListProps) {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterType>('friends');

  // Queries
  const friendsQuery = useFriends(userId);
  const sentRequestsQuery = useSentFriendRequests(userId);
  const receivedRequestsQuery = useReceivedFriendRequests(userId);

  // Mutations
  const removeFriendMutation = useRemoveFriend();
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

  // Block user functionality removed per product decision

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
        style={[
          styles.filterButton,
          {
            backgroundColor: isActive
              ? theme.colors.primary[500] // Pink when active
              : theme.colors.secondary[100], // Green when not active
          },
        ]}
        onPress={() => setActiveFilter(filter)}
      >
        <Text
          style={[
            styles.filterButtonText,
            {
              fontFamily: theme.typography.fontFamily.medium,
              color: isActive
                ? theme.colors.secondary[100] // Green when active
                : theme.colors.primary[500], // Pink when not active
            },
          ]}
        >
          {label}
        </Text>
        {count > 0 && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isActive
                  ? theme.colors.secondary[100] // Green when active
                  : theme.colors.primary[500], // Pink when not active
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  fontFamily: theme.typography.fontFamily.medium,
                  color: isActive
                    ? theme.colors.primary[500] // Pink when active
                    : theme.colors.secondary[100], // Green when not active
                },
              ]}
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

  const data = getCurrentData();
  const isLoading = getCurrentLoading();
  const error = getCurrentError();

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
    // Background color now set dynamically with theme
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    // Color and fontFamily now set dynamically with theme
  },
  badge: {
    marginLeft: 6,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Background color now set dynamically with theme
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    // Color and fontFamily now set dynamically with theme
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
    marginBottom: 8,
    // Color and fontFamily now set dynamically with theme
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    // Color and fontFamily now set dynamically with theme
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
    // Color and fontFamily now set dynamically with theme
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    // Color and fontFamily now set dynamically with theme
  },
});
