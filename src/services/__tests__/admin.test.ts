// Mock the supabase module before importing anything else
jest.mock('../supabase', () => ({
  supabase: global.mockSupabaseClient
}));

jest.mock('../permissions');

import { groupAdminService, userAdminService } from '../admin';
import { permissionService } from '../permissions';

const mockSupabase = global.mockSupabaseClient;
const mockPermissionService = permissionService as jest.Mocked<typeof permissionService>;

describe('GroupAdminService', () => {
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
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });
  });

  describe('getChurchGroups', () => {
    it('should return church groups when user has permission', async () => {
      // Mock permission checks
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      // Mock database response
      const mockGroups = [
        {
          id: '1',
          title: 'Test Group',
          status: 'approved',
          church_id: 'church1',
          memberships: [
            { id: '1', status: 'active' },
            { id: '2', status: 'active' }
          ]
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockGroups,
          error: null
        })
      } as any);

      const result = await groupAdminService.getChurchGroups('church1', true);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].member_count).toBe(2);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('manage_church_groups');
      expect(mockPermissionService.canAccessChurchData).toHaveBeenCalledWith('church1');
    });

    it('should return error when user lacks permission', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ 
        hasPermission: false, 
        reason: 'Access denied' 
      });

      const result = await groupAdminService.getChurchGroups('church1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Access denied');
      expect(result.data).toBeNull();
    });

    it('should return error when church access is denied', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ 
        hasPermission: false, 
        reason: 'Church access denied' 
      });

      const result = await groupAdminService.getChurchGroups('church1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Church access denied');
      expect(result.data).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      } as any);

      const result = await groupAdminService.getChurchGroups('church1', true);

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Database error');
      expect(result.data).toBeNull();
    });
  });

  describe('approveGroup', () => {
    it('should approve a pending group', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      // Mock existing group check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group1', status: 'pending', church_id: 'church1' },
              error: null
            })
          })
        })
      } as any);

      // Mock update operation
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'group1', status: 'approved' },
                error: null
              })
            })
          })
        })
      } as any);

      const result = await groupAdminService.approveGroup('group1', 'admin1');

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.status).toBe('approved');
    });

    it('should return error for non-pending group', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group1', status: 'approved', church_id: 'church1' },
              error: null
            })
          })
        })
      } as any);

      const result = await groupAdminService.approveGroup('group1', 'admin1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Group is not pending approval');
      expect(result.data).toBeNull();
    });

    it('should return error when group not found', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      } as any);

      const result = await groupAdminService.approveGroup('group1', 'admin1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Group not found');
      expect(result.data).toBeNull();
    });
  });

  describe('declineGroup', () => {
    it('should decline a pending group', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      // Mock existing group check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group1', status: 'pending', church_id: 'church1' },
              error: null
            })
          })
        })
      } as any);

      // Mock update operation
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'group1', status: 'denied' },
                error: null
              })
            })
          })
        })
      } as any);

      const result = await groupAdminService.declineGroup('group1', 'admin1', 'Not suitable');

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.status).toBe('denied');
    });
  });

  describe('closeGroup', () => {
    it('should close an approved group', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      // Mock existing group check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group1', status: 'approved', church_id: 'church1' },
              error: null
            })
          })
        })
      } as any);

      // Mock update operation
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'group1', status: 'closed' },
                error: null
              })
            })
          })
        })
      } as any);

      const result = await groupAdminService.closeGroup('group1', 'admin1', 'No longer active');

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.status).toBe('closed');
    });

    it('should return error for non-approved group', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group1', status: 'pending', church_id: 'church1' },
              error: null
            })
          })
        })
      } as any);

      const result = await groupAdminService.closeGroup('group1', 'admin1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Only approved groups can be closed');
      expect(result.data).toBeNull();
    });
  });

  describe('getGroupRequests', () => {
    it('should return pending join requests', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({ hasPermission: true });

      const mockRequests = [
        {
          id: 'req1',
          group_id: 'group1',
          user_id: 'user1',
          status: 'pending',
          joined_at: '2024-01-01T00:00:00Z',
          user: { id: 'user1', name: 'John Doe', email: 'john@example.com' }
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockRequests,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await groupAdminService.getGroupRequests('group1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].status).toBe('pending');
      expect(result.data![0].user).toBeTruthy();
    });

    it('should return error when user cannot manage group', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({ 
        hasPermission: false, 
        reason: 'Access denied' 
      });

      const result = await groupAdminService.getGroupRequests('group1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Access denied');
      expect(result.data).toBeNull();
    });
  });

  describe('approveJoinRequest', () => {
    it('should approve a pending join request', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({ hasPermission: true });

      // Mock request fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { group_id: 'group1', user_id: 'user1', status: 'pending' },
              error: null
            })
          })
        })
      } as any);

      // Mock update operation
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      } as any);

      const result = await groupAdminService.approveJoinRequest('req1');

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
    });

    it('should return error for non-pending request', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({ hasPermission: true });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { group_id: 'group1', user_id: 'user1', status: 'active' },
              error: null
            })
          })
        })
      } as any);

      const result = await groupAdminService.approveJoinRequest('req1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Request is not pending');
      expect(result.data).toBeNull();
    });
  });

  describe('declineJoinRequest', () => {
    it('should decline a pending join request', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({ hasPermission: true });

      // Mock request fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { group_id: 'group1', user_id: 'user1', status: 'pending' },
              error: null
            })
          })
        })
      } as any);

      // Mock delete operation
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      } as any);

      const result = await groupAdminService.declineJoinRequest('req1');

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
    });
  });
});

