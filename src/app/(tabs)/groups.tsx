import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Keyboard,
  TextInput,
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
  useIsGroupLeader,
} from '../../hooks/useGroups';
import { useAuthStore, useGroupFiltersStore } from '../../stores';
import { useErrorHandler, useLoadingState } from '../../hooks';
import {
  ErrorMessage,
  EmptyState,
  Modal,
  Button,
} from '../../components/ui';
import { AuthLoadingAnimation } from '../../components/auth/AuthLoadingAnimation';
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
import Svg, { Path, G } from 'react-native-svg';

// Figma icon components for Filter and Sort
const FilterIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <G id="filter">
      <Path
        id="Vector"
        d="M3.6 1.4H12.4C13.1333 1.4 13.7333 2 13.7333 2.73333V4.2C13.7333 4.73333 13.4 5.4 13.0667 5.73333L10.2 8.26667C9.8 8.6 9.53333 9.26667 9.53333 9.8V12.6667C9.53333 13.0667 9.26667 13.6 8.93333 13.8L8 14.4C7.13333 14.9333 5.93333 14.3333 5.93333 13.2667V9.73333C5.93333 9.26667 5.66667 8.66667 5.4 8.33333L2.86667 5.66667C2.53333 5.33333 2.26667 4.73333 2.26667 4.33333V2.8C2.26667 2 2.86667 1.4 3.6 1.4Z"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_2"
        d="M7.28667 1.4L4 6.66667"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

