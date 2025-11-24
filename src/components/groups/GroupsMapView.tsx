import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  AdminAccessibilityLabels,
  ScreenReaderUtils,
} from '@/utils/accessibility';
import { Ionicons } from '@expo/vector-icons';
import { locationService, Coordinates } from '../../services/location';
import { MapViewFallback } from './MapViewFallback';
import {
  MapClusterer,
  MapViewportOptimizer,
  MapPerformanceMonitor,
  type Cluster,
  type ClusterPoint,
} from '../../utils/mapClustering';
import { Button } from '../ui';
import { GroupCard } from './GroupCard';
import type { GroupWithDetails } from '../../types/database';
import { useGroupMembership, useGroupMembers } from '../../hooks/useGroups';
import { useFriends } from '../../hooks/useFriendships';
import { useAuthStore } from '../../stores/auth';

// Dynamically import MapView - not available in Expo Go
// Using try-catch to gracefully handle when the module isn't available
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

// Only try to import react-native-maps on native platforms (not web)
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-commonjs
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch {
    // react-native-maps not available (Expo Go) - will show fallback UI
    console.log(
      '[GroupsMapView] react-native-maps not available - using fallback'
    );
  }
} else {
  console.log(
    '[GroupsMapView] react-native-maps not available on web - using fallback'
  );
}

interface GroupsMapViewProps {
  groups: GroupWithDetails[];
  onGroupPress: (group: GroupWithDetails) => void;
  isLoading?: boolean;
  onNoGroupFits?: () => void;
  distanceOrigin?: {
    coordinates: { latitude: number; longitude: number };
    address?: string;
  } | null;
  onDistanceOriginChange?: (origin: {
    coordinates: { latitude: number; longitude: number };
    address?: string;
  }) => void;
}

interface GroupMarker {
  group: GroupWithDetails;
  coordinates: Coordinates;
  address?: string;
}

interface ClusteredMapViewProps extends GroupsMapViewProps {
  enableClustering?: boolean;
  clusterRadius?: number;
  minClusterSize?: number;
  onNoGroupFits?: () => void;
  distanceOrigin?: {
    coordinates: { latitude: number; longitude: number };
    address?: string;
  } | null;
  onDistanceOriginChange?: (origin: {
    coordinates: { latitude: number; longitude: number };
    address?: string;
  }) => void;
}

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Default region (centered on London)
const DEFAULT_REGION: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

const POSITION_EPSILON = 1e-5;
const VIEW_TRACKING_RESET_DELAY = 250;

const getClusterVisuals = (count: number) => {
  if (count >= 50) {
    return {
      size: 60,
      bubbleColor: '#be185d', // Darkest pink
    } as const;
  }

  if (count >= 25) {
    return {
      size: 52,
      bubbleColor: '#ff0083', // Primary brand pink
    } as const;
  }

  if (count >= 10) {
    return {
      size: 44,
      bubbleColor: '#db2777', // Darker pink
    } as const;
  }

  return {
    size: 36,
    bubbleColor: '#f472b6', // Medium pink - much more visible
  } as const;
};

// Component to handle group card data for map view
const GroupCardWithData: React.FC<{
  group: GroupWithDetails;
  onPress: () => void;
}> = ({ group, onPress }) => {
  const { userProfile } = useAuthStore();
  const { data: membershipData } = useGroupMembership(
    group.id,
    userProfile?.id
  );
  const { data: members } = useGroupMembers(group.id);
  const friendsQuery = useFriends(userProfile?.id);

  const membershipStatus = membershipData?.membership?.role || null;

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

  const leaders = React.useMemo(() => {
    return (members || [])
      .filter((m) => m.role === 'leader' && m.user)
      .map((m) => m.user)
      .filter((user): user is NonNullable<typeof user> => !!user)
      .slice(0, 3);
  }, [members]);

  return (
    <GroupCard
      group={group}
      onPress={onPress}
      membershipStatus={membershipStatus}
      friendsCount={friendsCount}
      friendsInGroup={friendsInGroup}
      leaders={leaders}
      currentUserId={userProfile?.id}
      onPressFriends={() => onPress()}
      style={styles.mapGroupCard}
      category={(group as any).__category}
    />
  );
};

