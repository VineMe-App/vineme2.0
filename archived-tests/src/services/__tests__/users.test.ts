import { userService } from '../users';
import { supabase } from '../supabase';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should get user profile with related data successfully', async () => {
      const mockUserData = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        church: { id: 'church-1', name: 'Test Church' },
        service: { id: 'service-1', name: 'Sunday Service' },
        group_memberships: [],
        friendships: [],
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await userService.getUserProfile('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('*'));
      expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
      expect(result.data).toEqual(mockUserData);
      expect(result.error).toBeNull();
    });

    it('should handle database error', async () => {
      const mockError = { message: 'Database error' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await userService.getUserProfile('user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Database error');
    });

    it('should handle unexpected errors', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await userService.getUserProfile('user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const mockUpdatedUser = {
        id: 'user-1',
        name: 'John Updated',
        email: 'john@example.com',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUpdatedUser,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const updates = { name: 'John Updated' };
      const result = await userService.updateUserProfile('user-1', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Updated',
          updated_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
      expect(result.data).toEqual(mockUpdatedUser);
      expect(result.error).toBeNull();
    });

    it('should handle update error', async () => {
      const mockError = { message: 'Update failed' };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const result = await userService.updateUserProfile('user-1', {
        name: 'Test',
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Update failed');
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = new Blob(['test'], { type: 'image/jpeg' });
      const mockPublicUrl = 'https://example.com/avatar.jpg';

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: mockPublicUrl },
      });

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        }),
      } as any;

      const result = await userService.uploadAvatar('user-1', mockFile);

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('user-avatars');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^avatars\/user-1-\d+\.jpg$/),
        mockFile
      );
      expect(result.data).toBe(mockPublicUrl);
      expect(result.error).toBeNull();
    });

    it('should handle upload error', async () => {
      const mockFile = new Blob(['test'], { type: 'image/jpeg' });
      const mockError = { message: 'Upload failed' };

      const mockUpload = jest.fn().mockResolvedValue({ error: mockError });

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: mockUpload,
        }),
      } as any;

      const result = await userService.uploadAvatar('user-1', mockFile);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Upload failed');
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar successfully', async () => {
      const avatarUrl = 'https://example.com/avatars/user-1-123.jpg';

      const mockRemove = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          remove: mockRemove,
        }),
      } as any;

      const result = await userService.deleteAvatar(avatarUrl);

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('user-avatars');
      expect(mockRemove).toHaveBeenCalledWith(['avatars/user-1-123.jpg']);
      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle delete error', async () => {
      const avatarUrl = 'https://example.com/avatars/user-1-123.jpg';
      const mockError = { message: 'Delete failed' };

      const mockRemove = jest.fn().mockResolvedValue({ error: mockError });

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          remove: mockRemove,
        }),
      } as any;

      const result = await userService.deleteAvatar(avatarUrl);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Delete failed');
    });
  });

  describe('getUserGroupMemberships', () => {
    it('should get user group memberships successfully', async () => {
      const mockMemberships = [
        {
          id: 'membership-1',
          user_id: 'user-1',
          group_id: 'group-1',
          role: 'member',
          group: {
            id: 'group-1',
            title: 'Bible Study',
            service: { id: 'service-1', name: 'Sunday Service' },
            church: { id: 'church-1', name: 'Test Church' },
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      // Mock the chain of eq calls
      mockEq
        .mockReturnValueOnce({
          select: mockSelect,
          eq: mockEq,
        })
        .mockResolvedValueOnce({
          data: mockMemberships,
          error: null,
        });

      const result = await userService.getUserGroupMemberships('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('group_memberships');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('*'));
      expect(result.data).toEqual(mockMemberships);
      expect(result.error).toBeNull();
    });
  });

  describe('getUserFriendships', () => {
    it('should get user friendships successfully', async () => {
      const mockFriendships = [
        {
          id: 'friendship-1',
          user_id: 'user-1',
          friend_id: 'user-2',
          status: 'accepted',
          friend: {
            id: 'user-2',
            name: 'Jane Doe',
            avatar_url: null,
            email: 'jane@example.com',
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      // Mock the chain of eq calls
      mockEq
        .mockReturnValueOnce({
          select: mockSelect,
          eq: mockEq,
        })
        .mockResolvedValueOnce({
          data: mockFriendships,
          error: null,
        });

      const result = await userService.getUserFriendships('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('*'));
      expect(result.data).toEqual(mockFriendships);
      expect(result.error).toBeNull();
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          avatar_url: null,
          church_id: 'church-1',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        or: mockOr,
        limit: mockLimit,
      } as any);

      const result = await userService.searchUsers('john');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, name, email, avatar_url, church_id'
      );
      expect(mockOr).toHaveBeenCalledWith(
        'name.ilike.%john%,email.ilike.%john%'
      );
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result.data).toEqual(mockUsers);
      expect(result.error).toBeNull();
    });

    it('should use custom limit', async () => {
      const mockUsers = [];

      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        or: mockOr,
        limit: mockLimit,
      } as any);

      await userService.searchUsers('test', 5);

      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });
});
