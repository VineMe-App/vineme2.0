// Mock the supabase module before importing anything else
import { groupCreationService } from '../groupCreation';
import { permissionService } from '../permissions';
import {
  sendGroupRequestNotification,
  sendJoinRequestNotification,
} from '../notifications';
import type { CreateGroupData } from '../admin';

jest.mock('../supabase', () => ({
  supabase: global.mockSupabaseClient,
}));

jest.mock('../permissions');
jest.mock('../notifications', () => ({
  sendGroupRequestNotification: jest.fn(),
  sendJoinRequestNotification: jest.fn(),
}));

const mockSupabase = global.mockSupabaseClient;
const mockPermissionService = permissionService as jest.Mocked<
  typeof permissionService
>;
const mockSendGroupRequestNotification =
  sendGroupRequestNotification as jest.MockedFunction<
    typeof sendGroupRequestNotification
  >;
const mockSendJoinRequestNotification =
  sendJoinRequestNotification as jest.MockedFunction<
    typeof sendJoinRequestNotification
  >;

describe('GroupCreationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroupRequest', () => {
    const mockGroupData: CreateGroupData = {
      title: 'Test Group',
      description: 'A test group',
      meeting_day: 'Wednesday',
      meeting_time: '19:00',
      location: { address: '123 Test St' },
      service_id: 'service1',
      church_id: 'church1',
      whatsapp_link: 'https://chat.whatsapp.com/test',
    };

    it('should create a group request successfully', async () => {
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.validateRLSCompliance.mockResolvedValue({
        hasPermission: true,
      });

      // Mock group creation
      const mockGroup = { id: 'group1', ...mockGroupData, status: 'pending' };
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock membership creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      } as any);

      // Mock creator name fetch for notification
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.createGroupRequest(
        mockGroupData,
        'user1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.status).toBe('pending');
      expect(mockPermissionService.canAccessChurchData).toHaveBeenCalledWith(
        'church1'
      );
      expect(mockSendGroupRequestNotification).toHaveBeenCalledWith(
        'church1',
        'Test Group',
        'Test User'
      );
    });

    it('should return error when user lacks church access', async () => {
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: false,
        reason: 'Access denied',
      });

      const result = await groupCreationService.createGroupRequest(
        mockGroupData,
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Access denied');
      expect(result.data).toBeNull();
    });

    it('should return error when RLS compliance fails', async () => {
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.validateRLSCompliance.mockResolvedValue({
        hasPermission: false,
        reason: 'RLS violation',
      });

      const result = await groupCreationService.createGroupRequest(
        mockGroupData,
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('RLS violation');
      expect(result.data).toBeNull();
    });

    it('should clean up group if membership creation fails', async () => {
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });
      mockPermissionService.validateRLSCompliance.mockResolvedValue({
        hasPermission: true,
      });

      const mockGroup = { id: 'group1', ...mockGroupData, status: 'pending' };

      // Mock successful group creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockGroup,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock failed membership creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Membership creation failed' },
        }),
      } as any);

      // Mock group cleanup
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({}),
        }),
      } as any);

      const result = await groupCreationService.createGroupRequest(
        mockGroupData,
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Failed to create group leadership');
      expect(result.data).toBeNull();
    });
  });

  describe('updateGroupDetails', () => {
    const mockUpdates = {
      title: 'Updated Group',
      description: 'Updated description',
    };

    it('should update group details when user is leader', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      // Mock membership check
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock update operation
      const mockUpdatedGroup = { id: 'group1', ...mockUpdates };
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedGroup,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.updateGroupDetails(
        'group1',
        mockUpdates,
        'user1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.title).toBe('Updated Group');
    });

    it('should return error when user is not a leader', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'member' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.updateGroupDetails(
        'group1',
        mockUpdates,
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe(
        'Only group leaders can update group details'
      );
      expect(result.data).toBeNull();
    });

    it('should return error when user cannot manage group', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: false,
        reason: 'Access denied',
      });

      const result = await groupCreationService.updateGroupDetails(
        'group1',
        mockUpdates,
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Access denied');
      expect(result.data).toBeNull();
    });
  });

  describe('promoteToLeader', () => {
    it('should promote member to leader', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      // Mock promoter check
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock target member check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'mem1', role: 'member' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      // Mock promotion update
      const mockUpdatedMembership = { id: 'mem1', role: 'leader' };
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedMembership,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.promoteToLeader(
        'group1',
        'user2',
        'user1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.role).toBe('leader');
    });

    it('should return error when promoter is not a leader', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'member' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.promoteToLeader(
        'group1',
        'user2',
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe(
        'Only group leaders can promote members'
      );
      expect(result.data).toBeNull();
    });

    it('should return error when target user is already a leader', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      // Mock promoter check
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock target member check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'mem1', role: 'leader' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.promoteToLeader(
        'group1',
        'user2',
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('User is already a leader');
      expect(result.data).toBeNull();
    });
  });

  describe('demoteFromLeader', () => {
    it('should demote leader to member when not last leader', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      // Mock demoter check
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock all leaders check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { id: 'mem1', user_id: 'user1' },
                  { id: 'mem2', user_id: 'user2' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      // Mock target member check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'mem2', role: 'leader' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      // Mock demotion update
      const mockUpdatedMembership = { id: 'mem2', role: 'member' };
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedMembership,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.demoteFromLeader(
        'group1',
        'user2',
        'user1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.role).toBe('member');
    });

    it('should return error when trying to demote last leader', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      // Mock demoter check
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock all leaders check - only one leader
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'mem1', user_id: 'user2' }],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.demoteFromLeader(
        'group1',
        'user2',
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe(
        'Cannot demote the last leader of the group'
      );
      expect(result.data).toBeNull();
    });
  });

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      // Mock remover check
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock target member check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'member' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      // Mock removal update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.removeMember(
        'group1',
        'user2',
        'user1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
    });

    it('should return error when trying to remove last leader', async () => {
      mockPermissionService.canManageGroupMembership.mockResolvedValue({
        hasPermission: true,
      });

      // Mock remover check
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock target member check - is a leader
      mockSupabase.from.mockReturnValueOnce({
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
      } as any);

      // Mock all leaders check - only one leader
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'mem1' }],
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.removeMember(
        'group1',
        'user2',
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe(
        'Cannot remove the last leader of the group'
      );
      expect(result.data).toBeNull();
    });
  });

  describe('createJoinRequest', () => {
    it('should create join request for approved group', async () => {
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock group check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { church_id: 'church1', status: 'approved' },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock existing membership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }, // Not found
              }),
            }),
          }),
        }),
      } as any);

      // Mock join request creation
      const mockMembership = { id: 'mem1', status: 'pending' };
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMembership,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock requester and group info fetch for notification
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { title: 'Test Group' },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.createJoinRequest(
        'group1',
        'user1',
        true,
        'Please let me join'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data!.status).toBe('pending');
      expect(mockSendJoinRequestNotification).toHaveBeenCalledWith(
        'group1',
        'Test Group',
        'Test User'
      );
    });

    it('should return error for non-approved group', async () => {
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { church_id: 'church1', status: 'pending' },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.createJoinRequest(
        'group1',
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe('Group is not accepting new members');
      expect(result.data).toBeNull();
    });

    it('should return error when user already has active membership', async () => {
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock group check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { church_id: 'church1', status: 'approved' },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock existing membership check - user is already active
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { status: 'active' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.createJoinRequest(
        'group1',
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe(
        'User is already a member of this group'
      );
      expect(result.data).toBeNull();
    });

    it('should return error when user already has pending request', async () => {
      mockPermissionService.canAccessChurchData.mockResolvedValue({
        hasPermission: true,
      });

      // Mock group check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { church_id: 'church1', status: 'approved' },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock existing membership check - user has pending request
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { status: 'pending' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await groupCreationService.createJoinRequest(
        'group1',
        'user1'
      );

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe(
        'User already has a pending request for this group'
      );
      expect(result.data).toBeNull();
    });
  });
});
