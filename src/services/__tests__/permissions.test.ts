import { permissionService } from '../permissions';
import { authService } from '../auth';
import { supabase } from '../supabase';

// Mock dependencies
jest.mock('../auth');
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('PermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permissionService.clearUserCache();
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user', 'church_admin'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.hasRole('church_admin');
      expect(result).toBe(true);
    });

    it('should return false when user does not have the specified role', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.hasRole('church_admin');
      expect(result).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      const result = await permissionService.hasRole('user');
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should grant read_own_data permission to authenticated users', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.hasPermission('read_own_data');
      expect(result.hasPermission).toBe(true);
    });

    it('should grant all permissions to superadmin', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Super Admin',
        email: 'admin@example.com',
        roles: ['superadmin'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.hasPermission('manage_all_data');
      expect(result.hasPermission).toBe(true);
    });

    it('should deny church management permissions to regular members', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['member'],
        church_id: 'church-1',
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.hasPermission('manage_church_events');
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('Insufficient permissions');
    });
  });

  describe('canAccessChurchData', () => {
    it('should allow access to own church data', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['member'],
        church_id: 'church-1',
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.canAccessChurchData('church-1');
      expect(result.hasPermission).toBe(true);
    });

    it('should deny access to other church data', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['member'],
        church_id: 'church-1',
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.canAccessChurchData('church-2');
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('Access denied');
    });
  });

  describe('validateRLSCompliance', () => {
    it('should validate user table access for own data', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['member'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.validateRLSCompliance('users', 'select', { id: 'user-1' });
      expect(result.hasPermission).toBe(true);
    });

    it('should deny access to other users data', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['member'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await permissionService.validateRLSCompliance('users', 'select', { id: 'user-2' });
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('RLS policy violation');
    });
  });

  describe('caching', () => {
    it('should cache user data to avoid repeated database calls', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['member'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      // First call should hit the database
      await permissionService.hasRole('user');
      expect(mockSelect).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await permissionService.hasRole('user');
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['member'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-1' } as any);
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      // First call
      await permissionService.hasRole('user');
      expect(mockSelect).toHaveBeenCalledTimes(1);

      // Clear cache
      permissionService.clearUserCache();

      // Second call should hit database again
      await permissionService.hasRole('user');
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});