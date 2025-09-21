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
} from 'react-native';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  AdminAccessibilityLabels,
  ScreenReaderUtils,
} from '@/utils/accessibility';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { locationService, Coordinates } from '../../services/location';
import {
  MapClusterer,
  MapViewportOptimizer,
  MapPerformanceMonitor,
  type Cluster,
  type ClusterPoint,
} from '../../utils/mapClustering';
import { Button } from '../ui';
import type { GroupWithDetails } from '../../types/database';

interface GroupsMapViewProps {
  groups: GroupWithDetails[];
  onGroupPress: (group: GroupWithDetails) => void;
  isLoading?: boolean;
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
}

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Default region (centered on a general area)
const DEFAULT_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
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
      bubbleColor: '#f10078', // Primary brand pink
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

export const GroupsMapView: React.FC<ClusteredMapViewProps> = ({
  groups,
  onGroupPress,
  isLoading = false,
  enableClustering = true, // Re-enabled with optimizations
  clusterRadius = 40,
  minClusterSize = 2,
}) => {
  const [markers, setMarkers] = useState<GroupMarker[]>([]);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [currentRegion, setCurrentRegion] = useState<Region>(DEFAULT_REGION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);
  const [clusters, setClusters] = useState<(Cluster | ClusterPoint)[]>([]);
  const mapRef = useRef<MapView>(null);
  const isUpdatingClusters = useRef(false);
  const viewTrackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [shouldTrackViewChanges, setShouldTrackViewChanges] = useState(true);

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

  // Create clusterer instance
  const clusterer = useMemo(
    () =>
      new MapClusterer({
        radius: clusterRadius,
        minZoom: 0,
        maxZoom: 16,
      }),
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
    if (!enableClustering || isUpdatingClusters.current) return;

    isUpdatingClusters.current = true;
    const endClustering = MapPerformanceMonitor.startClustering();

    try {
      const bounds = MapViewportOptimizer.getOptimalBounds(currentRegion);
      const zoom = MapViewportOptimizer.getZoomLevel(
        currentRegion.latitudeDelta
      );
      const newClusters = clusterer.getClusters(bounds, zoom);

      // Only update if clusters actually changed to prevent unnecessary re-renders
      setClusters((prevClusters) => {
        if (prevClusters.length !== newClusters.length) {
          return newClusters;
        }

        // Detect meaningful identity or position changes before updating state
        const hasSignificantChange = newClusters.some((nextCluster, index) => {
          const prevCluster = prevClusters[index];

          if (!prevCluster || prevCluster.id !== nextCluster.id) {
            return true;
          }

          return hasPositionChanged(prevCluster, nextCluster);
        });

        return hasSignificantChange ? newClusters : prevClusters;
      });

      MapPerformanceMonitor.recordPointCount(newClusters.length);
    } finally {
      endClustering();
      isUpdatingClusters.current = false;
    }
  }, [enableClustering, currentRegion, clusterer, hasPositionChanged]);

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

  // Initialize map region and process group locations
  useEffect(() => {
    initializeMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  // Update clusters when region changes (optimized to prevent flashing)
  useEffect(() => {
    if (markers.length === 0) {
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
    const timeoutId = setTimeout(() => {
      const rafId = requestAnimationFrame(() => {
        updateClusters();
      });
      return () => cancelAnimationFrame(rafId);
    }, 150); // 150ms debounce

    return () => clearTimeout(timeoutId);
  }, [currentRegion, markers, enableClustering, clusterer, updateClusters]);

  const initializeMap = async () => {
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

      // Try to get user's current location for initial region
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
        setLocationPermissionDenied(true);
        if (__DEV__) {
          console.warn(
            '[MapDebug] No current location available (denied or timed out). Using default region'
          );
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
    if (enableClustering) {
      clusterer.load(groups);
    }

    // Fit map to show all markers if we have any
    if (groupMarkers.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          groupMarkers.map((marker) => marker.coordinates),
          {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          }
        );
      }, 1000);
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

  const renderGroupMarker = useCallback(
    (point: ClusterPoint, _index: number) => {
      const { data: group, latitude, longitude } = point;
      const isActive = activeGroupId === group.id;

      return (
        <Marker
          key={`group-${group.id}`}
          coordinate={{ latitude, longitude }}
          title={group.title}
          description={group.description}
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
            style={[styles.markerBubble, isActive && styles.markerBubbleActive]}
          >
            <Ionicons name="people" size={16} color="#ffffff" />
          </View>
        </Marker>
      );
    },
    [activeGroupId, shouldTrackViewChanges]
  );

  const renderClusterMarker = useCallback(
    (cluster: Cluster, _index: number) => {
      const { size, bubbleColor } = getClusterVisuals(cluster.count);
      const digitCount = `${cluster.count}`.length;
      const fontSize = digitCount === 1 ? 16 : digitCount === 2 ? 14 : 12;

      return (
        <Marker
          key={`cluster-${cluster.id}`}
          coordinate={cluster.coordinates}
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
                backgroundColor: bubbleColor,
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
    [shouldTrackViewChanges]
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
    (newRegion: Region) => {
      // Only update if there's a significant change to prevent excessive re-clustering
      if (MapViewportOptimizer.hasSignificantChange(currentRegion, newRegion)) {
        setCurrentRegion(newRegion);
      }
    },
    [currentRegion]
  );

  const handleRegionChange = useCallback(
    (newRegion: Region) => {
      // Only update if there's a meaningful change to prevent excessive updates
      if (MapViewportOptimizer.hasSignificantChange(currentRegion, newRegion)) {
        setCurrentRegion(newRegion);
      }
    },
    [currentRegion]
  );

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
                color: '#f5f5f5',
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
                color: '#e5e5e5',
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
                color: '#ffffff',
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
                color: '#c9c9c9',
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
        showsMyLocationButton={!locationPermissionDenied}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => setSelectedItems(null)}
        moveOnMarkerPress={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        accessibilityLabel={`Map showing ${markers.length} groups`}
        accessibilityHint="Interactive map with group locations. Use list view for better accessibility."
      >
        {clusters.map(renderMarker)}
      </MapView>

      {selectedItems && selectedItems.length > 0 && (
        <View style={styles.cardPanel}>
          <View style={styles.cardPanelHeader}>
            <Text style={styles.cardPanelTitle}>
              {selectedItems.length > 1
                ? `${selectedIndex + 1} of ${selectedItems.length}`
                : 'Group'}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedItems(null)}
              accessibilityLabel="Close group preview"
              accessibilityRole="button"
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
              <View key={g.id} style={styles.card}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {g.title}
                </Text>
                {g.location && (
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {typeof g.location === 'string'
                      ? g.location
                      : g.location.address}
                  </Text>
                )}
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {g.description}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Ionicons name="time-outline" size={14} color="#6b7280" />
                  <Text style={styles.cardMetaText}>
                    {g.meeting_day} • {g.meeting_time}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => onGroupPress(g)}
                    accessibilityLabel={`View details for ${g.title}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.viewButtonText}>View Group</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          {selectedItems.length > 1 && (
            <View style={styles.dotsContainer}>
              {selectedItems.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === selectedIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Accessibility alternative removed: list locations button no longer shown */}

      {locationPermissionDenied && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Enable location to see your position on the map
          </Text>
          <Button
            title="Enable Location"
            onPress={handleRequestLocationPermission}
            variant="secondary"
            size="small"
          />
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
    backgroundColor: '#f10078', // Primary brand pink
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f10078',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerBubbleActive: {
    backgroundColor: '#f472b6', // Lighter pink for active state
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
    paddingBottom: 100, // Add space for bottom navbar
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
  card: {
    width: width - 32,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: '#374151',
    marginTop: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  cardActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f10078', // Primary brand pink
    borderRadius: 20, // More rounded sides
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
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
