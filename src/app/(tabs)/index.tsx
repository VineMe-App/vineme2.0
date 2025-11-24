import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { useAuthStore } from '../../stores/auth';
import { router } from 'expo-router';
// import { useUpcomingEvents } from '../../hooks/useEvents'; // Events disabled - keeping for future use
import { useUserGroupMemberships } from '../../hooks/useUsers';
import { useUserJoinRequests } from '../../hooks/useJoinRequests';
import { useFriends } from '../../hooks/useFriendships';
// import { EventCard } from '../../components/events/EventCard'; // Events disabled
import { GroupCard } from '../../components/groups/GroupCard';
import { useGroupMembers } from '../../hooks/useGroups';
import type { GroupWithDetails } from '../../types/database';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { useTheme } from '@/theme/provider/useTheme';
import { formatServiceTime } from '@/utils/helpers';
import { NotificationIconWithBadge } from '@/components/ui/NotificationIconWithBadge';
import { useNotificationBadge } from '@/hooks/useNotifications';
import { Image } from 'react-native';
import { CTACard } from '@/components/ui/CTACard';
import { Button } from '@/components/ui/Button';
import { tertiaryColors } from '@/theme/tokens';

const formatNameList = (names: string[]): string => {
  const filtered = names.filter((name) => name && name.trim().length > 0);
  if (filtered.length === 0) return '';
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  const head = filtered.slice(0, -1).join(', ');
  return `${head} and ${filtered[filtered.length - 1]}`;
};

const buildJoinRequestMessage = (
  groupTitle: string,
  leaderNames: string[]
): string => {
  const formattedLeaders = formatNameList(leaderNames);
  if (!formattedLeaders) {
    return `Your request to join ${groupTitle} has been sent. A group leader will be in touch.`;
  }
  return `Your request to join ${groupTitle} has been sent to ${formattedLeaders}. They will be in touch.`;
};

// Consistent minimum height for all group cards on "my groups" page
const MY_GROUPS_CARD_MIN_HEIGHT = 250;

// Component to handle friends data for each group card
const GroupCardWithFriends: React.FC<{
  group: GroupWithDetails;
  membershipStatus: 'member' | 'leader' | 'admin' | null;
  currentUserId?: string;
  onPress?: () => void;
  style?: any;
  variant?: 'my-groups' | 'all-groups';
  pendingLabel?: string;
  pendingTooltip?: string;
}> = ({
  group,
  membershipStatus,
  currentUserId,
  onPress,
  style,
  variant,
  pendingLabel,
  pendingTooltip,
}) => {
  const { userProfile } = useAuthStore();
  const { data: members } = useGroupMembers(group.id);
  const friendsQuery = useFriends(userProfile?.id);

  const friendUsers = React.useMemo(() => {
    if (!userProfile?.id || !friendsQuery.data) return [];

    const friendIds = new Set(
      (friendsQuery.data || [])
        .map((f) => f.friend?.id)
        .filter((id): id is string => !!id)
    );

    return (members || [])
      .filter((m) => m.user?.id && friendIds.has(m.user.id))
      .map((m) => m.user)
      .filter((user): user is NonNullable<typeof user> => !!user);
  }, [friendsQuery.data, members, userProfile?.id]);

  const friendsInGroup = React.useMemo(
    () => friendUsers.slice(0, 3),
    [friendUsers]
  );

  const friendsCount = friendUsers.length;

  // For homepage cards (my-groups variant), don't fetch/pass leaders
  // to prevent leader profile pictures from appearing
  const leaders = React.useMemo(() => {
    if (variant === 'my-groups') {
      return undefined; // Don't show leader profile pictures on homepage
    }
    return (members || [])
      .filter((m) => m.role === 'leader' && m.user)
      .map((m) => m.user)
      .filter((user): user is NonNullable<typeof user> => !!user)
      .slice(0, 3);
  }, [members, variant]);

  return (
    <GroupCard
      group={group}
      membershipStatus={membershipStatus}
      currentUserId={currentUserId}
      onPress={onPress}
      style={style}
      variant={variant}
      pendingLabel={pendingLabel}
      pendingTooltip={pendingTooltip}
      friendsCount={friendsCount}
      friendsInGroup={friendsInGroup}
      leaders={leaders}
      onPressFriends={onPress || (() => {})}
    />
  );
};

