/**
 * Map clustering utilities for optimizing map performance with many group pins
 */

import type { GroupWithDetails } from '../types/database';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ClusterPoint extends Coordinates {
  id: string;
  data: GroupWithDetails;
  category?: 'service' | 'church' | 'outside';
}

export interface Cluster {
  id: string;
  coordinates: Coordinates;
  points: ClusterPoint[];
  count: number;
  category?: 'service' | 'church' | 'outside';
}

export interface ClusteringOptions {
  radius: number; // Clustering radius in pixels
  minZoom: number;
  maxZoom: number;
  extent: number; // Tile extent (default: 512)
  nodeSize: number; // Size of the KD-tree leaf node (affects performance)
}

const DEFAULT_CLUSTERING_OPTIONS: ClusteringOptions = {
  radius: 40,
  minZoom: 0,
  maxZoom: 16,
  extent: 512,
  nodeSize: 64,
};

/**
 * Simple clustering implementation for map markers
 */
export class MapClusterer {
  private options: ClusteringOptions;
  private points: ClusterPoint[] = [];

  constructor(options: Partial<ClusteringOptions> = {}) {
    this.options = { ...DEFAULT_CLUSTERING_OPTIONS, ...options };
  }

  /**
   * Load points from groups data
   */
  load(groups: GroupWithDetails[]): void {
    this.points = groups
      .map((group) => this.groupToClusterPoint(group))
      .filter((point): point is ClusterPoint => point !== null);
  }

  /**
   * Get clusters for a given zoom level and bounds
   */
  getClusters(
    bbox: [number, number, number, number], // [west, south, east, north]
    zoom: number
  ): (Cluster | ClusterPoint)[] {
    // For zoom levels 11-13 where clusters frequently split/combine (18->9,8,1),
    // use a larger buffer but still rely on bounds filtering to avoid reprocessing
    // the entire dataset on every pan.
    const minLng = bbox[0];
    const minLat = bbox[1];
    const maxLng = bbox[2];
    const maxLat = bbox[3];

    const lngRange = maxLng - minLng;
    const latRange = maxLat - minLat;

    // Use a very large buffer multiplier to include groups well outside the viewport
    const bufferMultiplier = zoom >= 11 && zoom <= 13 ? 3.0 : 2.0; // Extra padding mid-zoom
    const minBuffer = zoom >= 11 && zoom <= 13 ? 0.2 : 0.1; // Ensure generous bounds mid-zoom

    const lngBuffer = Math.max(lngRange * bufferMultiplier, minBuffer);
    const latBuffer = Math.max(latRange * bufferMultiplier, minBuffer);

    // Filter points within bounds (with buffer to prevent edge-case filtering)
    // Handle longitude wrapping for coordinates near -180/180
    const pointsInBounds = this.points.filter((point) => {
      // Check latitude with buffer
      const inLatBounds = point.latitude >= minLat - latBuffer && point.latitude <= maxLat + latBuffer;
      
      if (!inLatBounds) return false;
      
      // Check longitude with buffer, handling potential wrapping
      // For normal cases (not crossing date line)
      if (minLng <= maxLng) {
        return point.longitude >= minLng - lngBuffer && point.longitude <= maxLng + lngBuffer;
      }
      // For cases crossing date line (west > east), check both sides
      return (
        point.longitude >= minLng - lngBuffer ||
        point.longitude <= maxLng + lngBuffer
      );
    });

    const midZoom = zoom >= 11 && zoom <= 13;
    const pointsToCluster = midZoom && pointsInBounds.length === 0 ? this.points : pointsInBounds;

    // If zoom is high enough, return individual points
    if (zoom >= this.options.maxZoom) {
      return pointsToCluster;
    }

    if (midZoom) {
      // Cluster with bounded set to avoid O(N^2) work while keeping generous padding
      return this.clusterPoints(pointsToCluster, zoom);
    }

    // Perform clustering
    return this.clusterPoints(pointsToCluster, zoom);
  }

  /**
   * Convert group to cluster point
   */
  private groupToClusterPoint(group: GroupWithDetails): ClusterPoint | null {
    const coordinates = this.extractCoordinates(group.location);

    if (!coordinates) return null;

    return {
      id: group.id,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      data: group,
      category: (group as any).__category,
    };
  }