export const GroupsMapView: React.FC<ClusteredMapViewProps> = ({
  groups,
  onGroupPress,
  isLoading = false,
  enableClustering = true, // Re-enabled with optimizations
  clusterRadius = 40,
  minClusterSize = 2,
  onNoGroupFits,
  distanceOrigin,
  onDistanceOriginChange,
}) => {
  // Always declare hooks first (Rules of Hooks)
  const insets = useSafeAreaInsets();
  const [markers, setMarkers] = useState<GroupMarker[]>([]);
  const [region, setRegion] = useState<typeof DEFAULT_REGION>(DEFAULT_REGION);
  const [currentRegion, setCurrentRegion] =
    useState<typeof DEFAULT_REGION>(DEFAULT_REGION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);
  const [clusters, setClusters] = useState<(Cluster | ClusterPoint)[]>([]);
  const mapRef = useRef<any>(null);
  const isUpdatingClusters = useRef(false);
  const viewTrackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [shouldTrackViewChanges, setShouldTrackViewChanges] = useState(true);
  const isUserDraggingRef = useRef(false); // Track if user is dragging the map
  const isProgrammaticMoveRef = useRef(false); // Track if move is programmatic
  const lastProcessedDistanceOriginRef = useRef<string | null>(null); // Track last processed distanceOrigin to prevent loops

  // Selection state for card panel
  const [selectedItems, setSelectedItems] = useState<GroupWithDetails[] | null>(
    null
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!selectedItems || selectedItems.length === 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((prevIndex) =>
      Math.min(prevIndex, Math.max(selectedItems.length - 1, 0))
    );
  }, [selectedItems]);

  const activeGroupId = useMemo(() => {
    if (!selectedItems || selectedItems.length === 0) {
      return null;
    }

    const safeIndex = Math.min(selectedIndex, selectedItems.length - 1);
    return selectedItems[safeIndex]?.id ?? null;
  }, [selectedItems, selectedIndex]);

  // Create clusterer instance only if we have MapView
  const clusterer = useMemo(
    () =>
      MapView
        ? new MapClusterer({
            radius: clusterRadius,
            minZoom: 0,
            maxZoom: 16,
          })
        : null,
    [clusterRadius]
  );

  const hasPositionChanged = useCallback(
    (prev: Cluster | ClusterPoint, next: Cluster | ClusterPoint): boolean => {
      if ('count' in next && 'count' in prev) {
        if (next.count !== prev.count) {
          return true;
        }

        const prevCoords = prev.coordinates;
        const nextCoords = next.coordinates;

        return (
          Math.abs(prevCoords.latitude - nextCoords.latitude) >
            POSITION_EPSILON ||
          Math.abs(prevCoords.longitude - nextCoords.longitude) >
            POSITION_EPSILON
        );
      }

      if (!('count' in next) && !('count' in prev)) {
        return (
          Math.abs(prev.latitude - next.latitude) > POSITION_EPSILON ||
          Math.abs(prev.longitude - next.longitude) > POSITION_EPSILON
        );
      }

      return true;
    },
    []
  );

  const updateClusters = useCallback(() => {
    if (!enableClustering || isUpdatingClusters.current || !clusterer) return;

    isUpdatingClusters.current = true;
    const endClustering = MapPerformanceMonitor.startClustering();

    try {
      // Use even more generous bounds to ensure all groups are included during cluster splits
      const bounds = MapViewportOptimizer.getOptimalBounds(currentRegion);
      const zoom = MapViewportOptimizer.getZoomLevel(
        currentRegion.latitudeDelta
      );
      const newClusters = clusterer.getClusters(bounds, zoom);

      // Always update clusters - ensure bounds are generous enough that all groups are included
      setClusters(newClusters);

      MapPerformanceMonitor.recordPointCount(newClusters.length);
    } finally {
      endClustering();
      isUpdatingClusters.current = false;
    }
  }, [enableClustering, currentRegion, clusterer]);

  const resetViewTracking = useCallback(() => {
    setShouldTrackViewChanges(true);

    if (viewTrackingTimeoutRef.current) {
      clearTimeout(viewTrackingTimeoutRef.current);
    }

    viewTrackingTimeoutRef.current = setTimeout(() => {
      setShouldTrackViewChanges(false);
      viewTrackingTimeoutRef.current = null;
    }, VIEW_TRACKING_RESET_DELAY);
  }, []);

  useEffect(() => {
    resetViewTracking();

    return () => {
      if (viewTrackingTimeoutRef.current) {
        clearTimeout(viewTrackingTimeoutRef.current);
        viewTrackingTimeoutRef.current = null;
      }
    };
  }, [clusters, activeGroupId, resetViewTracking]);

  // Reload clusterer whenever groups change to ensure all groups are available
  // This ensures groups don't get permanently filtered out
  useEffect(() => {
    if (enableClustering && clusterer && groups.length > 0) {
      clusterer.load(groups);
      // Trigger cluster update after a brief delay to ensure markers are processed
      const timeoutId = setTimeout(() => {
        if (currentRegion && markers.length > 0) {
          updateClusters();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, enableClustering, clusterer]);

  // Initialize map region and process group locations
  // Only run when groups change, not when distanceOrigin changes
  useEffect(() => {
    // Only initialize if MapView is available
    if (MapView) {
      initializeMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  // Recenter map when distanceOrigin changes (e.g., when switching to map view after searching)
  // Only recenter if the map is not already at that location (to prevent loops)
  useEffect(() => {
    if (MapView && mapRef.current && distanceOrigin?.coordinates) {
      // Create a unique key for this distanceOrigin to track if we've already processed it
      const originKey = `${distanceOrigin.coordinates.latitude},${distanceOrigin.coordinates.longitude}`;
      
      // Skip if we've already processed this exact location
      if (lastProcessedDistanceOriginRef.current === originKey) {
        if (__DEV__) {
          console.log('[MapDebug] Already processed this distance origin, skipping');
        }
        return;
      }
      
      // Check if map is already at this location (within a small threshold)
      const threshold = 0.0001; // ~11 meters
      const currentLat = currentRegion.latitude;
      const currentLon = currentRegion.longitude;
      const targetLat = distanceOrigin.coordinates.latitude;
      const targetLon = distanceOrigin.coordinates.longitude;
      
      const latDiff = Math.abs(currentLat - targetLat);
      const lonDiff = Math.abs(currentLon - targetLon);
      
      // Skip if already at this location
      if (latDiff < threshold && lonDiff < threshold) {
        // Mark as processed even if we skip
        lastProcessedDistanceOriginRef.current = originKey;
        if (__DEV__) {
          console.log('[MapDebug] Already at distance origin, skipping recenter');
        }
        return;
      }
      
      // Mark this origin as processed
      lastProcessedDistanceOriginRef.current = originKey;
      
      const newRegion = {
        latitude: distanceOrigin.coordinates.latitude,
        longitude: distanceOrigin.coordinates.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      
      // Mark as programmatic move to prevent triggering onDistanceOriginChange
      isProgrammaticMoveRef.current = true;
      // Don't reset isUserDraggingRef here - let handleRegionChange detect if user interrupts
      
      // Animate to the new region
      mapRef.current.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
      setCurrentRegion(newRegion);
      
      // Reset programmatic flag after animation completes
      // But allow user to override by dragging
      const timeoutId = setTimeout(() => {
        // Only reset if user hasn't started dragging
        if (!isUserDraggingRef.current) {
          isProgrammaticMoveRef.current = false;
        }
      }, 1100); // Slightly longer than animation duration
      
      if (__DEV__) {
        console.log(
          '[MapDebug] Recentering map to distance origin:',
          distanceOrigin?.coordinates
        );
      }
      
      // Cleanup timeout on unmount or if distanceOrigin changes again
      return () => clearTimeout(timeoutId);
    } else if (!distanceOrigin) {
      // Clear the processed origin when distanceOrigin is cleared
      lastProcessedDistanceOriginRef.current = null;
    }
  }, [distanceOrigin]); // Removed currentRegion from dependencies to prevent loops

  // Update clusters when region changes (optimized to prevent flashing)
  useEffect(() => {
    // Don't try to cluster if MapView isn't available
    if (!MapView || markers.length === 0) {
      setClusters([]);
      return;
    }

    if (!enableClustering) {
      // Convert markers to cluster points for consistency - only when markers change
      const clusterPoints: ClusterPoint[] = markers.map((marker) => ({
        id: `marker-${marker.group.id}`,
        latitude: marker.coordinates.latitude,
        longitude: marker.coordinates.longitude,
        data: marker.group,
      }));
      setClusters(clusterPoints);
      return;
    }

    // Debounce cluster updates to prevent flashing during rapid zoom/pan
    // Use shorter delay to ensure updates happen quickly during cluster splits
    const timeoutId = setTimeout(() => {
      const rafId = requestAnimationFrame(() => {
        updateClusters();
      });
      return () => cancelAnimationFrame(rafId);
    }, 100); // Reduced from 150ms to 100ms for faster updates

    return () => clearTimeout(timeoutId);
  }, [currentRegion, markers, enableClustering, clusterer, updateClusters]);

  const initializeMap = async () => {
    // Safety check
    if (!MapView) {
      setIsLoadingLocation(false);
      return;
    }

    setIsLoadingLocation(true);

    try {
      if (__DEV__) {
        console.log(
          '[MapDebug] initializeMap start. groups:',
          groups?.length ?? 0
        );
      }
      const withTimeout = async <T,>(
        promise: Promise<T>,
        ms: number,
        label: string
      ): Promise<T | null> => {
        let timeoutId: any;
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => {
            if (__DEV__) {
              console.warn(`[MapDebug] ${label} timed out after ${ms}ms`);
            }
            resolve(null);
          }, ms);
        });

        const result = (await Promise.race([
          promise,
          timeoutPromise,
        ])) as T | null;
        clearTimeout(timeoutId);
        return result;
      };

      // Prioritize custom distance origin if provided (from location search)
      if (distanceOrigin?.coordinates) {
        setRegion({
          latitude: distanceOrigin.coordinates.latitude,
          longitude: distanceOrigin.coordinates.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
        setLocationPermissionDenied(false);
        if (__DEV__) {
          console.log(
            '[MapDebug] Using distance origin as initial region:',
            distanceOrigin.coordinates
          );
        }
      } else {
        // Check permission status first
        const permissionStatus = await locationService.getLocationPermissionStatus();
        
        if (!permissionStatus.granted) {
          setLocationPermissionDenied(true);
          if (__DEV__) {
            console.warn('[MapDebug] Location permission not granted');
          }
        } else {
          // Permission is granted, try to get location
          const currentLocation = await withTimeout(
            locationService.getCurrentLocation(),
            4000,
            'getCurrentLocation'
          );

          if (currentLocation) {
            setRegion({
              ...currentLocation,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            });
            setLocationPermissionDenied(false);
            if (__DEV__) {
              console.log(
                '[MapDebug] Using current location as initial region:',
                currentLocation
              );
            }
          } else {
            // Permission is granted but location is unavailable (GPS disabled, timeout, etc.)
            // Don't show the permission banner in this case
            setLocationPermissionDenied(false);
            if (__DEV__) {
              console.warn(
                '[MapDebug] Permission granted but location unavailable (GPS may be disabled). Using default region'
              );
            }
          }
        }
      }

      // Process groups to create markers
      await processGroupLocations();
    } catch (error) {
      console.error('Error initializing map:', error);
      setLocationPermissionDenied(true);
      await processGroupLocations();
    } finally {
      setIsLoadingLocation(false);
      if (__DEV__) {
        console.log(
          '[MapDebug] initializeMap complete. markers:',
          markers.length
        );
      }
    }
  };

  const processGroupLocations = async () => {
    // Safety check
    if (!MapView) {
      return;
    }

    const groupMarkers: GroupMarker[] = [];

    for (const group of groups) {
      const locationData = locationService.parseGroupLocation(group.location);

      let coordinates: Coordinates | null = null;

      // Use existing coordinates if available
      if (locationData.coordinates) {
        coordinates = locationData.coordinates;
      }
      // Otherwise try to geocode the address
      else if (locationData.address) {
        const start = Date.now();
        const addressLabel = locationData.address.slice(0, 60);
        try {
          const geocodeWithTimeout = async (): Promise<Coordinates | null> => {
            let timeoutId: any;
            const timeout = new Promise<null>((resolve) => {
              timeoutId = setTimeout(() => {
                if (__DEV__) {
                  console.warn(
                    '[MapDebug] geocodeAddress timed out:',
                    addressLabel
                  );
                }
                resolve(null);
              }, 3000);
            });
            const result = (await Promise.race([
              locationService.geocodeAddress(locationData.address as string),
              timeout,
            ])) as Coordinates | null;
            clearTimeout(timeoutId);
            return result;
          };
          coordinates = await geocodeWithTimeout();
        } finally {
          if (__DEV__) {
            console.log(
              '[MapDebug] geocodeAddress duration(ms):',
              Date.now() - start,
              addressLabel
            );
          }
        }
      }

      // Add marker if we have valid coordinates
      if (coordinates) {
        groupMarkers.push({
          group,
          coordinates,
          address: locationData.address,
        });
      }
    }

    setMarkers(groupMarkers);

    // Load markers into clusterer
    if (enableClustering && clusterer) {
      clusterer.load(groups);
    }

    // Fit map to show all markers and distance origin if available
    // When distanceOrigin is active, include it in the fit calculation
    // so the searched location stays visible even if it's far from groups
    if (mapRef.current) {
      const coordinatesToFit: { latitude: number; longitude: number }[] = [];

      // Include group markers
      if (groupMarkers.length > 0) {
        coordinatesToFit.push(
          ...groupMarkers.map((marker) => marker.coordinates)
        );
      }

      // Include distance origin coordinates if active
      // This ensures the searched location stays visible even if groups are far away
      if (distanceOrigin?.coordinates) {
        coordinatesToFit.push(distanceOrigin.coordinates);
      }

      // Only fit if we have coordinates to fit to
      // When distanceOrigin is active, always include it so it stays visible
      if (coordinatesToFit.length > 0) {
        setTimeout(() => {
          // Skip auto-fit if user is currently dragging (don't interrupt them)
          if (!isUserDraggingRef.current && mapRef.current) {
            mapRef.current.fitToCoordinates(coordinatesToFit, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }
        }, 1000);
      }
    }
  };

  const handleRequestLocationPermission = async () => {
    const permission = await locationService.requestLocationPermission();

    if (permission.granted) {
      setLocationPermissionDenied(false);
      initializeMap();
    } else if (!permission.canAskAgain) {
      Alert.alert(
        'Location Permission Required',
        'To show your location on the map, please enable location permissions in your device settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const getMarkerColor = useCallback(
    (category?: 'service' | 'church' | 'outside', isGreyedOut?: boolean) => {
      if (!category) return '#FF0083'; // Default primary color
      
      // For greyed out markers, use a darker/desaturated version, but keep outside groups dark
      if (isGreyedOut && category !== 'outside') {
        // Return a darker version for greyed out non-outside groups
      switch (category) {
        case 'service':
            return '#cc0067'; // Darker pink
        case 'church':
            return '#6b184c'; // Darker blend
          default:
            return '#FF0083';
        }
      }
      
      switch (category) {
        case 'service':
          return '#FF0083'; // Primary pink color
        case 'church':
          return '#96115c'; // Blend of pink (#ff0083) and dark (#2C2235) - 50% pink, 50% dark (darker)
        case 'outside':
          return '#2C2235'; // Dark color (always use dark, never grey)
        default:
          return '#FF0083';
      }
    },
    []
  );

  /**
   * Get coordinate offset for a category to prevent overlapping markers
   * Offsets are applied in a circular pattern around the original point
   * Offset is proportional to viewport size for consistent visual separation
   */
  const getCategoryOffset = useCallback(
    (category?: 'service' | 'church' | 'outside') => {
      if (!category) return { latOffset: 0, lngOffset: 0 };
      
      // Make offset proportional to the current viewport (4% of latitudeDelta)
      // This ensures markers are always visibly separated regardless of zoom level
      const baseOffset = currentRegion.latitudeDelta * 0.04;
      
      switch (category) {
        case 'service':
          // No offset for primary category (center position)
          return { latOffset: 0, lngOffset: 0 };
        case 'church':
          // Offset to the right (0°)
          return { latOffset: 0, lngOffset: baseOffset };
        case 'outside':
          // Offset to the bottom-left (240°)
          return {
            latOffset: -baseOffset * 0.866,
            lngOffset: -baseOffset * 0.5,
          };
        default:
          return { latOffset: 0, lngOffset: 0 };
      }
    },
    [currentRegion.latitudeDelta]
  );

  const handleRecenter = useCallback(async () => {
    try {
      if (!MapView || !mapRef.current) return;

      const currentLocation = await locationService.getCurrentLocation();
      if (!currentLocation) {
        // If location is unavailable, try requesting permission
        const permission = await locationService.requestLocationPermission();
        if (permission.granted) {
          const location = await locationService.getCurrentLocation();
          if (!location) return;
          const newRegion = {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          };
          mapRef.current.animateToRegion(newRegion, 600);
          setRegion(newRegion);
          setCurrentRegion(newRegion);
          setLocationPermissionDenied(false);
        }
        return;
      }

      const newRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };

      mapRef.current.animateToRegion(newRegion, 600);
      setRegion(newRegion);
      setCurrentRegion(newRegion);
      setLocationPermissionDenied(false);

      if (__DEV__) {
        console.log(
          '[MapDebug] Recentered map to current location:',
          currentLocation
        );
      }
    } catch (error) {
      console.warn('Recenter failed:', error);
    }
  }, []);

  const renderGroupMarker = useCallback(
    (point: ClusterPoint, _index: number) => {
      const { data: group, latitude, longitude, category } = point;
      const isActive = activeGroupId === group.id;
      const isGreyedOut = Boolean((group as any).__isGreyedOut);
      // Pass isGreyedOut to getMarkerColor so it can return appropriate color
      const markerColor = getMarkerColor(category, isGreyedOut);
      
      // Apply category-based offset to prevent overlap
      const offset = getCategoryOffset(category);
      const adjustedLatitude = latitude + offset.latOffset;
      const adjustedLongitude = longitude + offset.lngOffset;
      
      if (__DEV__ && Math.abs(offset.latOffset) > 0 || Math.abs(offset.lngOffset) > 0) {
        console.log(
          `[MapDebug] Marker offset for ${category}: lat ${offset.latOffset.toFixed(6)}, lng ${offset.lngOffset.toFixed(6)}`
        );
      }

      return (
        <Marker
          key={`group-${group.id}`}
          coordinate={{ latitude: adjustedLatitude, longitude: adjustedLongitude }}
          tracksViewChanges={shouldTrackViewChanges}
          onPress={() => {
            setSelectedItems([group]);
            setSelectedIndex(0);
          }}
          accessibilityLabel={AdminAccessibilityLabels.mapMarker(
            group.title,
            group.member_count || 0
          )}
          accessibilityHint="Double tap to view group details"
          accessibilityRole="button"
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={[
              styles.markerBubble,
              { backgroundColor: markerColor },
              isActive && styles.markerBubbleActive,
              // Don't apply grey style - color is already handled in getMarkerColor
            ]}
          >
            <Ionicons name="people" size={16} color="#ffffff" />
          </View>
        </Marker>
      );
    },
    [activeGroupId, shouldTrackViewChanges, getMarkerColor, getCategoryOffset]
  );

  const renderClusterMarker = useCallback(
    (cluster: Cluster, _index: number) => {
      const { size } = getClusterVisuals(cluster.count);
      const digitCount = `${cluster.count}`.length;
      const fontSize = digitCount === 1 ? 16 : digitCount === 2 ? 14 : 12;
      
      // Use category color for cluster (clusters are never greyed out)
      const clusterColor = getMarkerColor(cluster.category, false);
      
      // Apply category-based offset to prevent overlap with other category clusters
      const offset = getCategoryOffset(cluster.category);
      const adjustedLatitude = cluster.coordinates.latitude + offset.latOffset;
      const adjustedLongitude = cluster.coordinates.longitude + offset.lngOffset;
      
      if (__DEV__ && (Math.abs(offset.latOffset) > 0 || Math.abs(offset.lngOffset) > 0)) {
        console.log(
          `[MapDebug] Cluster offset for ${cluster.category} (${cluster.count} groups): lat ${offset.latOffset.toFixed(6)}, lng ${offset.lngOffset.toFixed(6)}`
        );
      }

      return (
        <Marker
          key={`cluster-${cluster.id}`}
          coordinate={{ latitude: adjustedLatitude, longitude: adjustedLongitude }}
          accessibilityLabel={AdminAccessibilityLabels.clusterMarker(
            cluster.count
          )}
          tracksViewChanges={shouldTrackViewChanges}
          accessibilityHint="Double tap to view groups in this area"
          accessibilityRole="button"
          onPress={() => {
            // Show swipeable cards for groups within this cluster
            const items = cluster.points.map((p) => p.data);
            setSelectedItems(items);
            setSelectedIndex(0);
            ScreenReaderUtils.announceForAccessibility(
              `Showing ${cluster.count} groups in this area`
            );

            // Center and zoom on the cluster, positioning it in the top half
            // Use the original coordinates (not offset) for centering
            if (mapRef.current) {
              // Calculate offset to position cluster in top half of screen
              const { height } = Dimensions.get('window');
              const cardPanelHeight = 200; // Approximate height of card panel
              const topHalfOffset = (height - cardPanelHeight) / 4; // Position in upper quarter

              // Adjust offset based on zoom level (0.05 delta)
              const latitudeOffset = (topHalfOffset / height) * 0.05;

              mapRef.current.animateToRegion(
                {
                  latitude: cluster.coordinates.latitude - latitudeOffset,
                  longitude: cluster.coordinates.longitude,
                  latitudeDelta: 0.05, // Less zoom - higher values = more zoomed out
                  longitudeDelta: 0.05,
                },
                1000
              ); // 1 second animation
            }
          }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={[
              styles.clusterBubble,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: clusterColor,
              },
            ]}
          >
            <Text style={[styles.clusterCount, { fontSize }]}>
              {cluster.count}
            </Text>
          </View>
        </Marker>
      );
    },
    [shouldTrackViewChanges, getMarkerColor, getCategoryOffset]
  );

  const renderMarker = useCallback(
    (item: ClusterPoint | Cluster, index: number) => {
      const isCluster = 'count' in item && item.count > 1;

      if (isCluster) {
        return renderClusterMarker(item as Cluster, index);
      }

      return renderGroupMarker(item as ClusterPoint, index);
    },
    [renderClusterMarker, renderGroupMarker]
  );

  const handleRegionChangeComplete = useCallback(
    async (newRegion: typeof DEFAULT_REGION) => {
      // Only update if there's a significant change to prevent excessive re-clustering
      if (MapViewportOptimizer.hasSignificantChange(currentRegion, newRegion)) {
        setCurrentRegion(newRegion);
      }

      // If this was a programmatic move AND user wasn't dragging, just reset flags and return
      // If user was dragging, it means they interrupted the programmatic move, so process it
      if (isProgrammaticMoveRef.current && !isUserDraggingRef.current) {
        // Pure programmatic move - don't process as user drag
        return;
      }
      
      // If we get here and programmatic flag is set but user was dragging,
      // clear the programmatic flag since user took control
      if (isProgrammaticMoveRef.current) {
        isProgrammaticMoveRef.current = false;
      }

      // Don't update distance origin when map is dragged/zoomed
      // The marker should only move when:
      // 1. User drags the marker itself (handled in onDragEnd)
      // 2. Address is changed in search bar (handled in parent component)
      
      // Reset dragging flag after processing (with a small delay to allow reverse geocoding to complete)
      // Only reset if we actually detected and processed a drag
      if (isUserDraggingRef.current && !isProgrammaticMoveRef.current) {
        // Reset after a brief delay to ensure all processing completes
        setTimeout(() => {
          isUserDraggingRef.current = false;
        }, 100);
      }
    },
    [currentRegion, onDistanceOriginChange, distanceOrigin]
  );

  const handleRegionChange = useCallback(
    (newRegion: typeof DEFAULT_REGION) => {
      const latDiff = Math.abs(newRegion.latitude - currentRegion.latitude);
      const lonDiff = Math.abs(newRegion.longitude - currentRegion.longitude);

      // Ignore programmatic moves (like fitToCoordinates/animateToRegion) so we don't
      // misinterpret them as user drags and overwrite the selected search origin
      if (isProgrammaticMoveRef.current && !isUserDraggingRef.current) {
        if (MapViewportOptimizer.hasSignificantChange(currentRegion, newRegion)) {
          setCurrentRegion(newRegion);
        }
        return;
      }

      // If there's any change in position (not just zoom), detect user drag
      // This fires frequently during dragging, so be careful about performance
      if (latDiff > 0.00001 || lonDiff > 0.00001) {
        // User is actively dragging - clear programmatic flag immediately
        // This ensures user drags are always detected, even during programmatic moves
        isProgrammaticMoveRef.current = false;
        isUserDraggingRef.current = true;
        
        // Always update region when user is dragging to track position accurately
        setCurrentRegion(newRegion);
      } else if (MapViewportOptimizer.hasSignificantChange(currentRegion, newRegion)) {
        // Only update region for other changes if there's a meaningful difference
        setCurrentRegion(newRegion);
      }
    },
    [currentRegion]
  );

  // Check if MapView is available after all hooks
  if (!MapView) {
    return (
      <View style={styles.container}>
        <MapViewFallback
          message="Map view requires native modules. Use a development build to see groups on the map."
          height={height}
        />
      </View>
    );
  }

  if (isLoading || isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={[
          {
            elementType: 'geometry',
            stylers: [
              {
                color: '#FFFBEE', // Light cream color
              },
            ],
          },
          {
            elementType: 'labels.icon',
            stylers: [
              {
                visibility: 'off',
              },
            ],
          },
          {
            elementType: 'labels.text.fill',
            stylers: [
              {
                color: '#616161',
              },
            ],
          },
          {
            elementType: 'labels.text.stroke',
            stylers: [
              {
                color: '#f5f5f5',
              },
            ],
          },
          {
            featureType: 'administrative.land_parcel',
            elementType: 'labels.text.fill',
            stylers: [
              {
                color: '#bdbdbd',
              },
            ],
          },
          {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [
              {
                color: '#eeeeee',
              },
            ],
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [
              {
                color: '#757575',
              },
            ],
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [
              {
                color: '#ffe8f2',
              },
            ],
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [
              {
                color: '#9e9e9e',
              },
            ],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [
              {
                color: '#f5f5f5', // Light gray for roads
              },
            ],
          },
          {
            featureType: 'road.arterial',
            elementType: 'labels.text.fill',
            stylers: [
              {
                color: '#757575',
              },
            ],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [
              {
                color: '#dadada',
              },
            ],
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [
              {
                color: '#616161',
              },
            ],
          },
          {
            featureType: 'road.local',
            elementType: 'labels.text.fill',
            stylers: [
              {
                color: '#9e9e9e',
              },
            ],
          },
          {
            featureType: 'transit.line',
            elementType: 'geometry',
            stylers: [
              {
                color: '#e5e5e5',
              },
            ],
          },
          {
            featureType: 'transit.station',
            elementType: 'geometry',
            stylers: [
              {
                color: '#eeeeee',
              },
            ],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [
              {
                color: '#e8f4f8', // Light blue-gray for water
              },
            ],
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [
              {
                color: '#9e9e9e',
              },
            ],
          },
        ]}
        initialRegion={region}
        showsUserLocation={!locationPermissionDenied}
        showsMyLocationButton={Platform.OS === 'android' && !locationPermissionDenied}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => {
          // On iOS, MapView onPress can fire alongside Marker onPress,
          // which immediately clears the selected card panel.
          // Preserve background-tap-to-dismiss on Android only.
          if (Platform.OS === 'android') {
            setSelectedItems(null);
          }
        }}
        moveOnMarkerPress={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        accessibilityLabel={`Map showing ${markers.length} groups`}
        accessibilityHint="Interactive map with group locations. Use list view for better accessibility."
      >
        {clusters.map(renderMarker)}
        {/* Marker for searched location (distance origin) */}
        {distanceOrigin?.coordinates && Marker && (
          <Marker
            key={`distance-origin-${distanceOrigin.coordinates.latitude}-${distanceOrigin.coordinates.longitude}`}
            coordinate={{
              latitude: distanceOrigin.coordinates.latitude,
              longitude: distanceOrigin.coordinates.longitude,
            }}
            title={distanceOrigin.address || 'Search location'}
            pinColor="#ff0083"
            tracksViewChanges={false}
            draggable={true}
            onDragEnd={async (e) => {
              const newCoordinates = e.nativeEvent.coordinate;
              try {
                // Reverse geocode to get the address for the new location
                const address = await locationService.reverseGeocode(newCoordinates);
                
                // Update the distance origin with the new location immediately
                if (onDistanceOriginChange) {
                  onDistanceOriginChange({
                    coordinates: newCoordinates,
                    address: address?.formattedAddress || undefined,
                  });
                }
              } catch (error) {
                console.warn('Failed to reverse geocode marker position:', error);
                // Still update coordinates even if reverse geocoding fails
                if (onDistanceOriginChange) {
                  onDistanceOriginChange({
                    coordinates: newCoordinates,
                    address: distanceOrigin.address, // Keep existing address if geocoding fails
                  });
                }
              }
            }}
          />
        )}
      </MapView>

      {selectedItems && selectedItems.length > 0 && (
        <View style={styles.cardPanel}>
          <View style={styles.cardPanelHeader}>
            <View style={styles.cardCounterOverlay}>
              <Text style={styles.cardPanelTitle}>
                {selectedItems.length > 1
                  ? `${selectedIndex + 1} of ${selectedItems.length}`
                  : 'Group'}
              </Text>
            </View>
            {selectedItems.length > 1 && (
              <View style={styles.dotsOverlay}>
                <View style={styles.dotsContainer}>
                  {selectedItems.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i === selectedIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setSelectedItems(null)}
              accessibilityLabel="Close group preview"
              accessibilityRole="button"
              style={styles.closeButtonOverlay}
            >
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(
                e.nativeEvent.contentOffset.x /
                  Math.max(1, e.nativeEvent.layoutMeasurement.width)
              );
              setSelectedIndex(
                Math.min(Math.max(page, 0), selectedItems.length - 1)
              );
            }}
          >
            {selectedItems.map((g) => (
              <GroupCardWithData
                key={g.id}
                group={g}
                onPress={() => onGroupPress(g)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Accessibility alternative removed: list locations button no longer shown */}

      {locationPermissionDenied && (
        <View style={[
          styles.permissionBanner,
          Platform.OS === 'android' && styles.permissionBannerAndroid
        ]}>
          {Platform.OS === 'android' ? (
            <Button
              title="Enable Location"
              onPress={handleRequestLocationPermission}
              variant="secondary"
              size="small"
            />
          ) : (
            <>
              <Text style={styles.permissionText}>
                Enable location to see your position on the map
              </Text>
              <Button
                title="Enable Location"
                onPress={handleRequestLocationPermission}
                variant="secondary"
                size="small"
              />
            </>
          )}
        </View>
      )}

      {markers.length === 0 && !isLoading && (
        <View style={styles.noMarkersContainer}>
          <Text style={styles.noMarkersText}>
            No groups with valid locations found
          </Text>
          <Text style={styles.noMarkersSubtext}>
            Groups need addresses to appear on the map
          </Text>
        </View>
      )}

      {/* No Group Fits Button */}
      {onNoGroupFits && (
        <View
          style={[
            styles.noGroupFitsButtonFloating,
            Platform.OS === 'ios'
              ? {
                  top: locationPermissionDenied
                    ? 88 + insets.top
                    : -50 + insets.top,
                }
              : {
                  top: locationPermissionDenied ? 88 : 8, // Android: match list view styling
                },
          ]}
        >
          <View style={styles.noGroupFitsButtonContainer}>
            <Button
              title="No group fits?"
              onPress={onNoGroupFits}
              variant="secondary"
              size="small"
              style={styles.noGroupFitsButton}
              textStyle={styles.noGroupFitsButtonText}
            />
          </View>
        </View>
      )}

      {/* Custom Recenter Button - Always visible on iOS, Android uses native button */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
          accessibilityLabel="Recenter map on current location"
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          <Ionicons name="locate-outline" size={18} color="#2C2235" />
        </TouchableOpacity>
      )}

      {/* Development performance info removed */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  markerBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff0083', // Primary brand pink
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerBubbleActive: {
    backgroundColor: '#f472b6', // Lighter pink for active state
  },
  markerBubbleGrey: {
    backgroundColor: '#6b7280', // Slate gray for external groups
  },
  calloutContainer: {
    width: 250,
    padding: 12,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  calloutDetails: {
    marginBottom: 8,
  },
  calloutDetailText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  calloutAction: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  permissionBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  permissionBannerAndroid: {
    justifyContent: 'center',
    padding: 8,
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  noMarkersContainer: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noMarkersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  noMarkersSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  clusterBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterCount: {
    color: '#ffffff',
    fontWeight: '700',
  },
  clusterCallout: {
    width: 150,
    padding: 8,
    alignItems: 'center',
  },
  clusterCalloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  clusterCalloutText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  performanceInfo: {
    // removed
  },
  performanceText: {
    // removed
  },
  cardPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 8,
    paddingBottom: 66, // Same as horizontal card margins
    backgroundColor: 'transparent',
  },
  cardPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  cardPanelTitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  cardCounterOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  closeButtonOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapGroupCard: {
    width: width - 32,
    marginHorizontal: 16,
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
    paddingHorizontal: 10,
    maxWidth: 120, // Compact width to match the drawn outline
    backgroundColor: '#2C2235', // Match friends badge color
    borderColor: '#2C2235',
  },
  noGroupFitsButtonText: {
    color: '#FFFFFF', // Ensure white text on dark purple background
  },
  dotsOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: '#d1d5db',
  },
  dotActive: {
    backgroundColor: '#111827',
  },
  recenterButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  accessibilityAlternative: {
    // removed
  },
  accessibilityButton: {
    // removed
  },
  accessibilityButtonText: {
    // removed
  },
});