export default function HomeScreen() {
  const { user, userProfile, loadUserProfile } = useAuthStore();
  const { theme } = useTheme();

  // Get user's church ID for filtering data
  // const churchId = userProfile?.church_id; // Events disabled - keeping for future use
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

  // Fetch user's pending group join requests
  const {
    data: userJoinRequests,
    isLoading: joinRequestsLoading,
    refetch: refetchJoinRequests,
  } = useUserJoinRequests(userId);

  const activeMemberships = userGroupMemberships || [];
  const pendingJoinRequestsList = userJoinRequests || [];
  const showGroupCards =
    activeMemberships.length > 0 || pendingJoinRequestsList.length > 0;

  const { isLoading: friendsLoading, refetch: refetchFriends } =
    useFriends(userId);

  const isLoading = groupsLoading || friendsLoading || joinRequestsLoading;

  // Get notification badge count
  const { count: unreadCount } = useNotificationBadge(userId);

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  // Handle refresh
  const handleRefresh = React.useCallback(async () => {
    await Promise.all([
      // refetchEvents(), // Events disabled
      loadUserProfile(),
      refetchGroups(),
      refetchFriends(),
      refetchJoinRequests(),
    ]);
  }, [loadUserProfile, refetchGroups, refetchFriends, refetchJoinRequests]);

  if (isLoading && !userGroupMemberships) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <LoadingSpinner message="Loading your dashboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <ScrollView
        style={[
          styles.scrollView,
          { backgroundColor: theme.colors.background.primary },
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Top bar with logo and notification bell */}
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logos/vineme_png-02.png')}
              style={styles.logo1}
              resizeMode="contain"
            />
            <Image
              source={require('../../../assets/logos/vineme_png-08.png')}
              style={styles.logo2}
              resizeMode="contain"
            />
          </View>
          <View style={styles.notificationContainer}>
            <NotificationIconWithBadge
              onPress={handleNotificationPress}
              unreadCount={unreadCount}
              size={24}
              color={tertiaryColors[500]}
              badgeColor={theme.colors.error[500]}
            />
          </View>
        </View>

        {/* Church + Service Card - Updated to match Figma */}
        <View style={styles.header}>
          <ChurchAdminOnly
            fallback={
              <View style={styles.churchCard}>
                <Ionicons
                  name="location-outline"
                  size={25}
                  color={tertiaryColors[500]}
                  style={styles.locationIcon}
                />
                <View style={styles.churchCardContent}>
                  {userProfile?.church?.name && (
                    <Text
                      variant="body"
                      weight="medium"
                      style={styles.churchName}
                      numberOfLines={1}
                    >
                      {userProfile.church.name}
                    </Text>
                  )}
                  {userProfile?.service && (
                    <Text
                      variant="bodySmall"
                      color="secondary"
                      style={styles.serviceTime}
                      numberOfLines={1}
                    >
                      {formatServiceTime(userProfile.service)}
                    </Text>
                  )}
                </View>
              </View>
            }
          >
            <TouchableOpacity
              style={styles.churchCard}
              onPress={() => router.push('/admin')}
            >
              <Ionicons
                name="location-outline"
                size={25}
                color={tertiaryColors[500]}
                style={styles.locationIcon}
              />
              <View style={styles.churchCardContent}>
                {userProfile?.church?.name && (
                  <Text
                    variant="body"
                    weight="medium"
                    style={styles.churchName}
                    numberOfLines={1}
                  >
                    {userProfile.church.name}
                  </Text>
                )}
                {userProfile?.service && (
                  <Text
                    variant="bodySmall"
                    color="secondary"
                    style={styles.serviceTime}
                    numberOfLines={1}
                  >
                    {formatServiceTime(userProfile.service)}
                  </Text>
                )}
              </View>
              <View style={styles.orgRight}>
                <Ionicons name="settings-outline" size={16} color="#111827" />
                <Text variant="label" weight="semiBold" style={styles.orgCta}>
                  Manage Church
                </Text>
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color="#6b7280"
                />
              </View>
            </TouchableOpacity>
          </ChurchAdminOnly>
        </View>

        {/* My Groups Section */}
        <View style={[styles.section, styles.sectionSpacing]}>
          <View style={styles.sectionHeader}>
            <Text variant="h4" weight="black" style={styles.sectionTitle}>
              My Groups
            </Text>
            {showGroupCards && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/groups')}>
                <Text
                  variant="bodyLarge"
                  color="primary"
                  style={styles.seeAllText}
                >
                  See All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showGroupCards ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {activeMemberships.map((membership) => (
                <View key={membership.group_id} style={styles.horizontalCard}>
                  <GroupCardWithFriends
                    group={membership.group}
                    membershipStatus={membership.role}
                    currentUserId={userProfile?.id}
                    onPress={() => router.push(`/group/${membership.group.id}`)}
                    style={{
                      width: 260,
                      minHeight: MY_GROUPS_CARD_MIN_HEIGHT,
                      marginHorizontal: 0,
                    }}
                    variant="my-groups"
                  />
                </View>
              ))}
              {pendingJoinRequestsList.length > 0 &&
                pendingJoinRequestsList.map((request) => {
                  if (!request.group) return null;
                  const leaderNames = (request.group_leaders || [])
                    .map((l) => l?.name)
                    .filter(Boolean) as string[];
                  const message = buildJoinRequestMessage(
                    request.group?.title || 'this group',
                    leaderNames
                  );
                  return (
                    <View
                      key={`join-${request.id}`}
                      style={styles.horizontalCard}
                    >
                      <GroupCardWithFriends
                        group={request.group as any}
                        membershipStatus={null}
                        currentUserId={userProfile?.id}
                        onPress={undefined}
                        style={{
                          width: 260,
                          minHeight: MY_GROUPS_CARD_MIN_HEIGHT,
                          marginHorizontal: 0,
                        }}
                        pendingLabel="Join request pending"
                        pendingTooltip={message}
                        variant="my-groups"
                      />
                    </View>
                  );
                })}
            </ScrollView>
          ) : null}

          {/* Action Cards - Show below groups or in empty state */}
          {showGroupCards ? (
            <View
              style={[
                styles.actionCardsContainer,
                styles.actionCardsContainerWithGroups,
              ]}
            >
              {/* Connect a friend */}
              <CTACard
                title="Connect a friend"
                description="Help someone join our community"
                onPress={() => router.push('/referral-landing')}
                variant="default"
                style={styles.actionCardSpacing}
              />

              {/* Create a group */}
              <CTACard
                title="Create a group"
                description="Insert copy for description"
                onPress={() => router.push('/group/create')}
                variant="default"
              />
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              {/* Large dark CTA card */}
              <View style={styles.emptyStateCard}>
                <Text
                  variant="body"
                  weight="bold"
                  style={styles.emptyStateTitle}
                >
                  You have not joined a group yet
                </Text>
                <Text
                  variant="body"
                  weight="light"
                  style={styles.emptyStateSubtitle}
                >
                  Join a Bible study group now and get connected with your
                  community
                </Text>
                <Button
                  title="Find a group"
                  onPress={() => router.push('/(tabs)/groups')}
                  variant="secondary"
                  icon={
                    <Ionicons name="search-outline" size={18} color="#FFFFFF" />
                  }
                  style={styles.findGroupButton}
                />
              </View>

              {/* Other action cards */}
              <View style={styles.actionCardsContainer}>
                {/* Connect a friend */}
                <CTACard
                  title="Connect a friend"
                  description="Help someone join our community"
                  onPress={() => router.push('/referral-landing')}
                  variant="default"
                  style={styles.actionCardSpacing}
                />

                {/* Create a group */}
                <CTACard
                  title="Create a group"
                  description="Insert copy for description"
                  onPress={() => router.push('/group/create')}
                  variant="default"
                />
              </View>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingLeft: 17,
    paddingRight: 20,
    paddingBottom: 0,
    minHeight: 121,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    width: 189,
    height: 121,
  },
  logo1: {
    width: 50,
    height: 50,
    position: 'absolute',
    left: 0,
    top: 35,
    zIndex: 2,
  },
  logo2: {
    width: 121.25,
    height: 121.25,
    position: 'absolute',
    left: 50,
    top: 0,
    zIndex: 1,
  },
  notificationContainer: {
    justifyContent: 'center',
    height: 121,
  },
  header: {
    paddingTop: 0,
    paddingLeft: 22,
    paddingRight: 20,
    paddingBottom: 0,
    marginTop: -10,
  },
  churchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E7EA',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 71,
    marginTop: 8,
  },
  locationIcon: {
    marginRight: 16,
  },
  churchCardContent: {
    flex: 1,
  },
  churchName: {
    color: tertiaryColors[500],
    fontSize: 16,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  serviceTime: {
    color: '#8B8A8C',
    fontSize: 12,
    letterSpacing: -0.6,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  orgCardClickable: {
    // Background color will be set inline with theme
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
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
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
  sectionSpacing: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 34,
    paddingRight: 20,
    marginBottom: 16,
  },
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
    color: tertiaryColors[500],
    fontSize: 27.5,
    letterSpacing: -1.375,
    fontWeight: '900',
  },
  seeAllText: {
    // Typography handled by Text component variant
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
    borderRadius: 9999, // Fully rounded corners
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
  },
  bottomSpacing: {
    height: 100,
  },
  emptyStateContainer: {
    paddingHorizontal: 18,
    gap: 12,
  },
  emptyStateCard: {
    backgroundColor: tertiaryColors[500],
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 38,
    minHeight: 216,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: -0.48,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
  },
  emptyStateSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: -0.48,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '300',
  },
  findGroupButton: {
    width: 278,
  },
  actionCardsContainer: {
    gap: 12,
  },
  actionCardsContainerWithGroups: {
    paddingHorizontal: 17,
    marginTop: 16,
  },
  actionCardSpacing: {
    marginBottom: 12,
  },
});
