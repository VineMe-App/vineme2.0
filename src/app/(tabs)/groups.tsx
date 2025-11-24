import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { useRouter } from 'expo-router';
import {
  GroupCard,
  GroupsMapView,
  FilterPanel,
  SearchBar,
  OverflowMenu,
  type ViewMode,
  type SortOption,
} from '../../components/groups';
import {
  useGroupsByChurch,
  useGroupMembership,
  useGroupMembers,
  useAllApprovedGroups,
  useIsGroupLeader,
} from '../../hooks/useGroups';
import { useAuthStore, useGroupFiltersStore } from '../../stores';
import { useErrorHandler, useLoadingState } from '../../hooks';
import {
  ErrorMessage,
  EmptyState,
  LoadingSpinner,
  Modal,
  Button,
} from '../../components/ui';
import { useUpdateUserProfile } from '../../hooks/useUsers';
import {
  applyGroupFilters,
  getActiveFiltersDescription,
  getActiveFiltersCount,
} from '../../utils/groupFilters';
import type { GroupWithDetails } from '../../types/database';
import { useFriends } from '../../hooks/useFriendships';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/location';
import { useTheme } from '@/theme/provider/useTheme';
import { Image } from 'react-native';

export default function GroupsScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { filters } = useGroupFiltersStore();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const friendsQuery = useFriends(userProfile?.id);
  const [showSearch, setShowSearch] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNoGroupFitsModal, setShowNoGroupFitsModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [userCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distanceOrigin, setDistanceOrigin] = useState<{
    address: string;
    coordinates: { latitude: number; longitude: number };
  } | null>(null);
  const { handleError } = useErrorHandler();
  const { isLoading: isLoadingFn, withLoading } = useLoadingState();
  // Create flow now navigates to dedicated page
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const updateUserProfile = useUpdateUserProfile();

  // Handle view change
  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
  };

  const isChurchAdmin = userProfile?.roles?.includes('church_admin') ?? false;

  // Check if user is a group leader (of any group)
  const { data: isGroupLeaderCheck, isLoading: isLoadingLeaderCheck } =
    useIsGroupLeader(userProfile?.id);
  const isGroupLeader = isGroupLeaderCheck ?? false;

  // Both church admins and group leaders should see all groups
  const shouldFetchAllGroups = isChurchAdmin || isGroupLeader;

  const {
    data: churchGroups,
    isLoading: isLoadingChurchGroups,
    error: churchGroupsError,
    refetch: refetchChurchGroups,
  } = useGroupsByChurch(
    !shouldFetchAllGroups ? userProfile?.church_id : undefined
  );

  const {
    data: adminGroups,
    isLoading: isLoadingAdminGroups,
    error: adminGroupsError,
    refetch: refetchAdminGroups,
  } = useAllApprovedGroups(shouldFetchAllGroups);

  const allGroups = shouldFetchAllGroups ? adminGroups : churchGroups;
  const isLoading =
    isLoadingLeaderCheck ||
    (shouldFetchAllGroups ? isLoadingAdminGroups : isLoadingChurchGroups);
  const error = shouldFetchAllGroups ? adminGroupsError : churchGroupsError;
  const refetch = shouldFetchAllGroups
    ? refetchAdminGroups
    : refetchChurchGroups;

  const friendIds = useMemo(
    () =>
      new Set(
        (friendsQuery.data || [])
          .map((friendship) => friendship.friend?.id)
          .filter((id): id is string => !!id)
      ),
    [friendsQuery.data]
  );

  const groupsWithVisibility = useMemo(() => {
    if (!allGroups) return [];

    const userChurchId = userProfile?.church_id;
    const userServiceId = userProfile?.service_id;

    return allGroups.reduce<
      (GroupWithDetails & {
        __isGreyedOut?: boolean;
        __category?: 'service' | 'church' | 'outside';
      })[]
    >((acc, group) => {
      const isInUserChurch = !!userChurchId && group.church_id === userChurchId;
      const isInUserService =
        !!userServiceId && group.service_id === userServiceId;
      const friendInGroup = (group.memberships || []).some(
        (membership: any) =>
          membership.status === 'active' && friendIds.has(membership.user_id)
      );

      let include = false;
      let isGreyedOut = false;
      let category: 'service' | 'church' | 'outside' = 'outside';

      // Determine category for color coding
      if (isInUserService) {
        category = 'service';
      } else if (isInUserChurch) {
        category = 'church';
      } else {
        category = 'outside';
      }

      // Church admins and group leaders can see ALL groups
      if (isChurchAdmin || isGroupLeader) {
        include = true;
        // Grey out groups outside their church
        isGreyedOut = userChurchId ? group.church_id !== userChurchId : false;
      } else {
        // Regular users can see:
        // 1. All groups in their church (not just their service)
        // 2. Groups where their friends are members (greyed out if not in their church)
        if (isInUserChurch) {
          include = true;
        } else if (friendInGroup) {
          include = true;
          isGreyedOut = true;
        }
      }

      if (include) {
        acc.push({
          ...group,
          __isGreyedOut: isGreyedOut,
          __category: category,
        });
      }

      return acc;
    }, []);
  }, [
    allGroups,
    friendIds,
    isChurchAdmin,
    isGroupLeader,
    userProfile?.church_id,
    userProfile?.service_id,
  ]);

  // Apply filters to groups (including "only with friends")
  const filteredGroups = useMemo(() => {
    if (!groupsWithVisibility) return [];
    let base = applyGroupFilters(groupsWithVisibility, filters);
    if (filters.onlyWithFriends) {
      base = base.filter((g) =>
        (g.memberships || []).some(
          (m: any) => m.status === 'active' && friendIds.has(m.user_id)
        )
      );
    }
    return base;
  }, [groupsWithVisibility, filters, friendIds]);

  // Sorted groups with computed distance and friend counts
  const groupsWithDistance = useMemo(() => {
    if (!filteredGroups) return [] as typeof filteredGroups & any[];
    const originCoords = distanceOrigin?.coordinates || userCoords || null;
    return filteredGroups
      .map((g) => {
        let distanceKm: number | undefined;
        if (sortBy === 'distance' && originCoords) {
          const parsed = locationService.parseGroupLocation(g.location);
          if (parsed.coordinates) {
            distanceKm = locationService.calculateDistance(
              originCoords,
              parsed.coordinates
            );
          }
        }

        // Calculate friends count for sorting
        const friendsCount = (g.memberships || []).filter(
          (m: any) => m.status === 'active' && friendIds.has(m.user_id)
        ).length;

        return {
          ...g,
          __distanceKm: distanceKm,
          __friendsCount: friendsCount,
        } as any;
      })
      .sort((a: any, b: any) => {
        if (
          sortBy === 'distance' &&
          (distanceOrigin?.coordinates || userCoords)
        ) {
          const da = a.__distanceKm;
          const db = b.__distanceKm;
          if (da == null && db == null) return 0;
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        } else if (sortBy === 'alphabetical') {
          return (a.title || '').localeCompare(b.title || '');
        } else if (sortBy === 'friends') {
          return b.__friendsCount - a.__friendsCount;
        }
        return 0;
      });
  }, [
    filteredGroups,
    sortBy,
    userCoords,
    distanceOrigin?.coordinates,
    friendIds,
  ]);

  const handleRefresh = async () => {
    await withLoading('refresh', async () => {
      try {
        await refetch();
      } catch (error) {
        handleError(error as Error, {
          context: {
            action: 'refresh_groups',
            churchId: userProfile?.church_id,
          },
          showAlert: false, // Don't show alert for refresh errors, just show in UI
        });
        throw error; // Re-throw so the error state is maintained
      }
    });
  };

  const handleGroupPress = (group: GroupWithDetails) => {
    router.push(`/group/${group.id}`);
  };

  const handleCreateGroup = () => {
    router.push('/group/create');
  };

  const renderGroupItem = ({
    item: group,
  }: {
    item: GroupWithDetails & { __distanceKm?: number };
  }) => {
    return (
      <GroupItemWithMembership
        group={group}
        onPress={() => handleGroupPress(group)}
        distanceKm={group.__distanceKm}
      />
    );
  };

  const renderEmptyState = () => {
    const hasFilters =
      filters.meetingDays.length > 0 ||
      filters.searchQuery.length > 0 ||
      filters.onlyWithFriends;

    return (
      <EmptyState
        icon={<Text style={{ fontSize: 48 }}>📖</Text>}
        title={hasFilters ? 'No Groups Match Your Filters' : 'No Groups Found'}
        message={
          hasFilters
            ? `No groups found matching: ${getActiveFiltersDescription(filters)}`
            : userProfile?.church_id
              ? 'There are no Bible study groups available in your church yet.'
              : 'Please complete your profile to see groups from your church.'
        }
      />
    );
  };

  const handleNoGroupFits = () => {
    setShowNoGroupFitsModal(true);
  };

  const handleConfirmCannotFindGroup = async () => {
    if (!userProfile?.id) return;

    try {
      await updateUserProfile.mutateAsync({
        userId: userProfile.id,
        updates: { cannot_find_group: true },
      });
      setShowNoGroupFitsModal(false);
      Alert.alert(
        'Thank you!',
        "We've flagged your account and our connections team will reach out to help you find a suitable group."
      );
    } catch (error) {
      handleError(error as Error);
    }
  };

  const renderListView = () => (
    <View style={styles.listViewContainer}>
      <FlatList
        data={groupsWithDistance as any}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingFn('refresh')}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingTop: 8 }]}
      />
    </View>
  );

  const renderMapView = () => (
    <GroupsMapView
      groups={filteredGroups}
      onGroupPress={handleGroupPress}
      isLoading={isLoading}
      distanceOrigin={distanceOrigin}
      onDistanceOriginChange={(origin) => {
        // Update distance origin when user moves the map
        setDistanceOrigin({
          address: origin.address || 'Selected Location',
          coordinates: origin.coordinates,
        });
        // Ensure search bar stays visible and shows the updated location
        if (sortBy === 'distance') {
          setShowSearch(true);
        }
      }}
    />
  );

  const renderErrorState = () => (
    <ErrorMessage
      error={error!}
      onRetry={handleRefresh}
      style={styles.errorContainer}
    />
  );

  if (isLoading && !allGroups) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading groups...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !allGroups) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        {renderErrorState()}
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
      <View
        style={[
          styles.compactHeader,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        <View style={styles.headerLeft}>
          <Image
            source={require('../../../assets/logos/vineme_png-02.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="h4" weight="black" style={styles.title}>
            Groups
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* Map/List toggle - far left */}
          <TouchableOpacity
            style={styles.figmaIconButton}
            onPress={() =>
              handleViewChange(currentView === 'list' ? 'map' : 'list')
            }
            accessibilityLabel={`Switch to ${currentView === 'list' ? 'map' : 'list'} view`}
          >
            <View
              style={[
                styles.iconButtonInner,
                currentView === 'map' && styles.iconButtonInnerActive,
              ]}
            >
              <Ionicons
                name={currentView === 'list' ? 'map-outline' : 'list-outline'}
                size={16}
                color={
                  currentView === 'map' ? '#FFFFFF' : theme.colors.text.inverse
                }
              />
            </View>
          </TouchableOpacity>

          {/* Search button */}
          <TouchableOpacity
            style={styles.figmaIconButton}
            onPress={() => setShowSearch(!showSearch)}
            accessibilityLabel="Search groups"
          >
            <View
              style={[
                styles.iconButtonInner,
                (showSearch || filters.searchQuery.length > 0) &&
                  styles.iconButtonInnerActive,
              ]}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={
                  showSearch || filters.searchQuery.length > 0
                    ? '#FFFFFF'
                    : theme.colors.text.inverse
                }
              />
            </View>
          </TouchableOpacity>

          {/* Filter & Sort button */}
          <TouchableOpacity
            style={styles.figmaIconButton}
            onPress={() => setShowFilterPanel(true)}
            accessibilityLabel="Filter and sort groups"
          >
            <View
              style={[
                styles.iconButtonInner,
                (getActiveFiltersCount(filters) > 0 ||
                  sortBy !== 'alphabetical') &&
                  styles.iconButtonInnerActive,
              ]}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={
                  getActiveFiltersCount(filters) > 0 ||
                  sortBy !== 'alphabetical'
                    ? '#FFFFFF'
                    : theme.colors.text.inverse
                }
              />
            </View>
          </TouchableOpacity>

          {/* Overflow menu for secondary actions */}
          <OverflowMenu
            items={[
              ...(userProfile?.church_id
                ? [
                    {
                      id: 'create-group',
                      label: 'Create a group',
                      icon: 'add-circle-outline' as const,
                      onPress: handleCreateGroup,
                    },
                  ]
                : []),
              {
                id: 'no-group-fits',
                label: 'No group fits?',
                icon: 'help-circle-outline',
                onPress: handleNoGroupFits,
              },
              {
                id: 'info',
                label: 'About groups',
                icon: 'information-circle-outline',
                onPress: () => setShowInfoModal(true),
              },
            ]}
          />
        </View>
      </View>

      {/* Search bar */}
      {showSearch && <SearchBar placeholder="Search groups..." />}

      <View style={styles.contentContainer}>
        {currentView === 'list' ? renderListView() : renderMapView()}
      </View>

      <Modal
        isVisible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title=""
        scrollable
        showCloseButton={false}
      >
        <View style={styles.infoModalContent}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.infoModalCloseButton}
            onPress={() => setShowInfoModal(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close"
              size={24}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>

          {/* Title */}
          <Text variant="h5" weight="bold" style={styles.infoModalTitle}>
            About Groups
          </Text>

          <Text variant="body" style={styles.infoModalIntro}>
            Find and join Bible study groups that fit your schedule and
            interests. Tap any group card to view details and request to join.
          </Text>

          {/* Features section */}
          <View style={styles.infoModalSection}>
            <View style={styles.infoFeatureRow}>
              <View
                style={[
                  styles.infoFeatureIcon,
                  { backgroundColor: theme.colors.background.inverse },
                ]}
              >
                <Ionicons
                  name="map-outline"
                  size={16}
                  color={theme.colors.text.inverse}
                />
              </View>
              <View style={styles.infoFeatureText}>
                <Text
                  variant="body"
                  weight="semiBold"
                  style={styles.infoFeatureTitle}
                >
                  List & Map Views
                </Text>
                <Text variant="caption" color="secondary">
                  Toggle between list and map to browse groups by location
                </Text>
              </View>
            </View>

            <View style={styles.infoFeatureRow}>
              <View
                style={[
                  styles.infoFeatureIcon,
                  { backgroundColor: theme.colors.background.inverse },
                ]}
              >
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={theme.colors.text.inverse}
                />
              </View>
              <View style={styles.infoFeatureText}>
                <Text
                  variant="body"
                  weight="semiBold"
                  style={styles.infoFeatureTitle}
                >
                  Filter & Sort
                </Text>
                <Text variant="caption" color="secondary">
                  Filter by meeting days, sort by distance or friends in group
                </Text>
              </View>
            </View>

            <View style={styles.infoFeatureRow}>
              <View
                style={[
                  styles.infoFeatureIcon,
                  { backgroundColor: theme.colors.background.inverse },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={16}
                  color={theme.colors.text.inverse}
                />
              </View>
              <View style={styles.infoFeatureText}>
                <Text
                  variant="body"
                  weight="semiBold"
                  style={styles.infoFeatureTitle}
                >
                  Search
                </Text>
                <Text variant="caption" color="secondary">
                  Search groups by name, description, or leader
                </Text>
              </View>
            </View>

            <View style={styles.infoFeatureRow}>
              <View
                style={[
                  styles.infoFeatureIcon,
                  { backgroundColor: theme.colors.background.inverse },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={theme.colors.text.inverse}
                />
              </View>
              <View style={styles.infoFeatureText}>
                <Text
                  variant="body"
                  weight="semiBold"
                  style={styles.infoFeatureTitle}
                >
                  Friends
                </Text>
                <Text variant="caption" color="secondary">
                  See which groups your friends are in
                </Text>
              </View>
            </View>
          </View>

          {/* Tips section */}
          <View style={styles.infoTipsSection}>
            <Text
              variant="caption"
              weight="semiBold"
              style={styles.infoTipsTitle}
            >
              QUICK TIP
            </Text>
            <Text variant="body" style={styles.infoTipsText}>
              Can't find a group that fits? Tap the menu (⋯) and select "No
              group fits?" to let your connections team know.
            </Text>
          </View>
        </View>
      </Modal>

      <FilterPanel
        isVisible={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        distanceOrigin={distanceOrigin}
        onDistanceOriginChange={setDistanceOrigin}
      />

      {/* No Group Fits Modal */}
      <Modal
        isVisible={showNoGroupFitsModal}
        onClose={() => setShowNoGroupFitsModal(false)}
        title=""
        showCloseButton={false}
      >
        <View style={styles.noGroupFitsModalContent}>
          <TouchableOpacity
            style={styles.noGroupFitsModalCloseButton}
            onPress={() => setShowNoGroupFitsModal(false)}
            accessibilityLabel="Close modal"
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text variant="body" style={styles.noGroupFitsModalText}>
            Oh no! We're sorry that you couldn't find any groups that looked
            suitable.{'\n\n'}
            Click below to let your connections team know!
          </Text>
          <Button
            title="I can't find a group"
            onPress={handleConfirmCannotFindGroup}
            loading={updateUserProfile.isPending}
            style={styles.noGroupFitsButtonModal}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Component to handle membership status for each group
const GroupItemWithMembership: React.FC<{
  group: GroupWithDetails & {
    __distanceKm?: number;
    __category?: 'service' | 'church' | 'outside';
  };
  onPress: () => void;
  distanceKm?: number;
}> = ({ group, onPress, distanceKm }) => {
  const { userProfile } = useAuthStore();
  const { data: membershipData } = useGroupMembership(
    group.id,
    userProfile?.id
  );
  const { data: members } = useGroupMembers(group.id);
  const friendsQuery = useFriends(userProfile?.id);

  const membershipStatus = membershipData?.membership?.role || null;

  const friendUsers = React.useMemo(() => {
    const friendIds = new Set(
      (friendsQuery.data || [])
        .map((f) => f.friend?.id)
        .filter((id): id is string => !!id)
    );

    return (members || [])
      .filter((m) => m.user?.id && friendIds.has(m.user.id))
      .map((m) => m.user)
      .filter((user): user is NonNullable<typeof user> => !!user);
  }, [friendsQuery.data, members]);

  const friendsInGroup = React.useMemo(
    () => friendUsers.slice(0, 3),
    [friendUsers]
  );

  const friendsCount = friendUsers.length;

  const leaders = React.useMemo(() => {
    return (members || [])
      .filter((m) => m.role === 'leader' && m.status === 'active' && m.user)
      .map((m) => m.user)
      .filter((user): user is NonNullable<typeof user> => !!user);
    // Pass full leaders array - GroupCard handles display logic for 1, 2, 3, and 4+ leaders
  }, [members]);

  return (
    <GroupCard
      group={group}
      onPress={onPress}
      membershipStatus={membershipStatus}
      distanceKm={
        typeof distanceKm === 'number'
          ? distanceKm
          : (group as any).__distanceKm
      }
      friendsCount={friendsCount}
      friendsInGroup={friendsInGroup}
      leaders={leaders}
      currentUserId={userProfile?.id}
      onPressFriends={() => {
        // Navigate to group detail and open friends modal
        onPress();
      }}
      category={(group as any).__category}
    />
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    compactHeader: {
      paddingHorizontal: 19,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 60,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logo: {
      width: 27,
      height: 27,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: 22,
      lineHeight: 22,
      letterSpacing: -0.44,
      fontWeight: '800',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    figmaIconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonInner: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.background.inverse,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonInnerActive: {
      backgroundColor: '#FF0083',
    },
    contentContainer: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: 16,
      paddingHorizontal: 0,
    },
    listViewContainer: {
      flex: 1,
      position: 'relative',
    },
    noGroupFitsModalContent: {
      padding: 20,
      paddingTop: 48, // 12 (top spacing) + 24 (icon height) + 12 (padding below icon)
      alignItems: 'center',
      position: 'relative',
    },
    noGroupFitsModalCloseButton: {
      position: 'absolute',
      right: 12,
      top: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    noGroupFitsModalText: {
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    noGroupFitsButtonModal: {
      minWidth: 200,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 16,
    },
    errorContainer: {
      margin: 16,
    },
    infoModalContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 24,
      position: 'relative',
    },
    infoModalCloseButton: {
      position: 'absolute',
      top: 12,
      right: 8,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    infoModalTitle: {
      color: theme.colors.text.primary,
      marginBottom: 12,
      letterSpacing: -0.4,
    },
    infoModalIntro: {
      color: theme.colors.text.secondary,
      marginBottom: 24,
      lineHeight: 22,
    },
    infoModalSection: {
      gap: 16,
      marginBottom: 24,
    },
    infoFeatureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    infoFeatureIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoFeatureText: {
      flex: 1,
      gap: 2,
    },
    infoFeatureTitle: {
      color: theme.colors.text.primary,
    },
    infoTipsSection: {
      backgroundColor: '#FFF0F7',
      borderRadius: 12,
      padding: 16,
    },
    infoTipsTitle: {
      color: '#FF0083',
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    infoTipsText: {
      color: theme.colors.text.primary,
      lineHeight: 20,
    },
  });
