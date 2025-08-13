import * as Location from 'expo-location';

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
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
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
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      
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

      const results = await Location.geocodeAsync(address);
      
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        return { latitude, longitude };
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
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get current user location
   */
  async getCurrentLocation(): Promise<Coordinates | null> {
    try {
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
  parseGroupLocation(locationData: any): { coordinates?: Coordinates; address?: string } {
    if (!locationData) {
      return {};
    }

    // Handle different location data formats
    if (typeof locationData === 'string') {
      return { address: locationData };
    }

    if (typeof locationData === 'object') {
      const result: { coordinates?: Coordinates; address?: string } = {};

      // Check for coordinates
      if (locationData.latitude && locationData.longitude) {
        result.coordinates = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        };
      }

      // Check for address
      if (locationData.address) {
        result.address = locationData.address;
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