/**
 * Pagination utilities for admin features
 */

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 * Create pagination parameters from page and limit
 */
export function createPaginationParams(
  page: number = 1,
  limit: number = 20,
  options: PaginationOptions = {}
): PaginationParams {
  const { maxLimit = 100 } = options;
  
  // Ensure valid values
  const validPage = Math.max(1, Math.floor(page));
  const validLimit = Math.min(Math.max(1, Math.floor(limit)), maxLimit);
  const offset = (validPage - 1) * validLimit;

  return {
    page: validPage,
    limit: validLimit,
    offset,
  };
}

/**
 * Create paginated response from data and pagination params
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    },
  };
}

/**
 * Calculate pagination info for infinite scroll
 */
export function getInfiniteScrollInfo(
  currentPage: number,
  totalPages: number,
  threshold: number = 2
): {
  shouldLoadMore: boolean;
  nextPage: number | null;
} {
  const shouldLoadMore = currentPage <= totalPages - threshold;
  const nextPage = shouldLoadMore ? currentPage + 1 : null;

  return {
    shouldLoadMore,
    nextPage,
  };
}

/**
 * Merge paginated data for infinite scroll
 */
export function mergePaginatedData<T>(
  existingData: T[] = [],
  newData: T[],
  keyExtractor: (item: T) => string | number
): T[] {
  const existingKeys = new Set(existingData.map(keyExtractor));
  const uniqueNewData = newData.filter(item => !existingKeys.has(keyExtractor(item)));
  
  return [...existingData, ...uniqueNewData];
}

/**
 * Admin-specific pagination defaults
 */
export const ADMIN_PAGINATION_DEFAULTS = {
  GROUPS_PER_PAGE: 20,
  USERS_PER_PAGE: 25,
  REQUESTS_PER_PAGE: 15,
  MAX_LIMIT: 100,
  INFINITE_SCROLL_THRESHOLD: 2,
} as const;

/**
 * Hook for managing pagination state
 */
export function usePaginationState(initialLimit: number = 20) {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(initialLimit);

  const params = React.useMemo(
    () => createPaginationParams(page, limit),
    [page, limit]
  );

  const nextPage = React.useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const previousPage = React.useCallback(() => {
    setPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToPage = React.useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const reset = React.useCallback(() => {
    setPage(1);
  }, []);

  const changeLimit = React.useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  return {
    page,
    limit,
    params,
    nextPage,
    previousPage,
    goToPage,
    reset,
    changeLimit,
  };
}