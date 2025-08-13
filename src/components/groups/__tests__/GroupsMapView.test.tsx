import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { GroupsMapView } from '../GroupsMapView';
import { locationService } from '../../../services/location';
import type { GroupWithDetails } from '../../../types/database';

// Mock the location service
jest.mock('../../../services/location', () => ({
  locationService: {
    getCurrentLocation: jest.fn(),
    parseGroupLocation: jest.fn(),
    geocodeAddress: jest.fn(),
    requestLocationPermission: jest.fn(),
    getLocationPermissionStatus: jest.fn(),
  },
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => <View testID="map-view" {...props} />),
    Marker: (props: any) => <View testID="marker" {...props} />,
    Callout: (props: any) => <View testID="callout" {...props} />,
  };
});

const mockLocationService = locationService as jest.Mocked<typeof locationService>;

const mockGroups: GroupWithDetails[] = [
  {
    id: '1',
    title: 'Test Group 1',
    description: 'A test group',
    meeting_day: 'Wednesday',
    meeting_time: '7:00 PM',
    location: {
      address: '123 Main St, San Francisco, CA',
      latitude: 37.7749,
      longitude: -122.4194,
    },
    whatsapp_link: null,
    image_url: null,
    service_id: 'service1',
    church_id: 'church1',
    status: 'approved',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: '2',
    title: 'Test Group 2',
    description: 'Another test group',
    meeting_day: 'Friday',
    meeting_time: '6:30 PM',
    location: {
      address: '456 Oak Ave, San Francisco, CA',
    },
    whatsapp_link: null,
    image_url: null,
    service_id: 'service1',
    church_id: 'church1',
    status: 'approved',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: null,
  },
];

describe('GroupsMapView', () => {
  const mockOnGroupPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockLocationService.getCurrentLocation.mockResolvedValue({
      latitude: 37.7749,
      longitude: -122.4194,
    });
    
    mockLocationService.getLocationPermissionStatus.mockResolvedValue({
      granted: true,
      canAskAgain: true,
    });
    
    mockLocationService.parseGroupLocation.mockImplementation((location) => {
      if (location?.latitude && location?.longitude) {
        return {
          coordinates: { latitude: location.latitude, longitude: location.longitude },
          address: location.address,
        };
      }
      if (location?.address) {
        return { address: location.address };
      }
      return {};
    });
    
    mockLocationService.geocodeAddress.mockImplementation(async (address) => {
      if (address.includes('456 Oak Ave')) {
        return { latitude: 37.7849, longitude: -122.4094 };
      }
      return null;
    });
  });

  it('should render loading state initially', () => {
    const { getByText } = render(
      <GroupsMapView
        groups={mockGroups}
        onGroupPress={mockOnGroupPress}
        isLoading={true}
      />
    );

    expect(getByText('Loading map...')).toBeTruthy();
  });

  it('should render map view when loaded', async () => {
    const { getByTestId } = render(
      <GroupsMapView
        groups={mockGroups}
        onGroupPress={mockOnGroupPress}
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });
  });

  it('should show no markers message when no groups have valid locations', async () => {
    const groupsWithoutLocations: GroupWithDetails[] = [
      {
        ...mockGroups[0],
        location: null,
      },
    ];

    mockLocationService.parseGroupLocation.mockReturnValue({});
    mockLocationService.geocodeAddress.mockResolvedValue(null);

    const { getByText } = render(
      <GroupsMapView
        groups={groupsWithoutLocations}
        onGroupPress={mockOnGroupPress}
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(getByText('No groups with valid locations found')).toBeTruthy();
    });
  });

  it('should show permission banner when location permission denied', async () => {
    mockLocationService.getCurrentLocation.mockResolvedValue(null);
    mockLocationService.getLocationPermissionStatus.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });

    const { getByText } = render(
      <GroupsMapView
        groups={mockGroups}
        onGroupPress={mockOnGroupPress}
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(getByText('Enable location to see your position on the map')).toBeTruthy();
    });
  });

  it('should process groups with coordinates correctly', async () => {
    const { getByTestId } = render(
      <GroupsMapView
        groups={mockGroups}
        onGroupPress={mockOnGroupPress}
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });

    // Verify location service methods were called
    expect(mockLocationService.parseGroupLocation).toHaveBeenCalledTimes(2);
    expect(mockLocationService.geocodeAddress).toHaveBeenCalledWith('456 Oak Ave, San Francisco, CA');
  });

  it('should handle geocoding errors gracefully', async () => {
    // Mock geocoding to return null instead of throwing
    mockLocationService.geocodeAddress.mockResolvedValue(null);

    const { getByTestId } = render(
      <GroupsMapView
        groups={mockGroups}
        onGroupPress={mockOnGroupPress}
        isLoading={false}
      />
    );

    await waitFor(() => {
      expect(getByTestId('map-view')).toBeTruthy();
    });

    // Should still render the map even if geocoding fails
    expect(mockLocationService.geocodeAddress).toHaveBeenCalled();
  });
});