import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { getDisplayName, getFullName } from '@/utils/name';
import { useGroupJoinRequests } from '../../hooks/useJoinRequests';
import { useUserGroups } from '../../hooks/useGroups';
import type { GroupJoinRequestWithUser } from '../../types/database';

interface JoinRequestNotificationsProps {
  userId: string;
  onRequestPress?: (request: GroupJoinRequestWithUser) => void;
}

export const JoinRequestNotifications: React.FC<
  JoinRequestNotificationsProps
> = ({ userId, onRequestPress }) => {
  const { data: userGroups } = useUserGroups(userId);

  // Get join requests for all groups where user is a leader
  const leaderGroups =
    userGroups?.filter((group) =>
      group.memberships?.some(
        (m) => m.user_id === userId && m.role === 'leader'
      )
    ) || [];

  // Collect all pending requests from leader groups
  const allPendingRequests: GroupJoinRequestWithUser[] = [];

  leaderGroups.forEach((group) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: requests } = useGroupJoinRequests(group.id, userId);
    const pendingRequests =
      requests?.filter((r) => r.status === 'pending') || [];
    allPendingRequests.push(...pendingRequests.map((r) => ({ ...r, group })));
  });

  if (allPendingRequests.length === 0) {
    return null;
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const requestDate = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Join Requests</Text>
        <Badge text={allPendingRequests.length.toString()} variant="danger" />
      </View>

      <ScrollView
        style={styles.requestsList}
        showsVerticalScrollIndicator={false}
        horizontal
      >
        {allPendingRequests.slice(0, 5).map((request) => {
          const requesterFullName = getFullName(request.user);
          const requesterShortName = getDisplayName(request.user, {
            lastInitial: true,
            fallback: 'full',
          });

          return (
            <TouchableOpacity
              key={request.id}
              style={styles.requestItem}
              onPress={() => onRequestPress?.(request)}
            >
              <Avatar
                size={32}
                imageUrl={request.user?.avatar_url}
                name={requesterFullName}
              />
              <View style={styles.requestInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {requesterShortName || requesterFullName || 'Unknown'}
                </Text>
                <Text style={styles.groupName} numberOfLines={1}>
                  {request.group?.title}
                </Text>
                <Text style={styles.timeAgo}>
                  {formatTimeAgo(request.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {allPendingRequests.length > 5 && (
          <View style={styles.moreIndicator}>
            <Text style={styles.moreText}>
              +{allPendingRequests.length - 5} more
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  requestsList: {
    flexDirection: 'row',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
    minWidth: 140,
  },
  requestInfo: {
    marginLeft: 8,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  groupName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 11,
    color: '#999',
  },
  moreIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