  /**
   * Extract coordinates from group location data
   */
  private extractCoordinates(location: any): Coordinates | null {
    if (!location) return null;

    // Handle different location formats
    if (typeof location === 'object') {
      if (location.coordinates) {
        return {
          latitude: location.coordinates.lat || location.coordinates.latitude,
          longitude: location.coordinates.lng || location.coordinates.longitude,
        };
      }

      if (location.lat && location.lng) {
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }

      if (location.latitude && location.longitude) {
        return {
          latitude: location.latitude,
          longitude: location.longitude,
        };
      }
    }

    return null;
  }

  /**
   * Cluster points using simple distance-based clustering
   * Split clusters by category to ensure different colored groups don't cluster together
   */
  private clusterPoints(
    points: ClusterPoint[],
    zoom: number
  ): (Cluster | ClusterPoint)[] {
    if (points.length === 0) return [];
    
    const clusters: (Cluster | ClusterPoint)[] = [];
    const processed = new Set<string>();
    const clusterRadius = this.getClusterRadius(zoom);

    // Process all points to ensure none are lost
    for (const point of points) {
      if (processed.has(point.id)) continue;

      // Find nearby points WITH THE SAME CATEGORY
      const nearbyPoints = points.filter(
        (p) =>
          !processed.has(p.id) &&
          this.getDistance(point, p) <= clusterRadius &&
          p.category === point.category // Only cluster same category
      );

      if (nearbyPoints.length === 1) {
        // Single point, no clustering needed
        clusters.push(point);
        processed.add(point.id);
      } else {
        // Create cluster with category
        const cluster: Cluster = {
          id: `cluster_${point.id}_${nearbyPoints.length}`,
          coordinates: this.getCenterPoint(nearbyPoints),
          points: nearbyPoints,
          count: nearbyPoints.length,
          category: point.category, // Assign category to cluster
        };

        clusters.push(cluster);
        nearbyPoints.forEach((p) => processed.add(p.id));
      }
    }

    // Safety check: ensure all points were processed
    if (processed.size !== points.length) {
      // This should never happen, but if it does, add remaining points as individual markers
      const unprocessed = points.filter((p) => !processed.has(p.id));
      if (unprocessed.length > 0) {
        console.warn(
          `[MapClusterer] ${unprocessed.length} points were not clustered, adding as individual markers`
        );
        clusters.push(...unprocessed);
      }
    }

    return clusters;
  }

  /**
   * Calculate cluster radius based on zoom level
   */
  private getClusterRadius(zoom: number): number {
    // Decrease radius as zoom increases
    const baseRadius = this.options.radius;
    const zoomFactor = Math.pow(2, this.options.maxZoom - zoom);
    return baseRadius * zoomFactor;
  }

  /**
   * Calculate distance between two points in meters
   */
  private getDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate center point of multiple coordinates
   */
  private getCenterPoint(points: ClusterPoint[]): Coordinates {
    if (points.length === 1) {
      return {
        latitude: points[0].latitude,
        longitude: points[0].longitude,
      };
    }

    let totalLat = 0;
    let totalLng = 0;

    for (const point of points) {
      totalLat += point.latitude;
      totalLng += point.longitude;
    }

    return {
      latitude: totalLat / points.length,
      longitude: totalLng / points.length,
    };
  }

  /**
   * Get total number of points
   */
  getPointCount(): number {
    return this.points.length;
  }

  /**
   * Clear all points
   */
  clear(): void {
    this.points = [];
  }
}

/**
 * Viewport-based optimization for map rendering
 */
export class MapViewportOptimizer {
  private static readonly BASE_VIEWPORT_PADDING = 0.1; // 10% base padding around viewport

