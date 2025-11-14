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
import { useUpcomingEvents } from '../../hooks/useEvents';
import { useUserGroupMemberships } from '../../hooks/useUsers';
import { useUserJoinRequests } from '../../hooks/useJoinRequests';
import { useFriends } from '../../hooks/useFriendships';
// import { EventCard } from '../../components/events/EventCard'; // Events disabled
import { GroupCard } from '../../components/groups/GroupCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { ConnectSomeoneSection } from '../../components/referrals/ConnectSomeoneSection';
import { Ionicons } from '@expo/vector-icons';
import { ChurchAdminOnly } from '@/components/ui/RoleBasedRender';
import { useTheme } from '@/theme/provider/useTheme';
import { formatServiceTime } from '@/utils/helpers';
import { Logo } from '@/components/brand/Logo';
import { NotificationIconWithBadge } from '@/components/ui/NotificationIconWithBadge';
import { useNotificationBadge } from '@/hooks/useNotifications';
import { Image } from 'react-native';

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

export default function HomeScreen() {
  const { user, userProfile, loadUserProfile } = useAuthStore();
  const { theme } = useTheme();

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

  const {
    isLoading: friendsLoading,
    refetch: refetchFriends,
  } = useFriends(userId);

  const isLoading =
    groupsLoading || friendsLoading || joinRequestsLoading;

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
  }, [
    loadUserProfile,
    refetchGroups,
    refetchFriends,
    refetchJoinRequests,
  ]);

  if (isLoading && !userGroupMemberships) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading your dashboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
                <Ionicons
                  name="location-outline"
                  size={25}
                  color="#2C2235"
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
                color="#2C2235"
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
                  <GroupCard
                    group={membership.group}
                    membershipStatus={membership.role}
                    currentUserId={userProfile?.id}
                    onPress={() => router.push(`/group/${membership.group.id}`)}
                    style={{ width: 260, minHeight: MY_GROUPS_CARD_MIN_HEIGHT, marginHorizontal: 0 }}
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
                      <GroupCard
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
            <View style={[styles.actionCardsContainer, styles.actionCardsContainerWithGroups]}>
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
                    Help someone join our community
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
                    Insert copy for description
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#2C2235"
                />
              </TouchableOpacity>

              {/* Events - Coming soon */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/events')}
                activeOpacity={0.8}
              >
                <View style={styles.comingSoonBadgeContainer}>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>coming soon</Text>
                  </View>
                </View>
                <View style={styles.actionCardContent}>
                  <Text
                    variant="body"
                    weight="bold"
                    style={styles.actionCardTitle}
                  >
                    Events
                  </Text>
                  <Text
                    variant="body"
                    weight="normal"
                    style={styles.actionCardDescription}
                  >
                    Coming soon. Tap to learn more.
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
                  weight="light"
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
                      Help someone join our community
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
                      Insert copy for description
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color="#2C2235"
                  />
                </TouchableOpacity>

                {/* Events - Coming soon */}
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => router.push('/(tabs)/events')}
                  activeOpacity={0.8}
                >
                  <View style={styles.comingSoonBadgeContainer}>
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>coming soon</Text>
                    </View>
                  </View>
                  <View style={styles.actionCardContent}>
                    <Text
                      variant="body"
                      weight="bold"
                      style={styles.actionCardTitle}
                    >
                      Events
                    </Text>
                    <Text
                      variant="body"
                      weight="normal"
                      style={styles.actionCardDescription}
                    >
                      Coming soon. Tap to learn more.
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
    width: 67.5,
    height: 67.5,
    position: 'absolute',
    left: 0,
    top: 22.5,
    zIndex: 2,
  },
  logo2: {
    width: 121.25,
    height: 121.25,
    position: 'absolute',
    left: 67.5,
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
    color: '#2C2235',
    fontSize: 27.5,
    letterSpacing: -1.375,
  },
  eventsBanner: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    padding: 16,
  },
  eventsBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventsBannerText: {
    color: '#374151',
    flex: 1,
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
    backgroundColor: '#2C2235',
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
    backgroundColor: '#F9FAFC',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 24,
    minHeight: 96,
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
  comingSoonBadgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    overflow: 'hidden',
    borderTopRightRadius: 12,
  },
  actionCardTitle: {
    color: '#2C2235',
    fontSize: 16,
    letterSpacing: -0.48,
    fontWeight: '700',
  },
  actionCardTitleSelected: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: -0.48,
    fontWeight: '700',
  },
  actionCardDescription: {
    color: '#2C2235',
    fontSize: 16,
    letterSpacing: -0.48,
    lineHeight: 20,
  },
  actionCardDescriptionSelected: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: -0.48,
    lineHeight: 20,
  },
  comingSoonBadge: {
    backgroundColor: '#3E0373',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: -0.27,
    fontWeight: '500',
  },
});
