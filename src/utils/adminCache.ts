/**
 * Caching strategies for admin features
 */

import { QueryClient } from '@tanstack/react-query';

export interface CacheConfig {
  staleTime: number;
  cacheTime: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
}

/**
 * Cache configurations for different admin data types
 */
export const ADMIN_CACHE_CONFIGS = {
  // Church groups - moderate refresh rate
  CHURCH_GROUPS: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  } as CacheConfig,

  // Church users - slower refresh rate
  CHURCH_USERS: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  } as CacheConfig,

  // Church summary - frequent updates
  CHURCH_SUMMARY: {
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  } as CacheConfig,

  // Join requests - real-time updates
  JOIN_REQUESTS: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  } as CacheConfig,

  // Group details - moderate refresh
  GROUP_DETAILS: {
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  } as CacheConfig,

  // User details - slower refresh
  USER_DETAILS: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  } as CacheConfig,

  // Map data - longer cache for location data
  MAP_DATA: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  } as CacheConfig,
} as const;

/**
 * Query key factories for consistent cache keys
 */
export const ADMIN_QUERY_KEYS = {
  // Church-level queries
  churchGroups: (churchId: string, includeAll?: boolean) =>
    ['admin', 'church-groups', churchId, { includeAll }] as const,

  churchUsers: (churchId: string, filter?: string) =>
    ['admin', 'church-users', churchId, { filter }] as const,

  churchSummary: (churchId: string) =>
    ['admin', 'church-summary', churchId] as const,

  // Group-level queries
  groupDetails: (groupId: string) =>
    ['admin', 'group-details', groupId] as const,

  groupMembers: (groupId: string) =>
    ['admin', 'group-members', groupId] as const,

  groupRequests: (groupId: string) =>
    ['admin', 'group-requests', groupId] as const,

  // User-level queries
  userDetails: (userId: string) => ['admin', 'user-details', userId] as const,

  userGroups: (userId: string) => ['admin', 'user-groups', userId] as const,

  // Map queries
  mapGroups: (churchId: string, bounds?: any) =>
    ['admin', 'map-groups', churchId, bounds] as const,

  // Paginated queries
  paginatedGroups: (
    churchId: string,
    page: number,
    limit: number,
    filters?: any
  ) =>
    ['admin', 'paginated-groups', churchId, { page, limit, filters }] as const,

  paginatedUsers: (
    churchId: string,
    page: number,
    limit: number,
    filters?: any
  ) =>
    ['admin', 'paginated-users', churchId, { page, limit, filters }] as const,
} as const;

/**
 * Cache invalidation utilities
 */
export class AdminCacheManager {
  constructor(private queryClient: QueryClient) {}

  /**
   * Invalidate all church-related data
   */
  async invalidateChurchData(churchId: string): Promise<void> {
    await Promise.all([
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'church-groups', churchId],
      }),
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'church-users', churchId],
      }),
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'church-summary', churchId],
      }),
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'map-groups', churchId],
      }),
    ]);
  }

  /**
   * Invalidate group-related data
   */
  async invalidateGroupData(groupId: string): Promise<void> {
    await Promise.all([
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'group-details', groupId],
      }),
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'group-members', groupId],
      }),
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'group-requests', groupId],
      }),
    ]);
  }

  /**
   * Invalidate user-related data
   */
  async invalidateUserData(userId: string): Promise<void> {
    await Promise.all([
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'user-details', userId],
      }),
      this.queryClient.invalidateQueries({
        queryKey: ['admin', 'user-groups', userId],
      }),
    ]);
  }

  /**
   * Optimistically update group status
   */
  optimisticallyUpdateGroupStatus(
    churchId: string,
    groupId: string,
    newStatus: string
  ): void {
    const queryKey = ADMIN_QUERY_KEYS.churchGroups(churchId, true);

    this.queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;

      return oldData.map((group: any) =>
        group.id === groupId
          ? {
              ...group,
              status: newStatus,
              updated_at: new Date().toISOString(),
            }
          : group
      );
    });
  }

  /**
   * Optimistically update group member count
   */
  optimisticallyUpdateMemberCount(
    churchId: string,
    groupId: string,
    delta: number
  ): void {
    const queryKey = ADMIN_QUERY_KEYS.churchGroups(churchId, true);

    this.queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;

      return oldData.map((group: any) =>
        group.id === groupId
          ? {
              ...group,
              member_count: Math.max(0, (group.member_count || 0) + delta),
            }
          : group
      );
    });
  }

  /**
   * Prefetch related data
   */
  async prefetchGroupDetails(groupId: string): Promise<void> {
    // This would be implemented with actual service calls
    // For now, just mark the intent
    console.log(`Prefetching group details for ${groupId}`);
  }

  /**
   * Background sync for admin data
   */
  startBackgroundSync(
    churchId: string,
    interval: number = 5 * 60 * 1000
  ): () => void {
    const syncInterval = setInterval(async () => {
      try {
        // Silently refetch critical admin data
        await Promise.all([
          this.queryClient.refetchQueries({
            queryKey: ADMIN_QUERY_KEYS.churchSummary(churchId),
            type: 'active',
          }),
          this.queryClient.refetchQueries({
            queryKey: ['admin', 'group-requests'],
            type: 'active',
          }),
        ]);
      } catch (error) {
        console.warn('Background sync failed:', error);
      }
    }, interval);

    // Return cleanup function
    return () => clearInterval(syncInterval);
  }

  /**
   * Clear all admin cache
   */
  async clearAdminCache(): Promise<void> {
    await this.queryClient.invalidateQueries({
      queryKey: ['admin'],
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalQueries: number;
    adminQueries: number;
    staleQueries: number;
  } {
    const cache = this.queryClient.getQueryCache();
    const allQueries = cache.getAll();
    const adminQueries = allQueries.filter(
      (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'admin'
    );
    const staleQueries = adminQueries.filter((query) => query.isStale());

    return {
      totalQueries: allQueries.length,
      adminQueries: adminQueries.length,
      staleQueries: staleQueries.length,
    };
  }
}

/**
 * Create admin cache manager instance
 */
export function createAdminCacheManager(
  queryClient: QueryClient
): AdminCacheManager {
  return new AdminCacheManager(queryClient);
}

/**
 * Memory-based cache for frequently accessed data
 */
class MemoryCache<T> {
  private cache = new Map<
    string,
    { data: T; timestamp: number; ttl: number }
  >();

  set(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

/**
 * Global memory cache instances for admin data
 */
export const adminMemoryCache = {
  geocoding: new MemoryCache<{ lat: number; lng: number }>(),
  permissions: new MemoryCache<boolean>(),
  userRoles: new MemoryCache<string[]>(),
};
