import { performance } from 'perf_hooks';
import { groupAdminService, userAdminService } from '../../services/admin';
import { adminServiceWrapper } from '../../services/adminServiceWrapper';
import { permissionService } from '../../services/permissions';

// Mock dependencies
jest.mock('../../services/supabase', () => ({
  supabase: global.mockSupabaseClient,
}));

jest.mock('../../services/permissions');

const mockSupabase = global.mockSupabaseClient;
const mockPermissionService = permissionService as jest.Mocked<typeof permissionService>;

// Performance test utilities
const measureExecutionTime = async (fn: () => Promise<any>): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

const generateMockGroups = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `group-${i}`,
    title: `Test Group ${i}`,
    description: `Description for group ${i}`,
    status: i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'approved' : 'denied',
    church_id: 'church-1',
    member_count: Math.floor(Math.random() * 20),
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    memberships: Array.from({ length: Math.floor(Math.random() * 10) }, (_, j) => ({
      id: `mem-${i}-${j}`,
      status: 'active',
      user_id: `user-${j}`,
    })),
    creator: {
      id: `user-${i}`,
      name: `Creator ${i}`,
      email: `creator${i}@church.com`,
    },
  }));
};

const generateMockUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    name: `User ${i}`,
    email: `user${i}@church.com`,
    church_id: 'church-1',
    group_count: Math.floor(Math.random() * 5),
    is_connected: Math.random() > 0.3,
    last_activity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    group_memberships: Array.from({ length: Math.floor(Math.random() * 3) }, (_, j) => ({
      id: `mem-${i}-${j}`,
      status: 'active',
      group: { status: 'approved' },
    })),
  }));
};

