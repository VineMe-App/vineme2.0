import { supabase } from './supabase';
import { authService } from './auth';
import type { DatabaseUser } from '../types/database';

export type UserRole = 'user' | 'church_admin' | 'group_leader' | 'superadmin';
export type Permission = 
  | 'read_own_data'
  | 'update_own_data'
  | 'read_church_data'
  | 'manage_church_events'
  | 'manage_church_groups'
  | 'manage_church_users'
  | 'manage_group_details'
  | 'manage_group_members'
  | 'create_groups'
  | 'manage_all_data';

export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
}

export class PermissionService {
  private userCache: Map<string, DatabaseUser> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current user with caching
   */
  private async getCurrentUserWithCache(): Promise<DatabaseUser | null> {
    try {
      const authUser = await authService.getCurrentUser();
      if (!authUser) return null;

      const now = Date.now();
      const cached = this.userCache.get(authUser.id);
      const expiry = this.cacheExpiry.get(authUser.id);

      if (cached && expiry && now < expiry) {
        return cached;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !data) return null;

      // Cache the user data
      this.userCache.set(authUser.id, data);
      this.cacheExpiry.set(authUser.id, now + this.CACHE_DURATION);

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Clear user cache (call after role changes)
   */
  clearUserCache(userId?: string): void {
    if (userId) {
      this.userCache.delete(userId);
      this.cacheExpiry.delete(userId);
    } else {
      this.userCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(role: UserRole): Promise<boolean> {
    const user = await this.getCurrentUserWithCache();
    if (!user) return false;

    return user.roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(roles: UserRole[]): Promise<boolean> {
    const user = await this.getCurrentUserWithCache();
    if (!user) return false;

    return roles.some(role => user.roles.includes(role));
  }

  /**
   * Check if user has permission for a specific action
   */
  async hasPermission(permission: Permission, resourceId?: string): Promise<PermissionCheck> {
    const user = await this.getCurrentUserWithCache();
    
    if (!user) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    // Superadmin has all permissions
    if (user.roles.includes('superadmin')) {
      return { hasPermission: true };
    }

    switch (permission) {
      case 'read_own_data':
      case 'update_own_data':
        // All authenticated users can read/update their own data
        return { hasPermission: true };

      case 'read_church_data':
        // Members can read data from their church
        if (user.church_id) {
          return { hasPermission: true };
        }
        return { hasPermission: false, reason: 'User not associated with a church' };

      case 'manage_church_events':
      case 'manage_church_groups':
      case 'manage_church_users':
        // Church admins can manage their church's data
        if (user.roles.includes('church_admin') && user.church_id) {
          return { hasPermission: true };
        }
        return { hasPermission: false, reason: 'Insufficient permissions for church management' };

      case 'create_groups':
        // All authenticated users can create groups (subject to approval)
        if (user.church_id) {
          return { hasPermission: true };
        }
        return { hasPermission: false, reason: 'User must be associated with a church to create groups' };

      case 'manage_group_details':
      case 'manage_group_members':
        // Group leaders can manage their groups, church admins can manage all groups in their church
        if (user.roles.includes('church_admin') && user.church_id) {
          return { hasPermission: true };
        }
        // For specific group permissions, we need to check group leadership in canManageGroupMembership
        return { hasPermission: true }; // Will be validated at the group level

      case 'manage_all_data':
        // Only superadmin can manage all data
        return { hasPermission: false, reason: 'Superadmin access required' };

      default:
        return { hasPermission: false, reason: 'Unknown permission' };
    }
  }

  /**
   * Check if user can access a specific church's data
   */
  async canAccessChurchData(churchId: string): Promise<PermissionCheck> {
    const user = await this.getCurrentUserWithCache();
    
    if (!user) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    // Superadmin can access all church data
    if (user.roles.includes('superadmin')) {
      return { hasPermission: true };
    }

    // Users can access their own church's data
    if (user.church_id === churchId) {
      return { hasPermission: true };
    }

    return { hasPermission: false, reason: 'Access denied to church data' };
  }

  /**
   * Check if user can modify a specific resource
   */
  async canModifyResource(resourceType: 'user' | 'group' | 'event', resourceId: string, ownerId?: string): Promise<PermissionCheck> {
    const user = await this.getCurrentUserWithCache();
    
    if (!user) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    // Superadmin can modify anything
    if (user.roles.includes('superadmin')) {
      return { hasPermission: true };
    }

    // Users can modify their own resources
    if (ownerId === user.id) {
      return { hasPermission: true };
    }

    // Church admins can modify resources in their church
    if (user.roles.includes('church_admin') && user.church_id) {
      // For groups and events, check if they belong to the admin's church
      if (resourceType === 'group') {
        const { data: group } = await supabase
          .from('groups')
          .select('church_id')
          .eq('id', resourceId)
          .single();
        
        if (group && group.church_id.includes(user.church_id)) {
          return { hasPermission: true };
        }
      }

      if (resourceType === 'event') {
        const { data: event } = await supabase
          .from('events')
          .select('church_id')
          .eq('id', resourceId)
          .single();
        
        if (event && event.church_id === user.church_id) {
          return { hasPermission: true };
        }
      }

      if (resourceType === 'user') {
        const { data: targetUser } = await supabase
          .from('users')
          .select('church_id')
          .eq('id', resourceId)
          .single();
        
        if (targetUser && targetUser.church_id === user.church_id) {
          return { hasPermission: true };
        }
      }
    }

    return { hasPermission: false, reason: 'Insufficient permissions to modify resource' };
  }

  /**
   * Check if user can manage group memberships
   */
  async canManageGroupMembership(groupId: string, targetUserId?: string): Promise<PermissionCheck> {
    const user = await this.getCurrentUserWithCache();
    
    if (!user) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    // Users can always manage their own memberships
    if (targetUserId === user.id) {
      return { hasPermission: true };
    }

    // Check if user is a group leader or admin
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membership && (membership.role === 'leader' || membership.role === 'admin')) {
      return { hasPermission: true };
    }

    // Church admins can manage memberships in their church's groups
    if (user.roles.includes('church_admin') && user.church_id) {
      const { data: group } = await supabase
        .from('groups')
        .select('church_id')
        .eq('id', groupId)
        .single();
      
      if (group && group.church_id.includes(user.church_id)) {
        return { hasPermission: true };
      }
    }

    return { hasPermission: false, reason: 'Insufficient permissions to manage group membership' };
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(): Promise<Permission[]> {
    const user = await this.getCurrentUserWithCache();
    if (!user) return [];

    const permissions: Permission[] = ['read_own_data', 'update_own_data'];

    if (user.church_id) {
      permissions.push('read_church_data');
    }

    if (user.roles.includes('church_admin')) {
      permissions.push('manage_church_events', 'manage_church_groups', 'manage_church_users');
    }

    // All users can create groups if they're in a church
    if (user.church_id) {
      permissions.push('create_groups');
    }

    // Group leaders get group management permissions (specific groups checked at runtime)
    permissions.push('manage_group_details', 'manage_group_members');

    if (user.roles.includes('superadmin')) {
      permissions.push('manage_all_data');
    }

    return permissions;
  }

  /**
   * Validate RLS compliance for a query
   */
  async validateRLSCompliance(table: string, operation: 'select' | 'insert' | 'update' | 'delete', filters: Record<string, any> = {}): Promise<PermissionCheck> {
    const user = await this.getCurrentUserWithCache();
    
    if (!user) {
      return { hasPermission: false, reason: 'User not authenticated' };
    }

    // Superadmin bypasses most RLS checks (but should still respect them in practice)
    if (user.roles.includes('superadmin')) {
      return { hasPermission: true };
    }

    switch (table) {
      case 'users':
        if (operation === 'select' || operation === 'update') {
          // Users can only access their own data or users from their church
          if (filters.id === user.id || (user.church_id && filters.church_id === user.church_id)) {
            return { hasPermission: true };
          }
        }
        break;

      case 'groups':
        if (operation === 'select') {
          // Users can view groups from their church
          if (user.church_id && filters.church_id?.includes(user.church_id)) {
            return { hasPermission: true };
          }
        }
        break;

      case 'events':
        if (operation === 'select') {
          // Users can view public events from their church
          if (user.church_id && filters.church_id === user.church_id && filters.is_public !== false) {
            return { hasPermission: true };
          }
        }
        break;

      case 'group_memberships':
        if (operation === 'insert' && filters.user_id === user.id) {
          // Users can create their own memberships
          return { hasPermission: true };
        }
        if ((operation === 'select' || operation === 'update') && filters.user_id === user.id) {
          // Users can view/update their own memberships
          return { hasPermission: true };
        }
        break;

      case 'friendships':
        if (operation === 'insert' && filters.user_id === user.id) {
          // Users can create friendships where they are the requester
          return { hasPermission: true };
        }
        if (operation === 'select' && (filters.user_id === user.id || filters.friend_id === user.id)) {
          // Users can view friendships they're involved in
          return { hasPermission: true };
        }
        break;

      case 'tickets':
        if (filters.user_id === user.id) {
          // Users can manage their own tickets
          return { hasPermission: true };
        }
        break;
    }

    return { hasPermission: false, reason: `RLS policy violation for ${table}.${operation}` };
  }
}

// Export singleton instance
export const permissionService = new PermissionService();