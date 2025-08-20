import { permissionService } from '../permissions';
import { supabase } from '../supabase';
import { authService } from '../auth';

// Mock dependencies
jest.mock('../supabase');
jest.mock('../auth');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Enhanced Permission System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permissionService.clearUserCache();
  });

  describe('Church Admin Permissions', () => {
    const mockChurchAdmin = {
      id: 'admin-1',
      email: 'admin@church.com',
      name: 'Church Admin',
      church_id: 'church-1',
      roles: ['church_admin'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@church.com',
      } as any);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockChurchAdmin,
              error: null,
            }),
          }),
        }),
      } as any);
    });

    it('should grant church admin permissions', async () => {
      const permissions = [
        'manage_church_groups',
        'manage_church_users',
        'approve_groups',
        'decline_groups',
        'close_groups',
        'view_admin_dashboard',
      ];

      for (const permission of permissions) {
        const result = await permissionService.hasPermission(permission as any);
        expect(result.hasPermission).toBe(true);
      }
    });

    it('should confirm church admin role', async () => {
      const result = await permissionService.isChurchAdmin();
      expect(result.hasPermission).toBe(true);
    });

    it('should allow access to church data', async () => {
      const result = await permissionService.canAccessChurchData('church-1');
      expect(result.hasPermission).toBe(true);
    });

    it('should deny access to other church data', async () => {
      const result = await permissionService.canAccessChurchData('church-2');
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('Access denied to church data');
    });
  });

  describe('Group Leader Permissions', () => {
    const mockGroupLeader = {
      id: 'leader-1',
      email: 'leader@church.com',
      name: 'Group Leader',
      church_id: 'church-1',
      roles: ['user'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'leader-1',
        email: 'leader@church.com',
      } as any);

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockGroupLeader,
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        if (table === 'group_memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { role: 'leader' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }

        return {} as any;
      });
    });

    it('should confirm group leadership for specific group', async () => {
      const result = await permissionService.isGroupLeader('group-1');
      expect(result.hasPermission).toBe(true);
    });

    it('should allow group management permissions for their group', async () => {
      const result =
        await permissionService.canManageGroupMembership('group-1');
      expect(result.hasPermission).toBe(true);
    });

    it('should deny church admin permissions', async () => {
      const result = await permissionService.isChurchAdmin();
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('not a church admin');
    });
  });

  describe('Regular User Permissions', () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@church.com',
      name: 'Regular User',
      church_id: 'church-1',
      roles: ['user'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@church.com',
      } as any);

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUser,
                  error: null,
                }),
              }),
            }),
          } as any;
        }

        if (table === 'group_memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'No membership found' },
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }

        return {} as any;
      });
    });

    it('should have basic user permissions', async () => {
      const basicPermissions = [
        'read_own_data',
        'update_own_data',
        'read_church_data',
      ];

      for (const permission of basicPermissions) {
        const result = await permissionService.hasPermission(permission as any);
        expect(result.hasPermission).toBe(true);
      }
    });

    it('should deny admin permissions', async () => {
      const adminPermissions = [
        'manage_church_groups',
        'manage_church_users',
        'approve_groups',
        'decline_groups',
        'close_groups',
        'view_admin_dashboard',
      ];

      for (const permission of adminPermissions) {
        const result = await permissionService.hasPermission(permission as any);
        expect(result.hasPermission).toBe(false);
        expect(result.reason).toContain('Church admin role required');
      }
    });

    it("should deny group leadership for groups they don't lead", async () => {
      const result = await permissionService.isGroupLeader('group-1');
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('not a leader of this group');
    });

    it('should deny church admin role', async () => {
      const result = await permissionService.isChurchAdmin();
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('not a church admin');
    });
  });

  describe('Superadmin Permissions', () => {
    const mockSuperadmin = {
      id: 'super-1',
      email: 'super@admin.com',
      name: 'Super Admin',
      church_id: 'church-1',
      roles: ['superadmin'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'super-1',
        email: 'super@admin.com',
      } as any);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSuperadmin,
              error: null,
            }),
          }),
        }),
      } as any);
    });

    it('should have all permissions', async () => {
      const allPermissions = [
        'read_own_data',
        'update_own_data',
        'read_church_data',
        'manage_church_groups',
        'manage_church_users',
        'approve_groups',
        'decline_groups',
        'close_groups',
        'view_admin_dashboard',
        'manage_group_details',
        'manage_group_members',
        'manage_join_requests',
        'promote_demote_members',
        'remove_group_members',
      ];

      for (const permission of allPermissions) {
        const result = await permissionService.hasPermission(permission as any);
        expect(result.hasPermission).toBe(true);
      }
    });

    it('should confirm superadmin roles', async () => {
      const churchAdminResult = await permissionService.isChurchAdmin();
      expect(churchAdminResult.hasPermission).toBe(true);

      const groupLeaderResult =
        await permissionService.isGroupLeader('any-group');
      expect(groupLeaderResult.hasPermission).toBe(true);
    });
  });

  describe('Unauthenticated User', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);
    });

    it('should deny all permissions', async () => {
      const result = await permissionService.hasPermission('read_own_data');
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toBe('User not authenticated');
    });

    it('should deny all role checks', async () => {
      const churchAdminResult = await permissionService.isChurchAdmin();
      expect(churchAdminResult.hasPermission).toBe(false);
      expect(churchAdminResult.reason).toBe('User not authenticated');

      const groupLeaderResult =
        await permissionService.isGroupLeader('group-1');
      expect(groupLeaderResult.hasPermission).toBe(false);
      expect(groupLeaderResult.reason).toBe('User not authenticated');
    });
  });

  describe('Permission Caching', () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@church.com',
      name: 'Test User',
      church_id: 'church-1',
      roles: ['church_admin'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@church.com',
      } as any);
    });

    it('should cache user data and reuse it', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      // First call should fetch from database
      await permissionService.hasPermission('manage_church_groups');
      expect(mockSelect).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await permissionService.hasPermission('manage_church_users');
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUser,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      // First call
      await permissionService.hasPermission('manage_church_groups');
      expect(mockSelect).toHaveBeenCalledTimes(1);

      // Clear cache
      permissionService.clearUserCache();

      // Second call should fetch from database again
      await permissionService.hasPermission('manage_church_users');
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});
