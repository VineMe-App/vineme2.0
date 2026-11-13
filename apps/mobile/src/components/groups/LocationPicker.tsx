import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { GOOGLE_MAPS_MAP_ID } from '@/utils/constants';
import { Input, Button } from '../ui';
import { AuthButton } from '@/components/auth/AuthButton';
import { locationService, type Coordinates } from '../../services/location';
import { MapViewFallback } from './MapViewFallback';
import { Ionicons } from '@expo/vector-icons';

// Dynamically import MapView - not available in Expo Go or on web
// Using Platform check and try-catch to gracefully handle when the module isn't available
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
      '[LocationPicker] react-native-maps not available - using fallback'
    );
  }
} else {
  console.log(
    '[LocationPicker] react-native-maps not available on web - using fallback'
  );
}

const DEFAULT_COORDINATES: Coordinates = {
  latitude: 51.4953,
  longitude: -0.179,
};

interface LocationPickerProps {
  value?: {
    address?: string;
    coordinates?: Coordinates | null;
  };
  onChange: (value: {
    address?: string;
    coordinates?: Coordinates | null;
  }) => void;
  onSubmit?: () => void;
  deferChanges?: boolean; // when true, don't propagate interim changes upward
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  onSubmit,
  deferChanges = false,
}) => {
  // Check if MapView is available BEFORE any hooks
  const inExpoGo = !MapView;
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState<string>(value?.address || '');
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }>({
    latitude: value?.coordinates?.latitude || DEFAULT_COORDINATES.latitude,
    longitude: value?.coordinates?.longitude || DEFAULT_COORDINATES.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [selectedCoords, setSelectedCoords] = useState<Coordinates>(
    value?.coordinates || DEFAULT_COORDINATES
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [userZoomLevel, setUserZoomLevel] = useState<{
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const mapRef = useRef<any>(null);
  const pendingChangeRef = useRef<{
    address?: string;
    coordinates?: Coordinates | null;
  } | null>(null);

  const propagateChange = useCallback(
    (
      nextValue: { address?: string; coordinates?: Coordinates | null },
      options?: { forceImmediate?: boolean }
    ) => {
      if (deferChanges && !options?.forceImmediate) {
        pendingChangeRef.current = nextValue;
        return;
      }

      pendingChangeRef.current = null;
      onChange(nextValue);
    },
    [deferChanges, onChange]
  );

  useEffect(() => {
    if (!deferChanges && pendingChangeRef.current) {
      onChange(pendingChangeRef.current);
      pendingChangeRef.current = null;
    }
  }, [deferChanges, onChange]);

  // Ensure marker is always visible immediately
  useEffect(() => {
    console.log('Setting initial marker coordinates:', selectedCoords);
    // Always call onChange with initial coordinates to ensure parent component knows about the location
    if (!value?.coordinates) {
      propagateChange({
        address: search || 'Loading location...',
        coordinates: selectedCoords,
      });
    }
  }, []); // Run once on mount

  // Center map on initial coordinates when map is ready
  useEffect(() => {
    if (mapRef.current && selectedCoords) {
      const initialRegion = {
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
        longitudeDelta: userZoomLevel?.longitudeDelta || region.longitudeDelta,
      };
      mapRef.current.animateToRegion(initialRegion, 1000);
    }
  }, [selectedCoords, region, userZoomLevel]);

  useEffect(() => {
    // keep external value in sync (e.g., reset)
    if (value?.coordinates) {
      setSelectedCoords(value.coordinates);
      setRegion((r) => ({
        ...r,
        latitude: value.coordinates!.latitude,
        longitude: value.coordinates!.longitude,
      }));
    }
    if (typeof value?.address === 'string') {
      setSearch(value.address);
    }
  }, [
    value?.coordinates?.latitude,
    value?.coordinates?.longitude,
    value?.address,
  ]);

  // Get user's current location on mount if no coordinates are provided
  useEffect(() => {
    const initializeLocation = async () => {
      console.log('Initializing location picker, value:', value);
      if (!value?.coordinates) {
        try {
          setIsLoadingLocation(true);
          console.log('Getting current location...');
          const currentLocation = await locationService.getCurrentLocation();
          console.log('Current location received:', currentLocation);

          if (currentLocation) {
            setSelectedCoords(currentLocation);
            const newRegion = {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta:
                userZoomLevel?.latitudeDelta || region.latitudeDelta,
              longitudeDelta:
                userZoomLevel?.longitudeDelta || region.longitudeDelta,
            };
            setRegion(newRegion);

            // Animate map to the new location
            mapRef.current?.animateToRegion(newRegion, 1000);

            // Get address for current location
            try {
              const address =
                await locationService.reverseGeocode(currentLocation);
              console.log('Reverse geocoded address:', address);
              if (address?.formattedAddress) {
                setSearch(address.formattedAddress);
                propagateChange(
                  {
                  address: address.formattedAddress,
                  coordinates: currentLocation,
                  },
                  { forceImmediate: true }
                );
              } else {
                setSearch('Current Location');
                propagateChange(
                  {
                  address: 'Current Location',
                  coordinates: currentLocation,
                  },
                  { forceImmediate: true }
                );
              }
            } catch (geocodeError) {
              console.warn('Reverse geocoding failed:', geocodeError);
              setSearch('Current Location');
              propagateChange(
                {
                address: 'Current Location',
                coordinates: currentLocation,
                },
                { forceImmediate: true }
              );
            }
          } else {
            // If no current location, use default coordinates
            console.log('No current location, using default coordinates');
            setSelectedCoords(DEFAULT_COORDINATES);
            const newRegion = {
              latitude: DEFAULT_COORDINATES.latitude,
              longitude: DEFAULT_COORDINATES.longitude,
              latitudeDelta:
                userZoomLevel?.latitudeDelta || region.latitudeDelta,
              longitudeDelta:
                userZoomLevel?.longitudeDelta || region.longitudeDelta,
            };
            setRegion(newRegion);
            setSearch('Default Location');
            propagateChange(
              {
              address: 'Default Location',
              coordinates: DEFAULT_COORDINATES,
              },
              { forceImmediate: true }
            );
          }
        } catch (error) {
          console.warn('Could not get current location:', error);
          // Fall back to default coordinates
          setSelectedCoords(DEFAULT_COORDINATES);
          const newRegion = {
            latitude: DEFAULT_COORDINATES.latitude,
            longitude: DEFAULT_COORDINATES.longitude,
            latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
            longitudeDelta:
              userZoomLevel?.longitudeDelta || region.longitudeDelta,
          };
          setRegion(newRegion);
          setSearch('Default Location');
          propagateChange(
            {
            address: 'Default Location',
            coordinates: DEFAULT_COORDINATES,
            },
            { forceImmediate: true }
          );
        } finally {
          setIsLoadingLocation(false);
        }
      } else {
        console.log('Using provided coordinates:', value.coordinates);
        setIsLoadingLocation(false);
      }
    };

    initializeLocation();
  }, [propagateChange, value?.coordinates]);

  const geocode = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      Alert.alert('Search Error', 'Please enter at least 3 characters to search');
      return;
    }
    setIsGeocoding(true);
    try {
      const coords = await locationService.geocodeAddress(query.trim());
      if (coords) {
        setSelectedCoords(coords);
        const newRegion = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
          longitudeDelta:
            userZoomLevel?.longitudeDelta || region.longitudeDelta,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 600);
        propagateChange({ address: query.trim(), coordinates: coords });
      } else {
        Alert.alert('Location Not Found', 'Unable to find the location you searched for. Please try a different search.');
      }
    } catch (error) {
      Alert.alert('Search Error', 'Failed to search for location. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  }, [propagateChange, region, userZoomLevel]);

  const forceInputRecreation = () => {
    setInputKey((prev) => prev + 1);
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
  };

  const handleSearchPress = () => {
    geocode(search);
  };

  const handleRegionChangeComplete = useCallback(
    async (newRegion: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    }) => {
      console.log('Region changed:', newRegion);

      // Store the user's zoom level if it's different from our current zoom
      if (
        !userZoomLevel ||
        Math.abs(newRegion.latitudeDelta - userZoomLevel.latitudeDelta) >
          0.001 ||
        Math.abs(newRegion.longitudeDelta - userZoomLevel.longitudeDelta) >
          0.001
      ) {
        setUserZoomLevel({
          latitudeDelta: newRegion.latitudeDelta,
          longitudeDelta: newRegion.longitudeDelta,
        });
      }

      // Check if the center has changed significantly (not just zoom)
      const centerChanged =
        Math.abs(newRegion.latitude - region.latitude) > 0.0001 ||
        Math.abs(newRegion.longitude - region.longitude) > 0.0001;

      if (centerChanged) {
        setRegion(newRegion);
        const coords = {
          latitude: newRegion.latitude,
          longitude: newRegion.longitude,
        };
        setSelectedCoords(coords);
        // Reverse geocode to give user feedback
        try {
          const addr = await locationService.reverseGeocode(coords);
          setSearch(addr?.formattedAddress || 'Selected Location');
          propagateChange({
            address: addr?.formattedAddress || 'Selected Location',
            coordinates: coords,
          });
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
          setSearch('Selected Location');
          propagateChange({
            address: 'Selected Location',
            coordinates: coords,
          });
        }
      } else {
        // Just update the region state to preserve zoom level
        setRegion(newRegion);
      }
    },
    [propagateChange, region.latitude, region.longitude, userZoomLevel]
  );

  const handleRecenter = useCallback(async () => {
    try {
      const current = await locationService.getCurrentLocation();
      if (!current) return;
      setSelectedCoords(current);
      const newRegion = {
        latitude: current.latitude,
        longitude: current.longitude,
        latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
        longitudeDelta: userZoomLevel?.longitudeDelta || region.longitudeDelta,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 600);
      try {
        const addr = await locationService.reverseGeocode(current);
        setSearch(addr?.formattedAddress || 'Current Location');
        propagateChange({
          address: addr?.formattedAddress || 'Current Location',
          coordinates: current,
        });
      } catch {
        setSearch('Current Location');
        propagateChange({
          address: 'Current Location',
          coordinates: current,
        });
      }
    } catch (e) {
      console.warn('Recenter failed:', e);
    }
  }, [propagateChange, region.latitudeDelta, region.longitudeDelta, userZoomLevel]);

  // Check if MapView is available after all hooks
  if (!MapView) {
    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search for a location..."
            containerStyle={styles.searchInputContainer}
            inputStyle={styles.searchInput}
            accessibilityLabel="Search for a location"
            editable={false}
          />
          <Text style={styles.searchHelper}>
            Location search requires a development build
          </Text>
        </View>
        <MapViewFallback height={300} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <View style={styles.mapInner}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          mapId={GOOGLE_MAPS_MAP_ID}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={Platform.OS === 'android'}
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
                  color: '#bcddbd',
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
        >
          {console.log('Rendering marker with coordinates:', selectedCoords)}
          <Marker
            coordinate={selectedCoords}
            title="Meeting Location"
            description="Move the map to adjust location"
            pinColor="red"
          />
        </MapView>
          <TouchableOpacity
            style={[styles.recenterButton, { top: 12 + insets.top }]}
            onPress={handleRecenter}
            accessibilityLabel="Recenter map on current location"
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            <Ionicons name="locate-outline" size={18} color="#2C2235" />
          </TouchableOpacity>
        </View>

        {/* Search Bar Overlay */}
        <View style={styles.searchBarOverlay}>
          <View style={styles.searchBarContainer}>
            <View style={styles.searchInputWrapper}>
              <Input
                key={`search-input-${inputKey}`}
                value={search}
                onChangeText={handleSearchChange}
                placeholder="Search for a location"
                placeholderTextColor="#939393"
                containerStyle={styles.searchInputContainer}
                inputStyle={styles.searchInputOverlay}
                accessibilityLabel="Search for a location"
                accessibilityHint="Enter an address, place name, or postcode, then press Enter to search"
                returnKeyType="search"
                onSubmitEditing={handleSearchPress}
                variant="outlined"
                rightIcon={
                  search ? (
                    <TouchableOpacity
                      style={styles.searchIconContainer}
                      onPress={() => {
                        setSearch('');
                        forceInputRecreation();
                      }}
                      accessibilityLabel="Clear search"
                      accessibilityRole="button"
                    >
                      <Ionicons name="close" size={24} color="#2C2235" />
                    </TouchableOpacity>
                  ) : null
                }
              />
            </View>
          </View>
          {isGeocoding && (
            <Text variant="bodySmall" style={styles.searchHelperOverlay}>Finding location…</Text>
          )}
          {isLoadingLocation && (
            <Text variant="bodySmall" style={styles.searchHelperOverlay}>Getting your location…</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  searchContainer: {
    marginBottom: 12,
    marginHorizontal: 20,
  },
  mapContainer: {
    height: 354,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EAEAEA',
    position: 'relative',
    marginHorizontal: 0,
  },
  mapInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  recenterButton: {
    position: 'absolute',
    right: 12,
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
    zIndex: 1000, // Ensure button stays on top
  },
  actionContainer: {
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  actionSpacer: {
    marginBottom: 0,
  },
  searchInputWrapper: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  searchInputContainer: {
    marginBottom: 0,
    paddingVertical: 0,
    borderWidth: 0,
  },
  searchInput: {
    // Use default input styling to match other inputs
    paddingRight: 30, // ensure text doesn't render beneath the clear button
  },
  searchHelper: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchBarOverlay: {
    position: 'absolute',
    top: 17,
    left: 17,
    width: 317,
    zIndex: 10,
  },
  searchBarContainer: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F9F7F7',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'center',
  },
  searchInputOverlay: {
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: 'Figtree-Medium',
    fontWeight: '500',
    color: '#939393',
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  searchHelperOverlay: {
    marginTop: 8,
    marginLeft: 20,
    fontSize: 12,
    color: '#666',
  },
  searchIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
