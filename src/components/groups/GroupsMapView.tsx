import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { locationService, Coordinates } from '../../services/location';
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

export const GroupsMapView: React.FC<GroupsMapViewProps> = ({
  groups,
  onGroupPress,
  isLoading = false,
}) => {
  const [markers, setMarkers] = useState<GroupMarker[]>([]);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Initialize map region and process group locations
  useEffect(() => {
    initializeMap();
  }, [groups]);

  const initializeMap = async () => {
    setIsLoadingLocation(true);
    
    try {
      // Try to get user's current location for initial region
      const currentLocation = await locationService.getCurrentLocation();
      
      if (currentLocation) {
        setRegion({
          ...currentLocation,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
        setLocationPermissionDenied(false);
      } else {
        setLocationPermissionDenied(true);
      }

      // Process groups to create markers
      await processGroupLocations();
    } catch (error) {
      console.error('Error initializing map:', error);
      setLocationPermissionDenied(true);
      await processGroupLocations();
    } finally {
      setIsLoadingLocation(false);
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
        coordinates = await locationService.geocodeAddress(locationData.address);
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

    // Fit map to show all markers if we have any
    if (groupMarkers.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          groupMarkers.map(marker => marker.coordinates),
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

  const renderMarker = (marker: GroupMarker) => {
    const { group, coordinates } = marker;
    
    return (
      <Marker
        key={group.id}
        coordinate={coordinates}
        title={group.title}
        description={group.description}
      >
        <View style={styles.markerContainer}>
          <View style={styles.marker}>
            <Text style={styles.markerText}>📖</Text>
          </View>
        </View>
        <Callout onPress={() => onGroupPress(group)}>
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutTitle} numberOfLines={2}>
              {group.title}
            </Text>
            <Text style={styles.calloutDescription} numberOfLines={3}>
              {group.description}
            </Text>
            <View style={styles.calloutDetails}>
              <Text style={styles.calloutDetailText}>
                📅 {group.meeting_day} at {group.meeting_time}
              </Text>
              {marker.address && (
                <Text style={styles.calloutDetailText} numberOfLines={2}>
                  📍 {marker.address}
                </Text>
              )}
            </View>
            <Text style={styles.calloutAction}>Tap to view details</Text>
          </View>
        </Callout>
      </Marker>
    );
  };

  if (isLoading || isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={!locationPermissionDenied}
        showsMyLocationButton={!locationPermissionDenied}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
      >
        {markers.map(renderMarker)}
      </MapView>

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
});