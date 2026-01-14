import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Platform,
  Image,
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
import { AuthLoadingAnimation } from '../../components/auth/AuthLoadingAnimation';
import { Ionicons } from '@expo/vector-icons';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { useTheme } from '@/theme/provider/useTheme';
import { formatServiceTime } from '@/utils/helpers';
import { NotificationIconWithBadge } from '@/components/ui/NotificationIconWithBadge';
import { useNotificationBadge } from '@/hooks/useNotifications';

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
  showLocation?: boolean;
}> = ({
  group,
  membershipStatus,
  currentUserId,
  onPress,
  style,
  variant,
  pendingLabel,
  pendingTooltip,
  showLocation,
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
      showLocation={showLocation}
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <AuthLoadingAnimation />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
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
              source={require('../../../assets/figma-135-2274/47c97a3de297c8957bfbc742d3e4396bccd0d31a.png')}
              style={styles.logo1}
              resizeMode="contain"
            />
            <Image
              source={require('../../../assets/figma-135-2274/3ea6b9bc459f568aa3641e994c1a3a137ba8db70.png')}
              style={styles.logo2}
              resizeMode="contain"
            />
          </View>
          <View style={styles.notificationContainer}>
            <NotificationIconWithBadge
              onPress={handleNotificationPress}
              unreadCount={unreadCount}
              size={24}
              color="#2C2235"
              badgeColor={theme.colors.error[500]}
            />
          </View>
        </View>

        {/* Church + Service Card - Updated to match Figma */}
        <View style={styles.header}>
          <ChurchAdminOnly
            fallback={
              <View style={styles.churchCard}>
                <Image
                  source={require('../../../assets/01e701d86580946700145dd8be461b7d683806db.png')}
                  style={styles.locationIcon}
                  resizeMode="contain"
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
              activeOpacity={0.8}
            >
              <Image
                source={require('../../../assets/01e701d86580946700145dd8be461b7d683806db.png')}
                style={styles.locationIcon}
                resizeMode="contain"
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
                    showLocation={false}
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
                        showLocation={false}
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
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/referral-landing')}
                activeOpacity={0.8}
              >
                <View style={styles.actionCardContent}>
                  <Text
                    variant="body"
                    weight="bold"
                    style={styles.actionCardTitle}
                  >
                    Connect a friend
                  </Text>
                  <Text
                    variant="body"
                    weight="normal"
                    style={styles.actionCardDescription}
                  >
                    Help someone get plugged in
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#2C2235"
                />
              </TouchableOpacity>

              {/* Create a group */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/group/create')}
                activeOpacity={0.8}
              >
                <View style={styles.actionCardContent}>
                  <Text
                    variant="body"
                    weight="bold"
                    style={styles.actionCardTitle}
                  >
                    Create a group
                  </Text>
                  <Text
                    variant="body"
                    weight="normal"
                    style={styles.actionCardDescription}
                  >
                    Initiate a Kingdom community
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#2C2235"
                />
              </TouchableOpacity>
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
                  weight="normal"
                  style={styles.emptyStateSubtitle}
                >
                  Join a Bible study group now and get connected with your
                  community
                </Text>
                <TouchableOpacity
                  style={styles.findGroupButton}
                  onPress={() => router.push('/(tabs)/groups')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color="#FFFFFF"
                    style={styles.searchIcon}
                  />
                  <Text
                    variant="body"
                    weight="bold"
                    style={styles.findGroupButtonText}
                  >
                    Find a group
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Other action cards */}
              <View style={styles.actionCardsContainer}>
                {/* Connect a friend */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/referral-landing')}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionCardContent}>
                    <Text
                      variant="body"
                      weight="bold"
                      style={styles.actionCardTitle}
                    >
                      Connect a friend
                    </Text>
                    <Text
                      variant="body"
                      weight="normal"
                      style={styles.actionCardDescription}
                    >
                      Help someone get plugged in
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color="#2C2235"
                  />
                </TouchableOpacity>

                {/* Create a group */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/group/create')}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionCardContent}>
                    <Text
                      variant="body"
                      weight="bold"
                      style={styles.actionCardTitle}
                    >
                      Create a group
                    </Text>
                    <Text
                      variant="body"
                      weight="normal"
                      style={styles.actionCardDescription}
                    >
                      Initiate a Kingdom community
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color="#2C2235"
                  />
                </TouchableOpacity>
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
    paddingBottom: 0,
    minHeight: 80, // Figma: top nav height is 80px
    ...Platform.select({
      ios: {
        paddingTop: 0, // Figma: logos at y=16 within the nav
        paddingLeft: 19, // Figma: first logo starts at x=19
        paddingRight: 20,
        marginTop: 10, // Figma: top nav at top-[36px]
      },
      android: {
        paddingTop: 32,
        paddingLeft: 24,
        paddingRight: 24,
        marginTop: 0,
      },
      default: {
        paddingTop: 0,
        paddingLeft: 19,
        paddingRight: 20,
        marginTop: 10,
      },
    }),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    width: 188, // Adjusted for larger logos: logo1 (64px) + spacing + logo2 (140px)
    height: 72, // Adjusted for larger logo height
  },
  logo1: {
    width: 64, // Increased from 56px
    height: 65, // Increased from 57px proportionally
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
  },
  logo2: {
    width: 140, // Increased from 120px to make text even larger
    height: 80, // Increased from 68px proportionally
    position: 'absolute',
    left: 30, // Adjusted for larger logo1
    top: 0, // Aligned at top
    zIndex: 1,
  },
  notificationContainer: {
    justifyContent: 'center',
    height: 80, // Match top bar height
    paddingRight: 0, // Figma: notification icon positioned from right edge
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
    width: 25, // Match Figma location icon size
    height: 25,
    marginRight: 16,
  },
  churchCardContent: {
    flex: 1,
  },
  churchName: {
    color: '#2C2235',
    fontSize: 16,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  serviceTime: {
    color: '#8B8A8C',
    fontSize: 12,
    letterSpacing: -0.6,
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
    paddingTop: 0,
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
    color: '#2C2235',
    fontSize: 22, // Figma: 22px
    letterSpacing: -0.44, // Figma: -0.44px
    fontWeight: '800', // ExtraBold
    lineHeight: 22, // Figma: 22px
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
    backgroundColor: '#2C2235', // Figma: dark purple/black
    borderRadius: 12,
    paddingHorizontal: 40, // Figma: approximately 40px
    paddingVertical: 38, // Figma: approximately 38px
    minHeight: 216, // Figma: approximately 216px height
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 20, // Figma: 20px
    letterSpacing: -0.4, // Figma: -0.4px
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700', // Bold
    lineHeight: 22, // Figma: 22px
  },
  emptyStateSubtitle: {
    color: '#FFFFFF',
    fontSize: 16, // Figma: 16px
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 20, // Figma: 20px
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400', // Regular
  },
  findGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0083',
    borderRadius: 21,
    paddingHorizontal: 24,
    paddingVertical: 10,
    minHeight: 42,
    width: 278,
  },
  searchIcon: {
    marginRight: 8,
  },
  findGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: -0.48,
    fontWeight: '700',
  },
  actionCardsContainer: {
    gap: 12,
  },
  actionCardsContainerWithGroups: {
    paddingHorizontal: 17,
    marginTop: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFC', // Figma: #f9fafc
    borderRadius: 12,
    paddingHorizontal: 32, // Figma: approximately 32px
    paddingVertical: 24, // Figma: approximately 24px
    minHeight: 96, // Figma: approximately 96px
    position: 'relative',
  },
  actionCardSelected: {
    backgroundColor: '#2C2235',
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionCardTitle: {
    color: '#2C2235',
    fontSize: 18, // Figma: 18px
    letterSpacing: -0.36, // Figma: -0.36px
    fontWeight: '700', // Bold
    lineHeight: 22, // Figma: 22px
  },
  actionCardTitleSelected: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: -0.48,
    fontWeight: '700',
  },
  actionCardDescription: {
    color: '#2C2235',
    fontSize: 16, // Figma: 16px
    letterSpacing: -0.32, // Figma: -0.32px
    lineHeight: 20, // Figma: 20px
    fontWeight: '400', // Regular
  },
  actionCardDescriptionSelected: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: -0.48,
    lineHeight: 20,
  },
});
