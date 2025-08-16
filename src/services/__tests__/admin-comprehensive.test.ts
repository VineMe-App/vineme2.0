import { groupAdminService, userAdminService } from '../admin';
import { permissionService } from '../permissions';
import { supabase } from '../supabase';

// Mock dependencies
jest.mock('../supabase', () => ({
  supabase: global.mockSupabaseClient,
}));

jest.mock('../permissions');

const mockSupabase = global.mockSupabaseClient;
const mockPermissionService = permissionService as jest.Mocked<typeof permissionService>;

describe('Admin Services - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock supabase client
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });
  });

  describe('GroupAdminService - Pagination Tests', () => {
    it('should handle paginated church groups request', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      const mockGroups = [
        {
          id: '1',
          title: 'Test Group 1',
          status: 'approved',
          church_id: 'church1',
          memberships: [{ id: '1', status: 'active' }],
        },
        {
          id: '2',
          title: 'Test Group 2',
          status: 'pending',
          church_id: 'church1',
          memberships: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockGroups,
          error: null,
          count: 10,
        }),
      } as any);

      const pagination = { offset: 0, limit: 5 };
      const result = await groupAdminService.getChurchGroups('church1', false, pagination);

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('data');
      expect(result.data).toHaveProperty('pagination');
      expect((result.data as any).data).toHaveLength(2);
      expect((result.data as any).pagination.total).toBe(10);
      expect((result.data as any).pagination.hasMore).toBe(true);
    });

    it('should handle pagination with no results', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      } as any);

      const pagination = { offset: 0, limit: 5 };
      const result = await groupAdminService.getChurchGroups('church1', false, pagination);

      expect(result.error).toBeNull();
      expect((result.data as any).data).toHaveLength(0);
      expect((result.data as any).pagination.total).toBe(0);
      expect((result.data as any).pagination.hasMore).toBe(false);
    });
  });

  describe('GroupAdminService - Edge Cases', () => {
    it('should handle concurrent approval attempts', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock group already approved by another admin
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group1', status: 'approved', church_id: 'church1' },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await groupAdminService.approveGroup('group1', 'admin1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Group is not pending approval');
      expect(result.data).toBeNull();
    });

    it('should handle database constraint violations', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock existing group check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group1', status: 'pending', church_id: 'church1' },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock constraint violation
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Foreign key constraint violation' },
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupAdminService.approveGroup('group1', 'admin1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Foreign key constraint violation');
      expect(result.data).toBeNull();
    });

    it('should handle network timeouts gracefully', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock network timeout
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Network timeout')),
          }),
        }),
      } as any);

      const result = await groupAdminService.approveGroup('group1', 'admin1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Network timeout');
      expect(result.data).toBeNull();
    });
  });

  describe('UserAdminService - Comprehensive Tests', () => {
    it('should handle paginated users with filtering', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      const mockUsers = [
        {
          id: 'user1',
          name: 'Connected User',
          church_id: 'church1',
          group_memberships: [
            { id: 'mem1', status: 'active', group: { status: 'approved' } },
          ],
        },
        {
          id: 'user2',
          name: 'Unconnected User',
          church_id: 'church1',
          group_memberships: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
          count: 2,
        }),
      } as any);

      const pagination = { offset: 0, limit: 10 };
      const result = await userAdminService.getChurchUsers('church1', pagination, 'connected');

      expect(result.error).toBeNull();
      expect(result.data).toHaveProperty('data');
      expect((result.data as any).data).toHaveLength(1); // Only connected user after filtering
      expect((result.data as any).data[0].is_connected).toBe(true);
    });

    it('should calculate user statistics correctly', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });

      const mockUsers = [
        { id: 'user1', is_connected: true },
        { id: 'user2', is_connected: false },
        { id: 'user3', is_connected: true },
        { id: 'user4', is_connected: false },
      ];

      jest.spyOn(userAdminService, 'getChurchUsers').mockResolvedValue({
        data: mockUsers as any,
        error: null,
      });

      // Mock groups query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'group1' }, { id: 'group2' }, { id: 'group3' }],
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock pending requests query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'req1' }, { id: 'req2' }],
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await userAdminService.getChurchSummary('church1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        total_users: 4,
        connected_users: 2,
        unconnected_users: 2,
        active_groups: 3,
        pending_requests: 2,
      });
    });

    it('should handle user group history with complex memberships', async () => {
      mockPermissionService.canModifyResource.mockResolvedValue({
        hasPermission: true,
      });

      const mockHistory = [
        {
          id: 'mem1',
          user_id: 'user1',
          group_id: 'group1',
          status: 'active',
          role: 'leader',
          joined_at: '2024-01-01T00:00:00Z',
          group: { id: 'group1', title: 'Current Group', status: 'approved' },
        },
        {
          id: 'mem2',
          user_id: 'user1',
          group_id: 'group2',
          status: 'inactive',
          role: 'member',
          joined_at: '2023-06-01T00:00:00Z',
          group: { id: 'group2', title: 'Former Group', status: 'closed' },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockHistory,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await userAdminService.getUserGroupHistory('user1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data![0].status).toBe('active');
      expect(result.data![0].role).toBe('leader');
      expect(result.data![1].status).toBe('inactive');
    });
  });

  describe('Permission Enforcement Tests', () => {
    it('should enforce church-scoped data access', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: false,
        reason: 'User does not belong to this church',
      });

      const result = await groupAdminService.getChurchGroups('other-church');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('User does not belong to this church');
      expect(result.data).toBeNull();
    });

    it('should validate admin role before allowing group management', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: false,
        reason: 'User does not have church_admin role',
      });

      const result = await groupAdminService.approveGroup('group1', 'user1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('User does not have church_admin role');
      expect(result.data).toBeNull();
    });

    it('should validate group leadership before allowing join request management', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: false,
        reason: 'User is not a leader of this group',
      });

      const result = await groupAdminService.getGroupRequests('group1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('User is not a leader of this group');
      expect(result.data).toBeNull();
    });
  });

  describe('Data Consistency Tests', () => {
    it('should maintain referential integrity when approving groups', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock group exists and is pending
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group1', status: 'pending', church_id: 'church1' },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock successful update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'group1', status: 'approved', updated_at: '2024-01-01T00:00:00Z' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupAdminService.approveGroup('group1', 'admin1');

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.status).toBe('approved');
      expect(result.data!.updated_at).toBeTruthy();
    });

    it('should handle member count calculations correctly', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      const mockGroups = [
        {
          id: '1',
          title: 'Group with Mixed Memberships',
          status: 'approved',
          church_id: 'church1',
          memberships: [
            { id: '1', status: 'active' },
            { id: '2', status: 'active' },
            { id: '3', status: 'pending' },
            { id: '4', status: 'inactive' },
          ],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockGroups,
          error: null,
        }),
      } as any);

      const result = await groupAdminService.getChurchGroups('church1', true);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].member_count).toBe(2); // Only active memberships
    });
  });

  describe('Error Recovery Tests', () => {
    it('should handle partial failures in batch operations gracefully', async () => {
      // This would be tested in integration tests with actual batch operations
      // For now, we test individual operation error handling
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock intermittent database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Connection lost')),
          }),
        }),
      } as any);

      const result = await groupAdminService.approveGroup('group1', 'admin1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Connection lost');
      expect(result.data).toBeNull();
    });

    it('should handle malformed data gracefully', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock malformed response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              title: null, // Invalid data
              status: 'approved',
              church_id: 'church1',
              memberships: null, // Invalid data
            },
          ],
          error: null,
        }),
      } as any);

      const result = await groupAdminService.getChurchGroups('church1', true);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].member_count).toBe(0); // Should handle null memberships
    });
  });
});