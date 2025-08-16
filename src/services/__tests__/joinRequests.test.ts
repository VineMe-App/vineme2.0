import { joinRequestService } from '../joinRequests';
import { supabase } from '../supabase';
import { permissionService } from '../permissions';
import { contactAuditService } from '../contactAudit';

// Mock dependencies
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../permissions', () => ({
  permissionService: {
    canManageGroup: jest.fn(),
  },
}));

jest.mock('../contactAudit', () => ({
  contactAuditService: {
    canShareContact: jest.fn(),
    logContactAccess: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockPermissionService = permissionService as jest.Mocked<typeof permissionService>;
const mockContactAuditService = contactAuditService as jest.Mocked<typeof contactAuditService>;

describe('JoinRequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJoinRequest', () => {
    it('should create a join request successfully', async () => {
      const requestData = {
        group_id: 'group-1',
        user_id: 'user-1',
        contact_consent: true,
        message: 'I would like to join this group',
      };

      const mockJoinRequest = {
        id: 'request-1',
        ...requestData,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Mock no existing membership
      const mockChain1 = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };

      // Mock no existing join request
      const mockChain2 = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };

      // Mock successful insert
      const mockChain3 = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockJoinRequest, error: null }),
          }),
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockChain1 as any)
        .mockReturnValueOnce(mockChain2 as any)
        .mockReturnValueOnce(mockChain3 as any);

      const result = await joinRequestService.createJoinRequest(requestData);

      expect(result.data).toEqual(mockJoinRequest);
      expect(result.error).toBeNull();
    });

    it('should return error if user already has active membership', async () => {
      const requestData = {
        group_id: 'group-1',
        user_id: 'user-1',
        contact_consent: true,
      };

      // Mock existing active membership
      const mockChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'membership-1', status: 'active' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await joinRequestService.createJoinRequest(requestData);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('User is already a member of this group');
    });

    it('should return error if user already has pending request', async () => {
      const requestData = {
        group_id: 'group-1',
        user_id: 'user-1',
        contact_consent: true,
      };

      // Mock no existing membership
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      } as any);

      // Mock existing pending request
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'request-1', status: 'pending' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await joinRequestService.createJoinRequest(requestData);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('User already has a pending join request for this group');
    });
  });

  describe('approveJoinRequest', () => {
    it('should approve join request and create membership', async () => {
      const requestId = 'request-1';
      const approverId = 'leader-1';
      const mockJoinRequest = {
        id: requestId,
        group_id: 'group-1',
        user_id: 'user-1',
        status: 'pending',
      };

      const mockMembership = {
        id: 'membership-1',
        group_id: 'group-1',
        user_id: 'user-1',
        role: 'member',
        status: 'active',
        joined_at: '2024-01-01T00:00:00Z',
      };

      // Mock get join request
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockJoinRequest, error: null }),
            }),
          }),
        }),
      } as any);

      // Mock permission check
      mockPermissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
        reason: null,
      });

      // Mock create membership
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMembership, error: null }),
          }),
        }),
      } as any);

      // Mock update join request
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await joinRequestService.approveJoinRequest(requestId, approverId);

      expect(result.data).toEqual(mockMembership);
      expect(result.error).toBeNull();
      expect(mockPermissionService.canManageGroup).toHaveBeenCalledWith('group-1', approverId);
    });

    it('should return error if user lacks permission', async () => {
      const requestId = 'request-1';
      const approverId = 'user-1';
      const mockJoinRequest = {
        id: requestId,
        group_id: 'group-1',
        user_id: 'user-2',
        status: 'pending',
      };

      // Mock get join request
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockJoinRequest, error: null }),
            }),
          }),
        }),
      } as any);

      // Mock permission denied
      mockPermissionService.canManageGroup.mockResolvedValue({
        hasPermission: false,
        reason: 'User is not a group leader',
      });

      const result = await joinRequestService.approveJoinRequest(requestId, approverId);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('User is not a group leader');
    });
  });

  describe('declineJoinRequest', () => {
    it('should decline join request successfully', async () => {
      const requestId = 'request-1';
      const declinerId = 'leader-1';
      const mockJoinRequest = {
        id: requestId,
        group_id: 'group-1',
        user_id: 'user-1',
        status: 'pending',
      };

      // Mock get join request
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockJoinRequest, error: null }),
            }),
          }),
        }),
      } as any);

      // Mock permission check
      mockPermissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
        reason: null,
      });

      // Mock update join request
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await joinRequestService.declineJoinRequest(requestId, declinerId);

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('getContactInfo', () => {
    it('should return contact info for approved request with consent', async () => {
      const requestId = 'request-1';
      const leaderId = 'leader-1';
      const mockJoinRequest = {
        id: requestId,
        group_id: 'group-1',
        status: 'approved',
        contact_consent: true,
        user: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
      };

      // Mock get join request with user details
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockJoinRequest, error: null }),
              }),
            }),
          }),
        }),
      } as any);

      // Mock permission check
      mockPermissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
        reason: null,
      });

      // Mock contact sharing permissions
      mockContactAuditService.canShareContact
        .mockResolvedValueOnce({ data: true, error: null }) // email allowed
        .mockResolvedValueOnce({ data: true, error: null }); // phone allowed

      // Mock contact access logging
      mockContactAuditService.logContactAccess.mockResolvedValue({
        data: { id: 'log1' } as any,
        error: null,
      });

      const result = await joinRequestService.getContactInfo(requestId, leaderId);

      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });
      expect(result.error).toBeNull();
    });

    it('should return error if contact consent not given', async () => {
      const requestId = 'request-1';
      const leaderId = 'leader-1';

      // Mock no join request found (due to contact_consent filter)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await joinRequestService.getContactInfo(requestId, leaderId);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Join request not found or contact not consented');
    });
  });
});