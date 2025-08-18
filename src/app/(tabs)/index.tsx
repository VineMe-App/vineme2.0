import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '../../stores/auth';
import { router } from 'expo-router';
import { useUpcomingEvents } from '../../hooks/useEvents';
import { useUserGroupMemberships } from '../../hooks/useUsers';
import {
  useFriends,
  useReceivedFriendRequests,
} from '../../hooks/useFriendships';
// import { EventCard } from '../../components/events/EventCard'; // Events disabled
import { GroupCard } from '../../components/groups/GroupCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { FriendRequestNotifications } from '../../components/friends/FriendRequestNotifications';
import { Ionicons } from '@expo/vector-icons';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';

export default function HomeScreen() {
  const { user, userProfile } = useAuthStore();

  // Get user's church ID for filtering data
  const churchId = userProfile?.church_id;
  const userId = user?.id;

  // Fetch dashboard data
  // Events temporarily disabled - coming soon
  // const {
  //   data: upcomingEvents,
  //   isLoading: eventsLoading,
  //   refetch: refetchEvents,
  // } = useUpcomingEvents(churchId || '', 3);

  const {
    data: userGroupMemberships,
    isLoading: groupsLoading,
    refetch: refetchGroups,
  } = useUserGroupMemberships(userId);

  const {
    data: friends,
    isLoading: friendsLoading,
    refetch: refetchFriends,
  } = useFriends(userId);

  const {
    data: pendingFriendRequests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useReceivedFriendRequests(userId);

  // Calculate dashboard stats
  const acceptedFriends = friends || [];
  const pendingRequests = pendingFriendRequests || [];

  const isLoading =
    groupsLoading || friendsLoading || requestsLoading;

  // Handle refresh
  const handleRefresh = React.useCallback(async () => {
    await Promise.all([
      // refetchEvents(), // Events disabled
      refetchGroups(),
      refetchFriends(),
      refetchRequests(),
    ]);
  }, [refetchGroups, refetchFriends, refetchRequests]);

  if (isLoading && !userGroupMemberships) {
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
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
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

        <View style={styles.headerRight}>
          {pendingRequests.length > 0 && (
            <FriendRequestNotifications
              requests={pendingRequests}
              onPress={() => router.push('/(tabs)/profile')}
            />
          )}
        </View>

        {/* Church + Service + (optional) Manage Church CTA in one cohesive card */}
        <ChurchAdminOnly
          fallback={
            <View style={styles.orgCard}>
              <View style={styles.orgLeft}>
                {userProfile?.church?.name && (
                  <View style={styles.orgRow}>
                    <Ionicons name="home-outline" size={16} color="#374151" />
                    <Text style={styles.orgText} numberOfLines={1}>{userProfile.church.name}</Text>
                  </View>
                )}
                {userProfile?.service?.name && (
                  <View style={styles.orgRow}>
                    <Ionicons name="calendar-outline" size={16} color="#374151" />
                    <Text style={styles.orgText} numberOfLines={1}>{userProfile.service.name}</Text>
                  </View>
                )}
              </View>
            </View>
          }
        >
          <TouchableOpacity style={[styles.orgCard, styles.orgCardClickable]} onPress={() => router.push('/admin')}>
            <View style={styles.orgLeft}>
              {userProfile?.church?.name && (
                <View style={styles.orgRow}>
                  <Ionicons name="home-outline" size={16} color="#374151" />
                  <Text style={styles.orgText} numberOfLines={1}>{userProfile.church.name}</Text>
                </View>
              )}
              {userProfile?.service?.name && (
                <View style={styles.orgRow}>
                  <Ionicons name="calendar-outline" size={16} color="#374151" />
                  <Text style={styles.orgText} numberOfLines={1}>{userProfile.service.name}</Text>
                </View>
              )}
            </View>
            <View style={styles.orgRight}>
              <Ionicons name="settings-outline" size={16} color="#111827" />
              <Text style={styles.orgCta}>Manage Church</Text>
              <Ionicons name="chevron-forward-outline" size={16} color="#6b7280" />
            </View>
          </TouchableOpacity>
        </ChurchAdminOnly>
      </View>

      {/* Simplified My Groups Section with horizontal scroll */}

      {/* My Groups Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Groups</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/groups')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {userGroupMemberships && userGroupMemberships.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {userGroupMemberships.map((membership) => (
              <View key={membership.group_id} style={styles.horizontalCard}>
                <GroupCard
                  group={membership.group}
                  membershipStatus={membership.role}
                  onPress={() => router.push(`/group/${membership.group.id}`)}
                  style={{ width: 260, minHeight: 374, marginHorizontal: 0 }}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            title="No groups yet"
            message="Join a Bible study group to connect with your community"
            icon={null}
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

      {/* Small disclaimer about upcoming events (near bottom) */}
      <TouchableOpacity onPress={() => router.push('/(tabs)/events')} activeOpacity={0.8}>
        <Card style={styles.eventsBanner}>
          <View style={styles.eventsBannerRow}>
            <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
            <Text style={styles.eventsBannerText}>
              Events are coming soon. Tap to learn more.
            </Text>
            <Ionicons name="chevron-forward-outline" size={18} color="#6b7280" />
          </View>
        </Card>
      </TouchableOpacity>

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
  headerMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  orgCardClickable: {
    backgroundColor: '#f9fafb',
  },
  orgLeft: {
    flex: 1,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  orgText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  orgRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
  orgCta: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manageButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  eventsBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  eventsBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventsBannerText: {
    color: '#374151',
    fontSize: 14,
    flex: 1,
  },
  seeAllText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  horizontalCard: {
    marginRight: 12,
  },
  emptyIcon: {},
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
  bottomSpacing: {
    height: 20,
  },
});
