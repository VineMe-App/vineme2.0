/**
 * Tests for map clustering utilities
 */

import {
  MapClusterer,
  MapViewportOptimizer,
  MapPerformanceMonitor,
} from '../mapClustering';
import type { GroupWithDetails } from '../../types/database';

// Mock group data
const mockGroups: GroupWithDetails[] = [
  {
    id: '1',
    title: 'Group 1',
    description: 'Test group 1',
    location: {
      coordinates: { lat: 37.7749, lng: -122.4194 },
      address: '123 Main St, San Francisco, CA',
    },
    meeting_day: 'Monday',
    meeting_time: '19:00',
    status: 'approved',
    church_id: 'church1',
    service_id: 'service1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    member_count: 5,
  },
  {
    id: '2',
    title: 'Group 2',
    description: 'Test group 2',
    location: {
      coordinates: { lat: 37.7849, lng: -122.4094 }, // Close to group 1
      address: '456 Oak St, San Francisco, CA',
    },
    meeting_day: 'Tuesday',
    meeting_time: '19:00',
    status: 'approved',
    church_id: 'church1',
    service_id: 'service1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    member_count: 8,
  },
  {
    id: '3',
    title: 'Group 3',
    description: 'Test group 3',
    location: {
      coordinates: { lat: 40.7128, lng: -74.006 }, // Far from others (NYC)
      address: '789 Broadway, New York, NY',
    },
    meeting_day: 'Wednesday',
    meeting_time: '19:00',
    status: 'approved',
    church_id: 'church1',
    service_id: 'service1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    member_count: 3,
  },
];

describe('MapClusterer', () => {
  let clusterer: MapClusterer;

  beforeEach(() => {
    clusterer = new MapClusterer({
      radius: 40,
      minZoom: 0,
      maxZoom: 16,
    });
  });

  describe('load', () => {
    it('should load groups successfully', () => {
      clusterer.load(mockGroups);
      expect(clusterer.getPointCount()).toBe(3);
    });

    it('should filter out groups without valid coordinates', () => {
      const groupsWithInvalidLocation = [
        ...mockGroups,
        {
          ...mockGroups[0],
          id: '4',
          location: null,
        },
        {
          ...mockGroups[0],
          id: '5',
          location: { address: 'No coordinates' },
        },
      ];

      clusterer.load(groupsWithInvalidLocation as any);
      expect(clusterer.getPointCount()).toBe(3); // Only valid ones loaded
    });
  });

  describe('getClusters', () => {
    beforeEach(() => {
      clusterer.load(mockGroups);
    });

    it('should return individual points at high zoom', () => {
      const bbox: [number, number, number, number] = [-180, -90, 180, 90];
      const clusters = clusterer.getClusters(bbox, 16);

      expect(clusters).toHaveLength(3);
      clusters.forEach((cluster) => {
        expect(cluster).toHaveProperty('data');
        expect(cluster).not.toHaveProperty('count');
      });
    });

    it('should cluster nearby points at low zoom', () => {
      const bbox: [number, number, number, number] = [-180, -90, 180, 90];
      const clusters = clusterer.getClusters(bbox, 5);

      // Should have fewer clusters than original points due to clustering
      expect(clusters.length).toBeLessThanOrEqual(3);

      // Check if SF groups are clustered together
      const clusterWithMultiplePoints = clusters.find(
        (cluster) => 'count' in cluster && cluster.count > 1
      );
      expect(clusterWithMultiplePoints).toBeDefined();
    });

    it('should filter points by bounding box', () => {
      // Bounding box that only includes SF area
      const sfBbox: [number, number, number, number] = [-123, 37, -122, 38];
      const clusters = clusterer.getClusters(sfBbox, 16);

      expect(clusters).toHaveLength(2); // Only SF groups
    });

    it('should return empty array for empty bounding box', () => {
      const emptyBbox: [number, number, number, number] = [0, 0, 0, 0];
      const clusters = clusterer.getClusters(emptyBbox, 16);

      expect(clusters).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all points', () => {
      clusterer.load(mockGroups);
      expect(clusterer.getPointCount()).toBe(3);

      clusterer.clear();
      expect(clusterer.getPointCount()).toBe(0);
    });
  });
});