describe('UserAdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChurchUsers', () => {
    it('should return church users with group status', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      const mockUsers = [
        {
          id: 'user1',
          name: 'John Doe',
          church_id: 'church1',
          group_memberships: [
            { id: 'mem1', status: 'active', group: { status: 'approved' } }
          ]
        },
        {
          id: 'user2',
          name: 'Jane Smith',
          church_id: 'church1',
          group_memberships: []
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockUsers,
              error: null
            })
          })
        })
      } as any);

      const result = await userAdminService.getChurchUsers('church1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data![0].is_connected).toBe(true);
      expect(result.data![0].group_count).toBe(1);
      expect(result.data![1].is_connected).toBe(false);
      expect(result.data![1].group_count).toBe(0);
    });

    it('should return error when user lacks permission', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ 
        hasPermission: false, 
        reason: 'Access denied' 
      });

      const result = await userAdminService.getChurchUsers('church1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Access denied');
      expect(result.data).toBeNull();
    });
  });

  describe('getUnconnectedUsers', () => {
    it('should return only unconnected users', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });
      mockPermissionService.canAccessChurchData.mockResolvedValue({ hasPermission: true });

      // Mock the getChurchUsers call
      const mockUsers = [
        {
          id: 'user1',
          name: 'John Doe',
          is_connected: true,
          group_count: 1
        },
        {
          id: 'user2',
          name: 'Jane Smith',
          is_connected: false,
          group_count: 0
        }
      ];

      jest.spyOn(userAdminService, 'getChurchUsers').mockResolvedValue({
        data: mockUsers as any,
        error: null
      });

      const result = await userAdminService.getUnconnectedUsers('church1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('user2');
      expect(result.data![0].is_connected).toBe(false);
    });
  });

  describe('getUserGroupHistory', () => {
    it('should return user group membership history', async () => {
      mockPermissionService.canModifyResource.mockResolvedValue({ hasPermission: true });

      const mockHistory = [
        {
          id: 'mem1',
          user_id: 'user1',
          group_id: 'group1',
          status: 'active',
          joined_at: '2024-01-01T00:00:00Z',
          group: { id: 'group1', title: 'Test Group', status: 'approved' }
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockHistory,
              error: null
            })
          })
        })
      } as any);

      const result = await userAdminService.getUserGroupHistory('user1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].group).toBeTruthy();
    });

    it('should return error when user cannot access user data', async () => {
      mockPermissionService.canModifyResource.mockResolvedValue({ 
        hasPermission: false, 
        reason: 'Access denied' 
      });

      const result = await userAdminService.getUserGroupHistory('user1');

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Access denied');
      expect(result.data).toBeNull();
    });
  });

  describe('getChurchSummary', () => {
    it('should return church statistics', async () => {
      mockPermissionService.hasPermission.mockResolvedValue({ hasPermission: true });

      // Mock getChurchUsers
      const mockUsers = [
        { id: 'user1', is_connected: true },
        { id: 'user2', is_connected: false },
        { id: 'user3', is_connected: true }
      ];

      jest.spyOn(userAdminService, 'getChurchUsers').mockResolvedValue({
        data: mockUsers as any,
        error: null
      });

      // Mock groups query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'group1' }, { id: 'group2' }],
              error: null
            })
          })
        })
      } as any);

      // Mock pending requests query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'req1' }],
              error: null
            })
          })
        })
      } as any);

      const result = await userAdminService.getChurchSummary('church1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        total_users: 3,
        connected_users: 2,
        unconnected_users: 1,
        active_groups: 2,
        pending_requests: 1
      });
    });
  });
});