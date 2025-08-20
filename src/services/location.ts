// expo-location is optional in dev client; gate usage to avoid native module errors
let Location: typeof import('expo-location') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Location = require('expo-location');
} catch {
  Location = null;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  formattedAddress?: string;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

class LocationService {
  private static instance: LocationService;
  private permissionStatus: LocationPermissionStatus | null = null;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions from the user
   */
  async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      if (!Location) return { granted: false, canAskAgain: false };
      const { status, canAskAgain } =
        await Location.requestForegroundPermissionsAsync();

      this.permissionStatus = {
        granted: status === 'granted',
        canAskAgain,
      };

      return this.permissionStatus;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return { granted: false, canAskAgain: false };
    }
  }

  /**
   * Get current location permission status
   */
  async getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
    if (this.permissionStatus) {
      return this.permissionStatus;
    }

    try {
      if (!Location) return { granted: false, canAskAgain: false };
      const { status, canAskAgain } =
        await Location.getForegroundPermissionsAsync();

      this.permissionStatus = {
        granted: status === 'granted',
        canAskAgain,
      };

      return this.permissionStatus;
    } catch (error) {
      console.error('Error getting location permission status:', error);
      return { granted: false, canAskAgain: false };
    }
  }

  /**
   * Geocode an address string to coordinates
   */
  async geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
      if (!address || address.trim().length === 0) {
        return null;
      }
      // Try expo-location first if available
      if (Location?.geocodeAsync) {
        const results = await Location.geocodeAsync(address);
        if (results && results.length > 0) {
          const { latitude, longitude } = results[0];
          return { latitude, longitude };
        }
      }

      // Fallback to Mapbox Geocoding if token is provided
      if (MAPBOX_TOKEN) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          address
        )}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json();
          const feature = json?.features?.[0];
          if (feature?.center?.length === 2) {
            const [lon, lat] = feature.center;
            return { latitude: lat, longitude: lon };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to an address
   */
  async reverseGeocode(coordinates: Coordinates): Promise<Address | null> {
    try {
      if (!Location?.reverseGeocodeAsync) return null;
      const results = await Location.reverseGeocodeAsync(coordinates);

      if (results && results.length > 0) {
        const result = results[0];
        return {
          street: result.street || undefined,
          city: result.city || undefined,
          region: result.region || undefined,
          postalCode: result.postalCode || undefined,
          country: result.country || undefined,
          formattedAddress: this.formatAddress(result),
        };
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) *
        Math.cos(this.toRadians(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get current user location
   */
  async getCurrentLocation(): Promise<Coordinates | null> {
    try {
      if (!Location) return null;
      const permission = await this.getLocationPermissionStatus();

      if (!permission.granted) {
        const requestResult = await this.requestLocationPermission();
        if (!requestResult.granted) {
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy?.Balanced || 4,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Parse location data from group location field
   */
  parseGroupLocation(locationData: any): {
    coordinates?: Coordinates;
    address?: string;
  } {
    if (!locationData) {
      return {};
    }

    // Handle different location data formats
    if (typeof locationData === 'string') {
      return { address: locationData };
    }

    if (typeof locationData === 'object') {
      const result: { coordinates?: Coordinates; address?: string } = {};

      // Normalize possible coordinate shapes
      const extractCoordinates = (obj: any): Coordinates | null => {
        const hasLatLng = obj && obj.lat !== undefined && obj.lng !== undefined;
        const hasLatitudeLongitude =
          obj && obj.latitude !== undefined && obj.longitude !== undefined;

        if (hasLatLng) {
          const lat = Number(obj.lat);
          const lng = Number(obj.lng);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            return { latitude: lat, longitude: lng };
          }
        }

        if (hasLatitudeLongitude) {
          const lat = Number(obj.latitude);
          const lng = Number(obj.longitude);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            return { latitude: lat, longitude: lng };
          }
        }

        return null;
      };

      // Direct coordinates on root
      const direct = extractCoordinates(locationData);
      if (direct) {
        result.coordinates = direct;
      }

      // Nested coordinates under `coordinates`
      if (!result.coordinates && locationData.coordinates) {
        const nested = extractCoordinates(locationData.coordinates);
        if (nested) {
          result.coordinates = nested;
        }
      }

      // Address fields we recognize
      if (locationData.address) {
        result.address = locationData.address;
      } else if (locationData.text) {
        // Common field name coming from existing rows in Supabase
        result.address = String(locationData.text);
      } else if (locationData.formattedAddress) {
        result.address = locationData.formattedAddress;
      }

      return result;
    }

    return {};
  }

  /**
   * Format address components into a readable string
   */
  private formatAddress(addressComponents: any): string {
    const parts = [];

    if (addressComponents.street) parts.push(addressComponents.street);
    if (addressComponents.city) parts.push(addressComponents.city);
    if (addressComponents.region) parts.push(addressComponents.region);
    if (addressComponents.postalCode) parts.push(addressComponents.postalCode);

    return parts.join(', ');
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const locationService = LocationService.getInstance();
