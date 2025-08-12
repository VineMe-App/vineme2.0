import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl 
} from 'react-native';
import { useAuthStore } from '../../stores/auth';
import { router } from 'expo-router';
import { useUpcomingEvents } from '../../hooks/useEvents';
import { useUserGroupMemberships } from '../../hooks/useUsers';
import { useFriends, useReceivedFriendRequests } from '../../hooks/useFriendships';
import { EventCard } from '../../components/events/EventCard';
import { GroupCard } from '../../components/groups/GroupCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { FriendRequestNotifications } from '../../components/friends/FriendRequestNotifications';

export default function HomeScreen() {
  const { user, userProfile } = useAuthStore();
  
  // Get user's church ID for filtering data
  const churchId = userProfile?.church_id;
  const userId = user?.id;

  // Fetch dashboard data
  const { 
    data: upcomingEvents, 
    isLoading: eventsLoading, 
    refetch: refetchEvents 
  } = useUpcomingEvents(churchId || '', 3);
  
  const { 
    data: userGroupMemberships, 
    isLoading: groupsLoading, 
    refetch: refetchGroups 
  } = useUserGroupMemberships(userId);
  
  const { 
    data: friends, 
    isLoading: friendsLoading, 
    refetch: refetchFriends 
  } = useFriends(userId);
  
  const { 
    data: pendingFriendRequests, 
    isLoading: requestsLoading, 
    refetch: refetchRequests 
  } = useReceivedFriendRequests(userId);

  // Calculate dashboard stats
  const acceptedFriends = friends || [];
  const pendingRequests = pendingFriendRequests || [];

  // Handle refresh
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchEvents(),
      refetchGroups(),
      refetchFriends(),
      refetchRequests(),
    ]);
    setRefreshing(false);
  }, [refetchEvents, refetchGroups, refetchFriends, refetchRequests]);

  const isLoading = eventsLoading || groupsLoading || friendsLoading || requestsLoading;

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Loading your dashboard..." />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with user info */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          <Avatar 
            uri={userProfile?.avatar_url} 
            name={userProfile?.name || user?.email || 'User'} 
            size={60}
          />
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>
              Hello, {userProfile?.name || 'there'}!
            </Text>
            <Text style={styles.subtitle}>Welcome back to VineMe</Text>
          </View>
        </View>
        
        {/* Friend request notifications */}
        {pendingRequests.length > 0 && (
          <FriendRequestNotifications 
            requests={pendingRequests}
            onPress={() => router.push('/(tabs)/profile')}
          />
        )}
      </View>

      {/* Dashboard stats */}
      <View style={styles.statsSection}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{userGroupMemberships?.length || 0}</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{upcomingEvents?.length || 0}</Text>
          <Text style={styles.statLabel}>Upcoming Events</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{acceptedFriends.length}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </Card>
      </View>

      {/* Upcoming Events Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {upcomingEvents && upcomingEvents.length > 0 ? (
          <View style={styles.horizontalList}>
            {upcomingEvents.map((event) => (
              <View key={event.id} style={styles.horizontalCard}>
                <EventCard
                  event={event}
                  onPress={() => router.push(`/event/${event.id}`)}
                />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No upcoming events"
            message="Check back later for new events from your church"
            icon={<Text style={styles.emptyIcon}>📅</Text>}
          />
        )}
      </View>

      {/* My Groups Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Groups</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/groups')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {userGroupMemberships && userGroupMemberships.length > 0 ? (
          <View style={styles.horizontalList}>
            {userGroupMemberships.slice(0, 3).map((membership) => (
              <View key={membership.group_id} style={styles.horizontalCard}>
                <GroupCard
                  group={membership.group}
                  membershipStatus={membership.role}
                  onPress={() => router.push(`/group/${membership.group.id}`)}
                />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No groups yet"
            message="Join a Bible study group to connect with your community"
            icon={<Text style={styles.emptyIcon}>👥</Text>}
            action={
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/groups')}
              >
                <Text style={styles.actionButtonText}>Browse Groups</Text>
              </TouchableOpacity>
            }
          />
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(tabs)/groups')}
          >
            <Text style={styles.quickActionIcon}>👥</Text>
            <Text style={styles.quickActionText}>Browse Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(tabs)/events')}
          >
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionText}>View Events</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.quickActionIcon}>👤</Text>
            <Text style={styles.quickActionText}>Edit Profile</Text>
          </TouchableOpacity>

          {pendingRequests.length > 0 && (
            <TouchableOpacity
              style={[styles.quickActionCard, styles.notificationCard]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.quickActionIcon}>🔔</Text>
              <Text style={styles.quickActionText}>
                Friend Requests ({pendingRequests.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  seeAllText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  horizontalList: {
    paddingLeft: 4,
  },
  horizontalCard: {
    marginBottom: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: '45%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
});
