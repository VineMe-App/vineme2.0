import { useState, useEffect, useCallback } from 'react';
import {
  permissionService,
  type UserRole,
  type Permission,
  type PermissionCheck,
} from '../services/permissions';

interface UsePermissionsReturn {
  hasRole: (role: UserRole) => Promise<boolean>;
  hasAnyRole: (roles: UserRole[]) => Promise<boolean>;
  hasPermission: (
    permission: Permission,
    resourceId?: string
  ) => Promise<PermissionCheck>;
  canAccessChurchData: (churchId: string) => Promise<PermissionCheck>;
  canModifyResource: (
    resourceType: 'user' | 'group' | 'event',
    resourceId: string,
    ownerId?: string
  ) => Promise<PermissionCheck>;
  canManageGroupMembership: (
    groupId: string,
    targetUserId?: string
  ) => Promise<PermissionCheck>;
  isGroupLeader: (groupId: string) => Promise<PermissionCheck>;
  isChurchAdmin: () => Promise<PermissionCheck>;
  getUserPermissions: () => Promise<Permission[]>;
  clearCache: () => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for checking user permissions and roles
 */
export const usePermissions = (): UsePermissionsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (error: unknown, operation: string) => {
    const message =
      error instanceof Error ? error.message : `Failed to ${operation}`;
    setError(message);
    console.error(`Permission check error (${operation}):`, error);
  };

  const hasRole = useCallback(async (role: UserRole): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await permissionService.hasRole(role);
      return result;
    } catch (error) {
      handleError(error, 'check role');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasAnyRole = useCallback(
    async (roles: UserRole[]): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await permissionService.hasAnyRole(roles);
        return result;
      } catch (error) {
        handleError(error, 'check roles');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const hasPermission = useCallback(
    async (
      permission: Permission,
      resourceId?: string
    ): Promise<PermissionCheck> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await permissionService.hasPermission(
          permission,
          resourceId
        );
        return result;
      } catch (error) {
        handleError(error, 'check permission');
        return { hasPermission: false, reason: 'Permission check failed' };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const canAccessChurchData = useCallback(
    async (churchId: string): Promise<PermissionCheck> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await permissionService.canAccessChurchData(churchId);
        return result;
      } catch (error) {
        handleError(error, 'check church access');
        return { hasPermission: false, reason: 'Church access check failed' };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const canModifyResource = useCallback(
    async (
      resourceType: 'user' | 'group' | 'event',
      resourceId: string,
      ownerId?: string
    ): Promise<PermissionCheck> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await permissionService.canModifyResource(
          resourceType,
          resourceId,
          ownerId
        );
        return result;
      } catch (error) {
        handleError(error, 'check resource modification');
        return {
          hasPermission: false,
          reason: 'Resource modification check failed',
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const canManageGroupMembership = useCallback(
    async (
      groupId: string,
      targetUserId?: string
    ): Promise<PermissionCheck> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await permissionService.canManageGroupMembership(
          groupId,
          targetUserId
        );
        return result;
      } catch (error) {
        handleError(error, 'check group membership management');
        return {
          hasPermission: false,
          reason: 'Group membership check failed',
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getUserPermissions = useCallback(async (): Promise<Permission[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await permissionService.getUserPermissions();
      return result;
    } catch (error) {
      handleError(error, 'get user permissions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isGroupLeader = useCallback(
    async (groupId: string): Promise<PermissionCheck> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await permissionService.isGroupLeader(groupId);
        return result;
      } catch (error) {
        handleError(error, 'check group leadership');
        return {
          hasPermission: false,
          reason: 'Group leadership check failed',
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const isChurchAdmin = useCallback(async (): Promise<PermissionCheck> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await permissionService.isChurchAdmin();
      return result;
    } catch (error) {
      handleError(error, 'check church admin');
      return { hasPermission: false, reason: 'Church admin check failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    permissionService.clearUserCache();
  }, []);

  return {
    hasRole,
    hasAnyRole,
    hasPermission,
    canAccessChurchData,
    canModifyResource,
    canManageGroupMembership,
    isGroupLeader,
    isChurchAdmin,
    getUserPermissions,
    clearCache,
    isLoading,
    error,
  };
};

interface UseRoleCheckReturn {
  hasRole: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for checking a specific role with automatic updates
 */
export const useRoleCheck = (role: UserRole): UseRoleCheckReturn => {
  const [hasRole, setHasRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkRole();
  }, [role]);

  const checkRole = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await permissionService.hasRole(role);
      setHasRole(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to check role';
      setError(message);
      setHasRole(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { hasRole, isLoading, error };
};

interface UsePermissionCheckReturn {
  hasPermission: boolean;
  reason?: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for checking a specific permission with automatic updates
 */
export const usePermissionCheck = (
  permission: Permission,
  resourceId?: string
): UsePermissionCheckReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermission();
  }, [permission, resourceId]);

  const checkPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await permissionService.hasPermission(
        permission,
        resourceId
      );
      setHasPermission(result.hasPermission);
      setReason(result.reason);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to check permission';
      setError(message);
      setHasPermission(false);
      setReason('Permission check failed');
    } finally {
      setIsLoading(false);
    }
  };

  return { hasPermission, reason, isLoading, error };
};