describe('MapViewportOptimizer', () => {
  const mockViewport = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  describe('getOptimalBounds', () => {
    it('should add padding to viewport bounds', () => {
      const bounds = MapViewportOptimizer.getOptimalBounds(mockViewport);

      expect(bounds).toHaveLength(4);
      expect(bounds[0]).toBeLessThan(
        mockViewport.longitude - mockViewport.longitudeDelta / 2
      );
      expect(bounds[1]).toBeLessThan(
        mockViewport.latitude - mockViewport.latitudeDelta / 2
      );
      expect(bounds[2]).toBeGreaterThan(
        mockViewport.longitude + mockViewport.longitudeDelta / 2
      );
      expect(bounds[3]).toBeGreaterThan(
        mockViewport.latitude + mockViewport.latitudeDelta / 2
      );
    });
  });

  describe('hasSignificantChange', () => {
    it('should detect significant changes', () => {
      const newViewport = {
        ...mockViewport,
        latitude: mockViewport.latitude + 0.2, // Significant change
      };

      const hasChanged = MapViewportOptimizer.hasSignificantChange(
        mockViewport,
        newViewport,
        0.1
      );

      expect(hasChanged).toBe(true);
    });

    it('should ignore minor changes', () => {
      const newViewport = {
        ...mockViewport,
        latitude: mockViewport.latitude + 0.001, // Minor change
      };

      const hasChanged = MapViewportOptimizer.hasSignificantChange(
        mockViewport,
        newViewport,
        0.1
      );

      expect(hasChanged).toBe(false);
    });

    it('should return true for null/undefined viewports', () => {
      expect(
        MapViewportOptimizer.hasSignificantChange(null, mockViewport)
      ).toBe(true);
      expect(
        MapViewportOptimizer.hasSignificantChange(mockViewport, null)
      ).toBe(true);
    });
  });

  describe('getZoomLevel', () => {
    it('should calculate zoom level from latitude delta', () => {
      const zoom = MapViewportOptimizer.getZoomLevel(0.1);
      expect(zoom).toBeGreaterThan(0);
      expect(zoom).toBeLessThan(20);
    });

    it('should return higher zoom for smaller delta', () => {
      const zoom1 = MapViewportOptimizer.getZoomLevel(1.0);
      const zoom2 = MapViewportOptimizer.getZoomLevel(0.1);

      expect(zoom2).toBeGreaterThan(zoom1);
    });
  });
});

describe('MapPerformanceMonitor', () => {
  beforeEach(() => {
    MapPerformanceMonitor.clearMetrics();
  });

  describe('clustering performance', () => {
    it('should measure clustering time', () => {
      const endMeasurement = MapPerformanceMonitor.startClustering();

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait 10ms
      }

      endMeasurement();

      const avgTime = MapPerformanceMonitor.getAverageClusteringTime();
      expect(avgTime).toBeGreaterThan(0);
    });
  });

  describe('rendering performance', () => {
    it('should measure rendering time', () => {
      const endMeasurement = MapPerformanceMonitor.startRendering();

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Wait 5ms
      }

      endMeasurement();

      const avgTime = MapPerformanceMonitor.getAverageRenderTime();
      expect(avgTime).toBeGreaterThan(0);
    });
  });

  describe('point count tracking', () => {
    it('should track point counts', () => {
      MapPerformanceMonitor.recordPointCount(10);
      MapPerformanceMonitor.recordPointCount(20);

      const avgCount = MapPerformanceMonitor.getAveragePointCount();
      expect(avgCount).toBe(15);
    });
  });

  describe('performance report', () => {
    it('should generate comprehensive performance report', () => {
      // Record some metrics
      const endClustering = MapPerformanceMonitor.startClustering();
      endClustering();

      const endRendering = MapPerformanceMonitor.startRendering();
      endRendering();

      MapPerformanceMonitor.recordPointCount(25);

      const report = MapPerformanceMonitor.getPerformanceReport();

      expect(report).toHaveProperty('avgClusteringTime');
      expect(report).toHaveProperty('avgRenderTime');
      expect(report).toHaveProperty('avgPointCount');
      expect(report).toHaveProperty('totalMeasurements');
      expect(report.totalMeasurements).toBeGreaterThan(0);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      MapPerformanceMonitor.recordPointCount(10);
      expect(MapPerformanceMonitor.getAveragePointCount()).toBe(10);

      MapPerformanceMonitor.clearMetrics();
      expect(MapPerformanceMonitor.getAveragePointCount()).toBe(0);
    });
  });
});