  /**
   * Calculate optimal bounds with adaptive padding (more padding when zoomed out and when zoomed in)
   */
  static getOptimalBounds(viewport: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }): [number, number, number, number] {
    // Increase padding both when zoomed out AND when zoomed in
    // When zoomed out (large delta), need padding to include more groups
    // When zoomed in (small delta), need padding to prevent precision issues from filtering out markers
    const zoomLevel = this.getZoomLevel(viewport.latitudeDelta);
    
    // Use very generous padding to ensure all visible groups are included in bounds
    // This prevents groups from disappearing when clusters split or combine (especially on iOS)
    let paddingMultiplier: number;
    if (zoomLevel < 10) {
      // Very zoomed out - use large padding
      paddingMultiplier = 0.5;
    } else {
      // For all other zoom levels, use very generous padding (150% = 2.5x viewport)
      // This ensures groups don't disappear when clusters change, especially during splits
      paddingMultiplier = 1.5; // 150% padding = bounds are 2.5x the viewport size
    }
    
    const latPadding = viewport.latitudeDelta * paddingMultiplier;
    const lngPadding = viewport.longitudeDelta * paddingMultiplier;

    return [
      viewport.longitude - viewport.longitudeDelta / 2 - lngPadding, // west
      viewport.latitude - viewport.latitudeDelta / 2 - latPadding, // south
      viewport.longitude + viewport.longitudeDelta / 2 + lngPadding, // east
      viewport.latitude + viewport.latitudeDelta / 2 + latPadding, // north
    ];
  }

  /**
   * Determine if viewport has changed significantly
   */
  static hasSignificantChange(
    oldViewport: any,
    newViewport: any,
    threshold: number = 0.1
  ): boolean {
    if (!oldViewport || !newViewport) return true;

    const latChange = Math.abs(oldViewport.latitude - newViewport.latitude);
    const lngChange = Math.abs(oldViewport.longitude - newViewport.longitude);
    const latDeltaChange = Math.abs(
      oldViewport.latitudeDelta - newViewport.latitudeDelta
    );
    const lngDeltaChange = Math.abs(
      oldViewport.longitudeDelta - newViewport.longitudeDelta
    );

    return (
      latChange > oldViewport.latitudeDelta * threshold ||
      lngChange > oldViewport.longitudeDelta * threshold ||
      latDeltaChange > oldViewport.latitudeDelta * threshold ||
      lngDeltaChange > oldViewport.longitudeDelta * threshold
    );
  }

  /**
   * Calculate zoom level from latitude delta
   */
  static getZoomLevel(latitudeDelta: number): number {
    return Math.round(Math.log(360 / latitudeDelta) / Math.LN2);
  }
}

/**
 * Performance monitoring for map operations
 */
export class MapPerformanceMonitor {
  private static metrics: {
    clusteringTime: number[];
    renderTime: number[];
    pointCount: number[];
  } = {
    clusteringTime: [],
    renderTime: [],
    pointCount: [],
  };

  static startClustering(): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      this.metrics.clusteringTime.push(endTime - startTime);

      // Keep only last 100 measurements
      if (this.metrics.clusteringTime.length > 100) {
        this.metrics.clusteringTime.shift();
      }
    };
  }

  static startRendering(): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      this.metrics.renderTime.push(endTime - startTime);

      // Keep only last 100 measurements
      if (this.metrics.renderTime.length > 100) {
        this.metrics.renderTime.shift();
      }
    };
  }

  static recordPointCount(count: number): void {
    this.metrics.pointCount.push(count);

    // Keep only last 100 measurements
    if (this.metrics.pointCount.length > 100) {
      this.metrics.pointCount.shift();
    }
  }

  static getAverageClusteringTime(): number {
    const times = this.metrics.clusteringTime;
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  static getAverageRenderTime(): number {
    const times = this.metrics.renderTime;
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  static getAveragePointCount(): number {
    const counts = this.metrics.pointCount;
    return counts.length > 0
      ? counts.reduce((a, b) => a + b, 0) / counts.length
      : 0;
  }

  static getPerformanceReport(): {
    avgClusteringTime: number;
    avgRenderTime: number;
    avgPointCount: number;
    totalMeasurements: number;
  } {
    return {
      avgClusteringTime: this.getAverageClusteringTime(),
      avgRenderTime: this.getAverageRenderTime(),
      avgPointCount: this.getAveragePointCount(),
      totalMeasurements: this.metrics.clusteringTime.length,
    };
  }

  static clearMetrics(): void {
    this.metrics.clusteringTime = [];
    this.metrics.renderTime = [];
    this.metrics.pointCount = [];
  }
}

/**
 * Create optimized map clusterer with performance monitoring
 */
export function createOptimizedMapClusterer(
  options: Partial<ClusteringOptions> = {}
): MapClusterer {
  return new MapClusterer(options);
}
