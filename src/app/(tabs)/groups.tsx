import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  GroupCard,
  GroupsMapView, 
  ViewToggle,
  FilterPanel,
  SearchBar,
  type ViewMode 
} from '../../components/groups';
import { useGroupsByChurch, useGroupMembership, useGroupMembers } from '../../hooks/useGroups';
import { useAuthStore, useGroupFiltersStore } from '../../stores';
import { useErrorHandler, useLoadingState } from '../../hooks';
import { ErrorMessage, EmptyState, LoadingSpinner } from '../../components/ui';
import { applyGroupFilters, getActiveFiltersDescription, getActiveFiltersCount } from '../../utils/groupFilters';
import type { GroupWithDetails } from '../../types/database';
import { useFriends } from '../../hooks/useFriendships';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/location';

export default function GroupsScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { filters } = useGroupFiltersStore();
  const friendsQuery = useFriends(userProfile?.id);
  const [showSearch, setShowSearch] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const { handleError } = useErrorHandler();
  const { isLoading: isLoadingFn, withLoading } = useLoadingState();
  // Create flow now navigates to dedicated page
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('list');

  const {
    data: allGroups,
    isLoading,
    error,
    refetch,
  } = useGroupsByChurch(userProfile?.church_id);

  // Apply filters to groups (including "only with friends")
  const filteredGroups = useMemo(() => {
    if (!allGroups) return [];
    let base = applyGroupFilters(allGroups, filters);
    if (filters.onlyWithFriends) {
      const friendIds = new Set(
        (friendsQuery.data || [])
          .map((f) => f.friend?.id)
          .filter((id): id is string => !!id)
      );
      base = base.filter((g) =>
        (g.memberships || []).some((m: any) => m.status === 'active' && friendIds.has(m.user_id))
      );
    }
    return base;
  }, [allGroups, filters, friendsQuery.data]);

  // Distance-sorted groups with computed distance
  const groupsWithDistance = useMemo(() => {
    if (!filteredGroups) return [] as (typeof filteredGroups) & any[];
    return filteredGroups.map((g) => {
      let distanceKm: number | undefined;
      if (sortByDistance && userCoords) {
        const parsed = locationService.parseGroupLocation(g.location);
        if (parsed.coordinates) {
          distanceKm = locationService.calculateDistance(userCoords, parsed.coordinates);
        }
      }
      return { ...g, __distanceKm: distanceKm } as any;
    }).sort((a: any, b: any) => {
      if (!sortByDistance || !userCoords) return 0;
      const da = a.__distanceKm;
      const db = b.__distanceKm;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
  }, [filteredGroups, sortByDistance, userCoords]);

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

  const renderGroupItem = ({ item: group }: { item: GroupWithDetails & { __distanceKm?: number } }) => {
    return (
      <GroupItemWithMembership
        group={group}
        onPress={() => handleGroupPress(group)}
        distanceKm={group.__distanceKm}
      />
    );
  };

  const renderEmptyState = () => {
    const hasFilters = filters.meetingDays.length > 0 || 
                      filters.categories.length > 0 || 
                      filters.searchQuery.length > 0 ||
                      filters.onlyWithFriends;
    
    return (
      <EmptyState
        icon={<Text style={{ fontSize: 48 }}>📖</Text>}
        title={hasFilters ? "No Groups Match Your Filters" : "No Groups Found"}
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bible Study Groups</Text>
          <Text style={styles.subtitle}>
            Discover and join Bible study groups in your church community
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </View>
    );
  }

  if (error && !allGroups) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bible Study Groups</Text>
          <Text style={styles.subtitle}>
            Discover and join Bible study groups in your church community
          </Text>
        </View>
        {renderErrorState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.compactHeader}>
        <Text style={styles.title}>Groups</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSearch((s) => !s)}>
            <Ionicons name="search-outline" size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowFilterPanel(true)}>
            <Ionicons name="funnel-outline" size={20} color="#374151" />
            {getActiveFiltersCount(filters) > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{getActiveFiltersCount(filters)}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, sortByDistance && { backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: '#d1d5db' }]}
            onPress={async () => {
              const next = !sortByDistance;
              setSortByDistance(next);
              if (next && !userCoords) {
                const coords = await locationService.getCurrentLocation();
                if (coords) setUserCoords(coords);
              }
            }}
            accessibilityLabel="Sort by distance"
          >
            <Ionicons name="navigate-outline" size={20} color="#374151" />
          </TouchableOpacity>
          {userProfile?.church_id && (
            <TouchableOpacity style={styles.iconButton} onPress={handleCreateGroup} accessibilityLabel="Create group">
              <Ionicons name="add-outline" size={22} color="#374151" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearch && (
        <SearchBar placeholder="Search groups..." />
      )}

      <View style={styles.controlsRow}>
        <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
      </View>

      <View style={styles.contentContainer}>
        {currentView === 'list' ? renderListView() : renderMapView()}
      </View>

      <FilterPanel isVisible={showFilterPanel} onClose={() => setShowFilterPanel(false)} />
    </View>
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

  const membershipStatus = membershipData?.membership?.role || null;

  const friendsCount = React.useMemo(() => {
    const friendIds = new Set(
      (friendsQuery.data || [])
        .map((f) => f.friend?.id)
        .filter((id): id is string => !!id)
    );
    return (members || []).filter((m) => m.user?.id && friendIds.has(m.user.id)).length;
  }, [friendsQuery.data, members]);

  return (
    <GroupCard
      group={group}
      onPress={onPress}
      membershipStatus={membershipStatus}
      distanceKm={typeof distanceKm === 'number' ? distanceKm : (group as any).__distanceKm}
      friendsCount={friendsCount}
      onPressFriends={() => {
        // Navigate to group detail and open friends modal
        const router = useRouter();
        router.push(`/group/${group.id}?friends=1`);
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  compactHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#8b5cf6', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  controlsRow: { paddingHorizontal: 12, paddingTop: 8 },
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
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    margin: 16,
  },
  createButton: {
    marginTop: 16,
  },
});
