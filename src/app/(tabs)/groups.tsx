import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
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
  const { filters, setSearchQuery } = useGroupFiltersStore();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const friendsQuery = useFriends(userProfile?.id);
  const [showSearch, setShowSearch] = useState(false);
  const [isLocationSearchMode, setIsLocationSearchMode] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNoGroupFitsModal, setShowNoGroupFitsModal] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState<'alphabetical' | 'distance' | 'friends'>(
    'alphabetical'
  );
  const [userCoords, setUserCoords] = useState<{
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

  // Hide sort options when switching to map view
  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    if (view === 'map') {
      setShowSortOptions(false);
      // Keep search bar visible if sorting by distance and location is set
      if (sortBy === 'distance' && distanceOrigin) {
        setShowSearch(true);
      }
    }
  };

  // Close location search bar when switching away from distance sorting
  useEffect(() => {
    if (isLocationSearchMode && sortBy !== 'distance' && showSearch) {
      setShowSearch(false);
      setIsLocationSearchMode(false);
      setLocationSearchError(null);
    }
  }, [sortBy, isLocationSearchMode, showSearch]);

  const isChurchAdmin = userProfile?.roles?.includes('church_admin') ?? false;

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
  const isLoading = isChurchAdmin
    ? isLoadingAdminGroups
    : isLoadingChurchGroups;
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
          isGreyedOut = userChurchId ? group.church_id !== userChurchId : false;
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
      <View
        style={[
          styles.noGroupFitsButtonFloating,
          Platform.OS === 'ios'
            ? { top: -50 + insets.top } // iOS: hover above first card (negative offset to float above)
            : { top: 8 }, // Android: align with first card padding
        ]}
      >
        <View style={styles.noGroupFitsButtonContainer}>
          <Button
            title="No group fits?"
            onPress={handleNoGroupFits}
            variant="secondary"
            size="small"
            style={styles.noGroupFitsButton}
            textStyle={styles.noGroupFitsButtonText}
          />
        </View>
      </View>
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
      onNoGroupFits={handleNoGroupFits}
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
          { backgroundColor: theme.colors.surface.primary },
        ]}
      >
        <View style={styles.headerLeft}>
          <Image
            source={require('../../../assets/figma-128-1563/47c97a3de297c8957bfbc742d3e4396bccd0d31a.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="h4" weight="black" style={styles.title}>
            Groups
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.figmaIconButton}
            onPress={() => {
              if (showSearch) {
                // If search bar is already open
                if (isLocationSearchMode) {
                  // If in location mode, switch to group search mode (don't close)
                  setIsLocationSearchMode(false);
                  setLocationSearchError(null);
                } else {
                  // If already in group search mode, close the search bar
                  setShowSearch(false);
                }
              } else {
                // If search bar is closed, open it in group search mode
                setIsLocationSearchMode(false);
                setLocationSearchError(null);
                setShowSearch(true);
              }
            }}
            accessibilityLabel="Search groups"
          >
            <View
              style={[
                styles.iconButtonInner,
                (showSearch && !isLocationSearchMode) || filters.searchQuery.length > 0
                  ? styles.iconButtonInnerActive
                  : null,
              ]}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={
                  (showSearch && !isLocationSearchMode) || filters.searchQuery.length > 0
                    ? '#FFFFFF'
                    : '#2C2235'
                }
              />
            </View>
          </TouchableOpacity>
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
                color={currentView === 'map' ? '#FFFFFF' : '#2C2235'}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.secondary[100] },
            ]}
            onPress={() => setShowFilterPanel(true)}
            accessibilityLabel="Filter groups"
          >
            <View
              style={[
                styles.iconButtonInner,
                getActiveFiltersCount(filters) > 0 &&
                  styles.iconButtonInnerActive,
              ]}
            >
              <Ionicons
                name="funnel-outline"
                size={16}
                color={
                  getActiveFiltersCount(filters) > 0 ? '#FFFFFF' : '#2C2235'
                }
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.figmaIconButton}
            onPress={() =>
              currentView !== 'map' && setShowSortOptions((s) => !s)
            }
            accessibilityLabel="Sort options"
            disabled={currentView === 'map'}
          >
            <View
              style={[
                styles.iconButtonInner,
                currentView === 'map' && styles.iconButtonDisabled,
                currentView !== 'map' &&
                  sortBy !== 'alphabetical' &&
                  styles.iconButtonInnerActive,
              ]}
            >
              <Ionicons
                name="swap-vertical-outline"
                size={20}
                color={
                  currentView === 'map'
                    ? '#8B8A8C'
                    : sortBy !== 'alphabetical'
                      ? '#FFFFFF'
                      : '#2C2235'
                }
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.figmaIconButton}
            onPress={() => {
              if (showSearch && isLocationSearchMode) {
                // If search bar is already open in location mode, close it and clear distance sorting
                setShowSearch(false);
                setIsLocationSearchMode(false);
                setLocationSearchError(null);
                // Clear distance sorting - go back to alphabetical
                setSortBy('alphabetical');
                // Clear distance origin
                setDistanceOrigin(null);
              } else {
                // If search bar is not shown, open it in location mode
                setIsLocationSearchMode(true);
                // Set sort to distance (makes arrow pink)
                setSortBy('distance');
                // Open search bar in location mode
                setShowSearch(true);
                // Clear location search errors when opening
                setLocationSearchError(null);
              }
            }}
            accessibilityLabel="Choose location to measure distance from"
          >
            <View
              style={[
                styles.iconButtonInner,
                sortBy === 'distance' && styles.iconButtonInnerActive, // Pink when distance is selected
              ]}
            >
              <Ionicons
                name="navigate-outline"
                size={16}
                color={sortBy === 'distance' ? '#FFFFFF' : '#2C2235'}
              />
            </View>
          </TouchableOpacity>
          {userProfile?.church_id && (
            <TouchableOpacity
              style={styles.figmaIconButton}
              onPress={handleCreateGroup}
              accessibilityLabel="Create group"
            >
              <View style={styles.iconButtonInner}>
                <Ionicons name="add-outline" size={24} color="#2C2235" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearch && (!isLocationSearchMode || sortBy === 'distance') && (
        <SearchBar
          key={isLocationSearchMode ? 'location-search' : 'group-search'}
          placeholder={
            isLocationSearchMode ? 'Enter search location' : 'Search groups...'
          }
          value={isLocationSearchMode ? (distanceOrigin?.address || '') : undefined}
          onLocationSearch={
            isLocationSearchMode
              ? async (query: string) => {
                  try {
                    // Clear any previous errors
                    setLocationSearchError(null);
                    // Geocode the search query to get coordinates
                    const coordinates =
                      await locationService.geocodeAddress(query);
                    if (coordinates) {
                      // Get reverse geocode to get a formatted address
                      const address =
                        await locationService.reverseGeocode(coordinates);
                      setDistanceOrigin({
                        address: address?.formattedAddress || query,
                        coordinates,
                      });
                      // Don't clear search query - filters should remain when sorting by location
                      // Clear error on success
                      setLocationSearchError(null);
                      // Keep search bar open so user can see/change the location
                    } else {
                      // Set error state instead of using global error handler
                      setLocationSearchError('Location not found');
                    }
                  } catch (error) {
                    // Set error state instead of using global error handler
                    setLocationSearchError('Location not found');
                  }
                }
              : undefined
          }
          onLocationClear={
            isLocationSearchMode
              ? () => {
                  setDistanceOrigin(null);
                  // Don't clear search query - filters should remain when clearing location
                  setLocationSearchError(null);
                }
              : undefined
          }
          error={locationSearchError}
          onErrorChange={setLocationSearchError}
        />
      )}

      {showSortOptions && (
        <View
          style={[
            styles.sortOptionsPanel,
            { backgroundColor: theme.colors.surface.primary },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'alphabetical' && styles.sortOptionSelected,
            ]}
            onPress={() => {
              setSortBy('alphabetical');
              setShowSortOptions(false);
              // Clear distance origin and close search bar when switching away from distance sorting
              if (distanceOrigin) {
                setDistanceOrigin(null);
              }
              // Close search bar if it's open in location mode
              if (isLocationSearchMode) {
                setIsLocationSearchMode(false);
                setLocationSearchError(null);
                setShowSearch(false);
              }
            }}
          >
            <Ionicons
              name="text-outline"
              size={20}
              color={
                sortBy === 'alphabetical'
                  ? '#FF0083'
                  : '#2C2235'
              }
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
              sortBy === 'distance' && styles.sortOptionSelected,
            ]}
            onPress={async () => {
              if (!userCoords) {
                const coords = await locationService.getCurrentLocation();
                if (coords) setUserCoords(coords);
              }
              setSortBy('distance');
              setShowSortOptions(false);
              // Switch to location search mode and open search bar
              setIsLocationSearchMode(true);
              setShowSearch(true);
              setLocationSearchError(null);
            }}
          >
            <Ionicons
              name="navigate-outline"
              size={20}
              color={
                sortBy === 'distance' ? '#FF0083' : '#2C2235'
              }
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
              styles.sortOptionLast,
              sortBy === 'friends' && styles.sortOptionSelected,
            ]}
            onPress={() => {
              setSortBy('friends');
              setShowSortOptions(false);
              // Clear distance origin and close search bar when switching away from distance sorting
              if (distanceOrigin) {
                setDistanceOrigin(null);
              }
              // Close search bar if it's open in location mode
              if (isLocationSearchMode) {
                setIsLocationSearchMode(false);
                setLocationSearchError(null);
                setShowSearch(false);
              }
            }}
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={
                sortBy === 'friends' ? '#FF0083' : '#2C2235'
              }
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

      <Modal
        isVisible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Groups Overview"
        scrollable
      >
        <View style={styles.infoModalContent}>
          <Text variant="body" style={styles.infoModalParagraph}>
            Explore Bible study groups from here, switch between the list and
            map views, and tap any card to see full details or request to join.
          </Text>

          <View style={styles.infoModalSection}>
            <Text variant="h6" style={styles.infoModalHeading}>
              Visibility rules
            </Text>
            <Text variant="body" style={styles.infoModalBullet}>
              • Members see groups in their own service. Groups with your
              friends outside the service appear in grey.
            </Text>
            <Text variant="body" style={styles.infoModalBullet}>
              • Group leaders see every group in their church plus grey markers
              for friend groups in other churches.
            </Text>
            <Text variant="body" style={styles.infoModalBullet}>
              • Church admins see every approved group. Groups outside your
              church are tinted grey for context.
            </Text>
          </View>

          <View style={styles.infoModalSection}>
            <Text variant="h6" style={styles.infoModalHeading}>
              Helpful tips
            </Text>
            <Text variant="body" style={styles.infoModalBullet}>
              • Use filters and search to narrow by day, category, or friends in
              a group.
            </Text>
            <Text variant="body" style={styles.infoModalBullet}>
              • Switch to the map to browse by location and tap pins for quick
              access to the group card.
            </Text>
            <Text variant="body" style={styles.infoModalBullet}>
              • Grey groups are outside your immediate scope but include
              friends—reach out if you&apos;re interested.
            </Text>
          </View>
        </View>
      </Modal>

      <FilterPanel
        isVisible={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
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
    />
  );
};

