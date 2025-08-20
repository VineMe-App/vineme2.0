import { AdminServiceWrapper } from '../adminServiceWrapper';
import { groupAdminService, userAdminService } from '../admin';
import { NetworkError, PermissionError } from '../../utils/errorHandling';
import { globalErrorHandler } from '../../utils/globalErrorHandler';

// Mock dependencies
jest.mock('../admin');
jest.mock('../../utils/globalErrorHandler');

const mockGroupAdminService = groupAdminService as jest.Mocked<
  typeof groupAdminService
>;
const mockUserAdminService = userAdminService as jest.Mocked<
  typeof userAdminService
>;
const mockGlobalErrorHandler = globalErrorHandler as jest.Mocked<
  typeof globalErrorHandler
>;

describe('AdminServiceWrapper', () => {
  let wrapper: AdminServiceWrapper;

  beforeEach(() => {
    wrapper = new AdminServiceWrapper();
    jest.clearAllMocks();
  });

  describe('getChurchGroups', () => {
    it('should return successful response', async () => {
      const mockGroups = [{ id: '1', title: 'Test Group' }];
      mockGroupAdminService.getChurchGroups.mockResolvedValue({
        data: mockGroups,
        error: null,
      });

      const result = await wrapper.getChurchGroups('church-1');

      expect(result.data).toEqual(mockGroups);
      expect(result.error).toBeNull();
      expect(mockGroupAdminService.getChurchGroups).toHaveBeenCalledWith(
        'church-1',
        false
      );
    });

    it('should handle service errors', async () => {
      const mockError = new PermissionError('Access denied');
      mockGroupAdminService.getChurchGroups.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await wrapper.getChurchGroups('church-1');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(mockGlobalErrorHandler.logError).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          operation: 'getChurchGroups',
          churchId: 'church-1',
        })
      );
    });

    it('should retry on network errors', async () => {
      const mockError = new NetworkError('Network failed');
      mockGroupAdminService.getChurchGroups
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue({
          data: [{ id: '1', title: 'Test Group' }],
          error: null,
        });

      const result = await wrapper.getChurchGroups('church-1', false, {
        maxRetries: 3,
      });

      expect(result.data).toBeTruthy();
      expect(mockGroupAdminService.getChurchGroups).toHaveBeenCalledTimes(3);
    });

    it('should pass context correctly', async () => {
      mockGroupAdminService.getChurchGroups.mockResolvedValue({
        data: [],
        error: null,
      });

      await wrapper.getChurchGroups('church-1', true, {
        context: { screen: 'manage-groups' },
      });

      expect(mockGroupAdminService.getChurchGroups).toHaveBeenCalledWith(
        'church-1',
        true
      );
    });
  });

  describe('approveGroup', () => {
    it('should approve group successfully', async () => {
      const mockResult = { id: '1', status: 'approved' };
      mockGroupAdminService.approveGroup.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await wrapper.approveGroup(
        'group-1',
        'admin-1',
        'Looks good'
      );

      expect(result.data).toEqual(mockResult);
      expect(result.error).toBeNull();
      expect(mockGroupAdminService.approveGroup).toHaveBeenCalledWith(
        'group-1',
        'admin-1',
        'Looks good'
      );
    });

    it('should handle approval errors', async () => {
      const mockError = new Error('Group not found');
      mockGroupAdminService.approveGroup.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await wrapper.approveGroup('group-1', 'admin-1');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('batchApproveGroups', () => {
    it('should handle batch approval with mixed results', async () => {
      const groupIds = ['group-1', 'group-2', 'group-3'];

      mockGroupAdminService.approveGroup
        .mockResolvedValueOnce({ data: { id: 'group-1' }, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('Failed') })
        .mockResolvedValueOnce({ data: { id: 'group-3' }, error: null });

      const result = await wrapper.batchApproveGroups(groupIds, 'admin-1');

      expect(result.successful).toEqual(['group-1', 'group-3']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].groupId).toBe('group-2');
    });

    it('should handle all failures in batch operation', async () => {
      const groupIds = ['group-1', 'group-2'];
      const mockError = new PermissionError('Access denied');

      mockGroupAdminService.approveGroup.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await wrapper.batchApproveGroups(groupIds, 'admin-1');

      expect(result.successful).toEqual([]);
      expect(result.failed).toHaveLength(2);
      expect(result.failed.every((f) => f.error.type === 'permission')).toBe(
        true
      );
    });
  });

  describe('getChurchUsers', () => {
    it('should return users successfully', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', is_connected: true },
        { id: '2', name: 'User 2', is_connected: false },
      ];
      mockUserAdminService.getChurchUsers.mockResolvedValue({
        data: mockUsers,
        error: null,
      });

      const result = await wrapper.getChurchUsers('church-1');

      expect(result.data).toEqual(mockUsers);
      expect(result.error).toBeNull();
    });

    it('should handle user service errors', async () => {
      const mockError = new NetworkError('Connection failed');
      mockUserAdminService.getChurchUsers.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await wrapper.getChurchUsers('church-1');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services work', async () => {
      mockGroupAdminService.getChurchGroups.mockResolvedValue({
        data: [],
        error: null,
      });
      mockUserAdminService.getChurchUsers.mockResolvedValue({
        data: [],
        error: null,
      });
      mockUserAdminService.getChurchSummary.mockResolvedValue({
        data: {
          total_users: 0,
          connected_users: 0,
          unconnected_users: 0,
          active_groups: 0,
          pending_requests: 0,
        },
        error: null,
      });

      const result = await wrapper.healthCheck('church-1');

      expect(result.isHealthy).toBe(true);
      expect(result.services.groups).toBe(true);
      expect(result.services.users).toBe(true);
      expect(result.services.summary).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return unhealthy status when services fail', async () => {
      const groupError = new NetworkError('Groups service failed');
      const userError = new PermissionError('Users service denied');

      mockGroupAdminService.getChurchGroups.mockResolvedValue({
        data: null,
        error: groupError,
      });
      mockUserAdminService.getChurchUsers.mockResolvedValue({
        data: null,
        error: userError,
      });
      mockUserAdminService.getChurchSummary.mockResolvedValue({
        data: null,
        error: new Error('Summary failed'),
      });

      const result = await wrapper.healthCheck('church-1');

      expect(result.isHealthy).toBe(false);
      expect(result.services.groups).toBe(false);
      expect(result.services.users).toBe(false);
      expect(result.services.summary).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('should not log errors during health check', async () => {
      mockGroupAdminService.getChurchGroups.mockResolvedValue({
        data: null,
        error: new Error('Test error'),
      });
      mockUserAdminService.getChurchUsers.mockResolvedValue({
        data: [],
        error: null,
      });
      mockUserAdminService.getChurchSummary.mockResolvedValue({
        data: null,
        error: null,
      });

      await wrapper.healthCheck('church-1');

      // Health check should not log errors
      expect(mockGlobalErrorHandler.logError).not.toHaveBeenCalled();
    });
  });

  describe('error handling options', () => {
    it('should respect logErrors option', async () => {
      const mockError = new Error('Test error');
      mockGroupAdminService.getChurchGroups.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await wrapper.getChurchGroups('church-1', false, {
        logErrors: false,
      });

      expect(mockGlobalErrorHandler.logError).not.toHaveBeenCalled();
    });

    it('should respect maxRetries option', async () => {
      const mockError = new NetworkError('Network failed');
      mockGroupAdminService.getChurchGroups.mockRejectedValue(mockError);

      await wrapper.getChurchGroups('church-1', false, {
        maxRetries: 1,
      });

      // Should be called twice: initial attempt + 1 retry
      expect(mockGroupAdminService.getChurchGroups).toHaveBeenCalledTimes(2);
    });

    it('should include context in error logs', async () => {
      const mockError = new Error('Test error');
      mockGroupAdminService.getChurchGroups.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await wrapper.getChurchGroups('church-1', false, {
        context: { screen: 'test-screen', action: 'test-action' },
      });

      expect(mockGlobalErrorHandler.logError).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          operation: 'getChurchGroups',
          screen: 'test-screen',
          action: 'test-action',
        })
      );
    });
  });
});
