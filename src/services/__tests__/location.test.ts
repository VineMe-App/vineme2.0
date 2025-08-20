import { locationService, Coordinates } from '../location';
import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 4,
  },
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestLocationPermission', () => {
    it('should return granted permission when user allows', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
      });

      const result = await locationService.requestLocationPermission();

      expect(result).toEqual({
        granted: true,
        canAskAgain: true,
      });
    });

    it('should return denied permission when user denies', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: false,
      });

      const result = await locationService.requestLocationPermission();

      expect(result).toEqual({
        granted: false,
        canAskAgain: false,
      });
    });

    it('should handle errors gracefully', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockRejectedValue(
        new Error('Permission error')
      );

      const result = await locationService.requestLocationPermission();

      expect(result).toEqual({
        granted: false,
        canAskAgain: false,
      });
    });
  });

  describe('geocodeAddress', () => {
    it('should return coordinates for valid address', async () => {
      const mockCoordinates = { latitude: 37.7749, longitude: -122.4194 };
      mockLocation.geocodeAsync.mockResolvedValue([mockCoordinates]);

      const result = await locationService.geocodeAddress('San Francisco, CA');

      expect(result).toEqual(mockCoordinates);
      expect(mockLocation.geocodeAsync).toHaveBeenCalledWith(
        'San Francisco, CA'
      );
    });

    it('should return null for empty address', async () => {
      const result = await locationService.geocodeAddress('');

      expect(result).toBeNull();
      expect(mockLocation.geocodeAsync).not.toHaveBeenCalled();
    });

    it('should return null when geocoding fails', async () => {
      mockLocation.geocodeAsync.mockResolvedValue([]);

      const result = await locationService.geocodeAddress('Invalid Address');

      expect(result).toBeNull();
    });

    it('should handle geocoding errors', async () => {
      mockLocation.geocodeAsync.mockRejectedValue(new Error('Geocoding error'));

      const result = await locationService.geocodeAddress('San Francisco, CA');

      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should return address for valid coordinates', async () => {
      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const mockAddress = {
        street: '123 Main St',
        city: 'San Francisco',
        region: 'CA',
        postalCode: '94102',
        country: 'US',
      };
      mockLocation.reverseGeocodeAsync.mockResolvedValue([mockAddress]);

      const result = await locationService.reverseGeocode(coordinates);

      expect(result).toEqual({
        street: '123 Main St',
        city: 'San Francisco',
        region: 'CA',
        postalCode: '94102',
        country: 'US',
        formattedAddress: '123 Main St, San Francisco, CA, 94102',
      });
    });

    it('should return null when reverse geocoding fails', async () => {
      const coordinates: Coordinates = { latitude: 0, longitude: 0 };
      mockLocation.reverseGeocodeAsync.mockResolvedValue([]);

      const result = await locationService.reverseGeocode(coordinates);

      expect(result).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const from: Coordinates = { latitude: 37.7749, longitude: -122.4194 };
      const to: Coordinates = { latitude: 37.7849, longitude: -122.4094 };

      const distance = locationService.calculateDistance(from, to);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2); // Should be less than 2km for this small distance
    });

    it('should return 0 for same coordinates', () => {
      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };

      const distance = locationService.calculateDistance(
        coordinates,
        coordinates
      );

      expect(distance).toBe(0);
    });
  });

  describe('parseGroupLocation', () => {
    it('should parse string location as address', () => {
      const result = locationService.parseGroupLocation(
        '123 Main St, San Francisco, CA'
      );

      expect(result).toEqual({
        address: '123 Main St, San Francisco, CA',
      });
    });

    it('should parse object with coordinates', () => {
      const locationData = {
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
      };

      const result = locationService.parseGroupLocation(locationData);

      expect(result).toEqual({
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        address: '123 Main St',
      });
    });

    it('should handle null location data', () => {
      const result = locationService.parseGroupLocation(null);

      expect(result).toEqual({});
    });

    it('should handle object with formattedAddress', () => {
      const locationData = {
        formattedAddress: '123 Main St, San Francisco, CA',
      };

      const result = locationService.parseGroupLocation(locationData);

      expect(result).toEqual({
        address: '123 Main St, San Francisco, CA',
      });
    });
  });

  describe('getCurrentLocation', () => {
    it('should return current location when permission granted', async () => {
      const mockCoordinates = { latitude: 37.7749, longitude: -122.4194 };

      // Reset the permission status cache
      (locationService as any).permissionStatus = null;

      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: mockCoordinates,
      } as any);

      const result = await locationService.getCurrentLocation();

      expect(result).toEqual(mockCoordinates);
    });

    it('should request permission if not granted', async () => {
      const mockCoordinates = { latitude: 37.7749, longitude: -122.4194 };

      // Reset the permission status cache
      (locationService as any).permissionStatus = null;

      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: true,
      });

      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        canAskAgain: true,
      });

      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        coords: mockCoordinates,
      } as any);

      const result = await locationService.getCurrentLocation();

      expect(result).toEqual(mockCoordinates);
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return null when permission denied', async () => {
      // Reset the permission status cache
      (locationService as any).permissionStatus = null;

      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: true,
      });

      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        canAskAgain: false,
      });

      const result = await locationService.getCurrentLocation();

      expect(result).toBeNull();
    });
  });
});
