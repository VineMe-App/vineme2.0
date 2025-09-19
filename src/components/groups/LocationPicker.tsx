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
  Platform,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAPS_MAP_ID } from '@/utils/constants';
import { Input } from '../ui';
import { locationService, type Coordinates } from '../../services/location';
import { debounce } from '../../utils';

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
  const [search, setSearch] = useState<string>(value?.address || '');
  const [region, setRegion] = useState<Region>({
    latitude: value?.coordinates?.latitude || DEFAULT_COORDINATES.latitude,
    longitude: value?.coordinates?.longitude || DEFAULT_COORDINATES.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(
    value?.coordinates || null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<MapView>(null);

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

  const geocode = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) return;
        setIsGeocoding(true);
        try {
          const coords = await locationService.geocodeAddress(query.trim());
          if (coords) {
            setSelectedCoords(coords);
            setRegion((prev) => ({
              ...prev,
              latitude: coords.latitude,
              longitude: coords.longitude,
            }));
            mapRef.current?.animateToRegion(
              {
                ...region,
                latitude: coords.latitude,
                longitude: coords.longitude,
              },
              600
            );
            onChange({ address: query.trim(), coordinates: coords });
          }
        } finally {
          setIsGeocoding(false);
        }
      }, 500),
    [onChange, region]
  );

  const handleSearchChange = (text: string) => {
    setSearch(text);
    geocode(text);
  };

  const handleRegionChangeComplete = useCallback(
    async (newRegion: Region) => {
      setRegion(newRegion);
      const coords = {
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      };
      setSelectedCoords(coords);
      // Reverse geocode to give user feedback
      const addr = await locationService.reverseGeocode(coords);
      onChange({
        address: addr?.formattedAddress || search,
        coordinates: coords,
      });
    },
    [onChange, search]
  );

  return (
    <View style={styles.container}>
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
        >
          {selectedCoords && <Marker coordinate={selectedCoords} />}
        </MapView>

        <View pointerEvents="box-none" style={styles.searchOverlay}>
          <View style={styles.searchBox}>
            <Input
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Type an address, place, or area"
              variant="filled"
              containerStyle={styles.searchInputContainer}
              inputStyle={styles.searchInput}
              accessibilityLabel="Search for a location"
              accessibilityHint="Enter an address or place name to move the map"
            />
            {isGeocoding && (
              <Text style={styles.searchHelper}>Finding location…</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mapContainer: {
    height: 360,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
    marginTop: 8,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  searchOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'flex-start',
  },
  searchBox: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#ffffffee',
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  searchInput: {
    backgroundColor: '#fff',
    fontSize: 13,
  },
  searchHelper: {
    marginTop: 6,
    fontSize: 9,
    color: '#666',
  },
});
