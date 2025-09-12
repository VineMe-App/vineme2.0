import { contactAuditService } from '../contactAudit';
import { supabase } from '../supabase';
import { permissionService } from '../permissions';

// Mock the dependencies
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

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockPermissionService = permissionService as jest.Mocked<
  typeof permissionService
>;

describe('ContactAuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logContactAccess', () => {
    it('should log contact access successfully', async () => {
      const mockAccessData = {
        user_id: 'user1',
        accessor_id: 'leader1',
        group_id: 'group1',
        access_type: 'view' as const,
        contact_fields: ['email'],
      };

      const mockLogData = {
        id: 'log1',
        ...mockAccessData,
        created_at: '2023-01-01T00:00:00Z',
      };

      mockPermissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
        reason: null,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockLogData,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await contactAuditService.logContactAccess(mockAccessData);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockLogData);
      expect(mockPermissionService.canManageGroup).toHaveBeenCalledWith(
        'group1',
        'leader1'
      );
    });

    it('should fail when user lacks permission', async () => {
      const mockAccessData = {
        user_id: 'user1',
        accessor_id: 'leader1',
        group_id: 'group1',
        access_type: 'view' as const,
        contact_fields: ['email'],
      };

      mockPermissionService.canManageGroup.mockResolvedValue({
        hasPermission: false,
        reason: 'Not a group leader',
      });

      const result = await contactAuditService.logContactAccess(mockAccessData);

      expect(result.error).toEqual(
        new Error('Access denied to contact information')
      );
      expect(result.data).toBeNull();
    });
  });

  describe('getUserContactLogs', () => {
    it('should get user contact logs successfully', async () => {
      const mockLogs = [
        {
          id: 'log1',
          user_id: 'user1',
          accessor_id: 'leader1',
          access_type: 'view',
          created_at: '2023-01-01T00:00:00Z',
          user: { id: 'user1', name: 'User 1', email: 'user1@example.com' },
          accessor: { id: 'leader1', name: 'Leader 1' },
          group: { id: 'group1', title: 'Group 1' },
        },
      ];

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockLogs,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await contactAuditService.getUserContactLogs(
        'user1',
        'user1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockLogs);
    });

    it('should deny access when user tries to view other user logs without admin role', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { roles: ['member'] },
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await contactAuditService.getUserContactLogs(
        'user1',
        'user2'
      );

      expect(result.error).toEqual(new Error('Access denied to contact logs'));
      expect(result.data).toBeNull();
    });
  });

  describe('getPrivacySettings', () => {
    it('should get privacy settings successfully', async () => {
      const mockSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: true,
        allow_phone_sharing: false,
        allow_contact_by_leaders: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await contactAuditService.getPrivacySettings('user1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockSettings);
    });

    it('should return default settings when none exist', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }, // Not found error
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await contactAuditService.getPrivacySettings('user1');

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        user_id: 'user1',
        allow_email_sharing: true,
        allow_phone_sharing: true,
        allow_contact_by_leaders: true,
      });
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update existing privacy settings', async () => {
      const mockUpdates = {
        allow_email_sharing: false,
        allow_phone_sharing: true,
      };

      const mockUpdatedSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: false,
        allow_phone_sharing: true,
        allow_contact_by_leaders: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      };

      // Mock existing settings check
      const mockSelectExisting = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'settings1' },
            error: null,
          }),
        }),
      });

      // Mock update
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUpdatedSettings,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockSelectExisting,
        } as any)
        .mockReturnValueOnce({
          update: mockUpdate,
        } as any);

      const result = await contactAuditService.updatePrivacySettings(
        'user1',
        mockUpdates
      );

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockUpdatedSettings);
    });

    it('should create new privacy settings when none exist', async () => {
      const mockUpdates = {
        allow_email_sharing: false,
      };

      const mockNewSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: false,
        allow_phone_sharing: true,
        allow_contact_by_leaders: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      // Mock no existing settings
      const mockSelectExisting = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      // Mock insert
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockNewSettings,
            error: null,
          }),
        }),
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockSelectExisting,
        } as any)
        .mockReturnValueOnce({
          insert: mockInsert,
        } as any);

      const result = await contactAuditService.updatePrivacySettings(
        'user1',
        mockUpdates
      );

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockNewSettings);
    });
  });

  describe('canShareContact', () => {
    it('should allow contact sharing when all conditions are met', async () => {
      const mockSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: true,
        allow_phone_sharing: true,
        allow_contact_by_leaders: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      // Mock privacy settings
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      // Mock permission check
      mockPermissionService.canManageGroup.mockResolvedValue({
        hasPermission: true,
        reason: null,
      });

      const result = await contactAuditService.canShareContact(
        'user1',
        'email',
        'leader1',
        'group1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
    });

    it('should deny contact sharing when user disallows leader contact', async () => {
      const mockSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: true,
        allow_phone_sharing: true,
        allow_contact_by_leaders: false, // Disabled
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await contactAuditService.canShareContact(
        'user1',
        'email',
        'leader1',
        'group1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBe(false);
    });

    it('should deny contact sharing when specific contact type is disabled', async () => {
      const mockSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: false, // Disabled
        allow_phone_sharing: true,
        allow_contact_by_leaders: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await contactAuditService.canShareContact(
        'user1',
        'email',
        'leader1',
        'group1'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBe(false);
    });

    it('should deny contact sharing when user is not a group leader', async () => {
      const mockSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: true,
        allow_phone_sharing: true,
        allow_contact_by_leaders: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      mockPermissionService.canManageGroup.mockResolvedValue({
        hasPermission: false,
        reason: 'Not a group leader',
      });

      const result = await contactAuditService.canShareContact(
        'user1',
        'email',
        'leader1',
        'group1'
      );

      expect(result.error).toEqual(new Error('Access denied'));
      expect(result.data).toBe(false);
    });
  });
});