describe('Admin Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissionService.hasPermission.mockResolvedValue({
      hasPermission: true,
    });
    mockPermissionService.canAccessChurchData.mockResolvedValue({
      hasPermission: true,
    });
  });

  describe('GroupAdminService Performance', () => {
    it('should handle large datasets efficiently (1000 groups)', async () => {
      const largeGroupDataset = generateMockGroups(1000);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: largeGroupDataset,
          error: null,
        }),
      } as any);

      const executionTime = await measureExecutionTime(async () => {
        await groupAdminService.getChurchGroups('church-1', true);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(executionTime).toBeLessThan(1000); // 1 second
    });

    it('should handle paginated requests efficiently', async () => {
      const totalGroups = 5000;
      const pageSize = 50;
      const mockGroups = generateMockGroups(pageSize);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockGroups,
          error: null,
          count: totalGroups,
        }),
      } as any);

      const executionTime = await measureExecutionTime(async () => {
        await groupAdminService.getChurchGroups('church-1', false, {
          offset: 0,
          limit: pageSize,
        });
      });

      // Paginated requests should be fast
      expect(executionTime).toBeLessThan(500); // 500ms
    });

    it('should handle batch operations efficiently', async () => {
      const groupIds = Array.from({ length: 100 }, (_, i) => `group-${i}`);

      // Mock individual approval operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'group-1', status: 'pending', church_id: 'church-1' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'group-1', status: 'approved' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const executionTime = await measureExecutionTime(async () => {
        await adminServiceWrapper.batchApproveGroups(groupIds, 'admin-1');
      });

      // Batch operations should complete within reasonable time
      expect(executionTime).toBeLessThan(5000); // 5 seconds for 100 operations
    });

    it('should handle concurrent operations without performance degradation', async () => {
      const mockGroups = generateMockGroups(100);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockGroups,
          error: null,
        }),
      } as any);

      // Run multiple concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, () =>
        groupAdminService.getChurchGroups('church-1', true)
      );

      const executionTime = await measureExecutionTime(async () => {
        await Promise.all(concurrentRequests);
      });

      // Concurrent requests should not significantly slow down
      expect(executionTime).toBeLessThan(2000); // 2 seconds for 10 concurrent requests
    });
  });

  describe('UserAdminService Performance', () => {
    it('should handle large user datasets efficiently (5000 users)', async () => {
      const largeUserDataset = generateMockUsers(5000);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: largeUserDataset,
          error: null,
        }),
      } as any);

      const executionTime = await measureExecutionTime(async () => {
        await userAdminService.getChurchUsers('church-1');
      });

      // Should handle large datasets efficiently
      expect(executionTime).toBeLessThan(2000); // 2 seconds
    });

    it('should efficiently calculate user statistics for large datasets', async () => {
      const largeUserDataset = generateMockUsers(10000);

      jest.spyOn(userAdminService, 'getChurchUsers').mockResolvedValue({
        data: largeUserDataset as any,
        error: null,
      });

      // Mock groups and requests queries
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: Array.from({ length: 50 }, (_, i) => ({ id: `group-${i}` })),
                error: null,
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: Array.from({ length: 25 }, (_, i) => ({ id: `req-${i}` })),
                error: null,
              }),
            }),
          }),
        } as any);

      const executionTime = await measureExecutionTime(async () => {
        await userAdminService.getChurchSummary('church-1');
      });

      // Statistics calculation should be efficient
      expect(executionTime).toBeLessThan(1000); // 1 second
    });

    it('should handle user filtering efficiently', async () => {
      const mixedUserDataset = [
        ...generateMockUsers(2500).map(u => ({ ...u, is_connected: true })),
        ...generateMockUsers(2500).map(u => ({ ...u, is_connected: false })),
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mixedUserDataset,
          error: null,
          count: 5000,
        }),
      } as any);

      const executionTime = await measureExecutionTime(async () => {
        await userAdminService.getChurchUsers('church-1', { offset: 0, limit: 100 }, 'connected');
      });

      // Filtering should be efficient
      expect(executionTime).toBeLessThan(800); // 800ms
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process large datasets multiple times
      for (let i = 0; i < 10; i++) {
        const largeDataset = generateMockGroups(1000);

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: largeDataset,
            error: null,
          }),
        } as any);

        await groupAdminService.getChurchGroups('church-1', true);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle rapid successive requests without memory buildup', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: generateMockGroups(100),
          error: null,
        }),
      } as any);

      // Make rapid successive requests
      const requests = Array.from({ length: 50 }, () =>
        groupAdminService.getChurchGroups('church-1', true)
      );

      await Promise.all(requests);

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('Database Query Optimization', () => {
    it('should minimize database queries for complex operations', async () => {
      let queryCount = 0;

      // Mock and count database queries
      mockSupabase.from.mockImplementation(() => {
        queryCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: generateMockGroups(100),
            error: null,
          }),
        } as any;
      });

      await groupAdminService.getChurchGroups('church-1', true);

      // Should use minimal number of queries (ideally 1 for this operation)
      expect(queryCount).toBeLessThanOrEqual(2);
    });

    it('should efficiently handle join operations', async () => {
      const mockGroupsWithJoins = generateMockGroups(500).map(group => ({
        ...group,
        service: { id: 'service-1', name: 'Evening Service' },
        church: { id: 'church-1', name: 'Test Church' },
        memberships: group.memberships.map(m => ({
          ...m,
          user: { id: m.user_id, name: `User ${m.user_id}`, avatar_url: null },
        })),
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockGroupsWithJoins,
          error: null,
        }),
      } as any);

      const executionTime = await measureExecutionTime(async () => {
        await groupAdminService.getChurchGroups('church-1', true);
      });

      // Complex joins should still be reasonably fast
      expect(executionTime).toBeLessThan(1500); // 1.5 seconds
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently without performance impact', async () => {
      // Mock intermittent errors
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockRejectedValue(new Error('Intermittent error')),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: generateMockGroups(100),
            error: null,
          }),
        } as any;
      });

      const requests = Array.from({ length: 10 }, () =>
        groupAdminService.getChurchGroups('church-1', true).catch(() => null)
      );

      const executionTime = await measureExecutionTime(async () => {
        await Promise.all(requests);
      });

      // Error handling should not significantly impact performance
      expect(executionTime).toBeLessThan(3000); // 3 seconds
    });

    it('should recover from errors quickly', async () => {
      // Mock error followed by success
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockRejectedValue(new Error('Database error')),
        } as any)
        .mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: generateMockGroups(100),
            error: null,
          }),
        } as any);

      // First call should fail
      const firstResult = await groupAdminService.getChurchGroups('church-1', true);
      expect(firstResult.error).toBeTruthy();

      // Second call should succeed quickly
      const executionTime = await measureExecutionTime(async () => {
        await groupAdminService.getChurchGroups('church-1', true);
      });

      expect(executionTime).toBeLessThan(500); // 500ms
    });
  });

  describe('Caching Performance', () => {
    it('should benefit from caching mechanisms', async () => {
      const mockData = generateMockGroups(1000);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      } as any);

      // First call (cache miss)
      const firstCallTime = await measureExecutionTime(async () => {
        await groupAdminService.getChurchGroups('church-1', true);
      });

      // Second call (should be faster if caching is implemented)
      const secondCallTime = await measureExecutionTime(async () => {
        await groupAdminService.getChurchGroups('church-1', true);
      });

      // Note: This test assumes caching is implemented
      // If no caching, both calls should be similar
      // If caching exists, second call should be faster
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime);
    });
  });
});