const styles = StyleSheet.create({
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
    color: '#2C2235',
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
    backgroundColor: '#F9FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonInner: {
    backgroundColor: '#FF0083',
  },
  iconButtonInnerActive: {
    backgroundColor: '#FF0083',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
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
    paddingHorizontal: 0,
  },
  listViewContainer: {
    flex: 1,
    position: 'relative',
  },
  noGroupFitsButtonContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noGroupFitsButtonFloating: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  noGroupFitsButton: {
    paddingHorizontal: 14,
    maxWidth: 120, // Compact width to match the drawn outline
    backgroundColor: '#2C2235', // Match friends badge color
    borderColor: '#2C2235',
  },
  noGroupFitsButtonText: {
    color: '#FFFFFF', // Ensure white text on dark purple background
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
  createButton: {
    marginTop: 16,
  },
  sortOptionsPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  sortOptionLast: {
    marginBottom: 0,
  },
  sortOptionSelected: {
    backgroundColor: '#FFE5F3',
  },
  sortOptionText: {
    marginLeft: 12,
    color: '#2C2235',
    fontSize: 14,
    fontWeight: '500',
  },
  sortOptionTextSelected: {
    color: '#2C2235',
    fontWeight: '600',
  },
  infoModalContent: {
    paddingVertical: 4,
  },
  infoModalParagraph: {
    color: '#374151',
    marginBottom: 12,
  },
  infoModalSection: {
    marginBottom: 16,
  },
  infoModalHeading: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoModalBullet: {
    color: '#374151',
    marginBottom: 8,
  },
});
