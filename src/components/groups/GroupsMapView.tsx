import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  AccessibilityHelpers, 
  AdminAccessibilityLabels, 
  ScreenReaderUtils 
} from '@/utils/accessibility';
import MapView, { Marker, Callout, Region, PROVIDER_GOOGLE } from 'react-native-maps';
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

export const GroupsMapView: React.FC<ClusteredMapViewProps> = ({
  groups,
  onGroupPress,
  isLoading = false,
  enableClustering = true,
  clusterRadius = 40,
  minClusterSize = 2,
}) => {
  const [markers, setMarkers] = useState<GroupMarker[]>([]);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [currentRegion, setCurrentRegion] = useState<Region>(DEFAULT_REGION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [clusters, setClusters] = useState<(Cluster | ClusterPoint)[]>([]);
  const mapRef = useRef<MapView>(null);
  
  // Create clusterer instance
  const clusterer = useMemo(() => 
    new MapClusterer({ 
      radius: clusterRadius,
      minZoom: 0,
      maxZoom: 16,
    }), 
    [clusterRadius]
  );

  // Initialize map region and process group locations
  useEffect(() => {
    initializeMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  // Update clusters when region changes (with debouncing)
  useEffect(() => {
    if (!enableClustering || markers.length === 0) {
      setClusters(markers);
      return;
    }

    const timeoutId = setTimeout(() => {
      updateClusters();
    }, 300); // Debounce cluster updates

    return () => clearTimeout(timeoutId);
  }, [currentRegion, markers, enableClustering, clusterer]);

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

  const updateClusters = () => {
    if (!enableClustering) return;

    const endClustering = MapPerformanceMonitor.startClustering();
    
    try {
      const bounds = MapViewportOptimizer.getOptimalBounds(currentRegion);
      const zoom = MapViewportOptimizer.getZoomLevel(currentRegion.latitudeDelta);
      const newClusters = clusterer.getClusters(bounds, zoom);
      
      setClusters(newClusters);
      MapPerformanceMonitor.recordPointCount(newClusters.length);
    } finally {
      endClustering();
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

  const renderMarker = (item: ClusterPoint | Cluster, index: number) => {
    const isCluster = 'count' in item && item.count > 1;
    
    if (isCluster) {
      return renderClusterMarker(item as Cluster, index);
    } else {
      return renderGroupMarker(item as ClusterPoint, index);
    }
  };

  const renderGroupMarker = (point: ClusterPoint, index: number) => {
    const { data: group, latitude, longitude } = point;
    
    return (
      <Marker
        key={`group-${group.id}-${index}`}
        coordinate={{ latitude, longitude }}
        title={group.title}
        description={group.description}
        accessibilityLabel={AdminAccessibilityLabels.mapMarker(group.title, group.member_count || 0)}
        accessibilityHint="Double tap to view group details"
        accessibilityRole="button"
      >
        <View style={styles.markerContainer}>
          <View 
            style={styles.marker}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.markerText}>📖</Text>
          </View>
        </View>
        <Callout 
          onPress={() => {
            onGroupPress(group);
            ScreenReaderUtils.announceForAccessibility(`Opening details for ${group.title}`);
          }}
          accessibilityLabel={`Group details for ${group.title}`}
          accessibilityHint="Double tap to view full group details"
        >
          <View style={styles.calloutContainer}>
            <Text 
              style={styles.calloutTitle} 
              numberOfLines={2}
              accessibilityRole="header"
              accessibilityLevel={3}
            >
              {group.title}
            </Text>
            <Text 
              style={styles.calloutDescription} 
              numberOfLines={3}
              accessibilityLabel={`Description: ${group.description}`}
            >
              {group.description}
            </Text>
            <View 
              style={styles.calloutDetails}
              accessibilityRole="text"
              accessibilityLabel={`Meeting: ${group.meeting_day} at ${group.meeting_time}${
                group.location ? `, Location: ${typeof group.location === 'string' ? group.location : group.location.address}` : ''
              }`}
            >
              <Text style={styles.calloutDetailText}>
                📅 {group.meeting_day} at {group.meeting_time}
              </Text>
              {group.location && (
                <Text style={styles.calloutDetailText} numberOfLines={2}>
                  📍 {typeof group.location === 'string' ? group.location : group.location.address}
                </Text>
              )}
            </View>
            <Text 
              style={styles.calloutAction}
              accessibilityLabel="Tap to view full details"
            >
              Tap to view details
            </Text>
          </View>
        </Callout>
      </Marker>
    );
  };

  const renderClusterMarker = (cluster: Cluster, index: number) => {
    return (
      <Marker
        key={`cluster-${cluster.id}-${index}`}
        coordinate={cluster.coordinates}
        accessibilityLabel={AdminAccessibilityLabels.clusterMarker(cluster.count)}
        accessibilityHint="Double tap to zoom in and see individual groups"
        accessibilityRole="button"
        onPress={() => {
          // Zoom into cluster
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              ...cluster.coordinates,
              latitudeDelta: currentRegion.latitudeDelta * 0.5,
              longitudeDelta: currentRegion.longitudeDelta * 0.5,
            });
            ScreenReaderUtils.announceForAccessibility(`Zooming in to show ${cluster.count} groups`);
          }
        }}
      >
        <View style={styles.clusterContainer}>
          <View 
            style={[styles.clusterMarker, { 
              backgroundColor: cluster.count > 10 ? '#d32f2f' : '#007AFF' 
            }]}
            accessibilityElementsHidden={true}
          >
            <Text style={styles.clusterText}>{cluster.count}</Text>
          </View>
        </View>
        <Callout
          accessibilityLabel={`Cluster of ${cluster.count} groups`}
          accessibilityHint="Double tap marker to zoom in"
        >
          <View style={styles.clusterCallout}>
            <Text 
              style={styles.clusterCalloutTitle}
              accessibilityRole="header"
            >
              {cluster.count} Groups
            </Text>
            <Text style={styles.clusterCalloutText}>
              Tap marker to zoom in
            </Text>
          </View>
        </Callout>
      </Marker>
    );
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    // Only update if there's a significant change
    if (MapViewportOptimizer.hasSignificantChange(currentRegion, newRegion)) {
      setCurrentRegion(newRegion);
    }
  };

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
        initialRegion={region}
        showsUserLocation={!locationPermissionDenied}
        showsMyLocationButton={!locationPermissionDenied}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
        onRegionChangeComplete={handleRegionChangeComplete}
        moveOnMarkerPress={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        accessibilityLabel={`Map showing ${markers.length} groups`}
        accessibilityHint="Interactive map with group locations. Use list view for better accessibility."
      >
        {(enableClustering ? clusters : markers).map(renderMarker)}
      </MapView>

      {/* Accessibility alternative - List of locations */}
      <View style={styles.accessibilityAlternative}>
        <TouchableOpacity
          style={styles.accessibilityButton}
          onPress={() => {
            Alert.alert(
              'Map Locations',
              `This map shows ${markers.length} groups:\n\n${markers.map(marker => 
                `• ${marker.group.title} - ${marker.address || 'Location available'}`
              ).join('\n')}`,
              [{ text: 'OK' }]
            );
          }}
          {...AccessibilityHelpers.createButtonProps(
            'View map locations as text',
            'Double tap to hear all group locations'
          )}
        >
          <Text style={styles.accessibilityButtonText}>📍 List Locations</Text>
        </TouchableOpacity>
      </View>

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

      {/* Performance info in development */}
      {__DEV__ && (
        <View style={styles.performanceInfo}>
          <Text style={styles.performanceText}>
            Points: {markers.length} | Visible: {clusters.length}
          </Text>
        </View>
      )}
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
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    fontSize: 18,
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
  clusterContainer: {
    alignItems: 'center',
  },
  clusterMarker: {
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clusterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
  },
  performanceText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  accessibilityAlternative: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  accessibilityButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accessibilityButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
