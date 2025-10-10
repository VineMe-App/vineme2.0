import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { GOOGLE_MAPS_MAP_ID } from '@/utils/constants';
import { Input } from '../ui';
import { locationService, type Coordinates } from '../../services/location';
import { debounce } from '../../utils';
import { MapViewFallback } from './MapViewFallback';

// Dynamically import MapView - not available in Expo Go
// Using try-catch to gracefully handle when the module isn't available
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} catch (error) {
  // react-native-maps not available (Expo Go) - will show fallback UI
  console.log('[LocationPicker] react-native-maps not available - using fallback');
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
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
}) => {
  // Check if MapView is available BEFORE any hooks
  const inExpoGo = !MapView;
  
  const [search, setSearch] = useState<string>(value?.address || '');
  const [previousSearchLength, setPreviousSearchLength] = useState((value?.address || '').length);
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
  const [userZoomLevel, setUserZoomLevel] = useState<{latitudeDelta: number, longitudeDelta: number} | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const mapRef = useRef<any>(null);
  const inputRef = useRef<any>(null);

  // Ensure marker is always visible immediately
  useEffect(() => {
    console.log('Setting initial marker coordinates:', selectedCoords);
    // Always call onChange with initial coordinates to ensure parent component knows about the location
    if (!value?.coordinates) {
      onChange({
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
              latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
              longitudeDelta: userZoomLevel?.longitudeDelta || region.longitudeDelta,
            };
            setRegion(newRegion);
            
            // Animate map to the new location
            mapRef.current?.animateToRegion(newRegion, 1000);
            
            // Get address for current location
            try {
              const address = await locationService.reverseGeocode(currentLocation);
              console.log('Reverse geocoded address:', address);
              if (address?.formattedAddress) {
                setSearch(address.formattedAddress);
                onChange({
                  address: address.formattedAddress,
                  coordinates: currentLocation,
                });
              } else {
                setSearch('Current Location');
                onChange({
                  address: 'Current Location',
                  coordinates: currentLocation,
                });
              }
            } catch (geocodeError) {
              console.warn('Reverse geocoding failed:', geocodeError);
              setSearch('Current Location');
              onChange({
                address: 'Current Location',
                coordinates: currentLocation,
              });
            }
          } else {
            // If no current location, use default coordinates
            console.log('No current location, using default coordinates');
            setSelectedCoords(DEFAULT_COORDINATES);
            const newRegion = {
              latitude: DEFAULT_COORDINATES.latitude,
              longitude: DEFAULT_COORDINATES.longitude,
              latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
              longitudeDelta: userZoomLevel?.longitudeDelta || region.longitudeDelta,
            };
            setRegion(newRegion);
            setSearch('Default Location');
            onChange({
              address: 'Default Location',
              coordinates: DEFAULT_COORDINATES,
            });
          }
        } catch (error) {
          console.warn('Could not get current location:', error);
          // Fall back to default coordinates
          setSelectedCoords(DEFAULT_COORDINATES);
          const newRegion = {
            latitude: DEFAULT_COORDINATES.latitude,
            longitude: DEFAULT_COORDINATES.longitude,
            latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
            longitudeDelta: userZoomLevel?.longitudeDelta || region.longitudeDelta,
          };
          setRegion(newRegion);
          setSearch('Default Location');
          onChange({
            address: 'Default Location',
            coordinates: DEFAULT_COORDINATES,
          });
        } finally {
          setIsLoadingLocation(false);
        }
      } else {
        console.log('Using provided coordinates:', value.coordinates);
        setIsLoadingLocation(false);
      }
    };

    initializeLocation();
  }, [value?.coordinates, onChange]);

  const geocode = useMemo(
    () => {
      // Create different debounced functions for different delays
      const standardGeocode = debounce(async (query: string) => {
        if (!query.trim() || query.trim().length < 3) return;
        setIsGeocoding(true);
        try {
          const coords = await locationService.geocodeAddress(query.trim());
          if (coords) {
            setSelectedCoords(coords);
            const newRegion = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
              longitudeDelta: userZoomLevel?.longitudeDelta || region.longitudeDelta,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 600);
            onChange({ address: query.trim(), coordinates: coords });
          }
        } finally {
          setIsGeocoding(false);
        }
      }, 2000); // Standard 2-second delay

      const numberGeocode = debounce(async (query: string) => {
        if (!query.trim() || query.trim().length < 3) return;
        setIsGeocoding(true);
        try {
          const coords = await locationService.geocodeAddress(query.trim());
          if (coords) {
            setSelectedCoords(coords);
            const newRegion = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: userZoomLevel?.latitudeDelta || region.latitudeDelta,
              longitudeDelta: userZoomLevel?.longitudeDelta || region.longitudeDelta,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 600);
            onChange({ address: query.trim(), coordinates: coords });
          }
        } finally {
          setIsGeocoding(false);
        }
      }, 3000); // Longer 3-second delay for numbers

      return (query: string) => {
        // Check if first character is a number
        const firstChar = query.trim().charAt(0);
        const isNumber = /^\d/.test(firstChar);
        
        if (isNumber) {
          numberGeocode(query);
        } else {
          standardGeocode(query);
        }
      };
    },
    [onChange, region, userZoomLevel]
  );

  const forceInputRecreation = () => {
    setInputKey(prev => prev + 1);
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    
    // Only geocode if:
    // 1. User is actively typing (text length is increasing)
    // 2. Text is at least 3 characters long
    // 3. Text is not empty
    const isTyping = text.length > previousSearchLength;
    setPreviousSearchLength(text.length);
    
    // Only trigger geocoding when actively typing, not when deleting or clearing
    if (isTyping && text.length >= 3) {
      geocode(text);
    }
    // Don't geocode when deleting, clearing, or when text length stays the same
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
      if (!userZoomLevel || 
          Math.abs(newRegion.latitudeDelta - userZoomLevel.latitudeDelta) > 0.001 ||
          Math.abs(newRegion.longitudeDelta - userZoomLevel.longitudeDelta) > 0.001) {
        setUserZoomLevel({
          latitudeDelta: newRegion.latitudeDelta,
          longitudeDelta: newRegion.longitudeDelta,
        });
      }
      
      // Check if the center has changed significantly (not just zoom)
      const centerChanged = Math.abs(newRegion.latitude - region.latitude) > 0.0001 || 
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
          onChange({
            address: addr?.formattedAddress || 'Selected Location',
            coordinates: coords,
          });
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
          setSearch('Selected Location');
          onChange({
            address: 'Selected Location',
            coordinates: coords,
          });
        }
      } else {
        // Just update the region state to preserve zoom level
        setRegion(newRegion);
      }
    },
    [onChange, region.latitude, region.longitude, userZoomLevel]
  );

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
            disabled
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
      <View style={styles.searchContainer}>
        <Input
          ref={inputRef}
          key={`search-input-${inputKey}`}
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Search for a location..."
          containerStyle={styles.searchInputContainer}
          inputStyle={styles.searchInput}
          accessibilityLabel="Search for a location"
          accessibilityHint="Enter an address, place name, or postcode to move the map"
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
          textContentType="none"
          keyboardType="default"
          importantForAutofill="no"
          autoCompleteType="off"
          dataDetectorTypes="none"
          clearButtonMode="never"
          enablesReturnKeyAutomatically={false}
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {isGeocoding && (
          <Text style={styles.searchHelper}>Finding location…</Text>
        )}
        {isLoadingLocation && (
          <Text style={styles.searchHelper}>Getting your location…</Text>
        )}
        {search.length > 0 && search.length < 3 && (
          <Text style={styles.searchHelper}>Type at least 3 characters to search</Text>
        )}
        {search.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => {
              setSearch('');
              setPreviousSearchLength(0);
              forceInputRecreation();
              // Focus the input after clearing to keep keyboard up
              setTimeout(() => {
                inputRef.current?.focus();
              }, 100);
            }}
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.mapContainer}>
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
                  color: '#f0f9f0', // Faint green tint using brand color
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
                  color: '#5f5f5f',
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
          >
            {console.log('Rendering marker with coordinates:', selectedCoords)}
            <Marker
              coordinate={selectedCoords}
              title="Meeting Location"
              description="Move the map to adjust location"
              pinColor="red"
            />
          </MapView>
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
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
    position: 'relative',
    marginHorizontal: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  searchInputContainer: {
    marginBottom: 0,
    paddingVertical: 0,
  },
  searchInput: {
    // Use default input styling to match other inputs
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
});
