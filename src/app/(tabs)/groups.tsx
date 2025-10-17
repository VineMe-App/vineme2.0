import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { useRouter } from 'expo-router';
import {
  GroupCard,
  GroupsMapView,
  FilterPanel,
  SearchBar,
  type ViewMode,
} from '../../components/groups';
import {
  useGroupsByChurch,
  useGroupMembership,
  useGroupMembers,
  useAllApprovedGroups,
} from '../../hooks/useGroups';
import { useAuthStore, useGroupFiltersStore } from '../../stores';
import { useErrorHandler, useLoadingState } from '../../hooks';
import { ErrorMessage, EmptyState, LoadingSpinner } from '../../components/ui';
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

export default function GroupsScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { filters } = useGroupFiltersStore();
  const { theme } = useTheme();
  const friendsQuery = useFriends(userProfile?.id);
  const [showSearch, setShowSearch] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [sortBy, setSortBy] = useState<
    'none' | 'distance' | 'alphabetical' | 'friends'
  >('none');
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const { handleError } = useErrorHandler();
  const { isLoading: isLoadingFn, withLoading } = useLoadingState();
  // Create flow now navigates to dedicated page
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('list');

  // Hide sort options when switching to map view
  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    if (view === 'map') {
      setShowSortOptions(false);
    }
  };

  const isChurchAdmin =
    userProfile?.roles?.includes('church_admin') ?? false;

  const {
    data: churchGroups,
    isLoading: isLoadingChurchGroups,
    error: churchGroupsError,
    refetch: refetchChurchGroups,
  } = useGroupsByChurch(!isChurchAdmin ? userProfile?.church_id : undefined);

  const {
    data: adminGroups,
    isLoading: isLoadingAdminGroups,
    error: adminGroupsError,
    refetch: refetchAdminGroups,
  } = useAllApprovedGroups(isChurchAdmin);

  const allGroups = isChurchAdmin ? adminGroups : churchGroups;
  const isLoading = isChurchAdmin ? isLoadingAdminGroups : isLoadingChurchGroups;
  const error = isChurchAdmin ? adminGroupsError : churchGroupsError;
  const refetch = isChurchAdmin ? refetchAdminGroups : refetchChurchGroups;

  const friendIds = useMemo(
    () =>
      new Set(
        (friendsQuery.data || [])
          .map((friendship) => friendship.friend?.id)
          .filter((id): id is string => !!id)
      ),
    [friendsQuery.data]
  );

  const isGroupLeader = useMemo(() => {
    if (!userProfile?.id) return false;

    const hasLeaderRole = userProfile.roles?.includes('group_leader') ?? false;

    if (hasLeaderRole) return true;
    if (!allGroups) return false;

    return allGroups.some((group) =>
      (group.memberships || []).some(
        (membership: any) =>
          membership.user_id === userProfile.id &&
          membership.status === 'active' &&
          (membership.role === 'leader' || membership.role === 'admin')
      )
    );
  }, [allGroups, userProfile?.id, userProfile?.roles]);

  const groupsWithVisibility = useMemo(() => {
    if (!allGroups) return [];

    const userChurchId = userProfile?.church_id;
    const userServiceId = userProfile?.service_id;

    return allGroups.reduce<(GroupWithDetails & { __isGreyedOut?: boolean })[]>(
      (acc, group) => {
        const isInUserChurch =
          !!userChurchId && group.church_id === userChurchId;
        const isInUserService =
          !!userServiceId && group.service_id === userServiceId;
        const friendInGroup = (group.memberships || []).some(
          (membership: any) =>
            membership.status === 'active' && friendIds.has(membership.user_id)
        );

        let include = false;
        let isGreyedOut = false;

        if (isChurchAdmin) {
          include = true;
          isGreyedOut = userChurchId
            ? group.church_id !== userChurchId
            : false;
        } else if (isGroupLeader) {
          if (isInUserChurch) {
            include = true;
          } else if (friendInGroup) {
            include = true;
            isGreyedOut = true;
          }
        } else {
          if (isInUserService) {
            include = true;
          } else if (friendInGroup) {
            include = true;
            isGreyedOut = true;
          }
        }

        if (include) {
          acc.push({ ...group, __isGreyedOut: isGreyedOut });
        }

        return acc;
      },
      []
    );
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
    return filteredGroups
      .map((g) => {
        let distanceKm: number | undefined;
        if (sortBy === 'distance' && userCoords) {
          const parsed = locationService.parseGroupLocation(g.location);
          if (parsed.coordinates) {
            distanceKm = locationService.calculateDistance(
              userCoords,
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
        if (sortBy === 'distance' && userCoords) {
          const da = a.__distanceKm;
          const db = b.__distanceKm;
          if (da == null && db == null) return 0;
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        } else if (sortBy === 'alphabetical') {
          return (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'friends') {
          return b.__friendsCount - a.__friendsCount;
        }
        return 0;
      });
  }, [filteredGroups, sortBy, userCoords, friendIds]);

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

  const handleCreateSuccess = () => {
    refetch(); // In case we come back and want to refresh
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
      filters.categories.length > 0 ||
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

  const renderListView = () => (
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
      contentContainerStyle={styles.listContent}
    />
  );

  const renderMapView = () => (
    <GroupsMapView
      groups={filteredGroups}
      onGroupPress={handleGroupPress}
      isLoading={isLoading}
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
          { backgroundColor: theme.colors.surface.primary },
        ]}
      >
        <Text variant="h4" style={styles.title}>
          Groups
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor:
                  currentView === 'map'
                    ? theme.colors.primary[500]
                    : theme.colors.secondary[100],
              },
            ]}
            onPress={() =>
              handleViewChange(currentView === 'list' ? 'map' : 'list')
            }
            accessibilityLabel={`Switch to ${currentView === 'list' ? 'map' : 'list'} view`}
          >
            <Ionicons
              name={currentView === 'list' ? 'map-outline' : 'list-outline'}
              size={16}
              color={
                currentView === 'map'
                  ? theme.colors.secondary[100]
                  : theme.colors.primary[500]
              }
            />
            <Text
              variant="caption"
              style={{
                color:
                  currentView === 'map'
                    ? theme.colors.secondary[100]
                    : theme.colors.primary[500],
                marginLeft: 4,
                fontSize: 12,
                fontWeight: '500',
              }}
            >
              {currentView === 'list' ? 'Map' : 'List'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.secondary[100] },
            ]}
            onPress={() => setShowSearch((s) => !s)}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={theme.colors.primary[500]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.secondary[100] },
            ]}
            onPress={() => setShowFilterPanel(true)}
          >
            <Ionicons
              name="funnel-outline"
              size={20}
              color={theme.colors.primary[500]}
            />
            {getActiveFiltersCount(filters) > 0 && (
              <View style={styles.badge}>
                <Text
                  variant="caption"
                  color="inverse"
                  style={styles.badgeText}
                >
                  {getActiveFiltersCount(filters)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: currentView === 'map'
                  ? theme.colors.secondary[200] // Grayed out when disabled
                  : sortBy !== 'none'
                  ? theme.colors.primary[500] // Pink when sorted
                  : theme.colors.secondary[100], // Green when not sorted
                opacity: currentView === 'map' ? 0.5 : 1, // Dimmed when disabled
              },
            ]}
            onPress={() => currentView !== 'map' && setShowSortOptions((s) => !s)}
            accessibilityLabel={currentView === 'map' ? 'Sort not available in map view' : 'Sort options'}
            disabled={currentView === 'map'}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={20}
              color={
                currentView === 'map'
                  ? theme.colors.text.secondary // Grayed out when disabled
                  : sortBy !== 'none'
                  ? theme.colors.secondary[100] // Green when sorted
                  : theme.colors.primary[500] // Pink when not sorted
              }
            />
          </TouchableOpacity>
          {userProfile?.church_id && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: theme.colors.secondary[100] },
              ]}
              onPress={handleCreateGroup}
              accessibilityLabel="Create group"
            >
              <Ionicons
                name="add-outline"
                size={22}
                color={theme.colors.primary[500]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearch && <SearchBar placeholder="Search groups..." />}

      {showSortOptions && (
        <View style={[styles.sortOptionsPanel, { backgroundColor: theme.colors.surface.primary }]}>
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'none' && styles.sortOptionSelected,
            ]}
            onPress={() => {
              setSortBy('none');
              setShowSortOptions(false);
            }}
          >
            <Ionicons
              name="remove-outline"
              size={20}
              color={sortBy === 'none' ? theme.colors.secondary[100] : theme.colors.text.primary}
            />
            <Text
              variant="body"
              style={[
                styles.sortOptionText,
                sortBy === 'none' ? styles.sortOptionTextSelected : {},
              ]}
            >
              No sorting
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'distance' && styles.sortOptionSelected,
            ]}
            onPress={async () => {
              if (!userCoords) {
                const coords = await locationService.getCurrentLocation();
                if (coords) setUserCoords(coords);
              }
              setSortBy('distance');
              setShowSortOptions(false);
            }}
          >
            <Ionicons
              name="navigate-outline"
              size={20}
              color={sortBy === 'distance' ? theme.colors.secondary[100] : theme.colors.text.primary}
            />
            <Text
              variant="body"
              style={[
                styles.sortOptionText,
                sortBy === 'distance' ? styles.sortOptionTextSelected : {},
              ]}
            >
              By distance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'alphabetical' && styles.sortOptionSelected,
            ]}
            onPress={() => {
              setSortBy('alphabetical');
              setShowSortOptions(false);
            }}
          >
            <Ionicons
              name="text-outline"
              size={20}
              color={sortBy === 'alphabetical' ? theme.colors.secondary[100] : theme.colors.text.primary}
            />
            <Text
              variant="body"
              style={[
                styles.sortOptionText,
                sortBy === 'alphabetical' ? styles.sortOptionTextSelected : {},
              ]}
            >
              Alphabetically
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'friends' && styles.sortOptionSelected,
            ]}
            onPress={() => {
              setSortBy('friends');
              setShowSortOptions(false);
            }}
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={sortBy === 'friends' ? theme.colors.secondary[100] : theme.colors.text.primary}
            />
            <Text
              variant="body"
              style={[
                styles.sortOptionText,
                sortBy === 'friends' ? styles.sortOptionTextSelected : {},
              ]}
            >
              By number of friends
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.contentContainer}>
        {currentView === 'list' ? renderListView() : renderMapView()}
      </View>

      <FilterPanel
        isVisible={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
      />
    </SafeAreaView>
  );
}

// Component to handle membership status for each group
const GroupItemWithMembership: React.FC<{
  group: GroupWithDetails & { __distanceKm?: number };
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

  const router = useRouter();

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
      .filter((m) => m.role === 'leader' && m.user)
      .map((m) => m.user)
      .filter((user): user is NonNullable<typeof user> => !!user)
      .slice(0, 3); // Limit to 3 leaders for display
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
      onPressFriends={() => {
        // Navigate to group detail and open friends modal
        onPress();
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  compactHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#1f2937',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 17,
    minWidth: 60,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff' },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
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
  createButton: {
    marginTop: 16,
  },
  sortOptionsPanel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  sortOptionSelected: {
    backgroundColor: '#8b5cf6',
  },
  sortOptionText: {
    marginLeft: 12,
    color: '#1a1a1a',
  },
  sortOptionTextSelected: {
    color: '#fff',
  },
});
