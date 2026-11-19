import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  permissionService,
  type UserRole,
  type Permission,
} from '../../services/permissions';

interface RoleBasedRenderProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: Permission[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL roles/permissions. If false, ANY will suffice.
}

/**
 * Component that conditionally renders children based on user roles and permissions
 */
export const RoleBasedRender: React.FC<RoleBasedRenderProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallback = null,
  requireAll = false,
}) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAccess();
  }, [requiredRoles, requiredPermissions, requireAll]);

  const checkAccess = async () => {
    setIsLoading(true);

    try {
      let roleAccess = true;
      let permissionAccess = true;

      // Check roles if specified
      if (requiredRoles.length > 0) {
        if (requireAll) {
          // User must have ALL required roles
          const roleChecks = await Promise.all(
            requiredRoles.map((role) => permissionService.hasRole(role))
          );
          roleAccess = roleChecks.every(Boolean);
        } else {
          // User must have ANY of the required roles
          roleAccess = await permissionService.hasAnyRole(requiredRoles);
        }
      }

      // Check permissions if specified
      if (requiredPermissions.length > 0) {
        if (requireAll) {
          // User must have ALL required permissions
          const permissionChecks = await Promise.all(
            requiredPermissions.map((permission) =>
              permissionService.hasPermission(permission)
            )
          );
          permissionAccess = permissionChecks.every(
            (check) => check.hasPermission
          );
        } else {
          // User must have ANY of the required permissions
          const permissionChecks = await Promise.all(
            requiredPermissions.map((permission) =>
              permissionService.hasPermission(permission)
            )
          );
          permissionAccess = permissionChecks.some(
            (check) => check.hasPermission
          );
        }
      }

      setHasAccess(roleAccess && permissionAccess);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // Return empty view while loading to avoid flickering
    return <View />;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for admin-only content
 */
export const AdminOnly: React.FC<AdminOnlyProps> = ({ children, fallback }) => (
  <RoleBasedRender
    requiredRoles={['church_admin', 'superadmin']}
    fallback={fallback}
  >
    {children}
  </RoleBasedRender>
);

interface SuperAdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for superadmin-only content
 */
export const SuperAdminOnly: React.FC<SuperAdminOnlyProps> = ({
  children,
  fallback,
}) => (
  <RoleBasedRender requiredRoles={['superadmin']} fallback={fallback}>
    {children}
  </RoleBasedRender>
);

interface ChurchMemberOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for church member content (users with a church_id)
 */
export const ChurchMemberOnly: React.FC<ChurchMemberOnlyProps> = ({
  children,
  fallback,
}) => (
  <RoleBasedRender
    requiredPermissions={['read_church_data']}
    fallback={fallback}
  >
    {children}
  </RoleBasedRender>
);

interface PermissionGateProps {
  children: React.ReactNode;
  permission: Permission;
  resourceId?: string;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for permission-based rendering
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  resourceId,
  fallback,
}) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkPermission();
  }, [permission, resourceId]);

  const checkPermission = async () => {
    setIsLoading(true);

    try {
      const result = await permissionService.hasPermission(
        permission,
        resourceId
      );
      setHasAccess(result.hasPermission);
    } catch (error) {
      console.error('Error checking permission:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <View />;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

interface GroupLeaderOnlyProps {
  children: React.ReactNode;
  groupId: string;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for group leader-only content
 */
export const GroupLeaderOnly: React.FC<GroupLeaderOnlyProps> = ({
  children,
  groupId,
  fallback,
}) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkGroupLeadership();
  }, [groupId]);

  const checkGroupLeadership = async () => {
    setIsLoading(true);

    try {
      const result = await permissionService.isGroupLeader(groupId);
      setHasAccess(result.hasPermission);
    } catch (error) {
      console.error('Error checking group leadership:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <View />;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

interface ChurchAdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Convenience component for church admin-only content
 */
export const ChurchAdminOnly: React.FC<ChurchAdminOnlyProps> = ({
  children,
  fallback,
}) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkChurchAdmin();
  }, []);

  const checkChurchAdmin = async () => {
    setIsLoading(true);

    try {
      const result = await permissionService.isChurchAdmin();
      setHasAccess(result.hasPermission);
    } catch (error) {
      console.error('Error checking church admin:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <View />;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};
