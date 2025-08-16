/**
 * Tests for admin pagination utilities
 */

import {
  createPaginationParams,
  createPaginatedResponse,
  mergePaginatedData,
  getInfiniteScrollInfo,
  ADMIN_PAGINATION_DEFAULTS,
} from '../adminPagination';

describe('adminPagination', () => {
  describe('createPaginationParams', () => {
    it('should create valid pagination parameters', () => {
      const params = createPaginationParams(2, 10);
      
      expect(params).toEqual({
        page: 2,
        limit: 10,
        offset: 10,
      });
    });

    it('should handle invalid page numbers', () => {
      const params = createPaginationParams(-1, 10);
      
      expect(params.page).toBe(1);
      expect(params.offset).toBe(0);
    });

    it('should enforce max limit', () => {
      const params = createPaginationParams(1, 200, { maxLimit: 50 });
      
      expect(params.limit).toBe(50);
    });

    it('should handle decimal values', () => {
      const params = createPaginationParams(2.7, 10.9);
      
      expect(params.page).toBe(2);
      expect(params.limit).toBe(10);
      expect(params.offset).toBe(10);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create a valid paginated response', () => {
      const data = [1, 2, 3, 4, 5];
      const total = 25;
      const params = createPaginationParams(2, 5);
      
      const response = createPaginatedResponse(data, total, params);
      
      expect(response).toEqual({
        data: [1, 2, 3, 4, 5],
        pagination: {
          page: 2,
          limit: 5,
          total: 25,
          totalPages: 5,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
    });

    it('should handle first page correctly', () => {
      const data = [1, 2, 3];
      const total = 10;
      const params = createPaginationParams(1, 3);
      
      const response = createPaginatedResponse(data, total, params);
      
      expect(response.pagination.hasPreviousPage).toBe(false);
      expect(response.pagination.hasNextPage).toBe(true);
    });

    it('should handle last page correctly', () => {
      const data = [9, 10];
      const total = 10;
      const params = createPaginationParams(4, 3);
      
      const response = createPaginatedResponse(data, total, params);
      
      expect(response.pagination.hasPreviousPage).toBe(true);
      expect(response.pagination.hasNextPage).toBe(false);
      expect(response.pagination.totalPages).toBe(4);
    });
  });

  describe('mergePaginatedData', () => {
    it('should merge unique data correctly', () => {
      const existing = [{ id: 1 }, { id: 2 }];
      const newData = [{ id: 3 }, { id: 4 }];
      
      const merged = mergePaginatedData(
        existing,
        newData,
        (item) => item.id
      );
      
      expect(merged).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ]);
    });

    it('should filter out duplicates', () => {
      const existing = [{ id: 1 }, { id: 2 }];
      const newData = [{ id: 2 }, { id: 3 }];
      
      const merged = mergePaginatedData(
        existing,
        newData,
        (item) => item.id
      );
      
      expect(merged).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
    });

    it('should handle empty existing data', () => {
      const newData = [{ id: 1 }, { id: 2 }];
      
      const merged = mergePaginatedData(
        [],
        newData,
        (item) => item.id
      );
      
      expect(merged).toEqual(newData);
    });
  });

  describe('getInfiniteScrollInfo', () => {
    it('should indicate when to load more', () => {
      const info = getInfiniteScrollInfo(1, 5, 2);
      
      expect(info.shouldLoadMore).toBe(true);
      expect(info.nextPage).toBe(2);
    });

    it('should indicate when not to load more', () => {
      const info = getInfiniteScrollInfo(4, 5, 2);
      
      expect(info.shouldLoadMore).toBe(false);
      expect(info.nextPage).toBe(null);
    });

    it('should handle custom threshold', () => {
      const info = getInfiniteScrollInfo(3, 5, 1);
      
      expect(info.shouldLoadMore).toBe(true);
      expect(info.nextPage).toBe(4);
    });
  });

  describe('ADMIN_PAGINATION_DEFAULTS', () => {
    it('should have reasonable default values', () => {
      expect(ADMIN_PAGINATION_DEFAULTS.GROUPS_PER_PAGE).toBeGreaterThan(0);
      expect(ADMIN_PAGINATION_DEFAULTS.USERS_PER_PAGE).toBeGreaterThan(0);
      expect(ADMIN_PAGINATION_DEFAULTS.MAX_LIMIT).toBeGreaterThan(50);
      expect(ADMIN_PAGINATION_DEFAULTS.INFINITE_SCROLL_THRESHOLD).toBeGreaterThan(0);
    });
  });
});