import { groupService } from '../groups';
import { supabase } from '../supabase';
import type { GroupWithDetails, GroupMembership } from '../../types/database';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('GroupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGroupsByChurch', () => {
    it('should return groups for a church with member count', async () => {
      const mockGroups = [
        {
          id: 'group1',
          title: 'Bible Study Group',
          description: 'Weekly Bible study',
          meeting_day: 'Wednesday',
          meeting_time: '19:00',
          location: { address: '123 Church St' },
          service_id: 'service1',
          church_id: ['church1'],
          status: 'approved',
          memberships: [
            { id: 'mem1', status: 'active' },
            { id: 'mem2', status: 'active' },
            { id: 'mem3', status: 'inactive' },
          ],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGroups, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await groupService.getGroupsByChurch('church1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].member_count).toBe(2); // Only active members
      expect(mockSupabase.from).toHaveBeenCalledWith('groups');
      expect(mockQuery.contains).toHaveBeenCalledWith('church_id', ['church1']);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved');
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await groupService.getGroupsByChurch('church1');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Database error');
    });
  });

  describe('getGroupById', () => {
    it('should return group details with member count', async () => {
      const mockGroup = {
        id: 'group1',
        title: 'Bible Study Group',
        description: 'Weekly Bible study',
        memberships: [
          { id: 'mem1', status: 'active' },
          { id: 'mem2', status: 'active' },
        ],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGroup, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await groupService.getGroupById('group1');

      expect(result.error).toBeNull();
      expect(result.data!.member_count).toBe(2);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'group1');
    });
  });

  describe('joinGroup', () => {
    it('should create new membership when user is not already a member', async () => {
      const mockMembership = {
        id: 'mem1',
        group_id: 'group1',
        user_id: 'user1',
        role: 'member',
        status: 'active',
      };

      // Mock existing membership check (returns null)
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Mock insert query
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockMembership, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any) // First call for checking existing membership
        .mockReturnValueOnce(mockInsertQuery as any); // Second call for inserting new membership

      const result = await groupService.joinGroup('group1', 'user1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockMembership);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith({
        group_id: 'group1',
        user_id: 'user1',
        role: 'member',
        status: 'active',
        joined_at: expect.any(String),
      });
    });

    it('should reactivate existing inactive membership', async () => {
      const existingMembership = {
        id: 'mem1',
        status: 'inactive',
      };

      const updatedMembership = {
        id: 'mem1',
        status: 'active',
        joined_at: expect.any(String),
      };

      // Mock existing membership check
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: existingMembership, error: null }),
      };

      // Mock update query
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: updatedMembership, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const result = await groupService.joinGroup('group1', 'user1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(updatedMembership);
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        status: 'active',
        joined_at: expect.any(String),
      });
    });

    it('should return error if user is already an active member', async () => {
      const existingMembership = {
        id: 'mem1',
        status: 'active',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: existingMembership, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await groupService.joinGroup('group1', 'user1');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe(
        'User is already a member of this group'
      );
    });
  });

  describe('leaveGroup', () => {
    it('should set membership status to inactive', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      // Chain the eq calls
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockReturnValueOnce({
        ...mockQuery,
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await groupService.leaveGroup('group1', 'user1');

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'inactive' });
    });
  });

  describe('isGroupMember', () => {
    it('should return true if user is an active member', async () => {
      const mockMembership = {
        id: 'mem1',
        group_id: 'group1',
        user_id: 'user1',
        status: 'active',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockMembership, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await groupService.isGroupMember('group1', 'user1');

      expect(result.error).toBeNull();
      expect(result.data!.isMember).toBe(true);
      expect(result.data!.membership).toEqual(mockMembership);
    });

    it('should return false if user is not a member', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await groupService.isGroupMember('group1', 'user1');

      expect(result.error).toBeNull();
      expect(result.data!.isMember).toBe(false);
      expect(result.data!.membership).toBeUndefined();
    });
  });

  describe('sendGroupReferral', () => {
    it('should send referral successfully', async () => {
      const mockGroup = {
        id: 'group1',
        title: 'Bible Study Group',
        whatsapp_link: 'https://chat.whatsapp.com/test',
      };

      const mockReferrer = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      // Mock getGroupById
      jest.spyOn(groupService, 'getGroupById').mockResolvedValue({
        data: mockGroup as GroupWithDetails,
        error: null,
      });

      // Mock referrer query
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockReferrer, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await groupService.sendGroupReferral({
        group_id: 'group1',
        referrer_id: 'user1',
        referee_email: 'jane@example.com',
        message: 'Join our Bible study!',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Group referral sent:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('searchGroups', () => {
    it('should search groups by title and description', async () => {
      const mockGroups = [
        {
          id: 'group1',
          title: 'Bible Study Group',
          description: 'Weekly Bible study',
          memberships: [{ status: 'active' }],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockGroups, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await groupService.searchGroups('Bible');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].member_count).toBe(1);
      expect(mockQuery.or).toHaveBeenCalledWith(
        'title.ilike.%Bible%,description.ilike.%Bible%'
      );
    });

    it('should filter by church when provided', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await groupService.searchGroups('Bible', 'church1');

      expect(mockQuery.contains).toHaveBeenCalledWith('church_id', ['church1']);
    });
  });
});
