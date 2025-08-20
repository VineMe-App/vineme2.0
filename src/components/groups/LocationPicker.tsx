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
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAPS_MAP_ID } from '@/utils/constants';
import { Input, Button } from '../ui';
import { locationService, type Coordinates } from '../../services/location';
import { debounce } from '../../utils';

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
    latitude: value?.coordinates?.latitude || 37.7749,
    longitude: value?.coordinates?.longitude || -122.4194,
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

  const handleUseCurrentLocation = useCallback(async () => {
    const coords = await locationService.getCurrentLocation();
    if (coords) {
      setSelectedCoords(coords);
      setRegion((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
      mapRef.current?.animateToRegion(
        { ...region, latitude: coords.latitude, longitude: coords.longitude },
        600
      );
      // Optionally reverse geocode for address
      const addr = await locationService.reverseGeocode(coords);
      onChange({ address: addr?.formattedAddress, coordinates: coords });
      if (addr?.formattedAddress) setSearch(addr.formattedAddress);
    }
  }, [onChange, region]);

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
    <View>
      <Input
        label="Search for a place"
        value={search}
        onChangeText={handleSearchChange}
        placeholder="Type an address, place, or area"
        helperText={isGeocoding ? 'Finding location…' : undefined}
      />
      <View style={styles.mapActions}>
        <Button
          title="Use Current Location"
          onPress={handleUseCurrentLocation}
          size="small"
          variant="secondary"
        />
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
        >
          {selectedCoords && <Marker coordinate={selectedCoords} />}
        </MapView>
      </View>
      <Text style={styles.hint}>
        You can search for a location or pinch/drag the map to set the exact
        spot.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
    marginTop: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapActions: {
    alignItems: 'flex-start',
    marginTop: 4,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
});
