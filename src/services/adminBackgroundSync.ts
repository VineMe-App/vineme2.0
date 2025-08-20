/**
 * Background sync service for admin data updates
 */

import { QueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import { adminServiceWrapper } from './adminServiceWrapper';
import { ADMIN_QUERY_KEYS, createAdminCacheManager } from '../utils/adminCache';

export interface BackgroundSyncOptions {
  interval: number; // Sync interval in milliseconds
  enabledWhenInactive?: boolean; // Continue syncing when app is in background
  maxRetries?: number;
  retryDelay?: number;
}

export interface SyncStatus {
  isActive: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  failureCount: number;
  lastError: Error | null;
}

const DEFAULT_SYNC_OPTIONS: BackgroundSyncOptions = {
  interval: 5 * 60 * 1000, // 5 minutes
  enabledWhenInactive: false,
  maxRetries: 3,
  retryDelay: 30 * 1000, // 30 seconds
};

/**
 * Background sync manager for admin data
 */
export class AdminBackgroundSync {
  private queryClient: QueryClient;
  private cacheManager: ReturnType<typeof createAdminCacheManager>;
  private options: BackgroundSyncOptions;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private isActive = false;
  private status: SyncStatus = {
    isActive: false,
    lastSync: null,
    nextSync: null,
    failureCount: 0,
    lastError: null,
  };

  constructor(
    queryClient: QueryClient,
    options: Partial<BackgroundSyncOptions> = {}
  ) {
    this.queryClient = queryClient;
    this.cacheManager = createAdminCacheManager(queryClient);
    this.options = { ...DEFAULT_SYNC_OPTIONS, ...options };

    this.setupAppStateListener();
  }

  /**
   * Start background sync
   */
  start(churchId: string): void {
    if (this.isActive) {
      console.warn('Background sync is already active');
      return;
    }

    this.isActive = true;
    this.status.isActive = true;
    this.status.failureCount = 0;
    this.status.lastError = null;

    console.log('Starting admin background sync', {
      interval: this.options.interval,
      churchId,
    });

    this.scheduleNextSync(churchId);
  }

  /**
   * Stop background sync
   */
  stop(): void {
    if (!this.isActive) return;

    console.log('Stopping admin background sync');

    this.isActive = false;
    this.status.isActive = false;
    this.status.nextSync = null;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Force immediate sync
   */
  async syncNow(churchId: string): Promise<void> {
    if (!churchId) {
      throw new Error('Church ID is required for sync');
    }

    console.log('Performing immediate admin data sync');
    await this.performSync(churchId);
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Setup app state listener to pause/resume sync
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (!this.isActive) return;

    if (nextAppState === 'background' && !this.options.enabledWhenInactive) {
      console.log('App backgrounded, pausing admin sync');
      this.pauseSync();
    } else if (nextAppState === 'active') {
      console.log('App foregrounded, resuming admin sync');
      this.resumeSync();
    }
  }

  /**
   * Pause sync (but don't stop completely)
   */
  private pauseSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Resume sync after pause
   */
  private resumeSync(): void {
    if (this.isActive && !this.syncInterval) {
      // Get church ID from current queries
      const churchId = this.getCurrentChurchId();
      if (churchId) {
        this.scheduleNextSync(churchId);
      }
    }
  }

  /**
   * Schedule next sync
   */
  private scheduleNextSync(churchId: string): void {
    if (!this.isActive) return;

    const nextSyncTime = new Date(Date.now() + this.options.interval);
    this.status.nextSync = nextSyncTime;

    this.syncInterval = setTimeout(async () => {
      await this.performSync(churchId);
      if (this.isActive) {
        this.scheduleNextSync(churchId);
      }
    }, this.options.interval);
  }

  /**
   * Perform the actual sync operation
   */
  private async performSync(churchId: string): Promise<void> {
    try {
      console.log('Performing admin background sync for church:', churchId);

      // Sync critical admin data in parallel
      const syncPromises = [
        this.syncChurchSummary(churchId),
        this.syncPendingRequests(churchId),
        this.syncRecentActivity(churchId),
      ];

      await Promise.allSettled(syncPromises);

      // Update status
      this.status.lastSync = new Date();
      this.status.failureCount = 0;
      this.status.lastError = null;

      console.log('Admin background sync completed successfully');
    } catch (error) {
      console.error('Admin background sync failed:', error);

      this.status.failureCount++;
      this.status.lastError =
        error instanceof Error ? error : new Error('Sync failed');

      // Retry with exponential backoff if under retry limit
      if (this.status.failureCount <= (this.options.maxRetries || 3)) {
        const retryDelay =
          (this.options.retryDelay || 30000) *
          Math.pow(2, this.status.failureCount - 1);

        console.log(
          `Retrying admin sync in ${retryDelay}ms (attempt ${this.status.failureCount})`
        );

        this.retryTimeout = setTimeout(() => {
          this.performSync(churchId);
        }, retryDelay);
      } else {
        console.error('Max retry attempts reached for admin sync');
      }
    }
  }

  /**
   * Sync church summary data
   */
  private async syncChurchSummary(churchId: string): Promise<void> {
    try {
      const result = await adminServiceWrapper.getChurchSummary(churchId, {
        context: { source: 'background-sync', type: 'summary' },
      });

      if (result.data) {
        // Update cache with fresh data
        this.queryClient.setQueryData(
          ADMIN_QUERY_KEYS.churchSummary(churchId),
          result.data
        );
      }
    } catch (error) {
      console.warn('Failed to sync church summary:', error);
      // Don't throw - let other syncs continue
    }
  }

  /**
   * Sync pending requests data
   */
  private async syncPendingRequests(churchId: string): Promise<void> {
    try {
      // Get all groups to check for pending requests
      const groupsResult = await adminServiceWrapper.getChurchGroups(
        churchId,
        true,
        { context: { source: 'background-sync', type: 'pending-requests' } }
      );

      if (groupsResult.data) {
        // Update groups cache
        this.queryClient.setQueryData(
          ADMIN_QUERY_KEYS.churchGroups(churchId, true),
          groupsResult.data
        );

        // Sync individual group requests for groups with pending status
        const pendingGroups = Array.isArray(groupsResult.data)
          ? groupsResult.data.filter((group) => group.status === 'pending')
          : [];

        for (const group of pendingGroups) {
          try {
            const requestsResult = await adminServiceWrapper.getGroupRequests(
              group.id,
              { context: { source: 'background-sync', type: 'group-requests' } }
            );

            if (requestsResult.data) {
              this.queryClient.setQueryData(
                ADMIN_QUERY_KEYS.groupRequests(group.id),
                requestsResult.data
              );
            }
          } catch (error) {
            console.warn(
              `Failed to sync requests for group ${group.id}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.warn('Failed to sync pending requests:', error);
    }
  }

  /**
   * Sync recent activity data
   */
  private async syncRecentActivity(churchId: string): Promise<void> {
    try {
      // This could include recent user activity, new memberships, etc.
      // For now, we'll just refresh the users data
      const usersResult = await adminServiceWrapper.getChurchUsers(churchId, {
        context: { source: 'background-sync', type: 'recent-activity' },
      });

      if (usersResult.data) {
        this.queryClient.setQueryData(
          ADMIN_QUERY_KEYS.churchUsers(churchId),
          usersResult.data
        );
      }
    } catch (error) {
      console.warn('Failed to sync recent activity:', error);
    }
  }

  /**
   * Get current church ID from query cache
   */
  private getCurrentChurchId(): string | null {
    // Look for church ID in existing queries
    const queries = this.queryClient.getQueryCache().getAll();

    for (const query of queries) {
      if (Array.isArray(query.queryKey) && query.queryKey[0] === 'admin') {
        const churchId = query.queryKey[2];
        if (typeof churchId === 'string') {
          return churchId;
        }
      }
    }

    return null;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

/**
 * Global background sync instance
 */
let globalBackgroundSync: AdminBackgroundSync | null = null;

/**
 * Initialize background sync
 */
export function initializeAdminBackgroundSync(
  queryClient: QueryClient,
  options?: Partial<BackgroundSyncOptions>
): AdminBackgroundSync {
  if (globalBackgroundSync) {
    globalBackgroundSync.destroy();
  }

  globalBackgroundSync = new AdminBackgroundSync(queryClient, options);
  return globalBackgroundSync;
}

/**
 * Get global background sync instance
 */
export function getAdminBackgroundSync(): AdminBackgroundSync | null {
  return globalBackgroundSync;
}

/**
 * Start background sync for a church
 */
export function startAdminBackgroundSync(churchId: string): void {
  if (globalBackgroundSync) {
    globalBackgroundSync.start(churchId);
  } else {
    console.warn(
      'Background sync not initialized. Call initializeAdminBackgroundSync first.'
    );
  }
}

/**
 * Stop background sync
 */
export function stopAdminBackgroundSync(): void {
  if (globalBackgroundSync) {
    globalBackgroundSync.stop();
  }
}

/**
 * Hook for using background sync in components
 */
export function useAdminBackgroundSync(churchId?: string) {
  const [status, setStatus] = React.useState<SyncStatus>({
    isActive: false,
    lastSync: null,
    nextSync: null,
    failureCount: 0,
    lastError: null,
  });

  React.useEffect(() => {
    if (!globalBackgroundSync) return;

    // Update status periodically
    const statusInterval = setInterval(() => {
      setStatus(globalBackgroundSync!.getStatus());
    }, 1000);

    return () => clearInterval(statusInterval);
  }, []);

  const start = React.useCallback(() => {
    if (churchId && globalBackgroundSync) {
      globalBackgroundSync.start(churchId);
    }
  }, [churchId]);

  const stop = React.useCallback(() => {
    if (globalBackgroundSync) {
      globalBackgroundSync.stop();
    }
  }, []);

  const syncNow = React.useCallback(async () => {
    if (churchId && globalBackgroundSync) {
      await globalBackgroundSync.syncNow(churchId);
    }
  }, [churchId]);

  return {
    status,
    start,
    stop,
    syncNow,
    isAvailable: !!globalBackgroundSync,
  };
}

// Fix missing import
import React from 'react';
