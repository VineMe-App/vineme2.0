import { friendshipService } from '../friendships';
import { supabase } from '../supabase';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('FriendshipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request successfully', async () => {
      const mockFriendship = {
        id: '1',
        user_id: 'user1',
        friend_id: 'user2',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Mock existing friendship check (not found)
      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock insert
      const mockInsert = jest.fn().mockReturnThis();
      const mockSingleInsert = jest.fn().mockResolvedValue({
        data: mockFriendship,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockSelect,
          or: mockOr,
          single: mockSingle,
        } as any)
        .mockReturnValueOnce({
          insert: mockInsert,
          select: mockSelect,
          single: mockSingleInsert,
        } as any);

      const result = await friendshipService.sendFriendRequest(
        'user1',
        'user2'
      );

      expect(result.data).toEqual(mockFriendship);
      expect(result.error).toBeNull();
    });

    it('should return error if friendship already exists', async () => {
      const existingFriendship = {
        id: '1',
        user_id: 'user1',
        friend_id: 'user2',
        status: 'pending',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: existingFriendship,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        or: mockOr,
        single: mockSingle,
      } as any);

      const result = await friendshipService.sendFriendRequest(
        'user1',
        'user2'
      );

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Friendship request already exists');
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept a friend request successfully', async () => {
      const mockFriendship = {
        id: '1',
        user_id: 'user1',
        friend_id: 'user2',
        status: 'accepted',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockFriendship,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const result = await friendshipService.acceptFriendRequest('1', 'user2');

      expect(result.data).toEqual(mockFriendship);
      expect(result.error).toBeNull();
    });
  });

  describe('getFriends', () => {
    it('should get user friends successfully', async () => {
      const mockFriends = [
        {
          id: '1',
          user_id: 'user1',
          friend_id: 'user2',
          status: 'accepted',
          friend: {
            id: 'user2',
            name: 'Friend User',
            email: 'friend@example.com',
            avatar_url: null,
          },
          user: {
            id: 'user1',
            name: 'Current User',
            email: 'user@example.com',
            avatar_url: null,
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: mockFriends,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        or: mockOr,
        eq: mockEq,
      } as any);

      const result = await friendshipService.getFriends('user1');

      expect(result.data).toEqual(mockFriends);
      expect(result.error).toBeNull();
    });

    it('should handle empty friends list', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        or: mockOr,
        eq: mockEq,
      } as any);

      const result = await friendshipService.getFriends('user1');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getSentFriendRequests', () => {
    it('should get sent friend requests successfully', async () => {
      const mockRequests = [
        {
          id: '1',
          user_id: 'user1',
          friend_id: 'user2',
          status: 'pending',
          friend: {
            id: 'user2',
            name: 'Friend User',
            email: 'friend@example.com',
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockEqStatus = jest.fn().mockResolvedValue({
        data: mockRequests,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      // Chain the eq calls
      mockEq
        .mockReturnValueOnce({
          select: mockSelect,
          eq: mockEqStatus,
        })
        .mockReturnValueOnce({
          data: mockRequests,
          error: null,
        });

      const result = await friendshipService.getSentFriendRequests('user1');

      expect(result.data).toEqual(mockRequests);
      expect(result.error).toBeNull();
    });
  });

  describe('getReceivedFriendRequests', () => {
    it('should get received friend requests successfully', async () => {
      const mockRequests = [
        {
          id: '1',
          user_id: 'user2',
          friend_id: 'user1',
          status: 'pending',
          user: {
            id: 'user2',
            name: 'Sender User',
            email: 'sender@example.com',
          },
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockEqStatus = jest.fn().mockResolvedValue({
        data: mockRequests,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
      } as any);

      // Chain the eq calls
      mockEq
        .mockReturnValueOnce({
          select: mockSelect,
          eq: mockEqStatus,
        })
        .mockReturnValueOnce({
          data: mockRequests,
          error: null,
        });

      const result = await friendshipService.getReceivedFriendRequests('user1');

      expect(result.data).toEqual(mockRequests);
      expect(result.error).toBeNull();
    });
  });

  describe('getFriendshipStatus', () => {
    it('should get friendship status successfully', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { status: 'accepted' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        or: mockOr,
        single: mockSingle,
      } as any);

      const result = await friendshipService.getFriendshipStatus(
        'user1',
        'user2'
      );

      expect(result.data).toBe('accepted');
      expect(result.error).toBeNull();
    });

    it('should return null if no friendship exists', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        or: mockOr,
        single: mockSingle,
      } as any);

      const result = await friendshipService.getFriendshipStatus(
        'user1',
        'user2'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('removeFriend', () => {
    it('should remove a friend successfully', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockResolvedValue({
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
        or: mockOr,
      } as any);

      const result = await friendshipService.removeFriend('user1', 'user2');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockDelete = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
        or: mockOr,
      } as any);

      const result = await friendshipService.removeFriend('user1', 'user2');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Database error');
    });
  });

  describe('blockUser', () => {
    it('should block a user by updating existing friendship', async () => {
      const existingFriendship = {
        id: '1',
        user_id: 'user1',
        friend_id: 'user2',
        status: 'accepted',
      };

      const blockedFriendship = {
        ...existingFriendship,
        status: 'blocked',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock existing friendship check
      const mockSelect1 = jest.fn().mockReturnThis();
      const mockOr1 = jest.fn().mockReturnThis();
      const mockSingle1 = jest.fn().mockResolvedValue({
        data: existingFriendship,
        error: null,
      });

      // Mock update
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect2 = jest.fn().mockReturnThis();
      const mockSingle2 = jest.fn().mockResolvedValue({
        data: blockedFriendship,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockSelect1,
          or: mockOr1,
          single: mockSingle1,
        } as any)
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
          select: mockSelect2,
          single: mockSingle2,
        } as any);

      const result = await friendshipService.blockUser('user1', 'user2');

      expect(result.data).toEqual(blockedFriendship);
      expect(result.error).toBeNull();
    });

    it('should create new blocked friendship if none exists', async () => {
      const newBlockedFriendship = {
        id: '1',
        user_id: 'user1',
        friend_id: 'user2',
        status: 'blocked',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Mock no existing friendship
      const mockSelect1 = jest.fn().mockReturnThis();
      const mockOr1 = jest.fn().mockReturnThis();
      const mockSingle1 = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock insert
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect2 = jest.fn().mockReturnThis();
      const mockSingle2 = jest.fn().mockResolvedValue({
        data: newBlockedFriendship,
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockSelect1,
          or: mockOr1,
          single: mockSingle1,
        } as any)
        .mockReturnValueOnce({
          insert: mockInsert,
          select: mockSelect2,
          single: mockSingle2,
        } as any);

      const result = await friendshipService.blockUser('user1', 'user2');

      expect(result.data).toEqual(newBlockedFriendship);
      expect(result.error).toBeNull();
    });
  });
});
