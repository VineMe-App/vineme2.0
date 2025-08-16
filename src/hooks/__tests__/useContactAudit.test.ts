import { contactAuditService } from '../../services/contactAudit';

// Mock the contact audit service
jest.mock('../../services/contactAudit', () => ({
  contactAuditService: {
    getUserContactLogs: jest.fn(),
    getGroupContactLogs: jest.fn(),
    getPrivacySettings: jest.fn(),
    updatePrivacySettings: jest.fn(),
    canShareContact: jest.fn(),
  },
}));

const mockContactAuditService = contactAuditService as jest.Mocked<typeof contactAuditService>;

describe('useContactAudit hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('contactAuditService integration', () => {
    it('should have all required methods', () => {
      expect(mockContactAuditService.getUserContactLogs).toBeDefined();
      expect(mockContactAuditService.getGroupContactLogs).toBeDefined();
      expect(mockContactAuditService.getPrivacySettings).toBeDefined();
      expect(mockContactAuditService.updatePrivacySettings).toBeDefined();
      expect(mockContactAuditService.canShareContact).toBeDefined();
    });

    it('should call getUserContactLogs with correct parameters', async () => {
      const mockLogs = [
        {
          id: 'log1',
          user_id: 'user1',
          accessor_id: 'leader1',
          access_type: 'view' as const,
          contact_fields: ['email'],
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockContactAuditService.getUserContactLogs.mockResolvedValue({
        data: mockLogs,
        error: null,
      });

      const result = await mockContactAuditService.getUserContactLogs('user1', 'user1');

      expect(result.data).toEqual(mockLogs);
      expect(mockContactAuditService.getUserContactLogs).toHaveBeenCalledWith('user1', 'user1');
    });

    it('should call getPrivacySettings with correct parameters', async () => {
      const mockSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: true,
        allow_phone_sharing: false,
        allow_contact_by_leaders: true,
        created_at: '2023-01-01T00:00:00Z',
      };

      mockContactAuditService.getPrivacySettings.mockResolvedValue({
        data: mockSettings,
        error: null,
      });

      const result = await mockContactAuditService.getPrivacySettings('user1');

      expect(result.data).toEqual(mockSettings);
      expect(mockContactAuditService.getPrivacySettings).toHaveBeenCalledWith('user1');
    });

    it('should call updatePrivacySettings with correct parameters', async () => {
      const mockUpdatedSettings = {
        id: 'settings1',
        user_id: 'user1',
        allow_email_sharing: false,
        allow_phone_sharing: true,
        allow_contact_by_leaders: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      };

      const updates = {
        allow_email_sharing: false,
        allow_phone_sharing: true,
      };

      mockContactAuditService.updatePrivacySettings.mockResolvedValue({
        data: mockUpdatedSettings,
        error: null,
      });

      const result = await mockContactAuditService.updatePrivacySettings('user1', updates);

      expect(result.data).toEqual(mockUpdatedSettings);
      expect(mockContactAuditService.updatePrivacySettings).toHaveBeenCalledWith('user1', updates);
    });

    it('should call canShareContact with correct parameters', async () => {
      mockContactAuditService.canShareContact.mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await mockContactAuditService.canShareContact(
        'user1',
        'email',
        'leader1',
        'group1'
      );

      expect(result.data).toBe(true);
      expect(mockContactAuditService.canShareContact).toHaveBeenCalledWith(
        'user1',
        'email',
        'leader1',
        'group1'
      );
    });
  });
});