const SortIcon = ({ color, size = 20 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G id="candle">
      <Path
        id="Vector"
        d="M6.5 22V15"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_2"
        d="M6.5 5V2"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_3"
        d="M17.5 22V19"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_4"
        d="M17.5 9V2"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_5"
        d="M9.5 7V13C9.5 14.1 9 15 7.5 15H5.5C4 15 3.5 14.1 3.5 13V7C3.5 5.9 4 5 5.5 5H7.5C9 5 9.5 5.9 9.5 7Z"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        id="Vector_6"
        d="M20.5 11V17C20.5 18.1 20 19 18.5 19H16.5C15 19 14.5 18.1 14.5 17V11C14.5 9.9 15 9 16.5 9H18.5C20 9 20.5 9.9 20.5 11Z"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

export default function GroupsScreen() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { filters, setSearchQuery } = useGroupFiltersStore();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Calculate tab bar height to position search bar correctly (no gap above tab bar)
  const androidBottomPadding = Math.max(insets.bottom + 4, 12);
  const tabBarHeight = Platform.OS === 'ios' ? 100 : 56 + androidBottomPadding;
  const searchBarHeight = 50; // Search bar height
  
  // Keyboard listeners to adjust search bar position
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Position search bar: above keyboard when open, otherwise above tab bar
  const searchBarBottom = keyboardHeight > 0 
    ? keyboardHeight + 8 // 8px spacing above keyboard
    : tabBarHeight; // Above tab bar when keyboard is closed
  const friendsQuery = useFriends(userProfile?.id);
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
  const searchInputRef = useRef<TextInput | null>(null);
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
      setIsLocationSearchMode(true);
    } else if (view === 'list' && sortBy !== 'distance' && !distanceOrigin) {
      setIsLocationSearchMode(false);
    }
  };

  useEffect(() => {
    if (currentView === 'list') {
      searchInputRef.current?.blur();
      Keyboard.dismiss();
    }
  }, [currentView]);

  // Reset location search mode when switching away from distance sorting
  useEffect(() => {
    if (currentView === 'map') {
      setIsLocationSearchMode(true);
      return;
    }
    if (isLocationSearchMode && sortBy !== 'distance') {
      setIsLocationSearchMode(false);
      setLocationSearchError(null);
    }
  }, [sortBy, isLocationSearchMode, currentView]);

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
  } = useGroupsByChurch(!shouldFetchAllGroups ? userProfile?.church_id : undefined);

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
  const refetch = shouldFetchAllGroups ? refetchAdminGroups : refetchChurchGroups;

  const friendIds = useMemo(
    () =>
      new Set(
        (friendsQuery.data || [])
          .map((friendship) => friendship.friend?.id)
          .filter((id): id is string => !!id)
      ),
    [friendsQuery.data]
  );

  const isLeaderOfApprovedGroup = useMemo(() => {
    if (!userProfile?.id || !allGroups?.length) return false;
    return allGroups.some((group) =>
      (group.memberships || []).some(
        (membership: any) =>
          membership.user_id === userProfile.id &&
          membership.role === 'leader' &&
          membership.status === 'active'
      )
    );
  }, [allGroups, userProfile?.id]);

  const canFilterByChurch =
    !!userProfile?.church_id && (isChurchAdmin || isLeaderOfApprovedGroup);

  const groupsWithVisibility = useMemo(() => {
    if (!allGroups) return [];

    const userChurchId = userProfile?.church_id;
    const userServiceId = userProfile?.service_id;

    return allGroups.reduce<
      (GroupWithDetails & {
        __isGreyedOut?: boolean;
        __category?: 'service' | 'church' | 'outside';
      })[]
    >(
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
          isGreyedOut = userChurchId
            ? group.church_id !== userChurchId
            : false;
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
          acc.push({ ...group, __isGreyedOut: isGreyedOut, __category: category });
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
    if (filters.onlyMyChurch && userProfile?.church_id) {
      base = base.filter((group) => group.church_id === userProfile.church_id);
    }
    if (filters.onlyWithFriends) {
      base = base.filter((g) =>
        (g.memberships || []).some(
          (m: any) => m.status === 'active' && friendIds.has(m.user_id)
        )
      );
    }
    return base;
  }, [groupsWithVisibility, filters, friendIds, userProfile?.church_id]);

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
          <TouchableOpacity
            onPress={handleNoGroupFits}
            style={styles.noGroupFitsButton}
            activeOpacity={0.8}
          >
            <Text
              style={styles.noGroupFitsButtonText}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
              numberOfLines={1}
            >
              No group fits?
            </Text>
          </TouchableOpacity>
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
          <AuthLoadingAnimation />
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
          <Text variant="h4" weight="black" style={styles.title}>
            Groups
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.figmaIconButton}
            onPress={() => handleViewChange(currentView === 'map' ? 'list' : 'map')}
            accessibilityLabel={currentView === 'map' ? 'Switch to list view' : 'Switch to map view'}
          >
            <View
              style={[
                styles.iconButtonInner,
                currentView === 'map' && styles.iconButtonInnerActive,
              ]}
            >
              <Ionicons
                name="map-outline"
                size={16}
                color={currentView === 'map' ? '#FFFFFF' : '#2C2235'}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.figmaIconButton}
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
              <FilterIcon
                color={
                  getActiveFiltersCount(filters) > 0 ? '#FFFFFF' : '#2C2235'
                }
                size={16}
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
              <SortIcon
                color={
                  currentView === 'map'
                    ? '#8B8A8C'
                    : sortBy !== 'alphabetical'
                      ? '#FFFFFF'
                      : '#2C2235'
                }
                size={20}
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
              // Clear distance origin when switching away from distance sorting
              if (distanceOrigin) {
                setDistanceOrigin(null);
              }
              // Reset location search mode
              if (isLocationSearchMode) {
                setIsLocationSearchMode(false);
                setLocationSearchError(null);
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
              // Switch to location search mode
              setIsLocationSearchMode(true);
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
              // Clear distance origin when switching away from distance sorting
              if (distanceOrigin) {
                setDistanceOrigin(null);
              }
              // Reset location search mode
              if (isLocationSearchMode) {
                setIsLocationSearchMode(false);
                setLocationSearchError(null);
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

      {/* Search Bar - Always visible at bottom */}
      <View style={[styles.searchBarContainer, { bottom: searchBarBottom }]}>
        <SearchBar
          ref={searchInputRef}
          key={
            currentView === 'map' || sortBy === 'distance'
              ? 'location-search'
              : 'group-search'
          }
          placeholder={
            currentView === 'map' || sortBy === 'distance'
              ? 'Enter search location'
              : 'Search by keyword'
          }
          value={
            currentView === 'map' || sortBy === 'distance'
              ? distanceOrigin?.address || ''
              : undefined
          }
          onLocationSearch={
            currentView === 'map' || sortBy === 'distance'
              ? async (query: string) => {
                  try {
                    setLocationSearchError(null);
                    if (sortBy !== 'distance') {
                      setSortBy('distance');
                    }
                    if (!isLocationSearchMode) {
                      setIsLocationSearchMode(true);
                    }
                    const coordinates =
                      await locationService.geocodeAddress(query);
                    if (coordinates) {
                      const address =
                        await locationService.reverseGeocode(coordinates);
                      setDistanceOrigin({
                        address: address?.formattedAddress || query,
                        coordinates,
                      });
                      setLocationSearchError(null);
                    } else {
                      setLocationSearchError('Location not found');
                    }
                  } catch (error) {
                    setLocationSearchError('Location not found');
                  }
                }
              : undefined
          }
          onLocationClear={
            currentView === 'map' || sortBy === 'distance'
              ? () => {
                  setDistanceOrigin(null);
                  setLocationSearchError(null);
                }
              : undefined
          }
          error={locationSearchError}
          onErrorChange={setLocationSearchError}
        />
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
              • Use filters and search to narrow by day or friends in
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
        canFilterByChurch={canFilterByChurch}
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
      category={(group as any).__category}
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
    backgroundColor: '#F9FAFC', // Light background for inactive buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonInner: {
    backgroundColor: '#FF0083',
  },
  iconButtonInnerActive: {
    backgroundColor: '#2C2235', // Dark purple instead of pink
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
    paddingBottom: 90, // Space for bottom search bar
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
    paddingVertical: 8,
    maxWidth: 120, // Compact width to match the drawn outline
    backgroundColor: '#2C2235', // Match friends badge color
    borderRadius: 16, // Rounded corners
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  noGroupFitsButtonText: {
    color: '#FFFFFF', // Ensure white text on dark purple background
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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
  searchBarContainer: {
    position: 'absolute',
    left: 26,
    right: 26,
    zIndex: 10,
  },
});
